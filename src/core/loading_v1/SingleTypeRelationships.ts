import { RelationshipType } from "../../RelationshipType"; // Adjust path
import { Topology, ImmutableTopology } from "../../api/ImmutableTopology"; // Adjust path
import {
  RelationshipPropertyStore,
  MockRelationshipPropertyStore,
} from "../../api/properties/relationships/RelationshipPropertyStore"; // Adjust path
import { MutableRelationshipSchemaEntry } from "../../api/schema/MutableRelationshipSchemaEntry"; // Adjust path
import { Direction } from "../../api/schema/Direction"; // Adjust path
import { Optional } from "../../utils/Optional"; // Adjust path
import { Properties } from "../../api/properties/relationships/ImmutableProperties"; // Adjust path
import {
  PropertySchema,
  MockPropertySchema,
} from "../../api/schema/PropertySchema"; // Adjust path, using PropertySchema for RelationshipPropertySchema
import { ImmutableRelationshipProperty } from "../../api/properties/relationships/ImmutableRelationshipProperty"; // Adjust path
import { PropertyKey } from "../../PropertyKey"; // Adjust path

export interface SingleTypeRelationships {
  topology(): Topology;
  relationshipSchemaEntry(): MutableRelationshipSchemaEntry; // In Java, this is RelationshipSchemaEntry
  properties(): Optional<RelationshipPropertyStore>;
  inverseTopology(): Optional<Topology>;
  inverseProperties(): Optional<RelationshipPropertyStore>;

  filter(propertyKey: string): SingleTypeRelationships;
}

// Concrete implementation (like ImmutableSingleTypeRelationships)
class ConcreteSingleTypeRelationships implements SingleTypeRelationships {
  private readonly _topology: Topology;
  private readonly _relationshipSchemaEntry: MutableRelationshipSchemaEntry;
  private readonly _properties: Optional<RelationshipPropertyStore>;
  private readonly _inverseTopology: Optional<Topology>;
  private readonly _inverseProperties: Optional<RelationshipPropertyStore>;

  constructor(
    topology: Topology,
    relationshipSchemaEntry: MutableRelationshipSchemaEntry,
    properties: Optional<RelationshipPropertyStore>,
    inverseTopology: Optional<Topology>,
    inverseProperties: Optional<RelationshipPropertyStore>
  ) {
    this._topology = topology;
    this._relationshipSchemaEntry = relationshipSchemaEntry;

    // Normalize: If properties/inverseProperties store is present but empty, treat as not present.
    this._properties = properties.flatMap((p) =>
      p.isEmpty() ? Optional.empty() : Optional.of(p)
    );
    this._inverseProperties = inverseProperties.flatMap((ip) =>
      ip.isEmpty() ? Optional.empty() : Optional.of(ip)
    );
  }

  topology = (): Topology => this._topology;
  relationshipSchemaEntry = (): MutableRelationshipSchemaEntry =>
    this._relationshipSchemaEntry;
  properties = (): Optional<RelationshipPropertyStore> => this._properties;
  inverseTopology = (): Optional<Topology> => this._inverseTopology;
  inverseProperties = (): Optional<RelationshipPropertyStore> =>
    this._inverseProperties;

  public filter(propertyKey: string): SingleTypeRelationships {
    const filteredProperties = this.properties().map((store) =>
      store.filter(propertyKey)
    );
    const filteredInverseProperties = this.inverseProperties().map((store) =>
      store.filter(propertyKey)
    );

    const entry = this.relationshipSchemaEntry();
    const propertySchemaForKey = entry.properties.get(propertyKey); // Assuming properties is Map<string, PropertySchema>

    const filteredEntry = new MutableRelationshipSchemaEntry(
      entry.type,
      entry.direction
    );
    if (propertySchemaForKey) {
      // Ensure PropertyKey.of(propertyKey) is used if entry.properties keys are PropertyKey objects
      filteredEntry.addProperty(
        PropertyKey.of(propertyKey),
        propertySchemaForKey
      );
    }

    return new ConcreteSingleTypeRelationshipsBuilder()
      .topology(this.topology())
      .relationshipSchemaEntry(filteredEntry)
      .inverseTopology(this.inverseTopology().orElse(null)) // Builder expects T or null for optional
      .properties(filteredProperties)
      .inverseProperties(filteredInverseProperties)
      .build();
  }

