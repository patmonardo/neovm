import { Task } from '../progress/tasks/Task'; // Adjust path as needed
import { UserLogStore } from './UserLogStore';   // Adjust path as needed

export class UserLogRegistry {
  private readonly username: string;
  private readonly userLogStore: UserLogStore;

  constructor(username: string, userLogStore: UserLogStore) {
    this.username = username;
    this.userLogStore = userLogStore;
  }

  /**
   * Adds a warning message to the log for the associated user and task.
   * @param task The task related to the warning.
   * @param message The warning message.
   */
  public addWarningToLog(task: Task, message: string): void {
    this.userLogStore.addUserLogMessage(this.username, task, message);
  }

  // If the Java class had other methods, they would be translated here.
  // For example, if it had a method to query logs:
  // public getWarnings(): UserLogEntry[] {
  //   return this.userLogStore.query(this.username);
  // }
}
