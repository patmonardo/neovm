import { Messenger } from './Messenger';
import { MessageIterator } from './Messages';
import { MemoryEstimation } from '../mem/memoryEstimation';

/**
 * Iterator for synchronous message queues
 */
export class PrimitiveSyncDoubleQueuesIterator implements MessageIterator {
  private queue: number[] = [];
  private index: number = 0;
  
  /**
   * Reset the iterator to the beginning
   */
  reset(): void {
    this.index = 0;
  }

  /**
   * Check if there are more messages
   */
  hasNext(): boolean {
    return this.index < this.queue.length;
  }

  /**
   * Get the next message
   */
  next(): number {
    if (!this.hasNext()) {
      throw new Error("No more messages available");
    }
    return this.queue[this.index++];
  }

  /**
   * Check if there are any messages
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Set the queue for this iterator
   */
  setQueue(queue: number[]): void {
    this.queue = queue;
    this.index = 0;
  }
}

/**
 * A primitive implementation of double value queues with synchronized access.
 * Maintains two sets of queues to support the Pregel computation model.
 */
export class PrimitiveSyncDoubleQueues {
  // Current queues for reading (previous iteration's messages)
  private readonly readQueues: number[][];
  // Queues for writing (current iteration's messages)
  private readonly writeQueues: number[][];
  
  /**
   * Create a new set of queues for the specified number of nodes
   */
  constructor(nodeCount: number) {
    this.readQueues = new Array(nodeCount).fill(null).map(() => []);
    this.writeQueues = new Array(nodeCount).fill(null).map(() => []);
  }

  /**
   * Create a new instance
   */
  static of(nodeCount: number): PrimitiveSyncDoubleQueues {
    return new PrimitiveSyncDoubleQueues(nodeCount);
  }

  /**
   * Estimate memory usage
   */
  static memoryEstimation(): MemoryEstimation {
    // Simplified memory estimation
    return {
      name: 'PrimitiveSyncDoubleQueues',
      memoryUsage: {
        base: 24, // Object overhead
        perNode: 16, // Two array references per node
        perMessage: 8  // 8 bytes per message
      }
    };
  }

  /**
   * Swap read and write queues at the end of an iteration
   */
  swapQueues(): void {
    // Clear the read queues (which will become write queues)
    for (let i = 0; i < this.readQueues.length; i++) {
      this.readQueues[i] = [];
    }
    
    // Swap references
    const temp = this.readQueues;
    this.readQueues[0] = this.writeQueues[0];
    this.writeQueues[0] = temp[0];
  }

  /**
   * Push a message to a node's queue
   */
  push(nodeId: number, message: number): void {
    this.writeQueues[nodeId].push(message);
  }

  /**
   * Initialize an iterator for a specific node's messages
   */
  initIterator(iterator: PrimitiveSyncDoubleQueuesIterator, nodeId: number): void {
    iterator.setQueue(this.readQueues[nodeId]);
  }

  /**
   * Release resources
   */
  release(): void {
    // In TypeScript, the garbage collector will handle this
    // but we could explicitly clear the arrays if needed
    for (let i = 0; i < this.readQueues.length; i++) {
      this.readQueues[i] = [];
      this.writeQueues[i] = [];
    }
  }
}

/**
 * A messenger implementation that uses synchronized queues to transfer messages
 * between iterations. Implements the synchronous message passing model of Pregel.
 */
export class SyncQueueMessenger implements Messenger<PrimitiveSyncDoubleQueuesIterator> {
  private readonly queues: PrimitiveSyncDoubleQueues;

  /**
   * Create a new messenger for the given number of nodes
   */
  constructor(nodeCount: number) {
    this.queues = PrimitiveSyncDoubleQueues.of(nodeCount);
  }

  /**
   * Estimate memory usage
   */
  static memoryEstimation(): MemoryEstimation {
    return PrimitiveSyncDoubleQueues.memoryEstimation();
  }

  /**
   * Initialize for a new iteration by swapping message queues
   */
  initIteration(iteration: number): void {
    this.queues.swapQueues();
  }

  /**
   * Send a message from a source node to a target node
   */
  sendTo(sourceNodeId: number, targetNodeId: number, message: number): void {
    this.queues.push(targetNodeId, message);
  }

  /**
   * Get a fresh message iterator
   */
  messageIterator(): PrimitiveSyncDoubleQueuesIterator {
    return new PrimitiveSyncDoubleQueuesIterator();
  }

  /**
   * Initialize a message iterator for a specific node
   */
  initMessageIterator(
    messageIterator: PrimitiveSyncDoubleQueuesIterator, 
    nodeId: number, 
    isFirstIteration: boolean
  ): void {
    // In the first iteration, no messages have been sent yet
    if (isFirstIteration) {
      messageIterator.setQueue([]);
      return;
    }
    
    this.queues.initIterator(messageIterator, nodeId);
  }

  /**
   * Release resources
   */
  release(): void {
    this.queues.release();
  }
}

/**
 * Factory for creating SyncQueueMessenger instances
 */
export class SyncQueueMessengers {
  /**
   * Create a new messenger for the given number of nodes
   */
  static of(nodeCount: number): Messenger<PrimitiveSyncDoubleQueuesIterator> {
    return new SyncQueueMessenger(nodeCount);
  }
}