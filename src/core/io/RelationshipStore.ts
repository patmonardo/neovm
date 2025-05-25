import { RelationshipType } from "@/projection";
import { CompositeRelationshipIterator } from "@/api";
import { GraphStore } from "@/api";
import { IdMap } from "@/api";
import { IdentifierMapper } from "./IdentifierMapper";

/**
 * Storage and access layer for relationship data in the GraphStore.
 * Provides efficient access to relationships, their types, properties, and metadata
 * with support for concurrent access and type mapping.
 */
export class RelationshipStore {
  readonly _nodeCount: number;
  readonly _relationshipCount: number;
  private readonly _propertyCount: number;
  readonly _relationshipIterators: Map<
    RelationshipType,
    CompositeRelationshipIterator
  >;
  private readonly _relationshipTypeMapping: IdentifierMapper<RelationshipType>;
  private readonly _idMap: IdMap;

  private constructor(
    idMap: IdMap,
    relationshipCount: number,
    propertyCount: number,
    relationshipIterators: Map<RelationshipType, CompositeRelationshipIterator>,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ) {
    this._idMap = idMap;
    this._nodeCount = idMap.nodeCount();
    this._relationshipCount = relationshipCount;
    this._propertyCount = propertyCount;
    this._relationshipIterators = relationshipIterators;
    this._relationshipTypeMapping = relationshipTypeMapping;
  }

  /**
   * Factory method that creates a RelationshipStore from a GraphStore.
   *
   * @param graphStore The source GraphStore
   * @param defaultRelationshipType Default type for ALL_RELATIONSHIPS
   * @param relationshipTypeMapping Mapper for converting relationship types to identifiers
   * @returns A new RelationshipStore instance
   */
  static of(
    graphStore: GraphStore,
    defaultRelationshipType: RelationshipType,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ): RelationshipStore {
    const relationshipIterators = new Map<
      RelationshipType,
      CompositeRelationshipIterator
    >();
    let propertyCount = 0;

    for (const relationshipType of graphStore.relationshipTypes()) {
      const outputProperties = Array.from(
        graphStore.relationshipPropertyKeys(relationshipType)
      );

      propertyCount +=
        outputProperties.length *
        graphStore.relationshipCount(relationshipType);

      const outputRelationshipType = relationshipType.equals(
        RelationshipType.ALL_RELATIONSHIPS
      )
        ? defaultRelationshipType
        : relationshipType;

      relationshipIterators.set(
        outputRelationshipType,
        graphStore.getCompositeRelationshipIterator(
          relationshipType,
          outputProperties
        )
      );
    }

    return new RelationshipStore(
      graphStore.nodes(),
      graphStore.relationshipCount(),
      propertyCount,
      relationshipIterators,
      relationshipTypeMapping
    );
  }

  /**
   * Returns the total number of relationship properties across all types.
   */
  propertyCount(): number {
    return this._propertyCount;
  }

  /**
   * Gets the ID map for node ID translations.
   */
  idMap(): IdMap {
    return this._idMap;
  }

  /**
   * Gets the relationship type mapping strategy.
   */
  typeMapping(): IdentifierMapper<RelationshipType> {
    return this._relationshipTypeMapping;
  }

  /**
   * Creates a concurrent copy of this RelationshipStore.
   * Each relationship iterator is copied to allow safe concurrent access.
   *
   * @returns A new RelationshipStore with concurrent-safe iterators
   */
  concurrentCopy(): RelationshipStore {
    const copyIterators = new Map<
      RelationshipType,
      CompositeRelationshipIterator
    >();

    for (const [relationshipType, iterator] of this._relationshipIterators) {
      copyIterators.set(relationshipType, iterator.concurrentCopy());
    }

    return new RelationshipStore(
      this._idMap,
      this._relationshipCount,
      this._propertyCount,
      copyIterators,
      this._relationshipTypeMapping
    );
  }

  /**
   * Gets the total number of nodes.
   */
  nodeCount(): number {
    return this._nodeCount;
  }

  /**
   * Gets the total number of relationships.
   */
  relationshipCount(): number {
    return this._relationshipCount;
  }

  /**
   * Gets the map of relationship iterators by type.
   */
  relationshipIterators(): Map<
    RelationshipType,
    CompositeRelationshipIterator
  > {
    return this._relationshipIterators;
  }

  /**
   * Returns a string representation of this RelationshipStore.
   */
  toString(): string {
    return (
      `RelationshipStore{` +
      `nodeCount=${this._nodeCount}, ` +
      `relationshipCount=${this._relationshipCount}, ` +
      `propertyCount=${this._propertyCount}, ` +
      `relationshipTypes=[${Array.from(this._relationshipIterators.keys())
        .map((t) => t.name)
        .join(", ")}]` +
      `}`
    );
  }

  /**
   * Checks equality with another RelationshipStore.
   */
  equals(other: RelationshipStore): boolean {
    return (
      this._nodeCount === other._nodeCount &&
      this._relationshipCount === other._relationshipCount &&
      this._propertyCount === other._propertyCount &&
      this.mapsEqual(this._relationshipIterators, other._relationshipIterators)
    );
  }

  /**
   * Helper method to compare Map equality by keys.
   */
  private mapsEqual(
    map1: Map<RelationshipType, CompositeRelationshipIterator>,
    map2: Map<RelationshipType, CompositeRelationshipIterator>
  ): boolean {
    if (map1.size !== map2.size) return false;

    for (const [key] of map1) {
      if (!map2.has(key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a hash code for this RelationshipStore.
   */
  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this._nodeCount;
    hash = hash * 31 + this._relationshipCount;
    hash = hash * 31 + this._propertyCount;
    hash = hash * 31 + this._relationshipIterators.size;
    return hash;
  }
}
