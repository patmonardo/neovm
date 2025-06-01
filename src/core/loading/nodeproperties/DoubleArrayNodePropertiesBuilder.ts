/**
 * DOUBLE ARRAY NODE PROPERTIES BUILDER - THREAD-SAFE ARRAY PROPERTY ACCUMULATION
 *
 * This builder efficiently collects double array values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 *
 * KEY RESPONSIBILITIES:
 * 📊 ARRAY COLLECTION: Accumulates double arrays for nodes during import
 * 🗺️ ID MAPPING: Converts from original Neo4j IDs to internal graph IDs
 * 💾 SPARSE STORAGE: Uses HugeSparseDoubleArrayArray for memory-efficient storage
 * 🧵 THREAD SAFETY: Supports concurrent property setting from multiple threads
 * 🔍 ARRAY COMPARISON: Efficient default value filtering with proper floating point equality
 *
 * DOUBLE ARRAY SPECIFIC OPTIMIZATIONS:
 * - IEEE 754 compliant array comparison using Object.is()
 * - Null-safe array comparison operations
 * - Memory-efficient storage of variable-length double arrays
 * - Proper handling of NaN, infinity, and signed zeros in arrays
 *
 * USE CASES:
 * - Node embeddings (e.g., [0.1, 0.5, -0.3] for word2vec, node2vec)
 * - Coordinate vectors (e.g., [lat, lng], [x, y, z] for spatial data)
 * - Feature vectors (e.g., [age, income, score] for ML features)
 * - Time series data (e.g., [val1, val2, val3] for temporal sequences)
 * - Probability distributions (e.g., [p1, p2, p3] for categorical probabilities)
 */

import { DefaultValue } from '@/api';
import { IdMap, PartialIdMap } from '@/api';
import { DoubleArrayNodePropertyValues, NodePropertyValues } from '@/api/properties/nodes';
import { HugeSparseDoubleArrayArray } from '@/collections/sparse';
import { Concurrency } from '@/concurrency';
import { DefaultPool } from '@/concurrency';
import { ParallelUtil } from '@/concurrency';
import { GdsNeo4jValueConversion } from '@/utils/GdsNeo4jValueConversion';
import { GdsValue } from '@/values';
import { InnerNodePropertiesBuilder } from './InnerNodePropertiesBuilder';

/**
 * Builder for double array node properties with thread-safe array handling.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates array values before final build
 * - Template Method: Implements InnerNodePropertiesBuilder interface
 * - Sparse Storage: Only stores non-default arrays for memory efficiency
 * - Parallel Processing: Uses thread pool for ID mapping phase
 */
export class DoubleArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {

