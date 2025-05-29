import { HugeArrays } from '@/mem/HugeArrays';
import { Estimate } from '@/mem/Estimate';
import { HugeCursor, SinglePageCursor, PagedCursor } from '@/collections';
import { HugeArray } from './HugeArray';

/**
 * A number-indexable version of an object array that can contain more than 2 billion elements.
 *
 * This is the **generic object storage variant** of HugeArray designed for storing arbitrary
 * TypeScript objects efficiently while supporting massive datasets that exceed standard
 * JavaScript array limitations. It provides type-safe storage for complex data structures,
 * graph nodes, edges, and any custom objects used in graph analytics.
 *
 * **Design Philosophy:**
 * It is implemented by paging of smaller object arrays (`T[][]`) to support approximately
 * 32,000 billion elements. If the provided size is small enough, an optimized view of a single
 * `T[]` might be used for maximum performance.
 *
 * **Key Characteristics:**
 *
 * **1. Fixed Size Architecture:**
 * - The array is of a **fixed size** and cannot grow or shrink dynamically
 * - Size is determined at creation time and remains constant throughout lifecycle
 * - This enables optimal memory layout and performance optimization for object storage
 *
 * **2. Dense Storage Optimization:**
 * - Not optimized for sparseness and has memory overhead if many elements are null
 * - For sparse object data, consider using `Map` or sparse data structures
 * - Every element position reserves space for an object reference
 *
 * **3. Null Default Values:**
 * - Does not support custom default values
 * - Returns `null` for unset values, same as regular TypeScript arrays
 * - All elements are automatically initialized to `null` when the array is created
 *
 * **Generic Type Safety:**
 *
 * **TypeScript Integration:**
 * The implementation provides full TypeScript type safety:
 * - **Generic constraints**: Type parameter `T` ensures type safety at compile time
 * - **Null safety**: Explicit handling of nullable object references
 * - **Interface compliance**: Maintains compatibility with TypeScript object patterns
 * - **Memory management**: Proper cleanup of object references to avoid memory leaks
 *
 * **Performance Characteristics:**
 *
 * **Object Storage Operations:**
 * ```
 * Object Reference Management:
 * - Storage: Stores object references, not object copies
 * - Access: O(1) reference lookup for both single and paged implementations
 * - Memory: Object overhead + reference storage overhead
 * - GC impact: Proper reference management for garbage collection
 *
 * Memory Layout:
 * - Single array: Direct reference array, optimal for < 2^31 elements
 * - Paged array: Page-based reference lookup for larger datasets
 * - Reference density: 8 bytes per reference + object memory
 * ```
 *
 * **Common Use Cases in Graph Analytics:**
 *
 * **Graph Node Storage:**
 * ```typescript
 * interface GraphNode {
 *   id: number;
 *   label: string;
 *   properties: Record<string, any>;
 *   neighbors: number[];
 * }
 *
 * // Store millions of graph nodes efficiently
 * const nodeArray = HugeObjectArray.newArray<GraphNode>(nodeCount);
 * nodeArray.setAll(nodeId => loadGraphNode(nodeId));
 *
 * // Fast random access to node data
 * const node = nodeArray.get(nodeId);
 * const neighborCount = node?.neighbors.length ?? 0;
 * ```
 *
 * **Edge Relationship Storage:**
 * ```typescript
 * interface WeightedEdge {
 *   source: number;
 *   target: number;
 *   weight: number;
 *   properties: Map<string, any>;
 * }
 *
 * // Store complex edge relationships
 * const edgeArray = HugeObjectArray.newArray<WeightedEdge>(edgeCount);
 *
 * // Lazy loading with putIfAbsent
 * const edge = edgeArray.putIfAbsent(edgeId, () => computeEdgeData(edgeId));
 * ```
 *
 * **Algorithm State Objects:**
 * ```typescript
 * interface AlgorithmState {
 *   distance: number;
 *   predecessor: number | null;
 *   visited: boolean;
 *   metadata: Record<string, any>;
 * }
 *
 * // Store complex algorithm state per node
 * const stateArray = HugeObjectArray.newArray<AlgorithmState>(nodeCount);
 * stateArray.fill({
 *   distance: Number.POSITIVE_INFINITY,
 *   predecessor: null,
 *   visited: false,
 *   metadata: {}
 * });
 *
 * // Update state during algorithm execution
 * const currentState = stateArray.get(nodeId);
 * if (currentState && newDistance < currentState.distance) {
 *   stateArray.set(nodeId, {
 *     ...currentState,
 *     distance: newDistance,
 *     predecessor: sourceNode
 *   });
 * }
 * ```
 *
 * **Complex Data Structures:**
 * ```typescript
 * interface CommunityInfo {
 *   communityId: number;
 *   members: Set<number>;
 *   centralityScores: Map<number, number>;
 *   subgraphData: any;
 * }
 *
 * // Store rich community detection results
 * const communityArray = HugeObjectArray.newArray<CommunityInfo>(communityCount);
 *
 * // Efficient updates with getOrDefault
 * const defaultCommunity: CommunityInfo = {
 *   communityId: -1,
 *   members: new Set(),
 *   centralityScores: new Map(),
 *   subgraphData: null
 * };
 *
 * const community = communityArray.getOrDefault(communityId, defaultCommunity);
 * ```
 *
 * **Performance Optimization Strategies:**
 *
 * **Memory-Efficient Object Processing:**
 * ```typescript
 * // Process large object arrays with minimal memory overhead
 * const cursor = objectArray.newCursor();
 * try {
 *   objectArray.initCursor(cursor);
 *   while (cursor.next()) {
 *     const page = cursor.array!;
 *
 *     // Process objects in batches for better cache performance
 *     for (let i = cursor.offset; i < cursor.limit; i++) {
 *       const obj = page[i];
 *       const globalIndex = cursor.base + i;
 *
 *       if (obj !== null) {
 *         processObject(globalIndex, obj);
 *       }
 *     }
 *   }
 * } finally {
 *   cursor.close();
 * }
 * ```
 *
 * **Lazy Initialization Patterns:**
 * ```typescript
 * // Use putIfAbsent for lazy object creation
 * function getOrCreateNode(nodeId: number): GraphNode {
 *   return nodeArray.putIfAbsent(nodeId, () => ({
 *     id: nodeId,
 *     label: loadNodeLabel(nodeId),
 *     properties: loadNodeProperties(nodeId),
 *     neighbors: loadNodeNeighbors(nodeId)
 *   }));
 * }
 *
 * // Only create objects when actually needed
 * const node = getOrCreateNode(randomNodeId);
 * ```
 *
 * **Bulk Object Operations:**
 * ```typescript
 * // Efficient bulk initialization
 * objectArray.setAll(index => {
 *   if (shouldCreateObject(index)) {
 *     return createObjectForIndex(index);
 *   }
 *   return null; // Sparse initialization
 * });
 *
 * // Conditional bulk updates
 * const cursor = objectArray.newCursor();
 * objectArray.initCursor(cursor);
 * while (cursor.next()) {
 *   const page = cursor.array!;
 *   for (let i = cursor.offset; i < cursor.limit; i++) {
 *     const obj = page[i];
 *     if (obj && shouldUpdateObject(obj)) {
 *       page[i] = updateObject(obj);
 *     }
 *   }
 * }
 * ```
 *
 * **Memory Management Best Practices:**
 *
 * **Reference Cleanup:**
 * ```typescript
 * // Proper cleanup to avoid memory leaks
 * function cleanupObjectArray<T>(array: HugeObjectArray<T>): number {
 *   // Clear all references before releasing array
 *   array.fill(null);
 *
 *   // Release the array structure itself
 *   return array.release();
 * }
 * ```
 *
 * **Selective Object Removal:**
 * ```typescript
 * // Remove objects based on criteria without full array reconstruction
 * const cursor = objectArray.newCursor();
 * objectArray.initCursor(cursor);
 * while (cursor.next()) {
 *   const page = cursor.array!;
 *   for (let i = cursor.offset; i < cursor.limit; i++) {
 *     const obj = page[i];
 *     if (obj && shouldRemoveObject(obj)) {
 *       page[i] = null; // Clear reference for GC
 *     }
 *   }
 * }
 * ```
 *
 * **Apache Arrow Integration Readiness:**
 * While Apache Arrow focuses on primitive types, object arrays can integrate through:
 * - **Serialization**: Convert objects to/from Arrow-compatible formats
 * - **Reference arrays**: Store object IDs that map to external object stores
 * - **Struct arrays**: Decompose objects into Arrow struct/list combinations
 * - **Streaming**: Process object data in Arrow-compatible pipelines
 *
 * **Thread Safety:**
 * - **Read operations**: Safe for concurrent reads from multiple threads
 * - **Write operations**: NOT thread-safe; use external synchronization if needed
 * - **Object mutations**: Changes to stored objects are not synchronized
 * - **Cursors**: Each thread should have its own cursor instance
 */
