import { RelationshipType } from "@/projection";
import { Topology } from "@/api";
import { Direction } from "@/api/schema";
import { MutableRelationshipSchemaEntry } from "@/api/schema";
import { RelationshipPropertyStore } from "@/api/properties";

/**
 * SINGLE TYPE RELATIONSHIPS - CONTAINER FOR RELATIONSHIP DATA
 *
 * Immutable container for relationships of a single type (e.g., "FRIENDS", "FOLLOWS").
 * Holds topology (adjacency structure) and optional properties.
 *
 * SUPPORTS:
 * - Directed relationships (forward only)
 * - Undirected relationships (forward + inverse)
 * - Optional relationship properties
 * - Schema metadata
 */
export interface SingleTypeRelationships {
  /** The topology (adjacency structure) for this relationship type */
  topology(): Topology;

  /** Schema entry containing type and direction information */
  relationshipSchemaEntry(): MutableRelationshipSchemaEntry;

  /** Optional property store for relationship properties */
  properties(): RelationshipPropertyStore | undefined;

  /** Optional inverse topology for undirected relationships */
  inverseTopology(): Topology | undefined;

  /** Optional inverse property store */
  inverseProperties(): RelationshipPropertyStore | undefined;

  /** Filter relationships to include only the given property */
  filter(propertyKey: string): SingleTypeRelationships;
}

/**
 * IMMUTABLE IMPLEMENTATION
 */
class ImmutableSingleTypeRelationships implements SingleTypeRelationships {
  private readonly _topology: Topology;
  private readonly _relationshipSchemaEntry: MutableRelationshipSchemaEntry;
  private readonly _properties?: RelationshipPropertyStore;
  private readonly _inverseTopology?: Topology;
  private readonly _inverseProperties?: RelationshipPropertyStore;

  constructor(config: SingleTypeRelationshipsConfig) {
    this._topology = config.topology;
    this._relationshipSchemaEntry = config.relationshipSchemaEntry;
    this._properties = config.properties;
    this._inverseTopology = config.inverseTopology;
    this._inverseProperties = config.inverseProperties;
  }

  topology(): Topology {
    return this._topology;
  }

  relationshipSchemaEntry(): MutableRelationshipSchemaEntry {
    return this._relationshipSchemaEntry;
  }

  properties(): RelationshipPropertyStore | undefined {
    return this._properties;
  }

  inverseTopology(): Topology | undefined {
    return this._inverseTopology;
  }

  inverseProperties(): RelationshipPropertyStore | undefined {
    return this._inverseProperties;
  }

  filter(propertyKey: string): SingleTypeRelationships {
    const filteredProperties = this._properties?.filter(propertyKey);
    const filteredInverseProperties =
      this._inverseProperties?.filter(propertyKey);

    const entry = this._relationshipSchemaEntry;
    const filteredEntry = new MutableRelationshipSchemaEntry(
      entry.identifier(),
      entry.direction()
    );

    const originalProperty = entry.properties().get(propertyKey);
    if (originalProperty) {
      filteredEntry.addProperty(propertyKey, originalProperty);
    }

    return new ImmutableSingleTypeRelationships({
      topology: this._topology,
      relationshipSchemaEntry: filteredEntry,
      properties: filteredProperties,
      inverseTopology: this._inverseTopology,
      inverseProperties: filteredInverseProperties,
    });
  }
}

/**
 * BUILDER INTERFACE
 */
export interface SingleTypeRelationshipsBuilder {
  topology(topology: Topology): SingleTypeRelationshipsBuilder;
  relationshipSchemaEntry(
    entry: MutableRelationshipSchemaEntry
  ): SingleTypeRelationshipsBuilder;
  properties(
    properties: RelationshipPropertyStore
  ): SingleTypeRelationshipsBuilder;
  inverseTopology(topology: Topology): SingleTypeRelationshipsBuilder;
  inverseProperties(
    properties: RelationshipPropertyStore
  ): SingleTypeRelationshipsBuilder;
  from(source: SingleTypeRelationships): SingleTypeRelationshipsBuilder;
  build(): SingleTypeRelationships;
}

/**
 * BUILDER IMPLEMENTATION
 */
