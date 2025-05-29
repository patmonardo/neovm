import { HugeLongArray } from "@/collections";
import { HugeDoubleArray } from "@/collections";

/**
 * Memory estimation utilities for priority queue
 */
export class MemoryEstimations {
  static builder(clazz: any) {
    return {
      perNode: (name: string, estimator: (capacity: number) => number) => ({
        build: () => estimator,
      }),
    };
  }
}

/**
 * A heap-based priority queue specialized for long elements with double priorities.
 * Maintains a partial ordering where the smallest (or largest) value can always be
 * found in constant time. Unlike bounded queues, this can grow to full capacity.
 *
 * This is a TRUE PRIORITY QUEUE using heap data structure:
 * - add(): O(log n) - Insert element with priority
 * - pop(): O(log n) - Remove and return top element
 * - top(): O(1) - Peek at top element
 * - set(): O(log n) - Update element priority and reorder
 *
 * Perfect for:
 * - Dijkstra's shortest path algorithm
 * - A* pathfinding
 * - Prim's minimum spanning tree
 * - Huffman coding
 * - Event-driven simulation
 * - Any algorithm needing efficient min/max extraction
 *
 * Key differences from BoundedLongPriorityQueue:
 * - HEAP-based (not array-based)
 * - GROWING capacity (not fixed size)
 * - ELEMENT UPDATE support (set() method)
 * - POSITION TRACKING (inverted index)
 *
 * Implementation adapted from Apache Solr SOLR-2092
 */
export abstract class HugeLongPriorityQueue implements Iterable<number> {
  /**
   * Estimates memory usage for a priority queue of given capacity.
   * Accounts for heap array, position mapping, and cost values.
   */
  static memoryEstimation(): (capacity: number) => number {
    return (capacity: number) => {
      const heapSize = capacity === 0 ? 2 : capacity + 1; // +1 for 1-based indexing
      return (
        HugeLongArray.memoryEstimation(heapSize) + // heap array
        HugeLongArray.memoryEstimation(heapSize) + // position mapping
        HugeDoubleArray.memoryEstimation(capacity) // cost values
      );
    };
  }

  private readonly capacity: number;
  private heap!: HugeLongArray; // The actual heap (1-indexed)
  private mapIndexTo!: HugeLongArray; // element → heap position mapping
  private _size: number = 0; // Current number of elements
  protected costValues!: HugeDoubleArray; // element → priority mapping

  /**
   * Creates a new priority queue with the given capacity.
   * The size is fixed at creation - the queue cannot shrink or grow beyond this.
   *
   * @param capacity Maximum number of elements the queue can hold
   */
  protected constructor(capacity: number) {
    this.capacity = capacity;

    // Calculate heap size with 1-based indexing
    // We add +1 because heap[0] is unused (makes parent/child math cleaner)
    const heapSize = capacity === 0 ? 2 : capacity + 1;

    this.heap = HugeLongArray.newArray(heapSize);
    this.mapIndexTo = HugeLongArray.newArray(heapSize);
    this.costValues = HugeDoubleArray.newArray(capacity);
  }

  /**
   * Places an element at the specified position in the heap.
   * Also updates the inverted index to track element → position mapping.
   * This is critical for efficient element updates and lookups.
   *
   * @param position 1-based position in heap array
   * @param element The element to place
   */
  private placeElement(position: number, element: number): void {
    this.heap.set(position, element);
    this.mapIndexTo.set(element, position);
  }

  /**
   * Adds an element with associated cost to the queue in O(log n) time.
   * The element will be inserted at the correct position to maintain heap property.
   *
   * @param element The element to add (must be < capacity)
   * @param cost The priority/cost associated with this element
   */
  add(element: number, cost: number): void {
    console.assert(
      element < this.capacity,
      `Element ${element} exceeds capacity ${this.capacity}`
    );
    console.assert(
      this._size < this.capacity,
      `Queue is full (capacity: ${this.capacity})`
    );

    // Store the cost and mark as new element
    this.addCost(element, cost);

    // Add to end of heap
    this._size++;
    this.placeElement(this._size, element);

    // Restore heap property by bubbling up
    this.upHeap(this._size);
  }

