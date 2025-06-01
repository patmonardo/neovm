/**
 * FLOAT ARRAY NODE PROPERTIES BUILDER - THREAD-SAFE MEMORY-EFFICIENT ARRAY ACCUMULATION
 *
 * This builder efficiently collects float array values during graph loading and
 * builds a compact representation mapped to internal node IDs with memory optimization.
 *
 * KEY RESPONSIBILITIES:
 * 📊 ARRAY COLLECTION: Accumulates float arrays for nodes during import
 * 🗺️ ID MAPPING: Converts from original Neo4j IDs to internal graph IDs
 * 💾 MEMORY EFFICIENCY: Uses Float32Array for 50% memory savings vs double arrays
 * 🧵 THREAD SAFETY: Supports concurrent property setting from multiple threads
 * 🔍 ARRAY COMPARISON: Efficient default value filtering with proper floating point equality
 *
 * FLOAT ARRAY SPECIFIC OPTIMIZATIONS:
 * - Float32 precision (32-bit) vs Double64 precision for memory efficiency
 * - IEEE 754 compliant array comparison using Object.is() for float32 values
 * - Memory-efficient storage for large embedding datasets
 * - Proper handling of float32 range limitations and precision
 *
 * MEMORY EFFICIENCY FOCUS:
 * - Float32Array uses 4 bytes per element vs 8 bytes for Float64Array
 * - Significant savings for large embedding vectors (e.g., 512-dim embeddings)
 * - Sparse storage pattern optimized for missing/default arrays
 *
 * USE CASES:
 * - Memory-efficient node embeddings (word2vec, node2vec with reduced precision)
 * - Compressed feature vectors where float32 precision is sufficient
 * - Large-scale ML features where memory is more important than precision
 * - Mobile/edge deployments with memory constraints
 */

import { DefaultValue } from "@/api";
import { IdMap, PartialIdMap } from "@/api";
import {
  FloatArrayNodePropertyValues,
  NodePropertyValues,
} from "@/api/properties/nodes";
import { HugeSparseFloatArrayArray } from "@/collections/hsa/HugeSparseFloatArrayArray";
import { Concurrency } from "@/concurrency";
import { DefaultPool } from "@/concurrency";
import { ParallelUtil } from "@/concurrency";
import { GdsNeo4jValueConversion } from "@/utils/GdsNeo4jValueConversion";
import { GdsValue } from "@/values";
import { InnerNodePropertiesBuilder } from "./InnerNodePropertiesBuilder";

/**
 * Builder for float array node properties with memory-optimized storage.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates array values before final build
 * - Template Method: Implements InnerNodePropertiesBuilder interface
 * - Memory Optimization: Uses Float32Array for efficient storage
 * - Sparse Storage: Only stores non-default arrays for memory efficiency
 */
