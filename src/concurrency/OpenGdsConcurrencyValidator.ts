import { ConcurrencyValidator } from './ConcurrencyValidator';

/**
 * Default implementation of ConcurrencyValidator.
 * Enforces that concurrency is positive and within limits.
 */
export class OpenGdsConcurrencyValidator implements ConcurrencyValidator {
  validate(
    requestedConcurrency: number,
    configKey: string,
    concurrencyLimitation: number
  ): void {
    if (requestedConcurrency <= 0) {
      throw new Error(`${configKey} must be positive, but got ${requestedConcurrency}`);
    }

    if (requestedConcurrency > concurrencyLimitation) {
      throw new Error(
        `${configKey} must be less than or equal to ${concurrencyLimitation}, but got ${requestedConcurrency}`
      );
    }
  }
}
