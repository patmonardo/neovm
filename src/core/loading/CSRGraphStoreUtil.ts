import { RelationshipType } from "@/projection";
import { ValueType } from "@/api";
import { DatabaseId } from "@/api";
import { DatabaseInfo } from "@/api";
import { DatabaseLocation } from "@/api";
import { Graph } from "@/api";
import { HugeGraph } from "@/core/huge";
import { GraphPropertyStore } from "@/api/properties";
import { NodeProperty } from "@/api/properties";
import { NodePropertyStore } from "@/api/properties";
import { RelationshipProperty } from "@/api/properties";
import { RelationshipPropertyStore } from "@/api/properties";
import { Properties } from "@/api/properties";
import { MutableGraphSchema } from "@/api/schema";
import { Concurrency } from "@/concurrency";
import { GraphStoreBuilder } from "./GraphStoreBuilder";
import { CSRGraphStore } from "./CSRGraphStore";
import { RelationshipImportResult } from "./RelationshipImportResult";
import { SingleTypeRelationships } from "./SingleTypeRelationships";
import { Nodes } from "./Nodes";
import { StaticCapabilities } from "./StaticCapabilities";
import { WriteMode } from "./Capabilities";
import { join } from "@/utils";
import { formatWithLocale } from "@/utils";

/**
 * CSR GRAPH STORE UTIL - GRAPH FORMAT CONVERSION UTILITIES
 *
 * Converts HugeGraph instances into CSRGraphStore format for algorithm processing.
 * Handles single relationship type graphs with optional relationship properties.
 *
 * KEY RESPONSIBILITIES:
 * 🔄 GRAPH CONVERSION: HugeGraph → CSRGraphStore transformation
 * 🏷️ SCHEMA VALIDATION: Ensures single relationship type constraint
 * 📊 PROPERTY MAPPING: Transfers node and relationship properties
 * 🔧 STORE CONSTRUCTION: Builds complete graph store with metadata
 */
export class CSRGraphStoreUtil {
  private constructor() {}

  /**
   * Create a CSRGraphStore from an existing HugeGraph.
   *
   * CONVERSION PROCESS:
   * 1. Validate relationship property exists if requested
   * 2. Ensure graph has at most one relationship type
   * 3. Extract and convert node properties
   * 4. Extract and convert relationship properties
   * 5. Build complete CSRGraphStore with metadata
   *
   * CONSTRAINTS:
   * - Graph must have 0 or 1 relationship types (not multiple)
   * - If relationshipPropertyKey specified, graph must have relationship properties
   * - Relationship schema must have exactly one property if properties present
   *
   * @param databaseId Database identifier for the graph store
   * @param graph Source HugeGraph to convert
   * @param relationshipPropertyKey Optional relationship property to include
   * @param concurrency Concurrency settings for the operation
   * @returns Complete CSRGraphStore ready for algorithm execution
   */
  static createFromGraph(
    databaseId: DatabaseId,
    graph: HugeGraph,
    relationshipPropertyKey: string | undefined,
    concurrency: Concurrency
  ): CSRGraphStore {
    // Validate relationship property exists if requested
    if (relationshipPropertyKey !== undefined) {
      if (!graph.hasRelationshipProperty()) {
        throw new Error(
          formatWithLocale(
            "Expected relationship property '%s', but graph has none.",
            relationshipPropertyKey
          )
        );
      }
    }

    // Extract and validate relationship schema
    const schema = MutableGraphSchema.from(graph.schema());
    const relationshipSchema = schema.relationshipSchema();

    // Ensure single relationship type constraint
    if (relationshipSchema.availableTypes().size > 1) {
      throw new Error(
        formatWithLocale(
          "The supplied graph has more than one relationship type: %s",
          join(
            Array.from(relationshipSchema.availableTypes()).map(
              (type) => type.name
            )
          )
        )
      );
    }

    // Convert node properties from graph
    const nodeProperties =
      CSRGraphStoreUtil.constructNodePropertiesFromGraph(graph);

    // Handle relationship import based on available types
    let relationshipImportResult: RelationshipImportResult;

    if (relationshipSchema.availableTypes().size === 0) {
      // No relationships - empty import result
      relationshipImportResult = RelationshipImportResult.of(re);
    } else {
      // Single relationship type - convert properties and topology
      const relationshipType = relationshipSchema
        .availableTypes()
        .values()
        .next().value;

      const relationshipProperties =
        CSRGraphStoreUtil.constructRelationshipPropertiesFromGraph(
          graph,
          relationshipType!,
          relationshipPropertyKey,
          graph.relationshipProperties()
        );

      relationshipImportResult = RelationshipImportResult.builder()
        .putImportResult(
          relationshipType,
          SingleTypeRelationships.builder()
            // .relationshipSchemaEntry(relationshipSchema.get(relationshipType!))
            //   .topology(graph.relationshipTopology())
            .properties(relationshipProperties)
            .build()
        )
        .build();
    }

    // Build database metadata
    const databaseInfo = DatabaseInfo.of(databaseId, DatabaseLocation.LOCAL);

    // Construct complete CSRGraphStore
    return new GraphStoreBuilder()
      .databaseInfo(databaseInfo)
      .capabilities(StaticCapabilities.of(WriteMode.NONE))
      .schema(schema)
      .nodes(Nodes.of(schema.nodeSchema(), graph.idMap(), nodeProperties))
      .relationshipImportResult(relationshipImportResult)
      .graphProperties(GraphPropertyStore.empty())
      .concurrency(concurrency)
      .build();
  }

