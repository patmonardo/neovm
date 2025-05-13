import { HugeLongArray } from '../../collections/ha/HugeLongArray';
import { HugeDoubleArray } from '../../collections/ha/HugeDoubleArray';
import { MemoryEstimation, MemoryEstimations } from '../../mem/MemoryEstimations';

/**
 * A PriorityQueue specialized for longs that maintains a partial ordering of
 * its elements such that the smallest value can always be found in constant time.
 * The definition of what <i>small</i> means is up to the implementing subclass.
 *
 * Put()'s and pop()'s require log(size) time but the remove() cost implemented here is linear.
 *
 * NOTE: Iteration order is not specified.
 *
 * Implementation has been adapted from https://issues.apache.org/jira/browse/SOLR-2092
 */
export abstract class HugeLongPriorityQueue implements Iterable<number> {
  /**
   * Creates a memory estimation for this data structure.
   *
   * @returns Memory estimation
   */
  public static memoryEstimation(): MemoryEstimation {
    return MemoryEstimations.builder(HugeLongPriorityQueue.name)
      .perNode("heap", HugeLongArray.memoryEstimation)
      .perNode("costs", HugeDoubleArray.memoryEstimation)
      .perNode("inverted index", HugeLongArray.memoryEstimation)
      .build();
  }

  private readonly capacity: number;
  private heap: HugeLongArray;
  private mapIndexTo: HugeLongArray;
  private size = 0;

  protected costValues: HugeDoubleArray;

  /**
   * Creates a new priority queue with the given capacity.
   * The size is fixed, the queue cannot shrink or grow.
   *
   * @param capacity Maximum capacity of the queue
   */
  protected constructor(capacity: number) {
    let heapSize: number;
    if (0 === capacity) {
      // We allocate 1 extra to avoid if statement in top()
      heapSize = 2;
    } else {
      // NOTE: we add +1 because all access to heap is
      // 1-based not 0-based. heap[0] is unused.
      heapSize = capacity + 1;
    }
    this.capacity = capacity;
    this.heap = HugeLongArray.newArray(heapSize);
    this.mapIndexTo = HugeLongArray.newArray(heapSize);
    this.costValues = HugeDoubleArray.newArray(capacity);
  }

  /**
   * Adds the element at the specified position in the heap array.
   *
   * @param position Position in the heap
   * @param element Element to place
   */
  private placeElement(position: number, element: number): void {
    this.heap.set(position, element);
    this.mapIndexTo.set(Number(element), BigInt(position));
  }

  /**
   * Adds an element associated with a cost to the queue in log(size) time.
   *
   * @param element Element to add
   * @param cost Cost of the element
   */
  public add(element: number, cost: number): void {
    console.assert(Number(element) < this.capacity, "Element must be less than capacity");
    this.addCost(element, cost);
    this.size++;
    this.placeElement(this.size, element);
    this.upHeap(this.size);
  }

  /**
   * Adds an element associated with a cost to the queue in log(size) time.
   * If the element was already in the queue, its cost is updated and the
   * heap is reordered in log(size) time.
   *
   * @param element Element to set
   * @param cost Cost of the element
   */
  public set(element: number, cost: number): void {
    console.assert(Number(element) < this.capacity, "Element must be less than capacity");
    if (this.addCost(element, cost)) {
      this.update(element);
    } else {
      this.size++;
      this.placeElement(this.size, element);
      this.upHeap(this.size);
    }
  }

  /**
   * Returns the cost associated with the given element.
   * If the element has been popped from the queue, its
   * latest cost value is being returned.
   *
   * @param element Element to get cost for
   * @returns The cost value for the element, 0.0 if element is not found
   */
  public cost(element: number): number {
    return this.costValues.get(Number(element));
  }

  /**
   * Returns true if the element is contained in the queue.
   *
   * @param element Element to check
   * @returns true if element exists in queue
   */
  public containsElement(element: number): boolean {
    return this.mapIndexTo.get(Number(element)) > 0n;
  }

  /**
   * Returns the element with the minimum cost from the queue in constant time.
   *
   * @returns Element with minimum cost
   * @throws Error if queue is empty
   */
  public top(): number {
    if (this.isEmpty()) {
      throw new Error("Priority Queue is empty");
    }
    return this.heap.get(1);
  }

  /**
   * Removes and returns the element with the minimum cost from the queue in log(size) time.
   *
   * @returns Element with minimum cost, or -1n if queue is empty
   */
  public pop(): number {
    if (this.size > 0) {
      const result = this.heap.get(1);    // save first value
      this.placeElement(1, this.heap.get(this.size));    // move last to first
      this.size--;
      this.downHeap(1);           // adjust heap
      this.removeCost(result);
      return result;
    } else {
      return -1n;
    }
  }

  /**
   * Returns the number of elements currently stored in the queue.
   *
   * @returns Number of elements in queue
   */
  public size(): number {
    return this.size;
  }

  /**
   * Removes all entries from the queue, releases all buffers.
   * The queue can no longer be used afterwards.
   */
  public release(): void {
    this.size = 0;
    this.heap = null!;
    this.mapIndexTo = null!;
    this.costValues.release();
  }

