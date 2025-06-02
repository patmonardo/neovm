/**
 * Task execution status enumeration.
 * Represents the lifecycle states of a task.
 */
export enum Status {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED'
}

/**
 * Utility functions for Status operations.
 */
export namespace Status {
  /**
   * Parse string to Status (case-insensitive).
   */
  export function fromString(status: string): Status {
    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'PENDING':
        return Status.PENDING;
      case 'RUNNING':
        return Status.RUNNING;
      case 'FINISHED':
        return Status.FINISHED;
      case 'CANCELED':
      case 'CANCELLED': // British spelling
        return Status.CANCELED;
      case 'FAILED':
        return Status.FAILED;
      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }

  /**
   * Check if status represents a terminal state (task is done).
   */
  export function isTerminal(status: Status): boolean {
    return status === Status.FINISHED ||
           status === Status.CANCELED ||
           status === Status.FAILED;
  }

  /**
   * Check if status represents an active state (task is in progress).
   */
  export function isActive(status: Status): boolean {
    return status === Status.RUNNING;
  }

  /**
   * Check if status represents a waiting state (task hasn't started).
   */
  export function isPending(status: Status): boolean {
    return status === Status.PENDING;
  }

  /**
   * Check if status represents a successful completion.
   */
  export function isSuccessful(status: Status): boolean {
    return status === Status.FINISHED;
  }

  /**
   * Check if status represents a failure state.
   */
  export function isFailed(status: Status): boolean {
    return status === Status.FAILED || status === Status.CANCELED;
  }

  /**
   * Get valid transitions from current status.
   */
  export function getValidTransitions(from: Status): Status[] {
    switch (from) {
      case Status.PENDING:
        return [Status.RUNNING, Status.CANCELED];
      case Status.RUNNING:
        return [Status.FINISHED, Status.CANCELED, Status.FAILED];
      case Status.FINISHED:
      case Status.CANCELED:
      case Status.FAILED:
        return []; // Terminal states have no transitions
      default:
        return [];
    }
  }

  /**
   * Check if transition is valid.
   */
  export function canTransition(from: Status, to: Status): boolean {
    return getValidTransitions(from).includes(to);
  }

  /**
   * Get all statuses in lifecycle order.
   */
  export function getAllStatuses(): Status[] {
    return [Status.PENDING, Status.RUNNING, Status.FINISHED, Status.CANCELED, Status.FAILED];
  }

  /**
   * Get progress percentage for status (rough estimate).
   */
  export function getProgressPercentage(status: Status): number {
    switch (status) {
      case Status.PENDING:
        return 0;
      case Status.RUNNING:
        return 50; // Rough estimate for running tasks
      case Status.FINISHED:
        return 100;
      case Status.CANCELED:
      case Status.FAILED:
        return -1; // Indicates error state
      default:
        return 0;
    }
  }
}
