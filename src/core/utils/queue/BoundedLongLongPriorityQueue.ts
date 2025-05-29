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
 * A bounded priority queue that maintains pairs of long elements with priorities.
 * This is the TWO-ELEMENT version - perfect for storing (source, target) pairs
 * with their associated weights/distances/scores.
 *
 * Efficiently handles large datasets by keeping memory usage constant.
 * Only retains the top K element pairs based on priority.
 *
 * Perfect for:
 * - Top-K shortest paths: (source, target) → distance
 * - Best edge weights: (nodeA, nodeB) → weight
 * - Nearest neighbor pairs: (query, candidate) → similarity
 * - Graph matching results: (leftNode, rightNode) → score
 * - Collaborative filtering: (user, item) → prediction
 */
export abstract class BoundedLongLongPriorityQueue {

  /**
   * Estimates memory usage for a priority queue of given capacity.
   * Accounts for two long arrays (elements1, elements2) plus one double array (priorities).
   */
  static memoryEstimation(capacity: number): number {
    return (
      Estimate.sizeOfLongArray(capacity) +  // elements1 array
      Estimate.sizeOfLongArray(capacity) +  // elements2 array
      Estimate.sizeOfDoubleArray(capacity)  // priorities array
    );
  }

  private readonly bound: number;
  private minValue: number = NaN;

  protected readonly _elements1: number[];  // First element of each pair
  protected readonly _elements2: number[];  // Second element of each pair
  protected readonly _priorities: number[]; // Priority/weight for each pair
  protected elementCount: number = 0;

  protected constructor(bound: number) {
    this.bound = bound;
    this._elements1 = new Array(bound);
    this._elements2 = new Array(bound);
    this._priorities = new Array(bound);
  }

  /**
   * Attempts to add an element pair with given priority.
   * Returns true if pair was added, false if rejected (priority too low).
   *
   * @param element1 First element of the pair (e.g., source node)
   * @param element2 Second element of the pair (e.g., target node)
   * @param priority Priority/weight/score for this pair
   * @returns true if added, false if rejected
   */
  abstract offer(element1: number, element2: number, priority: number): boolean;

  /**
   * Iterates over all element pairs in priority order.
   * Higher priority pairs are visited first in max queue,
   * lower priority pairs are visited first in min queue.
   *
   * @param consumer Function to call for each (element1, element2, priority) triple
   */
  abstract forEach(consumer: (element1: number, element2: number, priority: number) => void): void;

  /**
   * Returns all first elements as an array.
   * Elements are in priority order (best to worst).
   */
  elements1(): number[] {
    return this.elementCount === 0
      ? []
      : this._elements1.slice(0, this.elementCount);
  }

  /**
   * Returns all second elements as an array.
   * Elements are in priority order (best to worst).
   */
  elements2(): number[] {
    return this.elementCount === 0
      ? []
      : this._elements2.slice(0, this.elementCount);
  }

  /**
   * Returns all priorities as an array.
   * Priorities are in sorted order (best to worst).
   */
  priorities(): number[] {
    return Number.isNaN(this.minValue)
      ? []
      : this._priorities.slice(0, this.elementCount);
  }

  /**
   * Returns the current number of element pairs in the queue.
   */
  size(): number {
    return this.elementCount;
  }

  /**
   * Core insertion logic - maintains sorted order by priority.
   * Uses binary search to find insertion point, then shifts elements as needed.
   * This is where the magic happens for maintaining bounded size with best elements.
   *
   * Algorithm:
   * 1. Check if we should add (queue not full OR priority beats worst element)
   * 2. Binary search to find insertion index
   * 3. Shift elements to make room
   * 4. Insert new element pair
   * 5. Update count and track new minimum value
   */
  protected add(element1: number, element2: number, priority: number): boolean {
    // Only add if: queue not full, OR priority is better than worst element
    if (
      this.elementCount < this.bound ||
      Number.isNaN(this.minValue) ||
      priority < this.minValue
    ) {

      // Find insertion point using binary search on priorities array
      let idx = this.binarySearch(
        this._priorities,
        0,
        this.elementCount,
        priority
      );

      // Convert negative insertion point to positive index
      idx = idx < 0 ? -idx : idx + 1;

      // Calculate how many elements need to shift right
      const length = this.bound - idx;

      // Shift existing elements to make room (if needed)
      if (length > 0 && idx < this.bound) {
        // Shift from right to left to avoid overwriting
        for (
          let i = Math.min(this.elementCount, this.bound - 1);
          i >= idx;
          i--
        ) {
          this._priorities[i] = this._priorities[i - 1];
          this._elements1[i] = this._elements1[i - 1];
          this._elements2[i] = this._elements2[i - 1];
        }
      }

      // Insert new element pair at found position
      this._priorities[idx - 1] = priority;
      this._elements1[idx - 1] = element1;
      this._elements2[idx - 1] = element2;

      // Update count (bounded by capacity)
      if (this.elementCount < this.bound) {
        this.elementCount++;
      }

      // Track the worst (highest index) priority for quick rejection
      this.minValue = this._priorities[this.elementCount - 1];

      return true;
    }

    // Rejected - priority not good enough
    return false;
  }

  /**
   * Binary search implementation for finding insertion point in sorted array.
   * Returns exact match index if found, or negative insertion point if not found.
   *
   * This is critical for performance - O(log K) instead of O(K) for insertion.
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
        return mid; // exact match found
      }
    }

    // Key not found - return negative insertion point
    return -(low + 1);
  }

  /**
   * Creates a MAX priority queue (highest priority element pairs kept).
   * Uses negated priorities internally for efficient implementation.
   *
   * Perfect for:
   * - Top-K highest weighted edges
   * - Best similarity pairs
   * - Highest scoring matches
   *
   * @param bound Maximum number of element pairs to retain
   */
  static max(bound: number): BoundedLongLongPriorityQueue {
    return new (class extends BoundedLongLongPriorityQueue {
      constructor() {
        super(bound);
      }

      offer(element1: number, element2: number, priority: number): boolean {
        // Negate priority to use min-heap for max behavior
        return this.add(element1, element2, -priority);
      }

      forEach(consumer: (element1: number, element2: number, priority: number) => void): void {
        // Un-negate priorities when iterating
        for (let i = 0; i < this.elementCount; i++) {
          consumer(this._elements1[i], this._elements2[i], -this._priorities[i]);
        }
      }

      priorities(): number[] {
        // Un-negate priorities for external access
        return super.priorities().map((d) => -d);
      }
    })();
  }

  /**
   * Creates a MIN priority queue (lowest priority element pairs kept).
   *
   * Perfect for:
   * - Top-K shortest paths
   * - Closest neighbors
   * - Minimum distances
   *
   * @param bound Maximum number of element pairs to retain
   */
  static min(bound: number): BoundedLongLongPriorityQueue {
    return new (class extends BoundedLongLongPriorityQueue {
      constructor() {
        super(bound);
      }

      offer(element1: number, element2: number, priority: number): boolean {
        // Use priority directly for min behavior
        return this.add(element1, element2, priority);
      }

      forEach(consumer: (element1: number, element2: number, priority: number) => void): void {
        // Priorities already correct for min queue
        for (let i = 0; i < this.elementCount; i++) {
          consumer(this._elements1[i], this._elements2[i], this._priorities[i]);
        }
      }
    })();
  }
}
