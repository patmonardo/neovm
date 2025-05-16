import { ValueType } from '@/api/ValueType'; // Adjusted path assuming ValueType is in @/api
import { LongArrayNodePropertyValues } from '../abstract/LongArrayNodePropertyValues';

/**
 * An implementation of LongArrayNodePropertyValues that represents an empty set of long array properties.
 * It always returns an empty array for any node ID and reports a node count of 0.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.EmptyLongArrayNodePropertyValues.
 */
export class EmptyLongArrayNodePropertyValues implements LongArrayNodePropertyValues {
  /**
   * The singleton instance of EmptyLongArrayNodePropertyValues.
   */
  public static readonly INSTANCE = new EmptyLongArrayNodePropertyValues();

  /**
   * A shared, empty BigInt64Array instance.
   * Using BigInt64Array to align with Java's long[].
   */
  private static readonly EMPTY_ARRAY: BigInt64Array = new BigInt64Array(0);

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Private constructor
  }

  /**
   * Returns an empty long array for any given node ID.
   * @param _nodeId - The node ID (ignored).
   * @returns A statically defined empty BigInt64Array.
   */
  public longArrayValue(_nodeId: number): BigInt64Array {
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

  // Potentially other methods from NodePropertyValues if they need specific empty implementations:
  // For example, if NodePropertyValues has hasValue(nodeId: number): boolean;
  // public hasValue(_nodeId: number): boolean {
  //   return false;
  // }

  // If NodePropertyValues has release(): void;
  // public release(): void {
  //   // No-op
  // }

  // If NodePropertyValues has memoryEstimation(): MemoryEstimation;
  // public memoryEstimation(): MemoryEstimation {
  //   return MemoryEstimations.empty(); // Assuming an empty estimation
  // }
}
