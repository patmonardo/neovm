import { PageUtil } from '../../../collections/PageUtil';
import { BitUtil } from '../../../mem/BitUtil';
import { Estimate } from '../../../mem/Estimate';

/**
 * Allocator for pages of a specific type.
 * Provides memory-efficient allocation of fixed-size pages.
 */
export abstract class PageAllocator<T> {
  /**
   * Creates a new page.
   * 
   * @returns A new page instance
   */
  public abstract newPage(): T;

  /**
   * Returns the size of each page in elements.
   * 
   * @returns The page size
   */
  public abstract pageSize(): number;

  /**
   * Returns an empty array of pages.
   * 
   * @returns Empty pages array
   */
  public abstract emptyPages(): T[];

  /**
   * Returns the number of bytes per page.
   * 
   * @returns Bytes per page
   */
  public abstract bytesPerPage(): number;

  /**
   * Estimates the memory usage for a given number of elements.
   * 
   * @param size Number of elements
   * @returns Estimated bytes
   */
  public estimateMemoryUsage(size: number): number {
    const numPages = PageUtil.numPagesFor(size, this.pageSize());
    return numPages * this.bytesPerPage();
  }

  /**
   * Creates a factory for allocating pages of type T.
   * 
   * @param pageSize Size of each page in elements
   * @param bytesPerPage Number of bytes per page
   * @param newPage Factory function to create new pages
   * @param emptyPages Empty array of pages
   * @returns A new factory
   */
  public static of<T>(
    pageSize: number,
    bytesPerPage: number,
    newPage: PageFactory<T>,
    emptyPages: T[]
  ): Factory<T> {
    return new Factory<T>(pageSize, bytesPerPage, newPage, emptyPages);
  }

  /**
   * Creates a factory for allocating pages of arrays.
   * 
   * @param elementType The element type information
   * @returns A new factory
   */
  public static ofArray<T extends TypedArray>(elementType: ArrayType<T>): Factory<T> {
    const bytesPerElement = elementType.BYTES_PER_ELEMENT;
    const pageSize = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, bytesPerElement);
    const bytesPerPage = pageSize * bytesPerElement;
    
    const emptyPages: T[] = [];
    const newPage = () => new elementType.constructor(pageSize) as T;
    
    return this.of(pageSize, bytesPerPage, newPage, emptyPages);
  }
}

/**
 * Factory function to create new pages.
 */
export interface PageFactory<T> {
  (): T;
}

/**
 * Factory for creating page allocators.
 */
export class Factory<T> {
  private readonly pageSize: number;
  private readonly bytesPerPage: number;
  private readonly newPage: PageFactory<T>;
  private readonly emptyPages: T[];

  /**
   * Creates a new factory.
   * 
   * @param pageSize Size of each page in elements
   * @param bytesPerPage Number of bytes per page
   * @param newPage Factory function to create new pages
   * @param emptyPages Empty array of pages
   */
  constructor(
    pageSize: number,
    bytesPerPage: number,
    newPage: PageFactory<T>,
    emptyPages: T[]
  ) {
    this.pageSize = pageSize;
    this.bytesPerPage = bytesPerPage;
    this.newPage = newPage;
    this.emptyPages = emptyPages;
  }

  /**
   * Creates a new allocator.
   * 
   * @returns A new page allocator
   */
  public newAllocator(): PageAllocator<T> {
    return new DirectAllocator<T>(
      this.newPage,
      this.emptyPages,
      this.pageSize,
      this.bytesPerPage
    );
  }
}

/**
 * Direct implementation of PageAllocator.
 */
class DirectAllocator<T> extends PageAllocator<T> {
  private readonly newPageFn: PageFactory<T>;
  private readonly emptyPagesArr: T[];
  private readonly pageSizeVal: number;
  private readonly bytesPerPageVal: number;

  /**
   * Creates a new direct allocator.
   * 
   * @param newPageFn Factory function to create new pages
   * @param emptyPagesArr Empty array of pages
   * @param pageSizeVal Size of each page in elements
   * @param bytesPerPageVal Number of bytes per page
   */
  constructor(
    newPageFn: PageFactory<T>,
    emptyPagesArr: T[],
    pageSizeVal: number,
    bytesPerPageVal: number
  ) {
    super();
    console.assert(BitUtil.isPowerOfTwo(pageSizeVal), "Page size must be a power of two");
    this.newPageFn = newPageFn;
    this.emptyPagesArr = emptyPagesArr;
    this.pageSizeVal = pageSizeVal;
    this.bytesPerPageVal = bytesPerPageVal;
  }

  public newPage(): T {
    return this.newPageFn();
  }

  public pageSize(): number {
    return this.pageSizeVal;
  }

  public bytesPerPage(): number {
    return this.bytesPerPageVal;
  }

  public emptyPages(): T[] {
    return this.emptyPagesArr;
  }
}

/**
 * Type representing typed arrays in JavaScript.
 */
export type TypedArray = 
  | Int8Array 
  | Uint8Array 
  | Uint8ClampedArray 
  | Int16Array 
  | Uint16Array 
  | Int32Array 
  | Uint32Array 
  | Float32Array 
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Type information for creating typed arrays.
 */
export interface ArrayType<T extends TypedArray> {
  BYTES_PER_ELEMENT: number;
  constructor: { new(length: number): T };
}