export class FloatArrayNodePropertiesBuilder
  implements InnerNodePropertiesBuilder
{
  private readonly builder: HugeSparseFloatArrayArray.Builder;
  private readonly defaultValue: Float32Array | null;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency.
   *
   * MEMORY-EFFICIENT INITIALIZATION:
   * - Converts default value to Float32Array for consistency
   * - Handles null default values properly
   * - Creates sparse array builder optimized for float32 storage
   *
   * @param defaultValue Default array value for nodes without explicit properties
   * @param concurrency Concurrency settings for parallel operations
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.concurrency = concurrency;

    // Convert to Float32Array for memory efficiency and type consistency
    const rawDefault = defaultValue.floatArrayValue();
    this.defaultValue = rawDefault ? new Float32Array(rawDefault) : null;

    this.builder = HugeSparseFloatArrayArray.builder(this.defaultValue);
  }

  /**
   * Sets a float array property value for a node (direct array value).
   *
   * PERFORMANCE PATH:
   * - Converts to Float32Array for memory efficiency
   * - Direct array value setting for maximum performance
   * - No additional type conversion overhead after initial conversion
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value Float array property value (will be converted to Float32Array)
   */
  public set(neoNodeId: number, value: number[]): void {
    // Convert to Float32Array for memory efficiency
    const float32Value = new Float32Array(value);
    this.builder.set(neoNodeId, float32Value);
  }

  /**
   * Sets a property value from a GdsValue (with type conversion).
   *
   * TYPE CONVERSION PIPELINE:
   * - GdsValue → number[] → Float32Array
   * - Handles various input formats (lists, arrays, string arrays)
   * - Ensures memory-efficient storage with float32 precision
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value GdsValue containing array property data
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const floatArray = GdsNeo4jValueConversion.getFloatArray(value);
    this.set(neoNodeId, floatArray);
  }

  /**
   * Builds the final node property values using the provided IdMap.
   *
   * TWO-PHASE BUILDING PROCESS:
   *
   * Phase 1: Build sparse array indexed by Neo4j IDs
   * - Contains all Float32Array values as set during loading
   * - Uses original Neo4j node IDs as indices
   * - Memory-optimized sparse storage
   *
   * Phase 2: Parallel remapping to internal graph IDs
   * - Maps from Neo4j IDs to internal graph node IDs
   * - Filters out nodes not present in IdMap (NOT_FOUND)
   * - Skips default values using Float32Array-aware equality
   * - Runs in parallel using configured concurrency
   *
   * FLOAT32 SPECIFIC CONSIDERATIONS:
   * - Proper Float32Array equality checking
   * - Memory-efficient storage patterns
   * - Float32 precision handling in comparisons
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
    const propertiesByMappedIdsBuilder = HugeSparseFloatArrayArray.builder(
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
          const end =
            Math.min(offset + page.length, highestOriginalId + 1) - offset;

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

            // Skip default arrays using Float32Array-aware comparison
            if (
              this.defaultValue !== null &&
              this.float32ArraysEqual(value, this.defaultValue)
            ) {
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

    return new FloatArrayStoreNodePropertyValues(propertyValues, size);
  }

  /**
   * Float32Array-aware deep equality comparison.
   *
   * FLOAT32 ARRAY EQUALITY SEMANTICS:
   * - Null-safe: handles null arrays correctly
   * - Reference equality: same object returns true immediately
   * - Length check: different lengths are definitely not equal
   * - Element-wise: uses Object.is() for proper IEEE 754 float32 comparison
   * - Type-aware: handles both Float32Array and regular arrays
   *
   * FLOAT32 SPECIFIC CONSIDERATIONS:
   * - Float32 precision may introduce small differences from double conversion
   * - Object.is() handles NaN, infinity, and signed zeros correctly for float32
   * - Memory-efficient comparison without creating temporary arrays
   *
   * PERFORMANCE OPTIMIZATION:
   * - Fast path for reference equality (common with default values)
   * - Early exit on length mismatch
   * - Direct typed array access for performance
   *
   * @param a First Float32Array to compare
   * @param b Second Float32Array to compare
   * @returns true if arrays are deeply equal using IEEE 754 float32 semantics
   */
  private float32ArraysEqual(
    a: Float32Array | null,
    b: Float32Array | null
  ): boolean {
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

    // Element-wise comparison using Object.is() for proper IEEE 754 float32 semantics
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Implementation of FloatArrayNodePropertyValues using HugeSparseFloatArrayArray.
 *
 * DESIGN DECISIONS:
 * - Immutable after construction (thread-safe reads)
 * - Memory-optimized sparse storage using Float32Array
 * - Direct delegation to underlying sparse array for efficiency
 * - Null-safe array access operations
 * - Float32 precision throughout the API
 */
class FloatArrayStoreNodePropertyValues
  implements FloatArrayNodePropertyValues
{
  private readonly propertyValues: HugeSparseFloatArrayArray;
  private readonly size: number;

  constructor(propertyValues: HugeSparseFloatArrayArray, size: number) {
    this.propertyValues = propertyValues;
    this.size = size;
  }

  /**
   * Get the float array property value for a specific node.
   *
   * MEMORY-EFFICIENT ACCESS:
   * - Returns Float32Array for memory efficiency
   * - O(1) access time for both set and unset nodes
   * - Preserves float32 precision and memory characteristics
   * - Returns default Float32Array for unset nodes
   *
   * @param nodeId Internal graph node ID
   * @returns Float32Array property value for the node
   */
  floatArrayValue(nodeId: number): Float32Array {
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
