import { ValueType } from '@/api';
import { DoubleNodePropertyValues } from '../abstract/DoubleNodePropertyValues';
import { UnsupportedOperationError } from '../NodePropertyValues';

/**
 * An implementation of DoubleNodePropertyValues that represents an empty set of double properties.
 * It always returns NaN (as a default/sentinel value for missing doubles) for any node ID
 * and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyDoubleNodePropertyValues.
 */
export class EmptyDoubleNodePropertyValues implements DoubleNodePropertyValues {
  /**
   * The singleton instance of EmptyDoubleNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyDoubleNodePropertyValues();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Private constructor
  }

  /**
   * Returns a default double value (NaN) for any given node ID.
   * NaN (Not-a-Number) is often used as a sentinel for missing scalar double values in GDS.
   * @param _nodeId - The node ID (ignored).
   * @returns NaN
   */
  public doubleValue(_nodeId: number): number {
    return NaN;
  }

  /**
   * Returns the object representation of the property value.
   * @param nodeId The node ID
   * @returns NaN as a Number object
   */
  public getObject(_nodeId: number): number {
    return this.doubleValue(_nodeId);
  }

  /**
   * Returns the type of values stored, which is DOUBLE.
   * @returns ValueType.DOUBLE
   */
  public valueType(): ValueType {
    return ValueType.DOUBLE;
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
    return false; // NaN indicates absence of a value
  }

  /**
   * No-op release method.
   */
  public release(): void {
    // No-op
  }

  /**
   * Returns the dimension of this property.
   * @returns 1 (for scalar values)
   */
  public dimension(): number {
    return 1; // For scalar doubles, the dimension is 1
  }
  /**
   * Returns the maximum double property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxLongPropertyValue(): number | undefined {
    return undefined;
  }

  /**
   * Returns the maximum double property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxDoublePropertyValue(): number | undefined {
    return undefined;
  }

  // Type conversion methods

  /**
   * Converts to long value.
   */
  public longValue(_nodeId: number): number {
    return 0; // Default long value when converting from empty double
  }

  /**
   * Converts to float value.
   */
  public floatValue(_nodeId: number): number {
    return Number.NaN; // Same as double value
  }

  /**
   * Cannot convert to boolean.
   * @throws UnsupportedOperationError
   */
  public booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError("Cannot convert DOUBLE to BOOLEAN");
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public doubleArrayValue(_nodeId: number): Float64Array {
    throw new UnsupportedOperationError(
      "Cannot convert DOUBLE to DOUBLE_ARRAY"
    );
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public longArrayValue(_nodeId: number): number[] {
    throw new UnsupportedOperationError("Cannot convert DOUBLE to LONG_ARRAY");
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public floatArrayValue(_nodeId: number): Float32Array {
    throw new UnsupportedOperationError("Cannot convert DOUBLE to FLOAT_ARRAY");
  }
}
