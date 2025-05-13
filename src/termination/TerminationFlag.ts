import { TerminatedException } from "./TerminatedException";
import { TerminationMonitor } from "./TerminationMonitor";

/**
 * Flag that indicates whether a computation should continue running or terminate.
 * This is a functional interface that can be implemented with a lambda expression.
 */
export interface TerminationFlag {
  /**
   * Check if the process should continue running.
   * @returns true if the process should continue, false if it should terminate
   */
  running(): boolean;

  /**
   * Asserts that the process is still running.
   * @throws TerminatedException if the process should terminate
   */
  assertRunning?(): void;

  /**
   * Terminates the process.
   * @throws TerminatedException or a custom exception
   */
  terminate(): void;
}

/**
 * Implementation of TerminationFlag interface with throttling.
 */
export class TerminationFlag implements TerminationFlag {
  /**
   * Interval between checks of the termination monitor in milliseconds.
   */
  private static readonly INTERVAL_MS: number = 10_000;

  /**
   * Monitor for termination status.
   */
  private readonly terminationMonitor?: TerminationMonitor;

  /**
   * Optional function to supply the exception to throw on termination.
   */
  private readonly terminationCause?: () => Error;

  /**
   * Timestamp of the last check of termination status.
   */
  private lastCheck?: number = 0;

  /**
   * Cache of the running status.
   */
  private isRunning?: boolean = true;

  /**
   * Creates a new TerminationFlagImpl.
   *
   * @param terminationMonitor The termination monitor
   * @param terminationCause Optional function that returns the exception to throw
   */
  constructor(
    terminationMonitor: TerminationMonitor,
    terminationCause?: () => Error
  ) {
    this.terminationMonitor = terminationMonitor;
    this.terminationCause = terminationCause;
    this.lastCheck = Date.now();
  }

  /**
   * Check if the process should continue running, with throttling.
   *
   * @returns true if the process should continue, false if it should terminate
   */
  public running(): boolean {
    const currentTime = Date.now();
    if (currentTime > this.lastCheck! + TerminationFlag.INTERVAL_MS) {
      if (this.terminationMonitor?.isTerminated()) {
        this.isRunning = false;
      }
      this.lastCheck = currentTime;
    }
    return this.isRunning ?? true;
  }

  /**
   * Terminates the process by throwing an exception.
   *
   * @throws Error from terminationCause or TerminatedException
   */
  public terminate(): void {
    if (this.terminationCause) {
      throw this.terminationCause();
    } else {
      throw new TerminatedException();
    }
  }
}

/**
 * Static methods and constants for TerminationFlag.
 */
export namespace TerminationFlag {
  /**
   * Flag that always returns true (always running).
   */
  export const RUNNING_TRUE: TerminationFlag = {
    running: () => true,
    terminate: () => {
      throw new TerminatedException();
    },
  };

  /**
   * Default flag that always returns true (always running).
   */
  export const DEFAULT: TerminationFlag = RUNNING_TRUE;

  /**
   * Flag that always returns false (never running).
   */
  export const STOP_RUNNING: TerminationFlag = {
    running: () => false,
    terminate: () => {
      throw new TerminatedException();
    },
  };

  /**
   * Number of nodes to process before checking termination status.
   */
  export const RUN_CHECK_NODE_COUNT: number = 10_000;

  /**
   * Creates a new termination flag.
   *
   * @param terminationMonitor used to signal that the execution stopped running
   * @param terminationCause returns an Error that is thrown when the execution is terminated
   * @returns A new termination flag
   */
  export function wrap(
    terminationMonitor: TerminationMonitor,
    terminationCause?: () => Error
  ): TerminationFlag {
    return new TerminationFlag(terminationMonitor, terminationCause);
  }

  /**
   * Default implementation of assertRunning.
   *
   * @param flag The termination flag
   */
  export function assertRunning(flag: TerminationFlag): void {
    if (!flag.running()) {
      flag.terminate?.();
    }
  }

  /**
   * Default implementation of terminate.
   *
   * @param flag The termination flag
   */
  // export function terminate(flag: TerminationFlag): void {
  //   if (typeof flag.terminate === "function") {
  //     flag.terminate();
  //   } else {
  //     throw new TerminatedException();
  //   }
  // }
}
