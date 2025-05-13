import * as tsMorph from 'ts-morph';
import { SyntaxKind, InterfaceDeclaration, MethodSignature, PropertySignature, Type, Decorator, Node } from 'ts-morph';
import { Logger } from './configurationProcessing'; // Assuming Logger is in configurationProcessing.ts
import { TsSpec, TsMember, TsTypeInfo, TsDecoratorInfo, InvalidTsMemberError, createTsMember } from './TsSpec';
import { TsSpecBuilder } from './TsSpecBuilder';
import { TsMemberBuilder } from './TsMemberBuilder';
import {
    // Import your decorator names and option types
    CONFIGURATION_DECORATOR_NAME, ConfigurationDecoratorOptions,
    IGNORE_DECORATOR_NAME,
    KEY_DECORATOR_NAME, KeyDecoratorOptions,
    PARAMETER_DECORATOR_NAME,
    COLLECT_KEYS_DECORATOR_NAME,
    TO_MAP_DECORATOR_NAME,
    INTEGER_RANGE_DECORATOR_NAME,
    LONG_RANGE_DECORATOR_NAME, // Assuming long is treated as number in TS
    DOUBLE_RANGE_DECORATOR_NAME,
    CHECK_DECORATOR_NAME,
    GRAPH_STORE_VALIDATION_DECORATOR_NAME,
    GRAPH_STORE_VALIDATION_CHECK_DECORATOR_NAME,
    // CONVERT_WITH_DECORATOR_NAME, // If you implement @Configuration.ConvertWith
} from '../../src/annotations/Configuration'; // Adjust path as needed

type MemberNode = MethodSignature | PropertySignature; // Or MethodDeclaration | PropertyDeclaration if parsing classes

export class TsConfigParser {
    constructor(private logger: Logger) {}

    public parse(
        rootInterfaceNode: InterfaceDeclaration,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _configOptions?: ConfigurationDecoratorOptions // May be used later
    ): TsSpec {
        const specBuilder = new TsSpecBuilder();
        specBuilder.setRoot(
            rootInterfaceNode.getName(),
            this.extractTypeInfo(rootInterfaceNode.getType()),
            this.extractNodeDecorators(rootInterfaceNode)
        );

        const seenMemberNames = new Set<string>(); // Tracks simpleName of methods/props
        this.processInterfaceMembers(specBuilder, seenMemberNames, rootInterfaceNode, rootInterfaceNode);

        const spec = specBuilder.build();

        // Final validation: Only one GraphStoreValidation method allowed
        const graphStoreValidationMembers = spec.members.filter(m => m.graphStoreValidation);
        if (graphStoreValidationMembers.length > 1) {
            this.logger.error(
                `[TsConfigParser]: Only one @${GRAPH_STORE_VALIDATION_DECORATOR_NAME}-annotated member allowed. Found ${graphStoreValidationMembers.length}.`,
                rootInterfaceNode
            );
            // Potentially throw or return a spec marked as invalid
        }
        return spec;
    }

    private processInterfaceMembers(
        specBuilder: TsSpecBuilder,
        seenMemberNames: Set<string>, // Tracks sourceName to handle overrides/shadowing
        currentInterfaceNode: InterfaceDeclaration,
        rootInterfaceNode: InterfaceDeclaration // The original @Configuration annotated interface
    ): void {
        const members: MemberNode[] = [
            ...currentInterfaceNode.getMethods(),
            ...currentInterfaceNode.getProperties(),
        ];

        for (const memberNode of members) {
            const member = this.validateAndBuildMember(seenMemberNames, rootInterfaceNode, currentInterfaceNode, memberNode);
            if (member) {
                specBuilder.addMember(member);
            }
        }

        // Process base/extended interfaces
        for (const baseInterfaceRef of currentInterfaceNode.getExtends()) {
            const baseInterfaceNode = baseInterfaceRef.getType().getSymbol()?.getDeclarations()[0];
            if (baseInterfaceNode && Node.isInterfaceDeclaration(baseInterfaceNode)) {
                this.processInterfaceMembers(specBuilder, seenMemberNames, baseInterfaceNode, rootInterfaceNode);
            } else {
                this.logger.warn(`Could not resolve base interface: ${baseInterfaceRef.getText()}`, currentInterfaceNode);
            }
        }
    }

