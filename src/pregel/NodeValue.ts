import { PregelSchema } from './PregelSchema';
import { Element } from './Element';
import { ValueType } from '../api/ValueType';
import { HugeDoubleArray } from '../collections/ha/HugeDoubleArray';
import { HugeLongArray } from '../collections/ha/HugeLongArray';
import { HugeObjectArray } from '../collections/ha/HugeObjectArray';
import { DefaultValue } from '../api/DefaultValue';
import { ParallelUtil } from '../concurrency/ParallelUtil';
import { TerminationFlag } from '../termination/TerminationFlag';
import { Concurrency } from '../concurrency/Concurrency';
import { FloatingPointValue, IntegralValue } from '../values/gdsValue';

/**
 * Stores and manages node property values for Pregel computations.
 * Properties are stored in typed arrays optimized for memory efficiency and access speed.
 */
export abstract class NodeValue {
  protected readonly pregelSchema: PregelSchema;
  protected readonly propertyTypes: Map<string, ValueType>;

  constructor(pregelSchema: PregelSchema) {
    this.pregelSchema = pregelSchema;
    this.propertyTypes = new Map();
    
    pregelSchema.elements.forEach(element => {
      this.propertyTypes.set(element.propertyKey, element.propertyType);
    });
  }

  /**
   * Create a NodeValue instance based on the given schema
   */
  static of(schema: PregelSchema, nodeCount: number, concurrency: Concurrency): NodeValue {
    const properties = new Map<string, any>();
    
    // Initialize arrays for each property
    schema.elements.forEach(element => {
      properties.set(element.propertyKey, NodeValue.initArray(element, nodeCount, concurrency));
    });

    // For single property schemas, use the optimized implementation
    if (schema.elements.size === 1) {
      const element = schema.elements.values().next().value;
      const property = properties.values().next().value;
      return new SingleNodeValue(schema, element, property);
    }

    return new CompositeNodeValue(schema, properties);
  }

  /**
   * Estimate memory requirements for storing node properties
   */
  static memoryEstimation(properties: Map<string, ValueType>): any {
    // Simplified memory estimation for TypeScript version
    // In a real implementation, we'd calculate actual memory usage
    const estimation = {
      components: {} as Record<string, any>
    };

    properties.forEach((propertyType, propertyKey) => {
      const entry = `${propertyKey} (${propertyType})`;
      
      switch (propertyType) {
        case ValueType.LONG:
          estimation.components[entry] = {
            type: 'HugeLongArray',
            bytes: 8,  // 8 bytes per long
            perNode: true
          };
          break;
        case ValueType.DOUBLE:
          estimation.components[entry] = {
            type: 'HugeDoubleArray',
            bytes: 8,  // 8 bytes per double
            perNode: true
          };
          break;
        case ValueType.LONG_ARRAY:
          estimation.components[entry] = {
            type: 'HugeObjectArray<long[]>',
            bytes: 120, // Assuming array of 10 longs + overhead
            perNode: true
          };
          break;
        case ValueType.DOUBLE_ARRAY:
          estimation.components[entry] = {
            type: 'HugeObjectArray<double[]>',
            bytes: 120, // Assuming array of 10 doubles + overhead
            perNode: true
          };
          break;
      }
    });

    return estimation;
  }

  /**
   * Get the schema used by this NodeValue
   */
  schema(): PregelSchema {
    return this.pregelSchema;
  }

  /**
   * Get the array of double properties for the given key
   */
  abstract doubleProperties(propertyKey: string): HugeDoubleArray;

  /**
   * Get the array of long properties for the given key
   */
  abstract longProperties(propertyKey: string): HugeLongArray;
  
  /**
   * Get the array of long array properties for the given key
   */
  abstract longArrayProperties(propertyKey: string): HugeObjectArray<number[]>;
  
  /**
   * Get the array of double array properties for the given key
   */
  abstract doubleArrayProperties(propertyKey: string): HugeObjectArray<number[]>;

  /**
   * Get the double value for a specific node and property
   */
  doubleValue(key: string, nodeId: number): number {
    return this.doubleProperties(key).get(nodeId);
  }

  /**
   * Get the long value for a specific node and property
   */
  longValue(key: string, nodeId: number): number {
    return this.longProperties(key).get(nodeId);
  }

  /**
   * Get the long array value for a specific node and property
   */
  longArrayValue(key: string, nodeId: number): number[] {
    const arrayProperties = this.longArrayProperties(key);
    return arrayProperties.get(nodeId);
  }

  /**
   * Get the double array value for a specific node and property
   */
  doubleArrayValue(key: string, nodeId: number): number[] {
    const arrayProperties = this.doubleArrayProperties(key);
    return arrayProperties.get(nodeId);
  }

  /**
   * Set the double value for a specific node and property
   */
  set(key: string, nodeId: number, value: number): void {
    this.doubleProperties(key).set(nodeId, value);
  }

  /**
   * Set the long value for a specific node and property
   */
  setLong(key: string, nodeId: number, value: number): void {
    this.longProperties(key).set(nodeId, value);
  }

  /**
   * Set the long array value for a specific node and property
   */
  setLongArray(key: string, nodeId: number, value: number[]): void {
    this.longArrayProperties(key).set(nodeId, value);
  }

