/**
 * Validator interface for concurrency settings.
 */
export interface ConcurrencyValidator {
  /**
   * Validates a requested concurrency level against limitations.
   *
   * @param requestedConcurrency The requested concurrency level
   * @param configKey The configuration key for error messages
   * @param concurrencyLimitation Maximum allowed concurrency
   * @throws Error if validation fails
   */
  validate(
    requestedConcurrency: number,
    configKey: string,
    concurrencyLimitation: number
  ): void;
}
