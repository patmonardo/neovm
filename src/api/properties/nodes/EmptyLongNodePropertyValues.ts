import { LongNodePropertyValues } from './LongNodePropertyValues'; // Assuming this interface exists
import { ValueType } from '../../ValueType'; // Adjusted path assuming ValueType is in @/api
// import { MemoryEstimations } from '@/mem/MemoryEstimations'; // If memoryEstimation is needed

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
  private constructor() {
    // Private constructor
  }

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

  // Assuming LongNodePropertyValues might extend a base NodePropertyValues,
  // include other necessary methods with "empty" behavior.

  // public hasValue(_nodeId: number): boolean {
  //   return false; // Or true if -1 is considered a "value"
  // }

  // public release(): void {
  //   // No-op
  // }

  // public memoryEstimation(): MemoryEstimation {
  //   return MemoryEstimations.empty(); // Or MemoryEstimations.ZERO
  // }

  // If LongNodePropertyValues has specific methods like getMaxLongPropertyValue:
  // public getMaxLongPropertyValue(): number | undefined {
  //   return undefined; // Or BigInt(Number.MIN_SAFE_INTEGER) if using bigints
  // }
}