  /**
   * Set the double array value for a specific node and property
   */
  setDoubleArray(key: string, nodeId: number, value: number[]): void {
    this.doubleArrayProperties(key).set(nodeId, value);
  }

  /**
   * Check that the property type matches the expected type
   */
  protected checkProperty(key: string, expectedType: ValueType): void {
    const actualType = this.propertyTypes.get(key);
    this.validateProperty(key, actualType, expectedType);
  }

  /**
   * Validate property type and existence
   */
  protected validateProperty(key: string, actualType: ValueType | undefined, expectedType: ValueType): void {
    if (actualType === undefined) {
      throw new Error(
        `Property with key ${key} does not exist. ` +
        `Available properties are: ${Array.from(this.propertyTypes.keys()).join(', ')}`
      );
    }

    if (actualType !== expectedType) {
      throw new Error(
        `Requested property type ${expectedType} is not compatible with ` +
        `available property type ${actualType} for key ${key}. ` +
        `Available property types: ${Array.from(this.propertyTypes.entries())
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}`
      );
    }
  }

  /**
   * Initialize array for a given property element
   */
  private static initArray(element: Element, nodeCount: number, concurrency: Concurrency): any {
    switch (element.propertyType) {
      case ValueType.DOUBLE: {
        const doubleNodeValues = HugeDoubleArray.newArray(nodeCount);
        const doubleDefaultValue = element.defaultValue instanceof FloatingPointValue 
          ? element.defaultValue.doubleValue() 
          : DefaultValue.DOUBLE_DEFAULT_FALLBACK;
          
        ParallelUtil.parallelForEachNode(
          nodeCount,
          concurrency,
          TerminationFlag.RUNNING_TRUE,
          nodeId => doubleNodeValues.set(nodeId, doubleDefaultValue)
        );
        return doubleNodeValues;
      }
      case ValueType.LONG: {
        const longNodeValues = HugeLongArray.newArray(nodeCount);
        const longDefaultValue = element.defaultValue instanceof IntegralValue
          ? element.defaultValue.longValue() 
          : DefaultValue.LONG_DEFAULT_FALLBACK;
          
        ParallelUtil.parallelForEachNode(
          nodeCount,
          concurrency, 
          TerminationFlag.RUNNING_TRUE,
          nodeId => longNodeValues.set(nodeId, longDefaultValue)
        );
        return longNodeValues;
      }
      case ValueType.LONG_ARRAY: {
        if (element.defaultValue !== undefined) {
          throw new Error("Default value is not supported for long array properties");
        }
        return HugeObjectArray.newArray(Array, nodeCount);
      }
      case ValueType.DOUBLE_ARRAY: {
        if (element.defaultValue !== undefined) {
          throw new Error("Default value is not supported for double array properties");
        }
        return HugeObjectArray.newArray(Array, nodeCount);
      }
      default:
        throw new Error(`Unsupported value type: ${element.propertyType}`);
    }
  }
}

/**
 * Optimized implementation for storing a single node property
 */
export class SingleNodeValue extends NodeValue {
  private readonly element: Element;
  private readonly property: any;

  constructor(pregelSchema: PregelSchema, element: Element, property: any) {
    super(pregelSchema);
    this.element = element;
    this.property = property;
  }

  doubleProperties(propertyKey: string): HugeDoubleArray {
    this.checkProperty(propertyKey, ValueType.DOUBLE);
    return this.property as HugeDoubleArray;
  }

  longProperties(propertyKey: string): HugeLongArray {
    this.checkProperty(propertyKey, ValueType.LONG);
    return this.property as HugeLongArray;
  }

  longArrayProperties(propertyKey: string): HugeObjectArray<number[]> {
    this.checkProperty(propertyKey, ValueType.LONG_ARRAY);
    return this.property as HugeObjectArray<number[]>;
  }

  doubleArrayProperties(propertyKey: string): HugeObjectArray<number[]> {
    this.checkProperty(propertyKey, ValueType.DOUBLE_ARRAY);
    return this.property as HugeObjectArray<number[]>;
  }

  protected checkProperty(key: string, expectedType: ValueType): void {
    const actualType = this.element.propertyKey === key ? this.element.propertyType : undefined;
    this.validateProperty(key, actualType, expectedType);
  }
}

/**
 * Implementation for storing multiple node properties
 */
export class CompositeNodeValue extends NodeValue {
  private readonly properties: Map<string, any>;

  constructor(pregelSchema: PregelSchema, properties: Map<string, any>) {
    super(pregelSchema);
    this.properties = properties;
  }

  doubleProperties(propertyKey: string): HugeDoubleArray {
    this.checkProperty(propertyKey, ValueType.DOUBLE);
    return this.properties.get(propertyKey) as HugeDoubleArray;
  }

  longProperties(propertyKey: string): HugeLongArray {
    this.checkProperty(propertyKey, ValueType.LONG);
    return this.properties.get(propertyKey) as HugeLongArray;
  }

  longArrayProperties(propertyKey: string): HugeObjectArray<number[]> {
    this.checkProperty(propertyKey, ValueType.LONG_ARRAY);
    return this.properties.get(propertyKey) as HugeObjectArray<number[]>;
  }

  doubleArrayProperties(propertyKey: string): HugeObjectArray<number[]> {
    this.checkProperty(propertyKey, ValueType.DOUBLE_ARRAY);
    return this.properties.get(propertyKey) as HugeObjectArray<number[]>;
  }
}