  /**
   * Extract and convert node properties from HugeGraph.
   *
   * PROPERTY CONVERSION:
   * - Iterates through all union properties in node schema
   * - Creates NodeProperty instances with original state and default values
   * - Preserves property keys and schemas exactly
   *
   * @param graph Source graph with node properties
   * @returns NodePropertyStore containing all converted properties
   */
  private static constructNodePropertiesFromGraph(
    graph: HugeGraph
  ): NodePropertyStore {
    const nodePropertyStoreBuilder = NodePropertyStore.builder();

    // Convert each property from the graph schema
    graph
      .schema()
      .nodeSchema()
      .unionProperties()
      .forEach((propertySchema, propertyKey) => {
        nodePropertyStoreBuilder.putIfAbsent(
          propertyKey,
          NodeProperty.of(
            propertyKey,
            propertySchema.state(),
            graph.nodeProperties(propertyKey),
            propertySchema.defaultValue()
          )
        );
      });

    return nodePropertyStoreBuilder.build();
  }

  /**
   * Extract and convert relationship properties from HugeGraph.
   *
   * PROPERTY CONVERSION:
   * - Returns empty if no property key or properties specified
   * - Validates exactly one relationship property schema exists
   * - Creates RelationshipProperty with DOUBLE value type and aggregation
   * - Uses schema default value or ValueType fallback
   *
   * @param graph Source graph with relationship properties
   * @param relationshipType The single relationship type
   * @param relationshipPropertyKey Optional property key to extract
   * @param relationshipProperties Optional properties from graph
   * @returns Optional RelationshipPropertyStore with converted properties
   */
  private static constructRelationshipPropertiesFromGraph(
    graph: Graph,
    relationshipType: RelationshipType,
    relationshipPropertyKey: string | undefined,
    relationshipProperties: Properties | undefined
  ): RelationshipPropertyStore | undefined {
    // Return empty if no property key or properties specified
    if (
      relationshipPropertyKey === undefined ||
      relationshipProperties === undefined
    ) {
      return undefined;
    }

    // Get relationship property schemas for validation
    const relationshipPropertySchemas = graph
      .schema()!
      .relationshipSchema()!
      .get(relationshipType)!
      .properties();

    // Validate exactly one property schema exists
    if (relationshipPropertySchemas.size !== 1) {
      throw new Error(
        formatWithLocale(
          "Relationship schema is expected to have exactly one property but had %s",
          relationshipPropertySchemas.size.toString()
        )
      );
    }

    // Get the single relationship property schema
    const relationshipPropertySchema = relationshipPropertySchemas
      .values()
      .next().value;

    // Build relationship property store with converted property
    return RelationshipPropertyStore.builder()
      .putIfAbsent(
        relationshipPropertyKey,
        RelationshipProperty.of(
          relationshipPropertyKey,
          ValueType.DOUBLE,
          relationshipPropertySchema!.state(),
          relationshipProperties,
          relationshipPropertySchema!.defaultValue().isUserDefined()
            ? relationshipPropertySchema!.defaultValue()
            : ValueType.fallbackValue(ValueType.DOUBLE),
          relationshipPropertySchema!.aggregation()
        )
      )
      .build();
  }
}
