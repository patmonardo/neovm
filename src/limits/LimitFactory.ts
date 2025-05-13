import { Limit } from './Limit';
import { BooleanLimit } from './BooleanLimit';
import { DoubleLimit } from './DoubleLimit';
import { LongLimit } from './LongLimit';

/**
 * Factory for creating limit instances based on the value type.
 */
export class LimitFactory {
  /**
   * Creates a new limit instance for the given value.
   *
   * @param value Value to create a limit for
   * @returns Appropriate limit instance
   * @throws Error if the value type is not supported
   */
  public static create(value: unknown): Limit {
    if (value === undefined || value === null) {
      throw new Error(`Unable to create limit for null or undefined value`);
    }

    if (typeof value === 'boolean') {
      return new BooleanLimit(value);
    }

    if (typeof value === 'number') {
      // In TypeScript, all numbers are floating point, so we'll use DoubleLimit
      return new DoubleLimit(value);
    }

    if (typeof value === 'number') {
      return new LongLimit(value);
    }

    throw new Error(
      `Unable to create limit for input value '${String(value)}' (${typeof value})`
    );
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}
