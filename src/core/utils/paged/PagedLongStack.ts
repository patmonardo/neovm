/**
 * High-performance paged stack for billion-scale graph algorithms.
 *
 * Essential for algorithms requiring massive stack capacity:
 * - Depth-First Search (DFS) on huge graphs
 * - Backtracking algorithms (pathfinding, constraint solving)
 * - Recursive traversals with billion-node graphs
 * - Undo/redo operations in graph editing
 * - Call stack simulation for iterative implementations
 * - Expression evaluation with deep nesting
 *
 * Performance characteristics:
 * - O(1) push/pop operations (amortized)
 * - Paged memory layout prevents stack overflow
 * - Minimal page switching overhead
 * - Cache-friendly sequential access within pages
 * - Thread-safe growth through PagedDataStructure base
 *
 * Memory efficiency:
 * - Only allocates pages as needed (lazy allocation)
 * - Efficient page reuse during pop operations
 * - Predictable memory usage patterns
 * - Supports billion-element capacity
 *
 * Graph Algorithm Applications:
 * - DFS traversal state management
 * - Backtracking in pathfinding algorithms
 * - Recursive algorithm iterativization
 * - Expression tree evaluation
 * - Undo stacks for graph modifications
 * - Call frame simulation in interpreters
 *
 * @module PagedLongStack
 */

import { Estimate } from '@/mem';
import { PageAllocator } from './PageAllocator';
import { PagedDataStructure } from './PagedDataStructure';

export class PagedLongStack extends PagedDataStructure<number[]> {
  private static readonly ALLOCATOR_FACTORY = PageAllocator.ofNumberArray();

  private stackSize: number = 0;
  private _pageIndex: number = 0;
  private pageTop: number = -1;
  private pageLimit: number = 0;
  private currentPage: number[] | null = null;

  /**
   * Creates a new paged stack with specified initial capacity.
   *
   * @param initialSize Initial capacity (minimum 1)
   *
   * @example
   * ```typescript
   * // Stack for DFS on massive graph
   * const dfsStack = new PagedLongStack(1000000000);
   *
   * // Push nodes to visit
   * dfsStack.push(startNodeId);
   *
   * // DFS traversal loop
   * while (!dfsStack.isEmpty()) {
   *   const currentNode = dfsStack.pop();
   *
   *   graph.getNeighbors(currentNode).forEach(neighbor => {
   *     if (!visited.has(neighbor)) {
   *       dfsStack.push(neighbor);
   *       visited.add(neighbor);
   *     }
   *   });
   * }
   * ```
   */
  constructor(initialSize: number) {
    const allocator = PagedLongStack.ALLOCATOR_FACTORY.newAllocator();
    super(Math.max(1, initialSize), allocator);
    this.clear();
  }

  /**
   * Memory estimation for capacity planning.
   * Essential for resource allocation in large-scale processing.
   *
   * @param size Expected maximum stack size
   * @returns Estimated memory usage in bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, 'Size must be non-negative');

    const pageSize = 4096; // Default page size for number arrays
    const numberOfPages = Math.ceil(size / pageSize);
    const totalSizeForPages = Estimate.sizeOfArray(
      numberOfPages,
      Estimate.sizeOfLongArray(pageSize)
    );

    // Add overhead for instance variables
    const instanceOverhead = 3 * Estimate.sizeOfInstance('number') +
                             Estimate.sizeOfInstance('number');

    return totalSizeForPages + instanceOverhead;
  }

  /**
   * Clears the stack, resetting to empty state.
   * Reuses existing pages for efficiency.
   * Fast O(1) operation - doesn't deallocate pages.
   */
  public clear(): void {
    this.stackSize = 0;
    this.pageTop = -1;
    this._pageIndex = 0;
    this.currentPage = this.pages[0];
    this.pageLimit = this.currentPage ? this.currentPage.length : 0;
  }

  /**
   * Pushes a value onto the stack.
   * Automatically grows to accommodate new elements.
   *
   * @param value Value to push onto stack
   *
   * Performance: O(1) amortized (occasional page allocation)
   *
   * Graph Algorithm Use Cases:
   * - Push nodes to visit in DFS
   * - Push backtrack points in pathfinding
   * - Push function call frames in recursion simulation
   * - Push undo operations in graph editing
   */
  public async push(value: number): Promise<void> {
    let pageTop = ++this.pageTop;

    if (pageTop >= this.pageLimit) {
      pageTop = await this.nextPage();
    }

    this.stackSize++;
    this.currentPage![pageTop] = value;
  }

  /**
   * Pops a value from the stack.
   * Returns to previous page when current page is exhausted.
   *
   * @returns The top value from the stack
   * @throws Error if stack is empty
   *
   * Performance: O(1) with occasional page switching
   *
   * Graph Algorithm Use Cases:
   * - Get next node to visit in DFS
   * - Retrieve backtrack point in pathfinding
   * - Pop function call frame in recursion simulation
   * - Execute undo operation in graph editing
   */
  public pop(): number {
    if (this.isEmpty()) {
      throw new Error('Cannot pop from empty stack');
    }

    let pageTop = this.pageTop;

    if (pageTop < 0) {
      pageTop = this.previousPage();
    }

    this.pageTop = pageTop - 1;
    this.stackSize--;

    return this.currentPage![pageTop];
  }

  /**
   * Peeks at the top value without removing it.
   * Useful for inspecting next operation without commitment.
   *
   * @returns The top value from the stack
   * @throws Error if stack is empty
   *
   * Performance: O(1)
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error('Cannot peek at empty stack');
    }

    let pageTop = this.pageTop;

    if (pageTop < 0) {
      // Look at the last element of the previous page
      const prevPageIndex = this._pageIndex - 1;
      const prevPage = this.pages[prevPageIndex];
      return prevPage[prevPage.length - 1];
    }

    return this.currentPage![pageTop];
  }

  /**
   * Checks if the stack is empty.
   *
   * @returns true if stack contains no elements
   */
  public isEmpty(): boolean {
    return this.stackSize === 0;
  }

  /**
   * Returns the number of elements in the stack.
   *
   * @returns Current stack size
   */
  public size(): number {
    return this.stackSize;
  }

  /**
   * Releases all resources and invalidates the stack.
   *
   * @returns Estimated bytes freed
   */
  public release(): number {
    const released = super.release();
    this.stackSize = 0;
    this.pageTop = 0;
    this._pageIndex = 0;
    this.pageLimit = 0;
    this.currentPage = null;
    return released;
  }

  /**
   * Advances to the next page, allocating if necessary.
   * Thread-safe growth through PagedDataStructure base.
   *
   * @returns New page top index (always 0)
   */
  private async nextPage(): Promise<number> {
    const newPageIndex = ++this._pageIndex;

    if (newPageIndex >= this.pages.length) {
      await this.grow(this.capacityFor(newPageIndex + 1));
    }

    this.currentPage = this.pages[newPageIndex];
    this.pageLimit = this.currentPage.length;
    return this.pageTop = 0;
  }

  /**
   * Returns to the previous page.
   * Used when popping from an empty current page.
   *
   * @returns New page top index (last element of previous page)
   */
  private previousPage(): number {
    const prevPageIndex = --this._pageIndex;

    if (prevPageIndex < 0) {
      throw new Error('Stack underflow - no previous page');
    }

    this.currentPage = this.pages[prevPageIndex];
    this.pageLimit = this.currentPage.length;
    return this.pageTop = this.pageLimit - 1;
  }
}
