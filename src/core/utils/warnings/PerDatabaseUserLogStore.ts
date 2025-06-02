import { Task } from "../progress/tasks/Task";
import { UserLogStore } from "./UserLogStore";
import { LogStore, LogStoreEntry } from "./LogStore";
import { UserLogEntry } from "./UserLogEntry";

export class PerDatabaseUserLogStore implements UserLogStore {
  // Using a standard Map. Concurrency aspects of ConcurrentHashMap are handled
  // differently in typical single-threaded JS environments.
  private readonly logStores: Map<string, LogStore> = new Map();

  public addUserLogMessage(
    username: string,
    task: Task,
    message: string
  ): void {
    const logStore = this.getUserLogStore(username);
    logStore.addLogMessage(task, message);
  }

  public query(username: string): UserLogEntry[] {
    const logStore = this.getUserLogStore(username);

    // logStore.stream() returns LogStoreEntry[] which is [Task, string[]][]
    // Java: return logStore.stream().flatMap(PerDatabaseUserLogStore::taskWithMessagesToUserLogEntryStream);
    return logStore
      .stream()
      .flatMap((taskWithMessages: LogStoreEntry) =>
        PerDatabaseUserLogStore.taskWithMessagesToUserLogEntryArray(
          taskWithMessages
        )
      );
  }

  private getUserLogStore(username: string): LogStore {
    // Simulating computeIfAbsent
    if (!this.logStores.has(username)) {
      this.logStores.set(username, new LogStore());
    }
    return this.logStores.get(username)!;
  }

  /**
   * One task with messages turns into several user log entries.
   * Java: private static Stream<UserLogEntry> taskWithMessagesToUserLogEntryStream(Map.Entry<Task, Queue<String>> taskWithMessages)
   * TypeScript: Takes a LogStoreEntry ([Task, string[]]) and returns UserLogEntry[]
   */
  private static taskWithMessagesToUserLogEntryArray(
    taskWithMessages: LogStoreEntry
  ): UserLogEntry[] {
    const task = taskWithMessages[0]; // Task
    const messages = taskWithMessages[1]; // string[] (Queue<String> in Java)

    // Java: return taskWithMessages.getValue().stream().map(message -> new UserLogEntry(...));
    return messages.map((message) => new UserLogEntry(task, message));
  }
}
