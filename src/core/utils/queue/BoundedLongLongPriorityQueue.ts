import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimations';

/**
 * A bounded priority queue that stores pairs of values with priorities.
 * Maintains only the top N elements based on priority.
 */
export abstract class BoundedLongLongPriorityQueue {
  /**
   * Consumer for queue elements.
   */
  export interface Consumer {
    accept(element1: number, element2: number, priority: number): void;
  }

  /**
   * Estimates memory usage for a queue of given capacity.
   *
   * @param capacity The maximum number of elements
   * @returns Memory estimation
   */
  public static memoryEstimation(capacity: number): MemoryEstimation {
    return MemoryEstimations.builder(BoundedLongLongPriorityQueue.name)
      .fixed("elements1", capacity * 8) // 8 bytes per number
      .fixed("elements2", capacity * 8) // 8 bytes per number
      .fixed("priorities", capacity * 8) // 8 bytes per double
      .build();
  }

  private readonly bound: number;
  private minValue: number = Number.NaN;

  protected readonly elements1: number[];
  protected readonly elements2: number[];
  protected readonly priorities: number[];
  protected elementCount = 0;

  /**
   * Creates a bounded priority queue with specified capacity.
   *
   * @param bound Maximum number of elements
   */
  protected constructor(bound: number) {
    this.bound = bound;
    this.elements1 = new Array<number>(bound);
    this.elements2 = new Array<number>(bound);
    this.priorities = new Array<number>(bound);
  }

  /**
   * Offers a new element to the queue.
   *
   * @param element1 First element value
   * @param element2 Second element value
   * @param priority Priority value
   * @returns true if the element was added
   */
  public abstract offer(element1: number, element2: number, priority: number): boolean;

  /**
   * Iterates through all elements in the queue.
   *
   * @param consumer Function to process each element
   */
  public abstract foreach(consumer: BoundedLongLongPriorityQueue.Consumer): void;

  /**
   * Returns the number of elements in the queue.
   *
   * @returns Element count
   */
  public size(): number {
    return this.elementCount;
  }

  /**
   * Adds an element to the queue in sorted order.
   *
   * @param element1 First element value
   * @param element2 Second element value
   * @param priority Priority value
   * @returns true if the element was added
   */
  protected add(element1: number, element2: number, priority: number): boolean {
    if (this.elementCount < this.bound || isNaN(this.minValue) || priority < this.minValue) {
      let idx = this.binarySearch(this.priorities, 0, this.elementCount, priority);
      idx = (idx < 0) ? -idx : idx + 1;
      const length = this.bound - idx;

      if (length > 0 && idx < this.bound) {
        // Shift elements to make space
        for (let i = Math.min(this.bound - 1, this.elementCount); i >= idx; i--) {
          if (i > 0) {
            this.priorities[i] = this.priorities[i - 1];
            this.elements1[i] = this.elements1[i - 1];
            this.elements2[i] = this.elements2[i - 1];
          }
        }
      }

      this.priorities[idx - 1] = priority;
      this.elements1[idx - 1] = element1;
      this.elements2[idx - 1] = element2;

      if (this.elementCount < this.bound) {
        this.elementCount++;
      }

      this.minValue = this.priorities[this.elementCount - 1];
      return true;
    }
    return false;
  }

  /**
   * Returns an array of the first elements.
   *
   * @returns Array of first elements
   */
  public elements1Array(): number[] {
    return this.elementCount === 0
      ? []
      : this.elements1.slice(0, this.elementCount);
  }

  /**
   * Returns an array of the second elements.
   *
   * @returns Array of second elements
   */
  public elements2Array(): number[] {
    return this.elementCount === 0
      ? []
      : this.elements2.slice(0, this.elementCount);
  }

  /**
   * Returns an array of priorities.
   *
   * @returns Array of priorities
   */
  public prioritiesArray(): number[] {
    return this.elementCount === 0
      ? []
      : this.priorities.slice(0, this.elementCount);
  }

  /**
   * Binary search implementation similar to Java's Arrays.binarySearch.
   *
   * @param array Array to search
   * @param fromIndex Start index
   * @param toIndex End index (exclusive)
   * @param key Value to find
   * @returns Index where the key was found, or -(insertion point) - 1 if not found
   */
  private binarySearch(array: number[], fromIndex: number, toIndex: number, key: number): number {
    let low = fromIndex;
    let high = toIndex - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midVal = array[mid];

      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else {
        return mid; // key found
      }
    }
    return -(low + 1);  // key not found
  }

  /**
   * Creates a max priority queue.
   *
   * @param bound Maximum capacity
   * @returns A new max priority queue
   */
  public static max(bound: number): BoundedLongLongPriorityQueue {
    return new class extends BoundedLongLongPriorityQueue {
      constructor(bound: number) {
        super(bound);
      }

      public offer(element1: number, element2: number, priority: number): boolean {
        return this.add(element1, element2, -priority);
      }

      public foreach(consumer: BoundedLongLongPriorityQueue.Consumer): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer.accept(this.elements1[i], this.elements2[i], -this.priorities[i]);
        }
      }

      public prioritiesArray(): number[] {
        return super.prioritiesArray().map(p => -p);
      }
    }(bound);
  }

  /**
   * Creates a min priority queue.
   *
   * @param bound Maximum capacity
   * @returns A new min priority queue
   */
  public static min(bound: number): BoundedLongLongPriorityQueue {
    return new class extends BoundedLongLongPriorityQueue {
      constructor(bound: number) {
        super(bound);
      }

      public offer(element1: number, element2: number, priority: number): boolean {
        return this.add(element1, element2, priority);
      }

      public foreach(consumer: BoundedLongLongPriorityQueue.Consumer): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer.accept(this.elements1[i], this.elements2[i], this.priorities[i]);
        }
      }
    }(bound);
  }
}

// Define the Consumer interface as a namespace extension
export namespace BoundedLongLongPriorityQueue {
  export interface Consumer {
    accept(element1: number, element2: number, priority: number): void;
  }
}
