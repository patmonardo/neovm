import { TerminationFlag } from '../../../termination/TerminationFlag';

/**
 * An iterator implementation that pulls elements from a blocking queue.
 * Uses a tombstone value to signal the end of the iteration.
 */
export class QueueBasedIterator<T> implements AsyncIterableIterator<T> {
  private readonly queue: BlockingQueue<T>;
  private readonly tombstone: T;
  private entry: T | null;
  private readonly terminationGuard: TerminationFlag;
  private readonly timeoutInSeconds: number;

  /**
   * Creates a new queue-based iterator.
   * 
   * @param queue The blocking queue to pull elements from
   * @param tombstone Value that signals the end of the iteration
   * @param terminationGuard Flag to check for termination
   * @param timeoutInSeconds Timeout in seconds for queue polls
   */
  constructor(
    queue: BlockingQueue<T>, 
    tombstone: T, 
    terminationGuard: TerminationFlag, 
    timeoutInSeconds: number
  ) {
    this.queue = queue;
    this.tombstone = tombstone;
    this.terminationGuard = terminationGuard;
    this.timeoutInSeconds = timeoutInSeconds;
    this.entry = null;
    
    // Initialize with the first entry
    this.poll().then(value => {
      this.entry = value;
    });
  }

  /**
   * Checks if the current entry marks the end of the iteration.
   * 
   * @returns true if at end
   */
  private isEnd(): boolean {
    return this.entry === null || this.entry === this.tombstone;
  }

  /**
   * Polls the queue for the next element.
   * 
   * @returns Promise resolving to the next element or null on timeout/interruption
   */
  private async poll(): Promise<T | null> {
    try {
      return await this.queue.poll(this.timeoutInSeconds * 1000);
    } catch (e) {
      // Handle interruption
      if (e instanceof Error && e.message === 'INTERRUPTED') {
        return null;
      }
      throw e;
    }
  }

  /**
   * Gets the next value from the iterator.
   * 
   * @returns Promise with the next result
   */
  public async next(): Promise<IteratorResult<T>> {
    if (this.isEnd()) {
      return { done: true, value: undefined as unknown as T };
    }

    this.terminationGuard.assertRunning();
    
    const currentEntry = this.entry!;
    this.entry = await this.poll();
    
    return { 
      done: false, 
      value: currentEntry 
    };
  }

  /**
   * Makes this object iterable.
   * 
   * @returns This instance
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}

/**
 * A blocking queue implementation for TypeScript.
 */
export interface BlockingQueue<T> {
  /**
   * Adds an element to the queue.
   * 
   * @param element Element to add
   */
  add(element: T): void;
  
  /**
   * Retrieves and removes the head of the queue, 
   * waiting up to the specified timeout if necessary.
   * 
   * @param timeoutMs Maximum time to wait in milliseconds
   * @returns Promise resolving to the head element or null on timeout
   */
  poll(timeoutMs: number): Promise<T | null>;
  
  /**
   * Returns the current size of the queue.
   * 
   * @returns Queue size
   */
  size(): number;
}

/**
 * Implementation of BlockingQueue using JavaScript promises.
 */
export class ArrayBlockingQueue<T> implements BlockingQueue<T> {
  private readonly queue: T[] = [];
  private readonly waiters: ((value: T | null) => void)[] = [];
  private readonly capacity: number;
  
  /**
   * Creates a new blocking queue with the specified capacity.
   * 
   * @param capacity Maximum capacity (0 for unbounded)
   */
  constructor(capacity: number = 0) {
    this.capacity = capacity;
  }
  
  /**
   * Adds an element to the queue.
   * 
   * @param element Element to add
   */
  public add(element: T): void {
    if (this.capacity > 0 && this.queue.length >= this.capacity) {
      throw new Error("Queue is full");
    }
    
    // If there are waiters, directly hand the element to the first one
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift()!;
      resolve(element);
      return;
    }
    
    this.queue.push(element);
  }
  
  /**
   * Retrieves and removes the head of the queue, 
   * waiting up to the specified timeout if necessary.
   * 
   * @param timeoutMs Maximum time to wait in milliseconds
   * @returns Promise resolving to the head element or null on timeout
   */
  public async poll(timeoutMs: number): Promise<T | null> {
    // If queue has elements, return immediately
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }
    
    // Otherwise, wait for an element to be added
    return new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => {
        // Remove this waiter from the list
        const index = this.waiters.indexOf(resolve);
        if (index !== -1) {
          this.waiters.splice(index, 1);
        }
        resolve(null);
      }, timeoutMs);
      
      // Add the resolve function to waiters
      this.waiters.push((value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });
  }
  
  /**
   * Returns the current size of the queue.
   * 
   * @returns Queue size
   */
  public size(): number {
    return this.queue.length;
  }
}