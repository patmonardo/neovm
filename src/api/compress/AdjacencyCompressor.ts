/**
 * Defines a mapper to transform values before compressing them.
 * Implementations must be thread-safe.
 */
export interface ValueMapper {
  /**
   * Maps a given value to another value.
   * @param value The original value.
   * @returns The transformed value.
   */
  map(value: number): number;
}

/**
 * Interface for compressing adjacency lists.
 * Implementations are responsible for taking uncompressed target lists (and their properties)
 * for a source node and writing them in a compressed format.
 *
 * This interface is analogous to Java's `AutoCloseable`, so a `close` method is included.
 */
export interface AdjacencyCompressor {
  /**
   * Compresses a list of target IDs and their associated properties for a given source node.
   *
   * The input `targets` is an unsorted list of target IDs.
   * The input `properties` is a nested array where the outer array corresponds to different properties,
   * and each inner array contains the property values for the targets at the corresponding indices
   * in the `targets` array.
   *
   * Implementations will write the compressed data to an underlying storage mechanism.
   * The method should return the degree of the compressed adjacency list, which might be
   * different from the input `degree` due to deduplication.
   *
   * @param nodeId The GDS internal ID of the source node.
   * @param targets An array of target node IDs, unsorted.
   * @param properties A 2D array of property values. `properties[i][j]` is the i-th property
   *                   for the j-th target in the `targets` array.
   * @param degree The number of target entries in the `targets` array (and for each property list).
   * @returns The degree of the compressed adjacency list (e.g., after deduplication).
   */
  compress(
    nodeId: number,
    targets: number[],
    properties: number[][],
    degree: number
  ): number;

  /**
   * Closes this compressor and releases any underlying resources.
   * The compressor should not be used after `close()` has been called.
   */
  close(): void;
}
