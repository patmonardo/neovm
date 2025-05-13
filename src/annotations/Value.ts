import 'reflect-metadata';

/**
 * Namespace for Value annotations that mimic the org.immutables.value.Value annotations in Java
 */
export namespace Value {
  /**
   * Main decorator for immutable value classes
   */
  export function Immutable(): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:immutable', true, target);
    };
  }

  /**
   * Marks a class as an auxiliary helper for value classes
   */
  export function Auxiliary(): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:auxiliary', true, target);
    };
  }

  /**
   * For derived properties (computed from other properties)
   */
  export function Derived(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('value:derived', true, target, propertyKey);
    };
  }

  /**
   * For default values on properties
   */
  export function Default(defaultValue: any): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      const defaults = Reflect.getMetadata('value:defaults', target.constructor) || {};
      defaults[propertyKey.toString()] = defaultValue;
      Reflect.defineMetadata('value:defaults', defaults, target.constructor);
    };
  }

  /**
   * Style configuration for value classes (mimics Java @Value.Style)
   */
  export interface StyleOptions {
    allParameters?: boolean;
    builderVisibility?: 'public' | 'package' | 'private';
    typeAbstract?: string;
    typeImmutable?: string;
    visibility?: 'public' | 'package' | 'private';
  }

  export function Style(options: StyleOptions): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:style', options, target);
    };
  }
}

/**
 * Annotation that marks a class as an immutable value class.
 *
 * In Java, this triggers the Immutables processor to generate implementation classes.
 * In TypeScript, this serves as documentation and provides runtime metadata.
 *
 * Use with abstract classes that define an interface, then implement with classes
 * named "Immutable" + the abstract class name.
 */
export function ValueClass(): ClassDecorator {
  return (target: Function) => {
    // Apply Value.Immutable
    Value.Immutable()(target);

    // Apply standard style
    Value.Style({
      allParameters: true,
      builderVisibility: 'public',
      typeAbstract: '*',
      typeImmutable: 'Immutable*',
      visibility: 'public'
    })(target);
  };
}
