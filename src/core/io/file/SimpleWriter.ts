/**
 * Simple generic writer interface for writing values of type T.
 * Used throughout the GDS file I/O system for writing data to various outputs.
 *
 * @template T The type of values this writer can handle
 *
 * @example
 * ```typescript
 * const stringWriter: SimpleWriter<string> = {
 *   write: (value: string) => {
 *     console.log(value);
 *   }
 * };
 *
 * const capabilitiesWriter: SimpleWriter<Capabilities> = {
 *   write: (capabilities: Capabilities) => {
 *     // Write capabilities to file
 *   }
 * };
 * ```
 */
export interface SimpleWriter<T> {
  /**
   * Writes a value of type T.
   *
   * @param value The value to write
   * @throws Error if writing fails
   */
  write(value: T): void;
}