    private validateAndBuildMember(
        seenMemberNames: Set<string>,
        rootInterfaceNode: InterfaceDeclaration, // The top-level @Configuration interface
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _currentOwnerInterfaceNode: InterfaceDeclaration, // Interface currently being processed
        memberNode: MemberNode
    ): TsMember | null {
        const memberName = memberNode.getName();
        const decorators = this.extractNodeDecorators(memberNode);

        // Rule: Static members cannot be config fields (less relevant for TS interfaces, but good for classes)
        if (memberNode.isKind(SyntaxKind.MethodDeclaration) || memberNode.isKind(SyntaxKind.PropertyDeclaration)) {
            if ((memberNode as tsMorph.MethodDeclaration | tsMorph.PropertyDeclaration).hasStaticKeyword?.()) {
                 this.logger.warn(`Static member '${memberName}' cannot be a configuration field. Skipping.`, memberNode);
                return null;
            }
        }

        // Rule: Method may not have any type parameters
        if (memberNode.isKind(SyntaxKind.MethodSignature) || memberNode.isKind(SyntaxKind.MethodDeclaration)) {
            if ((memberNode as MethodSignature).getTypeParameters().length > 0) {
                this.logger.error(`Configuration member '${memberName}' may not have type parameters.`, memberNode);
                return null;
            }
        }
        // Rule: Method may not declare any exceptions (less direct in TS, check for Promise<never> or similar if needed)

        // --- @Ignore and Override Logic ---
        // This is a simplified version of GDS's complex override logic.
        // GDS checks if a method was previously annotated and how.
        // Here, we primarily check if an already seen member is being re-declared without @Ignore.
        const isIgnored = decorators.some(d => d.name === IGNORE_DECORATOR_NAME);

        if (seenMemberNames.has(memberName)) {
            if (isIgnored) {
                // It's an override and explicitly ignored, which is fine.
                // Add to seen again (though it's already there) to mark this specific declaration as processed.
                seenMemberNames.add(memberName); // Ensure it's marked as "seen in this context"
                return null; // Ignored
            } else {
                // Member with the same name already processed from a base interface.
                // GDS has complex rules about needing to re-annotate.
                // For TS, if not ignored, it might be an intentional override.
                // We might need more sophisticated logic if GDS's exact override re-annotation rules are required.
                // For now, we'll assume an un-ignored override is intentional and process it,
                // potentially replacing/shadowing the base one if `TsSpecBuilder` handles that.
                // Or, we could error if not explicitly re-annotated with @Parameter or @Key.
                this.logger.warn(`Member '${memberName}' overrides a member from a base interface. Ensure this is intended. GDS has stricter re-annotation rules.`, memberNode);
            }
        }
        seenMemberNames.add(memberName); // Mark as processed

        if (isIgnored) {
            return null; // Ignored
        }


        // --- Build the Member ---
        const memberBuilder = new TsMemberBuilder();
        memberBuilder.setOwnerClassName(rootInterfaceNode.getName()); // Owner is always the root @Configuration interface
        memberBuilder.setSourceName(memberName);
        memberBuilder.setType(this.extractTypeInfo(memberNode.getType(), memberNode));
        memberBuilder.addDecorators(decorators);


        // --- Process Specific GDS Annotations ---
        this.applyKeyAnnotation(memberNode, memberBuilder, decorators);
        this.applyCollectKeysAnnotation(memberNode, memberBuilder, decorators);
        this.applyToMapAnnotation(memberNode, memberBuilder, decorators);
        this.applyRangeAnnotations(memberBuilder, decorators);
        this.applyCheckAnnotation(memberNode, memberBuilder, decorators);
        this.applyGraphStoreValidationAnnotations(memberNode, memberBuilder, decorators);

        // --- Parameter Validation ---
        if (!this.validateMemberParameters(memberNode, memberBuilder)) {
            return null; // Error already logged
        }

        try {
            return memberBuilder.build();
        } catch (e: any) {
            if (e instanceof InvalidTsMemberError) {
                this.logger.error(e.message, memberNode);
            } else {
                this.logger.error(`Unexpected error building member '${memberName}': ${e.message}`, memberNode);
            }
            return null;
        }
    }

