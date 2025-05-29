/**
 * Memory estimation utilities for priority queue
 */
export class MemoryEstimations {
  static builder(clazz: any) {
    return {
      fixed: (name: string, size: number) => ({ build: () => size }),
    };
  }
}

export class Estimate {
  static sizeOfLongArray(capacity: number): number {
    return capacity * 8; // 8 bytes per long
  }

  static sizeOfDoubleArray(capacity: number): number {
    return capacity * 8; // 8 bytes per double
  }
}

/**
 * Consumer interface for iterating over queue elements
 */
interface Consumer {
  accept(element: number, priority: number): void;
}

/**
 * A bounded priority queue that maintains only the top K elements.
 * Efficiently handles large datasets by keeping memory usage constant.
 *
 * Perfect for:
 * - Top-K algorithms (nearest neighbors, shortest paths)
 * - Beam search in graph algorithms
 * - Memory-constrained ranking operations
 */
export abstract class BoundedLongPriorityQueue {
  /**
   * Estimates memory usage for a priority queue of given capacity
   */
  static memoryEstimation(capacity: number): number {
    return (
      Estimate.sizeOfLongArray(capacity) + Estimate.sizeOfDoubleArray(capacity)
    );
  }

  private readonly bound: number;
  private minValue: number = NaN;

  protected readonly _elements: number[];
  protected readonly _priorities: number[];
  protected elementCount: number = 0;

  protected constructor(bound: number) {
    this.bound = bound;
    this._elements = new Array(bound);
    this._priorities = new Array(bound);
  }

  /**
   * Attempts to add an element with given priority.
   * Returns true if element was added, false if rejected.
   */
  abstract offer(element: number, priority: number): boolean;

  /**
   * Iterates over all elements in priority order
   */
  abstract forEach(consumer: (element: number, priority: number) => void): void;

  /**
   * Returns all elements as an array
   */
  elements(): number[] {
    return this.elementCount === 0
      ? []
      : this._elements.slice(0, this.elementCount);
  }

  /**
   * Returns all priorities as an array
   */
  priorities(): number[] {
    return Number.isNaN(this.minValue)
      ? []
      : this._priorities.slice(0, this.elementCount);
  }

  /**
   * Returns the current number of elements in the queue
   */
  size(): number {
    return this.elementCount;
  }

  /**
   * Checks if the queue contains a specific element
   */
  contains(element: number): boolean {
    return this.elements().some((el) => el === element);
  }

  /**
   * Gets element at specific index
   */
  elementAt(index: number): number {
    return this._elements[index];
  }

  /**
   * Updates element at specific index
   */
  updateElementAt(index: number, newElement: number): void {
    this._elements[index] = newElement;
  }

  /**
   * Core insertion logic - maintains sorted order by priority
   */
  protected add(element: number, priority: number): boolean {
    // Add if: queue not full, OR priority is better than worst element
    if (
      this.elementCount < this.bound ||
      Number.isNaN(this.minValue) ||
      priority < this.minValue
    ) {
      // Find insertion point using binary search
      let idx = this.binarySearch(
        this._priorities,
        0,
        this.elementCount,
        priority
      );
      idx = idx < 0 ? -idx : idx + 1;

      // Shift elements to make room (if needed)
      const length = this.bound - idx;
      if (length > 0 && idx < this.bound) {
        // Shift priorities
        for (
          let i = Math.min(this.elementCount, this.bound - 1);
          i >= idx;
          i--
        ) {
          this._priorities[i] = this._priorities[i - 1];
          this._elements[i] = this._elements[i - 1];
        }
      }

      // Insert new element
      this._priorities[idx - 1] = priority;
      this._elements[idx - 1] = element;

      // Update count and min value
      if (this.elementCount < this.bound) {
        this.elementCount++;
      }
      this.minValue = this._priorities[this.elementCount - 1];

      return true;
    }
    return false;
  }

  /**
   * Binary search implementation for finding insertion point
   */
  private binarySearch(
    array: number[],
    fromIndex: number,
    toIndex: number,
    key: number
  ): number {
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
    return -(low + 1); // key not found
  }

  /**
   * Creates a MAX priority queue (highest priority elements kept)
   * Uses negated priorities internally for efficient implementation
   */
  static max(bound: number): BoundedLongPriorityQueue {
    return new (class extends BoundedLongPriorityQueue {
      constructor() {
        super(bound);
      }

      offer(element: number, priority: number): boolean {
        return this.add(element, -priority); // Negate for max behavior
      }

      forEach(consumer: (element: number, priority: number) => void): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer(this._elements[i], -this._priorities[i]); // Un-negate priorities
        }
      }

      priorities(): number[] {
        return super.priorities().map((d) => -d); // Un-negate priorities
      }
    })();
  }

  /**
   * Creates a MIN priority queue (lowest priority elements kept)
   */
  static min(bound: number): BoundedLongPriorityQueue {
    return new (class extends BoundedLongPriorityQueue {
      constructor() {
        super(bound);
      }

      offer(element: number, priority: number): boolean {
        return this.add(element, priority);
      }

      forEach(consumer: (element: number, priority: number) => void): void {
        for (let i = 0; i < this.elementCount; i++) {
          consumer(this._elements[i], this._priorities[i]);
        }
      }
    })();
  }
}