  /**
   * Sets an element's cost, adding it if new or updating if it exists.
   * If the element already exists, the heap is reordered in O(log n) time.
   * If it's new, it's added in O(log n) time.
   *
   * This is perfect for algorithms like Dijkstra where you discover better paths.
   *
   * @param element The element to set
   * @param cost The new priority/cost for this element
   */
  set(element: number, cost: number): void {
    console.assert(
      element < this.capacity,
      `Element ${element} exceeds capacity ${this.capacity}`
    );

    const elementExisted = this.addCost(element, cost);

    if (elementExisted) {
      // Element was already in queue - update its position
      this.update(element);
    } else {
      // New element - add to end and bubble up
      this._size++;
      this.placeElement(this._size, element);
      this.upHeap(this._size);
    }
  }

  /**
   * Returns the cost/priority associated with the given element.
   * Even if the element has been popped from the queue, its last cost is returned.
   *
   * @param element The element to query
   * @returns The cost value, or 0.0 if element not found
   */
  cost(element: number): number {
    return this.costValues.get(element);
  }

  /**
   * Checks if an element is currently in the queue.
   * Uses the inverted index for O(1) lookup.
   *
   * @param element The element to check
   * @returns true if element is in queue, false otherwise
   */
  containsElement(element: number): boolean {
    return this.mapIndexTo.get(element) > 0;
  }

  /**
   * Returns the top element (min or max depending on implementation) in O(1) time.
   * Does NOT remove the element - use pop() for that.
   *
   * @returns The top element
   * @throws Error if queue is empty
   */
  top(): number {
    if (this.isEmpty()) {
      throw new Error("Priority Queue is empty");
    }
    return this.heap.get(1); // Root is always at position 1
  }

  /**
   * Removes and returns the top element in O(log n) time.
   * The heap property is maintained by moving the last element to the root
   * and then bubbling it down to its correct position.
   *
   * @returns The top element, or -1 if queue is empty
   */
  pop(): number {
    if (this._size > 0) {
      const result = this.heap.get(1); // Save the root

      // Move last element to root position
      this.placeElement(1, this.heap.get(this._size));
      this._size--;

      // Restore heap property by bubbling down
      this.downHeap(1);

      // Remove from cost tracking
      this.removeCost(result);

      return result;
    } else {
      return -1;
    }
  }

  /**
   * Returns the current number of elements in the queue.
   */
  size(): number {
    return this._size;
  }

  /**
   * Checks if the queue is currently empty.
   */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Removes all entries from the queue.
   * The queue can be reused after clearing.
   */
  clear(): void {
    this._size = 0;
    this.mapIndexTo.fill(0);
  }

  /**
   * Releases all memory used by the queue.
   * The queue cannot be used after calling this method.
   */
  release(): void {
    this._size = 0;
    this.heap = undefined as any;
    this.mapIndexTo = undefined as any;
    this.costValues.release();
  }

  /**
   * Returns the element at the i-th position in the heap (0-based external indexing).
   * Useful for debugging or specialized heap operations.
   *
   * @param i 0-based index
   * @returns Element at position i+1 in the 1-based heap
   */
  getIth(i: number): number {
    return this.heap.get(i + 1);
  }

  /**
   * Abstract method that defines the ordering of the queue.
   * Subclasses implement this to create min or max queues.
   *
   * @param a First element to compare
   * @param b Second element to compare
   * @returns true if a should come before b in the heap
   */
  protected abstract lessThan(a: number, b: number): boolean;

  /**
   * Adds or updates the cost for an element.
   *
   * @param element The element to update
   * @param cost The new cost value
   * @returns true if element already existed, false if it's new
   */
  private addCost(element: number, cost: number): boolean {
    const elementExists = this.mapIndexTo.get(element) > 0;
    this.costValues.set(element, cost);
    return elementExists;
  }

  /**
   * Finds the current position of an element in the heap.
   *
   * @param element The element to find
   * @returns 1-based position in heap, or 0 if not found
   */
  private findElementPosition(element: number): number {
    return this.mapIndexTo.get(element);
  }

