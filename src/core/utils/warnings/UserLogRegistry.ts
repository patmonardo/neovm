import { Task } from "@/core/utils/progress/tasks/Task";
import { UserLogStore } from "./UserLogStore";
import { EmptyUserLogStore } from "./EmptyUserLogStore";

export abstract class UserLogRegistry {
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

  /**
   * Static factory for empty UserLogRegistry instances.
   */
  public static empty(): UserLogRegistry {
    return new EmptyUserLogRegistry();
  }
}

/**
 * Empty implementation that discards all warnings.
 * Used for testing and minimal setups.
 */
class EmptyUserLogRegistry extends UserLogRegistry {

  public constructor() {
    super("", EmptyUserLogStore);
  }

  public addWarningToLog(task: Task, message: string): void {
    // NOOP - discard warning
  }

  public getWarnings(): string[] {
    return []; // No warnings stored
  }

  public hasWarnings(): boolean {
    return false;
  }

  public clear(): void {
    // NOOP - nothing to clear
  }
}