export abstract class HugeObjectArray<T> extends HugeArray<T[], T, HugeObjectArray<T>> {

  /**
   * Estimates the memory required for a HugeObjectArray of the specified size.
   *
   * This method provides **accurate memory forecasting** for object array implementations,
   * considering both the array structure overhead and the estimated memory usage of stored objects.
   *
   * **Memory Components:**
   * - **Array structure**: Page management and reference storage overhead
   * - **Object storage**: Estimated memory usage per stored object
   * - **Reference overhead**: Memory for object reference pointers
   * - **Page overhead**: Memory for page structure in paged implementations
   *
   * @param size The desired array size in elements
   * @param objectSize Estimated memory usage per object in bytes
   * @returns Estimated total memory usage in bytes
   */
  public static memoryEstimation(size: number, objectSize: number): number {
    console.assert(size >= 0, `Size must be non-negative, got ${size}`);
    console.assert(objectSize >= 0, `Object size must be non-negative, got ${objectSize}`);

    const sizeOfInstance = size <= HugeArrays.MAX_ARRAY_LENGTH
      ? Estimate.sizeOfInstance(SingleHugeObjectArray)
      : Estimate.sizeOfInstance(PagedHugeObjectArray);

    const numPages = HugeArrays.numberOfPages(size);

    // Memory for the outer array of page references
    let memoryUsed = Estimate.sizeOfObjectArray(numPages);

    // Memory for each full page (references + objects)
    const memoryPerPage = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE) + (HugeArrays.PAGE_SIZE * objectSize);
    const fullPageMemory = (numPages - 1) * memoryPerPage;
    memoryUsed += fullPageMemory;

