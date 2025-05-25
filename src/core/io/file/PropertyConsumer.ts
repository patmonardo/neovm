/**
 * Functional interface for consuming property key-value pairs.
 * Used throughout the GDS file I/O system for processing properties
 * during import and export operations.
 *
 * @example
 * ```typescript
 * const consumer: PropertyConsumer = (key, value) => {
 *   console.log(`Property ${key} = ${value}`);
 * };
 *
 * consumer("name", "Alice");
 * consumer("age", 30);
 * ```
 */
export interface PropertyConsumer {
  /**
   * Accepts a property key-value pair for processing.
   *
   * @param key The property key/name
   * @param value The property value (can be any type)
   */
  accept(key: string, value: any): void;
}
