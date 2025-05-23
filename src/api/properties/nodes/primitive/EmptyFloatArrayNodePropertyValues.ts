import { ValueType } from "@/api";
import { FloatArrayNodePropertyValues } from "../abstract/FloatArrayNodePropertyValues";
import { UnsupportedOperationError } from "../NodePropertyValues";

/**
 * An implementation of FloatArrayNodePropertyValues that represents an empty set of float array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyFloatArrayNodePropertyValues.
 */
export class EmptyFloatArrayNodePropertyValues
  implements FloatArrayNodePropertyValues
{
  /**
   * The singleton instance of EmptyFloatArrayNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyFloatArrayNodePropertyValues();

  /**
   * A shared, empty Float32Array instance.
   * Float32Array is the standard typed array for 32-bit floating-point numbers (floats).
   */
  private static readonly EMPTY_ARRAY: Float32Array = new Float32Array(0);

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Private constructor
  }

  /**
   * Returns an empty float array for any given node ID.
   * @param _nodeId - The node ID (ignored).
   * @returns A statically defined empty Float32Array.
   */
  public floatArrayValue(_nodeId: number): Float32Array {
    return EmptyFloatArrayNodePropertyValues.EMPTY_ARRAY;
  }

  /**
   * Returns the type of values stored, which is FLOAT_ARRAY.
   * @returns ValueType.FLOAT_ARRAY
   */
  public valueType(): ValueType {
    return ValueType.FLOAT_ARRAY;
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
   * @returns An empty Float32Array
   */
  public getObject(_nodeId: number): Float32Array {
    return this.floatArrayValue(_nodeId);
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
   * Returns the maximum float array property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxFloatArrayPropertyValue(): Float32Array | undefined {
    return undefined;
  }

  // Type conversion methods

  /**
   * Cannot convert array to scalar float.
   * @throws UnsupportedOperationError
   */
  public floatValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert FLOAT_ARRAY to FLOAT");
  }

  /**
   * Cannot convert array to scalar double.
   * @throws UnsupportedOperationError
   */
  public doubleValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert FLOAT_ARRAY to DOUBLE");
  }

  /**
   * Cannot convert array to scalar long.
   * @throws UnsupportedOperationError
   */
  public longValue(_nodeId: number): number {
    throw new UnsupportedOperationError("Cannot convert FLOAT_ARRAY to LONG");
  }

  /**
   * Cannot convert array to boolean.
   * @throws UnsupportedOperationError
   */
  public booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError(
      "Cannot convert FLOAT_ARRAY to BOOLEAN"
    );
  }

  /**
   * Converts to double array (empty).
   */
  public doubleArrayValue(_nodeId: number): Float64Array {
    return new Float64Array(0);
  }

  /**
   * Converts to long array (empty).
   */
  public longArrayValue(_nodeId: number): number[] {
    return [];
  }
}
