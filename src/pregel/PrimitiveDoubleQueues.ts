import { AtomicArray } from '../collections/AtomicArray';
import { HugeObjectArray } from '../collections/HugeObjectArray';

/**
 * Abstract base class for queue implementations in the Pregel framework.
 * Provides thread-safe operations for managing message queues.
 */
export abstract class PrimitiveDoubleQueues {
  // Minimum capacity for individual queue arrays
  protected static readonly MIN_CAPACITY = 42; // 🦀
  
  // Queue data structures
  protected readonly queues: HugeObjectArray<Float64Array>;
  // Stores the tail indexes for each queue
  protected readonly tails: AtomicArray; 
  // Reference counting for concurrent access control
  private readonly referenceCounts: AtomicArray;

  /**
   * Create new queues
   */
  constructor(
    queues: HugeObjectArray<Float64Array>,
    tails: AtomicArray,
    referenceCounts: AtomicArray
  ) {
    this.queues = queues;
    this.tails = tails;
    this.referenceCounts = referenceCounts;
  }

  /**
   * Grow a queue to accommodate more messages
   * @param nodeId The node whose queue needs growing
   * @param newCapacity The required capacity
   */
  protected abstract grow(nodeId: number, newCapacity: number): void;

  /**
   * Push a message to a node's queue
   * @param nodeId The target node
   * @param message The message to send
   */
  push(nodeId: number, message: number): void {
    // The index which we will eventually use to
    // insert the message into the node's queue
    let idx: number;

    outer: while (true) {
      idx = this.tails.get(nodeId);
      if (idx < 0) {
        // A negative index indicates that another thread
        // currently grows the queue for the given node id.
        // When the thread is done growing, the index will
        // turn positive again, so we go ahead and try to
        // set the next index.
        const nextId = -idx + 1;

        while (true) {
          const currentIdx = this.tails.compareAndExchange(nodeId, -idx, nextId);
          if (currentIdx === -idx) {
            // The queue is grown and the current thread
            // was successful setting the next index.
            // We are done and can use the index to insert
            // our message into the queue.
            idx = -idx;
            break outer;
          }
          if (currentIdx !== idx) {
            // The queue is grown but another thread beat
            // us in setting the next possible index.
            // We need to retry from the most outer loop.
            continue outer;
          }
          // The grow thread is still ongoing, we continue
          // trying to set the next index.
        }
      }
      
      // We basically perform a getAndIncrement and try
      // to update the tail with the next index.
      const nextIdx = idx + 1;

      if (this.hasSpaceLeft(nodeId, nextIdx)) {
        // There is still room in the local queue.
        // We try to set our next index.
        const currentIdx = this.tails.compareAndExchange(nodeId, idx, nextIdx);
        if (currentIdx === idx) {
          // CAS successful, we can go ahead and use our
          // index to insert the message into the local queue.
          break;
        }
      } else {
        // We need to grow the local queue. To indicate this and
        // block other threads, we set the negated next index.
        // Threads seeing this negative index will spin in the upper loop.
        const currentIdx = this.tails.compareAndExchange(nodeId, idx, -nextIdx);
        if (currentIdx === idx) {
          // Only a single thread gets into this block.
          // We grow the queue and make sure there is
          // enough space for the next index.

          // Get exclusive access to the queue since we will grow and replace it.
          // We have to make sure that no other thread is currently inserting.
          this.getExclusiveReference(nodeId);
          this.grow(nodeId, nextIdx);
          this.dropExclusiveReference(nodeId);

          // Turn the index back to positive to notify waiting threads
          // that we're done growing the local queue.
          this.tails.compareAndExchange(nodeId, -nextIdx, nextIdx);
          // Done. We can use the index to insert our message.
          break;
        }
      }
    }

    // In JavaScript/TypeScript, we don't have memory fences like in Java,
    // but we ensure operations happen in order within a single thread.
    // For multi-threading scenarios using Web Workers, we'd need additional
    // synchronization mechanisms.

    // Multiple threads can concurrently update the queue, we need
    // to signal this with a shared reference to the array.
    this.getSharedReference(nodeId);
    this.queues.get(nodeId)[idx] = message;
    this.dropSharedReference(nodeId);
  }

  /**
   * Get a shared reference to the queue for reading/writing
   */
  private getSharedReference(nodeId: number): void {
    while (true) {
      // If another thread is currently growing the queue, the
      // reference count will be negative. We need to wait until
      // this thread is finished and drops the exclusive reference.
      const refCount = this.referenceCounts.get(nodeId);
      if (refCount < 0) continue;

      // We increment the reference count by 1 to indicate that we
      // want to add a shared reference to the queue in order to
      // insert our message.
      if (this.referenceCounts.compareAndSet(nodeId, refCount, refCount + 1)) {
        break;
      }
    }
  }

  /**
   * Drop a shared reference to the queue
   */
  private dropSharedReference(nodeId: number): void {
    // We decrement the reference count by 1 to indicate
    // that we finished updating the queue.
    this.referenceCounts.getAndAdd(nodeId, -1);
  }

  /**
   * Get exclusive access to the queue (for growing)
   */
  private getExclusiveReference(nodeId: number): void {
    while (true) {
      // If other threads concurrently insert into the queue,
      // the reference count will be positive. We need to wait
      // until those threads finished before we can continue.
      const refCount = this.referenceCounts.get(nodeId);
      if (refCount > 0) {
        continue;
      }
      // Setting the reference to a negative value signals that
      // the queue is currently growing and must not be accessed.
      if (this.referenceCounts.compareAndSet(nodeId, refCount, -1)) {
        break;
      }
    }
  }

  /**
   * Drop exclusive access to the queue
   */
  private dropExclusiveReference(nodeId: number): void {
    // We reset the reference count to 0 to signal other threads
    // that the queue is grown and can be used for inserting new messages.
    this.referenceCounts.set(nodeId, 0);
  }

  /**
   * Check if a queue has enough space
   */
  private hasSpaceLeft(nodeId: number, minCapacity: number): boolean {
    return this.queues.get(nodeId).length >= minCapacity;
  }

  /**
   * Release resources used by the queues
   */
  release(): void {
    this.queues.release();
    this.tails.release();
    this.referenceCounts.release();
  }

  /**
   * Get the current tail index for a node (for testing)
   */
  tail(nodeId: number): number {
    return this.tails.get(nodeId);
  }

  /**
   * Get the queue for a node (for testing)
   */
  queue(nodeId: number): Float64Array {
    return this.queues.get(nodeId);
  }
}

/**
 * An atomic array implementation for TypeScript.
 * Used to provide atomic operations equivalent to Java's AtomicLongArray.
 * 
 * Note: In a browser environment, this only provides atomicity within a single thread.
 * For true multi-threaded atomicity, you'd need to use SharedArrayBuffer with
 * Atomics API when running in worker threads.
 */
export class AtomicArrayImpl implements AtomicArray {
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
  
  release(): void {
    // No explicit release needed in TypeScript
  }
}