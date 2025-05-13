/**
 * Interface for combining multiple messages into a single value.
 * Used to aggregate messages sent to the same target node.
 */
export interface Reducer {
  /**
   * The identity element is used as the initial value.
   */
  identity(): number;

  /**
   * Computes a new value based on the current value and the message.
   * 
   * @param current The current aggregated value
   * @param message The new message value to incorporate
   * @returns The combined value
   */
  reduce(current: number, message: number): number;
}

/**
 * Standard reducer implementations
 */
export namespace Reducers {
  /**
   * Reduces messages by summing them
   */
  export class Sum implements Reducer {
    identity(): number {
      return 0;
    }

    reduce(current: number, message: number): number {
      return current + message;
    }
  }

  /**
   * Reduces messages by taking the minimum value
   */
  export class Min implements Reducer {
    identity(): number {
      return Number.MAX_VALUE;
    }

    reduce(current: number, message: number): number {
      return Math.min(current, message);
    }
  }

  /**
   * Reduces messages by taking the maximum value
   */
  export class Max implements Reducer {
    identity(): number {
      return -Number.MAX_VALUE;
    }

    reduce(current: number, message: number): number {
      return Math.max(current, message);
    }
  }

  /**
   * Reduces messages by counting them
   */
  export class Count implements Reducer {
    identity(): number {
      return 0;
    }

    reduce(current: number, message: number): number {
      return current + 1;
    }
  }
}

/**
 * Factory methods for creating standard reducers
 */
export class Reducer {
  /**
   * Create a sum reducer
   */
  static sum(): Reducer {
    return new Reducers.Sum();
  }

  /**
   * Create a min reducer
   */
  static min(): Reducer {
    return new Reducers.Min();
  }

  /**
   * Create a max reducer
   */
  static max(): Reducer {
    return new Reducers.Max();
  }

  /**
   * Create a count reducer
   */
  static count(): Reducer {
    return new Reducers.Count();
  }
}