/**
 * An iterator that drains elements from an array as it iterates,
 * allowing thread-safe parallel consumption of array elements.
 */
export class DrainingIterator<PAGE> {
  private readonly pages: (PAGE | null)[];
  private readonly pageSize: number;
  private readonly counterBuffer: SharedArrayBuffer;
  private readonly counter: Int32Array;

  /**
   * Creates a new draining iterator over the given array of pages
   *
   * @param pages Array of pages to drain
   * @param pageSize Size of each page
   */
  constructor(pages: PAGE[], pageSize: number) {
    // Create a copy of the pages array to avoid modifying the original
    this.pages = [...pages];
    this.pageSize = pageSize;

    // Use SharedArrayBuffer and Atomics for thread-safe counter
    this.counterBuffer = new SharedArrayBuffer(4); // 4 bytes for a single Int32
    this.counter = new Int32Array(this.counterBuffer);
    this.counter[0] = 0; // Initialize counter to 0
  }

  /**
   * Creates and returns a new draining batch object
   */
  public drainingBatch(): DrainingBatch<PAGE> {
    return new DrainingBatch<PAGE>();
  }

  /**
   * Advances to the next page, atomically extracting it from the array.
   *
   * @param reuseBatch Batch object to reuse for the next page
   * @returns true if a page was found and the batch was updated, false if no more pages are available
   */
  public next(reuseBatch: DrainingBatch<PAGE>): boolean {
    let nextPageId = 0;
    let nextPage: PAGE | null = null;

    // Keep trying until we get a page or run out of pages
    while (nextPage === null) {
      // Atomically increment the counter and get the previous value
      nextPageId = Atomics.add(this.counter, 0, 1);

      // Check if we've gone past the end of the array
      if (nextPageId >= this.pages.length) {
        return false;
      }

      // Get the page at this index (might be null if another thread already took it)
      nextPage = this.pages[nextPageId];

      if (nextPage === null) {
        // This page was already taken by another thread, try again
        continue;
      }

      // Atomically clear the reference (drain the page)
      // This ensures no other thread will get this page
      this.pages[nextPageId] = null;
    }

    // Update the batch with the page we found
    reuseBatch.reset(nextPage, BigInt(nextPageId) * BigInt(this.pageSize));

    return true;
  }

  /**
   * Returns the total number of pages in this iterator
   */
  public size(): number {
    return this.pages.length;
  }

  /**
   * Returns the current position of the iterator
   */
  public position(): number {
    return Atomics.load(this.counter, 0);
  }
}

/**
 * A batch of data from a draining iterator, containing a page and its offset
 */
export class DrainingBatch<PAGE> {
  /**
   * The current page
   */
  public page: PAGE | null = null;

  /**
   * The offset of the current page
   */
  public offset: number = BigInt(0);

  /**
   * Resets this batch with a new page and offset
   */
  public reset(page: PAGE, offset: number): void {
    this.page = page;
    this.offset = offset;
  }
}

/**
 * Creates a draining iterator for processing arrays in parallel
 *
 * @param array Array to process
 * @param pageSize How many elements to include in each batch
 * @returns A draining iterator over the pages of the array
 */
export function createPagedDrainingIterator<T>(array: T[], pageSize: number = 1000): DrainingIterator<T[]> {
  // Calculate how many pages we need
  const numPages = Math.ceil(array.length / pageSize);

  // Create the pages
  const pages: T[][] = new Array(numPages);

  for (let i = 0; i < numPages; i++) {
    const start = i * pageSize;
    const end = Math.min(start + pageSize, array.length);
    pages[i] = array.slice(start, end);
  }

  // Create and return the iterator
  return new DrainingIterator<T[]>(pages, pageSize);
}
