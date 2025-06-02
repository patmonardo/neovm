import { Concurrency } from "@/concurrency";
import { UserLogRegistryFactory } from "@/core/utils/warnings";
import { EmptyUserLogRegistryFactory } from "@/core/utils/warnings";
import { TaskRegistryFactory } from "../TaskRegistryFactory";
import { TaskProgressTracker } from "./TaskProgressTracker";
import { TaskProgressLogger } from "./TaskProgressLogger";
import { TaskVisitor } from "./TaskVisitor";
import { IterativeTask } from "./IterativeTask";
import { LeafTask } from "./LeafTask";
import { JobId } from "../JobId";
import { Task } from "./Task";
import { Log } from "@/utils/Log";

/**
 * Specialized progress tracker that manages task hierarchy without detailed progress logging.
 * Focuses on task structure and lifecycle rather than progress values.
 * Useful for scenarios where only task tree management is needed.
 */
export class TaskTreeProgressTracker extends TaskProgressTracker {
  constructor(
    baseTask: Task,
    log: Log,
    concurrency: Concurrency,
    jobId: JobId,
    taskRegistryFactory: TaskRegistryFactory,
    userLogRegistryFactory: UserLogRegistryFactory
  ) {
    super(
      baseTask,
      jobId,
      taskRegistryFactory,
      new TaskProgressLogger(
        log,
        baseTask,
        concurrency,
        new PassThroughTaskVisitor()
      ),
      userLogRegistryFactory
    );
  }

  /**
   * Override to disable step-based progress logging.
   */
  public logSteps(steps: number): void {
    // NOOP - no progress logging in tree tracker
  }

  /**
   * Override to disable progress value logging.
   */
  public logProgress(value: number): void;
  public logProgress(value: number, messageTemplate: string): void;
  public logProgress(value: number = 1, messageTemplate?: string): void {
    // NOOP - no progress logging in tree tracker
  }
}

/**
 * Pass-through visitor that performs no operations on leaf tasks.
 * Used to disable the automatic 100% completion logging.
 */
class PassThroughTaskVisitor implements TaskVisitor {
  public visitLeafTask(leafTask: LeafTask): void {
    // NOOP - just pass through without logging
  }

  public visitIntermediateTask?(task: Task): void {
    // NOOP
  }

  public visitIterativeTask?(iterativeTask: IterativeTask): void {
    // NOOP
  }

  public visit?(task: Task): void {
    // NOOP
  }
}

/**
 * Factory for creating TaskTreeProgressTracker instances.
 */
export class TaskTreeProgressTrackerFactory {
  /**
   * Create a TaskTreeProgressTracker for hierarchy-only tracking.
   */
  public static create(
    baseTask: Task,
    log: Log,
    concurrency: Concurrency,
    jobId: JobId,
    taskRegistryFactory: TaskRegistryFactory,
    userLogRegistryFactory: UserLogRegistryFactory
  ): TaskTreeProgressTracker {
    return new TaskTreeProgressTracker(
      baseTask,
      log,
      concurrency,
      jobId,
      taskRegistryFactory,
      userLogRegistryFactory
    );
  }

  /**
   * Create a minimal TaskTreeProgressTracker for testing.
   */
  public static createMinimal(
    baseTask: Task,
    log: Log = Log.noOp(),
    concurrency: Concurrency = Concurrency.of(1)
  ): TaskTreeProgressTracker {
    return new TaskTreeProgressTracker(
      baseTask,
      log,
      concurrency,
      new JobId(),
      TaskRegistryFactory.empty(),
      EmptyUserLogRegistryFactory
    );
  }

  /**
   * Create a TaskTreeProgressTracker from an existing TaskProgressTracker configuration.
   */
  public static fromTaskTracker(
    baseTask: Task,
    log: Log,
    concurrency: Concurrency,
    taskRegistryFactory: TaskRegistryFactory,
    userLogRegistryFactory: UserLogRegistryFactory
  ): TaskTreeProgressTracker {
    return new TaskTreeProgressTracker(
      baseTask,
      log,
      concurrency,
      new JobId(),
      taskRegistryFactory,
      userLogRegistryFactory
    );
  }
}
