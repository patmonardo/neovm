/**
 * Minimal visitor interface for simple export operations.
 * Provides a clean, lightweight alternative to the complex schema visitors
 * when only basic value export functionality is needed.
 *
 * @template T The type of values this visitor can export
 */
export interface SimpleVisitor<T> {
  /**
   * Exports a single value.
   *
   * @param value The value to export
   */
  export(value: T): void;

  /**
   * Closes and cleans up any resources used by this visitor.
   * Called when export processing is complete.
   */
  close(): void;
}
