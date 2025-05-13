/**
 * Interface for configurations that provide a random seed
 */
export interface RandomSeedConfig {
  /**
   * Returns the random seed if configured, or undefined if not specified
   */
  randomSeed(): number | undefined;
}
