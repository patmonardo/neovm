import { JobId } from './JobId'; // Assuming JobId.ts is in the same directory or a known path
import { Task } from './tasks/Task'; // Assuming Task.ts is in a subdirectory or a known path

/**
 * Represents a task associated with a specific user and job.
 * Analogous to the Java record UserTask.
 */
export class UserTask {
  public readonly username: string;
  public readonly jobId: JobId;
  public readonly task: Task;

  /**
   * Creates an instance of UserTask.
   * @param username The username associated with this task.
   * @param jobId The JobId for this task.
   * @param task The underlying Task object.
   */
  constructor(username: string, jobId: JobId, task: Task) {
    this.username = username;
    this.jobId = jobId;
    this.task = task;
  }

  // In Java, records automatically get equals(), hashCode(), and toString() methods.
  // If you need deep equality, custom equals/hashCode methods would be needed here.
  // For simple data holding, this structure is often sufficient.
  // A basic toString can be added if desired:
  // toString(): string {
  //   return `UserTask(user: ${this.username}, jobId: ${this.jobId.toString()}, task: ${this.task.toString()})`;
  // }
}
