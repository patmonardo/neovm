import { MessageIterator } from './Messages';
import { MemoryEstimation, MemoryEstimations } from '../mem/memoryEstimation';
import { Concurrency } from '../core/concurrency/concurrency';

/**
 * Implements efficient double-value queues for asynchronous message passing in Pregel.
 * Optimized for the case where messages are both sent and consumed within the same iteration.
 */
export class PrimitiveAsyncDoubleQueues {
  // Constants
  static readonly COMPACT_THRESHOLD = 0.25;
  private static readonly EMPTY_MESSAGE = Number.NaN;
  private static readonly MIN_CAPACITY = 16;
  
  // Queue data structures
  private readonly heads: Int32Array;
  private readonly tails: Int32Array;
  private readonly queues: Array<Float64Array>;
  private readonly referenceCounts: Int32Array;
  
  /**
   * Create new queues for the given number of nodes
   */
  constructor(
    nodeCount: number, 
    heads: Int32Array,
    tails: Int32Array,
    queues: Array<Float64Array>,
    referenceCounts: Int32Array
  ) {
    this.heads = heads;
    this.tails = tails;
    this.queues = queues;
    this.referenceCounts = referenceCounts;
  }
  
  /**
   * Create a new instance with default settings
   */
  static of(nodeCount: number): PrimitiveAsyncDoubleQueues {
    return this.ofWithCapacity(nodeCount, this.MIN_CAPACITY);
  }
  
  /**
   * Create a new instance with specified initial queue capacity
   */
  static ofWithCapacity(
    nodeCount: number, 
    initialQueueCapacity: number
  ): PrimitiveAsyncDoubleQueues {
    const heads = new Int32Array(nodeCount);
    const tails = new Int32Array(nodeCount);
    const referenceCounts = new Int32Array(nodeCount);
    
    const capacity = Math.max(initialQueueCapacity, this.MIN_CAPACITY);
    const queues: Array<Float64Array> = new Array(nodeCount);
    
    for (let i = 0; i < nodeCount; i++) {
      const queue = new Float64Array(capacity);
      queue.fill(this.EMPTY_MESSAGE);
      queues[i] = queue;
    }
    
    return new PrimitiveAsyncDoubleQueues(nodeCount, heads, tails, queues, referenceCounts);
  }
  
  /**
   * Get memory estimation
   */
  static memoryEstimation(): MemoryEstimation {
    return {
      name: 'PrimitiveAsyncDoubleQueues',
      memoryUsage: {
        base: 24, // Object overhead
        perNode: 8 + // heads - 4 bytes per int
                8 + // tails - 4 bytes per int
                16 + // queues - 8 bytes per reference + overhead
                8,  // referenceCounts - 4 bytes per int
        perMessage: 8  // 8 bytes per double
      }
    };
  }
  
  /**
   * Push a message to a node's queue
   */
  push(nodeId: number, message: number): void {
    if (Number.isNaN(message)) {
      throw new Error("Cannot send NaN as a message");
    }
    
    const queue = this.queues[nodeId];
    const tail = this.tails[nodeId];
    
    // Check if we need to grow the queue
    if (tail >= queue.length) {
      this.grow(nodeId, tail + 1);
    }
    
    // Add message to the queue
    queue[tail] = message;
    this.tails[nodeId] = tail + 1;
  }
  
  /**
   * Grow a queue to accommodate more messages
   */
  private grow(nodeId: number, minCapacity: number): void {
    const queue = this.queues[nodeId];
    const capacity = queue.length;
    // Grow by 50%
    const newCapacity = capacity + (capacity >> 1);
    const newQueue = new Float64Array(newCapacity);
    
    // Copy existing data
    newQueue.set(queue);
    
    // Fill the rest with NaN to indicate empty slots
    newQueue.fill(this.constructor['EMPTY_MESSAGE'], capacity);
    
    // Update the queue reference
    this.queues[nodeId] = newQueue;
  }
  
  /**
   * Check if a node's queue is empty
   */
  isEmpty(nodeId: number): boolean {
    const head = this.heads[nodeId];
    const tail = this.tails[nodeId];
    const queue = this.queues[nodeId];
    
    return this.isQueueEmpty(queue, head, tail);
  }
  