    private applyKeyAnnotation(memberNode: MemberNode, memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        const keyDecorator = decorators.find(d => d.name === KEY_DECORATOR_NAME);
        const parameterDecorator = decorators.find(d => d.name === PARAMETER_DECORATOR_NAME);

        if (keyDecorator) {
            if (parameterDecorator) {
                this.logger.error(`Cannot use @${KEY_DECORATOR_NAME} and @${PARAMETER_DECORATOR_NAME} together on '${memberNode.getName()}'.`, memberNode);
                // Potentially invalidate the member build
                return;
            }
            const keyOptions = keyDecorator.arguments[0] as KeyDecoratorOptions | string; // GDS @Key takes a string value
            const keyValue = typeof keyOptions === 'string' ? keyOptions : keyOptions?.value;
            if (keyValue && typeof keyValue === 'string') {
                memberBuilder.setLookupKey(keyValue);
            } else {
                this.logger.error(`@${KEY_DECORATOR_NAME} on '${memberNode.getName()}' requires a valid string value.`, memberNode);
            }
        }
    }
    private applyCollectKeysAnnotation(memberNode: MemberNode, memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        if (decorators.some(d => d.name === COLLECT_KEYS_DECORATOR_NAME)) {
            const returnType = memberNode.getType();
            // Expected: Collection<String> -> string[] or ReadonlyArray<string>
            const expectedTypeText = "string[]"; // Or more flexible check
            if (!returnType.getText().includes(expectedTypeText) && !returnType.getText().includes("ReadonlyArray<string>")) {
                 this.logger.error(`Member '${memberNode.getName()}' annotated with @${COLLECT_KEYS_DECORATOR_NAME} must return a string array (e.g., '${expectedTypeText}'). Found: ${returnType.getText()}`, memberNode);
            }
            memberBuilder.setCollectsKeys(true);
        }
    }

    private applyToMapAnnotation(memberNode: MemberNode, memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        if (decorators.some(d => d.name === TO_MAP_DECORATOR_NAME)) {
            const returnType = memberNode.getType();
            // Expected: Map<String, Object> -> Record<string, any> or Map<string, any>
            const expectedTypeText = "Record<string, any>"; // Or more flexible check
             if (!returnType.getText().includes(expectedTypeText) && !returnType.getText().includes("Map<string, any>")) {
                this.logger.error(`Member '${memberNode.getName()}' annotated with @${TO_MAP_DECORATOR_NAME} must return an object/map (e.g., '${expectedTypeText}'). Found: ${returnType.getText()}`, memberNode);
            }
            memberBuilder.setToMap(true);
        }
    }
    private applyRangeAnnotations(memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        if (decorators.some(d => d.name === INTEGER_RANGE_DECORATOR_NAME)) memberBuilder.setValidatesIntegerRange(true);
        if (decorators.some(d => d.name === LONG_RANGE_DECORATOR_NAME)) memberBuilder.setValidatesLongRange(true); // Assumes number for long
        if (decorators.some(d => d.name === DOUBLE_RANGE_DECORATOR_NAME)) memberBuilder.setValidatesDoubleRange(true);
    }

    private applyCheckAnnotation(memberNode: MemberNode, memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        if (decorators.some(d => d.name === CHECK_DECORATOR_NAME)) {
            if (memberNode.getType().isVoid()) {
                memberBuilder.setValidates(true);
            } else {
                memberBuilder.setNormalizes(true);
            }
        }
    }

