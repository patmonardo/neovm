import { MemoryRange } from "@/mem";
import { Concurrency } from "@/concurrency";
import { Log } from "@/utils/Log";
import { LogLevel } from "./LogLevel";
import { JobId } from "../JobId";
import { Task } from "./Task";
import { TaskProgressLogger } from "./TaskProgressLogger";
import { TaskRegistry } from "../TaskRegistry";
import { TaskRegistryFactory } from "../TaskRegistryFactory";
import { ProgressTracker } from "./ProgressTracker";
import {
  UserLogRegistry,
  UserLogRegistryFactory,
} from "@/core/utils/warnings";
import { GdsFeatureToggles } from "@/utils/GdsFeatureToggles";
import { Status } from "./Status";

/**
 * Main implementation of ProgressTracker that manages task hierarchy,
 * progress logging, and integrates with task registry.
 */
export class TaskProgressTracker implements ProgressTracker {
  private static readonly UNKNOWN_STEPS = -1;

  private readonly baseTask: Task;
  private readonly taskRegistry: TaskRegistry;
  private readonly userLogRegistry: UserLogRegistry;
  private readonly taskProgressLogger: TaskProgressLogger;
  private readonly nestedTasks: Task[] = []; // Stack implementation
  private readonly onError: (error: Error) => void;

  protected currentTask: Task | null = null;
  private currentTotalSteps: number = TaskProgressTracker.UNKNOWN_STEPS;
  private progressLeftOvers: number = 0;

  /**
   * Main constructor - All parameters explicit
   */
  constructor(
    baseTask: Task,
    jobId: JobId,
    taskRegistryFactory: TaskRegistryFactory,
    taskProgressLogger: TaskProgressLogger,
    userLogRegistryFactory: UserLogRegistryFactory
  ) {
    this.baseTask = baseTask;
    this.taskRegistry = taskRegistryFactory.newInstance(jobId);
    this.taskProgressLogger = taskProgressLogger;
    this.userLogRegistry = userLogRegistryFactory.newInstance();

    // Error handling strategy
    if (GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS) {
      this.onError = (error: Error) => {
        throw error;
      };
    } else {
      let didLog = false;
      this.onError = (error: Error) => {
        if (!didLog) {
          this.taskProgressLogger.logWarning(`:: ${error.message}`);
          didLog = true;
        }
      };
    }
  }

  public setEstimatedResourceFootprint(memoryRangeInBytes: MemoryRange): void {
    this.baseTask.setEstimatedMemoryRangeInBytes(memoryRangeInBytes);
  }

  public requestedConcurrency(concurrency: Concurrency): void {
    this.baseTask.setMaxConcurrency(concurrency);
  }

  public beginSubTask(): void;
  public beginSubTask(taskVolume: number): void;
  public beginSubTask(expectedTaskDescription: string): void;
  public beginSubTask(
    expectedTaskDescription: string,
    taskVolume: number
  ): void;
  public beginSubTask(
    taskVolumeOrDescription?: number | string,
    taskVolume?: number
  ): void {
    this.registerBaseTask();

    let nextTask: Task;
    if (this.currentTask) {
      this.nestedTasks.push(this.currentTask);
      try {
        nextTask = this.currentTask.nextSubtask();
      } catch (error) {
        this.onError(error as Error);
        nextTask = this.baseTask;
      }
    } else {
      nextTask = this.baseTask;
    }

    nextTask.start();
    this.taskProgressLogger.logBeginSubTask(nextTask, this.parentTask());
    this.currentTask = nextTask;
    this.currentTotalSteps = TaskProgressTracker.UNKNOWN_STEPS;
    this.progressLeftOvers = 0;

    // Handle overloaded parameters
    if (typeof taskVolumeOrDescription === "string") {
      this.assertSubTask(taskVolumeOrDescription);
      if (taskVolume !== undefined) {
        this.setVolume(taskVolume);
      }
    } else if (typeof taskVolumeOrDescription === "number") {
      this.setVolume(taskVolumeOrDescription);
    }
  }

