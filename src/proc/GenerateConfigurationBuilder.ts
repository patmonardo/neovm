// ... (TsImplMemberDefinition interface from above) ...

// Helper to get the "unpacked" type for setters if the original field is optional
function getSetterParameterType(memberDef: TsImplMemberDefinition): string {
    // If the field type in the Impl class is "T | undefined",
    // the setter might take "T" or "T | undefined" depending on design.
    // GDS's unpackedType removes Optional. Here, we'll use the defined parameterTypeScriptText.
    return memberDef.parameterTypeScriptText;
}

// Helper to get the type for an optional setter parameter
function getOptionalSetterParameterType(memberDef: TsImplMemberDefinition): string {
    // If original is T, optional setter takes T | undefined
    // If original is T | undefined, optional setter also takes T | undefined
    if (memberDef.parameterTypeScriptText.includes('| undefined')) {
        return memberDef.parameterTypeScriptText;
    }
    return `${memberDef.parameterTypeScriptText} | undefined`;
}


export class TsGenerateConfigurationBuilder {
    private readonly builderConfigMapFieldName: string = 'configuration'; // Field in Builder for map entries
    private readonly builderClassName: string = 'Builder';

    constructor() {
        // In Java, it took configParameterName, but here we'll hardcode it for the builder's internal map.
    }

    public generateBuilderClass(
        configInterfaceTypeName: string, // e.g., "MyConfig"
        implClassName: string,           // e.g., "MyConfigImpl"
        implMemberDefinitions: TsImplMemberDefinition[],
        // Parameters for the Impl class's constructor, excluding the config map
        implDirectConstructorParamNamesAndTypes: { name: string, type: string }[],
        // Optional static factory method on Impl class: { name: "create", parameters: [...] }
        implFactoryMethod?: { name: string; parameters: { name: string, type: string }[] }
    ): string {
        let classContent = '';

        // 1. Fields for direct constructor parameters (excluding the config map)
        implDirectConstructorParamNamesAndTypes.forEach(param => {
            classContent += `  private ${param.name}?: ${param.type};\n`;
        });
        // Field for map entries
        classContent += `  private readonly ${this.builderConfigMapFieldName}: Record<string, any> = {};\n\n`;

        // 2. Constructor (empty for this builder style)
        classContent += `  constructor() {}\n\n`;

        // 3. Setters for direct parameters (isConfigParameter)
        const parameterSetters = this.defineConfigParameterSetters(implMemberDefinitions);
        parameterSetters.forEach(setter => {
            classContent += `${setter}\n`;
        });

        // 4. Setters for config map entries (isConfigMapEntry)
        const mapEntrySetters = this.defineConfigMapEntrySetters(implMemberDefinitions);
        mapEntrySetters.forEach(setter => {
            classContent += `${setter}\n`;
        });

        // 5. `from()` static method
        classContent += this.defineFromBaseConfigMethod(configInterfaceTypeName, implMemberDefinitions);
        classContent += '\n';

        // 6. `build()` method
        classContent += this.defineBuildMethod(
            configInterfaceTypeName,
            implClassName,
            implDirectConstructorParamNamesAndTypes,
            implFactoryMethod
        );
        classContent += '\n';


        return `public static Builder = class {\n${classContent}};\n`;
    }

    private defineConfigParameterSetters(
        implMembers: TsImplMemberDefinition[]
    ): string[] {
        return implMembers
            .filter(implMember => implMember.member.isConfigParameter()) // Assumes TsMember has this
            .map(implMember => {
                const memberName = implMember.member.sourceName; // Original method/property name
                // The field name in the builder will be the same as the direct constructor param name
                // which should align with the memberName for these direct parameters.
                const builderFieldName = implMember.fieldName; // This should be the name of the field in the Builder

                return `  public ${memberName}(value: ${implMember.parameterTypeScriptText}): ${this.builderClassName} {\n` +
                       `    this.${builderFieldName} = value;\n` +
                       `    return this;\n` +
                       `  }\n`;
            });
    }

