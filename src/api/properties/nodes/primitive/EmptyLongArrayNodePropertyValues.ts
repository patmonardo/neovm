import { ValueType } from '@/api';
import { LongArrayNodePropertyValues } from '../abstract/LongArrayNodePropertyValues';
import { UnsupportedOperationError } from '../NodePropertyValues';

/**
 * An implementation of LongArrayNodePropertyValues that represents an empty set of long array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 */
export class EmptyLongArrayNodePropertyValues implements LongArrayNodePropertyValues {
  /**
   * The singleton instance of EmptyLongArrayNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyLongArrayNodePropertyValues();

  /**
   * A shared, empty array instance.
   */
  private static readonly EMPTY_ARRAY: number[] = [];

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Returns an empty long array for any given node ID.
   * @param _nodeId - The node ID (ignored).
   * @returns A statically defined empty array.
   */
  public longArrayValue(_nodeId: number): number[] {
    return EmptyLongArrayNodePropertyValues.EMPTY_ARRAY;
  }

  /**
   * Returns the type of values stored, which is LONG_ARRAY.
   * @returns ValueType.LONG_ARRAY
   */
  public valueType(): ValueType {
    return ValueType.LONG_ARRAY;
  }

  /**
   * Returns the count of nodes for which properties are stored, which is always 0.
   * @returns 0
   */
  public nodeCount(): number {
    return 0;
  }

  /**
   * Checks if a value exists for the given node ID, which is always false.
   * @param _nodeId - The node ID (ignored).
   * @returns false
   */
  public hasValue(_nodeId: number): boolean {
    return false;
  }

  /**
   * No-op release method.
   */
  public release(): void {
    // No-op
  }

  /**
   * Returns the object representation of the property value.
   * @param nodeId The node ID
   * @returns An empty array
   */
  public getObject(nodeId: number): number[] {
    return this.longArrayValue(nodeId);
  }

  /**
   * Returns the dimension of this property.
   * @returns 1 (for array dimension)
   */
  public dimension(): number {
    return 1;
  }

  // Type conversion methods - throw appropriate errors or return defaults

  /**
   * Cannot convert array to scalar long.
   * @throws UnsupportedOperationError
   */
  public longValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to LONG");
  }

  /**
   * Cannot convert array to scalar double.
   * @throws UnsupportedOperationError
   */
  public doubleValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to DOUBLE");
  }

  /**
   * Cannot convert array to scalar float.
   * @throws UnsupportedOperationError
   */
  public floatValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to FLOAT");
  }

  /**
   * Cannot convert array to boolean.
   * @throws UnsupportedOperationError
   */
  public booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError("Cannot convert LONG_ARRAY to BOOLEAN");
  }

  /**
   * Converts to double array (empty).
   */
  public doubleArrayValue(_nodeId: number): Float64Array {
    return new Float64Array(0);
  }

  /**
   * Converts to float array (empty).
   */
  public floatArrayValue(_nodeId: number): Float32Array {
    return new Float32Array(0);
  }
  /**
   * Returns the maximum value across all nodes, which is undefined for an empty array.
   */
  public getMaxLongPropertyValue(): number | undefined {
    return undefined;
  }
  /**
   * Returns the maximum value across all nodes, which is undefined for an empty array.
   */
  public getMaxLongArrayPropertyValue(): number[] | undefined {
    return undefined;
  }

  /**
   * Returns the maximum value across all nodes, which is undefined for an empty array.
   */
  public getMaxDoublePropertyValue(): number | undefined {
    return undefined;
  }

  /**
   * Returns the maximum value across all nodes, which is undefined for an empty array.
   */
  public getMaxDoubleArrayPropertyValue(): number[] | undefined {
    return undefined;
  }
}
