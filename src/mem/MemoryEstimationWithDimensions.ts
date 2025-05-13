import { MemoryEstimation } from './MemoryEstimation';
import { GraphDimensions } from '../core/GraphDimensions';

/**
 * A value class that pairs a memory estimation with graph dimensions.
 */
export interface MemoryEstimationWithDimensions {
  /**
   * Returns the memory estimation.
   * 
   * @returns The memory estimation
   */
  memoryEstimation(): MemoryEstimation;

  /**
   * Returns the graph dimensions.
   * 
   * @returns The graph dimensions
   */
  graphDimensions(): GraphDimensions;
}

/**
 * Factory functions for creating MemoryEstimationWithDimensions instances.
 */
export namespace MemoryEstimationWithDimensions {
  /**
   * Creates a new MemoryEstimationWithDimensions.
   * 
   * @param memoryEstimation The memory estimation
   * @param graphDimensions The graph dimensions
   * @returns A new MemoryEstimationWithDimensions instance
   */
  export function create(
    memoryEstimation: MemoryEstimation,
    graphDimensions: GraphDimensions
  ): MemoryEstimationWithDimensions {
    return {
      memoryEstimation: () => memoryEstimation,
      graphDimensions: () => graphDimensions
    };
  }
}