import { EMPTY_MEMORY_INFO, MemoryInfo } from '@/core/compression/MemoryInfo';
import { AdjacencyCursor } from './AdjacencyCursor';

/**
 * The adjacency list for a mono-partite graph with an optional single relationship property.
 * Provides access to the degree, and the target ids.
 * The methods in here are not final and may be revised under the continuation of
 * Adjacency Compression III – Return of the Iterator
 * One particular change could be that properties will be returned from AdjacencyCursors
 * instead from separate PropertyCursors.
 */
export interface AdjacencyList {
  /**
   * Returns the degree of a node.
   *
   * Undefined behavior if the node does not exist.
   *
   * @param node The node ID
   * @returns The degree (number of outgoing relationships)
   */
  degree(node: number): number;

  adjacencyCursor(node: number): AdjacencyCursor;

  /**
   * Create a new cursor for the target ids of the given node.
   * If the cursor cannot produce property values, it will yield the provided fallbackValue.
   *
   * NOTE: Whether and how AdjacencyCursors will return properties is unclear.
   *
   * Undefined behavior if the node does not exist.
   *
   * @param node The node ID
   * @param fallbackValue The fallback value for properties
   * @returns A cursor for the node's relationships
   */
  adjacencyCursor(node: number, fallbackValue: number): AdjacencyCursor;

  /**
   * Create a new cursor for the target ids of the given node.
   * The cursor is not expected to return correct property values.
   *
   * NOTE: Whether and how AdjacencyCursors will return properties is unclear.
   *
   * The implementation might try to reuse the provided reuse cursor, if possible.
   * That is not guaranteed, however, implementation may choose to ignore the reuse cursor for any reason.
   *
   * Undefined behavior if the node does not exist.
   *
   * @param reuse Optional cursor to reuse
   * @param node The node ID
   * @param fallbackValue The fallback value for properties
   * @returns A cursor for the node's relationships
   */
  adjacencyCursor(
    reuse: AdjacencyCursor | null,
    node: number,
    fallbackValue: number
  ): AdjacencyCursor;

  /**
   * Create a new uninitialized cursor.
   *
   * NOTE: In order to use the returned cursor AdjacencyCursor.init must be called.
   *
   * @returns An uninitialized cursor
   */
  rawAdjacencyCursor(): AdjacencyCursor;

  /**
   * Returns information about on heap and off heap memory usage of this adjacency list.
   *
   * @returns Memory usage information
   */
  memoryInfo(): MemoryInfo;
}

/**
 * Utility functions and constants for AdjacencyList.
 */
export namespace AdjacencyList {
  /**
   * An empty adjacency list implementation.
   */
  export const EMPTY: AdjacencyList = {
    degree(_node: number): number {
      return 0;
    },

    adjacencyCursor(
      arg1: number | AdjacencyCursor | null,
      arg2?: number,
      arg3?: number
    ): AdjacencyCursor {
      // Handles all overloads, always returns empty
      return AdjacencyCursor.empty();
    },

    rawAdjacencyCursor(): AdjacencyCursor {
      return AdjacencyCursor.empty();
    },

    memoryInfo(): MemoryInfo {
      return EMPTY_MEMORY_INFO;
    },
  };
}

/**
 * Extension methods for AdjacencyList.
 */
export function createAdjacencyCursor(list: AdjacencyList, node: number): AdjacencyCursor;
export function createAdjacencyCursor(list: AdjacencyList, reuse: AdjacencyCursor | null, node: number): AdjacencyCursor;

/**
 * Implementation of the extension methods.
 */
export function createAdjacencyCursor(
  list: AdjacencyList,
  nodeOrReuse: number | AdjacencyCursor | null,
  node?: number
): AdjacencyCursor {
  if (typeof nodeOrReuse === 'number') {
    return list.adjacencyCursor(nodeOrReuse, Number.NaN);
  } else {
    return list.adjacencyCursor(nodeOrReuse, node!, Number.NaN);
  }
}
