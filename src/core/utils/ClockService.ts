/**
 * Interface for a clock object, similar to Java's java.time.Clock.
 * It provides the current time in milliseconds.
 */
export interface Clock {
  /**
   * Returns the current millisecond instant of the clock.
   * This is equivalent to `java.time.Clock.millis()`.
   * @returns The current time in milliseconds since the epoch (UTC).
   */
  millis(): number;
}

/**
 * A default implementation of Clock that uses the system's UTC time.
 */
class SystemUTCClock implements Clock {
  public millis(): number {
    return Date.now();
  }
}

/**
 * Provides a globally accessible clock, which can be overridden for testing purposes.
 * This is a TypeScript translation of GDS's org.neo4j.gds.core.utils.ClockService.
 */
export class ClockService {
  private static readonly SYSTEM_CLOCK: Clock = new SystemUTCClock();
  private static currentClock: Clock = ClockService.SYSTEM_CLOCK;

  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private constructor() {}

  /**
   * Sets the clock to be used by the service.
   * @param clock The clock to use.
   */
  public static setClock(clock: Clock): void {
    ClockService.currentClock = clock;
  }

  /**
   * Returns the currently configured clock.
   * Defaults to the system UTC clock.
   * @returns The current clock.
   */
  public static clock(): Clock {
    return ClockService.currentClock;
  }

  /**
   * Executes a given function with a temporarily specified clock.
   * The original clock is restored after the function completes,
   * regardless of whether it completes normally or throws an error.
   *
   * @param tempClock The clock to use for the duration of the runnable's execution.
   * @param runnable A function that accepts the temporary clock and will be executed.
   *                 The type parameter T allows the runnable to expect a specific subtype of Clock if needed.
   */
  public static runWithClock<T extends Clock>(
    tempClock: T,
    runnable: (clock: T) => void
  ): void {
    const previousClock = ClockService.currentClock;
    ClockService.setClock(tempClock);
    try {
      runnable(tempClock);
    } finally {
      ClockService.setClock(previousClock);
    }
  }

  /**
   * Resets the clock to the default system UTC clock.
   * Useful for tearing down tests.
   */
  public static resetClock(): void {
    ClockService.currentClock = ClockService.SYSTEM_CLOCK;
  }
}

// Example of a mock clock for testing:
export class MockClock implements Clock {
  private currentTime: number;

  constructor(initialTime: number = Date.now()) {
    this.currentTime = initialTime;
  }

  public millis(): number {
    return this.currentTime;
  }

  public advanceMillis(ms: number): void {
    this.currentTime += ms;
  }

  public setMillis(ms: number): void {
    this.currentTime = ms;
  }
}
