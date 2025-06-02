import { MemoryRange } from "@/mem";
import { Concurrency } from "@/concurrency";
import { LogLevel } from "./LogLevel";
import { Task } from "./Task";

/**
 * Core progress tracking interface for algorithms.
 * Manages task hierarchy, progress logging, and resource estimation.
 */
export interface ProgressTracker {
  // Resource management
  setEstimatedResourceFootprint(memoryEstimationInBytes: MemoryRange): void;
  requestedConcurrency(concurrency: Concurrency): void;

  // Task hierarchy management
  beginSubTask(): void;
  beginSubTask(taskVolume: number): void;
  beginSubTask(expectedTaskDescription: string): void;
  beginSubTask(expectedTaskDescription: string, taskVolume: number): void;

  endSubTask(): void;
  endSubTask(expectedTaskDescription: string): void;
  endSubTaskWithFailure(): void;
  endSubTaskWithFailure(expectedTaskDescription: string): void;

  // Progress reporting
  logProgress(value?: number): void;
  logProgress(value: number, messageTemplate: string): void;
  setVolume(volume: number): void;
  currentVolume(): number;

  // Step-based progress
  setSteps(steps: number): void;
  logSteps(steps: number): void;

  // Logging
  logDebug(message: string): void;
  logMessage(level: LogLevel, message: string): void;
  logInfo(message: string): void;
  logWarning(message: string): void;

  // Lifecycle
  release(): void;
}

/**
 * Empty implementation - all operations are no-ops.
 * Singleton null object pattern for performance.
 */
export class EmptyProgressTracker implements ProgressTracker {
  public static readonly INSTANCE = new EmptyProgressTracker();

  private constructor() {}

  public setEstimatedResourceFootprint(): void {}
  public requestedConcurrency(): void {}
  public beginSubTask(): void {}
  public endSubTask(): void {}
  public endSubTaskWithFailure(): void {}
  public logProgress(): void {}
  public setVolume(): void {}
  public currentVolume(): number {
    return Task.UNKNOWN_VOLUME;
  }
  public setSteps(): void {}
  public logSteps(): void {}
  public logMessage(): void {}
  public logDebug(): void {}
  public logInfo(message: string): void {
    this.logMessage();
  }
  public logWarning(message: string): void {
    this.logMessage();
  }
  public release(): void {}
}

/**
 * Constant for null tracker convenience.
 */
export const NULL_TRACKER = EmptyProgressTracker.INSTANCE;
