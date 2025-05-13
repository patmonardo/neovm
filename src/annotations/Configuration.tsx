// src/annotations/Configuration.ts
import 'reflect-metadata';

/**
 * Configuration decorator for classes and interfaces.
 * Used to mark a class as a configuration class.
 */
export function Configuration(target: Function): void;
export function Configuration(value: string): (target: Function) => void;
export function Configuration(targetOrValue: any): any {
  if (typeof targetOrValue === 'function') {
    // Used as @Configuration
    Reflect.defineMetadata('isConfiguration', true, targetOrValue);
    return;
  }

  // Used as @Configuration("ClassName")
  return (target: Function) => {
    Reflect.defineMetadata('isConfiguration', true, target);
    Reflect.defineMetadata('configurationName', targetOrValue, target);
  };
}

// Add nested decorators to the Configuration namespace
export namespace Configuration {
  /**
   * Defines a custom key to look up in the configuration map
   */
  export function Key(value: string): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('config:key', value, target, propertyKey);
    };
  }

  /**
   * Converts input using a specified method
   */
  export function ConvertWith(method: string): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('config:converter', method, target, propertyKey);
    };
  }

  /**
   * Specifies how to convert the value when creating a map
   */
  export function ToMapValue(value: string): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('config:toMapValue', value, target, propertyKey);
    };
  }

  /**
   * Marks a method to be ignored by the configuration processor
   */
  export function Ignore(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:ignore', true, target, propertyKey);
  }

  /**
   * Marks a field as a required parameter
   */
  export function Parameter(acceptNull = false): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('config:parameter', true, target, propertyKey);
      Reflect.defineMetadata('config:acceptNull', acceptNull, target, propertyKey);
    };
  }

  /**
   * Collects all configuration keys
   */
  export function CollectKeys(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:collectKeys', true, target, propertyKey);
  }

  /**
   * Generates a map representation of the configuration
   */
  export function ToMap(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:toMap', true, target, propertyKey);
  }

  /**
   * Validates a GraphStore
   */
  export function GraphStoreValidation(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:graphStoreValidation', true, target, propertyKey);
  }

  /**
   * Used to validate configuration against a GraphStore
   */
  export function GraphStoreValidationCheck(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:graphStoreValidationCheck', true, target, propertyKey);
  }

  /**
   * Validates the configuration after creation
   */
  export function Check(target: Object, propertyKey: string | symbol): void {
    Reflect.defineMetadata('config:check', true, target, propertyKey);
  }

  /**
   * Validates an integer is within a range
   */
  export function IntegerRange(options: {
    min?: number;
    max?: number;
    minInclusive?: boolean;
    maxInclusive?: boolean;
  }): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      const rangeOptions = {
        min: options.min ?? Number.MIN_SAFE_INTEGER,
        max: options.max ?? Number.MAX_SAFE_INTEGER,
        minInclusive: options.minInclusive ?? true,
        maxInclusive: options.maxInclusive ?? true,
      };
      Reflect.defineMetadata('config:intRange', rangeOptions, target, propertyKey);
    };
  }

  /**
   * Validates a long (number) is within a range
   */
  export function LongRange(options: {
    min?: number;
    max?: number;
    minInclusive?: boolean;
    maxInclusive?: boolean;
  }): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      const rangeOptions = {
        min: options.min ?? Number.MIN_SAFE_INTEGER,
        max: options.max ?? Number.MAX_SAFE_INTEGER,
        minInclusive: options.minInclusive ?? true,
        maxInclusive: options.maxInclusive ?? true,
      };
      Reflect.defineMetadata('config:longRange', rangeOptions, target, propertyKey);
    };
  }

  /**
   * Validates a double (number) is within a range
   */
  export function DoubleRange(options: {
    min?: number;
    max?: number;
    minInclusive?: boolean;
    maxInclusive?: boolean;
  }): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      const rangeOptions = {
        min: options.min ?? -Number.MAX_VALUE,
        max: options.max ?? Number.MAX_VALUE,
        minInclusive: options.minInclusive ?? true,
        maxInclusive: options.maxInclusive ?? true,
      };
      Reflect.defineMetadata('config:doubleRange', rangeOptions, target, propertyKey);
    };
  }
}
