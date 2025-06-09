import { DefaultValue } from "@/api";
import { IdMap, PartialIdMap } from "@/api";
import {
  LongArrayNodePropertyValues,
  NodePropertyValues,
} from "@/api/properties/nodes";
import { HugeSparseLongArrayArray } from "@/collections";
import { Concurrency } from "@/concurrency";
import { DefaultPool } from "@/concurrency";
import { ParallelUtil } from "@/concurrency";
import { GdsValue } from "@/values";
import { InnerNodePropertiesBuilder } from "./InnerNodePropertiesBuilder";

/**
/**
 * LONG ARRAY NODE PROPERTIES BUILDER - THREAD-SAFE ARRAY PROPERTY ACCUMULATION
 *
 * This builder efficiently collects long array values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 *
 * KEY RESPONSIBILITIES:
 * 📊 ARRAY COLLECTION: Accumulates long arrays for nodes during import
 * 🗺️ ID MAPPING: Converts from original Neo4j IDs to internal graph IDs
 * 💾 SPARSE STORAGE: Uses HugeSparseLongArrayArray for memory-efficient storage
 * 🧵 THREAD SAFETY: Supports concurrent property setting from multiple threads
 * 🔍 ARRAY COMPARISON: Efficient default value filtering with proper equality
 *
 * ARRAY-SPECIFIC OPTIMIZATIONS:
 * - Deep equality checking for default value filtering
 * - Null-safe array comparison operations
 * - Memory-efficient storage of variable-length arrays
 * - Parallel processing with proper array boundary handling
 *
 * USE CASES:
 * - Categorical feature vectors (e.g., [1, 3, 7] for category memberships)
 * - ID lists (e.g., [user_id1, user_id2, user_id3] for connections)
 * - Timestamp arrays (e.g., [timestamp1, timestamp2] for event sequences)
 * - Index arrays (e.g., [idx1, idx2, idx3] for multi-dimensional indexing)
 */
/*
 * Builder for long array node properties with thread-safe array handling.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates array values before final build
 * - Template Method: Implements InnerNodePropertiesBuilder interface
 * - Sparse Storage: Only stores non-default arrays for memory efficiency
 * - Parallel Processing: Uses thread pool for ID mapping phase
 */
export class LongArrayNodePropertiesBuilder
  implements InnerNodePropertiesBuilder
{
  private readonly builder: HugeSparseLongArrayArray.Builder;
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
    this.defaultValue = defaultValue.longArrayValue();
    this.concurrency = concurrency;
    this.builder = HugeSparseLongArrayArray.builder(this.defaultValue);
  }

  /**
   * Sets a long array property value for a node (direct array value).
   *
   * PERFORMANCE PATH:
   * - Direct array value setting for maximum performance
   * - No type conversion overhead
   * - Efficient for bulk loading scenarios
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value Long array property value
   */
  public set(neoNodeId: number, value: number[]): void {
    this.builder.set(neoNodeId, value);
  }

  /**
   * Sets a property value from a GdsValue (with type conversion).
   *
   * TYPE CONVERSION:
   * - Converts GdsValue to long array using standard conversion
   * - Handles various input formats (lists, arrays, string arrays)
   * - Throws clear errors for incompatible types
   *
   * @param neoNodeId Original Neo4j node ID
   * @param value GdsValue containing array property data
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    //const longArray = GdsNeo4jValueConversion.getLongArray(value);
    this.set(neoNodeId, value.asObject() as number[]);
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
   * - Skips default values using deep array equality
   * - Runs in parallel using configured concurrency
   *
   * ARRAY-SPECIFIC CONSIDERATIONS:
   * - Deep equality checking for default value filtering
   * - Null-safe array operations throughout
   * - Proper handling of variable-length arrays
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
    const propertiesByMappedIdsBuilder = HugeSparseLongArrayArray.builder(
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

            if (
              this.defaultValue !== null &&
              this.arraysEqual(value, this.defaultValue)
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

    return new LongArrayStoreNodePropertyValues(propertyValues, size);
  }

  /**
   * Deep equality comparison for long arrays.
   *
   * ARRAY EQUALITY SEMANTICS:
   * - Null-safe: handles null arrays correctly
   * - Reference equality: same object returns true immediately
   * - Length check: different lengths are definitely not equal
   * - Element-wise: compares each element for deep equality
   *
   * PERFORMANCE OPTIMIZATION:
   * - Fast path for reference equality (common with default values)
   * - Early exit on length mismatch
   * - Element-wise comparison only when necessary
   *
   * @param a First array to compare
   * @param b Second array to compare
   * @returns true if arrays are deeply equal, false otherwise
   */
  private arraysEqual(a: number[] | null, b: number[] | null): boolean {
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

    // Element-wise comparison
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Implementation of LongArrayNodePropertyValues using HugeSparseLongArrayArray.
 *
 * DESIGN DECISIONS:
 * - Immutable after construction (thread-safe reads)
 * - Sparse storage only stores non-default arrays
 * - Direct delegation to underlying sparse array for efficiency
 * - Null-safe array access operations
 */
class LongArrayStoreNodePropertyValues implements LongArrayNodePropertyValues {
  private readonly propertyValues: HugeSparseLongArrayArray;
  private readonly size: number;

  constructor(propertyValues: HugeSparseLongArrayArray, size: number) {
    this.propertyValues = propertyValues;
    this.size = size;
  }

  /**
   * Get the long array property value for a specific node.
   *
   * SPARSE ARRAY BEHAVIOR:
   * - Returns actual array if explicitly set
   * - Returns default array for unset nodes
   * - Handles null arrays properly
   * - O(1) access time for both cases
   *
   * @param nodeId Internal graph node ID
   * @returns Long array property value for the node
   */
  longArrayValue(nodeId: number): number[] {
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
