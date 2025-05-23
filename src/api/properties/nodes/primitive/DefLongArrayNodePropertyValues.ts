import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { NodePropertyValues } from "../NodePropertyValues";
import { UnsupportedOperationError } from "../NodePropertyValues";
import { LongArrayNodePropertyValues } from "../abstract/LongArrayNodePropertyValues";

/**
 * Default implementation of LongArrayNodePropertyValues backed by a Map.
 */
export class DefLongArrayNodePropertyValues implements LongArrayNodePropertyValues {
  private readonly data: Map<number, number[]>;
  private readonly defaultValue: number[];
  private readonly defaults: Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType"
  >;

  /**
   * Creates a new instance with the provided data and default value.
   *
   * @param data Map from node IDs to long array values
   * @param customDefaultValue Optional default value when node has no value (defaults to empty array)
   */
  constructor(data: Map<number, number[]>, customDefaultValue?: number[]) {
    this.data = data;
    this.defaultValue = customDefaultValue || [];
    this.defaults = NodePropertyValues.withDefaultsForType(() =>
      this.valueType()
    );
  }

  // --- Methods specific to LongArrayNodePropertyValues or overriding defaults ---

  /**
   * Returns the value type of this property.
   */
  valueType(): ValueType.LONG_ARRAY {
    return ValueType.LONG_ARRAY;
  }

  /**
   * Returns the long array value for the specified node.
   *
   * @param nodeId The node ID
   * @returns The array value or default if not present
   */
  longArrayValue(nodeId: number): number[] {
    if (this.data.has(nodeId)) {
      return this.data.get(nodeId)!;
    }
    return this.defaultValue;
  }

  /**
   * Returns the object representation of the property value.
   *
   * @param nodeId The node ID
   * @returns The array value
   */
  getObject(nodeId: number): number[] {
    return this.longArrayValue(nodeId);
  }

  /**
   * Returns the dimension of this property.
   * For arrays, this returns 1 (as the array itself is a single dimension).
   */
  dimension(): number {
    return 1;
  }

  // --- Required methods from NodePropertyValues base ---

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

  getMaxLongPropertyValue(): number | undefined {
    if (this.data.size === 0) {
      return undefined;
    }
    let max = -Infinity; // Or Number.MIN_SAFE_INTEGER if only positive longs are expected
    for (const value of this.data.values()) {
      if (value > max) {
        max = value;
      }
    }
    return max;
  }

  /**
   * Returns the maximum long array value across all nodes.
   * For arrays, this returns the array with the largest value at any position.
   */
  getMaxLongArrayPropertyValue(): number[] | undefined {
    if (this.data.size === 0) {
      return undefined;
    }

    // Find the maximum length of any array
    let maxLength = 0;
    for (const array of this.data.values()) {
      maxLength = Math.max(maxLength, array.length);
    }

    if (maxLength === 0) {
      return [];
    }

    // For each position, find the maximum value
    const result = new Array(maxLength).fill(-Infinity);

    for (const array of this.data.values()) {
      for (let i = 0; i < array.length; i++) {
        result[i] = Math.max(result[i], array[i]);
      }
    }

    return result;
  }

  // --- Type conversions ---

  /**
   * Cannot convert array to scalar long.
   * @throws UnsupportedOperationError
   */
  longValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to LONG");
  }

  /**
   * Cannot convert array to scalar double.
   * @throws UnsupportedOperationError
   */
  doubleValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to DOUBLE");
  }

  /**
   * Cannot convert array to scalar float.
   * @throws UnsupportedOperationError
   */
  floatValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to FLOAT");
  }

  /**
   * Cannot convert array to boolean.
   * @throws UnsupportedOperationError
   */
  booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to BOOLEAN");
  }

  /**
   * Converts to double array by converting each long element to a double.
   */
  doubleArrayValue(nodeId: number): Float64Array {
    const longArray = this.longArrayValue(nodeId);
    const doubleArray = new Float64Array(longArray.length);
    for (let i = 0; i < longArray.length; i++) {
      doubleArray[i] = Number(longArray[i]);
    }
    return doubleArray;
  }

  /**
   * Converts to float array by converting each long element to a float.
   */
  floatArrayValue(nodeId: number): Float32Array {
    const longArray = this.longArrayValue(nodeId);
    const floatArray = new Float32Array(longArray.length);
    for (let i = 0; i < longArray.length; i++) {
      floatArray[i] = Number(longArray[i]);
    }
    return floatArray;
  }
}
