/**
 * Strategy for efficiently waiting in busy loops.
 * 
 * Uses progressively more aggressive techniques to deal with contention:
 * 1. Busy spinning (for very short waits)
 * 2. Yielding (for medium waits)
 * 3. Sleeping (for longer waits)
 */
export class BackoffIdleStrategy {
  // Configuration for the backoff
  private static readonly MAX_SPINS = 10;
  private static readonly MAX_YIELDS = 5;
  private static readonly MIN_PARK_NS = 1_000_000;  // 1ms
  private static readonly MAX_PARK_NS = 100_000_000;  // 100ms
  
  private spins = 0;
  private yields = 0;
  private parkNs = BackoffIdleStrategy.MIN_PARK_NS;
  
  /**
   * Reset the idle strategy to its initial state.
   */
  public reset(): void {
    this.spins = 0;
    this.yields = 0;
    this.parkNs = BackoffIdleStrategy.MIN_PARK_NS;
  }
  
  /**
   * Idle for a period of time based on the backoff strategy.
   */
  public idle(): void {
    // First try spinning
    if (this.spins < BackoffIdleStrategy.MAX_SPINS) {
      this.spins++;
      this.spinWait();
      return;
    }
    
    // Then try yielding
    if (this.yields < BackoffIdleStrategy.MAX_YIELDS) {
      this.yields++;
      this.yieldThread();
      return;
    }
    
    // Finally, sleep for a while
    this.park();
    
    // Increase sleep time for next iteration, up to a maximum
    this.parkNs = Math.min(this.parkNs * 2, BackoffIdleStrategy.MAX_PARK_NS);
  }
  
  /**
   * Busy-wait for a short period.
   */
  private spinWait(): void {
    // Simply burn CPU cycles for a very short time
    const end = performance.now() + 0.001; // 1 microsecond
    while (performance.now() < end) {
      // Empty loop
    }
  }
  
  /**
   * Yield execution to other threads.
   */
  private yieldThread(): void {
    if (typeof setImmediate !== 'undefined') {
      // Node.js environment
      setImmediate(() => {});
    } else {
      // Browser environment
      setTimeout(() => {}, 0);
    }
  }
  
  /**
   * Sleep for a short time.
   */
  private park(): void {
    const sleepMs = this.parkNs / 1_000_000;
    
    // In browser environments, we can use setTimeout
    if (typeof window !== 'undefined') {
      const start = performance.now();
      while (performance.now() - start < sleepMs) {
        // Empty loop for short sleeps
        this.yieldThread();
      }
      return;
    }
    
    // In Node.js, we can use a more accurate method
    if (typeof Atomics !== 'undefined') {
      const buffer = new SharedArrayBuffer(4);
      const view = new Int32Array(buffer);
      Atomics.wait(view, 0, 0, sleepMs);
    } else {
      // Fallback to standard setTimeout
      const start = performance.now();
      while (performance.now() - start < sleepMs) {
        this.yieldThread();
      }
    }
  }
}