import { Concurrency } from '@/concurrency/Concurrency';
import { ProgressTracker } from './tasks/ProgressTracker';
import { ProgressTrackerAdapter } from './tasks/ProgressTrackerAdapter';
import { Task } from './tasks/Task';
import { BatchingProgressLogger } from './BatchingProgressLogger';

/**
 * Factory for creating batched progress trackers that optimize high-frequency updates.
 */
export class BatchingTaskProgressTracker {
  /**
   * Private constructor - static factory class.
   */
  private constructor() {}

  /**
   * Create a batched progress tracker.
   * Uses WithLogging for known volumes, WithoutLogging for unknown volumes.
   */
  public static create(delegate: ProgressTracker, volume: number, concurrency: Concurrency): ProgressTracker {
    return volume === Task.UNKNOWN_VOLUME
      ? new WithoutLogging(delegate)
      : new WithLogging(delegate, volume, concurrency);
  }
}

/**
 * Progress tracker that batches updates for performance.
 * Only logs progress when batch size is reached.
 */
class WithLogging extends ProgressTrackerAdapter {
  private readonly batchSize: number;
  private rowCounter: number;

  constructor(delegate: ProgressTracker, volume: number, concurrency: Concurrency) {
    super(delegate);
    this.batchSize = BatchingProgressLogger.calculateBatchSizeForVolume(volume, concurrency);
    this.rowCounter = 0;
  }

  public logProgress(): void {
    if (++this.rowCounter === this.batchSize) {
      super.logProgress(this.batchSize);
      this.rowCounter = 0;
    }
  }

  /**
   * Get current batch size for testing.
   */
  public getBatchSize(): number {
    return this.batchSize;
  }

  /**
   * Get current row counter for testing.
   */
  public getRowCounter(): number {
    return this.rowCounter;
  }
}

/**
 * Progress tracker that ignores all progress updates.
 * Used when volume is unknown - no point in batching.
 */
class WithoutLogging extends ProgressTrackerAdapter {
  constructor(delegate: ProgressTracker) {
    super(delegate);
  }

  public logProgress(): void;
  public logProgress(value: number): void;
  public logProgress(value?: number, messageTemplate?: string): void {
  }
}
