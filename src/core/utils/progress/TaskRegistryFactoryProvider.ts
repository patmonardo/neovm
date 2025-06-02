import { TaskRegistryFactory } from './TaskRegistryFactory';
import { TaskStoreService } from './TaskStoreService';

/**
 * Provider for TaskRegistryFactory instances.
 * Simplified version without Neo4j Context dependencies.
 */
export class TaskRegistryFactoryProvider {
  private readonly taskStoreService: TaskStoreService;

  constructor(taskStoreService: TaskStoreService) {
    this.taskStoreService = taskStoreService;
  }

  /**
   * Create TaskRegistryFactory for a user in a specific database.
   */
  public createFactory(username: string, databaseName: string): TaskRegistryFactory {
    const taskStore = this.taskStoreService.getTaskStore(databaseName);
    return TaskRegistryFactory.local(username, taskStore);
  }

  /**
   * Create empty factory (for disabled progress tracking).
   */
  public createEmptyFactory(): TaskRegistryFactory {
    return TaskRegistryFactory.empty();
  }

  /**
   * Create factory based on progress tracking configuration.
   */
  public createFactoryForContext(
    username: string,
    databaseName: string,
    progressEnabled: boolean = true
  ): TaskRegistryFactory {
    if (!progressEnabled) {
      return this.createEmptyFactory();
    }
    return this.createFactory(username, databaseName);
  }
}