  private readonly builder: HugeSparseDoubleArrayArray.Builder;
  private readonly defaultValue: number[] | null;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency.
   *
   * ARRAY HANDLING:
   * - Stores reference to default array for comparison
   * - Handles null default values properly
   * - Creates sparse array builder with default
   *
   * @param defaultValue Default array value for nodes without explicit properties
   * @param concurrency Concurrency settings for parallel operations
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.concurrency = concurrency;
    this.defaultValue = defaultValue.doubleArrayValue();
    this.builder = HugeSparseDoubleArrayArray.builder(this.defaultValue);
  }

  /**
   * Sets a double array property value for a node (direct array value).
   *
   * PERFORMANCE PATH:
   * - Direct array value setting for maximum performance
   * - No type conversion overhead
   * - Efficient for bulk loading scenarios
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value Double array property value
   */
  public set(neoNodeId: number, value: number[]): void {
    this.builder.set(neoNodeId, value);
  }

  /**
   * Sets a property value from a GdsValue (with type conversion).
   *
   * TYPE CONVERSION:
   * - Converts GdsValue to double array using standard conversion
   * - Handles various input formats (lists, arrays, string arrays)
   * - Throws clear errors for incompatible types
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value GdsValue containing array property data
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const doubleArray = GdsNeo4jValueConversion.getDoubleArray(value);
    this.set(neoNodeId, doubleArray);
  }

  /**
   * Builds the final node property values using the provided IdMap.
   *
   * TWO-PHASE BUILDING PROCESS:
   *
   * Phase 1: Build sparse array indexed by Neo4j IDs
   * - Contains all array values as set during loading
   * - Uses original Neo4j node IDs as indices
   * - Sparse storage saves memory for large graphs
   *
   * Phase 2: Parallel remapping to internal graph IDs
   * - Maps from Neo4j IDs to internal graph node IDs
   * - Filters out nodes not present in IdMap (NOT_FOUND)
   * - Skips default values using IEEE 754 compliant array equality
   * - Runs in parallel using configured concurrency
   *
   * DOUBLE ARRAY SPECIFIC CONSIDERATIONS:
   * - IEEE 754 compliant equality checking for floating point arrays
   * - Proper handling of NaN, infinity, and signed zeros
   * - Null-safe array operations throughout
   * - Memory-efficient handling of variable-length arrays
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
    const propertiesByMappedIdsBuilder = HugeSparseDoubleArrayArray.builder(
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

          // Process each array value in the current page
          for (let pageIndex = 0; pageIndex < end; pageIndex++) {
            const neoId = offset + pageIndex;
            const mappedId = idMap.toMappedNodeId(neoId);

            // Skip nodes not present in the graph
            if (mappedId === IdMap.NOT_FOUND) {
              continue;
            }

            const value = page[pageIndex];

            // Skip null values and default arrays to maintain sparsity
            if (value === null || value === undefined) {
              continue;
            }

            // Skip default arrays using IEEE 754 compliant comparison
            if (this.defaultValue !== null && this.doubleArraysEqual(value, this.defaultValue)) {
              continue;
            }

            // Store array value with mapped ID
            propertiesByMappedIdsBuilder.set(mappedId, value);
          }
        }
      }
    );

    // Execute remapping in parallel
    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    // Build final sparse array with mapped IDs
    const propertyValues = propertiesByMappedIdsBuilder.build();

    return new DoubleArrayStoreNodePropertyValues(propertyValues, size);
  }

  /**
   * IEEE 754 compliant deep equality comparison for double arrays.
   *
   * ARRAY EQUALITY SEMANTICS:
   * - Null-safe: handles null arrays correctly
   * - Reference equality: same object returns true immediately
   * - Length check: different lengths are definitely not equal
   * - Element-wise: uses Object.is() for proper IEEE 754 comparison
   *
   * IEEE 754 CONSIDERATIONS:
   * - Object.is(NaN, NaN) returns true (unlike === which returns false)
   * - Object.is(-0.0, +0.0) returns false (unlike === which returns true)
   * - Object.is(Infinity, Infinity) returns true
   * - Proper handling of all floating point edge cases
   *
   * PERFORMANCE OPTIMIZATION:
   * - Fast path for reference equality (common with default values)
   * - Early exit on length mismatch
   * - Element-wise comparison only when necessary
   *
   * @param a First array to compare
   * @param b Second array to compare
   * @returns true if arrays are deeply equal using IEEE 754 semantics, false otherwise
   */
  private doubleArraysEqual(a: number[] | null, b: number[] | null): boolean {
    // Handle reference equality (includes both null)
    if (a === b) {
      return true;
    }

    // Handle one being null
    if (a === null || b === null) {
      return false;
    }

    // Handle different lengths
    if (a.length !== b.length) {
      return false;
    }

    // Element-wise comparison using Object.is() for proper IEEE 754 semantics
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Implementation of DoubleArrayNodePropertyValues using HugeSparseDoubleArrayArray.
 *
 * DESIGN DECISIONS:
 * - Immutable after construction (thread-safe reads)
 * - Sparse storage only stores non-default arrays
 * - Direct delegation to underlying sparse array for efficiency
 * - Null-safe array access operations
 * - IEEE 754 compliant floating point handling
 */
class DoubleArrayStoreNodePropertyValues implements DoubleArrayNodePropertyValues {
  private readonly propertyValues: HugeSparseDoubleArrayArray;
  private readonly size: number;

  constructor(
    propertyValues: HugeSparseDoubleArrayArray,
    size: number
  ) {
    this.propertyValues = propertyValues;
    this.size = size;
  }

  /**
   * Get the double array property value for a specific node.
   *
   * SPARSE ARRAY BEHAVIOR:
   * - Returns actual array if explicitly set
   * - Returns default array for unset nodes
   * - Handles null arrays properly
   * - O(1) access time for both cases
   * - Preserves IEEE 754 floating point semantics
   *
   * @param nodeId Internal graph node ID
   * @returns Double array property value for the node
   */
  doubleArrayValue(nodeId: number): number[] {
    return this.propertyValues.get(nodeId);
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
