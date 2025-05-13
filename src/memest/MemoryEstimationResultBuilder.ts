import { GraphDimensions } from '../core/GraphDimensions';
import { MemoryTree } from '../mem/MemoryTree';
import { MemoryRange } from '../mem/MemoryRange';
import { Estimate } from '../mem/Estimate';

/**
 * Result of a memory estimation containing a hierarchical breakdown
 * of memory requirements.
 */
export class MemoryEstimationResult {
  /**
   * Creates a new MemoryEstimationResult.
   *
   * @param graphDimensions The dimensions of the graph
   * @param memoryTree The memory usage tree
   */
  constructor(
    public readonly graphDimensions: GraphDimensions,
    public readonly memoryTree: MemoryTree
  ) {}

  /**
   * Returns the minimum memory required for this estimation.
   *
   * @returns Minimum memory in bytes
   */
  public memoryUsage(): number {
    return this.memoryTree.memoryUsage().min;
  }

  /**
   * Returns the memory range (min to max) for this estimation.
   *
   * @returns Memory range in bytes
   */
  public memoryRange(): MemoryRange {
    return this.memoryTree.memoryUsage();
  }

  /**
   * Returns the memory tree for this estimation.
   *
   * @returns Memory tree
   */
  public tree(): MemoryTree {
    return this.memoryTree;
  }

  /**
   * Formats the memory usage in human-readable form.
   *
   * @returns Human-readable memory usage
   */
  public formatMemoryUsage(): string {
    return Estimate.humanReadable(Number(this.memoryUsage()));
  }

  /**
   * Converts this result to a map structure for serialization.
   *
   * @returns Map representation of the result
   */
  public toMap(): Record<string, any> {
    return {
      requiredMemory: this.formatMemoryUsage(),
      nodeCount: this.graphDimensions.nodeCount(),
      relationshipCount: this.graphDimensions.relationshipCount(),
      treeView: MemoryTree.renderMap(this.memoryTree)
    };
  }
}

/**
 * Builder for creating memory estimation results.
 */
export class MemoryEstimationResultBuilder {
  private graphDimensions: GraphDimensions | null = null;
  private memoryTree: MemoryTree | null = null;

  /**
   * Sets the graph dimensions for the result.
   *
   * @param graphDimensions The graph dimensions
   * @returns This builder for method chaining
   */
  public withGraphDimensions(graphDimensions: GraphDimensions): MemoryEstimationResultBuilder {
    this.graphDimensions = graphDimensions;
    return this;
  }

  /**
   * Sets the memory tree for the result.
   *
   * @param memoryTree The memory tree
   * @returns This builder for method chaining
   */
  public withMemoryTree(memoryTree: MemoryTree): MemoryEstimationResultBuilder {
    this.memoryTree = memoryTree;
    return this;
  }

  /**
   * Builds the memory estimation result.
   *
   * @returns The built result
   * @throws Error if any required fields are missing
   */
  public build(): MemoryEstimationResult {
    if (!this.graphDimensions) {
      throw new Error("Graph dimensions must be set");
    }
    if (!this.memoryTree) {
      throw new Error("Memory tree must be set");
    }

    return new MemoryEstimationResult(
      this.graphDimensions,
      this.memoryTree
    );
  }
}
