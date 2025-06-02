import { Task } from "./Task";
import { TaskVisitor } from "./TaskVisitor";
import { Status } from "./Status";
import { Progress } from "./Progress";

/**
 * Execution modes for iterative tasks.
 */
export enum IterativeTaskMode {
  /**
   * Upper bound but can terminate early.
   */
  DYNAMIC = "DYNAMIC",

  /**
   * Unbounded - can keep adding iterations.
   */
  OPEN = "OPEN",

  /**
   * Upper bound and will execute exactly n times.
   */
  FIXED = "FIXED",
}

/**
 * Task that executes iterations of subtasks.
 * Supports dynamic, open, and fixed iteration modes.
 */
export class IterativeTask extends Task {
  private readonly subTasksSupplier: () => Task[];
  private readonly mode: IterativeTaskMode;
  private readonly maxIterations: number;

  /**
   * Create an iterative task.
   * @param description Task description
   * @param subTasks Unrolled list of subtasks for DYNAMIC and FIXED modes
   * @param subTasksSupplier Supplier for creating new iteration subtasks
   * @param mode Execution mode
   */
  constructor(
    description: string,
    subTasks: Task[],
    subTasksSupplier: () => Task[],
    mode: IterativeTaskMode
  ) {
    super(description, subTasks);
    this.subTasksSupplier = subTasksSupplier;
    this.mode = mode;
    this.maxIterations = Math.floor(
      this.getSubTasks().length / subTasksSupplier().length
    );
  }

  public getProgress(): Progress {
    const progress = super.getProgress();

    // For OPEN mode, show unknown volume if not finished
    if (
      this.mode === IterativeTaskMode.OPEN &&
      this.getStatus() !== Status.FINISHED
    ) {
      return Progress.of(
        progress.getCurrentProgress(),
        Task.UNKNOWN_VOLUME
      );
    }

    return progress;
  }

  protected nextSubTaskAfterValidation(): Task {
    // Check if any subtask is still running
    const runningTask = this.getSubTasks().find(
      (t) => t.getStatus() === Status.RUNNING
    );
    if (runningTask) {
      throw new Error(
        `Cannot move to next subtask, because subtask '${runningTask.getDescription()}' is still running`
      );
    }

    // Find next pending subtask
    const nextSubtask = this.getSubTasks().find(
      (t) => t.getStatus() === Status.PENDING
    );

    if (nextSubtask) {
      return nextSubtask;
    } else if (this.mode === IterativeTaskMode.OPEN) {
      // For OPEN mode, create new iteration tasks
      const newIterationTasks = this.subTasksSupplier();
      this.getSubTasks().push(...newIterationTasks);
      return newIterationTasks[0];
    } else {
      throw new Error("No more pending subtasks");
    }
  }

  public finish(): void {
    super.finish();

    // Cancel any remaining pending subtasks
    this.getSubTasks().forEach((task) => {
      if (task.getStatus() === Status.PENDING) {
        task.cancel();
      }
    });
  }

  /**
   * Get current iteration number (0-based).
   */
  public getCurrentIteration(): number {
    const finishedTasks = this.getSubTasks().filter(
      (t) => t.getStatus() === Status.FINISHED
    ).length;
    const tasksPerIteration = this.subTasksSupplier().length;
    return Math.floor(finishedTasks / tasksPerIteration);
  }

  /**
   * Get the execution mode.
   */
  public getMode(): IterativeTaskMode {
    return this.mode;
  }

  /**
   * Get maximum iterations (for DYNAMIC and FIXED modes).
   */
  public getMaxIterations(): number {
    return this.maxIterations;
  }

  /**
   * Get tasks per iteration.
   */
  public getTasksPerIteration(): number {
    return this.subTasksSupplier().length;
  }

  /**
   * Check if more iterations can be added (OPEN mode only).
   */
  public canAddMoreIterations(): boolean {
    return (
      this.mode === IterativeTaskMode.OPEN &&
      this.getStatus() !== Status.FINISHED
    );
  }

  /**
   * Add a new iteration (OPEN mode only).
   */
  public addIteration(): Task[] {
    if (!this.canAddMoreIterations()) {
      throw new Error("Cannot add more iterations in current mode or state");
    }

    const newTasks = this.subTasksSupplier();
    this.getSubTasks().push(...newTasks);
    return newTasks;
  }

  public visit(taskVisitor: TaskVisitor): void {
    if (taskVisitor.visitIterativeTask) {
      taskVisitor.visitIterativeTask(this);
    }
  }

  /**
   * Get iteration progress summary.
   */
  public getIterationSummary(): {
    currentIteration: number;
    maxIterations: number;
    mode: IterativeTaskMode;
    tasksPerIteration: number;
    totalTasks: number;
    completedTasks: number;
  } {
    return {
      currentIteration: this.getCurrentIteration(),
      maxIterations: this.maxIterations,
      mode: this.mode,
      tasksPerIteration: this.getTasksPerIteration(),
      totalTasks: this.getSubTasks().length,
      completedTasks: this.getSubTasks().filter(
        (t) => t.getStatus() === Status.FINISHED
      ).length,
    };
  }
}
