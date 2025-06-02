import { JobId } from './JobId';
import { Task } from './tasks/Task';

/**
 * User task - clean TypeScript record without hashCode
 */
export class UserTask {
  constructor(
    public readonly username: string,
    public readonly jobId: JobId,
    public readonly task: Task
  ) {}

  public toString(): string {
    return `UserTask{username='${this.username}', jobId=${this.jobId}, task=${this.task}}`;
  }

  // equals() for comparison if needed
  public equals(other: UserTask): boolean {
    return (
      this.username === other.username &&
      this.jobId.equals(other.jobId) &&
      this.task === other.task
    );
  }
}
