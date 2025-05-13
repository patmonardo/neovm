import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimations';

/**
 * A bounded priority queue that stores elements with priorities.
 * Maintains only the top N elements based on priority.
 */
export abstract class BoundedLongPriorityQueue {
  /**
   * Consumer for queue elements.
   */
  export interface Consumer {
    accept(element: number, priority: number): void;
  }

  /**
   * Estimates memory usage for a queue of given capacity.
   *
   * @param capacity The maximum number of elements
   * @returns Memory estimation
   */
  public static memoryEstimation(capacity: number): MemoryEstimation {
    return MemoryEstimations.builder(BoundedLongPriorityQueue.name)
      .fixed("elements", capacity * 8)    // 8 bytes per number
      .fixed("priorities", capacity * 8)  // 8 bytes per double
      .build();
  }

  private readonly bound: number;
  private minValue: number = Number.NaN;

  protected readonly elements: number[];
  protected readonly priorities: number[];
  protected elementCount = 0;

  /**
   * Creates a bounded priority queue with specified capacity.
   *
   * @param bound Maximum number of elements
   */
  protected constructor(bound: number) {
    this.bound = bound;
    this.elements = new Array<number>(bound);
    this.priorities = new Array<number>(bound);
  }

  /**
   * Offers a new element to the queue.
   *
   * @param element Element value
   * @param priority Priority value
   * @returns true if the element was added
   */
  public abstract offer(element: number, priority: number): boolean;

  /**
   * Iterates through all elements in the queue.
   *
   * @param consumer Function to process each element
   */
  public abstract forEach(consumer: BoundedLongPriorityQueue.Consumer): void;

  /**
   * Returns an iterable of the elements.
   *
   * @returns Element iterable
   */
  public *elements(): IterableIterator<number> {
    if (this.elementCount > 0) {
      for (let i = 0; i < this.elementCount; i++) {
        yield this.elements[i];
      }
    }
  }

  /**
   * Returns an iterable of the priorities.
   *
   * @returns Priority iterable
   */
  public *priorities(): IterableIterator<number> {
    if (!isNaN(this.minValue)) {
      for (let i = 0; i < this.elementCount; i++) {
        yield this.priorities[i];
      }
    }
  }

  /**
   * Returns the number of elements in the queue.
   *
   * @returns Element count
   */
  public size(): number {
    return this.elementCount;
  }

  /**
   * Checks if the queue contains the specified element.
   *
   * @param element Element to check
   * @returns true if the element is present
   */
  public contains(element: number): boolean {
    for (let i = 0; i < this.elementCount; i++) {
      if (this.elements[i] === element) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the element at the specified index.
   *
   * @param index Index to get
   * @returns Element at that index
   */
  public elementAt(index: number): number {
    return this.elements[index];
  }

  /**
   * Updates the element at the specified index.
   *
   * @param index Index to update
   * @param newElement New element value
   */
  public updateElementAt(index: number, newElement: number): void {
    this.elements[index] = newElement;
  }

  /**
   * Adds an element to the queue in sorted order.
   *
   * @param element Element value
   * @param priority Priority value
   * @returns true if the element was added
   */
  protected add(element: number, priority: number): boolean {
    if (this.elementCount < this.bound || isNaN(this.minValue) || priority < this.minValue) {
      let idx = this.binarySearch(this.priorities, 0, this.elementCount, priority);
      idx = (idx < 0) ? -idx : idx + 1;
      const length = this.bound - idx;

      if (length > 0 && idx < this.bound) {
        // Shift elements to make space
        for (let i = Math.min(this.bound - 1, this.elementCount); i >= idx; i--) {
          if (i > 0) {
            this.priorities[i] = this.priorities[i - 1];
            this.elements[i] = this.elements[i - 1];
          }
        }
      }

      this.priorities[idx - 1] = priority;
      this.elements[idx - 1] = element;

      if (this.elementCount < this.bound) {
        this.elementCount++;
      }

      this.minValue = this.priorities[this.elementCount - 1];
      return true;
    }
    return false;
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
  public static max(bound: number): BoundedLongPriorityQueue {
    return new class extends BoundedLongPriorityQueue {
      constructor(bound: number) {
        super(bound);
      }

      public offer(element: number, priority: number): boolean {
        return this.add(element, -priority);
      }

      public forEach(consumer: BoundedLongPriorityQueue.Consumer): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer.accept(this.elements[i], -this.priorities[i]);
        }
      }

      public *priorities(): IterableIterator<number> {
        for (const priority of super.priorities()) {
          yield -priority;
        }
      }
    }(bound);
  }

  /**
   * Creates a min priority queue.
   *
   * @param bound Maximum capacity
   * @returns A new min priority queue
   */
  public static min(bound: number): BoundedLongPriorityQueue {
    return new class extends BoundedLongPriorityQueue {
      constructor(bound: number) {
        super(bound);
      }

      public offer(element: number, priority: number): boolean {
        return this.add(element, priority);
      }

      public forEach(consumer: BoundedLongPriorityQueue.Consumer): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer.accept(this.elements[i], this.priorities[i]);
        }
      }
    }(bound);
  }
}

// Define the Consumer interface as a namespace extension
export namespace BoundedLongPriorityQueue {
  export interface Consumer {
    accept(element: number, priority: number): void;
  }
}
