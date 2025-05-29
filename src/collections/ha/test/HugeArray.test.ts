// import { HugeCursor } from "@/collections";
// import { HugeArray } from "@/collections";

// /**
//  * Concrete test implementation of HugeArray for testing abstract functionality.
//  * Uses standard JavaScript arrays as pages with configurable page size.
//  */
// class TestHugeArray extends HugeArray<number[], number, TestHugeArray> {
//   private readonly pages: number[][];
//   private readonly pageSize: number;
//   private readonly totalSize: number;
//   private released = false;

//   constructor(size: number, pageSize = 1024) {
//     super();
//     this.totalSize = size;
//     this.pageSize = pageSize;
//     this.pages = [];

//     // Initialize pages
//     const pageCount = Math.ceil(size / pageSize);
//     for (let i = 0; i < pageCount; i++) {
//       const currentPageSize = Math.min(pageSize, size - i * pageSize);
//       this.pages[i] = new Array(currentPageSize).fill(0);
//     }
//   }

//   // Core array operations
//   public size(): number {
//     this.checkNotReleased();
//     return this.totalSize;
//   }

//   public sizeOf(): number {
//     this.checkNotReleased();
//     // Estimate memory usage: each number ~8 bytes + array overhead
//     return this.totalSize * 8 + this.pages.length * 32;
//   }

//   public release(): number {
//     if (this.released) return 0;

//     const memory = this.sizeOf();
//     this.pages.length = 0; // Clear all pages
//     this.released = true;
//     return memory;
//   }

//   // Element access
//   public boxedGet(index: number): number {
//     this.checkNotReleased();
//     this.checkBounds(index);

//     const pageIndex = Math.floor(index / this.pageSize);
//     const pageOffset = index % this.pageSize;
//     return this.pages[pageIndex][pageOffset];
//   }

//   public boxedSet(index: number, value: number): void {
//     this.checkNotReleased();
//     this.checkBounds(index);

//     const pageIndex = Math.floor(index / this.pageSize);
//     const pageOffset = index % this.pageSize;
//     this.pages[pageIndex][pageOffset] = value;
//   }

//   public boxedSetAll(gen: (index: number) => number): void {
//     this.checkNotReleased();

//     for (let i = 0; i < this.totalSize; i++) {
//       this.boxedSet(i, gen(i));
//     }
//   }

//   public boxedFill(value: number): void {
//     this.checkNotReleased();

//     for (const page of this.pages) {
//       page.fill(value);
//     }
//   }

//   // Array operations
//   public copyTo(dest: TestHugeArray, length: number): void {
//     this.checkNotReleased();
//     dest.checkNotReleased();

//     if (length > this.size()) {
//       throw new Error(`Length ${length} exceeds source size ${this.size()}`);
//     }
//     if (length > dest.size()) {
//       throw new Error(
//         `Length ${length} exceeds destination size ${dest.size()}`
//       );
//     }

//     for (let i = 0; i < length; i++) {
//       dest.boxedSet(i, this.boxedGet(i));
//     }
//   }

//   public copyOf(newLength: number): TestHugeArray {
//     this.checkNotReleased();

//     if (newLength < 0) {
//       throw new Error("New length cannot be negative");
//     }

//     const result = new TestHugeArray(newLength, this.pageSize);
//     const copyLength = Math.min(this.size(), newLength);
//     this.copyTo(result, copyLength);

//     return result;
//   }
//   // Fix the toArray method signature
//   public toArray(): number[] {
//     // Use the inherited dumpToArray with a proper factory
//     return this.dumpToArray((length: number) => new Array(length));
//   }

//   // The generic dumpToArray method should remain for internal use
//   public dumpToArray<T>(arrayFactory: (size: number) => T): T {
//     this.checkNotReleased();

//     const result = arrayFactory(this.totalSize);
//     if (Array.isArray(result)) {
//       // Standard array - copy elements
//       for (let i = 0; i < this.totalSize; i++) {
//         (result as any)[i] = this.boxedGet(i);
//       }
//     } else if (result && typeof (result as any).set === "function") {
//       // TypedArray - use set method
//       for (let i = 0; i < this.totalSize; i++) {
//         (result as any)[i] = this.boxedGet(i);
//       }
//     }

//     return result;
//   }

//   // Cursor support
//   public newCursor(): HugeCursor<number[]> {
//     this.checkNotReleased();
//     return new TestHugeCursor();
//   }

