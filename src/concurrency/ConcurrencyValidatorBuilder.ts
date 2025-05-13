import { ConcurrencyValidator } from './ConcurrencyValidator';

/**
 * Builder interface for creating ConcurrencyValidator instances.
 */
export interface ConcurrencyValidatorBuilder {
  /**
   * Builds a validator with default configuration
   *
   * @returns A configured validator
   */
  build(): ConcurrencyValidator;

  /**
   * Returns the priority of this builder.
   * Higher priority builders are checked first.
   *
   * @returns The priority value
   */
  priority(): number;
}
