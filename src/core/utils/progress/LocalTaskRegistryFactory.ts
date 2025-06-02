import { TaskRegistryFactory } from './TaskRegistryFactory';
import { TaskRegistry } from './TaskRegistry';
import { TaskStore } from './TaskStore';
import { JobId } from './JobId';

/**
 * Local implementation of TaskRegistryFactory with duplicate job validation.
 * Ensures no duplicate jobs are running for the same user.
 */
export class LocalTaskRegistryFactory implements TaskRegistryFactory {
  private readonly username: string;
  private readonly taskStore: TaskStore;

  constructor(username: string, taskStore: TaskStore) {
    this.username = username;
    this.taskStore = taskStore;
  }

  public newInstance(jobId: JobId): TaskRegistry {
    // Check if there's already a job running with this jobId
    const existingTask = this.taskStore.query(this.username, jobId);

    if (existingTask !== null) {
      throw new Error(
        `There's already a job running with jobId '${jobId.asString()}'`
      );
    }

    return new TaskRegistry(this.username, this.taskStore, jobId);
  }

  /**
   * Get the username this factory creates registries for.
   */
  public getUsername(): string {
    return this.username;
  }

  /**
   * Get the TaskStore this factory uses.
   */
  public getTaskStore(): TaskStore {
    return this.taskStore;
  }

  /**
   * Equality check for testing.
   * Two factories are equal if they have the same username and taskStore.
   */
  public equals(other: LocalTaskRegistryFactory): boolean {
    return this.username === other.username &&
           this.taskStore === other.taskStore;
  }

  /**
   * Hash code for consistency with equals.
   */
  public hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this.stringHash(this.username);
    hash = hash * 31 + this.objectHash(this.taskStore);
    return hash;
  }

  private stringHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private objectHash(obj: any): number {
    // Simple object hash - in production, might want more sophisticated approach
    return obj ? obj.constructor.name.length : 0;
  }

  public toString(): string {
    return `LocalTaskRegistryFactory{username='${this.username}', taskStore=${this.taskStore.constructor.name}}`;
  }
}