    // Memory for the last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    const lastPageMemory = Estimate.sizeOfObjectArray(lastPageSize) + (lastPageSize * objectSize);
    memoryUsed += lastPageMemory;

    return sizeOfInstance + memoryUsed;
  }

  /**
   * Returns the object at the given index.
   *
   * This is the **primary random access method** for reading individual objects
   * from the array. Provides O(1) access time with proper null handling.
   *
   * **Object Reference Semantics:**
   * - **Reference return**: Returns the actual object reference, not a copy
   * - **Null handling**: Returns `null` for uninitialized positions
   * - **Type safety**: Guaranteed to return `T | null` with proper typing
   *
   * @param index The index of the element to retrieve (must be in [0, size()))
   * @returns The object at the specified index, or `null` if not set
   * @throws Error if index is negative or >= size()
   */
  public abstract get(index: number): T | null;

  /**
   * Returns the object at the given index, or the default value if the stored value is null.
   *
   * This method provides **convenient null-safe access** to array elements with a fallback
   * value when the stored object is null. Essential for working with sparse object arrays
   * or providing default objects for uninitialized positions.
   *
   * **Null Safety:**
   * - **Fallback mechanism**: Returns defaultValue when stored value is null
   * - **Type preservation**: Maintains type safety with non-null return type
   * - **Performance**: Single lookup with immediate fallback logic
   *
   * **Common Usage:**
   * ```typescript
   * // Provide default node configuration
   * const defaultNode: GraphNode = { id: -1, label: '', properties: {}, neighbors: [] };
   * const node = nodeArray.getOrDefault(nodeId, defaultNode);
   *
   * // Safe access to potentially uninitialized data
   * const state = stateArray.getOrDefault(index, { distance: Infinity, visited: false });
   * ```
   *
   * @param index The index of the element to retrieve
   * @param defaultValue The value to return if the stored value is null
   * @returns The stored object or the default value if stored value is null
   * @throws Error if index is negative or >= size()
   */
  public abstract getOrDefault(index: number, defaultValue: T): T;

  /**
   * Sets the object at the given index to the given value.
   *
   * This is the **primary random access method** for writing individual objects
   * to the array. Stores the object reference (not a copy) with O(1) time complexity.
   *
   * **Object Reference Storage:**
   * - **Reference storage**: Stores the object reference, enabling shared object access
   * - **Null assignment**: Supports setting elements to null for sparse patterns
   * - **Type safety**: Enforces type constraints at compile time
   *
   * @param index The index where to store the object (must be in [0, size()))
   * @param value The object to store, or null to clear the position
   * @throws Error if index is negative or >= size()
   */
  public abstract set(index: number, value: T | null): void;

  /**
   * If the value at the given index is null, computes and stores a new value using the supplier.
   *
   * This method provides **atomic lazy initialization** for object array elements.
   * It's essential for implementing lazy loading patterns, caching mechanisms, and
   * on-demand object creation in large datasets.
   *
   * **Lazy Initialization Semantics:**
   * - **Conditional creation**: Only calls supplier if current value is null
   * - **Atomic operation**: Ensures thread-safe lazy initialization
   * - **Null supplier results**: If supplier returns null, no value is stored
   * - **Return value**: Returns the current value (existing or newly computed)
   *
   * **Common Use Cases:**
   *
   * **Lazy Object Loading:**
   * ```typescript
   * // Load expensive objects only when needed
   * const expensiveObject = objectArray.putIfAbsent(index, () => {
   *   return loadExpensiveObjectFromDatabase(index);
   * });
   * ```
   *
   * **Caching Pattern:**
   * ```typescript
   * // Implement simple caching mechanism
   * function getCachedResult(key: number): ComputationResult {
   *   return resultCache.putIfAbsent(key, () => performExpensiveComputation(key));
   * }
   * ```
   *
   * **Default Object Creation:**
   * ```typescript
   * // Ensure objects exist with default values
   * const nodeState = stateArray.putIfAbsent(nodeId, () => ({
   *   distance: Number.POSITIVE_INFINITY,
   *   predecessor: null,
   *   visited: false
   * }));
   * ```
   *
   * @param index The index where to potentially store the computed value
   * @param supplier Function that computes the value if current value is null
   * @returns The current value at the index (existing or newly computed)
   * @throws Error if index is negative or >= size()
   */
  public abstract putIfAbsent(index: number, supplier: () => T | null): T | null;

  /**
   * Sets all elements using the provided generator function to compute each element.
   *
   * This method provides **high-performance bulk initialization** for object arrays.
   * The generator function can create objects on-demand, implement sparse patterns
   * by returning null for some indices, or initialize with computed values.
   *
   * @param gen Generator function that computes the object for each index
   */
  public abstract setAll(gen: (index: number) => T | null): void;

  /**
   * Assigns the specified object reference to each element in the array.
   *
   * This method provides **efficient bulk assignment** of the same object reference
   * to all array positions. Note that this stores the same reference in each position,
   * creating shared object access rather than independent copies.
   *
   * **Shared Reference Warning:**
   * All array positions will reference the same object instance. Modifications to the
   * object will be visible across all array positions. Use `setAll()` with a generator
   * function to create independent object instances.
   *
   * @param value The object reference to assign to every element (or null to clear all)
   */
  public abstract fill(value: T | null): void;

  /**
   * Returns the logical length of this array in elements.
   *
   * @returns The total number of elements in this array
   */
  public abstract size(): number;

  /**
   * Returns the amount of memory used by this array instance in bytes.
   *
   * Note: This returns the memory used by the array structure itself (references and pages).
   * It does not include the memory used by the actual stored objects, which may vary significantly.
   *
   * @returns The memory footprint of the array structure in bytes
   */
  public abstract sizeOf(): number;

  /**
   * Returns the class type of elements stored in this array.
   *
   * This method provides **runtime type information** for the stored objects,
   * enabling type-safe operations and reflection-based processing.
   *
   * @returns The TypeScript constructor function for the element type
   */
  public abstract elementClass(): new (...args: any[]) => T;

  /**
   * Destroys the array data and releases all associated memory for garbage collection.
   *
   * **Memory Cleanup:**
   * - Clears all object references to enable garbage collection
   * - Releases page structure and metadata
   * - Subsequent operations on this array will fail
   *
   * @returns The amount of memory freed in bytes (0 for subsequent calls)
   */
  public abstract release(): number;

  /**
   * Creates a new cursor for iterating over this array.
   *
   * @returns A new, uninitialized cursor for this array
   */
  public abstract newCursor(): HugeCursor<T[]>;

  /**
   * Copies the content of this array into the target array.
   *
   * **Reference Copying:**
   * This method copies object references (not object contents) from this array
   * to the destination array. Both arrays will reference the same object instances.
   *
   * @param dest Target array to copy data into
   * @param length Number of elements to copy from start of this array
   */
  public abstract copyTo(dest: HugeObjectArray<T>, length: number): void;

  /**
   * Creates a copy of this array with the specified new length.
   *
   * @param newLength The size of the new array
   * @returns A new array instance with the specified length containing copied references
   */
  public abstract copyOf(newLength: number): HugeObjectArray<T>;

  // Boxed operation implementations (bridge to HugeArray interface)
  public boxedGet(index: number): T | null {
    return this.get(index);
  }

  public boxedSet(index: number, value: T | null): void {
    this.set(index, value);
  }

  public boxedSetAll(gen: (index: number) => T | null): void {
    this.setAll(gen);
  }

  public boxedFill(value: T | null): void {
    this.fill(value);
  }

  /**
   * Returns the contents of this array as a flat primitive array.
   *
   * @returns A flat array containing all object references from this HugeArray
   */
  public abstract toArray(): (T | null)[];

  /**
   * Creates a new array of the given size for the specified element type.
   *
   * This is the **primary factory method** for creating HugeObjectArray instances.
   * Automatically chooses the optimal implementation based on size.
   *
   * @param elementClass Constructor function for the element type
   * @param size The desired array size in elements
   * @returns A new HugeObjectArray instance optimized for the given size
   */
  public static newArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    if (size <= HugeArrays.MAX_ARRAY_LENGTH) {
      return SingleHugeObjectArray.of(elementClass, size);
    }
    return PagedHugeObjectArray.of(elementClass, size);
  }

  /**
   * Creates a new array initialized with the provided values.
   *
   * @param values Initial objects for the array
   * @returns A new HugeObjectArray containing the provided objects
   */
  public static of<T>(...values: (T | null)[]): HugeObjectArray<T> {
    // TypeScript cannot infer the exact type from spread args, so we'll use Object as fallback
    return new SingleHugeObjectArray(values.length, values, Object as any);
  }

  // Test-only factory methods
  /** @internal */
  public static newPagedArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    return PagedHugeObjectArray.of(elementClass, size);
  }

  /** @internal */
  public static newSingleArray<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    return SingleHugeObjectArray.of(elementClass, size);
  }

  // Helper methods for array operations
  protected getArrayLength(array: (T | null)[]): number {
    return array.length;
  }

  protected getArrayElement(array: (T | null)[], index: number): T | null {
    return array[index];
  }

  protected arrayCopy(source: (T | null)[], sourceIndex: number, dest: (T | null)[], destIndex: number, length: number): void {
    for (let i = 0; i < length; i++) {
      dest[destIndex + i] = source[sourceIndex + i];
    }
  }
}

