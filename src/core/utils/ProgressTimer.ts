/**
 * A timer that measures elapsed time and calls a callback when stopped.
 * Implements the AutoCloseable interface to support use with try-with-resources.
 */
export class ProgressTimer {
  private readonly onStop: (duration: number) => void;
  private readonly startTime: number;
  private duration: number = 0;

  /**
   * Creates a new progress timer with the specified callback.
   * 
   * @param onStop Callback that receives the duration when the timer is stopped
   */
  private constructor(onStop: ((duration: number) => void) | null) {
    this.onStop = onStop ?? ((duration: number) => {});
    this.startTime = performance.now();
  }

  /**
   * Stops the timer and calls the onStop callback.
   * 
   * @returns This instance for method chaining
   */
  public stop(): ProgressTimer {
    this.duration = performance.now() - this.startTime;
    this.onStop(this.duration);
    return this;
  }

  /**
   * Gets the measured duration in milliseconds.
   * 
   * @returns Measured duration
   */
  public getDuration(): number {
    return this.duration;
  }

  /**
   * Creates and starts a new timer with the specified callback.
   * 
   * @param onStop Callback that receives the duration when the timer is stopped
   * @returns A new progress timer instance
   */
  public static start(onStop: (duration: number) => void): ProgressTimer;
  
  /**
   * Creates and starts a new timer without a callback.
   * 
   * @returns A new progress timer instance
   */
  public static start(): ProgressTimer;
  
  /**
   * Implementation of the start method.
   */
  public static start(onStop?: (duration: number) => void): ProgressTimer {
    return new ProgressTimer(onStop || null);
  }

  /**
   * Stops the timer.
   * Implements the AutoCloseable interface.
   */
  public close(): void {
    this.stop();
  }
}