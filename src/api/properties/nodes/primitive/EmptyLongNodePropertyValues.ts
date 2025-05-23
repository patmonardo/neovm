import { ValueType } from "@/api";
import { LongNodePropertyValues } from "../abstract/LongNodePropertyValues";
import { UnsupportedOperationError } from "../NodePropertyValues";

/**
 * An implementation of LongNodePropertyValues that represents an empty set of long properties.
 * It always returns -1 (as a default/sentinel value) for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyLongNodePropertyValues.
 */
export class EmptyLongNodePropertyValues implements LongNodePropertyValues {
  /**
   * The singleton instance of EmptyLongNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyLongNodePropertyValues();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Returns a default long value (-1) for any given node ID.
   * In GDS, -1 is often used as a sentinel for missing scalar long values.
   * @param _nodeId - The node ID (ignored).
   * @returns -1
   */
  public longValue(_nodeId: number): number {
    return -1;
  }

  /**
   * Returns the type of values stored, which is LONG.
   * @returns ValueType.LONG
   */
  public valueType(): ValueType {
    return ValueType.LONG;
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
   * @returns -1 as a Number object
   */
  public getObject(_nodeId: number): number {
    return this.longValue(_nodeId);
  }

  /**
   * Returns the dimension of this property.
   * @returns 1 (for scalar values)
   */
  public dimension(): number {
    return 1;
  }

  /**
   * Returns the maximum long property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxLongPropertyValue(): number | undefined {
    return undefined;
  }

  /**
   * Returns the maximum long property value across all nodes.
   * @returns undefined since there are no values
   */
  public getMaxDoublePropertyValue(): number | undefined {
    return undefined;
  }
  // Type conversion methods

  /**
   * Converts to double value.
   * @param _nodeId - The node ID (ignored).
   * @returns NaN (standard GDS behavior when converting empty/missing long to double)
   */
  public doubleValue(_nodeId: number): number {
    return Number.NaN;
  }

  /**
   * Converts to float value.
   * @param _nodeId - The node ID (ignored).
   * @returns NaN (standard GDS behavior when converting empty/missing long to float)
   */
  public floatValue(_nodeId: number): number {
    return Number.NaN;
  }

  /**
   * Cannot convert to boolean.
   * @throws UnsupportedOperationError
   */
  public booleanValue(_nodeId: number): boolean {
    throw new UnsupportedOperationError("Cannot convert LONG to BOOLEAN");
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public doubleArrayValue(_nodeId: number): Float64Array {
    throw new UnsupportedOperationError("Cannot convert LONG to DOUBLE_ARRAY");
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public longArrayValue(_nodeId: number): number[] {
    throw new UnsupportedOperationError("Cannot convert LONG to LONG_ARRAY");
  }

  /**
   * Cannot convert scalar to array.
   * @throws UnsupportedOperationError
   */
  public floatArrayValue(_nodeId: number): Float32Array {
    throw new UnsupportedOperationError("Cannot convert LONG to FLOAT_ARRAY");
  }
}
