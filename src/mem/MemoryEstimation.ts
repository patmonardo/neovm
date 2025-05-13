import { GraphDimensions } from '@/core/GraphDimensions';
import { Concurrency } from '@/concurrency/Concurrency';
import { MemoryTree } from './MemoryTree';

/**
 * A description of an object that has resources residing in memory.
 * This interface provides methods to estimate memory usage for graph algorithms and data structures.
 * Corresponds to the MemoryEstimation interface in Java.
 */
export interface MemoryEstimation {
  /**
   * Returns a textual description for this component.
   * @returns Description string
   */
  description(): string;

  /**
   * Computes an actual memory estimation based on the provided graph dimensions and concurrency.
   * @param dimensions The graph dimensions (node count, relationship count, etc.)
   * @param concurrency The concurrency settings
   * @returns A memory tree representing the hierarchical estimation
   */
  estimate(dimensions: GraphDimensions, concurrency: Concurrency): MemoryTree;

  /**
   * Returns nested resources of this component.
   * In Java, this is a default method often returning a list containing just this estimation.
   * Concrete implementations are expected to provide this.
   * @returns Collection of memory estimations, typically including this estimation.
   */
  components(): MemoryEstimation[];
}
