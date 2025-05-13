import { PagedDataStructure } from './PagedDataStructure';
import { PageAllocator } from './PageAllocator';
import { Estimate } from '../../../mem/Estimate';

/**
 * Stack data structure for storing large numbers of number values.
 * Uses a paged approach to overcome JavaScript array size limitations.
 */
export class PagedLongStack extends PagedDataStructure<BigInt64Array> {
  /**
   * Factory for creating page allocators for BigInt64Array.
   */
  private static readonly ALLOCATOR_FACTORY =
    PageAllocator.ofArray<BigInt64Array>({
      BYTES_PER_ELEMENT: 8,
      constructor: BigInt64Array
    });

  /**
   * Current number of elements in the stack.
   */
  private size: number = 0;

  /**
   * Index of the current page.
   */
  private pageIndex: number = 0;

  /**
   * Index of the top element in the current page.
   */
  private pageTop: number = -1;

  /**
   * Size limit of the current page.
   */
  private pageLimit: number = 0;

  /**
   * Reference to the current page for faster access.
   */
  private currentPage: BigInt64Array;

  /**
   * Creates a new stack with the specified initial capacity.
   *
   * @param initialSize Initial capacity
   */
  constructor(initialSize: number) {
    super(
      Math.max(1, initialSize),
      PagedLongStack.ALLOCATOR_FACTORY.newAllocator()
    );
    this.clear();
    this.currentPage = this.pages[0];
  }

  /**
   * Estimates the memory usage for a stack of the given size.
   *
   * @param size Number of elements
   * @returns Estimated bytes
   */
  public static memoryEstimation(size: number): number {
    console.assert(size >= 0, "Size must be non-negative");

    const pageSize = 4096; // Elements per page
    const numberOfPages = Math.ceil(size / pageSize);

    // Calculate size for pages (each BigInt64Array page)
    const totalSizeForPages = numberOfPages * (
      8 * pageSize +  // 8 bytes per number
      40              // Array overhead
    );

    // Add overhead for class fields
    return totalSizeForPages +
           3 * 4 +    // 3 int fields (4 bytes each)
           8 +        // 1 long field (8 bytes)
           8;         // Reference to currentPage
  }

  /**
   * Clears all elements from the stack.
   */
  public clear(): void {
    this.size = 0;
    this.pageTop = -1;
    this.pageIndex = 0;
    this.currentPage = this.pages[0];
    this.pageLimit = this.currentPage.length;
  }

  /**
   * Pushes a value onto the stack.
   *
   * @param value Value to push
   */
  public push(value: number): void {
    let pageTop = ++this.pageTop;
    if (pageTop >= this.pageLimit) {
      pageTop = this.nextPage();
    }
    ++this.size;
    this.currentPage[pageTop] = value;
  }

  /**
   * Pops a value from the stack.
   *
   * @returns The value at the top of the stack
   * @throws Error if the stack is empty
   */
  public pop(): number {
    if (this.isEmpty()) {
      throw new Error("Cannot pop from an empty stack");
    }

    let pageTop = this.pageTop;
    if (pageTop < 0) {
      pageTop = this.previousPage();
    }
    --this.pageTop;
    --this.size;
    return this.currentPage[pageTop];
  }

  /**
   * Returns the value at the top of the stack without removing it.
   *
   * @returns The value at the top of the stack
   * @throws Error if the stack is empty
   */
  public peek(): number {
    if (this.isEmpty()) {
      throw new Error("Cannot peek at an empty stack");
    }

    const pageTop = this.pageTop;
    if (pageTop < 0) {
      const pageIndex = this.pageIndex - 1;
      const page = this.pages[pageIndex];
      return page[page.length - 1];
    }
    return this.currentPage[pageTop];
  }

  /**
   * Checks if the stack is empty.
   *
   * @returns true if the stack is empty
   */
  public isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Returns the number of elements in the stack.
   *
   * @returns The size
   */
  public override size(): number {
    return this.size;
  }

  /**
   * Releases memory held by this stack.
   *
   * @returns Estimated number of bytes freed
   */
  public override release(): number {
    const released = super.release();
    this.size = 0;
    this.pageTop = 0;
    this.pageIndex = 0;
    this.pageLimit = 0;
    this.currentPage = null!;
    return released;
  }

  /**
   * Moves to the next page when the current one is full.
   *
   * @returns New pageTop index
   */
  private nextPage(): number {
    const pageIndex = ++this.pageIndex;
    if (pageIndex >= this.pages.length) {
      this.grow(this.capacityFor(pageIndex + 1));
    }
    this.currentPage = this.pages[pageIndex];
    this.pageLimit = this.currentPage.length;
    return this.pageTop = 0;
  }

  /**
   * Moves to the previous page when the current one is empty.
   *
   * @returns New pageTop index
   * @throws Error if at the first page
   */
  private previousPage(): number {
    const pageIndex = this.pageIndex - 1;
    if (pageIndex < 0) {
      throw new Error("Stack underflow");
    }

    this.currentPage = this.pages[pageIndex];
    this.pageLimit = this.currentPage.length;
    this.pageIndex = pageIndex;
    return this.pageTop = this.pageLimit - 1;
  }
}