    private defineConfigMapEntrySetters(
        implMembers: TsImplMemberDefinition[]
    ): string[] {
        const setters: string[] = [];
        implMembers
            .filter(implMember => implMember.member.isConfigMapEntry()) // Assumes TsMember has this
            .forEach(implMember => {
                const memberName = implMember.member.sourceName; // Original method/property name
                const lookupKey = implMember.member.lookupKey;
                const setterParamType = getSetterParameterType(implMember);

                // Regular setter
                let setter = `  public ${memberName}(value: ${setterParamType}): ${this.builderClassName} {\n` +
                             `    this.${this.builderConfigMapFieldName}["${lookupKey}"] = value;\n` +
                             `    return this;\n` +
                             `  }\n`;
                setters.push(setter);

                // Optional setter if the original type in the interface was optional
                // GDS creates an overload for Optional<T> parameters.
                // Here, we can create a setter that accepts `T | undefined`.
                if (implMember.isOptional) {
                    const optionalSetterParamType = getOptionalSetterParameterType(implMember);
                    // Avoid duplicate if setterParamType already includes undefined
                    if (optionalSetterParamType !== setterParamType) {
                         let optionalSetter = `  public ${memberName}(value: ${optionalSetterParamType}): ${this.builderClassName} {\n` +
                                         `    if (value === undefined) {\n` +
                                         `      delete this.${this.builderConfigMapFieldName}["${lookupKey}"];\n`+
                                         `    } else {\n` +
                                         `      this.${this.builderConfigMapFieldName}["${lookupKey}"] = value;\n` +
                                         `    }\n` +
                                         `    return this;\n` +
                                         `  }\n`;
                        // This logic might need refinement. GDS uses ifPresent for Optional.
                        // A common TS pattern is just one setter that accepts T | undefined.
                        // For now, let's assume the main setter handles T | undefined if isOptional is true.
                        // The GDS code generates two distinct setters if the original parameter was Optional.
                        // Let's try to mimic that by having one for T and one for T | undefined if different.
                        // This part is tricky to map directly.
                        // A simpler TS approach: one setter taking `memberDef.parameterTypeScriptText`
                        // which would be `T | undefined` if optional.
                        // The GDS code has `unpackedType` for one setter and `expectedTypeWrappedInOptional` for the other.

                        // Let's simplify: if the member is optional, the main setter already takes T | undefined.
                        // The GDS logic for two setters for Optional types is more Java-specific.
                        // We will rely on the `parameterTypeScriptText` being correctly `T | undefined` if optional.
                    }
                }
            });
        return setters;
    }

    private defineFromBaseConfigMethod(
        configInterfaceTypeName: string,
        implMembers: TsImplMemberDefinition[]
    ): string {
        let methodBody = `    const builder = new ${this.builderClassName}();\n`;

        implMembers
            .filter(def => def.member.isConfigValue()) // isConfigValue includes both parameters and map entries
            .forEach(def => {
                const memberName = def.member.sourceName;
                // Simplified: directly call setter with getter value.
                // GDS handles Optional.map and inverse converters.
                // For TS, if baseConfig.memberName() returns T | undefined, and setter takes T | undefined, it's fine.
                methodBody += `    if (typeof baseConfig.${memberName} === 'function') {\n`; // Ensure it's a method
                methodBody += `      const value = baseConfig.${memberName}();\n`;
                // The setter on the builder should handle undefined if the type is optional
                methodBody += `      builder.${memberName}(value as any); // Use 'as any' to bypass strict type checks if types slightly mismatch due to simplification
                                                                      // A more robust solution would ensure setter param type matches getter return type.
                methodBody += `    }\n`;

            });

        methodBody += `    return builder;\n`;

        return `  public static from(baseConfig: ${configInterfaceTypeName}): ${this.builderClassName} {\n${methodBody}  }\n`;
    }


    private defineBuildMethod(
        configInterfaceTypeName: string,
        implClassName: string,
        implDirectConstructorParamNamesAndTypes: { name: string, type: string }[],
        implFactoryMethod?: { name: string; parameters: { name: string, type: string }[] }
    ): string {
        let buildLogic = '';
        const constructorArgs: string[] = [];

        if (implFactoryMethod) {
            // Collect arguments for the factory method
            implFactoryMethod.parameters.forEach(param => {
                if (param.name === this.builderConfigMapFieldName /* GDS uses a specific name */ || param.type.includes("Record<string, any>")) { // Heuristic for map param
                    constructorArgs.push(`this.${this.builderConfigMapFieldName}`);
                } else {
                    // For other direct params, ensure they are set or provide default/error
                    const directParam = implDirectConstructorParamNamesAndTypes.find(p => p.name === param.name);
                    if (directParam) {
                         // Check if the field was set, if not, it might be an error or need a default
                        constructorArgs.push(`this.${param.name}!`); // Use non-null assertion, assuming validation happens in Impl
                    } else {
                        // This case should ideally not happen if parameters are mapped correctly
                        constructorArgs.push(`undefined /* ERROR: Missing factory param ${param.name} */`);
                    }
                }
            });
            buildLogic = `    return ${implClassName}.${implFactoryMethod.name}(${constructorArgs.join(', ')});\n`;

        } else {
            // Collect arguments for the direct constructor
            implDirectConstructorParamNamesAndTypes.forEach(param => {
                // Check if the field was set, if not, it might be an error or need a default
                constructorArgs.push(`this.${param.name}!`); // Use non-null assertion
            });
            // Add the config map as the last argument (assuming a convention)
            constructorArgs.push(`this.${this.builderConfigMapFieldName}`);
            buildLogic = `    return new ${implClassName}(${constructorArgs.join(', ')});\n`;
        }

        return `  public build(): ${configInterfaceTypeName} {\n${buildLogic}  }\n`;
    }
}
