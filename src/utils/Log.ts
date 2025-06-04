/**
 * Simple logging interface for NeoVM.
 *
 * This enables us to evolve the interface independently and run without external
 * logging dependencies. Mimics Neo4j's Log interface for easy migration.
 */
export interface Log {
  info(message: string): void;
  info(format: string, ...args: any[]): void;

  warn(message: string, error?: Error): void;
  warn(format: string, ...args: any[]): void;

  error(message: string, error?: Error): void;
  error(format: string, ...args: any[]): void;
  error(format: string, error: Error, ...args: any[]): void;

  debug(format: string, ...args: any[]): void;

  isDebugEnabled(): boolean;
}

/**
 * No-operation logger for testing and development.
 */
export class NoOpLog implements Log {
  info(message: string): void;
  info(format: string, ...args: any[]): void;
  info(messageOrFormat: string, ...args: any[]): void {
    // No-op
  }

  warn(message: string, error?: Error): void;
  warn(format: string, ...args: any[]): void;
  warn(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...args: any[]
  ): void {
    // No-op
  }

  error(message: string, error?: Error): void;
  error(format: string, ...args: any[]): void;
  error(format: string, error: Error, ...args: any[]): void;
  error(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...restArgs: any[]
  ): void {
    // No-op
  }

  debug(format: string, ...args: any[]): void {
    // No-op
  }

  isDebugEnabled(): boolean {
    return false;
  }
}

/**
 * Console-based logger for development.
 */
export class ConsoleLog implements Log {
  info(message: string): void;
  info(format: string, ...args: any[]): void;
  info(messageOrFormat: string, ...args: any[]): void {
    if (args.length === 0) {
      console.info(messageOrFormat);
    } else {
      console.info(this.format(messageOrFormat, ...args));
    }
  }

  warn(message: string, error?: Error): void;
  warn(format: string, ...args: any[]): void;
  warn(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...args: any[]
  ): void {
    if (errorOrFirstArg instanceof Error && args.length === 0) {
      console.warn(messageOrFormat, errorOrFirstArg);
    } else {
      const allArgs = errorOrFirstArg ? [errorOrFirstArg, ...args] : args;
      console.warn(this.format(messageOrFormat, ...allArgs));
    }
  }

  error(message: string, error?: Error): void;
  error(format: string, ...args: any[]): void;
  error(format: string, error: Error, ...args: any[]): void;
  error(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...restArgs: any[]
  ): void {
    if (errorOrFirstArg instanceof Error) {
      if (restArgs.length === 0) {
        console.error(messageOrFormat, errorOrFirstArg);
      } else {
        console.error(
          this.format(messageOrFormat, ...restArgs),
          errorOrFirstArg
        );
      }
    } else {
      const allArgs = errorOrFirstArg
        ? [errorOrFirstArg, ...restArgs]
        : restArgs;
      console.error(this.format(messageOrFormat, ...allArgs));
    }
  }

  debug(format: string, ...args: any[]): void {
    if (this.isDebugEnabled()) {
      console.debug(this.format(format, ...args));
    }
  }

  isDebugEnabled(): boolean {
    return (
      process.env.NODE_ENV === "development" || process.env.DEBUG === "true"
    );
  }
  private format(template: string, ...args: any[]): string {
    // Simple string interpolation - replace %s, %d, %j with arguments
    let result = template;
    let argIndex = 0;

    result = result.replace(/%[sdj]/g, (match) => {
      if (argIndex >= args.length) return match;

      const arg = args[argIndex++];
      switch (match) {
        case "%s":
          // Use JSON.stringify for objects, String for primitives
          return typeof arg === "object" && arg !== null
            ? JSON.stringify(arg)
            : String(arg);
        case "%d":
          return Number(arg).toString();
        case "%j":
          return JSON.stringify(arg);
        default:
          return match;
      }
    });

    // Append remaining arguments
    const remaining = args.slice(argIndex);
    if (remaining.length > 0) {
      result +=
        " " +
        remaining
          .map((arg) =>
            typeof arg === "object" && arg !== null
              ? JSON.stringify(arg)
              : String(arg)
          )
          .join(" ");
    }

    return result;
  }
}

/**
 * Factory for creating loggers.
 */
export namespace Log {
  /**
   * Create a no-operation logger for testing.
   */
  export function noOp(): Log {
    return new NoOpLog();
  }

  /**
   * Create a console-based logger for development.
   */
  export function console(): Log {
    return new ConsoleLog();
  }

  /**
   * Create a logger with a specific prefix.
   */
  export function withPrefix(
    prefix: string,
    baseLog: Log = new ConsoleLog()
  ): Log {
    return new PrefixedLog(prefix, baseLog);
  }
}

/**
 * Logger that adds a prefix to all messages.
 */
class PrefixedLog implements Log {
  constructor(private readonly prefix: string, private readonly baseLog: Log) {}

  info(message: string): void;
  info(format: string, ...args: any[]): void;
  info(messageOrFormat: string, ...args: any[]): void {
    this.baseLog.info(`[${this.prefix}] ${messageOrFormat}`, ...args);
  }

  warn(message: string, error?: Error): void;
  warn(format: string, ...args: any[]): void;
  warn(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...args: any[]
  ): void {
    this.baseLog.warn(
      `[${this.prefix}] ${messageOrFormat}`,
      errorOrFirstArg,
      ...args
    );
  }

  error(message: string, error?: Error): void;
  error(format: string, ...args: any[]): void;
  error(format: string, error: Error, ...args: any[]): void;
  error(
    messageOrFormat: string,
    errorOrFirstArg?: Error | any,
    ...restArgs: any[]
  ): void {
    this.baseLog.error(
      `[${this.prefix}] ${messageOrFormat}`,
      errorOrFirstArg,
      ...restArgs
    );
  }

  debug(format: string, ...args: any[]): void {
    this.baseLog.debug(`[${this.prefix}] ${format}`, ...args);
  }

  isDebugEnabled(): boolean {
    return this.baseLog.isDebugEnabled();
  }
}
