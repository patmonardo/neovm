import { TaskStore } from './TaskStore';
import { JobId } from './JobId';
import { Task } from './tasks/Task';

/**
 * Registry for managing tasks for a specific user session.
 * Convenient wrapper around TaskStore with bound username and jobId.
 */
export class TaskRegistry {
  private readonly username: string;
  private readonly taskStore: TaskStore;
  private readonly jobId: JobId;

  /**
   * Copy constructor for testing.
   */
  constructor(taskRegistry: TaskRegistry);

  /**
   * Create registry with auto-generated JobId.
   */
  constructor(username: string, taskStore: TaskStore);

  /**
   * Create registry with specific JobId.
   */
  constructor(username: string, taskStore: TaskStore, jobId: JobId);

  constructor(
    usernameOrRegistry: string | TaskRegistry,
    taskStore?: TaskStore,
    jobId?: JobId
  ) {
    if (typeof usernameOrRegistry === 'string') {
      // constructor(username, taskStore, jobId?)
      this.username = usernameOrRegistry;
      this.taskStore = taskStore!;
      this.jobId = jobId || new JobId(); // Auto-generate if not provided
    } else {
      // Copy constructor for testing
      const registry = usernameOrRegistry;
      this.username = registry.username;
      this.taskStore = registry.taskStore;
      this.jobId = registry.jobId;
    }
  }

  /**
   * Register a task for this user session.
   */
  public registerTask(task: Task): void {
    this.taskStore.store(this.username, this.jobId, task);
  }

  /**
   * Unregister the task for this user session.
   */
  public unregisterTask(): void {
    this.taskStore.remove(this.username, this.jobId);
  }

  /**
   * Check if the registry contains a specific task.
   * Uses object identity comparison like Java.
   */
  public containsTask(task: Task): boolean {
    const userTask = this.taskStore.query(this.username, this.jobId);

    if (userTask === null) {
      return false;
    }

    // Java uses == for object identity, TypeScript uses ===
    return userTask.task === task;
  }

  /**
   * Get the username for this registry.
   */
  public getUsername(): string {
    return this.username;
  }

  /**
   * Get the job ID for this registry.
   */
  public getJobId(): JobId {
    return this.jobId;
  }

  /**
   * Get the task store used by this registry.
   */
  public getTaskStore(): TaskStore {
    return this.taskStore;
  }

  /**
   * Get the current registered task, if any.
   */
  public getCurrentTask(): Task | null {
    const userTask = this.taskStore.query(this.username, this.jobId);
    return userTask?.task || null;
  }

  /**
   * Check if this registry has a registered task.
   */
  public hasTask(): boolean {
    return this.taskStore.query(this.username, this.jobId) !== null;
  }
}
