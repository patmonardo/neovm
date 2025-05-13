import { TsSpec, TsMember, TsTypeInfo, TsDecoratorInfo } from './TsSpec';
import { Logger } from './configurationProcessing'; // Or a shared logger type
import { generateAllImplMethods } from './generateConfigImplMethods';
import { TsGenerateConfigurationBuilder, TsImplMemberDefinition } from './TsGenerateConfigurationBuilder';
// Import decorator names and options if needed for @ConvertWith logic
import {
    CONVERT_WITH_DECORATOR_NAME, ConvertWithOptions,
    INTEGER_RANGE_DECORATOR_NAME, IntegerRangeOptions,
    LONG_RANGE_DECORATOR_NAME, LongRangeOptions,
    DOUBLE_RANGE_DECORATOR_NAME, DoubleRangeOptions,
    PARAMETER_DECORATOR_NAME,
} from '@/annotations/Configuration'; // Adjust path

// --- Helper for parsing values from raw config (simplified CypherMapAccess) ---
// This utility helps centralize the logic for reading and validating values from the raw input.
// In a real scenario, this would be more robust.
const RAW_CONFIG_PARSER_UTIL_NAME = "parseRawValue"; // Name of a utility function or class method

function generateRawConfigAccessCall(
    memberDef: Pick<TsImplMemberDefinition, "member" | "rawConfigAccessMethod" | "defaultValue" | "expectedTypeForChecked" | "isOptional" | "fieldTypeScriptText">,
    rawConfigParamName: string,
    errorsVarName: string,
    fieldName: string // for error messages and some validation contexts
): string {
    const { member, rawConfigAccessMethod, defaultValue, expectedTypeForChecked } = memberDef;
    const key = member.lookupKey;
    let call = `${RAW_CONFIG_PARSER_UTIL_NAME}.${rawConfigAccessMethod}(${rawConfigParamName}, "${key}"`;

    if (rawConfigAccessMethod.includes("Checked")) {
        // For requireChecked/getOptionalChecked, we need the type/validator
        // This assumes expectedTypeForChecked is a string representing a validator function or class.
        // e.g., "MyTypeValidator.validate" or "MyEnum" (if we have a generic enum parser)
        if (!expectedTypeForChecked) {
            // This should be caught earlier when creating MemberDefinition
            return `/* ERROR: Missing expectedTypeForChecked for ${key} */ undefined`;
        }
        call += `, "${expectedTypeForChecked}"`; // Or pass the validator function reference directly
    }

    if (defaultValue) {
        call += `, ${defaultValue}`;
    }
    call += `)`;

    // Add range validation if applicable
    // This is a simplified way to add validation after parsing.
    // GDS integrates it more deeply.
    const rangeDecorator = member.decorators.find(
        d => d.name === INTEGER_RANGE_DECORATOR_NAME ||
             d.name === LONG_RANGE_DECORATOR_NAME ||
             d.name === DOUBLE_RANGE_DECORATOR_NAME
    );
    if (rangeDecorator) {
        const options = rangeDecorator.arguments[0] as any; // IntegerRangeOptions, etc.
        const rangeArgs = [
            options.min, options.max,
            options.minInclusive !== undefined ? options.minInclusive : true, // Default to true
            options.maxInclusive !== undefined ? options.maxInclusive : true  // Default to true
        ].join(', ');

        let validatorFunc = "";
        if (rangeDecorator.name === INTEGER_RANGE_DECORATOR_NAME) validatorFunc = "validateIntegerRange";
        else if (rangeDecorator.name === LONG_RANGE_DECORATOR_NAME) validatorFunc = "validateLongRange";
        else if (rangeDecorator.name === DOUBLE_RANGE_DECORATOR_NAME) validatorFunc = "validateDoubleRange";

        // Wrap the parsed value with validation
        // this.fieldName = validateXRange("key", parsedValue, min, max, minIncl, maxIncl);
        // This needs to be integrated into the assignment.
        // For now, let's assume the parser utility handles this or it's done in a post-assignment step.
        // The GDS code adds validation statements *after* assignment.
    }


    return call;
}
// --- End Helper ---


// Constants for generated code
const CONFIG_VAR_TS = "rawConfig";
const INSTANCE_VAR_TS = "instance";
const ERRORS_VAR_TS = "validationErrors";

export class TsGenerateConfiguration {
    private logger?: Logger;

    constructor(logger?: Logger) {
        this.logger = logger;
    }

