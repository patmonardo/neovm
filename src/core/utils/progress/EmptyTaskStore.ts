import { TaskStore } from "./TaskStore";
import { TaskStoreListener } from "./TaskStoreListener";
import { Task } from './tasks/Task';
import { JobId } from './JobId';
import { UserTask } from './UserTask';

/**
 * No-op TaskStore implementation that stores nothing and returns empty results.
 * Singleton pattern - use EmptyTaskStore.INSTANCE.
 */
export class EmptyTaskStore implements TaskStore {
  /**
   * Singleton instance - equivalent to Java enum INSTANCE.
   */
  public static readonly INSTANCE = new EmptyTaskStore();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Singleton - use INSTANCE
  }

  public store(username: string, jobId: JobId, task: Task): void {
    // No-op - empty store does nothing
  }

  public remove(username: string, jobId: JobId): void {
    // No-op - empty store does nothing
  }

  public query(): UserTask[];
  public query(jobId: JobId): UserTask[];
  public query(username: string): UserTask[];
  public query(username: string, jobId: JobId): UserTask | null;
  public query(usernameOrJobId?: string | JobId, jobId?: JobId): UserTask[] | UserTask | null {
    if (usernameOrJobId === undefined) {
      // query() - return empty array
      return [];
    }

    if (typeof usernameOrJobId === 'string' && jobId) {
      // query(username, jobId) - return null
      return null;
    }

    // All other cases - return empty array
    return [];
  }

  public isEmpty(): boolean {
    return true; // Always empty
  }

  public taskCount(): number {
    return 0; // Always zero tasks
  }

  public addListener(listener: TaskStoreListener): void {
    // No-op - empty store doesn't fire events
  }
}
