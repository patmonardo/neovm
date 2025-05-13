/**
 * A class representing a default value for configuration parameters.
 */
export class Default {
  private readonly value: unknown;

  /**
   * Creates a new default value.
   * 
   * @param value The default value
   */
  constructor(value: unknown) {
    this.value = value;
  }

  /**
   * Gets the default value.
   * 
   * @returns The default value
   */
  getValue(): unknown {
    return this.value;
  }
}