import { RelationshipPredicate } from "./RelationshipPredicate";
import { RelationshipCursor } from "./RelationshipCursor";
import { RelationshipConsumer } from "./RelationshipConsumer";
import { RelationshipWithPropertyConsumer } from "./RelationshipWithPropertyConsumer";

/**
 * Interface for iterating over relationships in a graph.
 * Provides methods to traverse the graph structure from node to node.
 */
export interface RelationshipIterator extends RelationshipPredicate {
  /**
   * Calls the given consumer function for every relationship of a given node.
   *
   * @param nodeId ID of the node for which to iterate relationships
   * @param consumer Relationship consumer function
   */
  forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void;

  /**
   * Calls the given consumer function for every relationship of a given node.
   * If the graph was loaded with a relationship property, the property value
   * of the relationship will be passed into the consumer, otherwise the given
   * fallback value will be used.
   *
   * @param nodeId ID of the node for which to iterate relationships
   * @param fallbackValue Value used as relationship property if no properties were loaded
   * @param consumer Relationship consumer function that receives property values
   */
  forEachRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;

  /**
   * Calls the given consumer for every inverse relationship of a given node.
   * Inverse relationships basically mirror the relationships in that graph.
   * For example, if `Graph.forEachRelationship(42)` returns `1337` then the
   * result of `forEachInverseRelationship(1337)` contains `42`. For undirected
   * graphs, accessing the inverse relationships is never supported.
   *
   * Note that this inverse index might not always be present. Check
   * the graph characteristics before calling this method to verify that
   * the graph is inverse indexed.
   *
   * @param nodeId ID of the node for which to iterate the inverse relationships
   * @param consumer Relationship consumer function
   */
  forEachInverseRelationship(
    nodeId: number,
    consumer: RelationshipConsumer
  ): void;

  /**
   * Calls the given consumer for every inverse relationship of a given node.
   * If the graph was loaded with a relationship property, the property value
   * of the relationship will be passed into the consumer, otherwise the given
   * fallback value will be used.
   *
   * Inverse relationships basically mirror the relationships in that graph.
   * For example, if `Graph.forEachRelationship(42)` returns `1337` then the
   * result of `forEachInverseRelationship(1337)` contains `42`. For undirected
   * graphs, accessing the inverse relationships is never supported.
   *
   * Note that this inverse index might not always be present. Check
   * the graph characteristics before calling this method to verify that
   * the graph is inverse indexed.
   *
   * @param nodeId ID of the node for which to iterate the inverse relationships
   * @param fallbackValue Value used as relationship property if no properties were loaded
   * @param consumer Relationship consumer function that receives property values
   */
  forEachInverseRelationship(
    nodeId: number,
    fallbackValue: number,
    consumer: RelationshipWithPropertyConsumer
  ): void;

  /**
   * Returns an iterable which yields every relationship in the graph starting
   * from the given node ID. The ID space returned for source and target nodes is the
   * internal ID space with respect to the graph this method was called on.
   *
   * Each element in the iterable is a RelationshipCursor object. Be careful when storing
   * these objects for later use, as implementations may reuse a single cursor instance.
   *
   * @param nodeId ID of the node for which to iterate the relationships
   * @param fallbackValue Value used as relationship property if no properties were loaded
   * @returns Iterable of relationship cursors
   */
  streamRelationships(
    nodeId: number,
    fallbackValue: number
  ): Iterable<RelationshipCursor>;

  /**
   * Creates a copy of this iterator that reuses new cursors internally,
   * so that iterations happen independent of other iterations.
   *
   * @returns A concurrent-safe copy of this iterator
   */
  concurrentCopy(): RelationshipIterator;
}

/**
 * Namespace for RelationshipIterator utilities and factories.
 */
export namespace RelationshipIterator {
  /**
   * Creates an empty relationship iterator with no relationships.
   *
   * @returns An empty relationship iterator
   */
  export function empty(): RelationshipIterator {
    return {
      exists(_sourceNodeId: number, _targetNodeId: number): boolean {
        return false;
      },

      forEachRelationship(
        nodeId: number,
        consumerOrFallback: RelationshipConsumer | number,
        maybeConsumer?: RelationshipWithPropertyConsumer
      ): void {
        // No-op - no relationships to iterate
      },

      forEachInverseRelationship(
        nodeId: number,
        consumerOrFallback: RelationshipConsumer | number,
        maybeConsumer?: RelationshipWithPropertyConsumer
      ): void {
        // No-op - no relationships to iterate
      },

      streamRelationships(
        _nodeId: number,
        _fallbackValue: number
      ): Iterable<RelationshipCursor> {
        return {
          *[Symbol.iterator]() {
            // Empty iterator - yields nothing
          },
        };
      },

      concurrentCopy(): RelationshipIterator {
        return this;
      },
    };
  }
}
