import { Log } from "@/utils/Log";
import { Concurrency } from "@/concurrency/Concurrency";
import { BatchingProgressLogger } from "../BatchingProgressLogger";
import { ProgressLogger } from "../ProgressLogger";
import { Task } from "./Task";
import { TaskVisitor } from "./TaskVisitor";
import { LeafTask } from "./LeafTask";
import { IterativeTask, IterativeTaskMode } from "./IterativeTask";

/**
 * Specialized progress logger for task-based progress tracking.
 * Extends BatchingProgressLogger with task hierarchy awareness.
 */
export class TaskProgressLogger extends BatchingProgressLogger {
  private readonly baseTask: Task;
  private readonly loggingLeafTaskVisitor: TaskVisitor;

  constructor(
    log: Log,
    baseTask: Task,
    concurrency: Concurrency,
    leafTaskVisitor?: TaskVisitor
  ) {
    super(log, baseTask, concurrency);
    this.baseTask = baseTask;
    this.loggingLeafTaskVisitor =
      leafTaskVisitor || new LoggingLeafTaskVisitor(this);
  }

  /**
   * Log the beginning of a subtask.
   */
  public logBeginSubTask(task: Task, parentTask: Task | null): void {
    const taskName = this.taskDescription(task, parentTask);

    if (parentTask === null) {
      this.logStart(taskName);
    } else {
      this.startSubTask(taskName);
    }

    this.reset(task.getProgress().volume);
  }

  /**
   * Log the successful completion of a subtask.
   */
  public logEndSubTask(task: Task, parentTask: Task | null): void {
    const taskName = this.taskDescription(task, parentTask);

    this.log100OnLeafTaskFinish(task);

    if (parentTask === null) {
      this.logFinish(taskName);
    } else {
      this.finishSubTask(taskName);
    }
  }

  /**
   * Log the failure of a subtask.
   */
  public logEndSubTaskWithFailure(task: Task, parentTask: Task | null): void {
    const taskName = this.taskDescription(task, parentTask);

    this.log100OnLeafTaskFinish(task);

    if (parentTask === null) {
      this.logFinishWithFailure(taskName);
    } else {
      this.logFinishSubtaskWithFailure(taskName);
    }
  }

  /**
   * Generate task name for bounded iterations (FIXED/DYNAMIC modes).
   */
  private boundedIterationsTaskName(
    iterativeTask: IterativeTask,
    task: Task
  ): string {
    const maxIterations = iterativeTask.getMaxIterations();
    const currentIteration = iterativeTask.getCurrentIteration() + 1;

    return `${this.taskDescription(
      task
    )} ${currentIteration} of ${maxIterations}`;
  }

  /**
   * Generate task name for unbounded iterations (OPEN mode).
   */
  private unboundedIterationsTaskName(
    iterativeTask: IterativeTask,
    task: Task
  ): string {
    const currentIteration = iterativeTask.getCurrentIteration() + 1;

    return `${this.taskDescription(task)} ${currentIteration}`;
  }

  /**
   * Generate appropriate task description based on parent context.
   */
  private taskDescription(task: Task, parentTask?: Task | null): string {
    if (parentTask instanceof IterativeTask) {
      const iterativeParentTask = parentTask as IterativeTask;
      const iterativeTaskMode = iterativeParentTask.getMode();

      switch (iterativeTaskMode) {
        case IterativeTaskMode.DYNAMIC:
        case IterativeTaskMode.FIXED:
          return this.boundedIterationsTaskName(iterativeParentTask, task);
        case IterativeTaskMode.OPEN:
          return this.unboundedIterationsTaskName(iterativeParentTask, task);
        default:
          throw new Error(`Enum value ${iterativeTaskMode} is not supported`);
      }
    } else {
      return this.taskDescriptionSimple(task);
    }
  }

  /**
   * Generate simple task description.
   */
  private taskDescriptionSimple(task: Task): string {
    return task === this.baseTask ? "" : task.getDescription();
  }

  /**
   * Log 100% completion for leaf tasks.
   */
  private log100OnLeafTaskFinish(task: Task): void {
    task.visit(this.loggingLeafTaskVisitor);
  }
}

/**
 * Visitor that logs 100% completion for leaf tasks.
 */
class LoggingLeafTaskVisitor implements TaskVisitor {
  private readonly progressLogger: ProgressLogger;

  constructor(progressLogger: ProgressLogger) {
    this.progressLogger = progressLogger;
  }

  public visitLeafTask(leafTask: LeafTask): void {
    this.progressLogger.logFinishPercentage();
  }

  // Other visit methods are no-ops for this visitor
  public visitIntermediateTask?(task: Task): void {
    // No-op - only interested in leaf tasks
  }

  public visitIterativeTask?(iterativeTask: IterativeTask): void {
    // No-op - only interested in leaf tasks
  }

  public visit?(task: Task): void {
    // No-op - only interested in leaf tasks
  }
}
