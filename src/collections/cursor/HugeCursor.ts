import { HugeArrays } from '../HugeArrays';
import { PageUtil } from '../PageUtil';

/**
 * View of data underlying a Huge array, accessible as slices of one or more arrays.
 * The values are from array[offset] (inclusive) until array[limit] (exclusive).
 * The range might match the complete array, but that isn't guaranteed.
 * 
 * The limit parameter does not have the same meaning as the length parameter that is used 
 * in many methods that can operate on array slices.
 * The proper value would be: length = limit - offset.
 */
export abstract class HugeCursor<Array> {
  /**
   * The base for the index to get the global index
   */
  public base: number = 0;
  
  /**
   * A slice of values currently being traversed
   */
  public array: Array | null = null;
  
  /**
   * The offset into the array
   */
  public offset: number = 0;
  
  /**
   * The limit of the array, exclusive – the first index not to be contained
   */
  public limit: number = 0;
  
  constructor() {}
  
  /**
   * Try to load the next page and return the success of this load.
   * Once the method returns false, this method will never return true again until the cursor is reset.
   * The cursor behavior is not defined and might be unusable and throw exceptions after this method returns false.
   *
   * @return true if the cursor is still valid and contains new data; false if there is no more data.
   */
  public abstract next(): boolean;
  
  /**
   * Releases the reference to the underlying array so that it might be garbage collected.
   * The cursor can never be used again after calling this method, doing so results in undefined behavior.
   */
  public abstract close(): void;
  
  /**
   * Initializes cursor from 0 to capacity
   */
  abstract setRange(): void;
  
  /**
   * Initializes cursor from start to end
   */
  public abstract setRange(start: number, end: number): void;
  
  /**
   * Get the length of an array
   */
  protected static getLength(array: any): number {
    if (Array.isArray(array)) {
      return array.length;
    } else if (ArrayBuffer.isView(array)) {
      return (array as any).length;
    }
    return 0;
  }
}

/**
 * Cursor implementation for a single page
 */
export class SinglePageCursor<Array> extends HugeCursor<Array> {
  private exhausted: boolean = false;
  
  constructor(page: Array) {
    super();
    this.array = page;
    this.base = 0;
  }
  
  setRange(): void {
    this.setRange(0, HugeCursor.getLength(this.array));
  }
  
  public setRange(start: number, end: number): void {
    this.exhausted = false;
    this.offset = start;
    this.limit = end;
  }
  
  public next(): boolean {
    if (this.exhausted) {
      return false;
    }
    this.exhausted = true;
    return true;
  }
  
  public close(): void {
    this.array = null;
    this.limit = 0;
    this.exhausted = true;
  }
}

/**
 * Cursor implementation for multiple pages
 */
export class PagedCursor<Array> extends HugeCursor<Array> {
  private pages: Array[] | null = null;
  private pageIndex: number = 0;
  private fromPage: number = 0;
  private maxPage: number = 0;
  private capacity: number = 0;
  private end: number = 0;
  
  constructor(pages: Array[]);
  constructor(capacity: number, pages: Array[]);
  constructor(pagesOrCapacity: Array[] | number, pages?: Array[]) {
    super();
    
    if (Array.isArray(pagesOrCapacity)) {
      this.setPages(pagesOrCapacity);
    } else if (pages) {
      this.setPages(pages, pagesOrCapacity);
    }
  }
  
  public setPages(pages: Array[]): void {
    this.setPages(pages, PageUtil.capacityFor(pages.length, HugeArrays.PAGE_SHIFT));
  }
  
  public setPages(pages: Array[], capacity: number): void {
    this.capacity = capacity;
    this.pages = pages;
  }
  
  setRange(): void {
    this.setRange(0, this.capacity);
  }
  
  public setRange(start: number, end: number): void {
    this.fromPage = HugeArrays.pageIndex(start);
    this.maxPage = HugeArrays.pageIndex(end - 1);
    this.pageIndex = this.fromPage - 1;
    this.end = end;
    this.base = this.fromPage << HugeArrays.PAGE_SHIFT;
    this.offset = HugeArrays.indexInPage(start);
    this.limit = this.fromPage === this.maxPage ? 
      HugeArrays.exclusiveIndexOfPage(end) : 
      HugeArrays.PAGE_SIZE;
  }
  
  public next(): boolean {
    const current = ++this.pageIndex;
    if (current > this.maxPage || !this.pages) {
      return false;
    }
    
    this.array = this.pages[current];
    if (current === this.fromPage) {
      return true;
    }
    
    this.base += HugeArrays.PAGE_SIZE;
    this.offset = 0;
    this.limit = current === this.maxPage ? 
      HugeArrays.exclusiveIndexOfPage(this.end) : 
      HugeCursor.getLength(this.array);
    
    return true;
  }
  
  public close(): void {
    this.array = null;
    this.pages = null;
    this.base = 0;
    this.end = 0;
    this.limit = 0;
    this.capacity = 0;
    this.maxPage = -1;
    this.fromPage = -1;
    this.pageIndex = -1;
  }
}