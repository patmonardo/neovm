import { TaskStore } from "./TaskStore";
import { TaskStoreListener } from "./TaskStoreListener";
import { Task } from './tasks/Task';
import { JobId } from './JobId';
import { UserTask } from './UserTask';

/**
 * TaskStore implementation for a specific database.
 * Each database gets its own isolated task storage.
 */
export class PerDatabaseTaskStore implements TaskStore {
  private readonly tasks = new Map<string, UserTask>();
  private readonly listeners: TaskStoreListener[] = [];

  /**
   * Generate unique key for username + jobId combination.
   */
  private generateKey(username: string, jobId: JobId): string {
    return `${username}:${jobId.asString()}`;
  }

  public store(username: string, jobId: JobId, task: Task): void {
    const key = this.generateKey(username, jobId);
    const userTask = new UserTask(username, jobId, task);

    this.tasks.set(key, userTask);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener.onTaskAdded(userTask);
      } catch (error) {
        console.error('Error in TaskStore listener:', error);
      }
    });
  }

  public remove(username: string, jobId: JobId): void {
    const key = this.generateKey(username, jobId);
    const existed = this.tasks.delete(key);

    if (existed) {
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener.onTaskRemoved(username, jobId);
        } catch (error) {
          console.error('Error in TaskStore listener:', error);
        }
      });
    }
  }

  public query(): UserTask[];
  public query(jobId: JobId): UserTask[];
  public query(username: string): UserTask[];
  public query(username: string, jobId: JobId): UserTask | null;
  public query(usernameOrJobId?: string | JobId, jobId?: JobId): UserTask[] | UserTask | null {
    if (usernameOrJobId === undefined) {
      // query() - all tasks
      return Array.from(this.tasks.values());
    }

    if (typeof usernameOrJobId === 'string' && jobId) {
      // query(username, jobId) - specific task
      const key = this.generateKey(usernameOrJobId, jobId);
      return this.tasks.get(key) || null;
    }

    if (typeof usernameOrJobId === 'string') {
      // query(username) - tasks by username
      return Array.from(this.tasks.values())
        .filter(task => task.username === usernameOrJobId);
    }

    if (usernameOrJobId instanceof JobId) {
      // query(jobId) - tasks by job ID
      const jobIdString = usernameOrJobId.asString();
      return Array.from(this.tasks.values())
        .filter(task => task.jobId.asString() === jobIdString);
    }

    return [];
  }

  public isEmpty(): boolean {
    return this.tasks.size === 0;
  }

  public taskCount(): number {
    return this.tasks.size;
  }

  public addListener(listener: TaskStoreListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener.
   */
  public removeListener(listener: TaskStoreListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear all tasks and notify listeners.
   */
  public clear(): void {
    this.tasks.clear();
    this.listeners.forEach(listener => {
      try {
        listener.onStoreCleared();
      } catch (error) {
        console.error('Error in TaskStore listener:', error);
      }
    });
  }
}