class ImmutableSingleTypeRelationshipsBuilder
  implements SingleTypeRelationshipsBuilder
{
  private config: Partial<SingleTypeRelationshipsConfig> = {};

  topology(topology: Topology): SingleTypeRelationshipsBuilder {
    this.config.topology = topology;
    return this;
  }

  relationshipSchemaEntry(
    entry: MutableRelationshipSchemaEntry
  ): SingleTypeRelationshipsBuilder {
    this.config.relationshipSchemaEntry = entry;
    return this;
  }

  properties(
    properties: RelationshipPropertyStore
  ): SingleTypeRelationshipsBuilder {
    this.config.properties = properties;
    return this;
  }

  inverseTopology(topology: Topology): SingleTypeRelationshipsBuilder {
    this.config.inverseTopology = topology;
    return this;
  }

  inverseProperties(
    properties: RelationshipPropertyStore
  ): SingleTypeRelationshipsBuilder {
    this.config.inverseProperties = properties;
    return this;
  }

  from(source: SingleTypeRelationships): SingleTypeRelationshipsBuilder {
    this.config.topology = source.topology();
    this.config.relationshipSchemaEntry = source.relationshipSchemaEntry();
    this.config.properties = source.properties();
    this.config.inverseTopology = source.inverseTopology();
    this.config.inverseProperties = source.inverseProperties();
    return this;
  }

  build(): SingleTypeRelationships {
    if (!this.config.topology || !this.config.relationshipSchemaEntry) {
      throw new Error("Topology and relationshipSchemaEntry are required");
    }

    const result = new ImmutableSingleTypeRelationships({
      topology: this.config.topology,
      relationshipSchemaEntry: this.config.relationshipSchemaEntry,
      properties: this.config.properties,
      inverseTopology: this.config.inverseTopology,
      inverseProperties: this.config.inverseProperties,
    });

    return this.normalize(result);
  }

  private normalize(
    relationships: SingleTypeRelationships
  ): SingleTypeRelationships {
    let needsRebuild = false;

    // Check if we need to rebuild (but don't rebuild yet)
    const hasEmptyProperties = relationships.properties()?.isEmpty();
    const hasEmptyInverseProperties = relationships
      .inverseProperties()
      ?.isEmpty();

    if (hasEmptyProperties || hasEmptyInverseProperties) {
      needsRebuild = true;
    }

    if (!needsRebuild) {
      return relationships;
    }

    // Rebuild without using SingleTypeRelationships.builder() to avoid circular dependency
    return new ImmutableSingleTypeRelationships({
      topology: relationships.topology(),
      relationshipSchemaEntry: relationships.relationshipSchemaEntry(),
      properties: hasEmptyProperties ? undefined : relationships.properties(),
      inverseTopology: relationships.inverseTopology(),
      inverseProperties: hasEmptyInverseProperties
        ? undefined
        : relationships.inverseProperties(),
    });
  }
}

/**
 * CONFIGURATION INTERFACE
 */
interface SingleTypeRelationshipsConfig {
  topology: Topology;
  relationshipSchemaEntry: MutableRelationshipSchemaEntry;
  properties?: RelationshipPropertyStore;
  inverseTopology?: Topology;
  inverseProperties?: RelationshipPropertyStore;
}

/**
 * STATIC FACTORY AND CONSTANTS
 */
export namespace SingleTypeRelationships {
  /** Lazy EMPTY using Proxy - only this one needs special handling */
  export const EMPTY: SingleTypeRelationships = (() => {
    let _cached: SingleTypeRelationships | undefined;
    return new Proxy({} as SingleTypeRelationships, {
      get(_target, prop) {
        if (!_cached) {
          _cached = new ImmutableSingleTypeRelationships({
            topology: Topology.EMPTY, // Safe - accessed lazily when first used
            relationshipSchemaEntry: new MutableRelationshipSchemaEntry(
              RelationshipType.of("REL"),
              Direction.DIRECTED
            ),
            properties: undefined,
            inverseTopology: undefined,
            inverseProperties: undefined,
          });
        }
        return (_cached as any)[prop];
      },
    });
  })();

  /** Create a new builder */
  export function builder(): SingleTypeRelationshipsBuilder {
    return new ImmutableSingleTypeRelationshipsBuilder();
  }

  /** Factory method to create SingleTypeRelationships with properties */
  export function of(
    relationshipType: RelationshipType,
    topology: Topology,
    direction: Direction,
    properties?: any,
    propertySchema?: any
  ): SingleTypeRelationships {
    const schemaEntry = new MutableRelationshipSchemaEntry(
      relationshipType,
      direction
    );

    const builder = SingleTypeRelationships.builder()
      .topology(topology)
      .relationshipSchemaEntry(schemaEntry);

    if (propertySchema) {
      schemaEntry.addProperty(propertySchema.key(), propertySchema);

      if (properties) {
        // TODO: Create proper RelationshipPropertyStore from properties and schema
      }
    }

    return builder.build();
  }
}
