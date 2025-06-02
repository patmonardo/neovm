import { Log } from "@/utils/Log";
import { Concurrency } from "@/concurrency";
import { Task } from "./tasks/Task";
import { AtomicNumber } from "@/concurrency";
import { ProgressLogger } from "./ProgressLogger";

/**
 * Progress logger that batches updates for performance in concurrent scenarios.
 * Extends ProgressLogger abstract class.
 */
export class BatchingProgressLogger extends ProgressLogger {
  public static readonly MAXIMUM_LOG_INTERVAL = Math.pow(2, 13);

  private readonly log: Log;
  private readonly concurrency: Concurrency;
  private taskVolume: number;
  private batchSize: number;
  private taskName: string;
  private readonly progressCounter: AtomicNumber;
  private callCounter: number = 0;
  private globalPercentage: number;

  /**
   * Calculate optimal batch size for task and concurrency level.
   */
  private static calculateBatchSize(
    task: Task,
    concurrency: Concurrency
  ): number {
    return BatchingProgressLogger.calculateBatchSizeForVolume(
      Math.max(1, task.getProgress().getVolume()),
      concurrency
    );
  }

  /**
   * Calculate batch size for given volume and concurrency.
   */
  public static calculateBatchSizeForVolume(
    taskVolume: number,
    concurrency: Concurrency
  ): number {
    // Target 100 logs per full run (every 1 percent)
    let batchSize = Math.floor(taskVolume / 100);
    // Split batchSize into thread-local chunks
    batchSize = Math.floor(batchSize / concurrency.value());
    // BatchSize needs to be a power of two
    return Math.max(1, this.nextHighestPowerOfTwo(batchSize));
  }

  /**
   * Constructor with automatic batch size calculation.
   */
  constructor(log: Log, task: Task, concurrency: Concurrency);
  constructor(
    log: Log,
    task: Task,
    batchSize: number,
    concurrency: Concurrency
  );
  constructor(
    log: Log,
    task: Task,
    batchSizeOrConcurrency: number | Concurrency,
    concurrency?: Concurrency
  ) {
    super();

    this.log = log;

    if (typeof batchSizeOrConcurrency === "number" && concurrency) {
      // constructor(log, task, batchSize, concurrency)
      this.batchSize = batchSizeOrConcurrency;
      this.concurrency = concurrency;
    } else {
      // constructor(log, task, concurrency)
      this.concurrency = batchSizeOrConcurrency as Concurrency;
      this.batchSize = BatchingProgressLogger.calculateBatchSize(
        task,
        this.concurrency
      );
    }

    this.taskVolume = task.getProgress().getVolume();
    this.taskName = task.getDescription();
    this.progressCounter = new AtomicNumber(0);
    this.callCounter = 0;
    this.globalPercentage = -1;
  }

  public getTask(): string {
    return this.taskName;
  }

  public setTask(task: string): void {
    this.taskName = task;
  }

  public logProgress(): void;
  public logProgress(progress: number): void;
  public logProgress(progress?: number): void {
    if (typeof progress === "number") {
      this.logProgressWithValue(progress);
    } else {
      this.logProgressIncrement();
    }
  }

  /**
   * Log a single unit of progress (most common case).
   * Batches updates for performance.
   */
  private logProgressIncrement(): void {
    this.callCounter++;

    if (this.callCounter >= this.batchSize) {
      this.progressCounter.addAndGet(this.callCounter);
      this.doLogPercentage();
      this.callCounter = 0;
    }
  }

  /**
   * Log a specific amount of progress (bulk operations).
   */
  private logProgressWithValue(progress: number): void {
    if (progress === 0) {
      return;
    }

    this.callCounter += progress;

    if (this.callCounter >= this.batchSize) {
      this.progressCounter.addAndGet(this.callCounter);
      this.doLogPercentage();
      this.callCounter = this.callCounter & (this.batchSize - 1);
    }
  }

  /**
   * Handle percentage logging.
   */
  private doLogPercentage(): void {
    const currentProgress = this.progressCounter.get();
    const nextPercentage = Math.floor(
      (currentProgress / this.taskVolume) * 100
    );

    if (this.globalPercentage < nextPercentage && this.globalPercentage < 100) {
      this.globalPercentage = nextPercentage;
      this.logProgressPercentage(nextPercentage);
    }
  }

  public logMessage(message: string): void {
    if (message) {
      this.log.info(
        `[${this.getCurrentThreadName()}] ${this.taskName} ${message}`
      );
    }
  }

  public logDebug(message: string): void {
    if (this.log.isDebugEnabled && this.log.isDebugEnabled()) {
      if (message) {
        this.log.debug(
          `[${this.getCurrentThreadName()}] ${this.taskName} ${message}`
        );
      }
    }
  }

  public logWarning(message: string): void {
    this.log.warn(
      `[${this.getCurrentThreadName()}] ${this.taskName} ${message}`
    );
  }

  public logError(message: string): void {
    this.log.error(
      `[${this.getCurrentThreadName()}] ${this.taskName} ${message}`
    );
  }

  public logFinishPercentage(): void {
    if (this.globalPercentage < 100) {
      this.logProgress(100);
    }
  }

  public reset(newTaskVolume: number): number {
    const remainingVolume = this.taskVolume - this.progressCounter.get();
    this.taskVolume = newTaskVolume;
    this.batchSize = BatchingProgressLogger.calculateBatchSizeForVolume(
      newTaskVolume,
      this.concurrency
    );
    this.progressCounter.set(0);
    this.globalPercentage = -1;
    return remainingVolume;
  }

  public release(): void {}

  private logProgressPercentage(nextPercentage: number): void {
    this.log.info(
      `[${this.getCurrentThreadName()}] ${this.taskName} ${nextPercentage}%`
    );
  }

  private getCurrentThreadName(): string {
    // In browser/Node.js, we don't have thread names like Java
    // Use a simple identifier or worker name if available
    if (typeof self !== "undefined" && "name" in self) {
      return (self as any).name || "main";
    }
    return "main";
  }

  /**
   * Calculate next highest power of two.
   */
  private static nextHighestPowerOfTwo(v: number): number {
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
  }
}
