import { BitUtil } from './BitUtil';

/**
 * Utility class for estimating memory usage of various data structures.
 *
 * Note: This is a TypeScript approximation of JVM memory usage patterns.
 * Actual memory usage in JavaScript/TypeScript will differ due to different
 * memory models and garbage collection strategies.
 */
export class Estimate {
  // Number of trailing zeros for various primitive types
  private static readonly SHIFT_BYTE = 0;    // 2^0 = 1 byte
  private static readonly SHIFT_CHAR = 1;    // 2^1 = 2 bytes
  private static readonly SHIFT_SHORT = 1;   // 2^1 = 2 bytes
  private static readonly SHIFT_INT = 2;     // 2^2 = 4 bytes
  private static readonly SHIFT_FLOAT = 2;   // 2^2 = 4 bytes
  private static readonly SHIFT_LONG = 3;    // 2^3 = 8 bytes
  private static readonly SHIFT_DOUBLE = 3;  // 2^3 = 8 bytes

  // Object reference size (pointers)
  private static readonly SHIFT_OBJECT_REF = 3;  // 8 bytes on 64-bit systems

  /**
   * Size of an object reference in bytes.
   * In TypeScript we'll use 8 bytes to simulate 64-bit pointers.
   */
  public static readonly BYTES_OBJECT_REF = 8;

  /**
   * The maximum size of array to allocate (unless necessary).
   * This matches Java's approach to avoid VM limits.
   */
  public static readonly MAX_ARRAY_SIZE = Number.MAX_SAFE_INTEGER - 8;

  /**
   * Number of bytes to represent an array header (no content, but with alignments).
   * For TypeScript we'll use a reasonable approximation.
   */
  public static readonly BYTES_ARRAY_HEADER = 24;

  /**
   * Number of bytes to represent an object header (no fields, no alignments).
   */
  public static readonly BYTES_OBJECT_HEADER = 16;

  /**
   * Object alignment masks for 8-byte alignment.
   */
  private static readonly MASK1_OBJECT_ALIGNMENT = 7;  // 8-1
  private static readonly MASK2_OBJECT_ALIGNMENT = ~7; // ~(8-1)

  /**
   * Sizes of primitive classes in bytes.
   */
  public static readonly primitiveSizes = new Map<string, number>([
    ['boolean', 1],
    ['byte', 1],
    ['char', 2],
    ['short', 2],
    ['int', 4],
    ['float', 4],
    ['double', 8],
    ['long', 8],
    ['number', 8]
  ]);

  /**
   * Calculate size of a byte array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfByteArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_BYTE));
  }

  /**
   * Calculate size of a char array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfCharArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_CHAR));
  }

  /**
   * Calculate size of a short array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfShortArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_SHORT));
  }

  /**
   * Calculate size of an int array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfIntArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_INT));
  }

  /**
   * Calculate size of a float array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfFloatArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_FLOAT));
  }

  /**
   * Calculate size of a long/number array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfLongArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_LONG));
  }

  /**
   * Calculate size of a double array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfDoubleArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_DOUBLE));
  }

  /**
   * Calculate size of an object array of specified length.
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfObjectArray(length: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + (length << Estimate.SHIFT_OBJECT_REF));
  }

  /**
   * Calculate size of object array elements (references only, no headers).
   *
   * @param length Number of elements in the array
   * @returns Estimated memory size in bytes
   */
  public static sizeOfObjectArrayElements(length: number): number {
    return Estimate.alignObjectSize(length << Estimate.SHIFT_OBJECT_REF);
  }

  /**
   * Calculate size of an array with specified length and bytes per element.
   *
   * @param length Number of elements in the array
   * @param bytesPerElement Size of each element in bytes
   * @returns Estimated memory size in bytes
   */
  public static sizeOfArray(length: number, bytesPerElement: number): number {
    return Estimate.alignObjectSize(Estimate.BYTES_ARRAY_HEADER + length * bytesPerElement);
  }

  /**
   * Calculate size of a bitset with specified number of bits.
   *
   * @param length Number of bits
   * @returns Estimated memory size in bytes
   */
  public static sizeOfBitset(length: number): number {
    // In BitSet implementation, words are 64-bit (long) values
    const numWords = Math.ceil(length / 64);
    // BitSet object overhead + long array
    return Estimate.sizeOfLongArray(numWords) + Estimate.sizeOfInstance('BitSet');
  }

