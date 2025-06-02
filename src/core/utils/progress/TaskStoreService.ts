import { TaskStore } from './TaskStore';
import { EmptyTaskStore } from './EmptyTaskStore';
import { TaskStoreHolder } from './TaskStoreHolder';

/**
 * Application-level service for managing TaskStores.
 *
 * This class should hold all TaskStores for the application.
 * Therefore, it should be a singleton. You instantiate it once as part of assembling the application.
 * TaskStores are tied to databases and live for the lifetime of a database.
 */
export class TaskStoreService {
  /**
   * This is a temporary hack where we allow Procedure Facade to control application state,
   * but also retain the old functionality of TaskStores being made available for context injection.
   * We do this so that we may slice our software vertically while migrating it;
   * this hack should go away when TaskStores are no longer needed for context injection.
   */
  // private readonly taskStores = new Map<string, TaskStore>();

  private readonly progressTrackingEnabled: boolean;

  constructor(progressTrackingEnabled: boolean) {
    this.progressTrackingEnabled = progressTrackingEnabled;
  }

  /**
   * Get TaskStore for the given database.
   * Returns EmptyTaskStore if progress tracking is disabled.
   */
  public getTaskStore(databaseName: string): TaskStore {
    if (!this.progressTrackingEnabled) {
      return EmptyTaskStore.INSTANCE;
    }

    return TaskStoreHolder.getTaskStore(databaseName);
    // Alternative implementation when we move away from TaskStoreHolder:
    // return this.taskStores.computeIfAbsent(databaseName, () => new PerDatabaseTaskStore());
  }

  /**
   * Check if progress tracking is enabled.
   */
  public isProgressTrackingEnabled(): boolean {
    return this.progressTrackingEnabled;
  }

  /**
   * Get all database names that have TaskStores.
   */
  public getDatabaseNames(): string[] {
    if (!this.progressTrackingEnabled) {
      return [];
    }
    return TaskStoreHolder.getDatabaseNames();
  }

  /**
   * Get total number of databases with TaskStores.
   */
  public getDatabaseCount(): number {
    if (!this.progressTrackingEnabled) {
      return 0;
    }
    return TaskStoreHolder.size();
  }

  /**
   * Clean up TaskStore for a specific database.
   */
  public purgeDatabase(databaseName: string): void {
    if (this.progressTrackingEnabled) {
      TaskStoreHolder.purge(databaseName);
    }
  }

  /**
   * Clean up all TaskStores (useful for testing/shutdown).
   */
  public purgeAll(): void {
    if (this.progressTrackingEnabled) {
      TaskStoreHolder.clear();
    }
  }
}
