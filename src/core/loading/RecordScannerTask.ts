/**
 * Interface for record scanning tasks that run in parallel threads.
 *
 * Each thread in the parallel graph loading pipeline implements this interface
 * to provide a consistent way to:
 * - Execute the scanning work (via Runnable pattern)
 * - Track progress and statistics
 * - Enable monitoring and progress reporting
 *
 * Exists per thread - each worker thread has its own RecordScannerTask instance
 * that maintains thread-local statistics for records and properties processed.
 */
export interface RecordScannerTask {
  /**
   * Execute the scanning task.
   * This method contains the main work logic for processing records.
   */
  run(): void | Promise<void>;

  /**
   * Get the number of records imported by this task.
   *
   * @returns Total count of records processed by this scanner
   */
  recordsImported(): number;

  /**
   * Get the number of properties imported by this task.
   *
   * @returns Total count of properties processed by this scanner
   */
  propertiesImported(): number;
}

/**
 * Abstract base implementation providing common functionality for record scanners.
 */
export abstract class AbstractRecordScannerTask implements RecordScannerTask {
  protected recordCount: number = 0;
  protected propertyCount: number = 0;

  abstract run(): void | Promise<void>;

  recordsImported(): number {
    return this.recordCount;
  }

  propertiesImported(): number {
    return this.propertyCount;
  }

  /**
   * Increment the record count.
   *
   * @param count Number of records to add (defaults to 1)
   */
  protected incrementRecords(count: number = 1): void {
    this.recordCount += count;
  }

  /**
   * Increment the property count.
   *
   * @param count Number of properties to add (defaults to 1)
   */
  protected incrementProperties(count: number = 1): void {
    this.propertyCount += count;
  }

  /**
   * Reset all counters to zero.
   */
  protected reset(): void {
    this.recordCount = 0;
    this.propertyCount = 0;
  }

  /**
   * Get a summary of this task's statistics.
   */
  getStatistics(): ScannerTaskStatistics {
    return {
      recordsImported: this.recordCount,
      propertiesImported: this.propertyCount,
      avgPropertiesPerRecord: this.recordCount > 0 ? this.propertyCount / this.recordCount : 0
    };
  }
}

/**
 * Statistics collected by a scanner task.
 */
export interface ScannerTaskStatistics {
  recordsImported: number;
  propertiesImported: number;
  avgPropertiesPerRecord: number;
}

/**
 * Utility for aggregating statistics from multiple scanner tasks.
 */
export class ScannerTaskAggregator {
  private readonly tasks: RecordScannerTask[] = [];

  /**
   * Add a scanner task to be included in aggregation.
   */
  addTask(task: RecordScannerTask): void {
    this.tasks.push(task);
  }

  /**
   * Get aggregated statistics from all registered tasks.
   */
  getAggregatedStatistics(): AggregatedScannerStatistics {
    const totalRecords = this.tasks.reduce((sum, task) => sum + task.recordsImported(), 0);
    const totalProperties = this.tasks.reduce((sum, task) => sum + task.propertiesImported(), 0);

    return {
      taskCount: this.tasks.length,
      totalRecordsImported: totalRecords,
      totalPropertiesImported: totalProperties,
      avgPropertiesPerRecord: totalRecords > 0 ? totalProperties / totalRecords : 0,
      avgRecordsPerTask: this.tasks.length > 0 ? totalRecords / this.tasks.length : 0,
      avgPropertiesPerTask: this.tasks.length > 0 ? totalProperties / this.tasks.length : 0
    };
  }

  /**
   * Get statistics for each individual task.
   */
  getTaskStatistics(): TaskStatistics[] {
    return this.tasks.map((task, index) => ({
      taskIndex: index,
      recordsImported: task.recordsImported(),
      propertiesImported: task.propertiesImported()
    }));
  }
}

/**
 * Aggregated statistics from multiple scanner tasks.
 */
export interface AggregatedScannerStatistics {
  taskCount: number;
  totalRecordsImported: number;
  totalPropertiesImported: number;
  avgPropertiesPerRecord: number;
  avgRecordsPerTask: number;
  avgPropertiesPerTask: number;
}

/**
 * Statistics for an individual task.
 */
export interface TaskStatistics {
  taskIndex: number;
  recordsImported: number;
  propertiesImported: number;
}
