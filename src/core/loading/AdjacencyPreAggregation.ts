import { Aggregation } from "@/core/Aggregation";
import {
  IndirectSort,
  longBitsToDouble,
  doubleToLongBits,
  LONG_MIN_VALUE,
} from "@/core/compression"; // Adjust path as needed

/**
 * Utility class for pre-aggregating adjacency lists.
 * This is typically done during graph loading to handle duplicate relationships
 * by merging their properties based on specified aggregation strategies.
 */
export namespace AdjacencyPreAggregation {
  /**
   * Value used to replace target IDs for aggregated relationships.
   * If pre-aggregation is applied, the target array is not resized,
   * but the target IDs of consumed duplicates are replaced by this value.
   * This value is then used during compression or further processing to filter out these ignored targets.
   */
  export const IGNORE_VALUE: number = LONG_MIN_VALUE;

  /**
   * Pre-aggregates target IDs and their associated properties within a given range.
   * Duplicate target IDs will have their properties merged into the first occurrence.
   * Subsequent occurrences of a target ID are marked with `IGNORE_VALUE`.
   *
   * Note: This function modifies the `targetIds` and `propertiesList` arrays in place.
   *
   * @param targetIds Array of target node IDs. Modified in place.
   * @param propertiesList Array of property lists. Each inner array corresponds to a property,
   *                       and its elements are the property values for the target IDs.
   *                       The long values are expected to be bit-representations of doubles. Modified in place.
   * @param startOffset The starting index in `targetIds` (and `propertiesList` columns) for pre-aggregation (inclusive).
   * @param endOffset The ending index in `targetIds` (and `propertiesList` columns) for pre-aggregation (exclusive).
   * @param aggregations An array of aggregation strategies, one for each property in `propertiesList`.
   * @returns The number of distinct target IDs remaining in the specified range after aggregation.
   */
  export function preAggregate(
    targetIds: number[],
    propertiesList: number[][], // Each inner array is a property, values are double bits
    startOffset: number,
    endOffset: number,
    aggregations: Aggregation[]
  ): number {
    if (startOffset >= endOffset) {
      return 0;
    }

    // Step 1: Sort the targetIds (indirectly) for the specified range
    // The 'order' array will contain the original indices from targetIds,
    // corresponding to the elements in the [startOffset, endOffset) segment,
    // sorted by their targetId values.
    const order = IndirectSort.mergesort(
      startOffset,
      endOffset - startOffset,
      new AscendingLongComparator(targetIds) // AscendingLongComparator defined in utils
    );

    if (order.length === 0) {
      return 0;
    }

    // Step 2: Aggregate the properties into the first property list of each distinct value.
    //         Every subsequent instance of any value is marked with IGNORE_VALUE.

    // 'targetIndex' is the actual index in 'targetIds' for the current distinct target.
    let targetIndex = order[0];
    let lastSeenTargetId = targetIds[targetIndex];
    let distinctValues = 1;

    // Iterate through the sorted order of original indices
    for (let orderArrIdx = 1; orderArrIdx < order.length; orderArrIdx++) {
      // 'currentIndex' is the actual index in 'targetIds' for the target being considered.
      const currentIndex = order[orderArrIdx];

      if (targetIds[currentIndex] !== lastSeenTargetId) {
        // New distinct target ID found
        targetIndex = currentIndex; // Update targetIndex to this new distinct target's actual index
        lastSeenTargetId = targetIds[currentIndex];
        distinctValues++;
      } else {
        // Duplicate target ID found (targetIds[currentIndex] === lastSeenTargetId)
        // Aggregate properties from 'currentIndex' into 'targetIndex'.
        for (
          let propertyId = 0;
          propertyId < propertiesList.length;
          propertyId++
        ) {
          // propertiesList[propertyId] is the array for the current property.
          // propertiesList[propertyId][targetIndex] is the value for the first occurrence.
          // propertiesList[propertyId][currentIndex] is the value for the duplicate.

          const runningTotalDouble = longBitsToDouble(
            propertiesList[propertyId][targetIndex]
          );
          const valueToMergeDouble = longBitsToDouble(
            propertiesList[propertyId][currentIndex]
          );

          const updatedPropertyDouble = Aggregation.merge(
            aggregations[propertyId],
            runningTotalDouble,
            valueToMergeDouble
          );

          propertiesList[propertyId][targetIndex] = doubleToLongBits(
            updatedPropertyDouble
          );
        }

        // Mark the duplicate target ID to be ignored.
        targetIds[currentIndex] = IGNORE_VALUE;
      }
    }

    return distinctValues;
  }
}