    private applyGraphStoreValidationAnnotations(memberNode: MemberNode, memberBuilder: TsMemberBuilder, decorators: TsDecoratorInfo[]): void {
        const returnType = memberNode.getType();
        if (decorators.some(d => d.name === GRAPH_STORE_VALIDATION_DECORATOR_NAME)) {
            if (!returnType.isVoid()) {
                this.logger.error(`Member '${memberNode.getName()}' annotated with @${GRAPH_STORE_VALIDATION_DECORATOR_NAME} must return void. Found: ${returnType.getText()}`, memberNode);
            }
            // GDS's `requireDefaultModifier` doesn't directly map. In TS, interface methods don't have implementations.
            // We assume the method signature is what's important.
            memberBuilder.setGraphStoreValidation(true);
        }
        if (decorators.some(d => d.name === GRAPH_STORE_VALIDATION_CHECK_DECORATOR_NAME)) {
             if (!returnType.isVoid()) {
                this.logger.error(`Member '${memberNode.getName()}' annotated with @${GRAPH_STORE_VALIDATION_CHECK_DECORATOR_NAME} must return void. Found: ${returnType.getText()}`, memberNode);
            }
            memberBuilder.setGraphStoreValidationCheck(true);
        }
    }


    private validateMemberParameters(memberNode: MemberNode, memberBuilder: TsMemberBuilder): boolean {
        // This is a simplified check. GDS checks parameter count based on member type.
        const member = memberBuilder.build(); // Build a temporary member to check its flags
        const methodNode = memberNode.asKind(SyntaxKind.MethodSignature); // Or MethodDeclaration

        if (member.graphStoreValidation || member.graphStoreValidationCheck) {
            if (methodNode && methodNode.getParameters().length !== 3) {
                this.logger.error(`Member '${memberNode.getName()}' (GraphValidation/Check) must accept 3 parameters. Found: ${methodNode.getParameters().length}`, memberNode);
                return false;
            }
        } else {
            // For other config members (getters)
            if (methodNode && methodNode.getParameters().length > 0) {
                this.logger.error(`Configuration member '${memberNode.getName()}' should not have parameters. Found: ${methodNode.getParameters().length}`, memberNode);
                return false;
            }
        }
        return true;
    }


    private extractTypeInfo(type: Type, nodeForDecorators?: MemberNode | InterfaceDeclaration): TsTypeInfo {
        // Basic type extraction. Could be enhanced to resolve to fully qualified names.
        return {
            text: type.getText(undefined, tsMorph.ts.TypeFormatFlags.None), // Get the raw type text
            isPrimitive: type.isBoolean() || type.isNumber() || type.isString() || type.isLiteral(), // Simplified
            isArray: type.isArray(),
            decorators: nodeForDecorators ? this.extractNodeDecorators(nodeForDecorators) : []
        };
    }

    private extractNodeDecorators(node: MemberNode | InterfaceDeclaration): TsDecoratorInfo[] {
        return node.getDecorators().map(decoratorNode => {
            // Basic argument extraction. For complex expressions, this needs more robust parsing.
            const args = decoratorNode.getArguments().map(arg => {
                try {
                    // Attempt to evaluate simple literal arguments
                    // For object literals or more complex structures, you'd parse the AST node directly
                    if (arg.isKind(SyntaxKind.ObjectLiteralExpression)) {
                        const obj: Record<string, any> = {};
                        arg.getProperties().forEach(prop => {
                            if (prop.isKind(SyntaxKind.PropertyAssignment)) {
                                const propName = prop.getName();
                                const initializer = prop.getInitializer();
                                if (initializer) {
                                    // This is still simplified; real evaluation is hard
                                    if (initializer.isKind(SyntaxKind.StringLiteral) ||
                                        initializer.isKind(SyntaxKind.NumericLiteral) ||
                                        initializer.isKind(SyntaxKind.TrueKeyword) ||
                                        initializer.isKind(SyntaxKind.FalseKeyword)) {
                                        obj[propName] = initializer.getLiteralValue();
                                    } else {
                                        obj[propName] = initializer.getText(); // Fallback to text
                                    }
                                }
                            }
                        });
                        return obj;
                    }
                    return arg.getLiteralValue(); // For simple literals
                } catch (e) {
                    return arg.getText(); // Fallback for complex arguments
                }
            });
            return {
                name: decoratorNode.getName(),
                arguments: args.filter(arg => arg !== undefined) as any[], // Filter out unparseable args
            };
        });
    }
}
