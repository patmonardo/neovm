/**
 * Base abstract class for configuration limits.
 */
export abstract class Limit {
  /**
   * The raw value that was set.
   */
  abstract getValue(): unknown;

  /**
   * Violating a limit is type dependent - boolean is the odd one out.
   *
   * We validate the incoming type for compatibility. We support number, and boolean,
   * the relevant types for configuration values.
   * 
   * @param inputValue The value to check against the limit
   * @returns true if the limit is violated
   */
  isViolated(inputValue: unknown): boolean {
    this.assertTypeCompatible(inputValue);
    return this.isViolatedInternal(inputValue);
  }

  /**
   * Validates the incoming value's type for compatibility.
   *
   * @param inputValue The value to check for type compatibility
   * @throws Error if the incoming value's type is not compatible
   */
  private assertTypeCompatible(inputValue: unknown): void {
    if (inputValue === null || inputValue === undefined) {
      throw new Error(`Input value cannot be null or undefined`);
    }

    const limitValue = this.getValue();
    const inputType = typeof inputValue;
    const limitType = typeof limitValue;

    if (inputType !== limitType) {
      throw new Error(
        `Input value '${inputValue}' (${inputType}) is not compatible with limit value '${limitValue}' (${limitType})`
      );
    }
  }

  /**
   * Violating a limit is type dependent - boolean is the odd one out.
   * 
   * @param inputValue The value to check
   * @returns true if the limit is violated
   */
  protected abstract isViolatedInternal(inputValue: unknown): boolean;

  /**
   * Creates an error message for when this limit is violated.
   * 
   * @param key Configuration parameter key
   * @param value The value that violated the limit
   * @returns Formatted error message
   */
  asErrorMessage(key: string, value: unknown): string {
    return `Configuration parameter '${key}' with value '${value}' exceeds its limit of '${this.getValue()}'`;
  }
}