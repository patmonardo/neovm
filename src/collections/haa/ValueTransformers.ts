/**
 * Contains functional interfaces for applying transformations to primitive values.
 * These are used by the atomic array implementations for operations like update.
 */
export namespace ValueTransformers {
  /**
   * A function that takes a byte value and returns a byte value.
   * In JavaScript context, this operates on numbers in the range 0-255.
   */
  export interface ByteToByteFunction {
    /**
     * Apply the function to the input value
     * @param value Input byte value (0-255)
     * @returns Transformed byte value (0-255)
     */
    applyAsByte(value: number): number;
  }

  /**
   * A function that takes a double value and returns a double value.
   */
  export interface DoubleToDoubleFunction {
    /**
     * Apply the function to the input value
     * @param value Input double value
     * @returns Transformed double value
     */
    applyAsDouble(value: number): number;
  }

  /**
   * A function that takes a long value and returns a long value.
   * In JavaScript context, this operates on numbers that may require BigInt for full precision.
   */
  export interface LongToLongFunction {
    /**
     * Apply the function to the input value
     * @param value Input long value
     * @returns Transformed long value
     */
    applyAsLong(value: number): number;
  }

  /**
   * A function that takes an int value and returns an int value.
   */
  export interface IntToIntFunction {
    /**
     * Apply the function to the input value
     * @param value Input int value
     * @returns Transformed int value
     */
    applyAsInt(value: number): number;
  }

  /**
   * Common transformer implementations
   */
  export class Transformers {
    /**
     * Returns an incrementing function that adds the specified delta
     */
    static incrementing(delta: number = 1): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction {
      return {
        applyAsInt: (value: number) => value + delta,
        applyAsLong: (value: number) => value + delta,
        applyAsDouble: (value: number) => value + delta
      };
    }

    /**
     * Returns a decrementing function that subtracts the specified delta
     */
    static decrementing(delta: number = 1): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction {
      return {
        applyAsInt: (value: number) => value - delta,
        applyAsLong: (value: number) => value - delta,
        applyAsDouble: (value: number) => value - delta
      };
    }

    /**
     * Returns a multiplying function that multiplies by the specified factor
     */
    static multiplying(factor: number): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction {
      return {
        applyAsInt: (value: number) => value * factor,
        applyAsLong: (value: number) => value * factor,
        applyAsDouble: (value: number) => value * factor
      };
    }

    /**
     * Returns a function that sets the value to the specified constant
     */
    static constant(constantValue: number): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction & ByteToByteFunction {
      return {
        applyAsInt: () => constantValue,
        applyAsLong: () => constantValue,
        applyAsDouble: () => constantValue,
        applyAsByte: () => constantValue & 0xFF
      };
    }
    
    /**
     * Returns the maximum of the current value and the specified value
     */
    static max(threshold: number): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction {
      return {
        applyAsInt: (value: number) => Math.max(value, threshold),
        applyAsLong: (value: number) => Math.max(value, threshold),
        applyAsDouble: (value: number) => Math.max(value, threshold)
      };
    }
    
    /**
     * Returns the minimum of the current value and the specified value
     */
    static min(threshold: number): IntToIntFunction & LongToLongFunction & DoubleToDoubleFunction {
      return {
        applyAsInt: (value: number) => Math.min(value, threshold),
        applyAsLong: (value: number) => Math.min(value, threshold),
        applyAsDouble: (value: number) => Math.min(value, threshold)
      };
    }
  }
}

/**
 * Create a specialized transformer for a specific purpose
 * @example
 * // Create a transformer that increments by 5
 * const increment5 = createTransformer((x) => x + 5);
 * 
 * // Use it with an atomic array
 * atomicArray.update(index, increment5);
 */
export function createTransformer<T extends "byte" | "int" | "long" | "double">(
  fn: (value: number) => number,
  type: T = "int" as T
): T extends "byte" 
  ? ValueTransformers.ByteToByteFunction 
  : T extends "int" 
    ? ValueTransformers.IntToIntFunction 
    : T extends "long" 
      ? ValueTransformers.LongToLongFunction 
      : ValueTransformers.DoubleToDoubleFunction {
  
  switch (type) {
    case "byte":
      return {
        applyAsByte: (value: number) => fn(value) & 0xFF
      } as any;
    case "int":
      return {
        applyAsInt: fn
      } as any;
    case "long":
      return {
        applyAsLong: fn
      } as any;
    case "double":
      return {
        applyAsDouble: fn
      } as any;
    default:
      throw new Error(`Unknown transformer type: ${type}`);
  }
}