  static builder(): ConcreteSingleTypeRelationshipsBuilder {
    return new ConcreteSingleTypeRelationshipsBuilder();
  }
}

class ConcreteSingleTypeRelationshipsBuilder {
  private _topology?: Topology;
  private _relationshipSchemaEntry?: MutableRelationshipSchemaEntry;
  private _properties: Optional<RelationshipPropertyStore> = Optional.empty();
  private _inverseTopology: Optional<Topology> = Optional.empty();
  private _inverseProperties: Optional<RelationshipPropertyStore> =
    Optional.empty();

  public topology(val: Topology): ConcreteSingleTypeRelationshipsBuilder {
    this._topology = val;
    return this;
  }
  public relationshipSchemaEntry(
    val: MutableRelationshipSchemaEntry
  ): ConcreteSingleTypeRelationshipsBuilder {
    this._relationshipSchemaEntry = val;
    return this;
  }
  public properties(
    val: Optional<RelationshipPropertyStore>
  ): ConcreteSingleTypeRelationshipsBuilder {
    this._properties = val;
    return this;
  }
  public inverseTopology(
    val: Topology | null
  ): ConcreteSingleTypeRelationshipsBuilder {
    // Allow null for orElse(null)
    this._inverseTopology = Optional.ofNullable(val);
    return this;
  }
  public inverseProperties(
    val: Optional<RelationshipPropertyStore>
  ): ConcreteSingleTypeRelationshipsBuilder {
    this._inverseProperties = val;
    return this;
  }

  public from(
    instance: SingleTypeRelationships
  ): ConcreteSingleTypeRelationshipsBuilder {
    this._topology = instance.topology();
    this._relationshipSchemaEntry = instance.relationshipSchemaEntry();
    this._properties = instance.properties();
    this._inverseTopology = instance.inverseTopology();
    this._inverseProperties = instance.inverseProperties();
    return this;
  }

  public build(): SingleTypeRelationships {
    if (!this._topology || !this._relationshipSchemaEntry) {
      throw new Error("Topology and RelationshipSchemaEntry are required.");
    }
    return new ConcreteSingleTypeRelationships(
      this._topology,
      this._relationshipSchemaEntry,
      this._properties,
      this._inverseTopology,
      this._inverseProperties
    );
  }
}

export namespace SingleTypeRelationships {
  export const EMPTY: SingleTypeRelationships =
    ConcreteSingleTypeRelationships.builder()
      .relationshipSchemaEntry(
        new MutableRelationshipSchemaEntry(
          RelationshipType.of("REL"),
          Direction.NATURAL
        )
      ) // GDS uses NATURAL for directed
      .topology(Topology.EMPTY)
      .build();

  export function builder(): ConcreteSingleTypeRelationshipsBuilder {
    return ConcreteSingleTypeRelationships.builder();
  }

  export function of(
    relationshipType: RelationshipType,
    topology: Topology,
    direction: Direction,
    propertiesOpt: Optional<Properties<any>>, // Java: Optional<Properties>
    propertySchemaOpt: Optional<PropertySchema> // Java: Optional<RelationshipPropertySchema>
  ): SingleTypeRelationships {
    const schemaEntry = new MutableRelationshipSchemaEntry(
      relationshipType,
      direction
    );
    propertySchemaOpt.ifPresent((schema) =>
      schemaEntry.addProperty(schema.key(), schema)
    );

    return SingleTypeRelationships.builder()
      .topology(topology)
      .relationshipSchemaEntry(schemaEntry)
      .properties(
        propertySchemaOpt.flatMap<RelationshipPropertyStore>((schema) => {
          // Use flatMap for Optional<Optional<T>>
          if (!propertiesOpt.isPresent()) {
            // Original Java throws IllegalStateException if properties are needed but not present.
            // This can be debated: should it be an error or just an empty property store?
            // For now, let's assume if schema is present, properties should be too for that schema.
            throw new Error(
              "Properties are required when propertySchema is present."
            );
          }
          const relationshipProperty = ImmutableRelationshipProperty.builder() // Using the namespace
            .values(propertiesOpt.get()) // get() will throw if not present
            .propertySchema(schema)
            .build();
          return Optional.of(
            MockRelationshipPropertyStore.builder() // Use mock builder
              .putRelationshipProperty(schema.key(), relationshipProperty)
              .build()
          );
        })
      )
      .build();
  }
}