    public generateConfigImpl(tsSpec: TsSpec, generatedClassName: string): string {
        const interfaceName = tsSpec.rootClassName;
        let classBody = "";

        // --- 1. Define Fields and TsImplMemberDefinition[] ---
        const {
            fieldDeclarations,
            implMemberDefinitions,
            directConstructorParamsInfo, // Info for direct params: { name, typeScriptText, isOptional, member }
            hasMapEntries // Does any member come from the config map?
        } = this.createImplMemberDefinitions(tsSpec);

        fieldDeclarations.forEach(field => classBody += `  ${field}\n`);
        if (fieldDeclarations.length > 0) classBody += '\n';

        // --- 2. Define Constructor ---
        const validationMethodNames = tsSpec.members.filter(m => m.validates).map(m => m.sourceName);
        const constructorInfo = this.defineConstructor(
            implMemberDefinitions,
            validationMethodNames,
            directConstructorParamsInfo,
            hasMapEntries,
            tsSpec.members.some(m => m.normalizes) // Does factory exist (due to normalizers)?
        );
        classBody += constructorInfo.code;
        classBody += '\n';

        // --- 3. Define Factory Method (if needed) ---
        const factoryMethodCode = this.defineFactoryMethod(
            tsSpec,
            generatedClassName,
            constructorInfo.parameters // Pass constructor params to factory
        );
        if (factoryMethodCode) {
            classBody += factoryMethodCode;
            classBody += '\n';
        }

        // --- 4. Define Member Methods (getters, etc.) ---
        const memberToFieldName = new Map<TsMember, string>();
        implMemberDefinitions.forEach(def => memberToFieldName.set(def.member, def.fieldName));
        const memberMethods = generateAllImplMethods(tsSpec, memberToFieldName);
        memberMethods.forEach(methodStr => classBody += `${methodStr.split('\n').map(line => '  ' + line).join('\n')}\n\n`);

        // --- 5. Define Builder ---
        const builderGenerator = new TsGenerateConfigurationBuilder();
        const factoryMethodForBuilder = factoryMethodCode ? {
            name: "of", // Assuming factory is named 'of'
            parameters: constructorInfo.parameters.map(p => ({ name: p.name, type: p.type }))
        } : undefined;

        const builderClassCode = builderGenerator.generateBuilderClass(
            interfaceName,
            generatedClassName,
            implMemberDefinitions, // Builder needs full defs for setters
            directConstructorParamsInfo.map(p => ({ name: p.name, type: p.typeScriptText })),
            factoryMethodForBuilder
        );
        classBody += `${builderClassCode.split('\n').map(line => `  ${line}`).join('\n')}\n`;

        // Builder factory method
        classBody += `  public static builder(): typeof ${generatedClassName}.Builder {\n`; // Use typeof for static inner class
        classBody += `    return new ${generatedClassName}.Builder();\n`;
        classBody += `  }\n`;

        // --- TODO: Add imports required by the generated code ---
        // e.g., for RawConfigParser utilities, error utils, custom types.
        let imports = `import { ${RAW_CONFIG_PARSER_UTIL_NAME} } from './rawConfigParserUtil'; // Adjust path\n`;
        imports += `import { combineCollectedErrors, tryCatchValidation } from './errorUtils'; // Adjust path\n`;
        // Add imports for types used in fields/methods if they are not global/built-in

        return `${imports}\nexport class ${generatedClassName} implements ${interfaceName} {\n${classBody}}\n`;
    }