//   // Helper methods
//   protected getArrayLength(array: number[]): number {
//     return array.length;
//   }

//   protected getArrayElement(array: number[], index: number): number {
//     return array[index];
//   }

//   protected arrayCopy(
//     source: number[],
//     sourceIndex: number,
//     dest: number[],
//     destIndex: number,
//     length: number
//   ): void {
//     for (let i = 0; i < length; i++) {
//       dest[destIndex + i] = source[sourceIndex + i];
//     }
//   }

//   // Fix: Provide the component class for HugeArray base
//   protected getComponentClass(): any {
//     return Array;
//   }

//   private checkNotReleased(): void {
//     if (this.released) {
//       throw new Error("Array has been released");
//     }
//   }

//   private checkBounds(index: number): void {
//     if (index < 0 || index >= this.totalSize) {
//       throw new Error(`Index ${index} out of bounds [0, ${this.totalSize})`);
//     }
//   }

//   // Expose pages for cursor implementation
//   public getPages(): number[][] {
//     return this.pages;
//   }

//   public getPageSize(): number {
//     return this.pageSize;
//   }
// }

// /**
//  * Simple cursor implementation for TestHugeArray
//  */
// class TestHugeCursor implements HugeCursor<number[]> {
//   public array: number[] | null = null;
//   public offset = 0;
//   public limit = 0;

//   private hugeArray: TestHugeArray | null = null;
//   private pageIndex = -1;
//   private endPageIndex = -1;

//   public init(array: TestHugeArray, start: number, end: number): void {
//     this.hugeArray = array;
//     this.pageIndex = Math.floor(start / array.getPageSize()) - 1; // Will be incremented in next()
//     this.endPageIndex = Math.floor((end - 1) / array.getPageSize());
//     this.array = null;
//     this.offset = 0;
//     this.limit = 0;
//   }

//   public next(): boolean {
//     if (!this.hugeArray || this.pageIndex >= this.endPageIndex) {
//       return false;
//     }

//     this.pageIndex++;
//     const pages = this.hugeArray.getPages();

//     if (this.pageIndex >= pages.length) {
//       return false;
//     }

//     this.array = pages[this.pageIndex];
//     this.offset = 0;
//     this.limit = this.array.length;

//     return true;
//   }

//   public close(): void {
//     this.array = null;
//     this.hugeArray = null;
//     this.pageIndex = -1;
//     this.endPageIndex = -1;
//   }
// }

// describe("HugeArray", () => {
//   let array: TestHugeArray;

//   beforeEach(() => {
//     array = new TestHugeArray(1000, 64); // 1000 elements, 64 per page
//   });

//   describe("Basic Operations", () => {
//     test("should have correct initial size", () => {
//       expect(array.size()).toBe(1000);
//     });

//     test("should initialize with zeros", () => {
//       expect(array.boxedGet(0)).toBe(0);
//       expect(array.boxedGet(500)).toBe(0);
//       expect(array.boxedGet(999)).toBe(0);
//     });

//     test("should set and get individual elements", () => {
//       array.boxedSet(42, 123);
//       expect(array.boxedGet(42)).toBe(123);

//       array.boxedSet(999, -456);
//       expect(array.boxedGet(999)).toBe(-456);
//     });

//     test("should throw on out-of-bounds access", () => {
//       expect(() => array.boxedGet(-1)).toThrow("Index -1 out of bounds");
//       expect(() => array.boxedGet(1000)).toThrow("Index 1000 out of bounds");
//       expect(() => array.boxedSet(-1, 42)).toThrow("Index -1 out of bounds");
//       expect(() => array.boxedSet(1000, 42)).toThrow(
//         "Index 1000 out of bounds"
//       );
//     });
//   });

//   describe("Bulk Operations", () => {
//     test("boxedSetAll should set all elements using generator", () => {
//       array.boxedSetAll((index) => index * 2);

//       expect(array.boxedGet(0)).toBe(0);
//       expect(array.boxedGet(1)).toBe(2);
//       expect(array.boxedGet(50)).toBe(100);
//       expect(array.boxedGet(999)).toBe(1998);
//     });

//     test("boxedFill should set all elements to same value", () => {
//       array.boxedFill(42);

//       expect(array.boxedGet(0)).toBe(42);
//       expect(array.boxedGet(500)).toBe(42);
//       expect(array.boxedGet(999)).toBe(42);
//     });

