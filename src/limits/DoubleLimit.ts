import { Limit } from './Limit';

/**
 * Limit implementation for double values.
 */
export class DoubleLimit extends Limit {
  private readonly value: number;

  /**
   * Creates a new double limit.
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
   * @returns The double limit value
   */
  override getValue(): number {
    return this.value;
  }

  /**
   * Checks if the provided value violates this limit.
   * A double limit is violated if the input value exceeds the limit.
   * 
   * @param inputValue The value to check
   * @returns true if the limit is violated (input > limit)
   */
  protected override isViolatedInternal(inputValue: unknown): boolean {
    const d = inputValue as number;
    return d > this.value;
  }
}