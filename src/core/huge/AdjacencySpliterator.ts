import { AdjacencyCursor } from "@/api";
import { RelationshipCursor } from "@/api/properties/relationships";
import { PropertyCursor } from "@/api/properties/relationships";

/**
 * Provides static factory methods for iterating over adjacency relationships.
 */
export namespace AdjacencySpliterator {
  /**
   * Returns an Iterable of RelationshipCursor for adjacencies without properties.
   */
  export function* of(
    adjacencyCursor: AdjacencyCursor,
    sourceNodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor> {
    const modifiableCursor =
      RelationshipCursor.modifiable().setSourceId(sourceNodeId);
    return (function* () {
      while (adjacencyCursor.hasNextVLong()) {
        modifiableCursor.setTargetId(adjacencyCursor.nextVLong());
        modifiableCursor.setProperty(fallbackValue);
        yield modifiableCursor;
      }
    })();
  }

  /**
   * Returns an Iterable of RelationshipCursor for adjacencies with properties.
   */
  export function* ofWithProperty(
    adjacencyCursor: AdjacencyCursor,
    propertyCursor: PropertyCursor,
    sourceNodeId: number
  ): Iterable<RelationshipCursor> {
    const modifiableCursor =
      RelationshipCursor.modifiable().setSourceId(sourceNodeId);
    return (function* () {
      while (adjacencyCursor.hasNextVLong()) {
        modifiableCursor.setTargetId(adjacencyCursor.nextVLong());
        const propertyBits = propertyCursor.nextLong();
        // Java: double property = Double.longBitsToDouble(propertyBits);
        // In JS, all numbers are floats, so just use propertyBits directly or decode if needed
        modifiableCursor.setProperty(propertyBits);
        yield modifiableCursor;
      }
    })();
  }
}
