import { Task } from '../progress/tasks/Task'; // Adjust path as needed

export class UserLogEntry {
  public readonly taskName: string;
  public readonly message: string;
  public readonly timeStarted: Date; // Store as a Date object

  constructor(task: Task, message: string) {
    this.taskName = task.description();
    this.message = message;
    // Convert epoch milliseconds from task.startTime() to a Date object
    this.timeStarted = new Date(task.startTime());
  }

  public getTaskName(): string {
    return this.taskName;
  }

  public getMessage(): string {
    return this.message;
  }

  /**
   * Returns the start time as a Date object.
   * The consumer can then format this Date object as needed (e.g., to get local time string).
   */
  public getTimeStarted(): Date {
    return this.timeStarted;
  }

  /**
   * Helper method to get timeStarted as a string in HH:mm:ss format (local time).
   * This is similar to what LocalTime might represent.
   */
  public getTimeStartedString(): string {
    // Uses system's local timezone by default
    return this.timeStarted.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}
