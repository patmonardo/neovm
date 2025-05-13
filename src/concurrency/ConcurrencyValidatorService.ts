import { ConcurrencyValidator } from './ConcurrencyValidator';
import { OpenGdsConcurrencyValidator } from './OpenGdsConcurrencyValidator';

/**
 * Service that provides access to the current ConcurrencyValidator.
 * Acts as a service locator for the concurrency validation system.
 */
export class ConcurrencyValidatorService {
  /**
   * Default concurrency limit for open source version
   */
  static readonly DEFAULT_CONCURRENCY_LIMIT = 4; // Or whatever limit makes sense

  /**
   * Singleton instance of the validator
   */
  private static instance: ConcurrencyValidator = new OpenGdsConcurrencyValidator();

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {}

  /**
   * Sets the validator instance
   *
   * @param validator The validator implementation to use
   */
  public static setValidator(validator: ConcurrencyValidator): void {
    ConcurrencyValidatorService.instance = validator;
  }

  /**
   * Gets the current validator instance
   *
   * @returns The current validator
   */
  public static validator(): ConcurrencyValidator {
    return ConcurrencyValidatorService.instance;
  }

  /**
   * Gets the maximum allowed concurrency level
   *
   * @returns The maximum concurrency
   */
  public static maxConcurrency(): number {
    return ConcurrencyValidatorService.DEFAULT_CONCURRENCY_LIMIT;
  }
}
