/**
 * Functional interface for producing visitor instances based on an index.
 * Used in parallel processing scenarios where each worker thread/process
 * needs its own visitor instance.
 *
 * @template VISITOR The type of visitor this producer creates
 *
 * @example
 * ```typescript
 * const nodeVisitorProducer: VisitorProducer<NodeVisitor> = (index: number) => {
 *   return new GraphStoreNodeVisitor.Builder()
 *     .withNodeSchema(schema)
 *     .withNodesBuilder(builders[index])
 *     .build();
 * };
 *
 * // Usage in parallel processing
 * const tasks = ParallelUtil.tasks(concurrency, (index) =>
 *   new ElementImportRunner(
 *     nodeVisitorProducer(index), // Each worker gets its own visitor
 *     iterator,
 *     progressTracker
 *   )
 * );
 * ```
 */
export interface VisitorProducer<VISITOR> {
  /**
   * Produces a visitor instance for the given index.
   * Typically used to create separate visitor instances for parallel workers.
   *
   * @param index The worker/thread index (0-based)
   * @returns A new visitor instance for this worker
   */
  (index: number): VISITOR;
}