    private createImplMemberDefinitions(tsSpec: TsSpec): {
        fieldDeclarations: string[];
        implMemberDefinitions: TsImplMemberDefinition[];
        directConstructorParamsInfo: { name: string; typeScriptText: string; isOptional: boolean; member: TsMember }[];
        hasMapEntries: boolean;
    } {
        const fieldDeclarations: string[] = [];
        const implMemberDefinitions: TsImplMemberDefinition[] = [];
        const directConstructorParamsInfo: { name: string; typeScriptText: string; isOptional: boolean; member: TsMember }[] = [];
        let hasMapEntries = false;

        for (const member of tsSpec.members) {
            if (!member.isConfigValue()) continue; // Skip non-value members like @CollectKeys, @ToMap methods

            const fieldName = `_${member.sourceName}`; // e.g., _concurrency
            let fieldTypeScriptText = member.type.text; // Base type from interface
            let isOptional = fieldTypeScriptText.includes('| undefined') || fieldTypeScriptText.endsWith('?');
            if (isOptional && fieldTypeScriptText.endsWith('?')) { // Normalize optional syntax for properties
                fieldTypeScriptText = fieldTypeScriptText.slice(0, -1) + " | undefined";
            }


            // Determine how to parse from rawConfig and the parameter type for constructor/builder
            let rawConfigAccessMethod = "";
            let defaultValue: string | undefined = undefined; // As a code string
            let expectedTypeForChecked: string | undefined = undefined;
            let parameterTypeScriptText = fieldTypeScriptText; // Type for direct constructor param or builder setter

            // Simplified logic from Java's memberDefinition and addConfigFieldToConstructor/addParameterToConstructor
            // This needs to be much more robust based on member.type and decorators.
            const baseType = fieldTypeScriptText.replace(' | undefined', '').replace('?', '');
            const isActuallyOptional = member.decorators.some(d => d.name === "Nullable"); // Or based on TS optional '?'

            if (baseType === "string") {
                rawConfigAccessMethod = isActuallyOptional ? "getOptionalString" : "requireString";
            } else if (baseType === "number") {
                rawConfigAccessMethod = isActuallyOptional ? "getOptionalNumber" : "requireNumber";
            } else if (baseType === "boolean") {
                rawConfigAccessMethod = isActuallyOptional ? "getOptionalBoolean" : "requireBoolean";
            } else { // Assume complex/custom type or enum
                rawConfigAccessMethod = isActuallyOptional ? "getOptionalChecked" : "requireChecked";
                expectedTypeForChecked = baseType; // This needs to be the name of a validator or enum
            }

            // Handle @Configuration.Parameter (direct constructor arg) vs. map entry
            const isDirectParam = member.decorators.some(d => d.name === PARAMETER_DECORATOR_NAME);

            const definition: TsImplMemberDefinition = {
                member,
                fieldName,
                fieldTypeScriptText, // Type of the field in the Impl class
                parameterTypeScriptText: isDirectParam ? fieldTypeScriptText : parameterTypeScriptText, // For builder, it's usually fieldType
                isOptional,
                rawConfigAccessMethod,
                defaultValue, // TODO: Extract default from @DefaultValue or interface default method
                expectedTypeForChecked,
                // TODO: converterFunctionName from @ConvertWith
            };
            implMemberDefinitions.push(definition);

            // Field declaration
            fieldDeclarations.push(`private readonly ${fieldName}: ${fieldTypeScriptText};`);

            if (isDirectParam) {
                directConstructorParamsInfo.push({ name: member.sourceName, typeScriptText: fieldTypeScriptText, isOptional, member });
            } else {
                hasMapEntries = true;
            }
        }
        return { fieldDeclarations, implMemberDefinitions, directConstructorParamsInfo, hasMapEntries };
    }


