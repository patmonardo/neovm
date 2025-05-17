import { ValueType } from "./ValueType";
import { Graph } from "./Graph";
import { ExportedRelationship } from "./ExportedRelationship";
import { CompositeRelationshipIterator } from "./CompositeRelationshipIterator";
import { NodePropertyValues } from "./properties/nodes";

/**
 * Interface for entries that can be stored in the ResultStore.
 * Uses the visitor pattern to handle different types of results.
 */
export interface ResultStoreEntry {
  /**
   * Accept a visitor to process this entry.
   *
   * @param visitor The visitor that will process this entry
   * @returns The result of the visitor's processing
   */
  accept<T>(visitor: ResultStoreEntry.Visitor<T>): T;
}

/**
 * Namespace for ResultStoreEntry related types.
 */
export namespace ResultStoreEntry {
  /**
   * Visitor interface for processing different types of result store entries.
   */
  export interface Visitor<T> {
    /**
     * Process a node label entry.
     */
    nodeLabel(nodeLabel: string, nodeCount: number, toOriginalId: (id: number) => number): T;

    /**
     * Process node properties entry.
     */
    nodeProperties(
      nodeLabels: string[],
      propertyKeys: string[],
      propertyValues: NodePropertyValues[],
      toOriginalId: (id: number) => number
    ): T;

    /**
     * Process relationship topology entry.
     */
    relationshipTopology(relationshipType: string, graph: Graph, toOriginalId: (id: number) => number): T;

    /**
     * Process relationships with a single property entry.
     */
    relationships(relationshipType: string, propertyKey: string, graph: Graph, toOriginalId: (id: number) => number): T;

    /**
     * Process a stream of relationships entry.
     */
    relationshipStream(
      relationshipType: string,
      propertyKeys: string[],
      propertyTypes: ValueType[],
      relationshipStream: Iterable<ExportedRelationship>,
      toOriginalId: (id: number) => number
    ): T;

    /**
     * Process relationship iterators entry.
     */
    relationshipIterators(
      relationshipType: string,
      propertyKeys: string[],
      relationshipIterator: CompositeRelationshipIterator,
      toOriginalId: (id: number) => number,
      nodeCount: number
    ): T;
  }

  /**
   * Entry representing a node label result.
   */
  export class NodeLabel implements ResultStoreEntry {
    constructor(
      readonly nodeLabel: string,
      readonly nodeCount: number,
      readonly toOriginalId: (id: number) => number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.nodeLabel(this.nodeLabel, this.nodeCount, this.toOriginalId);
    }
  }

  /**
   * Entry representing node properties result.
   */
  export class NodeProperties implements ResultStoreEntry {
    constructor(
      readonly nodeLabels: string[],
      readonly propertyKeys: string[],
      readonly propertyValues: NodePropertyValues[],
      readonly toOriginalId: (id: number) => number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.nodeProperties(this.nodeLabels, this.propertyKeys, this.propertyValues, this.toOriginalId);
    }
  }

  /**
   * Entry representing relationship topology result.
   */
  export class RelationshipTopology implements ResultStoreEntry {
    constructor(
      readonly relationshipType: string,
      readonly graph: Graph,
      readonly toOriginalId: (id: number) => number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.relationshipTopology(this.relationshipType, this.graph, this.toOriginalId);
    }
  }

  /**
   * Entry representing relationships from a graph result.
   */
  export class RelationshipsFromGraph implements ResultStoreEntry {
    constructor(
      readonly relationshipType: string,
      readonly propertyKey: string,
      readonly graph: Graph,
      readonly toOriginalId: (id: number) => number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.relationships(this.relationshipType, this.propertyKey, this.graph, this.toOriginalId);
    }
  }

  /**
   * Entry representing a stream of relationships result.
   */
  export class RelationshipStream implements ResultStoreEntry {
    constructor(
      readonly relationshipType: string,
      readonly propertyKeys: string[],
      readonly propertyTypes: ValueType[],
      readonly relationshipStream: Iterable<ExportedRelationship>,
      readonly toOriginalId: (id: number) => number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.relationshipStream(
        this.relationshipType,
        this.propertyKeys,
        this.propertyTypes,
        this.relationshipStream,
        this.toOriginalId
      );
    }
  }

  /**
   * Entry representing relationship iterators result.
   */
  export class RelationshipIterators implements ResultStoreEntry {
    constructor(
      readonly relationshipType: string,
      readonly propertyKeys: string[],
      readonly relationshipIterator: CompositeRelationshipIterator,
      readonly toOriginalId: (id: number) => number,
      readonly nodeCount: number
    ) {}

    accept<T>(visitor: Visitor<T>): T {
      return visitor.relationshipIterators(
        this.relationshipType,
        this.propertyKeys,
        this.relationshipIterator,
        this.toOriginalId,
        this.nodeCount
      );
    }
  }
}
