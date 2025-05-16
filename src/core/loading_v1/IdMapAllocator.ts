export interface IdMapAllocator {
  /**
   * @returns The number of node ID slots allocated by this allocator.
   */
  allocatedSize(): number;

  /**
   * Inserts the given original node IDs into the allocated space.
   * The length of the `nodeIds` array must match the `allocatedSize()`.
   * @param nodeIds An array of original node IDs (represented as bigints).
   */
  insert(nodeIds: number[]): void;
}