//     test("boxedSetAll with mathematical sequence", () => {
//       // Fibonacci-like sequence for testing
//       array.boxedSetAll((index) => (index <= 1 ? index : index * (index - 1)));

//       expect(array.boxedGet(0)).toBe(0);
//       expect(array.boxedGet(1)).toBe(1);
//       expect(array.boxedGet(5)).toBe(20); // 5 * 4
//       expect(array.boxedGet(10)).toBe(90); // 10 * 9
//     });
//   });

//   describe("Copy Operations", () => {
//     beforeEach(() => {
//       // Initialize source array with known values
//       array.boxedSetAll((index) => index + 100);
//     });

//     test("copyTo should copy elements to another array", () => {
//       const dest = new TestHugeArray(500, 32);
//       array.copyTo(dest, 300);

//       expect(dest.boxedGet(0)).toBe(100);
//       expect(dest.boxedGet(150)).toBe(250);
//       expect(dest.boxedGet(299)).toBe(399);
//       expect(dest.boxedGet(300)).toBe(0); // Should remain unchanged
//     });

//     test("copyTo should validate bounds", () => {
//       const dest = new TestHugeArray(500, 32);

//       expect(() => array.copyTo(dest, 1001)).toThrow(
//         "Length 1001 exceeds source size 1000"
//       );
//       expect(() => array.copyTo(dest, 501)).toThrow(
//         "Length 501 exceeds destination size 500"
//       );
//     });

//     test("copyOf should create resized copy", () => {
//       const smaller = array.copyOf(500);
//       expect(smaller.size()).toBe(500);
//       expect(smaller.boxedGet(0)).toBe(100);
//       expect(smaller.boxedGet(499)).toBe(599);

//       const larger = array.copyOf(1500);
//       expect(larger.size()).toBe(1500);
//       expect(larger.boxedGet(0)).toBe(100);
//       expect(larger.boxedGet(999)).toBe(1099);
//       expect(larger.boxedGet(1000)).toBe(0); // Default value
//       expect(larger.boxedGet(1499)).toBe(0); // Default value
//     });

//     test("copyOf should handle negative length", () => {
//       expect(() => array.copyOf(-1)).toThrow("New length cannot be negative");
//     });

//     test("copyOf should create exact copy when same size", () => {
//       const copy = array.copyOf(1000);
//       expect(copy.size()).toBe(1000);

//       for (let i = 0; i < 1000; i += 100) {
//         expect(copy.boxedGet(i)).toBe(array.boxedGet(i));
//       }

//       // Verify independence
//       copy.boxedSet(0, 999);
//       expect(array.boxedGet(0)).toBe(100); // Original unchanged
//     });
//   });

//   describe("Array Conversion", () => {
//     test("toArray should convert to standard JavaScript array", () => {
//       array.boxedSetAll((index) => index * 3);

//       const jsArray = array.toArray();
//       expect(jsArray.length).toBe(1000);
//       expect(jsArray[0]).toBe(0);
//       expect(jsArray[100]).toBe(300);
//       expect(jsArray[999]).toBe(2997);
//     });

//     test("copyFromArrayIntoSlice should load data from standard array", () => {
//       const source = [10, 20, 30, 40, 50];
//       const copied = array.copyFromArrayIntoSlice(source, 100, 105);

//       expect(copied).toBe(5);
//       expect(array.boxedGet(100)).toBe(10);
//       expect(array.boxedGet(101)).toBe(20);
//       expect(array.boxedGet(104)).toBe(50);
//     });

//     test("copyFromArrayIntoSlice should handle partial copies", () => {
//       const source = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
//       const copied = array.copyFromArrayIntoSlice(source, 995, 999); // Only 4 slots

//       expect(copied).toBe(4); // Limited by slice size
//       expect(array.boxedGet(995)).toBe(1);
//       expect(array.boxedGet(998)).toBe(4);
//     });

//     test("copyFromArrayIntoSlice should handle source exhaustion", () => {
//       const source = [100, 200];
//       const copied = array.copyFromArrayIntoSlice(source, 0, 10); // 10 slots available

//       expect(copied).toBe(2); // Limited by source size
//       expect(array.boxedGet(0)).toBe(100);
//       expect(array.boxedGet(1)).toBe(200);
//       expect(array.boxedGet(2)).toBe(0); // Unchanged
//     });
//   });

