import { JobId } from './JobId';
import { UserTask } from './UserTask';

/**
 * Listener interface for TaskStore events.
 */
export interface TaskStoreListener {
  /**
   * Called when a task is stored.
   */
  onTaskAdded(userTask: UserTask): void;

  /**
   * Called when a task is removed.
   */
  onTaskRemoved(username: string, jobId: JobId): void;

  /**
   * Called when store is cleared.
   */
  onStoreCleared(): void;
}
