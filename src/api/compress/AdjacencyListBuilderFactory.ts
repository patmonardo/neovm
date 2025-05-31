import { MemoryTracker } from "@/core/compression";
import { AdjacencyListBuilder } from "./AdjacencyListBuilder";

/**
 * A factory for creating AdjacencyListBuilder instances.
 * This factory is generic and can produce builders for both the target adjacency lists
 * and their associated properties, each potentially using different page and type structures.
 *
 * @template TARGET_PAGE The type of page used for target adjacency list data.
 * @template TARGET_TYPE The final type of the built target adjacency list structure.
 * @template PROPERTY_PAGE The type of page used for property data.
 * @template PROPERTY_TYPE The final type of the built property structure.
 */
export interface AdjacencyListBuilderFactory<
  TARGET_PAGE,
  TARGET_TYPE,
  PROPERTY_PAGE,
  PROPERTY_TYPE
> {
  /**
   * Creates a new AdjacencyListBuilder for building the target adjacency list structure.
   *
   * @param memoryTracker A MemoryTracker instance to monitor memory usage during the build process.
   * @returns An AdjacencyListBuilder configured for target adjacency lists.
   */
  newAdjacencyListBuilder(
    memoryTracker: MemoryTracker
  ): AdjacencyListBuilder<TARGET_PAGE, TARGET_TYPE>;

  /**
   * Creates a new AdjacencyListBuilder for building the property structures associated
   * with the adjacency lists.
   *
   * @param memoryTracker A MemoryTracker instance to monitor memory usage during the build process.
   * @returns An AdjacencyListBuilder configured for adjacency list properties.
   */
  newAdjacencyPropertiesBuilder(
    memoryTracker: MemoryTracker
  ): AdjacencyListBuilder<PROPERTY_PAGE, PROPERTY_TYPE>;
}
