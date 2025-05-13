import { RelationshipType } from "../../RelationshipType";
import {
  SingleTypeRelationships,
  ConcreteSingleTypeRelationships,
} from "./SingleTypeRelationships";
import {
  MutableRelationshipSchema,
  RelationshipSchema,
} from "../../api/schema/MutableRelationshipSchema";
import { SingleTypeRelationshipImporter } from "./SingleTypeRelationshipImporter";
import { Direction } from "../../api/schema/Direction";
import { ImmutableTopology, Topology } from "../../api/ImmutableTopology";
import {
  RelationshipPropertyStore,
  MockRelationshipPropertyStore,
} from "../../api/properties/relationships/RelationshipPropertyStore";
import { Optional } from "../../utils/Optional";
import { MutableRelationshipSchemaEntry } from "../../api/schema/MutableRelationshipSchemaEntry";
import { RelationshipProjection } from "../../RelationshipProjection";
import { AdjacencyProperties } from "../../api/AdjacencyProperties";
import { PropertyMappings } from "../../PropertyMappings";
import {
  MockRelationshipProperty,
  RelationshipProperty,
} from "../../api/properties/relationships/RelationshipProperty";
import { ValueType } from "../../api/nodeproperties/ValueType";
import { PropertyState } from "../../api/PropertyState";
import { ImmutableProperties } from "../../api/properties/relationships/ImmutableProperties";
import { PropertyKey } from "../../PropertyKey";

export interface RelationshipImportResult {
  importResults(): ReadonlyMap<RelationshipType, SingleTypeRelationships>;
  relationshipSchema(): RelationshipSchema; // Changed from MutableRelationshipSchema for the interface
}

// Concrete implementation (like ImmutableRelationshipImportResult)
class ConcreteRelationshipImportResult implements RelationshipImportResult {
  private readonly _importResults: ReadonlyMap<
    RelationshipType,
    SingleTypeRelationships
  >;
  private _relationshipSchema: RelationshipSchema | null = null; // For lazy loading

  constructor(
    importResults: ReadonlyMap<RelationshipType, SingleTypeRelationships>
  ) {
    this._importResults = importResults;
  }

  importResults(): ReadonlyMap<RelationshipType, SingleTypeRelationships> {
    return this._importResults;
  }

  relationshipSchema(): RelationshipSchema {
    if (this._relationshipSchema === null) {
      const schema = MutableRelationshipSchema.empty();
      this._importResults.forEach((relationships) => {
        schema.set(relationships.relationshipSchemaEntry());
      });
      this._relationshipSchema = schema;
    }
    return this._relationshipSchema;
  }

  static builder(): ConcreteRelationshipImportResultBuilder {
    return new ConcreteRelationshipImportResultBuilder();
  }

  static ofMap(
    relationshipsByType: Map<RelationshipType, SingleTypeRelationships>
  ): RelationshipImportResult {
    return new ConcreteRelationshipImportResultBuilder()
      .importResults(relationshipsByType)
      .build();
  }

