/**
 * Type definitions for value transformation functions used in atomic operations.
 *
 * This module provides **type-safe function interfaces** for atomic value transformations
 * in huge array implementations. These transformers enable thread-safe atomic updates
 * using compare-and-swap operations and functional programming patterns.
 *
 * **Design Philosophy:**
 *
 * **1. Functional Purity:**
 * All transformer functions are pure functions that take a value and return a transformed
 * value without side effects. This ensures atomic operations remain predictable and
 * thread-safe across concurrent modifications.
 *
 * **2. Type Safety:**
 * Each transformer interface is strongly typed to prevent runtime type errors and
 * ensure compatibility with the corresponding atomic array element types.
 *
 * **3. Performance Optimization:**
 * These function types are designed to work efficiently with JavaScript's number type
 * system while maintaining compatibility with atomic operation semantics.
 *
 * **Common Use Cases in Atomic Operations:**
 *
 * **Atomic Increment/Decrement:**
 * ```typescript
 * // Atomic increment transformer
 * const incrementBy = (delta: number): LongToLongFunction => (value: number) => value + delta;
 *
 * // Usage in atomic arrays
 * atomicArray.updateAndGet(index, incrementBy(1));  // Atomic increment
 * atomicArray.updateAndGet(index, incrementBy(-1)); // Atomic decrement
 * ```
 *
 * **Atomic Min/Max Operations:**
 * ```typescript
 * // Atomic minimum transformer
 * const atomicMin = (newValue: number): LongToLongFunction =>
 *   (currentValue: number) => Math.min(currentValue, newValue);
 *
 * // Atomic maximum transformer
 * const atomicMax = (newValue: number): LongToLongFunction =>
 *   (currentValue: number) => Math.max(currentValue, newValue);
 *
 * // Usage in graph algorithms
 * distanceArray.updateAndGet(nodeId, atomicMin(newDistance));
 * ```
 *
 * **Bitwise Atomic Operations:**
 * ```typescript
 * // Atomic bitwise operations
 * const atomicOr = (mask: number): IntToIntFunction => (value: number) => value | mask;
 * const atomicAnd = (mask: number): IntToIntFunction => (value: number) => value & mask;
 * const atomicXor = (mask: number): IntToIntFunction => (value: number) => value ^ mask;
 *
 * // Flag manipulation in concurrent algorithms
 * flagArray.updateAndGet(nodeId, atomicOr(VISITED_FLAG));
 * ```
 *
 * **Conditional Transformations:**
 * ```typescript
 * // Conditional update transformers
 * const conditionalUpdate = (
 *   condition: (value: number) => boolean,
 *   transform: (value: number) => number
 * ): LongToLongFunction => (value: number) => condition(value) ? transform(value) : value;
 *
 * // Example: Only update if current value is smaller
 * const updateIfSmaller = (newValue: number): LongToLongFunction =>
 *   conditionalUpdate(current => newValue < current, () => newValue);
 * ```
 */

/**
 * Function interface for transforming byte values (8-bit integers).
 *
 * Used for atomic operations on byte arrays where values need to be transformed
 * atomically. Supports values in the range [-128, 127] for signed bytes.
 *
 * **JavaScript Adaptation:**
 * Since JavaScript doesn't have native byte types, this operates on numbers
 * but is intended for values that fit within 8-bit signed integer range.
 *
 * @param value The current byte value to transform
 * @returns The transformed byte value
 */
export interface ByteToByteFunction {
  (value: number): number;
}

/**
 * Function interface for transforming double-precision floating-point values.
 *
 * Used for atomic operations on double arrays where floating-point values
 * need to be transformed atomically. Supports the full range of JavaScript's
 * number type (64-bit IEEE 754 double-precision).
 *
 * **Precision Considerations:**
 * - Maintains full double-precision accuracy during transformations
 * - Handles special values (NaN, Infinity, -Infinity) appropriately
 * - Suitable for scientific computing and high-precision graph analytics
 *
 * @param value The current double value to transform
 * @returns The transformed double value
 */
export interface DoubleToDoubleFunction {
  (value: number): number;
}

