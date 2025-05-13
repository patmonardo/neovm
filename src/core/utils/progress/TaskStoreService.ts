import { DatabaseId } from '../../../api/DatabaseId';
import { TaskStore } from './TaskStore';
import { EmptyTaskStore } from './EmptyTaskStore';
import { TaskStoreHolder } from './TaskStoreHolder';

/**
 * This class should hold all TaskStores for the application.
 * Therefore, it should be a singleton. You instantiate it once as part of assembling the application.
 * TaskStores are tied to databases and live for the lifetime of a database.
 */
export class TaskStoreService {
  private readonly progressTrackingEnabled: boolean;

  /**
   * Creates a new TaskStoreService.
   * 
   * @param progressTrackingEnabled Whether progress tracking is enabled
   */
  constructor(progressTrackingEnabled: boolean) {
    this.progressTrackingEnabled = progressTrackingEnabled;
  }

  /**
   * Gets the TaskStore for the specified database.
   * 
   * @param databaseId Database identifier
   * @returns TaskStore for the database
   */
  public getTaskStore(databaseId: DatabaseId): TaskStore {
    if (!this.progressTrackingEnabled) return EmptyTaskStore.INSTANCE;

    return TaskStoreHolder.getTaskStore(databaseId.databaseName());
  }
}