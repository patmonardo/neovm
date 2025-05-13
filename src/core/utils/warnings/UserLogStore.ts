import { Task } from '../progress/tasks/Task'; // Adjust path as needed
import { UserLogEntry } from './UserLogEntry';

/**
 * Interface for a store that logs user messages or warnings,
 * potentially on a per-user, per-task basis.
 */
export interface UserLogStore {
  /**
   * Adds a log message for a specific user and task.
   * @param username The username.
   * @param task The task associated with the message.
   * @param message The log message.
   */
  addUserLogMessage(username: string, task: Task, message: string): void;

  /**
   * Queries log entries for a specific user.
   * @param username The username.
   * @returns An array of UserLogEntry objects.
   */
  query(username: string): UserLogEntry[];
}