  /**
   * Defines the ordering of the queue.
   * Returns true iff {@code a} is strictly less than {@code b}.
   *
   * The default behavior assumes a min queue, where the value with smallest cost is on top.
   * To implement a max queue, return {@code b < a}.
   * The resulting order is not stable.
   *
   * @param a First element
   * @param b Second element
   * @returns true if a is less than b
   */
  protected abstract lessThan(a: number, b: number): boolean;

  /**
   * Adds the given element to the queue.
   * If the element already exists, its cost is overridden.
   *
   * @param element Element to add
   * @param cost Cost of the element
   * @returns true if element already existed, false otherwise
   */
  private addCost(element: number, cost: number): boolean {
    const elementExists = this.mapIndexTo.get(Number(element)) > 0n;
    this.costValues.set(Number(element), cost);
    return elementExists;
  }

  /**
   * Checks if the queue is empty.
   *
   * @returns true if queue is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Removes all entries from the queue.
   */
  public clear(): void {
    this.size = 0;
    this.mapIndexTo.fill(0n);
  }

  /**
   * Finds the position of an element in the heap.
   *
   * @param element Element to find
   * @returns Position in heap
   */
  findElementPosition(element: number): number {
    return Number(this.mapIndexTo.get(Number(element)));
  }

  /**
   * Move an element up the heap until it's in the correct position.
   *
   * @param origPos Original position
   * @returns true if element moved
   */
  private upHeap(origPos: number): boolean {
    let i = origPos;
    // save bottom node
    const node = this.heap.get(i);
    // find parent of current node
    let j = i >>> 1;
    while (j > 0 && this.lessThan(node, this.heap.get(j))) {
      // shift parents down
      this.placeElement(i, this.heap.get(j));
      i = j;
      // find new parent of swapped node
      j = j >>> 1;
    }
    // install saved node
    this.placeElement(i, node);
    return i !== origPos;
  }

  /**
   * Move an element down the heap until it's in the correct position.
   *
   * @param i Position to start from
   */
  private downHeap(i: number): void {
    // save top node
    const node = this.heap.get(i);
    // find smallest child of top node
    let j = i << 1;
    let k = j + 1;
    if (k <= this.size && this.lessThan(this.heap.get(k), this.heap.get(j))) {
      j = k;
    }
    while (j <= this.size && this.lessThan(this.heap.get(j), node)) {
      // shift up child
      this.placeElement(i, this.heap.get(j));
      i = j;
      // find smallest child of swapped node
      j = i << 1;
      k = j + 1;
      if (k <= this.size && this.lessThan(this.heap.get(k), this.heap.get(j))) {
        j = k;
      }
    }
    // install saved node
    this.placeElement(i, node);
  }

  /**
   * Update the position of an element in the heap.
   *
   * @param element Element to update
   */
  private update(element: number): void {
    const pos = this.findElementPosition(element);
    if (pos !== 0) {
      if (!this.upHeap(pos) && pos < this.size) {
        this.downHeap(pos);
      }
    }
  }

  /**
   * Removes cost tracking for an element.
   *
   * @param element Element to remove
   */
  private removeCost(element: number): void {
    this.mapIndexTo.set(Number(element), 0n);
  }

  /**
   * Iterator implementation.
   *
   * @returns Iterator of elements in heap order
   */
  public [Symbol.iterator](): Iterator<number> {
    let i = 1;
    const size = this.size;
    const heap = this.heap;

    return {
      next(): IteratorResult<number> {
        if (i <= size) {
          return {
            done: false,
            value: heap.get(i++)
          };
        }
        return { done: true, value: undefined };
      }
    };
  }

  /**
   * Returns the element in the i-th position of the heap.
   *
   * @param i Position in the heap (0-based for external API)
   * @returns Element at that position
   */
  public getIth(i: number): number {
    return this.heap.get(i + 1);
  }

  /**
   * Returns a non-growing min priority queue,
   * i.e., the element with the lowest priority is always on top.
   *
   * @param capacity Maximum capacity of the queue
   * @returns A min priority queue
   */
  public static min(capacity: number): HugeLongPriorityQueue {
    return new class extends HugeLongPriorityQueue {
      constructor(capacity: number) {
        super(capacity);
      }

      protected lessThan(a: number, b: number): boolean {
        return this.costValues.get(Number(a)) < this.costValues.get(Number(b));
      }
    }(capacity);
  }

  /**
   * Returns a non-growing max priority queue,
   * i.e., the element with the highest priority is always on top.
   *
   * @param capacity Maximum capacity of the queue
   * @returns A max priority queue
   */
  public static max(capacity: number): HugeLongPriorityQueue {
    return new class extends HugeLongPriorityQueue {
      constructor(capacity: number) {
        super(capacity);
      }

      protected lessThan(a: number, b: number): boolean {
        return this.costValues.get(Number(a)) > this.costValues.get(Number(b));
      }
    }(capacity);
  }
}
