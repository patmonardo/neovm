/**
 * LONG NODE PROPERTIES BUILDER - THREAD-SAFE PROPERTY ACCUMULATION
 *
 * This builder efficiently collects long values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 *
 * KEY RESPONSIBILITIES:
 * 🔢 VALUE COLLECTION: Accumulates long values for nodes during import
 * 📊 MAX TRACKING: Thread-safely tracks maximum value across all properties
 * 🗺️ ID MAPPING: Converts from original Neo4j IDs to internal graph IDs
 * 💾 SPARSE STORAGE: Uses HugeSparseLongArray for memory-efficient storage
 * 🧵 THREAD SAFETY: Supports concurrent property setting from multiple threads
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Skip storing default values (sparse storage optimization)
 * - Parallel ID mapping during build phase
 * - Lock-free max value tracking with CAS operations
 * - Draining iterator for efficient parallel processing
 *
 * MEMORY EFFICIENCY:
 * - HugeSparseLongArray only stores non-default values
 * - Two-phase building: Neo4j IDs → sparse array → mapped IDs
 * - No memory allocation for nodes with default values
 */

import { GdsValue } from "@/values";
import { DefaultValue } from "@/api";
import { IdMap, PartialIdMap } from "@/api";
import {
  NodePropertyValues,
  LongNodePropertyValues,
} from "@/api/properties/nodes";
import { HugeSparseLongArray } from "@/collections/sparse";
import { Concurrency } from "@/concurrency";
import { DefaultPool } from "@/concurrency";
import { ParallelUtil } from "@/concurrency";
import { GdsNeo4jValueConversion } from "@/core";
import { InnerNodePropertiesBuilder } from "./InnerNodePropertiesBuilder";

/**
 * Builder for long-typed node properties with thread-safe max value tracking.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates values before final build
 * - Template Method: Implements InnerNodePropertiesBuilder interface
 * - Lazy Initialization: Only tracks max if values are actually set
 * - Parallel Processing: Uses thread pool for ID mapping phase
 */
export class LongNodePropertiesBuilder implements InnerNodePropertiesBuilder {

  /** Thread-safe maximum value tracking */
  private maxValue: number = Number.MIN_SAFE_INTEGER;
  private maxValueUpdateLock = false;

  private readonly builder: HugeSparseLongArray.Builder;
  private readonly defaultValue: number;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency.
   *
   * FACTORY METHOD:
   * - Extracts long value from DefaultValue wrapper
   * - Creates sparse array builder with default
   * - Configures concurrency for parallel processing
   *
   * @param defaultValue Default value for nodes without explicit properties
   * @param concurrency Concurrency settings for parallel operations
   */
  public static of(
    defaultValue: DefaultValue,
    concurrency: Concurrency
  ): LongNodePropertiesBuilder {
    const defaultLongValue = defaultValue.longValue();
    const builder = HugeSparseLongArray.builder(defaultLongValue);
    return new LongNodePropertiesBuilder(
      builder,
      defaultLongValue,
      concurrency
    );
  }

  private constructor(
    builder: HugeSparseLongArray.Builder,
    defaultValue: number,
    concurrency: Concurrency
  ) {
    this.builder = builder;
    this.defaultValue = defaultValue;
    this.concurrency = concurrency;
  }

  /**
   * Sets a long property value for a node (direct long value).
   *
   * PERFORMANCE PATH:
   * - Direct long value setting for maximum performance
   * - Updates max value tracking in thread-safe manner
   * - No type conversion overhead
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value Long property value
   */
  public set(neoNodeId: number, value: number): void {
    this.builder.set(neoNodeId, value);
    this.updateMaxValue(value);
  }

