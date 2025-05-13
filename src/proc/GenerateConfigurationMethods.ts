import { TsSpec, TsMember } from './Spec'; // Your translated Spec interfaces
// Import your error utility functions if graphStoreValidationCode needs them
// import { tryCatch, processAndThrowCollectedErrors } from '../../src/core/util/errorUtils';

/**
 * Generates the TypeScript code for a method that collects configuration keys.
 * Equivalent to `collectKeysCode` in Java.
 */
function generateCollectKeysMethodBody(tsSpec: TsSpec): string {
    const configKeys = tsSpec.members
        .filter(member => member.isConfigMapEntry()) // Assumes TsMember has this helper
        .map(member => member.lookupKey);

    if (configKeys.length === 0) {
        return 'return [];';
    }
    if (configKeys.length === 1) {
        return `return ["${configKeys[0]}"];`;
    }
    const keysArrayString = configKeys.map(name => `"${name}"`).join(', ');
    return `return [${keysArrayString}];`;
}

/**
 * Generates TypeScript code for the value part of a map entry.
 * Simplified equivalent to `getMapValueCode`.
 * `fieldName` is the name of the private field in the Impl class holding this member's value.
 */
function generateMapValueCode(member: TsMember, fieldName: string): string {
    // TODO: Handle GDS @Configuration.ToMapValue equivalent if you implement it.
    // This would involve checking member.decorators for such a decorator
    // and wrapping `this.${fieldName}` with the specified function.
    return `this.${fieldName}`;
}

/**
 * Generates the TypeScript code for a method that constructs a map of configuration entries.
 * Equivalent to `injectToMapCode` in Java.
 * `memberToFieldName` maps each TsMember to its corresponding private field name in the Impl class.
 */
function generateToMapMethodBody(tsSpec: TsSpec, memberToFieldName: Map<TsMember, string>): string {
    const configMembers = tsSpec.members.filter(member => member.isConfigMapEntry());

    if (configMembers.length === 0) {
        return 'return {};';
    }

    let body = 'const map: Record<string, any> = {};\n';

    if (configMembers.length === 1) {
        const member = configMembers[0];
        const fieldName = memberToFieldName.get(member);
        if (!fieldName) throw new Error(`Field name not found for member: ${member.sourceName}`);
        const valueCode = generateMapValueCode(member, fieldName);
        body = `return { "${member.lookupKey}": ${valueCode} };`;
        return body;
    }

    configMembers.forEach(member => {
        const fieldName = memberToFieldName.get(member);
        if (!fieldName) throw new Error(`Field name not found for member: ${member.sourceName}`);
        const valueCode = generateMapValueCode(member, fieldName);

        // Handle optionality (equivalent to getMapPutOptionalCode)
        // This assumes your TsTypeInfo or a convention indicates optionality (e.g., type includes ' | undefined')
        const isOptional = member.type.text.includes('| undefined'); // Simplified check

        if (isOptional) {
            body += `  if (this.${fieldName} !== undefined) {\n`;
            body += `    map["${member.lookupKey}"] = ${valueCode};\n`;
            body += `  }\n`;
        } else {
            body += `  map["${member.lookupKey}"] = ${valueCode};\n`;
        }
    });
    body += '  return map;';
    return body;
}

/**
 * Generates TypeScript code for a graph store validation method.
 * Highly conceptual equivalent to `graphStoreValidationCode`.
 * This is complex and needs careful mapping of ErrorPropagator logic.
 * `memberToFieldName` maps each TsMember to its corresponding private field name.
 */
