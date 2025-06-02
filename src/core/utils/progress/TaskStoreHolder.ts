import { TaskStore } from './TaskStore';
import { PerDatabaseTaskStore } from './PerDatabaseTaskStore';

/**
 * Global registry for TaskStore instances per database.
 * @ deprecated This is a temporary workaround - eliminate as soon as possible.
 *
 * Translation of Java TaskStoreHolder - maintains per-database task stores
 * in a JVM-wide (now process-wide) singleton map.
 */
export class TaskStoreHolder {
  /**
   * We need to satisfy each procedure facade having its own task stores, so that we can new them up in a known,
   * good, isolated state.
   * Plus for the time being we have to ensure each test using a task store sees unique task stores.
   * We assume database ids are unique to a process.
   * Therefore, we can have this process-wide singleton holding a map of database id to task store.
   *
   * This is of course abominable and should be gotten rid of.
   * And we can get rid of it once all tests are not using context-injected task stores anymore.
   * We want to do that migration in vertical slices, so we can have this solution in place temporarily.
   * Procedure facade will use this service class and be oblivious to the underlying abomination.
   * And TaskRegistry will be made to hand out references using database id.
   * We rely on database ids being unique for the lifetime of a process.
   *
   * @ deprecated we eliminate this as soon as possible
   */
  private static readonly TASK_STORES = new Map<string, TaskStore>();

  /**
   * Private constructor - this is a static utility class.
   */
  private constructor() {
    // Static utility class
  }

  /**
   * Get or create a TaskStore for the given database name.
   * Normalize so that we match things consistently.
   *
   * @param databaseName The database name to get a TaskStore for
   * @returns TaskStore instance for the database
   */
  public static getTaskStore(databaseName: string): TaskStore {
    const normalizedDatabaseName = this.toLowerCaseWithLocale(databaseName);

    let taskStore = this.TASK_STORES.get(normalizedDatabaseName);
    if (!taskStore) {
      taskStore = new PerDatabaseTaskStore();
      this.TASK_STORES.set(normalizedDatabaseName, taskStore);
    }

    return taskStore;
  }

  /**
   * Remove TaskStore for a database (used for cleanup/testing).
   * Package-private equivalent of Java's static void purge().
   */
  public static purge(databaseName: string): void {
    const normalizedDatabaseName = this.toLowerCaseWithLocale(databaseName);
    this.TASK_STORES.delete(normalizedDatabaseName);
  }

  /**
   * Clear all task stores (useful for testing).
   */
  public static clear(): void {
    this.TASK_STORES.clear();
  }

  /**
   * Get all registered database names.
   */
  public static getDatabaseNames(): string[] {
    return Array.from(this.TASK_STORES.keys());
  }

  /**
   * Get total number of registered databases.
   */
  public static size(): number {
    return this.TASK_STORES.size;
  }

  /**
   * Normalize database name to lowercase with locale.
   * TypeScript equivalent of StringFormatting.toLowerCaseWithLocale().
   */
  private static toLowerCaseWithLocale(str: string): string {
    return str.toLowerCase(); // JavaScript toLowerCase() is locale-aware by default
  }
}
