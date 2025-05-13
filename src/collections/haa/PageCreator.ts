/**
 * Interface for creating and filling array pages of different primitive types.
 * This is used by the HugeAtomicArray implementations to create and initialize pages.
 */
export namespace PageCreator {
  /**
   * Base interface for all page creators
   */
  export interface PageCreatorBase<T> {
    /**
     * Create a typed array of the appropriate size
     */
    create(size: number): T;

    /**
     * Fill all pages in an array of pages
     * 
     * @param pages Array of typed array pages
     * @param lastPageSize Size of the last page
     * @param pageShift Bit shift value for page indexing (typically 16)
     */
    fill(pages: T[], lastPageSize: number, pageShift: number): void;

    /**
     * Fill a single page starting at the given base index
     * 
     * @param page The page to fill
     * @param base The base index for the page
     */
    fillPage(page: T, base: number): void;
  }

  /**
   * Interface for creating and filling byte array pages
   */
  export interface BytePageCreator extends PageCreatorBase<Uint8Array> {}

  /**
   * Interface for creating and filling int array pages
   */
  export interface IntPageCreator extends PageCreatorBase<Int32Array> {}

  /**
   * Interface for creating and filling long array pages
   */
  export interface LongPageCreator extends PageCreatorBase<BigInt64Array> {}

  /**
   * Interface for creating and filling double array pages
   */
  export interface DoublePageCreator extends PageCreatorBase<Float64Array> {}

  /**
   * Default implementation for byte arrays, using SharedArrayBuffer
   */
  export class DefaultBytePageCreator implements BytePageCreator {
    /**
     * Optional default value to initialize elements with
     */
    private defaultValue?: number;

    constructor(defaultValue?: number) {
      this.defaultValue = defaultValue;
    }

    create(size: number): Uint8Array {
      const buffer = new SharedArrayBuffer(size);
      const page = new Uint8Array(buffer);
      
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
      
      return page;
    }

    fill(pages: Uint8Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Uint8Array, base: number): void {
      // Default implementation just uses the default value if specified
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
    }
  }

  /**
   * Default implementation for int arrays, using SharedArrayBuffer
   */
  export class DefaultIntPageCreator implements IntPageCreator {
    private defaultValue?: number;

    constructor(defaultValue?: number) {
      this.defaultValue = defaultValue;
    }

    create(size: number): Int32Array {
      const buffer = new SharedArrayBuffer(size * 4); // 4 bytes per int
      const page = new Int32Array(buffer);
      
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
      
      return page;
    }

    fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Int32Array, base: number): void {
      // Default implementation just uses the default value if specified
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
    }
  }

  /**
   * Default implementation for long arrays, using SharedArrayBuffer
   */
  export class DefaultLongPageCreator implements LongPageCreator {
    private defaultValue?: number;

    constructor(defaultValue?: number) {
      this.defaultValue = defaultValue;
    }

    create(size: number): BigInt64Array {
      const buffer = new SharedArrayBuffer(size * 8); // 8 bytes per long
      const page = new BigInt64Array(buffer);
      
      if (this.defaultValue !== undefined) {
        const bigValue = BigInt(this.defaultValue);
        for (let i = 0; i < page.length; i++) {
          page[i] = bigValue;
        }
      }
      
      return page;
    }

    fill(pages: BigInt64Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: BigInt64Array, base: number): void {
      // Default implementation just uses the default value if specified
      if (this.defaultValue !== undefined) {
        const bigValue = BigInt(this.defaultValue);
        for (let i = 0; i < page.length; i++) {
          page[i] = bigValue;
        }
      }
    }
  }

  /**
   * Default implementation for double arrays, using SharedArrayBuffer
   */
  export class DefaultDoublePageCreator implements DoublePageCreator {
    private defaultValue?: number;

    constructor(defaultValue?: number) {
      this.defaultValue = defaultValue;
    }

    create(size: number): Float64Array {
      const buffer = new SharedArrayBuffer(size * 8); // 8 bytes per double
      const page = new Float64Array(buffer);
      
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
      
      return page;
    }

    fill(pages: Float64Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Float64Array, base: number): void {
      // Default implementation just uses the default value if specified
      if (this.defaultValue !== undefined) {
        page.fill(this.defaultValue);
      }
    }
  }

  /**
   * Factory for creating default page creators with optional default values
   */
  export class PageCreatorFactory {
    /**
     * Create a byte page creator with the specified default value
     */
    static createBytePageCreator(defaultValue?: number): BytePageCreator {
      return new DefaultBytePageCreator(defaultValue);
    }

    /**
     * Create an int page creator with the specified default value
     */
    static createIntPageCreator(defaultValue?: number): IntPageCreator {
      return new DefaultIntPageCreator(defaultValue);
    }

    /**
     * Create a long page creator with the specified default value
     */
    static createLongPageCreator(defaultValue?: number): LongPageCreator {
      return new DefaultLongPageCreator(defaultValue);
    }

    /**
     * Create a double page creator with the specified default value
     */
    static createDoublePageCreator(defaultValue?: number): DoublePageCreator {
      return new DefaultDoublePageCreator(defaultValue);
    }
  }

  /**
   * Custom implementation of BytePageCreator that fills pages with a sequence
   */
  export class SequenceBytePageCreator implements BytePageCreator {
    private readonly startValue: number;
    private readonly step: number;

    constructor(startValue: number = 0, step: number = 1) {
      this.startValue = startValue;
      this.step = step;
    }

    create(size: number): Uint8Array {
      const buffer = new SharedArrayBuffer(size);
      return new Uint8Array(buffer);
    }

    fill(pages: Uint8Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Uint8Array, base: number): void {
      for (let i = 0; i < page.length; i++) {
        page[i] = (this.startValue + (base + i) * this.step) & 0xFF;
      }
    }
  }

  /**
   * Custom implementation of IntPageCreator that fills pages with a sequence
   */
  export class SequenceIntPageCreator implements IntPageCreator {
    private readonly startValue: number;
    private readonly step: number;

    constructor(startValue: number = 0, step: number = 1) {
      this.startValue = startValue;
      this.step = step;
    }

    create(size: number): Int32Array {
      const buffer = new SharedArrayBuffer(size * 4);
      return new Int32Array(buffer);
    }

    fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Int32Array, base: number): void {
      for (let i = 0; i < page.length; i++) {
        page[i] = this.startValue + (base + i) * this.step;
      }
    }
  }

  /**
   * Custom implementation of LongPageCreator that fills pages with a sequence
   */
  export class SequenceLongPageCreator implements LongPageCreator {
    private readonly startValue: number;
    private readonly step: number;

    constructor(startValue: number = 0, step: number = 1) {
      this.startValue = startValue;
      this.step = step;
    }

    create(size: number): BigInt64Array {
      const buffer = new SharedArrayBuffer(size * 8);
      return new BigInt64Array(buffer);
    }

    fill(pages: BigInt64Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: BigInt64Array, base: number): void {
      for (let i = 0; i < page.length; i++) {
        page[i] = BigInt(this.startValue + (base + i) * this.step);
      }
    }
  }

  /**
   * Custom implementation of DoublePageCreator that fills pages with a sequence
   */
  export class SequenceDoublePageCreator implements DoublePageCreator {
    private readonly startValue: number;
    private readonly step: number;

    constructor(startValue: number = 0, step: number = 1) {
      this.startValue = startValue;
      this.step = step;
    }

    create(size: number): Float64Array {
      const buffer = new SharedArrayBuffer(size * 8);
      return new Float64Array(buffer);
    }

    fill(pages: Float64Array[], lastPageSize: number, pageShift: number): void {
      const pageSize = 1 << pageShift;
      
      for (let i = 0; i < pages.length - 1; i++) {
        this.fillPage(pages[i], i * pageSize);
      }
      
      // Handle last page separately
      if (lastPageSize > 0 && pages.length > 0) {
        const lastPageIndex = pages.length - 1;
        this.fillPage(pages[lastPageIndex], lastPageIndex * pageSize);
      }
    }

    fillPage(page: Float64Array, base: number): void {
      for (let i = 0; i < page.length; i++) {
        page[i] = this.startValue + (base + i) * this.step;
      }
    }
  }
}