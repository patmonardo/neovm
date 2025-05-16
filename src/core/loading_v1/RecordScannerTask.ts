/**
 * Represents a task that scans and imports records, typically executed in a separate thread or as an asynchronous operation.
 * It extends the concept of a Runnable task with methods to report import statistics.
 */
export interface RecordScannerTask extends Runnable {
  /**
   * @returns The total number of records imported by this task.
   */
  recordsImported(): number;

  /**
   * @returns The total number of properties imported by this task.
   */
  propertiesImported(): number;
}

/**
 * Basic Runnable interface, similar to Java's `java.lang.Runnable`.
 * This is often implicitly covered by function types in TypeScript (e.g., `() => void`),
 * but defining it explicitly can be useful for clarity when extending it.
 */
export interface Runnable {
  /**
   * Executes the task.
   */
  run(): void;
}
