import { InputIterator } from '@/api/import';
import { InputEntityVisitor } from '@/api/import';
import { ProgressTracker } from '@/core/utils/progress';

/**
 * Interface for objects that can be flushed (similar to Java's Flushable).
 */
export interface Flushable {
  flush(): void;
}

/**
 * Type constraint for visitors that can both flush and visit entities.
 */
export type FlushableInputEntityVisitor = Flushable & InputEntityVisitor;

/**
 * Runnable class that handles the import of graph elements (nodes or relationships).
 * This class orchestrates the processing of input chunks through a visitor pattern,
 * managing progress tracking and resource cleanup.
 */
export class ElementImportRunner<T extends FlushableInputEntityVisitor> implements Runnable {
  private readonly visitor: T;
  private readonly inputIterator: InputIterator;
  private readonly progressTracker: ProgressTracker;

  constructor(
    visitor: T,
    inputIterator: InputIterator,
    progressTracker: ProgressTracker
  ) {
    this.visitor = visitor;
    this.inputIterator = inputIterator;
    this.progressTracker = progressTracker;
  }

  /**
   * Executes the import process.
   * Processes chunks of input data through the visitor, tracking progress
   * and ensuring proper resource cleanup.
   */
  run(): void {
    let chunk: any = null;

    try {
      chunk = this.inputIterator.newChunk();

      // Verify chunk implements LastProgress interface
      if (!this.isLastProgressChunk(chunk)) {
        throw new Error(`Expected chunk to implement LastProgress, but got ${chunk.constructor.name}`);
      }

      // Process all chunks from the iterator
      while (this.inputIterator.next(chunk)) {
        // Process all elements in the current chunk
        while (chunk.next(this.visitor)) {
          const progress = chunk.lastProgress();
          this.progressTracker.logProgress(progress);
        }

        // Flush the visitor after processing each chunk
        this.visitor.flush();
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Import failed: ${error.message}`, { cause: error });
      }
      throw new Error(`Import failed: ${String(error)}`);
    } finally {
      // Ensure proper cleanup of the chunk resource
      if (chunk && typeof chunk.close === 'function') {
        try {
          chunk.close();
        } catch (closeError) {
          console.error('Error closing chunk:', closeError);
        }
      }
    }
  }

  /**
   * Type guard to check if chunk implements LastProgress interface.
   */
  private isLastProgressChunk(chunk: any): boolean {
    return chunk && typeof chunk.lastProgress === 'function';
  }
}

/**
 * Interface that matches the Runnable pattern from Java.
 */
export interface Runnable {
  run(): void;
}