/**
 * Function interface for transforming long integer values.
 *
 * Used for atomic operations on long arrays where 64-bit integers need to be
 * transformed atomically. In JavaScript, this operates on the safe integer
 * range up to Number.MAX_SAFE_INTEGER (2^53 - 1).
 *
 * **Integer Safety:**
 * - Maintains integer precision within JavaScript's safe integer range
 * - Suitable for node IDs, edge counts, and other large integer values
 * - Handles typical graph analytics integer operations safely
 *
 * @param value The current long value to transform
 * @returns The transformed long value
 */
export interface LongToLongFunction {
  (value: number): number;
}

/**
 * Function interface for transforming long values to integer values.
 *
 * Used for atomic operations where a long value needs to be transformed
 * into a 32-bit integer range. Useful for downcasting operations or
 * extracting integer portions from larger values.
 *
 * **Type Conversion:**
 * The input is treated as a long (up to safe integer range) but the output
 * should be within 32-bit integer range [-2^31, 2^31-1] for optimal performance.
 *
 * @param value The current long value to transform
 * @returns The transformed integer value
 */
export interface IntToIntFunction {
  (value: number): number;
}

/**
 * Utility class providing common transformer implementations.
 *
 * This class contains **pre-built transformer functions** for common atomic operations
 * to avoid recreating function objects repeatedly and improve performance.
 */
export class ValueTransformers {

  /**
   * Creates an increment transformer for the specified delta.
   *
   * @param delta The amount to add to the current value
   * @returns A transformer function that increments by the delta
   */
  public static increment(delta: number): LongToLongFunction {
    return (value: number) => value + delta;
  }

  /**
   * Creates a decrement transformer for the specified delta.
   *
   * @param delta The amount to subtract from the current value
   * @returns A transformer function that decrements by the delta
   */
  public static decrement(delta: number): LongToLongFunction {
    return (value: number) => value - delta;
  }

  /**
   * Creates a multiply transformer for the specified factor.
   *
   * @param factor The factor to multiply the current value by
   * @returns A transformer function that multiplies by the factor
   */
  public static multiply(factor: number): DoubleToDoubleFunction {
    return (value: number) => value * factor;
  }

  /**
   * Creates a minimum transformer that ensures the value doesn't exceed a maximum.
   *
   * @param maximum The maximum allowed value
   * @returns A transformer function that clamps to the maximum
   */
  public static clampMax(maximum: number): LongToLongFunction {
    return (value: number) => Math.min(value, maximum);
  }

  /**
   * Creates a maximum transformer that ensures the value doesn't go below a minimum.
   *
   * @param minimum The minimum allowed value
   * @returns A transformer function that clamps to the minimum
   */
  public static clampMin(minimum: number): LongToLongFunction {
    return (value: number) => Math.max(value, minimum);
  }

  /**
   * Creates a bitwise OR transformer.
   *
   * @param mask The bitmask to OR with the current value
   * @returns A transformer function that performs bitwise OR
   */
  public static bitwiseOr(mask: number): IntToIntFunction {
    return (value: number) => value | mask;
  }

  /**
   * Creates a bitwise AND transformer.
   *
   * @param mask The bitmask to AND with the current value
   * @returns A transformer function that performs bitwise AND
   */
  public static bitwiseAnd(mask: number): IntToIntFunction {
    return (value: number) => value & mask;
  }

  /**
   * Creates a bitwise XOR transformer.
   *
   * @param mask The bitmask to XOR with the current value
   * @returns A transformer function that performs bitwise XOR
   */
  public static bitwiseXor(mask: number): IntToIntFunction {
    return (value: number) => value ^ mask;
  }

  /**
   * Identity transformer that returns the value unchanged.
   * Useful as a default or for conditional operations.
   */
  public static readonly IDENTITY: LongToLongFunction = (value: number) => value;

  /**
   * Absolute value transformer.
   */
  public static readonly ABSOLUTE: LongToLongFunction = (value: number) => Math.abs(value);

  /**
   * Negation transformer.
   */
  public static readonly NEGATE: LongToLongFunction = (value: number) => -value;

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    throw new Error('ValueTransformers is a static utility class and cannot be instantiated');
  }
}
