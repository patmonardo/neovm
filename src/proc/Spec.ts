// (This file would be part of your config generator script's internal types)

/**
 * Represents the metadata of a TypeScript decorator, extracted for use in code generation.
 * Conceptual equivalent to parts of Java's AnnotationMirror.
 */
export interface TsDecoratorInfo {
  name: string; // Name of the decorator function
  arguments: any[]; // Arguments passed to the decorator
  // You might add more details if needed, like full text or specific properties
}

/**
 * Represents essential information about a type, extracted for code generation.
 * Conceptual equivalent to parts of Java's TypeMirror and JavaPoet's TypeName.
 */
export interface TsTypeInfo {
  text: string; // The textual representation of the type (e.g., "string", "number[]", "MyInterface")
  isPrimitive: boolean;
  isArray: boolean;
  // Potentially more details like resolved full type name if dealing with imports
  decorators?: TsDecoratorInfo[]; // Decorators applied directly to the type if applicable (less common for return types, more for properties)
}


/**
 * Represents a configuration parameter or member within a configuration specification.
 * TypeScript equivalent of the `Spec.Member` Java record.
 */
export interface TsMember {
  /** The name of the class/interface that owns this member. */
  readonly ownerClassName: string;

  /** The name of the method/property in the source interface/class. */
  readonly sourceName: string; // Equivalent to Java's method.getSimpleName().toString()

  /** The type information of the member (e.g., return type of a method or type of a property). */
  readonly type: TsTypeInfo;

  /** The key used to look up this parameter in raw configuration input. Defaults to `sourceName`. */
  readonly lookupKey: string;

  /** Metadata from decorators applied to the source method/property. */
  readonly decorators: TsDecoratorInfo[];

  // Flags derived from specific GDS annotations (e.g., @Configuration.CollectKeys)
  // These would be set by your TsConfigParser based on found decorators.
  readonly collectsKeys: boolean;
  readonly toMap: boolean;
  readonly validatesIntegerRange: boolean;
  readonly validatesLongRange: boolean;
  readonly validatesDoubleRange: boolean;
  readonly validates: boolean; // General validation, e.g., from @Configuration.Check
  readonly graphStoreValidation: boolean;
  readonly graphStoreValidationCheck: boolean;
  readonly normalizes: boolean;

  // Helper getters/methods similar to those in Java Spec.Member
  // These can be implemented if TsMember becomes a class, or calculated by the generator when needed.

  /** Is this member a simple configuration value? */
  isConfigValue(): boolean;

  /** Is this member a map entry (implicitly, not a @Parameter)? */
  isConfigMapEntry(): boolean;

  /** Is this member an explicit @Parameter? */
  isConfigParameter(): boolean;
}

/**
 * Represents the complete specification for a configuration class/interface.
 * TypeScript equivalent of the `Spec` Java record.
 */
export interface TsSpec {
  /** The name of the root configuration interface/class being processed. */
  readonly rootClassName: string;

  /** The type information of the root configuration interface/class. */
  readonly rootType: TsTypeInfo; // Textual representation of the type

  /** List of all configuration members (parameters) defined in this spec. */
  readonly members: ReadonlyArray<TsMember>;

  /** Decorators applied to the root configuration class/interface itself. */
  readonly rootDecorators: TsDecoratorInfo[];
}

/**
 * Custom error class for issues found when constructing a TsMember.
 * TypeScript equivalent of `Spec.InvalidMemberException`.
 */
export class InvalidTsMemberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTsMemberError";
    // Set the prototype explicitly for environments where it might be an issue.
    Object.setPrototypeOf(this, InvalidTsMemberError.prototype);
  }
}

// --- Example of how TsMember methods might be implemented if it were a class, ---
// --- or how your generator script would determine these properties.          ---

// This factory function would be part of your TsConfigParser logic.
// It would take ts-morph nodes and decorator info as input.
export function createTsMember(
  // Simplified parameters for illustration
  ownerClassName: string,
  sourceName: string,
  type: TsTypeInfo,
  rawLookupKey: string | null | undefined,
  decorators: TsDecoratorInfo[],
  flags: { // These flags are determined by parsing decorators
    collectsKeys: boolean;
    toMap: boolean;
    validatesIntegerRange: boolean;
    validatesLongRange: boolean;
    validatesDoubleRange: boolean;
    validates: boolean;
    graphStoreValidation: boolean;
    graphStoreValidationCheck: boolean;
    normalizes: boolean;
  }
): TsMember {
  const resolvedKey = rawLookupKey?.trim() || sourceName;
  if (!resolvedKey) {
    throw new InvalidTsMemberError("The lookup key (derived from source name or explicit key) must not be empty.");
  }
  if (rawLookupKey && rawLookupKey.trim() !== rawLookupKey) {
    throw new InvalidTsMemberError(`The lookup key "${rawLookupKey}" must not be surrounded by whitespace.`);
  }

  // Equivalent to Java's compact constructor validation for @CollectKeys/@ToMap with @Check
  const GDS_COLLECT_KEYS_DECORATOR_NAME = "CollectKeys"; // Example name
  const GDS_TO_MAP_DECORATOR_NAME = "ToMap";         // Example name
  const GDS_CHECK_DECORATOR_NAME = "Check";           // Example name

  if (flags.collectsKeys && (flags.validates || flags.normalizes)) {
    throw new InvalidTsMemberError(
      `Cannot combine @${GDS_COLLECT_KEYS_DECORATOR_NAME} with @${GDS_CHECK_DECORATOR_NAME} (or equivalent validation/normalization) on member "${sourceName}"`
    );
  }
  if (flags.toMap && (flags.validates || flags.normalizes)) {
    throw new InvalidTsMemberError(
      `Cannot combine @${GDS_TO_MAP_DECORATOR_NAME} with @${GDS_CHECK_DECORATOR_NAME} (or equivalent validation/normalization) on member "${sourceName}"`
    );
  }

  // Helper function to check for a specific decorator by name
  const hasDecorator = (name: string): boolean => decorators.some(d => d.name === name);
  const GDS_PARAMETER_DECORATOR_NAME = "Parameter"; // Example name

  const isConfigValue = (): boolean => {
    return !flags.collectsKeys &&
           !flags.toMap &&
           !flags.validates &&
           !flags.normalizes &&
           !flags.graphStoreValidation &&
           !flags.graphStoreValidationCheck;
  };

  return {
    ownerClassName,
    sourceName,
    type,
    lookupKey: resolvedKey,
    decorators,
    ...flags,
    isConfigValue,
    isConfigMapEntry: (): boolean => {
      return isConfigValue() && !hasDecorator(GDS_PARAMETER_DECORATOR_NAME);
    },
    isConfigParameter: (): boolean => {
      return isConfigValue() && hasDecorator(GDS_PARAMETER_DECORATOR_NAME);
    },
  };
}
