import { ValueType } from '@/api/ValueType';
import { PropertyState } from '@/api/PropertyState';
import { RelationshipType } from '@/projection';
import { Direction } from '../Direction';
import { RelationshipSchema } from '../abstract/RelationshipSchema';
import { RelationshipSchemaEntry } from '../abstract/RelationshipSchemaEntry';
import { RelationshipPropertySchema } from '../abstract/RelationshipPropertySchema';
import { MutableRelationshipSchemaEntry } from './MutableRelationshipSchemaEntry';

/**
 * Mutable implementation of RelationshipSchema.
 */
export class MutableRelationshipSchema extends RelationshipSchema {
  private readonly _entries: Map<
    RelationshipType,
    MutableRelationshipSchemaEntry
  >;

  constructor(
    entries: Map<RelationshipType, MutableRelationshipSchemaEntry> = new Map()
  ) {
    super();
    this._entries = entries;
  }

  /**
   * Creates an empty relationship schema with no entries.
   */
  public static empty(): MutableRelationshipSchema {
    return new MutableRelationshipSchema();
  }

  /**
   * Creates a mutable relationship schema from an existing schema.
   */
  public static from(
    fromSchema: RelationshipSchema
  ): MutableRelationshipSchema {
    const relationshipSchema = MutableRelationshipSchema.empty();
    fromSchema.entries().forEach((fromEntry) => {
      relationshipSchema.set(MutableRelationshipSchemaEntry.from(fromEntry));
    });
    return relationshipSchema;
  }

  /**
   * Returns all available relationship types in this schema.
   */
  availableTypes(): Set<RelationshipType> {
    return new Set(this._entries.keys());
  }

  /**
   * Checks if the relationships in this schema are undirected.
   */
  isUndirected(): boolean;
  /**
   * Checks if relationships of a specific type are undirected.
   */
  isUndirected(type: RelationshipType): boolean;
  isUndirected(type?: RelationshipType): boolean {
    if (type === undefined) {
      // A graph with no relationships is considered undirected
      return Array.from(this._entries.values()).every(
        (entry) => entry.direction() === Direction.UNDIRECTED
      );
    }

    const entry = this.get(type);
    return entry !== undefined && entry.direction() === Direction.UNDIRECTED;
  }

  /**
   * Returns a map of relationship types to their directions.
   * @deprecated To be removed
   */
  directions(): Map<RelationshipType, Direction> {
    const result = new Map<RelationshipType, Direction>();
    this._entries.forEach((entry, type) => {
      result.set(type, entry.direction());
    });
    return result;
  }

  /**
   * Returns all schema entries.
   */
  entries(): RelationshipSchemaEntry[] {
    return Array.from(this._entries.values());
  }

  /**
   * Gets a schema entry by its identifier.
   */
  get(identifier: RelationshipType): RelationshipSchemaEntry | undefined {
    return this._entries.get(identifier);
  }

  /**
   * Creates a filtered version of this schema.
   */
  filter(relationshipTypesToKeep: Set<RelationshipType>): RelationshipSchema {
    const filteredEntries = new Map<
      RelationshipType,
      MutableRelationshipSchemaEntry
    >();

    this._entries.forEach((entry, type) => {
      if (relationshipTypesToKeep.has(type)) {
        filteredEntries.set(type, MutableRelationshipSchemaEntry.from(entry));
      }
    });

    return new MutableRelationshipSchema(filteredEntries);
  }

  /**
   * Combines this schema with another schema.
   */
  union(other: RelationshipSchema): RelationshipSchema {
    const unionMap = this.unionEntries(other);
    return new MutableRelationshipSchema(unionMap);
  }

  /**
   * Creates a union of entries from this schema and another schema.
   *
   * @param other The other schema
   * @returns Map of relationship types to merged entries
   */
  protected unionEntries(
    other: RelationshipSchema
  ): Map<RelationshipType, MutableRelationshipSchemaEntry> {
    const entriesMap = new Map<
      RelationshipType,
      MutableRelationshipSchemaEntry
    >();

    // Add entries from this schema
    this._entries.forEach((entry, type) => {
      entriesMap.set(type, MutableRelationshipSchemaEntry.from(entry));
    });

    // Add or merge entries from the other schema
    other.entries().forEach((entry) => {
      const identifier = entry.identifier();
      if (entriesMap.has(identifier)) {
        const existing = entriesMap.get(identifier)!;
        const merged = existing.union(entry) as MutableRelationshipSchemaEntry;
        entriesMap.set(identifier, merged);
      } else {
        entriesMap.set(identifier, MutableRelationshipSchemaEntry.from(entry));
      }
    });

    return entriesMap;
  }

  /**
   * Sets a schema entry.
   */
  public set(entry: MutableRelationshipSchemaEntry): void {
    this._entries.set(entry.identifier(), entry);
  }

  /**
   * Removes a schema entry by its type.
   */
  public remove(identifier: RelationshipType): void {
    this._entries.delete(identifier);
  }

  /**
   * Gets or creates a relationship type entry.
   */
  public getOrCreateRelationshipType(
    relationshipType: RelationshipType,
    direction: Direction
  ): MutableRelationshipSchemaEntry {
    if (!this._entries.has(relationshipType)) {
      this._entries.set(
        relationshipType,
        new MutableRelationshipSchemaEntry(relationshipType, direction)
      );
    }
    return this._entries.get(relationshipType)!;
  }

  /**
   * Adds a relationship type to the schema.
   */
  public addRelationshipType(
    relationshipType: RelationshipType,
    direction: Direction
  ): MutableRelationshipSchema {
    this.getOrCreateRelationshipType(relationshipType, direction);
    return this;
  }

  /**
   * Adds a property to a relationship type.
   */
  public addProperty(
    relationshipType: RelationshipType,
    direction: Direction,
    propertyKey: string,
    valueTypeOrSchema: ValueType | RelationshipPropertySchema,
    propertyState?: PropertyState
  ): MutableRelationshipSchema {
    const entry = this.getOrCreateRelationshipType(relationshipType, direction);

    if (typeof valueTypeOrSchema === "number") {
      // It's a ValueType
      const valueType = valueTypeOrSchema;
      if (propertyState !== undefined) {
        entry.addProperty(propertyKey, valueType, propertyState);
      } else {
        entry.addProperty(propertyKey, valueType);
      }
    } else {
      // It's a RelationshipPropertySchema
      entry.addProperty(propertyKey, valueTypeOrSchema);
    }

    return this;
  }

  /**
   * Checks if this schema equals another object.
   */
  equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof MutableRelationshipSchema)) return false;

    if (this._entries.size !== obj._entries.size) return false;

    for (const [type, entry] of this._entries.entries()) {
      if (!obj._entries.has(type)) return false;

      const otherEntry = obj._entries.get(type)!;
      if (!entry.equals(otherEntry)) return false;
    }

    return true;
  }

  /**
   * Computes a hash code for this schema.
   */
  hashCode(): number {
    let result = 0;

    this._entries.forEach((entry) => {
      result = 31 * result + entry.hashCode();
    });

    return result;
  }
}