function generateGraphStoreValidationMethodBody(
    validationMethodMember: TsMember,
    tsSpec: TsSpec,
    memberToFieldName: Map<TsMember, string>
): string {
    const graphStoreValidationChecks = tsSpec.members.filter(m => m.graphStoreValidationCheck);

    // Determine parameters for this validation method from validationMethodMember.type
    // For example, if it's (graph: G, tc: TC, log: L) => void
    // This is a placeholder and needs to be derived correctly.
    // const methodParamsSignature = "graph: any, transactionContext: any, logger: any";
    // The return type should also be derived, likely 'void'.
    // validationMethodMember.type.text would give the full type string.

    let body = '';
    if (graphStoreValidationChecks.length > 0) {
        body += `  const errors: Error[] = [];\n\n`;
        graphStoreValidationChecks.forEach(checkMember => {
            // Assuming checkMember.sourceName is the name of another method on this Impl class
            // that performs an individual check.
            // The parameters passed to these check methods need to be determined based on
            // how the Java version passes parameters from the main validation method.
            body += `  tryCatch(() => {\n`;
            body += `    this.${checkMember.sourceName}(graph, transactionContext, logger); // Placeholder: Adapt params\n`;
            body += `  }, errors, Error);\n\n`; // Use specific error type if known
        });
        body += `  processAndThrowCollectedErrors(errors, "Graph store validation failed for ${validationMethodMember.sourceName}:");\n`;
    } else {
        body += `  // No graph store validation checks defined for ${validationMethodMember.sourceName}.\n`;
        body += `  return; // Or throw if this method is expected to always perform checks.\n`;
    }
    return body;
    // Note: This requires `tryCatch` and `processAndThrowCollectedErrors` to be available in the generated code's scope.
    // You might need to ensure they are imported in the generated file.
}


/**
 * Generates the TypeScript code for a single method in the configuration Impl class.
 * Equivalent to `generateMethodCode` in Java.
 * `memberToFieldName` maps each TsMember to its corresponding private field name in the Impl class.
 */
function generateImplMethod(
    tsSpec: TsSpec,
    member: TsMember,
    memberToFieldName: Map<TsMember, string>
): string | null {
    // Determine method signature (name, parameters, return type)
    // For simple getters, parameters are none. For validation methods, they exist.
    // Return type comes from member.type.text
    let methodSignature = `public ${member.sourceName}(): ${member.type.text}`;
    let methodBody = '';

    // Adjust signature for specific method types like graphStoreValidation
    if (member.graphStoreValidation) {
        // This is a placeholder signature; it should be derived from member.type.text
        // or a convention based on the original Java interface method.
        const params = "graph: any, transactionContext: any, logger: any"; // Example
        const returnType = "void"; // Typically for validation methods
        methodSignature = `public ${member.sourceName}(${params}): ${returnType}`;
    }


    if (member.collectsKeys) {
        methodBody = generateCollectKeysMethodBody(tsSpec);
    } else if (member.toMap) {
        methodBody = generateToMapMethodBody(tsSpec, memberToFieldName);
    } else if (member.graphStoreValidation) {
        methodBody = generateGraphStoreValidationMethodBody(member, tsSpec, memberToFieldName);
    } else if (member.isConfigValue()) {
        const fieldName = memberToFieldName.get(member);
        if (!fieldName) throw new Error(`Field name not found for member: ${member.sourceName}`);
        methodBody = `return this.${fieldName};`;
    } else {
        // This member might not directly translate to an implemented method
        // (e.g., if it's only used for its @Check annotation by the constructor).
        // Or it's a type of member not yet handled.
        console.warn(`[generateImplMethod] Member ${member.sourceName} (type: ${member.type.text}) did not match a specific generation rule for method body. It might be handled by the constructor or other parts.`);
        return null;
    }

    return `${methodSignature} {\n${methodBody.split('\n').map(line => '  ' + line).join('\n')}\n}`;
}

/**
 * Generates all method implementations for the configuration Impl class.
 * Main entry point, equivalent to `defineMemberMethods` in Java.
 * `memberToFieldName` maps each TsMember to its corresponding private field name in the Impl class.
 */
export function generateAllImplMethods(
    tsSpec: TsSpec,
    memberToFieldName: Map<TsMember, string>
): string[] {
    const methods: string[] = [];
    for (const member of tsSpec.members) {
        const methodCode = generateImplMethod(tsSpec, member, memberToFieldName);
        if (methodCode) {
            methods.push(methodCode);
        }
    }
    return methods;
}
