/**
 * Interface for visitors that handle single-row data export operations.
 * Used for exporting single values like user info, graph metadata, etc.
 *
 * @template VALUE The type of value this visitor exports
 *
 * @example
 * ```typescript
 * const userInfoVisitor: SingleRowVisitor<string> = {
 *   export: (username: string) => {
 *     // Write username to file
 *     fs.writeFileSync('user.txt', username);
 *   },
 *   close: () => {
 *     // Cleanup resources
 *   }
 * };
 *
 * const graphInfoVisitor: SingleRowVisitor<GraphInfo> = {
 *   export: (graphInfo: GraphInfo) => {
 *     // Serialize and write graph metadata
 *   },
 *   close: () => {
 *     // Cleanup resources
 *   }
 * };
 * ```
 */
export interface SingleRowVisitor<VALUE> {
  /**
   * Exports a single value.
   *
   * @param value The value to export
   */
  export(value: VALUE): void;

  /**
   * Closes and cleans up any resources used by this visitor.
   * Called when the export operation is complete.
   */
  close(): void;
}