    private defineConstructor(
        implMembers: TsImplMemberDefinition[],
        validationMethodNames: string[], // Names of @Check methods that return void
        directConstructorParams: { name: string; typeScriptText: string; isOptional: boolean; member: TsMember }[],
        hasMapEntries: boolean,
        isPrivate: boolean // If a factory method exists
    ): { code: string; parameters: { name: string; type: string }[] } {
        let constructorParamsString = "";
        const constructorParameters: { name: string; type: string }[] = [];

        // Add direct parameters first
        directConstructorParams.forEach(param => {
            constructorParamsString += `${param.name}${param.isOptional ? '?' : ''}: ${param.typeScriptText}, `;
            constructorParameters.push({ name: param.name, type: param.typeScriptText });
        });

        if (hasMapEntries) {
            constructorParamsString += `${CONFIG_VAR_TS}: Record<string, any>`;
            constructorParameters.push({ name: CONFIG_VAR_TS, type: "Record<string, any>" });
        } else {
            // Remove trailing comma if no map entries
            if (constructorParamsString.endsWith(', ')) {
                constructorParamsString = constructorParamsString.slice(0, -2);
            }
        }

        let constructorBody = "";
        const hasAnyValidatableMember = implMembers.length > 0 || validationMethodNames.length > 0;

        if (hasAnyValidatableMember) {
            constructorBody += `    const ${ERRORS_VAR_TS}: Error[] = [];\n`;
        }

        // Assign direct parameters
        directConstructorParams.forEach(param => {
            const memberDef = implMembers.find(def => def.member === param.member);
            if (memberDef) { // Should always be found
                // Apply converters if any (simplified)
                let valueToAssign = param.name;
                if (memberDef.converterFunctionName) {
                    valueToAssign = `${memberDef.converterFunctionName}(${param.name})`;
                }
                // TODO: Add validation code for direct params (e.g., range checks)
                // This is complex as GDS does it after assignment or during.
                // For now, direct assignment.
                constructorBody += `    this.${memberDef.fieldName} = ${valueToAssign};\n`;
            }
        });


        // Process members that come from the config map
        implMembers.filter(def => !directConstructorParams.some(p => p.member === def.member)).forEach(def => {
            constructorBody += `    try {\n`;
            let parsedValue = generateRawConfigAccessCall(def, CONFIG_VAR_TS, ERRORS_VAR_TS, def.fieldName);
            if (def.converterFunctionName) {
                parsedValue = `${def.converterFunctionName}(${parsedValue})`;
            }
            constructorBody += `      this.${def.fieldName} = ${parsedValue};\n`;

            // Add validation code (e.g., range checks) - GDS does this after assignment
            const rangeDecorator = def.member.decorators.find(
                d => d.name === INTEGER_RANGE_DECORATOR_NAME ||
                     d.name === LONG_RANGE_DECORATOR_NAME ||
                     d.name === DOUBLE_RANGE_DECORATOR_NAME
            );
            if (rangeDecorator) {
                const options = rangeDecorator.arguments[0] as any;
                const rangeArgs = [
                    `"${def.member.lookupKey}"`, // key for error message
                    `this.${def.fieldName}`,     // value to check
                    options.min, options.max,
                    options.minInclusive !== undefined ? options.minInclusive : true,
                    options.maxInclusive !== undefined ? options.maxInclusive : true
                ].join(', ');
                let validatorFunc = "";
                if (rangeDecorator.name === INTEGER_RANGE_DECORATOR_NAME) validatorFunc = "validateIntegerRange";
                else if (rangeDecorator.name === LONG_RANGE_DECORATOR_NAME) validatorFunc = "validateLongRange";
                else if (rangeDecorator.name === DOUBLE_RANGE_DECORATOR_NAME) validatorFunc = "validateDoubleRange";

                constructorBody += `      ${RAW_CONFIG_PARSER_UTIL_NAME}.${validatorFunc}(${rangeArgs});\n`;
            }

            constructorBody += `    } catch (e: any) {\n`;
            constructorBody += `      ${ERRORS_VAR_TS}.push(e);\n`;
            constructorBody += `    }\n`;
        });

        // Call validation methods (@Check methods returning void)
        validationMethodNames.forEach(methodName => {
            constructorBody += `    tryCatchValidation(() => this.${methodName}(), ${ERRORS_VAR_TS});\n`;
        });

        if (hasAnyValidatableMember) {
            constructorBody += `    combineCollectedErrors(${ERRORS_VAR_TS});\n`;
        }
        const modifier = isPrivate ? "private" : "public";
        const code = `  ${modifier} constructor(${constructorParamsString}) {\n${constructorBody}  }\n`;
        return { code, parameters: constructorParameters };
    }

    private defineFactoryMethod(
        tsSpec: TsSpec,
        generatedClassName: string,
        constructorParams: { name: string; type: string }[]
    ): string | null {
        const normalizerMembers = tsSpec.members.filter(m => m.normalizes);
        if (normalizerMembers.isEmpty()) {
            return null;
        }

        const constructorArgsString = constructorParams.map(p => p.name).join(', ');
        const factoryParamsString = constructorParams.map(p => `${p.name}: ${p.type}`).join(', ');

        let factoryBody = `    const ${INSTANCE_VAR_TS} = new ${generatedClassName}(${constructorArgsString});\n`;
        normalizerMembers.forEach(member => {
            // Assumes normalizer method is on the instance and returns the instance for chaining,
            // or modifies the instance and the last statement returns it.
            // GDS: instance = instance.normalizeMethod();
            factoryBody += `    (${INSTANCE_VAR_TS} as any).${member.sourceName}(); // Call normalizer, may modify instance or return new\n`;
            // If normalizers return new instances, the logic is more complex:
            // factoryBody += `    ${INSTANCE_VAR_TS} = (${INSTANCE_VAR_TS} as any).${member.sourceName}();\n`;
        });
        factoryBody += `    return ${INSTANCE_VAR_TS};\n`;

        return (
            `  public static of(${factoryParamsString}): ${tsSpec.rootClassName} {\n` +
            `${factoryBody}` +
            `  }\n`
        );
    }

    // TODO: Implement robust `memberDefinition` equivalent from Java to populate TsImplMemberDefinition
    // This involves:
    // - Handling @ConvertWith (finding converter, determining input type)
    // - Determining `rawConfigAccessMethod` based on type (String, Int, Long, Optional, Checked, etc.)
    // - Extracting default providers (from @DefaultValue or interface default methods)
    // - Setting `expectedTypeCodeBlock` for Optional/Checked types.
    // This is the most complex part of the translation.
    // The current `createImplMemberDefinitions` is a placeholder.
}

// You would also need to create `rawConfigParserUtil.ts` and `errorUtils.ts`
// with the helper functions like `parseRawValue.requireString`, `combineCollectedErrors`, etc.
