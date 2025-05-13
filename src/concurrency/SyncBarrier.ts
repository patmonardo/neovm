import { BackoffIdleStrategy } from './BackoffIdleStrategy';

/**
 * Synchronization barrier for coordinating concurrent operations.
 * 
 * This class allows multiple workers to register themselves and provides
 * a mechanism to wait until all registered workers have finished before
 * proceeding with the next phase of work.
 */
export class SyncBarrier {
  // Use a shared array buffer for atomic operations across workers
  private readonly workerCountBuffer: SharedArrayBuffer;
  private readonly workerCount: Int32Array;
  
  private readonly isSyncingBuffer: SharedArrayBuffer;
  private readonly isSyncing: Int32Array;
  
  private readonly lockBuffer: SharedArrayBuffer;
  private readonly lock: Int32Array;

  private readonly idleStrategy: BackoffIdleStrategy;
  private readonly rejectAction: () => void;

  /**
   * Creates a new SyncBarrier with a default no-op reject action.
   * 
   * @returns A new SyncBarrier instance
   */
  public static create(): SyncBarrier {
    return new SyncBarrier(() => {});
  }

  /**
   * Creates a new SyncBarrier with the specified reject action.
   * 
   * @param rejectAction Action to execute when a worker is rejected
   * @returns A new SyncBarrier instance
   */
  public static create(rejectAction: () => void): SyncBarrier {
    return new SyncBarrier(rejectAction);
  }

  /**
   * Creates a new SyncBarrier.
   * 
   * @param rejectAction Action to execute when a worker is rejected
   */
  private constructor(rejectAction: () => void) {
    this.workerCountBuffer = new SharedArrayBuffer(4);
    this.workerCount = new Int32Array(this.workerCountBuffer);
    
    this.isSyncingBuffer = new SharedArrayBuffer(4);
    this.isSyncing = new Int32Array(this.isSyncingBuffer);
    
    this.lockBuffer = new SharedArrayBuffer(4);
    this.lock = new Int32Array(this.lockBuffer);
    
    this.idleStrategy = new BackoffIdleStrategy();
    this.rejectAction = rejectAction;
  }

  /**
   * Registers a new worker with the barrier.
   * Will reject the worker if synchronization is in progress.
   */
  public startWorker(): void {
    try {
      // Acquire the lock
      this.acquireLock();
      
      // Check if synchronization is in progress
      if (Atomics.load(this.isSyncing, 0) === 1) {
        this.rejectAction();
      }
      
      // Increment the worker count
      Atomics.add(this.workerCount, 0, 1);
    } finally {
      // Release the lock
      this.releaseLock();
    }
  }

  /**
   * Unregisters a worker from the barrier.
   */
  public stopWorker(): void {
    // Decrement the worker count
    Atomics.sub(this.workerCount, 0, 1);
    
    // Notify any waiting threads
    Atomics.notify(this.workerCount, 0);
  }

  /**
   * Initiates synchronization and waits for all workers to finish.
   */
  public sync(): void {
    try {
      // Acquire the lock
      this.acquireLock();
      
      // Set the syncing flag
      Atomics.store(this.isSyncing, 0, 1);
    } finally {
      // Release the lock
      this.releaseLock();
    }

    // Wait for all workers to finish
    while (Atomics.load(this.workerCount, 0) > 0) {
      this.idleStrategy.idle();
    }
  }

  /**
   * Resets the barrier to allow new workers to start.
   */
  public reset(): void {
    // Clear the syncing flag
    Atomics.store(this.isSyncing, 0, 0);
    
    // Reset the idle strategy
    this.idleStrategy.reset();
  }

  /**
   * Acquires the lock for atomic operations.
   */
  private acquireLock(): void {
    // Simple spin lock implementation
    // Attempt to exchange 0 with 1. If the old value was 0, we got the lock.
    while (Atomics.compareExchange(this.lock, 0, 0, 1) !== 0) {
      // If we didn't get the lock, wait a bit
      Atomics.wait(this.lock, 0, 1, 10);
    }
  }

  /**
   * Releases the lock.
   */
  private releaseLock(): void {
    // Set lock to 0 and notify waiting threads
    Atomics.store(this.lock, 0, 0);
    Atomics.notify(this.lock, 0);
  }
}