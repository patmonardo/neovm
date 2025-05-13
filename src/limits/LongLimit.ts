import { Limit } from './Limit';

/**
 * Limit implementation for long (number) values.
 */
export class LongLimit extends Limit {
  private readonly value: number;

  /**
   * Creates a new long limit.
   *
   * @param value The limit value
   */
  constructor(value: number) {
    super();
    this.value = value;
  }

  /**
   * Gets the limit value.
   *
   * @returns The long limit value
   */
  override getValue(): number {
    return this.value;
  }

  /**
   * Checks if the provided value violates this limit.
   * A long limit is violated if the input value exceeds the limit.
   *
   * @param inputValue The value to check
   * @returns true if the limit is violated (input > limit)
   */
  protected override isViolatedInternal(inputValue: unknown): boolean {
    const l = inputValue as number;
    return l > this.value;
  }
}
