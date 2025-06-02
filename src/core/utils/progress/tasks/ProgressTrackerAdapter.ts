import { MemoryRange } from '@/mem';
import { Concurrency } from '@/concurrency';
import { LogLevel } from './LogLevel';
import { ProgressTracker } from './ProgressTracker';

/**
 * Base adapter for decorating ProgressTracker behavior.
 * Simple delegation pattern - extend and override what you need.
 */
export abstract class ProgressTrackerAdapter implements ProgressTracker {
  protected readonly delegate: ProgressTracker;

  constructor(delegate: ProgressTracker) {
    this.delegate = delegate;
  }

  // Resource management
  public setEstimatedResourceFootprint(memoryEstimationInBytes: MemoryRange): void {
    this.delegate.setEstimatedResourceFootprint(memoryEstimationInBytes);
  }

  public requestedConcurrency(concurrency: Concurrency): void {
    this.delegate.requestedConcurrency(concurrency);
  }

  // Task hierarchy
  public beginSubTask(): void;
  public beginSubTask(taskVolume: number): void;
  public beginSubTask(expectedTaskDescription: string): void;
  public beginSubTask(expectedTaskDescription: string, taskVolume: number): void;
  public beginSubTask(taskVolumeOrDescription?: number | string, taskVolume?: number): void {
    (this.delegate as any).beginSubTask(taskVolumeOrDescription, taskVolume);
  }

  public endSubTask(): void;
  public endSubTask(expectedTaskDescription: string): void;
  public endSubTask(expectedTaskDescription?: string): void {
    (this.delegate as any).endSubTask(expectedTaskDescription);
  }

  public endSubTaskWithFailure(): void;
  public endSubTaskWithFailure(expectedTaskDescription: string): void;
  public endSubTaskWithFailure(expectedTaskDescription?: string): void {
    (this.delegate as any).endSubTaskWithFailure(expectedTaskDescription);
  }

  // Progress reporting
  public logProgress(value?: number): void;
  public logProgress(value: number, messageTemplate: string): void;
  public logProgress(value?: number, messageTemplate?: string): void {
    (this.delegate as any).logProgress(value, messageTemplate);
  }

  public setVolume(volume: number): void {
    this.delegate.setVolume(volume);
  }

  public currentVolume(): number {
    return this.delegate.currentVolume();
  }

  // Step-based progress
  public setSteps(steps: number): void {
    this.delegate.setSteps(steps);
  }

  public logSteps(steps: number): void {
    this.delegate.logSteps(steps);
  }

  // Logging
  public logDebug(message: string): void {
    this.delegate.logDebug(message);
  }

  public logMessage(level: LogLevel, message: string): void {
    this.delegate.logMessage(level, message);
  }

  public logInfo(message: string): void {
    this.delegate.logInfo(message);
  }

  public logWarning(message: string): void {
    this.delegate.logWarning(message);
  }

  // Lifecycle
  public release(): void {
    this.delegate.release();
  }
}
