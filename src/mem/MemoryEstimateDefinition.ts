import { MemoryEstimation } from './MemoryEstimation';

/**
 * Interface for components that can provide memory estimations.
 * Implementations will define how to calculate memory requirements for their data structures.
 */
export interface MemoryEstimateDefinition {
  /**
   * Provides a memory estimation for this component.
   * 
   * @returns A memory estimation object describing memory requirements
   */
  memoryEstimation(): MemoryEstimation;
}