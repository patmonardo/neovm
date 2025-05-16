import { DoubleNodePropertyValues } from '../abstract/DoubleNodePropertyValues'; // Assuming this interface exists
import { ValueType } from '@/api/ValueType'; // Adjusted path
// import { MemoryEstimations } from '@/mem/MemoryEstimations'; // If memoryEstimation is needed

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

  // Assuming DoubleNodePropertyValues might extend a base NodePropertyValues,
  // include other necessary methods with "empty" behavior.

  // public hasValue(_nodeId: number): boolean {
  //   return false; // Or true if NaN is considered a "value" but usually it indicates absence
  // }

  // public release(): void {
  //   // No-op
  // }

  // public memoryEstimation(): MemoryEstimation {
  //   return MemoryEstimations.empty(); // Or MemoryEstimations.ZERO
  // }

  // If DoubleNodePropertyValues has specific methods like getMaxDoublePropertyValue:
  // public getMaxDoublePropertyValue(): number | undefined {
  //   return undefined; // Or NaN
  // }

  // If DoubleNodePropertyValues has dimension(): number | undefined;
  // public dimension(): number | undefined {
  //    return 1; // For scalar doubles, even if empty, the conceptual dimension is 1
  // }
}