  public endSubTask(): void;
  public endSubTask(expectedTaskDescription: string): void;
  public endSubTask(expectedTaskDescription?: string): void {
    if (expectedTaskDescription) {
      this.assertSubTask(expectedTaskDescription);
    }

    this.requireCurrentTask();
    if (this.currentTask) {
      this.taskProgressLogger.logEndSubTask(
        this.currentTask,
        this.parentTask()
      );
      this.currentTask.finish();

      if (this.nestedTasks.length === 0) {
        this.currentTask = null;
        this.release();
      } else {
        this.currentTask = this.nestedTasks.pop()!;
      }
    }
  }

  public endSubTaskWithFailure(): void;
  public endSubTaskWithFailure(expectedTaskDescription: string): void;
  public endSubTaskWithFailure(expectedTaskDescription?: string): void {
    if (expectedTaskDescription) {
      this.assertSubTask(expectedTaskDescription);
    }

    this.requireCurrentTask();
    if (this.currentTask) {
      this.currentTask.fail();
      this.taskProgressLogger.logEndSubTaskWithFailure(
        this.currentTask,
        this.parentTask()
      );

      if (this.nestedTasks.length === 0) {
        this.currentTask = null;
        this.release();
      } else {
        this.currentTask = this.nestedTasks.pop()!;
        this.endSubTaskWithFailure();
      }
    }
  }

  public logProgress(value: number): void;
  public logProgress(value: number, messageTemplate: string): void;
  public logProgress(value: number = 1, messageTemplate?: string): void {
    this.requireCurrentTask();
    if (this.currentTask) {
      this.currentTask.logProgress(value);

      if (messageTemplate) {
        this.taskProgressLogger.logMessage(
          this.formatWithLocale(messageTemplate, value)
        );
      } else {
        this.taskProgressLogger.logProgress(value);
      }
    }
  }

  public setVolume(volume: number): void {
    this.requireCurrentTask();
    if (this.currentTask) {
      this.currentTask.setVolume(volume);
      this.taskProgressLogger.reset(volume);
    }
  }

  public currentVolume(): number {
    this.requireCurrentTask();
    return this.currentTask?.getProgress().volume ?? Task.UNKNOWN_VOLUME;
  }

  public setSteps(steps: number): void {
    if (steps <= 0) {
      throw new Error(
        this.formatWithLocale(
          "Total steps for task must be at least 1 but was %d",
          steps
        )
      );
    }
    this.currentTotalSteps = steps;
  }

  public logSteps(steps: number): void {
    this.requireCurrentTask();
    if (this.currentTask) {
      const volume = this.currentTask.getProgress().volume;
      const progress =
        (steps * volume) / this.currentTotalSteps + this.progressLeftOvers;
      const longProgress = Math.floor(progress);
      this.progressLeftOvers = progress - longProgress;
      this.logProgress(longProgress);
    }
  }

