import { Graph } from '../../api/graph';
import { PregelConfig } from '../PregelConfig';
import { NodeValue } from '../NodeValue';
import { ProgressTracker } from '../../core/utils/progressTracker';

/**
 * Base context class that provides node-centric access to the graph and configuration.
 * Used as a foundation for specialized context classes in the Pregel computation model.
 */
export class NodeCentricContext<CONFIG extends PregelConfig> {
  protected readonly graph: Graph;
  protected readonly config: CONFIG;
  protected readonly nodeValue: NodeValue;
  protected readonly progressTracker: ProgressTracker;
  protected nodeId: number = 0;
  
  /**
   * Create a new node-centric context
   */
  constructor(
    graph: Graph,
    config: CONFIG,
    nodeValue: NodeValue,
    progressTracker: ProgressTracker
  ) {
    this.graph = graph;
    this.config = config;
    this.nodeValue = nodeValue;
    this.progressTracker = progressTracker;
  }
  
  /**
   * Set the node ID for this context
   */
  setNodeId(nodeId: number): void {
    this.nodeId = nodeId;
  }
  
  /**
   * Get the node ID currently being processed
   */
  getNodeId(): number {
    return this.nodeId;
  }
  
  /**
   * Get the algorithm configuration
   */
  getConfig(): CONFIG {
    return this.config;
  }
  
  /**
   * Get the number of nodes in the graph
   */
  nodeCount(): number {
    return this.graph.nodeCount();
  }
  
  /**
   * Check if node exists in the graph
   */
  nodeExists(nodeId: number): boolean {
    return nodeId >= 0 && nodeId < this.graph.nodeCount();
  }
}

/**
 * Interface for bidirectional context operations
 */
export interface BidirectionalNodeCentricContext {
  /**
   * Get the underlying graph
   */
  graph(): Graph;
}