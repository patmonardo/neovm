import { Graph } from '../../api/graph';
import { PregelConfig } from '../PregelConfig';
import { NodeValue } from '../NodeValue';
import { ProgressTracker } from '../../core/utils/progress/tasks/progressTracker';
import { NodeCentricContext, BidirectionalNodeCentricContext } from './nodeCentricContext';
import { BasePregelComputation } from '../../BasePregelComputation';
import { Messenger } from '../Messenger';
import { HugeAtomicBitSet } from '../../core/utils/paged/hugeAtomicBitSet';
import { MutableInt } from '../../utils/mutableInt';
import { MutableBoolean } from '../../utils/mutableBoolean';
import { Optional } from '../../utils/optional';

/**
 * Function type for sending messages to neighbors
 */
interface SendMessagesFunction {
  (sourceNodeId: number, message: number): void;
}

/**
 * A context that is used during the computation. It allows an implementation
 * to send messages to other nodes and change the state of the currently
 * processed node.
 */
export class ComputeContext<CONFIG extends PregelConfig> extends NodeCentricContext<CONFIG> {
  protected readonly computation: BasePregelComputation<CONFIG>;
  protected readonly messenger: Messenger<any>;
  protected readonly voteBits: HugeAtomicBitSet;
  protected readonly iteration: MutableInt;
  protected readonly hasSendMessage: MutableBoolean;
  private readonly sendMessagesFunction: SendMessagesFunction;
  
  constructor(
    graph: Graph,
    config: CONFIG,
    computation: BasePregelComputation<CONFIG>,
    nodeValue: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    iteration: MutableInt,
    hasSendMessage: Optional<MutableBoolean>,
    progressTracker: ProgressTracker
  ) {
    super(graph, config, nodeValue, progressTracker);
    this.computation = computation;
    this.sendMessagesFunction = config.hasRelationshipWeightProperty()
      ? this.sendToNeighborsWeighted.bind(this)
      : this.sendToNeighbors.bind(this);
    this.messenger = messenger;
    this.voteBits = voteBits;
    this.iteration = iteration;
    this.hasSendMessage = hasSendMessage.orElse(new MutableBoolean(false));
  }

  /**
   * Returns the node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a double
   */
  doubleNodeValue(key: string): number {
    return this.nodeValue.doubleValue(key, this.nodeId);
  }

  /**
   * Returns the node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a long
   */
  longNodeValue(key: string): number {
    return this.nodeValue.longValue(key, this.nodeId);
  }

  /**
   * Returns the node value for the given node-id and node schema key.
   * @throws Error if the key does not exist or the value is not a long
   */
  longNodeValue(nodeId: number, key: string): number {
    return this.nodeValue.longValue(key, nodeId);
  }

  /**
   * Returns the node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a long array
   */
  longArrayNodeValue(key: string): number[] {
    return this.nodeValue.longArrayValue(key, this.nodeId);
  }

  /**
   * Returns the node value for the given node-id and node schema key.
   * @throws Error if the key does not exist or the value is not a long array
   */
  longArrayNodeValue(nodeId: number, key: string): number[] {
    return this.nodeValue.longArrayValue(key, nodeId);
  }

  /**
   * Returns the node value for the given node schema key.
   * @throws Error if the key does not exist or the value is not a double array
   */
  doubleArrayNodeValue(key: string): number[] {
    return this.nodeValue.doubleArrayValue(key, this.nodeId);
  }

  /**
   * Notify the execution framework that this node intends to stop
   * the computation. If the node voted to halt and has not received
   * new messages in the next superstep, the compute method will not
   * be called for that node. If a node receives messages, the vote
   * to halt flag will be ignored.
   */
  voteToHalt(): void {
    this.voteBits.set(this.nodeId);
  }

  /**
   * Indicates if the current superstep is the first superstep.
   */
  isInitialSuperstep(): boolean {
    return this.iteration.get() === 0;
  }

  /**
   * Returns the current superstep (0-based).
   */
  superstep(): number {
    return this.iteration.get();
  }

  /**
   * Sends the given message to all neighbors of the node.
   */
  sendToNeighbors(message: number): void {
    this.sendMessagesFunction(this.nodeId, message);
  }

  /**
   * Sends the given message to the target node. The target
   * node can be any existing node id in the graph.
   * @throws Error if the node is not in the graph's ID space
   */
  sendTo(targetNodeId: number, message: number): void {
    if (!this.nodeExists(targetNodeId)) {
      throw new Error(`Node ${targetNodeId} does not exist`);
    }
    this.messenger.sendTo(this.nodeId, targetNodeId, message);
    this.hasSendMessage.set(true);
  }

  /**
   * Check if any messages have been sent during this computation step
   */
  hasSentMessage(): boolean {
    return this.hasSendMessage.get();
  }

  /**
   * Implementation for sending messages to all neighbors
   */
  private sendToNeighbors(sourceNodeId: number, message: number): void {
    this.graph.forEachRelationship(sourceNodeId, (_, targetNodeId) => {
      this.sendTo(targetNodeId, message);
      return true;
    });
  }

  /**
   * Implementation for sending weighted messages to all neighbors
   */
  private sendToNeighborsWeighted(sourceNodeId: number, message: number): void {
    this.graph.forEachRelationship(sourceNodeId, 1.0, (_, targetNodeId, weight) => {
      this.sendTo(targetNodeId, this.computation.applyRelationshipWeight(message, weight));
      return true;
    });
  }
}

/**
 * Function type for sending messages to incoming neighbors
 */
interface SendMessagesIncomingFunction {
  (sourceNodeId: number, message: number): void;
}

/**
 * A compute context that supports bidirectional operations (accessing both outgoing and incoming edges)
 */
export class BidirectionalComputeContext<CONFIG extends PregelConfig> 
  extends ComputeContext<CONFIG> 
  implements BidirectionalNodeCentricContext {

  private readonly sendMessagesIncomingFunction: SendMessagesIncomingFunction;

  constructor(
    graph: Graph,
    config: CONFIG,
    computation: BasePregelComputation<CONFIG>,
    nodeValue: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    iteration: MutableInt,
    hasSendMessage: Optional<MutableBoolean>,
    progressTracker: ProgressTracker
  ) {
    super(
      graph,
      config,
      computation,
      nodeValue,
      messenger,
      voteBits,
      iteration,
      hasSendMessage,
      progressTracker
    );

    this.sendMessagesIncomingFunction = config.hasRelationshipWeightProperty()
      ? this.sendToIncomingNeighborsWeighted.bind(this)
      : this.sendToIncomingNeighbors.bind(this);
  }

  /**
   * Sends the given message to all incoming neighbors of the node.
   */
  sendToIncomingNeighbors(message: number): void {
    this.sendMessagesIncomingFunction(this.nodeId, message);
  }

  /**
   * Get the underlying graph
   */
  graph(): Graph {
    return this.graph;
  }

  /**
   * Implementation for sending messages to all incoming neighbors
   */
  private sendToIncomingNeighbors(sourceNodeId: number, message: number): void {
    this.graph.forEachInverseRelationship(sourceNodeId, (_, targetNodeId) => {
      this.sendTo(targetNodeId, message);
      return true;
    });
  }

  /**
   * Implementation for sending weighted messages to all incoming neighbors
   */
  private sendToIncomingNeighborsWeighted(sourceNodeId: number, message: number): void {
    this.graph.forEachInverseRelationship(sourceNodeId, 1.0, (_, targetNodeId, weight) => {
      this.sendTo(targetNodeId, this.computation.applyRelationshipWeight(message, weight));
      return true;
    });
  }
}