import { GraphDimensions } from '@/core/GraphDimensions';
import { Concurrency } from '@/concurrency/Concurrency';
import { MemoryRange } from './MemoryRange';

/**
 * A calculation of an object that has resources residing in memory.
 * This is a function interface that estimates memory usage based on
 * graph dimensions and concurrency settings.
 */
export interface MemoryResident {
  /**
   * Estimates the number of bytes that this object occupies in memory.
   *
   * @param dimensions The dimensions of the graph
   * @param concurrency The concurrency settings
   * @returns The memory range representing minimum and maximum memory usage
   */
  estimateMemoryUsage(
    dimensions: GraphDimensions,
    concurrency: Concurrency
  ): MemoryRange;
}
