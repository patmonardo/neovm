import { Graph } from "../../api/graph";
import { PregelConfig } from "../PregelConfig";
import { NodeValue } from "../NodeValue";
import { ProgressTracker } from "../../core/utils/progress/tasks/progressTracker";
import {
  NodeCentricContext,
  BidirectionalNodeCentricContext,
} from "./NodeCentricContext";

/**
 * A context that is used during the initialization phase.
 * It allows setting initial node values.
 */
export class InitContext<
  CONFIG extends PregelConfig
> extends NodeCentricContext<CONFIG> {
  constructor(
    graph: Graph,
    config: CONFIG,
    nodeValue: NodeValue,
    progressTracker: ProgressTracker
  ) {
    super(graph, config, nodeValue, progressTracker);
  }

  /**
   * Sets the node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a double
   */
  setNodeValue(key: string, value: number): void {
    this.nodeValue.set(key, this.nodeId, value);
  }

  /**
   * Sets the long node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a long
   */
  setNodeValueLong(key: string, value: number): void {
    this.nodeValue.setLong(key, this.nodeId, value);
  }

  /**
   * Sets the long array node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a long array
   */
  setNodeValueLongArray(key: string, value: number[]): void {
    this.nodeValue.setLongArray(key, this.nodeId, value);
  }

  /**
   * Sets the double array node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a double array
   */
  setNodeValueDoubleArray(key: string, value: number[]): void {
    this.nodeValue.setDoubleArray(key, this.nodeId, value);
  }
}

/**
 * A initialization context that supports bidirectional operations
 */
export class BidirectionalInitContext<CONFIG extends PregelConfig>
  extends InitContext<CONFIG>
  implements BidirectionalNodeCentricContext
{
  /**
   * Get the underlying graph
   */
  graph(): Graph {
    return this.graph;
  }
}