  /**
   * Bubbles an element UP the heap until heap property is restored.
   * Used when inserting new elements or when an element's priority improves.
   *
   * Classic heap algorithm:
   * 1. Compare with parent
   * 2. If better than parent, swap
   * 3. Repeat until at root or heap property satisfied
   *
   * @param origPos Starting position (1-based)
   * @returns true if any swaps occurred
   */
  private upHeap(origPos: number): boolean {
    let i = origPos;
    const node = this.heap.get(i); // Save the node we're bubbling up

    // Find parent: parent of position i is at position i/2 (integer division)
    let j = Math.floor(i / 2);

    // Bubble up while we have a parent and our node is "better"
    while (j > 0 && this.lessThan(node, this.heap.get(j))) {
      // Move parent down
      this.placeElement(i, this.heap.get(j));
      i = j;
      j = Math.floor(j / 2); // Move to next parent
    }

    // Install our node at final position
    this.placeElement(i, node);

    return i !== origPos; // Return true if we moved
  }

  /**
   * Bubbles an element DOWN the heap until heap property is restored.
   * Used when removing the root or when an element's priority gets worse.
   *
   * Classic heap algorithm:
   * 1. Find the "better" child (left vs right)
   * 2. If child is better than current, swap
   * 3. Repeat until no children or heap property satisfied
   *
   * @param i Starting position (1-based)
   */
  private downHeap(i: number): void {
    const node = this.heap.get(i); // Save the node we're bubbling down

    // Find left child: left child of position i is at position 2*i
    let j = i * 2;
    let k = j + 1; // Right child is at position 2*i + 1

    // Choose the "better" child (according to lessThan)
    if (k <= this._size && this.lessThan(this.heap.get(k), this.heap.get(j))) {
      j = k; // Right child is better
    }

    // Bubble down while we have children and they're "better"
    while (j <= this._size && this.lessThan(this.heap.get(j), node)) {
      // Move better child up
      this.placeElement(i, this.heap.get(j));
      i = j;

      // Find children of new position
      j = i * 2;
      k = j + 1;

      // Choose better child again
      if (
        k <= this._size &&
        this.lessThan(this.heap.get(k), this.heap.get(j))
      ) {
        j = k;
      }
    }

    // Install our node at final position
    this.placeElement(i, node);
  }

  /**
   * Updates the position of an element after its cost has changed.
   * Tries bubbling up first, then bubbling down if that didn't work.
   * This covers all cases where an element's priority changes.
   *
   * @param element The element whose position needs updating
   */
  private update(element: number): void {
    const pos = this.findElementPosition(element);
    if (pos !== 0) {
      // Try bubbling up first
      if (!this.upHeap(pos) && pos < this._size) {
        // If up-heap didn't move anything, try down-heap
        this.downHeap(pos);
      }
    }
  }

  /**
   * Removes cost tracking for an element (marks it as not in queue).
   *
   * @param element The element to remove from tracking
   */
  private removeCost(element: number): void {
    this.mapIndexTo.set(element, 0);
  }

  /**
   * Iterator for traversing all elements in the queue.
   * NOTE: Iteration order is NOT specified - don't rely on any particular order.
   * Use pop() repeatedly if you need elements in priority order.
   */
  [Symbol.iterator](): Iterator<number> {
    let i = 1; // Start at position 1 (skip unused position 0)
    const size = this._size;
    const heap = this.heap;

    return {
      next(): IteratorResult<number> {
        if (i <= size) {
          return { done: false, value: heap.get(i++) };
        } else {
          return { done: true, value: undefined };
        }
      },
    };
  }

  /**
   * Creates a MIN priority queue where smaller costs have higher priority.
   * Perfect for Dijkstra's algorithm, shortest path finding, etc.
   *
   * @param capacity Maximum number of elements
   * @returns A min-heap priority queue
   */
  static min(capacity: number): HugeLongPriorityQueue {
    return new (class extends HugeLongPriorityQueue {
      protected lessThan(a: number, b: number): boolean {
        // Element 'a' comes before 'b' if its cost is smaller
        return this.costValues.get(a) < this.costValues.get(b);
      }
    })(capacity);
  }

  /**
   * Creates a MAX priority queue where larger costs have higher priority.
   * Perfect for finding highest-scored items, best matches, etc.
   *
   * @param capacity Maximum number of elements
   * @returns A max-heap priority queue
   */
  static max(capacity: number): HugeLongPriorityQueue {
    return new (class extends HugeLongPriorityQueue {
      protected lessThan(a: number, b: number): boolean {
        // Element 'a' comes before 'b' if its cost is larger (inverted for max-heap)
        return this.costValues.get(a) > this.costValues.get(b);
      }
    })(capacity);
  }
}
