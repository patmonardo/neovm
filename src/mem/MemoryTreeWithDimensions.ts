import { MemoryTree } from './MemoryTree';
import { GraphDimensions } from '../core/GraphDimensions';

/**
 * A simple value class that pairs a memory tree with graph dimensions.
 */
export class MemoryTreeWithDimensions {
  /**
   * Creates a new MemoryTreeWithDimensions.
   * 
   * @param memoryTree The memory tree
   * @param graphDimensions The graph dimensions
   */
  constructor(
    public readonly memoryTree: MemoryTree,
    public readonly graphDimensions: GraphDimensions
  ) {}
}