/**
 * Single-page implementation for arrays that fit within JavaScript's array size limits.
 *
 * This implementation provides **optimal performance** for smaller object arrays by using
 * a single underlying array with no page management overhead.
 */
class SingleHugeObjectArray<T> extends HugeObjectArray<T> {
  private size: number;
  private page: (T | null)[] | null;
  private elementClassRef: new (...args: any[]) => T;

  /**
   * Factory method for creating single-page object arrays.
   *
   * @param elementClass Constructor function for the element type
   * @param size The desired array size
   * @returns A new SingleHugeObjectArray instance
   */
  public static of<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    console.assert(size <= HugeArrays.MAX_ARRAY_LENGTH, `Size ${size} exceeds maximum array length`);
    const intSize = Math.floor(size);
    const page = new Array<T | null>(intSize).fill(null);
    return new SingleHugeObjectArray(intSize, page, elementClass);
  }

  constructor(size: number, page: (T | null)[], elementClass: new (...args: any[]) => T) {
    super();
    this.size = size;
    this.page = page;
    this.elementClassRef = elementClass;
  }

  public get(index: number): T | null {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    return this.page![index];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    const value = this.get(index);
    return value !== null ? value : defaultValue;
  }

  public set(index: number, value: T | null): void {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    this.page![index] = value;
  }

  public putIfAbsent(index: number, supplier: () => T | null): T | null {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    let value = this.page![index];
    if (value === null) {
      value = supplier();
      if (value !== null) {
        this.page![index] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T | null): void {
    for (let i = 0; i < this.page!.length; i++) {
      this.page![i] = gen(i);
    }
  }

  public fill(value: T | null): void {
    this.page!.fill(value);
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    length = Math.min(length, this.size, dest.size());

    if (dest instanceof SingleHugeObjectArray) {
      // Copy to another single array
      const dst = dest as SingleHugeObjectArray<T>;
      this.arrayCopy(this.page!, 0, dst.page!, 0, length);
      // Fill remaining positions with null
      dst.page!.fill(null, length, dst.size);
    } else if (dest instanceof PagedHugeObjectArray) {
      // Copy to paged array
      const dst = dest as PagedHugeObjectArray<T>;
      let start = 0;
      let remaining = length;

      for (const dstPage of dst.pages!) {
        const toCopy = Math.min(remaining, dstPage.length);
        if (toCopy === 0) {
          dstPage.fill(null);
        } else {
          this.arrayCopy(this.page!, start, dstPage, 0, toCopy);
          if (toCopy < dstPage.length) {
            dstPage.fill(null, toCopy, dstPage.length);
          }
          start += toCopy;
          remaining -= toCopy;
        }
      }
    }
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray(this.elementClassRef, newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return Estimate.sizeOfObjectArray(this.size);
  }

  public elementClass(): new (...args: any[]) => T {
    return this.elementClassRef;
  }

  public release(): number {
    if (this.page !== null) {
      this.page = null;
      return Estimate.sizeOfObjectArray(this.size);
    }
    return 0;
  }

  public newCursor(): HugeCursor<(T | null)[]> {
    return new SinglePageCursor<(T | null)[]>(this.page!);
  }

  public toArray(): (T | null)[] {
    return this.page ? [...this.page] : [];
  }

  public toString(): string {
    return this.page ? `[${this.page.join(', ')}]` : '[]';
  }
}

/**
 * Multi-page implementation for arrays that exceed JavaScript's array size limits.
 *
 * This implementation manages multiple smaller arrays (pages) to provide the
 * appearance of a single large object array while working within JavaScript's constraints.
 */
class PagedHugeObjectArray<T> extends HugeObjectArray<T> {
  private size: number;
  private pages: ((T | null)[])[] | null;
  private memoryUsed: number;
  private elementClassRef: new (...args: any[]) => T;

  /**
   * Factory method for creating paged object arrays.
   *
   * @param elementClass Constructor function for the element type
   * @param size The desired array size
   * @returns A new PagedHugeObjectArray instance
   */
  public static of<T>(elementClass: new (...args: any[]) => T, size: number): HugeObjectArray<T> {
    const numPages = HugeArrays.numberOfPages(size);
    const pages: ((T | null)[])[] = new Array(numPages);

    let memoryUsed = Estimate.sizeOfObjectArray(numPages);
    const pageBytes = Estimate.sizeOfObjectArray(HugeArrays.PAGE_SIZE);

    // Create full pages
    for (let i = 0; i < numPages - 1; i++) {
      memoryUsed += pageBytes;
      pages[i] = new Array<T | null>(HugeArrays.PAGE_SIZE).fill(null);
    }

    // Create last (potentially partial) page
    const lastPageSize = HugeArrays.exclusiveIndexOfPage(size);
    pages[numPages - 1] = new Array<T | null>(lastPageSize).fill(null);
    memoryUsed += Estimate.sizeOfObjectArray(lastPageSize);

    return new PagedHugeObjectArray(size, pages, memoryUsed, elementClass);
  }

  constructor(size: number, pages: ((T | null)[])[], memoryUsed: number, elementClass: new (...args: any[]) => T) {
    super();
    this.size = size;
    this.pages = pages;
    this.memoryUsed = memoryUsed;
    this.elementClassRef = elementClass;
  }

  public get(index: number): T | null {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    return this.pages![pageIndex][indexInPage];
  }

  public getOrDefault(index: number, defaultValue: T): T {
    const value = this.get(index);
    return value !== null ? value : defaultValue;
  }

  public set(index: number, value: T | null): void {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    this.pages![pageIndex][indexInPage] = value;
  }

  public putIfAbsent(index: number, supplier: () => T | null): T | null {
    console.assert(index < this.size, `index = ${index} size = ${this.size}`);
    const pageIndex = HugeArrays.pageIndex(index);
    const indexInPage = HugeArrays.indexInPage(index);
    const page = this.pages![pageIndex];

    let value = page[indexInPage];
    if (value === null) {
      value = supplier();
      if (value !== null) {
        page[indexInPage] = value;
      }
    }
    return value;
  }

  public setAll(gen: (index: number) => T | null): void {
    for (let i = 0; i < this.pages!.length; i++) {
      const page = this.pages![i];
      const baseIndex = i << HugeArrays.PAGE_SHIFT;

      for (let j = 0; j < page.length; j++) {
        page[j] = gen(baseIndex + j);
      }
    }
  }

  public fill(value: T | null): void {
    for (const page of this.pages!) {
      page.fill(value);
    }
  }

  public copyTo(dest: HugeObjectArray<T>, length: number): void {
    length = Math.min(length, this.size, dest.size());

    if (dest instanceof SingleHugeObjectArray) {
      // Copy to single array
      const dst = dest as SingleHugeObjectArray<T>;
      let start = 0;
      let remaining = length;

      for (const page of this.pages!) {
        const toCopy = Math.min(remaining, page.length);
        if (toCopy === 0) break;

        this.arrayCopy(page, 0, dst.page!, start, toCopy);
        start += toCopy;
        remaining -= toCopy;
      }
      // Fill remaining positions with null
      dst.page!.fill(null, start, dst.size);
    } else if (dest instanceof PagedHugeObjectArray) {
      // Copy to another paged array
      const dst = dest as PagedHugeObjectArray<T>;
      const pageLen = Math.min(this.pages!.length, dst.pages!.length);
      const lastPage = pageLen - 1;
      let remaining = length;

      // Copy full pages
      for (let i = 0; i < lastPage; i++) {
        const page = this.pages![i];
        const dstPage = dst.pages![i];
        this.arrayCopy(page, 0, dstPage, 0, page.length);
        remaining -= page.length;
      }

      // Copy last page
      if (remaining > 0) {
        const lastSrcPage = this.pages![lastPage];
        const lastDstPage = dst.pages![lastPage];
        this.arrayCopy(lastSrcPage, 0, lastDstPage, 0, remaining);
        lastDstPage.fill(null, remaining, lastDstPage.length);
      }

      // Fill remaining pages with null
      for (let i = pageLen; i < dst.pages!.length; i++) {
        dst.pages![i].fill(null);
      }
    }
  }

  public copyOf(newLength: number): HugeObjectArray<T> {
    const copy = HugeObjectArray.newArray(this.elementClassRef, newLength);
    this.copyTo(copy, newLength);
    return copy;
  }

  public size(): number {
    return this.size;
  }

  public sizeOf(): number {
    return this.memoryUsed;
  }

  public elementClass(): new (...args: any[]) => T {
    return this.elementClassRef;
  }

  public release(): number {
    if (this.pages !== null) {
      this.pages = null;
      return this.memoryUsed;
    }
    return 0;
  }

  public newCursor(): HugeCursor<(T | null)[]> {
    return new PagedCursor<(T | null)[]>(this.size, this.pages!);
  }

  public toArray(): (T | null)[] {
    const result: (T | null)[] = new Array(this.size);
    let targetIndex = 0;

    for (const page of this.pages!) {
      for (const element of page) {
        result[targetIndex++] = element;
      }
    }

    return result;
  }
}
