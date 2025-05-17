import { ValueType } from '@/api/ValueType'; // Adjusted path
import { DoubleArrayNodePropertyValues } from '../abstract/DoubleArrayNodePropertyValues'; // Assuming this interface exists
// import { MemoryEstimations } from '@/mem/MemoryEstimations'; // If memoryEstimation is needed

/**
 * An implementation of DoubleArrayNodePropertyValues that represents an empty set of double array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyDoubleArrayNodePropertyValues.
 */
export class EmptyDoubleArrayNodePropertyValues implements DoubleArrayNodePropertyValues {
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
  public valueType(): ValueType.DOUBLE_ARRAY {
    return ValueType.DOUBLE_ARRAY;
  }

  /**
   * Returns the count of nodes for which properties are stored, which is always 0.
   * @returns 0
   */
  public nodeCount(): number {
    return 0;
  }

  // Assuming DoubleArrayNodePropertyValues might extend a base NodePropertyValues,
  // or have its own specific methods that need "empty" implementations.

  // public hasValue(_nodeId: number): boolean {
  //   return false;
  // }

  // public release(): void {
  //   // No-op
  // }

  // public memoryEstimation(): MemoryEstimation {
  //   return MemoryEstimations.empty(); // Or MemoryEstimations.ZERO
  // }

  // If DoubleArrayNodePropertyValues has specific methods like dimension:
  // public dimension(): number {
  //   return 0; // Or 1 if it's for scalar arrays that are empty
  // }
}
