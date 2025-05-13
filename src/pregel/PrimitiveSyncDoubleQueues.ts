import { MessageIterator } from './Messages';
import { MemoryEstimation, MemoryEstimations } from '../mem/memoryEstimation';
import { Concurrency } from '../concurrency/Concurrency';
import { HugeObjectArray } from '../collections/ha/HugeObjectArray';
import { AtomicArray } from '../collections/AtomicArray';
import { PrimitiveDoubleQueues } from './PrimitiveDoubleQueues';

/**
 * Implements efficient double-value queues for synchronous message passing in Pregel.
 * Maintains two sets of queues that are swapped between iterations.
 */
export class PrimitiveSyncDoubleQueues extends PrimitiveDoubleQueues {
  // Represents the queues of the previous iteration
  private prevQueues: HugeObjectArray<Float64Array>;
  private prevTails: AtomicArray;
  
  /**
   * Create new queues with two sets (current and previous)
   */
  constructor(
    currentQueues: HugeObjectArray<Float64Array>,
    currentTails: AtomicArray,
    prevQueues: HugeObjectArray<Float64Array>,
    prevTails: AtomicArray,
    referenceCounts: AtomicArray
  ) {
    super(currentQueues, currentTails, referenceCounts);
    this.prevQueues = prevQueues;
    this.prevTails = prevTails;
  }
  
  /**
   * Create a new instance with default capacity
   */
  static of(nodeCount: number): PrimitiveSyncDoubleQueues {
    return PrimitiveSyncDoubleQueues.of(nodeCount, PrimitiveDoubleQueues.MIN_CAPACITY);
  }
  
  /**
   * Create a new instance with specified initial queue capacity
   */
  static of(nodeCount: number, initialQueueCapacity: number): PrimitiveSyncDoubleQueues {
    const currentTails = new AtomicArrayImpl(nodeCount);
    const prevTails = new AtomicArrayImpl(nodeCount);
    
    const currentQueues = HugeObjectArray.newArray<Float64Array>(nodeCount);
    const prevQueues = HugeObjectArray.newArray<Float64Array>(nodeCount);
    
    const referenceCounts = new AtomicArrayImpl(nodeCount);
    
    const capacity = Math.max(initialQueueCapacity, PrimitiveDoubleQueues.MIN_CAPACITY);
    
    for (let i = 0; i < nodeCount; i++) {
      currentQueues.set(i, new Float64Array(capacity));
      prevQueues.set(i, new Float64Array(capacity));
    }
    
    return new PrimitiveSyncDoubleQueues(
      currentQueues,
      currentTails,
      prevQueues,
      prevTails,
      referenceCounts
    );
  }
  
  /**
   * Get memory estimation
   */
  static memoryEstimation(): MemoryEstimation {
    return {
      name: 'PrimitiveSyncDoubleQueues',
      memoryUsage: {
        base: 24, // Object overhead
        perNode: 8 +  // current queues - 8 bytes per reference
                8 +  // previous queues - 8 bytes per reference
                8 +  // current tails - 8 bytes per node
                8 +  // previous tails - 8 bytes per node
                8,   // referenceCounts - 8 bytes per node
        perMessage: 8  // 8 bytes per double
      }
    };
  }
  
  /**
   * Swap the current and previous queues
   */
  swapQueues(): void {
    // Swap tail indexes
    const tmpTails = this.tails;
    this.tails = this.prevTails;
    this.prevTails = tmpTails;
    
    // Reset current tails to 0
    for (let i = 0; i < this.tails.size(); i++) {
      this.tails.set(i, 0);
    }
    
    // Swap queues
    const tmpQueues = this.queues;
    this.queues = this.prevQueues;
    this.prevQueues = tmpQueues;
  }
  
  /**
   * Initialize an iterator for a specific node's messages
   */
  initIterator(iterator: PrimitiveSyncDoubleQueues.Iterator, nodeId: number): void {
    iterator.init(this.prevQueues.get(nodeId), this.prevTails.get(nodeId));
  }
  
  /**
   * Grow a queue to accommodate more messages
   */
  protected grow(nodeId: number, minCapacity: number): void {
    const queue = this.queues.get(nodeId);
    const capacity = queue.length;
    // Grow by 50%
    const newCapacity = capacity + (capacity >> 1);
    
    // Create new array with increased capacity
    const newQueue = new Float64Array(newCapacity);
    // Copy existing data
    newQueue.set(queue);
    
    // Update the queue reference
    this.queues.set(nodeId, newQueue);
  }
  
  /**
   * Release resources
   */
  release(): void {
    super.release();
    this.prevTails.release();
    this.prevQueues.release();
  }
}

/**
 * Namespace containing the Iterator implementation
 */
export namespace PrimitiveSyncDoubleQueues {
  /**
   * Iterator for synchronous message queues
   */
  export class Iterator implements MessageIterator {
    private queue: Float64Array = new Float64Array(0);
    private length: number = 0;
    private pos: number = 0;
    
    /**
     * Initialize the iterator with a queue and its length
     */
    init(queue: Float64Array, length: number): void {
      this.queue = queue;
      this.pos = 0;
      this.length = length;
    }
    
    /**
     * Reset the iterator position
     */
    reset(): void {
      this.pos = 0;
    }
    
    /**
     * Check if there are more messages
     */
    hasNext(): boolean {
      return this.pos < this.length;
    }
    
    /**
     * Get the next message
     */
    next(): number {
      if (!this.hasNext()) {
        throw new Error("No more messages available");
      }
      return this.queue[this.pos++];
    }
    
    /**
     * Check if there are any messages
     */
    isEmpty(): boolean {
      return this.length === 0;
    }
  }
}

/**
 * Extended AtomicArray interface with size method
 */
interface AtomicArray {
  get(index: number): number;
  set(index: number, value: number): void;
  getAndAdd(index: number, delta: number): number;
  compareAndSet(index: number, expected: number, update: number): boolean;
  compareAndExchange(index: number, expected: number, update: number): number;
  release(): void;
  size(): number;
}

/**
 * Implementation of AtomicArray
 */
class AtomicArrayImpl implements AtomicArray {
  private readonly array: Int32Array;
  
  constructor(size: number) {
    this.array = new Int32Array(size);
  }
  
  get(index: number): number {
    return this.array[index];
  }
  
  set(index: number, value: number): void {
    this.array[index] = value;
  }
  
  getAndAdd(index: number, delta: number): number {
    const oldValue = this.array[index];
    this.array[index] += delta;
    return oldValue;
  }
  
  compareAndSet(index: number, expected: number, update: number): boolean {
    if (this.array[index] === expected) {
      this.array[index] = update;
      return true;
    }
    return false;
  }
  
  compareAndExchange(index: number, expected: number, update: number): number {
    const oldValue = this.array[index];
    if (oldValue === expected) {
      this.array[index] = update;
    }
    return oldValue;
  }
  
  size(): number {
    return this.array.length;
  }
  
  release(): void {
    // No explicit release needed in TypeScript
  }
}