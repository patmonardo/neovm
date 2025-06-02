import { Task } from './tasks/Task';
import { JobId } from './JobId';
import { UserTask } from './UserTask';
import { TaskStoreListener } from './TaskStoreListener';

/**
 * Interface for storing and querying user tasks.
 * Core storage abstraction for task management.
 */
export interface TaskStore {
  /**
   * Store a task for a user and job.
   */
  store(username: string, jobId: JobId, task: Task): void;

  /**
   * Remove a task for a user and job.
   */
  remove(username: string, jobId: JobId): void;

  /**
   * Query all tasks.
   */
  query(): UserTask[];

  /**
   * Query tasks by job ID.
   */
  query(jobId: JobId): UserTask[];

  /**
   * Query tasks by username.
   */
  query(username: string): UserTask[];

  /**
   * Query specific task by username and job ID.
   */
  query(username: string, jobId: JobId): UserTask | null;

  /**
   * Check if store is empty.
   */
  isEmpty(): boolean;

  /**
   * Get total task count.
   */
  taskCount(): number;

  /**
   * Add a listener for task store events.
   */
  addListener(listener: TaskStoreListener): void;
}
