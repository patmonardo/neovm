import 'reflect-metadata';

/**
 * TypeScript equivalent of org.immutables.value.Value
 * Provides annotations for defining immutable value objects.
 */
export namespace Value {
  /**
   * Main annotation that marks a class for immutable implementation generation
   */
  export function Immutable(): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:immutable', true, target);
    };
  }

  /**
   * Equivalent of Java's BuilderVisibility enum
   */
  export enum BuilderVisibility {
    PUBLIC = 'PUBLIC',
    PACKAGE = 'PACKAGE',
    PRIVATE = 'PRIVATE',
    SAME = 'SAME'
  }

  /**
   * Equivalent of Java's ImplementationVisibility enum
   */
  export enum ImplementationVisibility {
    PUBLIC = 'PUBLIC',
    PACKAGE = 'PACKAGE',
    PRIVATE = 'PRIVATE',
    SAME = 'SAME'
  }

  /**
   * Configuration options for immutable value styles
   */
  export interface StyleOptions {
    allParameters?: boolean;
    builderVisibility?: BuilderVisibility;
    clearBuilder?: boolean;
    deferCollectionAllocation?: boolean;
    depluralize?: boolean;
    forceJacksonPropertyNames?: boolean;
    headerComments?: boolean;
    jdkOnly?: boolean;
    optionalAcceptNullable?: boolean;
    overshadowImplementation?: boolean;
    typeAbstract?: string;
    typeImmutable?: string;
    visibility?: ImplementationVisibility;
  }

  /**
   * Style configuration for value classes
   */
  export function Style(options: StyleOptions): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:style', options, target);
    };
  }

  /**
   * Marks a property as derived (computed from other properties)
   */
  export function Derived(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('value:derived', true, target, propertyKey);
    };
  }

  /**
   * Provides a default value for a property
   */
  export function Default(): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      Reflect.defineMetadata('value:default', true, target, propertyKey);
    };
  }

  /**
   * Marks a method as a modifiable copy method
   */
  export function Copy(): MethodDecorator {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      Reflect.defineMetadata('value:copy', true, target, propertyKey);
    };
  }

  /**
   * Marks a class as an auxiliary helper
   */
  export function Auxiliary(): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('value:auxiliary', true, target);
    };
  }
}

import 'reflect-metadata';

/**
 * TypeScript equivalent of org.neo4j.gds.annotation.ValueClass
 *
 * In Java, this triggers code generation via the Immutables processor.
 * In TypeScript, we use it as documentation and runtime metadata, plus
 * defining the pattern for manual implementation of immutable classes.
 *
 * Apply to abstract classes that define the API, then implement with
 * concrete classes named "Immutable" + the abstract class name.
 */
export function ValueClass(): ClassDecorator {
  return (target: Function) => {
    // Mark the class as immutable
    Value.Immutable()(target);

    // Apply the same style configuration as in Java
    Value.Style({
      allParameters: true,
      builderVisibility: Value.BuilderVisibility.SAME,
      clearBuilder: true,
      deferCollectionAllocation: true,
      depluralize: true,
      forceJacksonPropertyNames: false,
      headerComments: true,
      jdkOnly: true,
      optionalAcceptNullable: true,
      overshadowImplementation: true,
      typeAbstract: "*",
      typeImmutable: "Immutable*",
      visibility: Value.ImplementationVisibility.PUBLIC
    })(target);
  };
}

/**
 * Helper methods for ValueClass
 */
export namespace ValueClass {
  /**
   * Checks if a class is annotated with @ValueClass
   */
  export function isValueClass(target: any): boolean {
    return Reflect.getMetadata('value:immutable', target) === true;
  }

  /**
   * Gets the expected name for the immutable implementation
   */
  export function getImplementationName(abstractClass: Function): string {
    const style = Reflect.getMetadata('value:style', abstractClass) as Value.StyleOptions;
    if (!style || !style.typeImmutable) {
      return `Immutable${abstractClass.name}`;
    }

    return style.typeImmutable.replace('*', abstractClass.name);
  }

  /**
   * Makes an object deeply immutable
   */
  export function freeze<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    Object.keys(obj).forEach(key => {
      const value = (obj as any)[key];
      if (value !== null && typeof value === 'object') {
        (obj as any)[key] = freeze(value);
      }
    });

    return Object.freeze(obj);
  }
}
