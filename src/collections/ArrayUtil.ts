import { Estimate } from '../mem/Estimate';

/**
 * Utility methods for array operations like searching, resizing, and manipulation.
 */
export class ArrayUtil {
  /**
   * Threshold below which binary search switches to linear search for better performance
   */
  private static readonly LINEAR_SEARCH_LIMIT = 64;

  /**
   * Maximum array length in JavaScript
   */
  private static readonly MAX_ARRAY_LENGTH = Number.MAX_SAFE_INTEGER - Estimate.BYTES_ARRAY_HEADER;

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("No instances allowed");
  }
  
  /**
   * Binary search with optimization to use linear search for small ranges
   * 
   * @param arr The array to search
   * @param length The length of the valid portion of the array
   * @param key The value to search for
   * @returns True if the key was found, false otherwise
   */
  public static binarySearch(arr: number[], length: number, key: number): boolean {
    let low = 0;
    let high = length - 1;
    
    while (high - low > this.LINEAR_SEARCH_LIMIT) {
      const mid = (low + high) >>> 1;
      const midVal = arr[mid];
      
      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else {
        return true;
      }
    }
    
    return this.linearSearch2(arr, low, high, key);
  }
  
  /**
   * Similar to Array.prototype.indexOf but returns the index of the first occurrence 
   * if there are multiple occurrences
   * 
   * @returns index of the first occurrence of the search key, if it is contained in the array;
   *          otherwise, (-insertion point - 1)
   */
  public static binarySearchFirst(a: number[], fromIndex: number, toIndex: number, key: number): number {
    let low = fromIndex;
    let high = toIndex - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = a[mid];

      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else if (mid > 0 && a[mid - 1] === key) { // key found, but not first index
        high = mid - 1;
      } else {
        return mid; // key found
      }
    }
    return -(low + 1);  // key not found
  }
  
  /**
   * Similar to Array.prototype.lastIndexOf but uses binary search for better performance
   * 
   * @returns index of the last occurrence of the search key, if it is contained in the array;
   *          otherwise, (-insertion point - 1)
   */
  public static binarySearchLast(a: number[], fromIndex: number, toIndex: number, key: number): number {
    let low = fromIndex;
    let high = toIndex - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = a[mid];

      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else if (mid < toIndex - 1 && a[mid + 1] === key) { // key found, but not last index
        low = mid + 1;
      } else {
        return mid; // key found
      }
    }
    return -(low + 1);  // key not found
  }
  
  /**
   * Binary search that returns the index of the found element
   */
  public static binarySearchIndex(arr: number[], length: number, key: number): number {
    let low = 0;
    let high = length - 1;
    
    while (high - low > this.LINEAR_SEARCH_LIMIT) {
      const mid = (low + high) >>> 1;
      const midVal = arr[mid];
      
      if (midVal < key) {
        low = mid + 1;
      } else if (midVal > key) {
        high = mid - 1;
      } else {
        return mid;
      }
    }
    
    return this.linearSearch2index(arr, low, high, key);
  }
  
  /**
   * Linear search in a range that stops early if a larger element is found
   */
  public static linearSearch2(arr: number[], low: number, high: number, key: number): boolean {
    for (let i = low; i <= high; i++) {
      if (arr[i] === key) return true;
      if (arr[i] > key) return false;
    }
    return false;
  }
  
  /**
   * Linear search in a range that returns the index
   */
  public static linearSearch2index(arr: number[], low: number, high: number, key: number): number {
    for (let i = low; i <= high; i++) {
      if (arr[i] === key) return i;
      if (arr[i] > key) return -i - 1;
    }
    return -(high) - 1;
  }
  
  /**
   * Optimized linear search using unrolled loops
   */
  public static linearSearch(arr: number[], length: number, key: number): boolean {
    let i = 0;
    
    // Process 4 elements at a time for better CPU utilization
    for (; i < length - 4; i += 4) {
      if (arr[i] === key) return true;
      if (arr[i + 1] === key) return true;
      if (arr[i + 2] === key) return true;
      if (arr[i + 3] === key) return true;
    }
    
    // Handle remaining elements
    for (; i < length; i++) {
      if (arr[i] === key) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Optimized linear search that returns the index
   */
  public static linearSearchIndex(arr: number[], length: number, key: number): number {
    let i = 0;
    
    // Process 4 elements at a time for better CPU utilization
    for (; i < length - 4; i += 4) {
      if (arr[i] === key) return i;
      if (arr[i + 1] === key) return i + 1;
      if (arr[i + 2] === key) return i + 2;
      if (arr[i + 3] === key) return i + 3;
    }
    
    // Handle remaining elements
    for (; i < length; i++) {
      if (arr[i] === key) {
        return i;
      }
    }
    
    return -length - 1;
  }
  
  /**
   * Find the index where (ids[idx] <= id) && (ids[idx + 1] > id).
   * Returns a positive index even if the array does not directly contain the searched value.
   * Returns -1 if the value is smaller than the smallest one in the array.
   */
  public static binaryLookup(id: number, ids: number[]): number {
    const length = ids.length;
    let low = 0;
    let high = length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midVal = ids[mid];

      if (midVal < id) {
        low = mid + 1;
      } else if (midVal > id) {
        high = mid - 1;
      } else {
        return mid;
      }
    }
    
    return low - 1;
  }
  
  /**
   * Creates a new array filled with the specified value
   */
  public static fill(value: number, length: number): number[] {
    const data = new Array(length);
    data.fill(value);
    return data;
  }
  
  /**
   * Checks if an array contains the specified value
   */
  public static contains(array: number[], value: number): boolean {
    for (const element of array) {
      if (element === value) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Returns an array size >= minTargetSize, generally over-allocating exponentially to achieve
   * amortized linear-time cost as the array grows.
   * 
   * This is adapted from Apache Lucene which is licensed under Apache License, Version 2.0.
   * 
   * @param minTargetSize Minimum required value to be returned
   * @param bytesPerElement Bytes used by each element of the array
   * @returns A new size that is at least as large as minTargetSize
   */
  public static oversize(minTargetSize: number, bytesPerElement: number): number {
    if (minTargetSize < 0) {
      // catch usage that accidentally overflows int
      throw new Error(`invalid array size ${minTargetSize}`);
    }

    if (minTargetSize === 0) {
      // wait until at least one element is requested
      return 0;
    }

    if (minTargetSize > this.MAX_ARRAY_LENGTH) {
      throw new Error(
        `requested array size ${minTargetSize} exceeds maximum array in JavaScript (${this.MAX_ARRAY_LENGTH})`
      );
    }

    // asymptotic exponential growth by 1/8th, favors
    // spending a bit more CPU to not tie up too much wasted RAM
    let extra = minTargetSize >>> 3;

    if (extra < 3) {
      // for very small arrays, where constant overhead of
      // realloc is presumably relatively high, we grow faster
      extra = 3;
    }

    let newSize = minTargetSize + extra;

    // add 7 to allow for worst case byte alignment addition below
    if (newSize + 7 < 0 || newSize + 7 > this.MAX_ARRAY_LENGTH) {
      // int overflowed, or we exceeded the maximum array length
      return this.MAX_ARRAY_LENGTH;
    }

    if (Estimate.BYTES_OBJECT_REF === 8) {
      // round up to 8 byte alignment in 64bit env
      switch (bytesPerElement) {
        case 4:
          // round up to multiple of 2
          return (newSize + 1) & 0x7ffffffe;
        case 2:
          // round up to multiple of 4
          return (newSize + 3) & 0x7ffffffc;
        case 1:
          // round up to multiple of 8
          return (newSize + 7) & 0x7ffffff8;
        case 8:
          // no rounding
        default:
          // odd (invalid?) size
          return newSize;
      }
    } else {
      // In 32bit env, it's still 8-byte aligned,
      // but the array header is 12 bytes, not a multiple of 8.
      // So saving 4,12,20,28... bytes of data is the most cost-effective.
      switch (bytesPerElement) {
        case 1:
          // align with size of 4,12,20,28...
          return ((newSize + 3) & 0x7ffffff8) + 4;
        case 2:
          // align with size of 6,10,14,18...
          return ((newSize + 1) & 0x7ffffffc) + 2;
        case 4:
          // align with size of 5,7,9,11...
          return (newSize & 0x7ffffffe) + 1;
        case 8:
          // no processing required
        default:
          // odd (invalid?) size
          return newSize;
      }
    }
  }
  
  /**
   * Huge version of Lucene oversize for arrays that may exceed integer bounds.
   *
   * @param minTargetSize Minimum required value to be returned
   * @param bytesPerElement Bytes used by each element of the array
   * @returns A new size that is at least as large as minTargetSize
   */
  public static oversizeHuge(minTargetSize: number, bytesPerElement: number): number {
    if (minTargetSize === 0) {
      // wait until at least one element is requested
      return 0;
    }

    // asymptotic exponential growth by 1/8th
    let extra = minTargetSize >>> 3;

    if (extra < 3) {
      // for very small arrays, grow faster
      extra = 3;
    }

    let newSize = minTargetSize + extra;

    if (Estimate.BYTES_OBJECT_REF === 8) {
      // round up to 8 byte alignment to match JVM pointer size
      switch (bytesPerElement) {
        case 4:
          // round up to multiple of 2
          return (newSize + 1) & 0x7FFF_FFFE;
        case 2:
          // round up to multiple of 4
          return (newSize + 3) & 0x7FFF_FFFC;
        case 1:
          // round up to multiple of 8
          return (newSize + 7) & 0x7FFF_FFF8;
        case 8:
          // no rounding
        default:
          return newSize;
      }
    } else {
      // round up to 4 byte alignment to match JVM pointer size
      switch (bytesPerElement) {
        case 2:
          // round up to multiple of 2
          return (newSize + 1) & 0x7FFFFFFE;
        case 1:
          // round up to multiple of 4
          return (newSize + 3) & 0x7FFFFFFC;
        case 4:
        case 8:
          // no rounding
        default:
          return newSize;
      }
    }
  }
  
  /**
   * Create a new array with enough capacity for the specified number of elements.
   * Uses oversize to determine an appropriate size.
   */
  public static newArray<T>(minSize: number, defaultValue?: T): T[] {
    const size = this.oversize(minSize, 8); // 8 bytes for object references
    const array = new Array<T>(size);
    
    if (defaultValue !== undefined) {
      array.fill(defaultValue);
    }
    
    return array;
  }
  
  /**
   * Create a new typed array with enough capacity for the specified number of elements.
   * Uses oversize to determine an appropriate size.
   */
  public static newTypedArray(minSize: number, type: 'int8' | 'uint8' | 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64'): TypedArray {
    let bytesPerElement: number;
    let arrayConstructor: TypedArrayConstructor;
    
    switch (type) {
      case 'int8':
        bytesPerElement = 1;
        arrayConstructor = Int8Array;
        break;
      case 'uint8':
        bytesPerElement = 1;
        arrayConstructor = Uint8Array;
        break;
      case 'int16':
        bytesPerElement = 2;
        arrayConstructor = Int16Array;
        break;
      case 'uint16':
        bytesPerElement = 2;
        arrayConstructor = Uint16Array;
        break;
      case 'int32':
        bytesPerElement = 4;
        arrayConstructor = Int32Array;
        break;
      case 'uint32':
        bytesPerElement = 4;
        arrayConstructor = Uint32Array;
        break;
      case 'float32':
        bytesPerElement = 4;
        arrayConstructor = Float32Array;
        break;
      case 'float64':
        bytesPerElement = 8;
        arrayConstructor = Float64Array;
        break;
      default:
        throw new Error(`Unknown array type: ${type}`);
    }
    
    const size = this.oversize(minSize, bytesPerElement);
    return new arrayConstructor(size);
  }
}

/**
 * Union type for all TypedArray classes
 */
type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

/**
 * Constructor type for TypedArray classes
 */
type TypedArrayConstructor = new (length: number) => TypedArray;