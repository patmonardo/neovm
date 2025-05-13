/**
 * Configuration interface for algorithms that require a tolerance value
 */
export interface ToleranceConfig {
  /**
   * Returns the tolerance value for convergence
   */
  tolerance(): number;
}
