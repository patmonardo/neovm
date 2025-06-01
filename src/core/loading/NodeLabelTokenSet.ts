import { GraphDimensions } from "../GraphDimensions";

/**
 * Represents a set of node label tokens.
 * These tokens are typically integer identifiers for labels.
 */
export interface NodeLabelTokenSet {
  /**
   * @returns The number of tokens in this set.
   */
  length(): number;

  /**
   * Retrieves the token at the specified index.
   * @param index The index of the token to retrieve.
   * @returns The token (as a number) at the given index.
   * @throws RangeError if the index is out of bounds.
   */
  get(index: number): number;

  /**
   * Marks the token at the specified index to be ignored.
   * This typically involves setting it to a sentinel value like `GraphDimensions.IGNORE`.
   * @param index The index of the token to ignore.
   * @throws RangeError if the index is out of bounds.
   */
  ignore(index: number): void;

  /**
   * Returns the tokens as an array of numbers.
   * @remarks In Java, this is annotated with @TestOnly.
   * @returns An array of numbers representing the tokens.
   */
  asIntArray(): number[];
}

/**
 * Implementation of NodeLabelTokenSet using an array of numbers (Java int[]).
 */
class IntNodeLabelTokenSetImpl implements NodeLabelTokenSet {
  private tokens: number[]; // Corresponds to Java's int[]

  constructor(tokens: number[]) {
    this.tokens = tokens;
  }

  public length(): number {
    return this.tokens.length;
  }

  public get(index: number): number {
    if (index < 0 || index >= this.tokens.length) {
      throw new RangeError(
        `Index ${index} out of bounds for length ${this.tokens.length}`
      );
    }
    return this.tokens[index];
  }

  public ignore(index: number): void {
    if (index < 0 || index >= this.tokens.length) {
      throw new RangeError(
        `Index ${index} out of bounds for length ${this.tokens.length}`
      );
    }
    this.tokens[index] = GraphDimensions.IGNORE;
  }

  public asIntArray(): number[] {
    // Returns the internal array directly, mirroring Java's behavior.
    // If immutability were desired for the returned array, a copy `[...this.tokens]` would be made.
    return this.tokens;
  }
}

/**
 * Implementation of NodeLabelTokenSet using an array of bigints (Java long[]).
 * Values are converted to numbers (Java int) upon retrieval, with overflow checks.
 */
class LongNodeLabelTokenSetImpl implements NodeLabelTokenSet {
  private tokens: number[]; // Corresponds to Java's long[]

  constructor(tokens: number[]) {
    this.tokens = tokens;
  }

  public length(): number {
    return this.tokens.length;
  }

  private toIntExact(value: number): number {
    // Mimics Java's Math.toIntExact(long)
    if (value > BigInt(2147483647) || value < BigInt(-2147483648)) {
      throw new Error(
        `Value ${value} cannot be safely converted to a 32-bit integer.`
      );
    }
    return Number(value);
  }

  public get(index: number): number {
    if (index < 0 || index >= this.tokens.length) {
      throw new RangeError(
        `Index ${index} out of bounds for length ${this.tokens.length}`
      );
    }
    return this.toIntExact(this.tokens[index]);
  }

  public ignore(index: number): void {
    if (index < 0 || index >= this.tokens.length) {
      throw new RangeError(
        `Index ${index} out of bounds for length ${this.tokens.length}`
      );
    }
    this.tokens[index] = GraphDimensions.IGNORE; // Store IGNORE as a number
  }

  public asIntArray(): number[] {
    return this.tokens.map((token) => this.toIntExact(token));
  }
}

// Companion namespace for static members and factory methods
export namespace NodeLabelTokenSet {
  /**
   * A NodeLabelTokenSet instance representing "any label" or an empty set of constraints.
   */
  export const ANY_LABEL: NodeLabelTokenSet = {
    length(): number {
      return 0;
    },
    get(index: number): number {
      throw new RangeError(`Index ${index} out of bounds for length 0`);
    },
    ignore(index: number): void {
      throw new RangeError(`Index ${index} out of bounds for length 0`);
    },
    asIntArray(): number[] {
      return [];
    },
  };

  /**
   * Creates a NodeLabelTokenSet from the given number (int) tokens.
   * @param tokens A variable number of tokens.
   * @returns A NodeLabelTokenSet instance.
   */
  export function from(...tokens: number[]): NodeLabelTokenSet;
  /**
   * Creates a NodeLabelTokenSet from the given number (long) tokens.
   * @param tokens A variable number of tokens.
   * @returns A NodeLabelTokenSet instance.
   */
  export function from(...tokens: number[]): NodeLabelTokenSet;
  export function from(...tokens: (number | number)[]): NodeLabelTokenSet {
    if (tokens.length > 0 && typeof tokens[0] === "number") {
      // If the first element is a number, treat all as bigints.
      // This requires all elements to be bigints or safely convertible.
      const longTokens: number[] = tokens.map((t) => Number(t));
      return new LongNodeLabelTokenSetImpl(longTokens);
    } else {
      // Default to number[] or if the first element is a number.
      // This requires all elements to be numbers or safely convertible.
      const intTokens: number[] = tokens.map((t) => {
        if (typeof t === "number") {
          // Mimic Math.toIntExact if a number is in a number context
          if (t > BigInt(2147483647) || t < BigInt(-2147483648)) {
            throw new Error(
              `Value ${t} cannot be safely converted to a 32-bit integer for an int-based token set.`
            );
          }
        }
        return Number(t);
      });
      return new IntNodeLabelTokenSetImpl(intTokens);
    }
  }
}