  static ofContexts(
    importContexts: ReadonlyArray<SingleTypeRelationshipImporter.SingleTypeRelationshipImportContext>
  ): RelationshipImportResult {
    const builders = new Map<
      string,
      ReturnType<typeof ConcreteSingleTypeRelationships.builder>
    >(); // Keyed by RelationshipType.name

    importContexts.forEach((importContext) => {
      const adjacencyListsWithProperties = importContext
        .singleTypeRelationshipImporter()
        .build();
      const isInverseRelationship = importContext
        .inverseOfRelationshipType()
        .isPresent();
      const direction = Direction.fromOrientation(
        importContext.relationshipProjection().orientation()
      );

      const topology = ImmutableTopology.builder()
        .adjacencyList(adjacencyListsWithProperties.adjacency())
        .elementCount(adjacencyListsWithProperties.relationshipCount())
        .isMultiGraph(importContext.relationshipProjection().isMultiGraph())
        .build();

      const propertiesOpt: Optional<RelationshipPropertyStore> = importContext
        .relationshipProjection()
        .properties()
        .isEmpty()
        ? Optional.empty<RelationshipPropertyStore>()
        : Optional.of(
            ConcreteRelationshipImportResult.constructRelationshipPropertyStore(
              importContext.relationshipProjection(),
              adjacencyListsWithProperties.properties(),
              adjacencyListsWithProperties.relationshipCount()
            )
          );

      const schemaEntry = new MutableRelationshipSchemaEntry(
        importContext.relationshipType(),
        direction
      );

      propertiesOpt.ifPresent((props) =>
        props
          .relationshipProperties()
          .forEach((prop, key) =>
            schemaEntry.addProperty(key, prop.propertySchema())
          )
      );

      const relTypeName = importContext.relationshipType().name;
      let importResultBuilder = builders.get(relTypeName);
      if (!importResultBuilder) {
        importResultBuilder =
          ConcreteSingleTypeRelationships.builder().relationshipSchemaEntry(
            schemaEntry
          );
        builders.set(relTypeName, importResultBuilder);
      }

      if (isInverseRelationship) {
        importResultBuilder
          .inverseTopology(topology)
          .inverseProperties(propertiesOpt);
      } else {
        importResultBuilder.topology(topology).properties(propertiesOpt);
      }
    });

    const finalImportResults = new Map<
      RelationshipType,
      SingleTypeRelationships
    >();
    builders.forEach((builder, typeName) => {
      // Find original RelationshipType object to use as key, assuming typeName is unique
      const originalRelType = importContexts
        .find((ctx) => ctx.relationshipType().name === typeName)
        ?.relationshipType();
      if (originalRelType) {
        finalImportResults.set(originalRelType, builder.build());
      }
    });

    return ConcreteRelationshipImportResult.builder()
      .importResults(finalImportResults)
      .build();
  }

  private static constructRelationshipPropertyStore(
    projection: RelationshipProjection,
    propertiesIterable: Iterable<AdjacencyProperties>,
    relationshipCount: number
  ): RelationshipPropertyStore {
    const propertyMappings: PropertyMappings = projection.properties();
    const propertyStoreBuilder = MockRelationshipPropertyStore.builder(); // Use mock builder

    const propertiesIter = propertiesIterable[Symbol.iterator](); // Get iterator

    propertyMappings.mappings().forEach((propertyMapping) => {
      const iterResult = propertiesIter.next();
      if (iterResult.done) {
        // This case should ideally not happen if iterables are sized correctly
        console.warn(
          "Mismatch between property mappings and properties iterable count."
        );
        return;
      }
      const propertiesList: AdjacencyProperties = iterResult.value;

      // In GDS, relationship properties are currently often doubles.
      // The original code hardcodes ValueType.DOUBLE and uses .doubleValue() for default.
      const actualValueType = ValueType.DOUBLE; // As per original Java code's assumption
      const defaultValueForType = propertyMapping.defaultValue().isUserDefined()
        ? propertyMapping.defaultValue()
        : ValueType.fallbackValue(actualValueType);

      propertyStoreBuilder.putIfAbsent(
        propertyMapping.propertyKey(),
        MockRelationshipProperty.of(
          // Use mock
          propertyMapping.propertyKey(),
          actualValueType,
          PropertyState.PERSISTENT, // Defaulting to PERSISTENT as per typical GDS behavior
          ImmutableProperties.of(
            propertiesList,
            relationshipCount,
            defaultValueForType.doubleValue() // Assuming default is double
          ),
          defaultValueForType,
          propertyMapping.aggregation()
        )
      );
    });

    return propertyStoreBuilder.build();
  }
}

// Builder for ConcreteRelationshipImportResult
class ConcreteRelationshipImportResultBuilder {
  private _importResults: Map<RelationshipType, SingleTypeRelationships> =
    new Map();

  public importResults(
    results:
      | Map<RelationshipType, SingleTypeRelationships>
      | ReadonlyMap<RelationshipType, SingleTypeRelationships>
  ): ConcreteRelationshipImportResultBuilder {
    // Ensure it's a mutable map for the builder if it's readonly
    this._importResults = new Map(results);
    return this;
  }

  public build(): RelationshipImportResult {
    return new ConcreteRelationshipImportResult(this._importResults);
  }
}

// Factory to mimic static methods on the interface
export const RelationshipImportResultFactory = {
  builder: ConcreteRelationshipImportResult.builder,
  ofMap: ConcreteRelationshipImportResult.ofMap,
  ofContexts: ConcreteRelationshipImportResult.ofContexts,
};
