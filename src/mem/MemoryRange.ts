import { Estimate } from './Estimate'; // Assuming Estimate.humanReadable can take number

/**
 * Represents a range of positive byte values.
 * The range can span 0 bytes when the min and max value are identical.
 * The range can represent 0 bytes when the min and max values are both 0.
 * All internal calculations and storage use bigint for precision with large byte counts.
 */
export class MemoryRange {
  public readonly min: bigint;
  public readonly max: bigint;

  // Private constructor to ensure all instances go through the `of` factory for validation
  private constructor(min: bigint, max: bigint) {
    this.min = min;
    this.max = max;
  }

  private static readonly NULL_RANGE_INSTANCE = new MemoryRange(0n, 0n);

  /**
   * Creates a memory range with identical min and max values.
   *
   * @param value The memory size in bytes (as number).
   * @returns A memory range with identical bounds.
   * @throws Error if value is negative or not a safe integer.
   */
  public static of(value: number): MemoryRange;
  /**
   * Creates a memory range with the given min and max values.
   *
   * @param min The minimum memory size in bytes (as number).
   * @param max The maximum memory size in bytes (as number).
   * @returns A memory range with the specified bounds.
   * @throws Error if min or max are negative, not safe integers, or if max < min.
   */
  public static of(min: number, max: number): MemoryRange;
  /**
   * Creates a memory range with identical min and max values using bigint.
   * @param value The memory size in bytes (as bigint).
   * @returns A memory range with identical bounds.
   * @throws Error if value is negative.
   */
  public static of(value: bigint): MemoryRange; // Overload for bigint
  /**
   * Creates a memory range with the given min and max values using bigint.
   * @param min The minimum memory size in bytes (as bigint).
   * @param max The maximum memory size in bytes (as bigint).
   * @returns A memory range with the specified bounds.
   * @throws Error if min or max are negative, or if max < min.
   */
  public static of(min: bigint, max: bigint): MemoryRange; // Overload for bigint

  // Implementation of the 'of' overloads
  public static of(
    param1: number | bigint,
    param2?: number | bigint
  ): MemoryRange {
    let bigMin: bigint;
    let bigMax: bigint;

    if (param2 === undefined) {
      // Single argument overload
      if (typeof param1 === "number") {
        if (!Number.isSafeInteger(param1)) {
          throw new Error(
            `Input value ${param1} is not a safe integer. ` +
              `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
          );
        }
        bigMin = BigInt(param1);
        bigMax = BigInt(param1);
      } else {
        // param1 is bigint
        bigMin = param1;
        bigMax = param1;
      }
    } else {
      // Two argument overload
      if (typeof param1 === "number") {
        if (!Number.isSafeInteger(param1)) {
          throw new Error(
            `Input min value ${param1} is not a safe integer. ` +
              `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
          );
        }
        bigMin = BigInt(param1);
      } else {
        // param1 is bigint
        bigMin = param1;
      }

      if (typeof param2 === "number") {
        if (!Number.isSafeInteger(param2)) {
          throw new Error(
            `Input max value ${param2} is not a safe integer. ` +
              `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
          );
        }
        bigMax = BigInt(param2);
      } else {
        // param2 is bigint
        bigMax = param2;
      }
    }

    if (bigMin === 0n && bigMax === 0n) {
      return MemoryRange.NULL_RANGE_INSTANCE;
    }
    if (bigMin < 0n) {
      throw new Error(`min range cannot be negative: ${bigMin.toString()}`);
    }
    if (bigMax < 0n) {
      throw new Error(`max range cannot be negative: ${bigMax.toString()}`);
    }
    if (bigMax < bigMin) {
      throw new Error(
        `max range cannot be less than min range: ${bigMax.toString()} < ${bigMin.toString()}`
      );
    }
    return new MemoryRange(bigMin, bigMax);
  }

  /**
   * Returns an empty memory range (0 bytes min and max).
   *
   * @returns An empty memory range.
   */
  public static empty(): MemoryRange {
    return MemoryRange.NULL_RANGE_INSTANCE;
  }

  /**
   * Adds a fixed value or another MemoryRange to this range.
   * The added value must be non-negative if it's a number or bigint.
   *
   * @param valueOrOther The value (number or bigint) or MemoryRange to add.
   * @returns A new memory range with the added value/range.
   */
  public add(valueOrOther: number | bigint | MemoryRange): MemoryRange {
    if (valueOrOther instanceof MemoryRange) {
      const other = valueOrOther;
      if (this.isEmpty()) return other;
      if (other.isEmpty()) return this;
      return MemoryRange.of(this.min + other.min, this.max + other.max);
    } else {
      let bigValue: bigint;
      if (typeof valueOrOther === "number") {
        if (!Number.isSafeInteger(valueOrOther)) {
          throw new Error(
            `Value to add (${valueOrOther}) is not a safe integer. ` +
              `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
          );
        }
        if (valueOrOther < 0) {
          throw new Error(`Value to add must be non-negative: ${valueOrOther}`);
        }
        bigValue = BigInt(valueOrOther);
      } else {
        // valueOrOther is bigint
        if (valueOrOther < 0n) {
          throw new Error(
            `Value to add must be non-negative: ${valueOrOther.toString()}`
          );
        }
        bigValue = valueOrOther;
      }

      if (bigValue === 0n) {
        return this;
      }
      return MemoryRange.of(this.min + bigValue, this.max + bigValue);
    }
  }

