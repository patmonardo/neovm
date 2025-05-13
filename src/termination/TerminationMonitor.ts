/**
 * Interface for monitoring termination status.
 * A functional interface that can be implemented with a lambda expression.
 */
export interface TerminationMonitor {
  /**
   * Check if the process should be terminated.
   * @returns true if the process should terminate, false if it should continue
   */
  isTerminated(): boolean;
}

/**
 * Static methods and constants for TerminationMonitor.
 */
export namespace TerminationMonitor {
  /**
   * A monitor that never terminates.
   */
  export const EMPTY: TerminationMonitor = { isTerminated: () => false };
}