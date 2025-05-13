import { HugeIntArray } from "../../collections/ha/HugeIntArray"; // Adjust path as needed
import { HugeLongArray } from "../../collections/ha/HugeLongArray"; // Adjust path as needed
import { GdsFeatureToggles } from "../../utils/GdsFeatureToggles"; // Adjust path as needed
import { PageReordering } from "../../core/utils/PageReordering"; // Adjust path as needed

/**
 * Represents a slice of a PAGE.
 * Corresponds to the @Value.Modifiable Slice<PAGE> in Java.
 */
export interface Slice<PAGE> {
  slice(): PAGE;
  offset(): number;
  length(): number;
}

/**
 * Allocator interface for managing PAGE allocations.
 * Corresponds to Allocator<PAGE> in Java.
 */
export interface Allocator<PAGE> {
  /**
   * Allocates a certain size into the given slice.
   * @param allocationSize The size to allocate.
   * @param into The slice to allocate into.
   * @returns A handle or address for the allocation.
   */
  allocate(allocationSize: number, into: Slice<PAGE>): number; // Assuming long return type

  /**
   * Closes the allocator and releases resources.
   */
  close(): void;
}

/**
 * PositionalAllocator interface for writing data at specific addresses.
 * Corresponds to PositionalAllocator<PAGE> in Java.
 */
export interface PositionalAllocator<PAGE> {
  /**
   * Writes data at a specific address.
   * @param address The address to write to.
   * @param targets The PAGE data to write.
   * @param length The length of the data to write from the targets PAGE.
   */
  writeAt(address: number, targets: PAGE, length: number): void;

  /**
   * Closes the allocator and releases resources.
   */
  close(): void;
}

/**
 * Interface for building an adjacency list structure of type T,
 * using a paged allocation mechanism.
 * @template PAGE The type of the page used for allocations.
 * @template T The type of the final structure being built.
 */
export interface AdjacencyListBuilder<PAGE, T> {
  /**
   * Creates a new allocator for managing PAGEs.
   */
  newAllocator(): Allocator<PAGE>;

  /**
   * Creates a new positional allocator for writing PAGE data at specific locations.
   */
  newPositionalAllocator(): PositionalAllocator<PAGE>;

  /**
   * Builds the final structure of type T.
   * @param degrees A HugeIntArray containing the degrees of nodes.
   * @param offsets A HugeLongArray containing the offsets for adjacency lists.
   * @param allowReordering A boolean indicating if reordering is allowed for optimization.
   * @returns The built structure of type T.
   */
  build(
    degrees: HugeIntArray,
    offsets: HugeLongArray,
    allowReordering: boolean
  ): T;
}

/**
 * Utility functions related to AdjacencyListBuilder.
 * This namespace can house helper functions, including those that were
 * default methods in the Java interface.
 */
export namespace AdjacencyListBuilderUtils {
  /**
   * Reorders pages based on offsets and degrees if the feature toggle is enabled.
   * This function corresponds to the default `reorder` method in the Java AdjacencyListBuilder interface.
   *
   * @param pages An array of PAGEs to be reordered.
   * @param offsets A HugeLongArray containing the offsets.
   * @param degrees A HugeIntArray containing the degrees.
   */
  export function reorder<PAGE>(
    pages: PAGE[],
    offsets: HugeLongArray,
    degrees: HugeIntArray
  ): void {
    if (
      GdsFeatureToggles.USE_REORDERED_ADJACENCY_LIST.isEnabled() &&
      pages.length > 0
    ) {
      PageReordering.reorder(pages, offsets, degrees);
    }
  }
}
