import { Task } from '../progress/tasks/Task'; // Adjust path as needed
import { UserLogStore } from './UserLogStore';   // Adjust path as needed
import { UserLogEntry } from './UserLogEntry'; // Adjust path as needed

/**
 * A UserLogStore implementation that does nothing and stores nothing.
 * This is equivalent to the Java enum `EmptyUserLogStore.INSTANCE`.
 */
const EmptyUserLogStoreInstance: UserLogStore = {
  /**
   * No-operation implementation. Does not log the message.
   */
  addUserLogMessage(username: string, task: Task, message: string): void {
    // No-op
  },

  /**
   * Returns an empty array, as no logs are stored.
   * @param username The username to query for (ignored).
   * @returns An empty array of UserLogEntry.
   */
  query(username: string): UserLogEntry[] {
    return []; // Equivalent to Stream.empty()
  }
};

// Export the instance directly, mimicking the Java enum singleton.
export { EmptyUserLogStoreInstance as EmptyUserLogStore };
