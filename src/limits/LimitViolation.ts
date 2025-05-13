/**
 * Represents a violation of a configuration limit.
 */
export class LimitViolation {
  private readonly errorMessage: string;

  /**
   * Creates a new limit violation.
   * 
   * @param errorMessage Error message describing the violation
   */
  constructor(errorMessage: string) {
    this.errorMessage = errorMessage;
  }

  /**
   * Returns the error message for this violation.
   * 
   * @returns Error message
   */
  public getMessage(): string {
    return this.errorMessage;
  }

  /**
   * Returns a string representation of this violation.
   * 
   * @returns String representation
   */
  public toString(): string {
    return this.errorMessage;
  }
}