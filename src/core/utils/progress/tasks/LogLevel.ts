/**
 * Log level enumeration for task progress tracking.
 * Simple enum with three levels: WARNING, INFO, DEBUG.
 */
export enum LogLevel {
  WARNING = 'WARNING',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

/**
 * Utility functions for LogLevel operations.
 */
export namespace LogLevel {
  /**
   * Parse string to LogLevel (case-insensitive).
   */
  export function fromString(level: string): LogLevel {
    const normalized = level.toUpperCase();
    switch (normalized) {
      case 'WARNING':
      case 'WARN':
        return LogLevel.WARNING;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        throw new Error(`Unknown log level: ${level}`);
    }
  }

  /**
   * Get numeric priority (higher = more important).
   */
  export function getPriority(level: LogLevel): number {
    switch (level) {
      case LogLevel.WARNING:
        return 3;
      case LogLevel.INFO:
        return 2;
      case LogLevel.DEBUG:
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Check if level should be logged at given threshold.
   */
  export function shouldLog(level: LogLevel, threshold: LogLevel): boolean {
    return getPriority(level) >= getPriority(threshold);
  }

  /**
   * Get all log levels in order of priority.
   */
  export function getAllLevels(): LogLevel[] {
    return [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING];
  }

  /**
   * Get default log level.
   */
  export function getDefault(): LogLevel {
    return LogLevel.INFO;
  }
}
