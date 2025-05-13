/**
 * Represents an operation that accepts two long input arguments and returns no result.
 * This is the primitive specialization for operations on pairs of long values.
 * 
 * @param value1 The first input argument
 * @param value2 The second input argument
 */
export interface BiLongConsumer {
  /**
   * Performs this operation on the given arguments.
   * 
   * @param value1 The first input argument
   * @param value2 The second input argument
   */
  apply(value1: number, value2: number): void;
}

/**
 * Utility functions for working with BiLongConsumer instances
 */
export namespace BiLongConsumer {
  /**
   * Returns a composed BiLongConsumer that performs, in sequence, this
   * operation followed by the after operation.
   * 
   * @param first The first BiLongConsumer to execute
   * @param after The BiLongConsumer to execute after the first one
   * @returns A composed BiLongConsumer that executes both in sequence
   */
  export function andThen(
    first: BiLongConsumer,
    after: BiLongConsumer
  ): BiLongConsumer {
    return {
      apply: (value1: number, value2: number): void => {
        first.apply(value1, value2);
        after.apply(value1, value2);
      }
    };
  }

  /**
   * Creates a BiLongConsumer from a function
   * 
   * @param fn Function that accepts two numbers and returns nothing
   * @returns A BiLongConsumer that wraps the function
   */
  export function of(fn: (value1: number, value2: number) => void): BiLongConsumer {
    return {
      apply: fn
    };
  }

  /**
   * Creates a BiLongConsumer that ignores its inputs and does nothing
   * 
   * @returns A no-op BiLongConsumer
   */
  export function noop(): BiLongConsumer {
    return {
      apply: () => {}
    };
  }
}