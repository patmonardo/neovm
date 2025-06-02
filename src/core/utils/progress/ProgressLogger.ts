/**
 * Abstract progress logger with default method implementations.
 * Direct TypeScript translation of Java ProgressLogger interface.
 */
export abstract class ProgressLogger {
  public static readonly TASK_SEPARATOR = " :: ";
  public static readonly NO_MESSAGE = (): string | null => null;

  // Abstract methods that must be implemented
  public abstract getTask(): string;
  public abstract setTask(task: string): void;
  public abstract logProgress(msgFactory?: () => string | null): void;
  public abstract logProgress(
    progress: number,
    msgFactory?: () => string | null
  ): void;
  public abstract logMessage(msg: string): void;
  public abstract logDebug(msg: string): void;
  public abstract logWarning(msg: string): void;
  public abstract logError(msg: string): void;
  public abstract logFinishPercentage(): void;
  public abstract reset(newTaskVolume: number): number;
  public abstract release(): void;

  // Default implementations with overloads using default parameters
  public logStart(message: string = ""): void {
    this.logMessage((message + ProgressLogger.TASK_SEPARATOR + "Start").trim());
  }

  public logFinish(message: string = ""): ProgressLogger {
    this.logMessage((message + ProgressLogger.TASK_SEPARATOR + "Finished").trim());
    return this;
  }

  public logFinishWithFailure(message: string = ""): ProgressLogger {
    this.logMessage((message + ProgressLogger.TASK_SEPARATOR + "Failed").trim()
    );
    return this;
  }

  public logFinishSubtaskWithFailure(subTaskName: string): ProgressLogger {
    this.logFinishWithFailure();
    const endIndex = this.getTask().indexOf(
      ProgressLogger.TASK_SEPARATOR + subTaskName
    );
    if (endIndex === -1) {
      throw new Error("Unknown subtask: " + subTaskName);
    }
    const task = this.getTask().substring(0, endIndex);
    this.setTask(task);
    return this;
  }

  public startSubTask(subTaskName: string): ProgressLogger {
    this.setTask(this.getTask() + ProgressLogger.TASK_SEPARATOR + subTaskName);
    this.logStart();
    return this;
  }

  public finishSubTask(subTaskName: string): ProgressLogger {
    this.logFinish();
    const endIndex = this.getTask().lastIndexOf(
      ProgressLogger.TASK_SEPARATOR + subTaskName
    );
    if (endIndex === -1) {
      throw new Error("Unknown subtask: " + subTaskName);
    }
    const task = this.getTask().substring(0, endIndex);
    this.setTask(task);
    return this;
  }
}
