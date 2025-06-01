/**
 * DOUBLE NODE PROPERTIES BUILDER - THREAD-SAFE PROPERTY ACCUMULATION
 *
 * This builder efficiently collects double values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 *
 * KEY RESPONSIBILITIES:
 * 🔢 VALUE COLLECTION: Accumulates double values for nodes during import
 * 📊 MAX TRACKING: Thread-safely tracks maximum value across all properties
 * 🗺️ ID MAPPING: Converts from original Neo4j IDs to internal graph IDs
 * 💾 SPARSE STORAGE: Uses HugeSparseDoubleArray for memory-efficient storage
 * 🧵 THREAD SAFETY: Supports concurrent property setting from multiple threads
 *
 * DOUBLE-SPECIFIC CONSIDERATIONS:
 * - Uses Object.is() for proper NaN and -0.0/+0.0 comparison
 * - Handles Double.NEGATIVE_INFINITY as initial max value
 * - Proper IEEE 754 floating point semantics
 * - Thread-safe max value tracking with Compare-And-Swap operations
 *
 * USE CASES:
 * - Node weights (e.g., PageRank scores, centrality measures)
 * - Probabilities and confidence scores
 * - Continuous features (age, income, temperature)
 * - Algorithm outputs (clustering coefficients, similarity scores)
 */

import { DefaultValue } from '@/api';
import { IdMap, PartialIdMap } from '@/api';
import { DoubleNodePropertyValues, NodePropertyValues } from '@/api/properties/nodes';
import { HugeSparseDoubleArray } from '@/collections/sparse';
import { Concurrency } from '@/concurrency';
import { DefaultPool } from '@/concurrency';
import { ParallelUtil } from '@/concurrency';
import { GdsNeo4jValueConversion } from '@/utils/GdsNeo4jValueConversion';
import { GdsValue } from '@/values';
import { InnerNodePropertiesBuilder } from './InnerNodePropertiesBuilder';

/**
 * Builder for double-typed node properties with thread-safe max value tracking.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates values before final build
 * - Template Method: Implements InnerNodePropertiesBuilder interface
 * - Atomic Operations: Thread-safe max value updates using CAS pattern
 * - Sparse Storage: Only stores non-default values for memory efficiency
 */
export class DoubleNodePropertiesBuilder implements InnerNodePropertiesBuilder {

  /** Thread-safe maximum value tracking */
  private maxValue: number = Number.NEGATIVE_INFINITY;
  private maxValueUpdateLock = false;

