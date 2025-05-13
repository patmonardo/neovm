import { Graph } from '../../api/graph';
import { PregelConfig } from '../PregelConfig';
import { NodeValue } from '../../NodeValue';
import { ProgressTracker } from '../../core/utils/progress/tasks/progressTracker';
import { MutableInt } from '../../utils/mutableInt';
import { MutableBoolean } from '../../utils/mutableBoolean';

/**
 * A context that is used during master compute steps.
 * Provides access to global state and statistics.
 */
export class MasterComputeContext<CONFIG extends PregelConfig> {
  protected readonly graph: Graph;
  protected readonly config: CONFIG;
  protected readonly nodeValue: NodeValue;
  protected readonly progressTracker: ProgressTracker;
  protected readonly iteration: MutableInt;
  protected readonly didConverge: MutableBoolean;
  
  constructor(
    graph: Graph,
    config: CONFIG,
    nodeValue: NodeValue,
    progressTracker: ProgressTracker,
    iteration: MutableInt,
    didConverge: MutableBoolean
  ) {
    this.graph = graph;
    this.config = config;
    this.nodeValue = nodeValue;
    this.progressTracker = progressTracker;
    this.iteration = iteration;
    this.didConverge = didConverge;
  }

  /**
   * Get the algorithm configuration
   */
  getConfig(): CONFIG {
    return this.config;
  }
  
  /**
   * Get the node value storage
   */
  getNodeValue(): NodeValue {
    return this.nodeValue;
  }
  
  /**
   * Get the number of nodes in the graph
   */
  nodeCount(): number {
    return this.graph.nodeCount();
  }

  /**
   * Returns the current superstep (0-based).
   */
  superstep(): number {
    return this.iteration.get();
  }
  
  /**
   * Signal that the algorithm has converged
   */
  setDidConverge(converged: boolean): void {
    this.didConverge.set(converged);
  }
  
  /**
   * Check if the algorithm has converged
   */
  didAlgorithmConverge(): boolean {
    return this.didConverge.get();
  }
}