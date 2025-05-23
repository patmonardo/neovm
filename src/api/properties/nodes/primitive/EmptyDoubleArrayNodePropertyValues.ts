import { ValueType } from '@/api/ValueType';
import { DoubleArrayNodePropertyValues } from '../abstract/DoubleArrayNodePropertyValues';
import { UnsupportedOperationError } from '../NodePropertyValues';

/**
 * An implementation of DoubleArrayNodePropertyValues that represents an empty set of double array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyDoubleArrayNodePropertyValues.
 */
export class EmptyDoubleArrayNodePropertyValues
  implements DoubleArrayNodePropertyValues
{
  /**
   * The singleton instance of EmptyDoubleArrayNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyDoubleArrayNodePropertyValues();

  /**
   * A shared, empty Float64Array instance.
   * Float64Array is the standard typed array for 64-bit floating-point numbers (doubles).
   */
  private static readonly EMPTY_ARRAY: Float64Array = new Float64Array(0);

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Private constructor
  }

  /**
   * Returns an empty double array for any given node ID.
   * @param _nodeId - The node ID (ignored).
   * @returns A statically defined empty Float64Array.
   */
  public doubleArrayValue(_nodeId: number): Float64Array {
    return EmptyDoubleArrayNodePropertyValues.EMPTY_ARRAY;
  }

  /**
   * Returns the type of values stored, which is DOUBLE_ARRAY.
   * @returns ValueType.DOUBLE_ARRAY
   */
  public valueType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
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
   * @param _nodeId The node ID (ignored)
   * @returns An empty Float64Array
   */
  public getObject(_nodeId: number): Float64Array {
    return this.doubleArrayValue(_nodeId);
  }

  /**
   * Returns the dimension of this property.
   * @returns 1 (for array values)
   */
  public dimension(): number {
    return 1; // For array values, we return 1 (the arrays themselves are variable length)
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
   * Returns the maximum double array property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxDoubleArrayPropertyValue(): Float64Array | undefined {
    return undefined;
  }

  // Type conversion methods

  /**
   * Cannot convert array to scalar double.
   * @throws UnsupportedOperationError
   */
  public doubleValue(_nodeId: number): number {
    throw new UnsupportedOperationError(
      "Cannot convert DOUBLE_ARRAY to DOUBLE"
    );
  }

  /**
   * Cannot convert array to scalar long.
   * @throws UnsupportedOperationError
   */
  public longValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert DOUBLE_ARRAY to LONG");
  }

  /**
   * Cannot convert array to scalar float.
   * @throws UnsupportedOperationError
   */
  public floatValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert DOUBLE_ARRAY to FLOAT");
  }

  /**
   * Cannot convert array to boolean.
   * @throws UnsupportedOperationError
   */
  public booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError(
      "Cannot convert DOUBLE_ARRAY to BOOLEAN"
    );
  }

  /**
   * Converts to float array (empty).
   */
  public floatArrayValue(_nodeId: number): Float32Array {
    return new Float32Array(0);
  }

  /**
   * Converts to long array (empty).
   */
  public longArrayValue(_nodeId: number): number[] {
    return [];
  }
}
