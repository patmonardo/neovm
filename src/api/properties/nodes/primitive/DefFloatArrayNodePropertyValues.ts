import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { NodePropertyValues } from "../NodePropertyValues";
import { FloatArrayNodePropertyValues } from "../abstract/FloatArrayNodePropertyValues";

/**
 * Default implementation of FloatArrayNodePropertyValues backed by a Map.
 */
export class DefFloatArrayNodePropertyValues implements FloatArrayNodePropertyValues {
  private readonly data: Map<number, Float32Array>;
  private readonly defaultValue: Float32Array;
  private readonly defaults: Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType" | "dimension"
  >;

  /**
   * Creates a new instance with the provided data and default value.
   *
   * @param inputData Map from node IDs to float array values
   * @param customDefaultValue Optional default value when node has no value
   */
  constructor(
    inputData: Map<number, ArrayLike<number>>,
    customDefaultValue?: DefaultValue
  ) {
    this.data = new Map<number, Float32Array>();
    inputData.forEach((arr, nodeId) => {
      this.data.set(nodeId, arr instanceof Float32Array ? arr : new Float32Array(arr));
    });

    const customDefault = customDefaultValue;
    if (customDefault instanceof Float32Array || customDefault === undefined) {
      this.defaultValue = customDefault || new Float32Array(0);
    } else if (Array.isArray(customDefault) ||
      (typeof customDefault === 'number' && typeof customDefault !== 'string')) {
      this.defaultValue = new Float32Array(customDefault as ArrayLike<number>);
    } else {
      this.defaultValue = customDefaultValue?.floatArrayValue() || new Float32Array(0);
    }

    this.defaults = NodePropertyValues.withDefaultsForType(() => this.valueType());
  }

  /**
   * Returns the value type of this property.
   */
  valueType(): ValueType {
    return ValueType.FLOAT_ARRAY;
  }

  /**
   * Returns the float array value for the specified node.
   *
   * @param nodeId The node ID
   * @returns The array value or default if not present
   */
  floatArrayValue(nodeId: number): Float32Array {
    return this.data.get(nodeId) ?? this.defaultValue;
  }

  /**
   * Converts to double array by converting each float element to a double.
   */
  doubleArrayValue(nodeId: number): Float64Array {
    const floatArr = this.floatArrayValue(nodeId);
    return floatArr ? new Float64Array(floatArr) : new Float64Array(0);
  }

  /**
   * Returns the object representation of the property value.
   *
   * @param nodeId The node ID
   * @returns The array value
   */
  getObject(nodeId: number): Float32Array {
    return this.floatArrayValue(nodeId);
  }

  /**
   * Returns the dimension of arrays stored by this property.
   * Following GDS convention, this is the length of the array at nodeId 0.
   */
  dimension(): number | undefined {
    const arr = this.floatArrayValue(0);
    return arr?.length;
  }

  /**
   * Returns the number of nodes with values.
   */
  nodeCount(): number {
    return this.data.size;
  }

  /**
   * Checks if a value exists for the given node ID.
   *
   * @param nodeId The node ID
   * @returns True if a value exists, false otherwise
   */
  hasValue(nodeId: number): boolean {
    return this.data.has(nodeId);
  }

  /**
   * Releases any resources associated with this property.
   */
  release(): void {
    this.data.clear();
  }

  /**
   * Returns the maximum float array value across all nodes.
   * For arrays, this returns the array with the largest value at any position.
   */
  getMaxFloatArrayPropertyValue(): Float32Array | undefined {
    if (this.data.size === 0) {
      return undefined;
    }

    // Find the maximum length of any array
    let maxLength = 0;
    for (const array of this.data.values()) {
      maxLength = Math.max(maxLength, array.length);
    }

    if (maxLength === 0) {
      return new Float32Array(0);
    }

    // For each position, find the maximum value
    const result = new Float32Array(maxLength);
    result.fill(-Infinity);

    for (const array of this.data.values()) {
      for (let i = 0; i < array.length; i++) {
        result[i] = Math.max(result[i], array[i]);
      }
    }

    return result;
  }

  /**
   * Converts to long array by converting each float element to a long.
   */
  longArrayValue(nodeId: number): number[] {
    const floatArr = this.floatArrayValue(nodeId);
    if (!floatArr) return [];

    const result = new Array(floatArr.length);
    for (let i = 0; i < floatArr.length; i++) {
      // Convert float to long (integer in JavaScript)
      result[i] = Math.floor(floatArr[i]);
    }
    return result;
  }

  // --- Methods that throw errors for incompatible type conversions ---

  /**
   * Cannot convert array to scalar float.
   */
  floatValue(nodeId: number): number {
    return this.defaults.floatValue!(nodeId);
  }

  /**
   * Cannot convert array to scalar double.
   */
  doubleValue(nodeId: number): number {
    return this.defaults.doubleValue!(nodeId);
  }

  /**
   * Cannot convert array to scalar long.
   */
  longValue(nodeId: number): number {
    return this.defaults.longValue!(nodeId);
  }

  /**
   * Cannot convert array to boolean.
   */
  booleanValue(nodeId: number): boolean {
    return this.defaults.booleanValue!(nodeId);
  }

  /**
   * Not applicable for float arrays.
   */
  getMaxFloatPropertyValue(): number | undefined {
    return this.defaults.getMaxFloatPropertyValue?.();
  }

  /**
   * Not applicable for float arrays.
   */
  getMaxDoublePropertyValue(): number | undefined {
    return this.defaults.getMaxDoublePropertyValue!();
  }

  /**
   * Not applicable for float arrays.
   */
  getMaxLongPropertyValue(): number | undefined {
    return this.defaults.getMaxLongPropertyValue!();
  }

  /**
   * Not applicable for float arrays.
   */
  getMaxBooleanPropertyValue(): boolean | undefined {
    return this.defaults.getMaxBooleanPropertyValue?.();
  }
  /**
   * Not applicable for float arrays.
   */
  getMaxStringPropertyValue(): string | undefined {
    return this.defaults.getMaxStringPropertyValue?.();
  }
  /**
   * Not applicable for float arrays.
   */
  getMaxFloatArrayPropertyValue(): Float32Array | undefined {
    return this.defaults.getMaxFloatArrayPropertyValue?.();
  }
}
