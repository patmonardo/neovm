import { Task } from './tasks/Task';
import { TaskStore } from "./TaskStore";
import { TaskStoreListener } from "./TaskStoreListener";
import { JobId } from './JobId';
import { UserTask } from './UserTask';

/**
 * Abstract TaskStore that handles observer pattern for task lifecycle events.
 * Concrete implementations only need to handle storage mechanics.
 */
export abstract class ObservableTaskStore implements TaskStore {
  private readonly listeners: Set<TaskStoreListener>;

  protected constructor(listeners: Set<TaskStoreListener> = new Set()) {
    this.listeners = listeners;
  }

  /**
   * Final implementation - handles storage and notifications.
   */
  public store(username: string, jobId: JobId, task: Task): void {
    const userTask = this.storeUserTask(username, jobId, task);

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener.onTaskAdded(userTask);
      } catch (error) {
        console.error('Error in TaskStore listener during onTaskAdded:', error);
      }
    });
  }

  /**
   * Final implementation - handles removal and notifications.
   */
  public remove(username: string, jobId: JobId): void {
    const userTask = this.removeUserTask(username, jobId);

    // Notify listeners if task was actually removed
    if (userTask !== null) {
      this.listeners.forEach(listener => {
        try {
          listener.onTaskRemoved(username, jobId);
        } catch (error) {
          console.error('Error in TaskStore listener during onTaskRemoved:', error);
        }
      });
    }
  }

  /**
   * Query all tasks.
   */
  public query(): UserTask[];
  /**
   * Query tasks by job ID.
   */
  public query(jobId: JobId): UserTask[];
  /**
   * Query tasks by username.
   */
  public query(username: string): UserTask[];
  /**
   * Query specific task by username and job ID.
   */
  public query(username: string, jobId: JobId): UserTask | null;
  public query(usernameOrJobId?: string | JobId, jobId?: JobId): UserTask[] | UserTask | null {
    if (arguments.length === 0) {
      // query(): UserTask[]
      return this.queryAll();
    } else if (arguments.length === 1) {
      if (typeof usernameOrJobId === 'string') {
        // query(username: string): UserTask[]
        return this.queryByUsername(usernameOrJobId);
      } else {
        // query(jobId: JobId): UserTask[]
        return this.queryByJobId(usernameOrJobId!);
      }
    } else {
      // query(username: string, jobId: JobId): UserTask | null
      return this.queryByUsernameAndJobId(usernameOrJobId as string, jobId!);
    }
  }

  /**
   * Check if store is empty.
   */
  public isEmpty(): boolean {
    return this.taskCount() === 0;
  }

  /**
   * Get total task count.
   */
  public abstract taskCount(): number;

  /**
   * Synchronized listener management.
   * Note: In JavaScript, we don't have built-in synchronization,
   * but since JS is single-threaded, this is naturally thread-safe.
   */
  public addListener(listener: TaskStoreListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener.
   */
  public removeListener(listener: TaskStoreListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get current listener count.
   */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Clear all listeners.
   */
  protected clearListeners(): void {
    this.listeners.clear();
  }

  // Abstract methods that concrete implementations must provide for storage

  /**
   * Store the user task and return the created UserTask.
   * Concrete implementations handle the actual storage mechanism.
   */
  protected abstract storeUserTask(username: string, jobId: JobId, task: Task): UserTask;

  /**
   * Remove the user task and return it if it existed.
   * Concrete implementations handle the actual removal mechanism.
   */
  protected abstract removeUserTask(username: string, jobId: JobId): UserTask | null;

  // Abstract methods that concrete implementations must provide for querying

  /**
   * Query all tasks from storage.
   */
  protected abstract queryAll(): UserTask[];

  /**
   * Query tasks by username from storage.
   */
  protected abstract queryByUsername(username: string): UserTask[];

  /**
   * Query tasks by job ID from storage.
   */
  protected abstract queryByJobId(jobId: JobId): UserTask[];

  /**
   * Query specific task by username and job ID from storage.
   */
  protected abstract queryByUsernameAndJobId(username: string, jobId: JobId): UserTask | null;
}