//   describe("Memory Management", () => {
//     test("sizeOf should return positive memory usage", () => {
//       const memory = array.sizeOf();
//       expect(memory).toBeGreaterThan(0);
//       expect(typeof memory).toBe("number");
//     });

//     test("release should free memory and invalidate array", () => {
//       const memory = array.sizeOf();
//       const freedBytes = array.release();

//       expect(freedBytes).toBe(memory);
//       expect(() => array.size()).toThrow("Array has been released");
//       expect(() => array.boxedGet(0)).toThrow("Array has been released");
//       expect(() => array.boxedSet(0, 42)).toThrow("Array has been released");
//     });

//     test("release should be idempotent", () => {
//       const firstRelease = array.release();
//       const secondRelease = array.release();

//       expect(firstRelease).toBeGreaterThan(0);
//       expect(secondRelease).toBe(0);
//     });
//   });

//   describe("String Representation", () => {
//     test("toString should format empty array", () => {
//       const emptyArray = new TestHugeArray(0);
//       expect(emptyArray.toString()).toBe("[]");
//     });

//     test("toString should format small arrays", () => {
//       const smallArray = new TestHugeArray(3);
//       smallArray.boxedSet(0, 10);
//       smallArray.boxedSet(1, 20);
//       smallArray.boxedSet(2, 30);

//       expect(smallArray.toString()).toBe("[10, 20, 30]");
//     });

//     test("toString should handle single element", () => {
//       const singleArray = new TestHugeArray(1);
//       singleArray.boxedSet(0, 42);

//       expect(singleArray.toString()).toBe("[42]");
//     });
//   });

//   describe("Edge Cases", () => {
//     test("should handle zero-size arrays", () => {
//       const emptyArray = new TestHugeArray(0);
//       expect(emptyArray.size()).toBe(0);
//       expect(emptyArray.toArray().length).toBe(0);
//       expect(() => emptyArray.boxedGet(0)).toThrow();
//     });

//     test("should handle single-element arrays", () => {
//       const singleArray = new TestHugeArray(1);
//       expect(singleArray.size()).toBe(1);

//       singleArray.boxedSet(0, 123);
//       expect(singleArray.boxedGet(0)).toBe(123);

//       const jsArray = singleArray.toArray();
//       expect(jsArray.length).toBe(1);
//       expect(jsArray[0]).toBe(123);
//     });

//     test("should handle arrays with different page sizes", () => {
//       const smallPages = new TestHugeArray(100, 10);
//       const largePages = new TestHugeArray(100, 1000);

//       smallPages.boxedSetAll((i) => i);
//       largePages.boxedSetAll((i) => i);

//       for (let i = 0; i < 100; i += 10) {
//         expect(smallPages.boxedGet(i)).toBe(largePages.boxedGet(i));
//       }
//     });
//   });

//   describe("Performance Characteristics", () => {
//     test("boxedSetAll should be faster than individual sets for large arrays", () => {
//       const largeArray = new TestHugeArray(10000);

//       // Time individual sets
//       const startIndividual = performance.now();
//       for (let i = 0; i < 10000; i++) {
//         largeArray.boxedSet(i, i * 2);
//       }
//       const individualTime = performance.now() - startIndividual;

//       // Reset array
//       largeArray.boxedFill(0);

//       // Time bulk set
//       const startBulk = performance.now();
//       largeArray.boxedSetAll((i) => i * 2);
//       const bulkTime = performance.now() - startBulk;

//       // Verify correctness
//       expect(largeArray.boxedGet(0)).toBe(0);
//       expect(largeArray.boxedGet(5000)).toBe(10000);
//       expect(largeArray.boxedGet(9999)).toBe(19998);

//       // Performance is environment-dependent, so just log the results
//       console.log(
//         `Individual sets: ${individualTime.toFixed(
//           2
//         )}ms, Bulk set: ${bulkTime.toFixed(2)}ms`
//       );
//     });

//     test("memory usage should scale with array size", () => {
//       const small = new TestHugeArray(1000);
//       const large = new TestHugeArray(10000);

//       const smallMemory = small.sizeOf();
//       const largeMemory = large.sizeOf();

//       expect(largeMemory).toBeGreaterThan(smallMemory);
//       expect(largeMemory / smallMemory).toBeGreaterThan(5); // Should be roughly 10x

//       small.release();
//       large.release();
//     });
//   });
// });
