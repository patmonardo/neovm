import { TaskRegistry } from './TaskRegistry';
import { JobId } from './JobId';
import { TaskStore } from './TaskStore';
import { LocalTaskRegistryFactory } from './LocalTaskRegistryFactory';
import { EmptyTaskRegistryFactory } from './EmptyTaskRegistryFactory';

/**
 * Factory interface for creating TaskRegistry instances.
 */
export interface TaskRegistryFactory {
  /**
   * Create a new TaskRegistry instance with the given JobId.
   */
  newInstance(jobId: JobId): TaskRegistry;
}

/**
 * Static factory methods for common TaskRegistryFactory implementations.
 */
export namespace TaskRegistryFactory {
  /**
   * Create a local TaskRegistryFactory for a specific user and TaskStore.
   * Validates against duplicate job IDs.
   */
  export function local(username: string, taskStore: TaskStore): TaskRegistryFactory {
    return new LocalTaskRegistryFactory(username, taskStore);
  }

  /**
   * Create an empty TaskRegistryFactory that creates no-op registries.
   */
  export function empty(): TaskRegistryFactory {
    return EmptyTaskRegistryFactory.INSTANCE;
  }
}