  public logMessage(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.WARNING:
        this.userLogRegistry.addWarningToLog(this.baseTask, message);
        this.taskProgressLogger.logWarning(":: " + message);
        break;
      case LogLevel.INFO:
        this.taskProgressLogger.logMessage(":: " + message);
        break;
      case LogLevel.DEBUG:
        this.taskProgressLogger.logDebug(":: " + message);
        break;
      default:
        throw new Error("Unknown log level " + level);
    }
  }

  public logDebug(message: string): void {
    if (typeof message === "string") {
      this.logMessage(LogLevel.DEBUG, message);
    }
  }

  public logInfo(message: string): void {
    this.logMessage(LogLevel.INFO, message);
  }

  public logWarning(message: string): void {
    this.logMessage(LogLevel.WARNING, message);
  }

  public release(): void {
    this.taskRegistry.unregisterTask();
    this.taskProgressLogger.release();
    this.validateTaskNotRunning();
  }

  /**
   * Get current subtask (test-only method).
   */
  public currentSubTask(): Task {
    this.requireCurrentTask();
    if (!this.currentTask) {
      throw new Error("No current task");
    }
    return this.currentTask;
  }

  private parentTask(): Task | null {
    return this.nestedTasks.length === 0
      ? null
      : this.nestedTasks[this.nestedTasks.length - 1];
  }

  private registerBaseTask(): void {
    if (!this.taskRegistry.containsTask(this.baseTask)) {
      this.taskRegistry.registerTask(this.baseTask);
    }
  }

  private requireCurrentTask(): void {
    if (!this.currentTask) {
      this.onError(
        new Error(
          "Tried to log progress, but there are no running tasks being tracked"
        )
      );
    }
  }

  private validateTaskNotRunning(): void {
    if (this.baseTask.getStatus() === Status.RUNNING) {
      const message = this.formatWithLocale(
        "Attempted to release algorithm, but task %s is still running",
        this.baseTask.getDescription()
      );

      // In development, throw assertion error
      if (process.env.NODE_ENV === "development") {
        console.assert(false, message);
      }

      this.taskProgressLogger.logWarning(message);
    }
  }

  private assertSubTask(subTaskSubString: string): void {
    if (this.currentTask) {
      const currentTaskDescription = this.currentTask.getDescription();
      const containsSubstring =
        currentTaskDescription.includes(subTaskSubString);

      if (process.env.NODE_ENV === "development") {
        console.assert(
          containsSubstring,
          this.formatWithLocale(
            "Expected task name to contain `%s`, but was `%s`",
            subTaskSubString,
            currentTaskDescription
          )
        );
      }
    }
  }

  private formatWithLocale(template: string, ...args: any[]): string {
    let result = template;
    args.forEach((arg, index) => {
      result = result.replace(/%[sd]/, String(arg));
    });
    return result;
  }
}

/**
 * Factory for creating TaskProgressTracker instances.
 */
export class TaskProgressTrackerFactory {
  /**
   * Create a basic TaskProgressTracker.
   */
  public static create(
    baseTask: Task,
    log: Log,
    concurrency: Concurrency,
    taskRegistryFactory: TaskRegistryFactory
  ): TaskProgressTracker {
    const jobId = new JobId();
    const taskProgressLogger = new TaskProgressLogger(
      log,
      baseTask,
      concurrency
    );
    const userLogRegistryFactory = {
      newInstance: () => UserLogRegistry.empty(),
    };

    return new TaskProgressTracker(
      baseTask,
      jobId,
      taskRegistryFactory,
      taskProgressLogger,
      userLogRegistryFactory
    );
  }

  /**
   * Create TaskProgressTracker with custom job ID and user log factory.
   */
  public static createWithJobId(
    baseTask: Task,
    log: Log,
    concurrency: Concurrency,
    jobId: JobId,
    taskRegistryFactory: TaskRegistryFactory,
    userLogRegistryFactory?: UserLogRegistryFactory
  ): TaskProgressTracker {
    const taskProgressLogger = new TaskProgressLogger(
      log,
      baseTask,
      concurrency
    );
    const userLogFactory = userLogRegistryFactory || {
      newInstance: () => UserLogRegistry.empty(),
    };

    return new TaskProgressTracker(
      baseTask,
      jobId,
      taskRegistryFactory,
      taskProgressLogger,
      userLogFactory
    );
  }

  /**
   * Create TaskProgressTracker for testing with custom logger.
   */
  public static createForTesting(
    baseTask: Task,
    jobId: JobId,
    taskRegistryFactory: TaskRegistryFactory,
    taskProgressLogger: TaskProgressLogger,
    userLogRegistryFactory?: UserLogRegistryFactory
  ): TaskProgressTracker {
    const userLogFactory = userLogRegistryFactory || {
      newInstance: () => UserLogRegistry.empty(),
    };

    return new TaskProgressTracker(
      baseTask,
      jobId,
      taskRegistryFactory,
      taskProgressLogger,
      userLogFactory
    );
  }
}
