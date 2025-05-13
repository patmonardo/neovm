import { Concurrency } from "@/concurrency/Concurrency"; // Adjust path as needed
import { IdMapBuilder } from "./loading/IdMapBuilder"; // Adjust path as needed
import { MemoryEstimation } from "../mem/MemoryEstimation"; // Adjust path as needed

/**
 * Defines the behavior for creating IdMapBuilder instances and estimating their memory usage.
 */
export interface IdMapBehavior {
  /**
   * Creates an IdMapBuilder.
   *
   * @param concurrency The concurrency settings to use.
   * @param maxOriginalId An optional hint for the maximum original ID that might be encountered.
   * @param nodeCount An optional hint for the total number of nodes.
   * @returns An IdMapBuilder instance.
   */
  create(
    concurrency: Concurrency,
    maxOriginalId?: number,
    nodeCount?: number
  ): IdMapBuilder;

  /**
   * Attempts to create an IdMapBuilder identified by the given id.
   *
   * If the id is not recognized, implementations may fall back to a default behavior,
   * potentially similar to calling the other `create` method.
   *
   * @param id The identifier for the type of IdMapBuilder to create.
   * @param concurrency The concurrency settings to use.
   * @param maxOriginalId An optional hint for the maximum original ID.
   * @param nodeCount An optional hint for the total number of nodes.
   * @returns An IdMapBuilder instance.
   */
  create(
    id: string,
    concurrency: Concurrency,
    maxOriginalId?: number,
    nodeCount?: number
  ): IdMapBuilder;

  /**
   * Estimates the memory usage for the IdMap structures managed or created by this behavior.
   * @returns A MemoryEstimation object.
   */
  memoryEstimation(): MemoryEstimation;
}
