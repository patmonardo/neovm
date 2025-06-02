import { MemoryRange } from "@/mem";
import { Concurrency } from "@/concurrency";
import { Status } from "./Status";
import { Progress } from "./Progress";
import { TaskVisitor } from "./TaskVisitor";

/**
 * Base class for all tasks in the progress tracking system.
 * Handles task hierarchy, state management, timing, and memory estimation.
 */
export class Task {
  public static readonly UNKNOWN_VOLUME = -1;
  public static readonly UNKNOWN_CONCURRENCY = -1;
  public static readonly NOT_STARTED = -1;
  public static readonly NOT_FINISHED = -1;

  private readonly description: string;
  private readonly subTasks: Task[];
  private status: Status = Status.PENDING;
  private startTime: number = Task.NOT_STARTED;
  private finishTime: number = Task.NOT_FINISHED;
  private estimatedMemoryRangeInBytes: MemoryRange = MemoryRange.empty();
  private maxConcurrency: number = Task.UNKNOWN_CONCURRENCY;

  constructor(description: string, subTasks: Task[] = []) {
    this.description = description;
    this.subTasks = [...subTasks]; // Defensive copy
  }

  /**
   * Get task description.
   */
  public getDescription(): string {
    return this.description;
  }

  /**
   * Get subtasks.
   */
  public getSubTasks(): Task[] {
    return this.subTasks;
  }

  /**
   * Get current status.
   */
  public getStatus(): Status {
    return this.status;
  }

  /**
   * Get next pending subtask.
   */
  public nextSubtask(): Task {
    this.validateTaskIsRunning();
    return this.nextSubTaskAfterValidation();
  }

  /**
   * Start the task.
   */
  public start(): void {
    if (this.status !== Status.PENDING) {
      throw new Error(
        `Task '${this.description}' with state ${this.status} cannot be started`
      );
    }
    this.status = Status.RUNNING;
    this.startTime = Date.now();
  }

  /**
   * Finish the task.
   */
  public finish(): void {
    if (this.status !== Status.RUNNING) {
      throw new Error(
        `Task '${this.description}' with state ${this.status} cannot be finished`
      );
    }
    this.status = Status.FINISHED;
    this.finishTime = Date.now();
  }

  /**
   * Cancel the task.
   */
  public cancel(): void {
    if (this.status === Status.FINISHED) {
      throw new Error(
        `Task '${this.description}' with state ${this.status} cannot be canceled`
      );
    }
    this.status = Status.CANCELED;
  }

  /**
   * Mark task as failed.
   */
  public fail(): void {
    this.status = Status.FAILED;
  }

  /**
   * Get aggregated progress from all subtasks.
   */
  public getProgress(): Progress {
    let totalVolume = 0;
    let totalCurrentProgress = 0; // ← Updated name
    let hasUnknownVolume = false;

    for (const subtask of this.subTasks) {
      const childProgress = subtask.getProgress();

      if (
        childProgress.getVolume() === Task.UNKNOWN_VOLUME ||
        hasUnknownVolume
      ) {
        hasUnknownVolume = true;
      } else {
        totalVolume += childProgress.getVolume();
      }

      totalCurrentProgress += childProgress.getCurrentProgress(); // ← Updated call
    }

    return Progress.of(
      totalCurrentProgress, // ← Updated parameter
      hasUnknownVolume ? Task.UNKNOWN_VOLUME : totalVolume
    );
  }
  /**
   * Set task volume (only valid for leaf tasks).
   */
  public setVolume(volume: number): void {
    throw new Error(
      `Should only be called on a leaf task, but task '${this.description}' is not a leaf`
    );
  }

  /**
   * Log progress (only valid for leaf tasks).
   */
  public logProgress(value: number = 1): void {
    throw new Error(
      `Should only be called on a leaf task, but task '${this.description}' is not a leaf`
    );
  }

  /**
   * Accept visitor for traversal.
   */
  public visit(taskVisitor: TaskVisitor): void {
    if (taskVisitor.visitIntermediateTask) {
      taskVisitor.visitIntermediateTask(this);
    }
  }

  /**
   * Get task start time.
   */
  public getStartTime(): number {
    return this.startTime;
  }

  /**
   * Get task finish time.
   */
  public getFinishTime(): number {
    return this.finishTime;
  }

  /**
   * Check if task has not started yet.
   */
  public hasNotStarted(): boolean {
    return (
      this.status === Status.PENDING || this.startTime === Task.NOT_STARTED
    );
  }

  /**
   * Get estimated memory range.
   */
  public getEstimatedMemoryRangeInBytes(): MemoryRange {
    return this.estimatedMemoryRangeInBytes;
  }

  /**
   * Get maximum concurrency.
   */
  public getMaxConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Set maximum concurrency (propagates to subtasks).
   */
  public setMaxConcurrency(maxConcurrency: Concurrency): void {
    this.maxConcurrency = maxConcurrency.value();

    this.subTasks.forEach((task) => {
      if (task.getMaxConcurrency() === Task.UNKNOWN_CONCURRENCY) {
        task.setMaxConcurrency(maxConcurrency);
      }
    });
  }

  /**
   * Set estimated memory range.
   */
  public setEstimatedMemoryRangeInBytes(memoryRangeInBytes: MemoryRange): void {
    this.estimatedMemoryRangeInBytes = memoryRangeInBytes;
  }

  /**
   * Get task duration in milliseconds.
   */
  public getDuration(): number {
    if (this.startTime === Task.NOT_STARTED) {
      return 0;
    }

    const endTime =
      this.finishTime === Task.NOT_FINISHED ? Date.now() : this.finishTime;
    return endTime - this.startTime;
  }

  /**
   * Check if task is terminal (has no subtasks).
   */
  public isLeaf(): boolean {
    return this.subTasks.length === 0;
  }

  /**
   * Check if task is running.
   */
  public isRunning(): boolean {
    return this.status === Status.RUNNING;
  }

  /**
   * Render task hierarchy as string.
   */
  public render(): string {
    const sb: string[] = [];
    Task.renderTask(sb, this, 0);
    return sb.join("");
  }

  /**
   * Protected method for finding next subtask (can be overridden).
   */
  protected nextSubTaskAfterValidation(): Task {
    // Check if any subtask is still running
    const runningTask = this.subTasks.find(
      (t) => t.getStatus() === Status.RUNNING
    );
    if (runningTask) {
      throw new Error(
        "Cannot move to next subtask, because some subtasks are still running"
      );
    }

    // Find next pending subtask
    const nextTask = this.subTasks.find(
      (t) => t.getStatus() === Status.PENDING
    );
    if (!nextTask) {
      throw new Error("No more pending subtasks");
    }

    return nextTask;
  }

  /**
   * Validate that task is in running state.
   */
  private validateTaskIsRunning(): void {
    if (this.status !== Status.RUNNING) {
      throw new Error(
        `Cannot retrieve next subtask, task '${this.description}' is not running.`
      );
    }
  }

  /**
   * Static method for rendering task hierarchy.
   */
  private static renderTask(sb: string[], task: Task, depth: number): void {
    // Add indentation
    sb.push("\t".repeat(Math.max(0, depth - 1)));

    // Add tree structure
    if (depth > 0) {
      sb.push("|-- ");
    }

    // Add task info
    sb.push(`${task.description}(${task.status})\n`);

    // Render subtasks
    task.subTasks.forEach((subtask) => {
      Task.renderTask(sb, subtask, depth + 1);
    });
  }
}
