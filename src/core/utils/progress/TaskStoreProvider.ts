import { TaskStore } from './TaskStore';
import { TaskStoreHolder } from './TaskStoreHolder';

/**
 * Simple provider interface for TaskStore instances.
 * Simplified version without Neo4j kernel dependencies.
 */
export interface TaskStoreProvider {
  /**
   * Get TaskStore for a given database context.
   */
  getTaskStore(databaseName: string): TaskStore;
}

/**
 * Basic implementation using TaskStoreHolder.
 * Much simpler than Neo4j's procedure context integration.
 */
export class SimpleTaskStoreProvider implements TaskStoreProvider {
  public getTaskStore(databaseName: string): TaskStore {
    return TaskStoreHolder.getTaskStore(databaseName);
  }
}

/**
 * Factory for creating TaskStore providers.
 */
export class TaskStoreProviders {
  private static readonly defaultProvider = new SimpleTaskStoreProvider();

  /**
   * Get the default TaskStore provider.
   */
  public static getDefault(): TaskStoreProvider {
    return this.defaultProvider;
  }

  /**
   * Create a provider for a specific database.
   */
  public static forDatabase(databaseName: string): () => TaskStore {
    return () => TaskStoreHolder.getTaskStore(databaseName);
  }
}
