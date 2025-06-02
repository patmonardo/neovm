import { Task } from './Task';
import { LeafTask } from './LeafTask';
import { IterativeTask, IterativeTaskMode } from './IterativeTask';

/**
 * Utility factory class for creating task hierarchies.
 * Provides static factory methods for all task types.
 */
export class Tasks {
  private static readonly EMPTY_TASK = new Task("", []);

  /**
   * Create an empty task with no description or children.
   */
  public static empty(): Task {
    return Tasks.EMPTY_TASK;
  }

  /**
   * Create an intermediate task with description and children.
   */
  public static task(description: string, children: Task[]): Task {
    return new Task(description, children);
  }

  /**
   * Create an intermediate task with description and variadic children.
   */
  public static taskWithChildren(description: string, firstChild: Task, ...children: Task[]): Task {
    const childrenList = [firstChild, ...children];
    return new Task(description, childrenList);
  }

  /**
   * Create a fixed iteration task that executes exactly N iterations.
   */
  public static iterativeFixed(
    description: string,
    subTasksSupplier: () => Task[],
    iterations: number
  ): IterativeTask {
    return new IterativeTask(
      description,
      Tasks.unrollTasks(subTasksSupplier, iterations),
      subTasksSupplier,
      IterativeTaskMode.FIXED
    );
  }

  /**
   * Create a dynamic iteration task that can terminate early (up to N iterations).
   */
  public static iterativeDynamic(
    description: string,
    subTasksSupplier: () => Task[],
    iterations: number
  ): IterativeTask {
    return new IterativeTask(
      description,
      Tasks.unrollTasks(subTasksSupplier, iterations),
      subTasksSupplier,
      IterativeTaskMode.DYNAMIC
    );
  }

  /**
   * Create an open iteration task with unbounded iterations.
   */
  public static iterativeOpen(
    description: string,
    subTasksSupplier: () => Task[]
  ): IterativeTask {
    return new IterativeTask(
      description,
      [],
      subTasksSupplier,
      IterativeTaskMode.OPEN
    );
  }

  /**
   * Create a leaf task with unknown volume.
   */
  public static leaf(description: string): LeafTask {
    return Tasks.leafWithVolume(description, Task.UNKNOWN_VOLUME);
  }

  /**
   * Create a leaf task with specified volume.
   */
  public static leafWithVolume(description: string, volume: number): LeafTask {
    return new LeafTask(description, volume);
  }

  /**
   * Unroll tasks for fixed/dynamic iterations.
   */
  private static unrollTasks(subTasksSupplier: () => Task[], iterations: number): Task[] {
    const result: Task[] = [];
    for (let i = 0; i < iterations; i++) {
      result.push(...subTasksSupplier());
    }
    return result;
  }

  // Private constructor to prevent instantiation
  private constructor() {}
}