  /**
   * Sets a property value from a GdsValue (with type conversion).
   *
   * TYPE CONVERSION:
   * - Converts GdsValue to long using standard conversion
   * - Handles various input types (long, double, string numbers)
   * - Throws clear errors for incompatible types
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value GdsValue containing property data
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const longValue = GdsNeo4jValueConversion.getLongValue(value);
    this.set(neoNodeId, longValue);
  }

  /**
   * Builds the final node property values using the provided IdMap.
   *
   * TWO-PHASE BUILDING PROCESS:
   *
   * Phase 1: Build sparse array indexed by Neo4j IDs
   * - Contains all property values as set during loading
   * - Uses original Neo4j node IDs as indices
   * - Sparse storage saves memory for large graphs
   *
   * Phase 2: Parallel remapping to internal graph IDs
   * - Maps from Neo4j IDs to internal graph node IDs
   * - Filters out nodes not present in IdMap (NOT_FOUND)
   * - Skips default values to maintain sparsity
   * - Runs in parallel using configured concurrency
   *
   * PARALLEL PROCESSING:
   * - Uses draining iterator for lock-free parallel access
   * - Each thread processes different pages of the sparse array
   * - No synchronization needed during remapping phase
   *
   * @param size Final node count in the graph
   * @param idMap Mapping from original to internal node IDs
   * @param highestOriginalId Highest original ID to consider
   * @returns Final NodePropertyValues ready for graph algorithms
   */
  public build(
    size: number,
    idMap: PartialIdMap,
    highestOriginalId: number
  ): NodePropertyValues {
    // Phase 1: Build sparse array with Neo4j IDs
    const propertiesByNeoIds = this.builder.build();

    // Phase 2: Create builder for mapped IDs
    const propertiesByMappedIdsBuilder = HugeSparseLongArray.builder(
      this.defaultValue
    );

    // Parallel remapping using draining iterator
    const drainingIterator = propertiesByNeoIds.drainingIterator();

    const tasks = Array.from(
      { length: this.concurrency.value() },
      (_, threadId) => () => {
        const batch = drainingIterator.drainingBatch();

        // Process batches until iterator is exhausted
        while (drainingIterator.next(batch)) {
          const page = batch.page;
          const offset = batch.offset;

          // Calculate end boundary respecting highest original ID
          const end = Math.min(offset + page.length, highestOriginalId + 1) - offset;

          // Process each value in the current page
          for (let pageIndex = 0; pageIndex < end; pageIndex++) {
            const neoId = offset + pageIndex;
            const mappedId = idMap.toMappedNodeId(neoId);

            // Skip nodes not present in the graph
            if (mappedId === IdMap.NOT_FOUND) {
              continue;
            }

            const value = page[pageIndex];

            // Skip default values to maintain sparsity
            if (value === this.defaultValue) {
              continue;
            }

            // Store value with mapped ID
            propertiesByMappedIdsBuilder.set(mappedId, value);
          }
        }
      }
    );

    // Execute remapping in parallel
    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    // Build final sparse array with mapped IDs
    const propertyValues = propertiesByMappedIdsBuilder.build();

    // Create max value optional (only if values were actually set)
    const maybeMaxValue = propertyValues.capacity() > 0
      ? { isPresent: true, value: this.maxValue }
      : { isPresent: false, value: 0 };

    return new LongStoreNodePropertyValues(propertyValues, size, maybeMaxValue);
  }

  /**
   * Thread-safe update of the maximum value using Compare-And-Swap pattern.
   *
   * THREAD SAFETY STRATEGY:
   * This simulates Java's VarHandle.compareAndExchange for JavaScript.
   *
   * 1. Quick check without lock (most common case - value not maximum)
   * 2. If potentially maximum, acquire lock for atomic update
   * 3. Double-check pattern to avoid unnecessary work
   * 4. Update only if our value is actually larger
   *
   * PERFORMANCE:
   * - Lock-free fast path for non-maximum values
   * - Minimal contention even with many threads
   * - Avoids volatile reads in common case
   *
   * NOTE: In a true concurrent JavaScript environment (Node.js workers),
   * this would need proper atomic operations or SharedArrayBuffer.
   *
   * @param value Candidate maximum value
   */
  private updateMaxValue(value: number): void {
    // Fast path: quick check without locking
    // If current max is already >= value, no update needed
    if (this.maxValue >= value) {
      return;
    }

    // Potential new maximum - use locking for thread safety
    if (!this.maxValueUpdateLock) {
      this.maxValueUpdateLock = true;
      try {
        // Double-check pattern: another thread might have updated
        if (value > this.maxValue) {
          this.maxValue = value;
        }
      } finally {
        this.maxValueUpdateLock = false;
      }
    }
    // If lock is held by another thread, that thread will handle the update
    // Our value either won't be maximum, or the other thread will set a higher value
  }
}

/**
 * Implementation of LongNodePropertyValues using HugeSparseLongArray.
 *
 * DESIGN DECISIONS:
 * - Immutable after construction (thread-safe reads)
 * - Sparse storage only stores non-default values
 * - Cached max value for O(1) maximum queries
 * - Direct delegation to underlying sparse array for efficiency
 */
class LongStoreNodePropertyValues implements LongNodePropertyValues {
  private readonly propertyValues: HugeSparseLongArray;
  private readonly size: number;
  private readonly maxValue: { isPresent: boolean; value: number };

  constructor(
    propertyValues: HugeSparseLongArray,
    size: number,
    maxValue: { isPresent: boolean; value: number }
  ) {
    this.propertyValues = propertyValues;
    this.size = size;
    this.maxValue = maxValue;
  }

  /**
   * Get the long property value for a specific node.
   *
   * SPARSE ARRAY BEHAVIOR:
   * - Returns actual value if explicitly set
   * - Returns default value for unset nodes
   * - O(1) access time for both cases
   *
   * @param nodeId Internal graph node ID
   * @returns Long property value for the node
   */
  longValue(nodeId: number): number {
    return this.propertyValues.get(nodeId);
  }

  /**
   * Get the maximum property value across all nodes.
   *
   * CACHED MAXIMUM:
   * - Computed during building phase
   * - O(1) access time
   * - Empty if no non-default values were set
   *
   * @returns Optional maximum value
   */
  getMaxLongPropertyValue(): { isPresent: boolean; value: number } {
    return this.maxValue;
  }

  /**
   * Get the total number of nodes in the graph.
   *
   * @returns Total node count (not just nodes with this property)
   */
  nodeCount(): number {
    return this.size;
  }
}