  /**
   * Check if a queue is empty
   */
  private isQueueEmpty(queue: Float64Array, head: number, tail: number): boolean {
    return head === queue.length || head > tail || Number.isNaN(queue[head]);
  }
  
  /**
   * Pop a message from a node's queue
   */
  pop(nodeId: number): number {
    const head = this.heads[nodeId];
    this.heads[nodeId] = head + 1;
    return this.queues[nodeId][head];
  }
  
  /**
   * Compact queues to reclaim space
   */
  compact(): void {
    const nodeCount = this.queues.length;
    
    for (let i = 0; i < nodeCount; i++) {
      const queue = this.queues[i];
      const tail = this.tails[i];
      const head = this.heads[i];
      
      if (this.isQueueEmpty(queue, head, tail) && head > 0) {
        // The queue is empty, we can reset head and tail to index 0
        // but we need to fill the previous entries with NaN.
        queue.fill(PrimitiveAsyncDoubleQueues.EMPTY_MESSAGE, 0, tail);
        this.heads[i] = 0;
        this.tails[i] = 0;
      } else if (head > queue.length * PrimitiveAsyncDoubleQueues.COMPACT_THRESHOLD) {
        // The queue is not empty, we need to move the entries for
        // the next iteration to the beginning of the queue and fill
        // the remaining entries with NaN.
        const length = tail - head;
        
        // Copy messages to the beginning of the queue
        for (let j = 0; j < length; j++) {
          queue[j] = queue[head + j];
        }
        
        // Fill the rest with NaN
        queue.fill(PrimitiveAsyncDoubleQueues.EMPTY_MESSAGE, length);
        
        this.heads[i] = 0;
        this.tails[i] = length;
      }
    }
  }
  
  /**
   * Get all messages for a node
   */
  getMessages(nodeId: number): number[] {
    const queue = this.queues[nodeId];
    const head = this.heads[nodeId];
    const tail = this.tails[nodeId];
    
    if (this.isQueueEmpty(queue, head, tail)) {
      return [];
    }
    
    const result: number[] = [];
    for (let i = head; i < tail; i++) {
      if (!Number.isNaN(queue[i])) {
        result.push(queue[i]);
      }
    }
    
    return result;
  }
  
  /**
   * Release resources
   */
  release(): void {
    // In TypeScript/JavaScript, we don't need to explicitly release memory
    // but we can help the garbage collector by removing references
    for (let i = 0; i < this.queues.length; i++) {
      this.queues[i] = new Float64Array(0);
    }
  }
  
  /**
   * Iterator implementation for messages
   */
  static Iterator = class implements MessageIterator {
    private readonly queues: PrimitiveAsyncDoubleQueues;
    private nodeId: number = 0;
    
    constructor(queues: PrimitiveAsyncDoubleQueues) {
      this.queues = queues;
    }
    
    /**
     * Initialize the iterator for a specific node
     */
    init(nodeId: number): void {
      this.nodeId = nodeId;
    }
    
    /**
     * Reset the iterator
     */
    reset(): void {
      // No-op for this implementation, as we directly pop messages
    }
    
    /**
     * Check if there are more messages
     */
    hasNext(): boolean {
      return !this.queues.isEmpty(this.nodeId);
    }
    
    /**
     * Get the next message
     */
    next(): number {
      if (!this.hasNext()) {
        throw new Error("No more messages available");
      }
      return this.queues.pop(this.nodeId);
    }
    
    /**
     * Check if there are any messages
     */
    isEmpty(): boolean {
      return this.queues.isEmpty(this.nodeId);
    }
  };
}

/**
 * Factory for creating PrimitiveAsyncDoubleQueues instances
 */
export class PrimitiveAsyncDoubleQueuesFactory {
  /**
   * Create a new queues instance for the given number of nodes
   */
  static of(nodeCount: number): PrimitiveAsyncDoubleQueues {
    return PrimitiveAsyncDoubleQueues.of(nodeCount);
  }
  
  /**
   * Create a new queues instance with a specific capacity
   */
  static ofWithCapacity(nodeCount: number, capacity: number): PrimitiveAsyncDoubleQueues {
    return PrimitiveAsyncDoubleQueues.ofWithCapacity(nodeCount, capacity);
  }
}