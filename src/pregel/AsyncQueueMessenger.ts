import { MemoryEstimation } from "@/mem";
import { Messenger } from "./Messenger";
import { MessageIterator } from "./Messages";

/**
 * Iterator for asynchronous message queues
 */
export class PrimitiveAsyncDoubleQueuesIterator implements MessageIterator {
  private readonly queues: PrimitiveAsyncDoubleQueues;
  public currentNodeId: number = -1;
  private currentMessages: number[] = [];
  private index: number = 0;

  /**
   * Create a new iterator for the given queues
   */
  constructor(queues: PrimitiveAsyncDoubleQueues) {
    this.queues = queues;
  }

  /**
   * Initialize the iterator for a specific node
   */
  init(nodeId: number): void {
    this.currentNodeId = nodeId;
    this.currentMessages = this.queues.getMessages(nodeId);
    this.index = 0;
  }

  /**
   * Reset the iterator position
   */
  reset(): void {
    this.index = 0;
  }

  /**
   * Check if there are more messages
   */
  hasNext(): boolean {
    return this.index < this.currentMessages.length;
  }

  /**
   * Get the next message
   */
  next(): number {
    if (!this.hasNext()) {
      throw new Error("No more messages available");
    }
    return this.currentMessages[this.index++];
  }

  /**
   * Check if there are any messages
   */
  isEmpty(): boolean {
    return this.currentMessages.length === 0;
  }
}

/**
 * A primitive implementation of double value queues for asynchronous message passing.
 * Unlike the synchronous version, this only maintains one set of queues and supports
 * adding messages to the same queue that's being read.
 */
export class PrimitiveAsyncDoubleQueues {
  // Message queues for all nodes
  private readonly queues: number[][];

  /**
   * Create a new set of queues for the specified number of nodes
   */
  constructor(nodeCount: number) {
    this.queues = new Array(nodeCount).fill(null).map(() => []);
  }

  /**
   * Create a new instance
   */
  static of(nodeCount: number): PrimitiveAsyncDoubleQueues {
    return new PrimitiveAsyncDoubleQueues(nodeCount);
  }

  /**
   * Estimate memory usage
   */
  static memoryEstimation(): MemoryEstimation {
    return {
      name: "PrimitiveAsyncDoubleQueues",
      memoryUsage: {
        base: 16, // Object overhead
        perNode: 8, // One array reference per node
        perMessage: 8, // 8 bytes per message
      },
    };
  }

  /**
   * Compact the queues by removing empty slots
   */
  compact(): void {
    // In TypeScript, arrays are already dynamic, so we don't need to compact them
    // This method is here for API compatibility with the Java version
  }

  /**
   * Push a message to a node's queue
   */
  push(nodeId: number, message: number): void {
    if (Number.isNaN(message)) {
      throw new Error("Cannot send NaN as a message");
    }
    this.queues[nodeId].push(message);
  }

  /**
   * Get all messages for a node
   */
  getMessages(nodeId: number): number[] {
    return this.queues[nodeId];
  }

  /**
   * Release resources
   */
  release(): void {
    // Clear all queues
    for (let i = 0; i < this.queues.length; i++) {
      this.queues[i] = [];
    }
  }
}

/**
 * A messenger implementation that uses asynchronous queues to transfer messages.
 * Implements the asynchronous message passing model of Pregel where messages sent
 * in the current iteration are immediately available to other nodes.
 */
export class AsyncQueueMessenger
  implements Messenger<PrimitiveAsyncDoubleQueuesIterator>
{
  private readonly queues: PrimitiveAsyncDoubleQueues;

  /**
   * Create a new messenger for the given number of nodes
   */
  constructor(nodeCount: number) {
    this.queues = PrimitiveAsyncDoubleQueues.of(nodeCount);
  }

  /**
   * Estimate memory usage
   */
  static memoryEstimation(): MemoryEstimation {
    return PrimitiveAsyncDoubleQueues.memoryEstimation();
  }

  /**
   * Initialize for a new iteration
   */
  initIteration(iteration: number): void {
    if (iteration > 0) {
      this.queues.compact();
    }
  }

  /**
   * Send a message from a source node to a target node
   */
  sendTo(sourceNodeId: number, targetNodeId: number, message: number): void {
    if (Number.isNaN(message)) {
      throw new Error("Cannot send NaN as a message");
    }
    this.queues.push(targetNodeId, message);
  }

  /**
   * Get a fresh message iterator
   */
  messageIterator(): PrimitiveAsyncDoubleQueuesIterator {
    return new PrimitiveAsyncDoubleQueuesIterator(this.queues);
  }

  /**
   * Initialize a message iterator for a specific node
   */
  initMessageIterator(
    messageIterator: PrimitiveAsyncDoubleQueuesIterator,
    nodeId: number,
    isFirstIteration: boolean
  ): void {
    // In async mode, initialize iterator regardless of iteration
    messageIterator.init(nodeId);
  }

  /**
   * Release resources
   */
  release(): void {
    this.queues.release();
  }
}

/**
 * Factory for creating AsyncQueueMessenger instances
 */
export class AsyncQueueMessengers {
  /**
   * Create a new messenger for the given number of nodes
   */
  static of(nodeCount: number): Messenger<PrimitiveAsyncDoubleQueuesIterator> {
    return new AsyncQueueMessenger(nodeCount);
  }
}