  /**
   * Calculate size of a Map<number, number> with specified capacity.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfLongDoubleHashMap(length: number): number {
    // We approximate this with a Map that has key and value arrays
    const capacity = Math.ceil(length * 1.25); // Same load factor as Java implementation
    const keyArraySize = Estimate.sizeOfLongArray(capacity);
    const valueArraySize = Estimate.sizeOfDoubleArray(capacity);

    return keyArraySize + valueArraySize + Estimate.sizeOfInstance('Map');
  }

  /**
   * Synonym for sizeOfLongDoubleHashMap for compatibility.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfLongDoubleScatterMap(length: number): number {
    return Estimate.sizeOfLongDoubleHashMap(length);
  }

  /**
   * Calculate size of a Set<number> with specified capacity.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfLongHashSet(length: number): number {
    return Estimate.sizeOfOpenHashContainer(length) + Estimate.sizeOfInstance('Set');
  }

  /**
   * Calculate size of an empty hash container with default capacity.
   *
   * @returns Estimated memory size in bytes
   */
  public static sizeOfEmptyOpenHashContainer(): number {
    return Estimate.sizeOfOpenHashContainer(16); // Default expected elements
  }

  /**
   * Calculate size of a number[] with specified capacity.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfLongArrayList(length: number): number {
    return Estimate.sizeOfInstance('Array') + length * 8; // 8 bytes per number
  }

  /**
   * Calculate size of a number[] with specified capacity.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfIntArrayList(length: number): number {
    return Estimate.sizeOfInstance('Array') + length * 4; // 4 bytes per number
  }

  /**
   * Calculate size of a number[] with specified capacity.
   *
   * @param length Expected number of elements
   * @returns Estimated memory size in bytes
   */
  public static sizeOfDoubleArrayList(length: number): number {
    return Estimate.sizeOfInstance('Array') + length * 8; // 8 bytes per number
  }

  /**
   * Calculate size of an open hash container (internal structure for hash-based collections).
   *
   * @param elements Expected number of elements
   * @returns Estimated capacity needed
   */
  public static sizeOfOpenHashContainer(elements: number): number {
    if (elements < 0) {
      throw new Error(`Number of elements must be >= 0: ${elements}`);
    }

    const DEFAULT_EXPECTED_ELEMENTS = 16;
    const DEFAULT_LOAD_FACTOR = 0.75;
    const MIN_HASH_ARRAY_LENGTH = 2;

    const newElements = Math.max(elements, DEFAULT_EXPECTED_ELEMENTS);

    let length = Math.ceil(newElements / DEFAULT_LOAD_FACTOR);
    if (length === newElements) {
      length++;
    }

    length = Math.max(MIN_HASH_ARRAY_LENGTH, BitUtil.nextHighestPowerOfTwo(length));

    return length + 1;
  }

  /**
   * Returns the shallow instance size in bytes an instance of the given class would occupy.
   * This is a simplified approximation for TypeScript.
   *
   * @param className Name of the class
   * @returns Estimated memory size in bytes
   */
  public static sizeOfInstance(className: string): number {
    // For TypeScript, we use simplified estimates based on typical class sizes
    switch (className) {
      case 'boolean': return 1;
      case 'byte': return 1;
      case 'char': return 2;
      case 'short': return 2;
      case 'int': return 4;
      case 'float': return 4;
      case 'double': return 8;
      case 'long': case 'number': return 8;
      case 'BitSet': return 40;
      case 'Map': return 80;
      case 'Set': return 64;
      case 'Array': return 32;
      default: return 48; // Default size for a typical object
    }
  }

  /**
   * Aligns an object size to be the next multiple of object alignment bytes.
   *
   * @param size The size to align
   * @returns Aligned size
   */
  private static alignObjectSize(size: number): number {
    return (size + Estimate.MASK1_OBJECT_ALIGNMENT) & Estimate.MASK2_OBJECT_ALIGNMENT;
  }

  /**
   * Units for human-readable size output.
   */
  private static readonly UNITS = [" Bytes", " KiB", " MiB", " GiB", " TiB", " PiB", " EiB", " ZiB", " YiB"];

  /**
   * Returns size in human-readable units.
   *
   * @param bytes Size in bytes
   * @returns Human-readable size string
   */
  public static humanReadable(bytes: number): string {
    for (const unit of Estimate.UNITS) {
      // Allow for a bit of overflow before going to the next unit
      if (bytes >> 14 === 0) {
        return bytes + unit;
      }
      bytes = bytes >> 10;
    }
    // We should never reach here with JavaScript numbers
    throw new Error("Size too large to represent");
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    throw new Error("Estimate is a utility class and cannot be instantiated");
  }
}