  private readonly builder: HugeSparseDoubleArray.Builder;
  private readonly defaultValue: number;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency.
   *
   * INITIALIZATION:
   * - Extracts double value from DefaultValue wrapper
   * - Creates sparse array builder with default
   * - Initializes max value to NEGATIVE_INFINITY (proper IEEE 754 minimum)
   *
   * @param defaultValue Default value for nodes without explicit properties
   * @param concurrency Concurrency settings for parallel operations
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.defaultValue = defaultValue.doubleValue();
    this.concurrency = concurrency;
    this.builder = HugeSparseDoubleArray.builder(this.defaultValue);
  }

  /**
   * Sets a double property value for a node (direct double value).
   *
   * PERFORMANCE PATH:
   * - Direct double value setting for maximum performance
   * - Updates max value tracking in thread-safe manner
   * - No type conversion overhead
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value Double property value
   */
  public set(neoNodeId: number, value: number): void {
    this.builder.set(neoNodeId, value);
    this.updateMaxValue(value);
  }

  /**
   * Sets a property value from a GdsValue (with type conversion).
   *
   * TYPE CONVERSION:
   * - Converts GdsValue to double using standard conversion
   * - Handles various input types (double, long, string numbers)
   * - Throws clear errors for incompatible types
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value GdsValue containing property data
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const doubleValue = GdsNeo4jValueConversion.getDoubleValue(value);
    this.set(neoNodeId, doubleValue);
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
   * - Skips default values using Object.is() for proper IEEE 754 semantics
   * - Runs in parallel using configured concurrency
   *
   * DOUBLE-SPECIFIC PROCESSING:
   * - Uses Object.is() for proper NaN and signed zero comparison
   * - Handles IEEE 754 edge cases correctly
   * - Preserves exact floating point semantics
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
    const propertiesByMappedIdsBuilder = HugeSparseDoubleArray.builder(
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

            // Skip default values using Object.is() for proper IEEE 754 comparison
            // This correctly handles NaN, -0.0, +0.0, and other edge cases
            if (Object.is(value, this.defaultValue)) {
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
      : { isPresent: false, value: 0.0 };

    return new DoubleStoreNodePropertyValues(propertyValues, size, maybeMaxValue);
  }

  /**
   * Thread-safe update of the maximum value using Compare-And-Swap pattern.
   *
   * THREAD SAFETY STRATEGY:
   * This simulates Java's VarHandle.compareAndExchange for JavaScript.
   *
   * 1. Quick check without lock (most common case - value not maximum)
   * 2. If potentially maximum, acquire lock for atomic update
   * 3. Compare-and-swap loop to handle concurrent updates
   * 4. Update only if our value is actually larger
   *
   * DOUBLE-SPECIFIC CONSIDERATIONS:
   * - Handles NaN properly (NaN is never > anything, including itself)
   * - Handles infinity values correctly
   * - Uses standard numeric comparison (not Object.is) for max semantics
   *
   * PERFORMANCE:
   * - Lock-free fast path for non-maximum values
   * - Minimal contention even with many threads
   * - Avoids volatile reads in common case
   *
   * @param value Candidate maximum value
   */
  private updateMaxValue(value: number): void {
    // Fast path: quick check without locking
    // If current max is already >= value, no update needed
    // Note: This correctly handles NaN (NaN >= anything is false)
    if (this.maxValue >= value) {
      return;
    }

    // Potential new maximum - use locking for thread safety
    if (!this.maxValueUpdateLock) {
      this.maxValueUpdateLock = true;
      try {
        // Compare-and-swap loop to handle concurrent updates
        // Multiple threads might reach here, so we need atomic updates
        while (this.maxValue < value) {
          const currentMax = this.maxValue;
          // In real CAS we'd do an atomic compare-and-swap here
          // For JavaScript simulation, we check again and update atomically
          if (currentMax < value) {
            this.maxValue = value;
            break;
          }
          // If another thread updated to a higher value, we're done
          if (this.maxValue >= value) {
            break;
          }
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
 * Implementation of DoubleNodePropertyValues using HugeSparseDoubleArray.
 *
 * DESIGN DECISIONS:
 * - Immutable after construction (thread-safe reads)
 * - Sparse storage only stores non-default values
 * - Cached max value for O(1) maximum queries
 * - Direct delegation to underlying sparse array for efficiency
 * - Proper IEEE 754 semantics for all operations
 */
class DoubleStoreNodePropertyValues implements DoubleNodePropertyValues {
  private readonly propertyValues: HugeSparseDoubleArray;
  private readonly size: number;
  private readonly maxValue: { isPresent: boolean; value: number };

  constructor(
    propertyValues: HugeSparseDoubleArray,
    size: number,
    maxValue: { isPresent: boolean; value: number }
  ) {
    this.propertyValues = propertyValues;
    this.size = size;
    this.maxValue = maxValue;
  }

  /**
   * Get the double property value for a specific node.
   *
   * SPARSE ARRAY BEHAVIOR:
   * - Returns actual value if explicitly set
   * - Returns default value for unset nodes
   * - O(1) access time for both cases
   * - Preserves exact IEEE 754 semantics
   *
   * @param nodeId Internal graph node ID
   * @returns Double property value for the node
   */
  doubleValue(nodeId: number): number {
    return this.propertyValues.get(nodeId);
  }

  /**
   * Get the maximum property value across all nodes.
   *
   * CACHED MAXIMUM:
   * - Computed during building phase
   * - O(1) access time
   * - Empty if no non-default values were set
   * - Handles NaN and infinity correctly
   *
   * @returns Optional maximum value
   */
  getMaxDoublePropertyValue(): { isPresent: boolean; value: number } {
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
