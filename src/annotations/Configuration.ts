/**
 * Option interface for the @Configuration decorator.
 */
export interface ConfigurationDecoratorOptions {
  /**
   * Optional name for the generated implementation class.
   * If not set, it defaults to the interface name + "Impl".
   * Corresponds to `value()` in the Java annotation.
   */
  name?: string;
}

/**
 * Decorator to mark an interface as a GDS-style configuration.
 * The code generator will process interfaces marked with this decorator.
 * @param options Configuration options.
 */
export function Configuration(options?: ConfigurationDecoratorOptions): ClassDecorator {
  return (target: Function) => {
    // Decorator logic (can be a no-op if only used for AST parsing,
    // or use reflect-metadata to store options on the target)
    // For TsConfigParser, the presence of the decorator and its arguments in the AST is key.
  };
}
export const CONFIGURATION_DECORATOR_NAME = "Configuration";

/**
 * Option interface for the @Key decorator.
 */
export interface KeyDecoratorOptions {
  /** The lookup key to use in the raw configuration map. */
  value: string;
}

/**
 * Decorator to specify a custom lookup key for a configuration member.
 * @param optionsOrValue The key options or the key string directly.
 */
export function Key(optionsOrValue: KeyDecoratorOptions | string): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const KEY_DECORATOR_NAME = "Key";

/**
 * Option interface for the @ConvertWith decorator.
 */
export interface ConvertWithOptions {
  /**
   * A string reference to a converter function (e.g., "modulePath#functionName" or "importedFunctionName").
   * This function will be used to convert the raw input value to the member's type.
   */
  method: string;
  /**
   * Optional string reference to an inverse converter function.
   * Used by the `from(baseConfig)` method in the generated Builder.
   */
  inverse?: string;
}
export const CONVERT_WITH_INVERSE_IS_TO_MAP = "__USE_TO_MAP_METHOD__";

/**
 * Decorator to specify a custom conversion function for a configuration member.
 * @param options Conversion options.
 */
export function ConvertWith(options: ConvertWithOptions): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const CONVERT_WITH_DECORATOR_NAME = "ConvertWith";

/**
 * Option interface for the @ToMapValue decorator.
 */
export interface ToMapValueOptions {
  /**
   * A string reference to a function that transforms the member's value
   * before it's put into the map generated by an @ToMap annotated method.
   */
  value: string;
}

/**
 * Decorator to specify a custom transformation for a member's value when used with @ToMap.
 * @param optionsOrValue The options or the method reference string directly.
 */
export function ToMapValue(optionsOrValue: ToMapValueOptions | string): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const TO_MAP_VALUE_DECORATOR_NAME = "ToMapValue";


/**
 * Decorator to mark a configuration interface member to be ignored by the processor.
 */
export function Ignore(): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const IGNORE_DECORATOR_NAME = "Ignore";

/**
 * Option interface for the @Parameter decorator.
 */
export interface ParameterDecoratorOptions {
  /** If true, null values are accepted for this parameter. Defaults to false. */
  acceptNull?: boolean;
}

/**
 * Decorator to indicate that a configuration member should be passed as a direct
 * parameter to the generated Impl class's constructor, rather than being read
 * from the configuration map.
 * @param options Parameter options.
 */
export function Parameter(options?: ParameterDecoratorOptions): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const PARAMETER_DECORATOR_NAME = "Parameter";

/**
 * Decorator for a method that returns a list of all configuration keys.
 * The decorated method in the interface should be typed to return `string[]` or `ReadonlyArray<string>`.
 */
export function CollectKeys(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const COLLECT_KEYS_DECORATOR_NAME = "CollectKeys";

/**
 * Decorator for a method that returns a map representation of the configuration.
 * The decorated method in the interface should be typed to return `Record<string, any>` or `Map<string, any>`.
 */
export function ToMap(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const TO_MAP_DECORATOR_NAME = "ToMap";

/**
 * Decorator for a method that implements graph store validation logic.
 * This method will call all @GraphStoreValidationCheck methods.
 * Expected signature in interface: `(graph: G, tc: TC, log: L) => void` (types are placeholders).
 */
export function GraphStoreValidation(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const GRAPH_STORE_VALIDATION_DECORATOR_NAME = "GraphStoreValidation";

/**
 * Decorator for a method that performs an individual graph store validation check.
 * Expected signature in interface: `(graph: G, tc: TC, log: L) => void` (types are placeholders).
 * This method is called by the @GraphStoreValidation method.
 */
export function GraphStoreValidationCheck(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const GRAPH_STORE_VALIDATION_CHECK_DECORATOR_NAME = "GraphStoreValidationCheck";

/**
 * Decorator for a method that performs post-construction validation or normalization.
 * If it returns `void`, it's a validation.
 * If it returns the configuration interface type, it's a normalizer.
 * Expected signature in interface: `() => void` or `() => MyConfigInterface`.
 */
export function Check(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const CHECK_DECORATOR_NAME = "Check";


/**
 * Option interface for range validation decorators.
 */
export interface RangeOptions<T> {
  min?: T;
  max?: T;
  minInclusive?: boolean;
  maxInclusive?: boolean;
}

export type IntegerRangeOptions = RangeOptions<number>;
export type LongRangeOptions = RangeOptions<number>; // TypeScript doesn't have a distinct long, use number
export type DoubleRangeOptions = RangeOptions<number>;

/**
 * Decorator to specify an integer range validation for a configuration member.
 * @param options Range options.
 */
export function IntegerRange(options: IntegerRangeOptions): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const INTEGER_RANGE_DECORATOR_NAME = "IntegerRange";

/**
 * Decorator to specify a "long" (number) range validation for a configuration member.
 * @param options Range options.
 */
export function LongRange(options: LongRangeOptions): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const LONG_RANGE_DECORATOR_NAME = "LongRange";

/**
 * Decorator to specify a double (number) range validation for a configuration member.
 * @param options Range options.
 */
export function DoubleRange(options: DoubleRangeOptions): MethodDecorator | PropertyDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    // AST parser will read this
  };
}
export const DOUBLE_RANGE_DECORATOR_NAME = "DoubleRange";

// --- Potentially other decorators if GDS has more, e.g., @DefaultValue ---
// export interface DefaultValueOptions<T> {
//   value: T; // Or string representation of the value if it's complex
// }
// export function DefaultValue<T>(options: DefaultValueOptions<T>): MethodDecorator | PropertyDecorator {
//   return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {};
// }
// export const DEFAULT_VALUE_DECORATOR_NAME = "DefaultValue";
