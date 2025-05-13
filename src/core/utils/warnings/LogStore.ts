import { Task } from '../progress/tasks/Task'; // Adjust path as needed

// Define the entry type for clarity when streaming
export type LogStoreEntry = [Task, string[]];

/**
 * It is understood that these tasks and their messages belong to a single user,
 * but that is handled elsewhere.
 * We cap the number of tasks tracked per user. Tasks are ordered by start time,
 * and with the cap we do FIFO semantics (oldest task is removed).
 */
class LogStore {
  /**
   * We track 100 tasks per user by default.
   * Note that each task can have an unbounded number of messages, there is no cap there yet.
   */
  private static readonly DEFAULT_CAPACITY = 100;

  /**
   * Comparator for Tasks.
   * This is important. You can have two tasks with same start time, for example if they are not yet started.
   * It is not strictly great, ideally tasks would have some unique identifier, or something.
   * Like, what if you started two of the same job at the same time innit.
   * We shall solve that another day.
   */
  private static readonly TASK_COMPARATOR = (a: Task, b: Task): number => {
    const startTimeA = a.startTime();
    const startTimeB = b.startTime();
    if (startTimeA < startTimeB) return -1;
    if (startTimeA > startTimeB) return 1;

    const descA = a.description();
    const descB = b.description();
    if (descA < descB) return -1;
    if (descA > descB) return 1;

    // If an ID were available for tie-breaking:
    // if (a.id && b.id) {
    //   if (a.id() < b.id()) return -1;
    //   if (a.id() > b.id()) return 1;
    // }
    return 0;
  };

  // Using a standard Map. Sorting for pollFirstEntry will be handled explicitly.
  // The Task object itself will be the key. Ensure Task instances are stable
  // or have a consistent way to be looked up if new instances representing the same task are used.
  private readonly messages: Map<Task, string[]> = new Map();
  private readonly capacity: number;

  constructor(capacity: number = LogStore.DEFAULT_CAPACITY) {
    this.capacity = capacity;
  }

  public addLogMessage(task: Task, message: string): void {
    this.getMessageList(task).push(message); // string[] acts as a Queue for .push

    if (this.messages.size > this.capacity) {
      // The synchronized block in Java is for thread safety.
      // In typical single-threaded JS environments, this atomicity is handled by the event loop.
      // The double-check `if (messages.size() > capacity)` inside synchronized is a Java pattern.
      // A single check is usually sufficient in JS here.
      this.pollFirstEntry();
    }
  }

  /**
   * Removes and returns the first entry (task with the smallest sort order) from the store.
   * Returns null if the store is empty.
   * This simulates Java's Map.pollFirstEntry().
   */
  private pollFirstEntry(): LogStoreEntry | null {
    if (this.messages.size === 0) {
      return null;
    }

    // Get all keys, sort them, then remove the first one.
    // This is less efficient than a SkipListMap but achieves the sorted removal.
    const tasks = Array.from(this.messages.keys());
    tasks.sort(LogStore.TASK_COMPARATOR);

    const firstTask = tasks[0];
    const messageQueue = this.messages.get(firstTask);
    this.messages.delete(firstTask);

    return messageQueue ? [firstTask, messageQueue] : null;
  }

  /**
   * Returns a stream-like iterable of map entries.
   * In TypeScript, this can be an array of [Task, string[]] tuples.
   */
  public stream(): LogStoreEntry[] {
    // To maintain sort order in the stream similar to ConcurrentSkipListMap,
    // we should sort the entries here as well.
    const entries = Array.from(this.messages.entries());
    entries.sort((a, b) => LogStore.TASK_COMPARATOR(a[0], b[0]));
    return entries;
  }

  /**
   * Gets the message list (queue) for a given task, creating it if it doesn't exist.
   * Simulates Java's map.computeIfAbsent(task, k -> new ConcurrentLinkedQueue<>()).
   */
  private getMessageList(task: Task): string[] {
    let messageQueue = this.messages.get(task);
    if (!messageQueue) {
      messageQueue = []; // Using a simple array as a queue
      this.messages.set(task, messageQueue);
    }
    return messageQueue;
  }
}

// Export the class if it's meant to be used by other modules.
// Based on the Java `class LogStore` (package-private), it might be internal.
// For now, let's assume it might be used by other files in the 'warnings' directory.
export { LogStore };