  /**
   * Multiplies this range by a non-negative factor.
   *
   * @param count The multiplication factor (number or bigint).
   * @returns A new memory range multiplied by the factor.
   * @throws Error if count is negative or not a safe integer (if number).
   */
  public times(count: number | bigint): MemoryRange {
    let bigCount: bigint;
    if (typeof count === "number") {
      if (!Number.isSafeInteger(count)) {
        throw new Error(
          `Multiplication factor (${count}) is not a safe integer. ` +
            `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
        );
      }
      if (count < 0) {
        throw new Error(`Multiplication factor cannot be negative: ${count}`);
      }
      bigCount = BigInt(count);
    } else {
      // count is bigint
      if (count < 0n) {
        throw new Error(
          `Multiplication factor cannot be negative: ${count.toString()}`
        );
      }
      bigCount = count;
    }

    if (this.isEmpty() || bigCount === 1n) {
      return this;
    }
    if (bigCount === 0n) {
      return MemoryRange.NULL_RANGE_INSTANCE;
    }
    return MemoryRange.of(this.min * bigCount, this.max * bigCount);
  }

  /**
   * Subtracts a fixed value from both min and max.
   * The value to subtract must be non-negative.
   * Resulting min/max are validated by MemoryRange.of().
   *
   * @param value The value to subtract (number or bigint).
   * @returns A new memory range with the subtracted value.
   * @throws Error if value is negative or not a safe integer (if number).
   */
  public subtract(value: number | bigint): MemoryRange {
    let bigValue: bigint;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new Error(
          `Value to subtract (${value}) is not a safe integer. ` +
            `Use bigint for values larger than ${Number.MAX_SAFE_INTEGER}.`
        );
      }
      if (value < 0) {
        // Java's subtractExact doesn't imply positive, but our context might
        throw new Error(`Value to subtract must be non-negative: ${value}`);
      }
      bigValue = BigInt(value);
    } else {
      // value is bigint
      if (value < 0n) {
        throw new Error(
          `Value to subtract must be non-negative: ${value.toString()}`
        );
      }
      bigValue = value;
    }

    if (bigValue === 0n) {
      return this;
    }
    return MemoryRange.of(this.min - bigValue, this.max - bigValue);
  }

  /**
   * Performs element-wise subtraction of another memory range.
   * Resulting min/max are validated by MemoryRange.of().
   *
   * @param other The other memory range.
   * @returns A new memory range with element-wise subtraction.
   */
  public elementWiseSubtract(other: MemoryRange): MemoryRange {
    if (other.isEmpty()) {
      return this;
    }
    return MemoryRange.of(this.min - other.min, this.max - other.max);
  }

  /**
   * Creates a union of this range with another range.
   * The new range will encompass both original ranges.
   *
   * @param other The other memory range.
   * @returns A new memory range representing the union.
   */
  public union(other: MemoryRange): MemoryRange {
    if (this.isEmpty()) return other;
    if (other.isEmpty()) return this;

    const newMin = this.min < other.min ? this.min : other.min;
    const newMax = this.max > other.max ? this.max : other.max;
    return MemoryRange.of(newMin, newMax);
  }

  /**
   * (Static Method)
   * Creates a range with the element-wise maximum values from two MemoryRange instances.
   *
   * @param range1 The first memory range.
   * @param range2 The second memory range.
   * @returns A new memory range with element-wise maximum values.
   */
  public static maximum(range1: MemoryRange, range2: MemoryRange): MemoryRange {
    // Now uses the passed arguments, not 'this.min' or 'this.max'
    const newMin = range1.min > range2.min ? range1.min : range2.min;
    const newMax = range1.max > range2.max ? range1.max : range2.max;
    return MemoryRange.of(newMin, newMax);
  }

  /**
   * Applies a function to both min and max values.
   * The function must produce valid non-negative bigint values
   * such that newMin <= newMax. These are validated by MemoryRange.of().
   *
   * @param fn The function to apply, taking a bigint and returning a bigint.
   * @returns A new memory range with the function applied.
   */
  public apply(fn: (value: bigint) => bigint): MemoryRange {
    return MemoryRange.of(fn(this.min), fn(this.max));
  }

  public isEmpty(): boolean {
    return this.min === 0n && this.max === 0n;
  }

  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof MemoryRange)) return false;
    return this.min === other.min && this.max === other.max;
  }

  public hashCode(): number {
    const prime = 31n;
    let result = 1n;
    const MASK_32_BIT = 0xffffffffn; // Mask for lower 32 bits as BigInt
    result = prime * result + (this.min & MASK_32_BIT);
    result = prime * result + (this.max & MASK_32_BIT);
    return Number(result & MASK_32_BIT); // Return as number
  }

  public toString(): string {
    if (this.min === this.max) {
      return Estimate.humanReadable(Number(this.min));
    } else {
      return `[${Estimate.humanReadable(
        Number(this.min)
      )} ... ${Estimate.humanReadable(Number(this.max))}]`;
    }
  }
}
