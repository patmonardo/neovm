import 'reflect-metadata';

export enum ProcedureNamespace {
  PROCEDURE = "PROCEDURE",
  AGGREGATION_FUNCTION = "AGGREGATION_FUNCTION"
}

export function CustomProcedure(value: string, options: { namespace?: ProcedureNamespace } = {}): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const namespace = options.namespace || ProcedureNamespace.PROCEDURE;
    Reflect.defineMetadata('procedure:name', value, target, propertyKey);
    Reflect.defineMetadata('procedure:namespace', namespace, target, propertyKey);
  };
}

// Nested decorators as namespaces
export namespace CustomProcedure {
  export function ResultType(): ClassDecorator {
    return (target: Function) => {
      Reflect.defineMetadata('procedure:resultType', true, target);
    };
  }

  export function ResultField(): PropertyDecorator & MethodDecorator {
    return (target: Object, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
      Reflect.defineMetadata('procedure:resultField', true, target, propertyKey);
    };
  }
}

// // Usage would look like:
// class MyClass {
//   @CustomProcedure("myProcedure", { namespace: ProcedureNamespace.PROCEDURE })
//   myMethod(): MyResultType {
//     // implementation
//   }
// }

// @CustomProcedure.ResultType()
// class MyResultType {
//   @CustomProcedure.ResultField()
//   fieldA: string;

//   @CustomProcedure.ResultField()
//   getFieldB(): number {
//     return 42;
//   }
// }
