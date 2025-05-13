import { GraphDimensions } from '../core/GraphDimensions';
import { MemoryTree } from '../mem/MemoryTree';

/**
 * Memory estimation result for a graph, containing dimensions and memory usage.
 */
export class GraphMemoryEstimation {
  /**
   * Creates a new GraphMemoryEstimation.
   * 
   * @param graphDimensions The dimensions of the graph
   * @param memoryTree The memory usage tree
   */
  constructor(
    public readonly graphDimensions: GraphDimensions,
    public readonly memoryTree: MemoryTree
  ) {}
}