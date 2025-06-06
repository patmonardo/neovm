import { Monitor } from '@/api/import';
import { GraphStore } from '@/api/GraphStore';
import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
import { Task } from '@/core/utils/progress';
import { Tasks } from '@/core/utils/progress';
import { GraphStoreToDatabaseExporter } from './GraphStoreToDatabaseExporter';

/**
 * Execution monitor that bridges Neo4j batch importer progress reporting
 * to the GDS progress tracking system.
 *
 * Implements the batch importer's Monitor interface and translates
 * percentage-based progress updates into the GDS progress tracking format.
 */
export class ProgressTrackerExecutionMonitor implements Monitor {
  private readonly total: number;
  private readonly progressTracker: ProgressTracker;

  constructor(graphStore: GraphStore, progressTracker: ProgressTracker) {
    this.total = ProgressTrackerExecutionMonitor.getTotal(graphStore);
    this.progressTracker = progressTracker;
  }

  /**
   * Creates a progress task for GraphStore to database export.
   * The task tracks both node and relationship processing.
   *
   * @param graphStore The GraphStore being exported
   * @returns A leaf task with the total work volume
   */
  static progressTask(graphStore: GraphStore): Task {
    return Tasks.leaf(
      GraphStoreToDatabaseExporter.name,
      graphStore.nodes().nodeCount() + graphStore.relationshipCount()
    );
  }

  /**
   * Calculates the total work units for progress tracking.
   * Accounts for the block format processing where relationships
   * are processed multiple times (sorting, application, bidirectional writing).
   *
   * @param graphStore The GraphStore being exported
   * @returns Total work units for progress calculation
   */
  private static getTotal(graphStore: GraphStore): number {
    return graphStore.nodeCount() +
      // In block format:
      // Each relationship is sorted and then applied
      // Each relationship is written on both ends (except loops)
      graphStore.relationshipCount() * 4;
  }

  /**
   * Called when the batch import process starts.
   * Initializes the progress tracker with the total work volume.
   */
  started(): void {
    this.progressTracker.beginSubTask();
    this.progressTracker.setVolume(this.total);
  }

  /**
   * Called periodically with percentage completion updates.
   * Converts percentage to absolute progress and logs it.
   *
   * @param percentage Completion percentage (0-100)
   */
  percentageCompleted(percentage: number): void {
    const progress = Math.floor(this.total * (percentage / 100.0));
    this.progressTracker.logProgress(progress);
  }

  /**
   * Called when the batch import process completes.
   * Finalizes the progress tracking subtask.
   *
   * @param success Whether the import completed successfully
   */
  completed(success: boolean): void {
    this.progressTracker.endSubTask();
  }
}
