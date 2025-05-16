import { ValueType } from "@/api/ValueType";
// import { MemoryEstimations } from '@/mem/MemoryEstimations';
import { FloatArrayNodePropertyValues } from "../abstract/FloatArrayNodePropertyValues"; // Assuming this interface exists

/**
 * An implementation of FloatArrayNodePropertyValues that represents an empty set of float array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyFloatArrayNodePropertyValues.
 */
export class EmptyFloatArrayNodePropertyValues
  implements Partial<FloatArrayNodePropertyValues>
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

  // Assuming FloatArrayNodePropertyValues might extend a base NodePropertyValues,
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

  // If FloatArrayNodePropertyValues has specific methods like dimension:
  // public dimension(): number {
  //   return 0; // Or 1 if it's for scalar arrays that are empty
  // }
}
