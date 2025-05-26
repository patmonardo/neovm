import { NodeLabel } from '@/projection';
import { PropertyMapping } from '@/projection';
import { PropertyMappings } from '@/projection';
import { IdMap } from '@/api/IdMap';
import { PropertyState } from '@/api/PropertyState';
import { NodePropertyStore } from '@/api/properties/nodes/NodePropertyStore';
import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { ImmutableNodeProperty } from '@/api/properties/nodes';
import { ImmutablePropertySchema } from '@/api/schema';
import { MutableNodeSchema } from '@/api/schema';

/**
 * Core data structure representing the complete node collection for a graph.
 *
 * This interface encapsulates everything needed to represent nodes in a graph data structure:
 * the **logical schema** (what node labels and properties exist), the **physical mapping**
 * (how original node IDs map to internal compact IDs), and the **actual property data**
 * (the property values for each node).
 *
 * **Design Philosophy:**
 * - **Immutable by design**: Once created, a Nodes instance represents a fixed snapshot
 * - **Schema-driven**: Properties and labels are governed by an explicit schema
 * - **Memory-efficient**: Uses compact internal ID mapping for optimal memory usage
 * - **Type-safe**: Properties maintain strong type information throughout the system
 * - **Compositional**: Combines multiple concerns (schema, mapping, data) into one coherent unit
 *
 * **Core Components:**
 *
 * **1. Schema (`MutableNodeSchema`):**
 * Defines the logical structure of nodes:
 * - Which node labels exist in the graph
 * - What properties are available for each label
 * - Property types, default values, and constraints
 * - Provides metadata for validation and query planning
 *
 * **2. ID Mapping (`IdMap`):**
 * Handles the critical translation between external and internal node representations:
 * - **Original IDs**: Node IDs as they exist in the source system (Neo4j, CSV, etc.)
 * - **Internal IDs**: Compact, contiguous integers (0, 1, 2, ...) for efficient array indexing
 * - **Bidirectional mapping**: Converts in both directions as needed
 * - **Memory optimization**: Enables dense array storage regardless of sparse original IDs
 *
 * **3. Property Store (`NodePropertyStore`):**
 * Contains the actual property data:
 * - **Typed property values**: Each property maintains its specific data type
 * - **Default value handling**: Manages default values for missing properties
 * - **Efficient storage**: Optimized storage formats for different value types
 * - **Random access**: Fast lookup of property values by internal node ID
 *
 * **Usage Patterns:**
 *
 * **Graph Loading:**
 * ```typescript
 * // Load nodes from external source with property mappings
 * const propertyMappings = new Map([
 *   [NodeLabel.of('Person'), PropertyMappings.of(['name', 'age', 'city'])],
 *   [NodeLabel.of('Company'), PropertyMappings.of(['name', 'industry'])]
 * ]);
 *
 * const propertyValues = new Map([
 *   [PropertyMapping.of('name'), stringPropertyValues],
 *   [PropertyMapping.of('age'), longPropertyValues],
 *   [PropertyMapping.of('city'), stringPropertyValues],
 *   [PropertyMapping.of('industry'), stringPropertyValues]
 * ]);
 *
 * const nodes = Nodes.of(idMap, propertyMappings, propertyValues, PropertyState.PERSISTENT);
 * ```
 *
 * **Algorithm Integration:**
 * ```typescript
 * // Use nodes in graph algorithms
 * const algorithm = new PageRank(graph);
 * const results = algorithm.compute();
 *
 * // Access node properties during processing
 * for (let nodeId = 0; nodeId < nodes.idMap().nodeCount(); nodeId++) {
 *   const originalId = nodes.idMap().toOriginalNodeId(nodeId);
 *   const name = nodes.properties().get('name').values().stringValue(nodeId);
 *   const pageRank = results.get(nodeId);
 *   console.log(`Node ${originalId} (${name}): PageRank = ${pageRank}`);
 * }
 * ```
 *
 * **Property Access:**
 * ```typescript
 * // Type-safe property access
 * const personAge = nodes.properties().get('age');
 * if (personAge && personAge.values().valueType() === ValueType.LONG) {
 *   const age = personAge.values().longValue(internalNodeId);
 *   // Process age value...
 * }
 * ```
 *
 * **Performance Characteristics:**
 * - **ID mapping**: O(1) for both directions (internal ↔ original)
 * - **Property access**: O(1) lookup by property key and internal node ID
 * - **Memory usage**: Linear in number of nodes and properties, with compact storage
 * - **Schema queries**: O(1) for checking label/property existence
 */
export interface Nodes {
  /**
   * The logical schema defining node labels and properties.
   *
   * The schema provides the **metadata layer** that describes what kinds of nodes
   * and properties exist in this graph. It's mutable to allow incremental schema
   * evolution during graph construction, but becomes effectively immutable once
   * the Nodes instance is fully constructed.
   *
   * **Schema Contents:**
   * - **Node labels**: All labels that nodes in this graph can have
   * - **Property definitions**: For each label, what properties are available
   * - **Type information**: The ValueType for each property
   * - **Default values**: What value to use when a property is missing
   * - **Property state**: Whether properties are persistent, computed, etc.
   *
   * **Schema Evolution:**
   * ```typescript
   * const schema = MutableNodeSchema.empty();
   *
   * // Add labels without properties
   * schema.addLabel(NodeLabel.of('EmptyLabel'));
   *
   * // Add labels with properties
   * schema.addProperty(
   *   NodeLabel.of('Person'),
   *   'name',
   *   PropertySchema.of('name', ValueType.STRING, DefaultValue.of('Unknown'))
   * );
   * ```
   *
   * **Query Usage:**
   * ```typescript
   * // Check what's available in the schema
   * const hasPersonLabel = nodes.schema().hasLabel(NodeLabel.of('Person'));
   * const nameProperty = nodes.schema().get(NodeLabel.of('Person')).get('name');
   * const nameType = nameProperty.valueType(); // ValueType.STRING
   * ```
   *
   * @returns The mutable node schema containing label and property definitions
   */
  schema(): MutableNodeSchema;

  /**
   * The ID mapping between original and internal node identifiers.
   *
   * This mapping is **fundamental to graph performance** because it enables:
   * - **Dense array storage**: Internal IDs are contiguous integers starting from 0
   * - **Cache efficiency**: Sequential access patterns for better CPU cache utilization
   * - **Memory optimization**: Property arrays can be exactly sized to node count
   * - **Algorithm efficiency**: Most graph algorithms work on 0-based integer node IDs
   *
   * **ID Mapping Examples:**
   * ```typescript
   * // Original Neo4j node IDs might be: [1000, 5000, 7500, 10000]
   * // Internal IDs would be:             [0,    1,    2,    3]
   *
   * const idMap = nodes.idMap();
   *
   * // Convert original → internal for property lookup
   * const internalId = idMap.toMappedNodeId(5000); // Returns 1
   * const property = nodes.properties().get('name').values().stringValue(internalId);
   *
   * // Convert internal → original for result output
   * const originalId = idMap.toOriginalNodeId(1); // Returns 5000
   * ```
   *
   * **Graph Construction Usage:**
   * ```typescript
   * // During graph loading, ID mapping enables efficient property storage
   * for (const [originalId, properties] of sourceNodes) {
   *   const internalId = idMap.toMappedNodeId(originalId);
   *   propertyArrays.forEach((array, propertyKey) => {
   *     array[internalId] = properties[propertyKey];
   *   });
   * }
   * ```
   *
   * **Algorithm Integration:**
   * ```typescript
   * // Algorithms work with internal IDs for efficiency
   * for (let nodeId = 0; nodeId < idMap.nodeCount(); nodeId++) {
   *   // Process node with internal ID 'nodeId'
   *   const neighbors = graph.neighbors(nodeId);
   *   // ... algorithm logic using internal IDs
   * }
   * ```
   *
   * @returns The ID mapping for converting between original and internal node IDs
   */
  idMap(): IdMap;

  /**
   * The property store containing actual node property values.
   *
   * This store provides **efficient access to all node properties** while maintaining
   * type safety and supporting various value types. It's designed for high-performance
   * random access during graph algorithms and analysis.
   *
   * **Default Implementation:**
   * Returns an empty store by default, supporting graphs that have topology but no
   * node properties. This is common for:
   * - **Pure structural analysis**: Algorithms that only need graph connectivity
   * - **Topology-only graphs**: When properties aren't needed for the analysis
   * - **Testing scenarios**: Simplified graph setups for algorithm testing
   *
   * **Property Store Structure:**
   * ```typescript
   * // Property store maps property keys to typed property instances
   * const store = nodes.properties();
   *
   * // Get a specific property
   * const ageProperty = store.get('age');
   * if (ageProperty) {
   *   const ageValues = ageProperty.values(); // NodePropertyValues
   *   const schema = ageProperty.schema(); // PropertySchema
   *
   *   // Type-safe value access
   *   if (ageValues.valueType() === ValueType.LONG) {
   *     const age = ageValues.longValue(internalNodeId);
   *   }
   * }
   * ```
   *
   * **Performance Characteristics:**
   * - **Property lookup**: O(1) by property key
   * - **Value access**: O(1) by internal node ID
   * - **Memory layout**: Optimized arrays for each value type
   * - **Default handling**: Efficient default value resolution
   *
   * **Multi-Property Access:**
   * ```typescript
   * // Efficient access to multiple properties
   * const properties = nodes.properties();
   * const nameProperty = properties.get('name');
   * const ageProperty = properties.get('age');
   * const cityProperty = properties.get('city');
   *
   * // Batch process all nodes
   * for (let nodeId = 0; nodeId < nodes.idMap().nodeCount(); nodeId++) {
   *   const name = nameProperty?.values().stringValue(nodeId) ?? 'Unknown';
   *   const age = ageProperty?.values().longValue(nodeId) ?? 0;
   *   const city = cityProperty?.values().stringValue(nodeId) ?? 'Unknown';
   *   // Process node with all properties...
   * }
   * ```
   *
   * @returns The property store containing all node property values
   */
  properties(): NodePropertyStore;
}

/**
 * Factory method for creating Nodes instances from property mappings and values.
 *
 * This is the **primary constructor** for Nodes instances, used during graph loading
 * to transform raw property data into the structured Nodes representation. It handles
 * the complex process of:
 * - **Schema inference**: Building the schema from property mappings
 * - **Default value resolution**: Determining appropriate defaults for each property
 * - **Property store construction**: Creating typed property storage
 * - **Validation**: Ensuring consistency between mappings, values, and schema
 *
 * **Construction Process:**
 * 1. **Initialize empty schema and property store builder**
 * 2. **Process each node label and its property mappings**
 * 3. **For labels without properties**: Just add the label to schema
 * 4. **For labels with properties**:
 *    - Create property schema with type and default value
 *    - Add property to schema under the label
 *    - Store property values in the property store
 * 5. **Build and return immutable Nodes instance**
 *
 * **Property Mapping Structure:**
 * ```typescript
 * // Define what properties each label should have
 * const propertyMappings = new Map([
 *   // Person nodes have name, age, and city properties
 *   [NodeLabel.of('Person'), PropertyMappings.of([
 *     PropertyMapping.of('name', 'user_name', ValueType.STRING),
 *     PropertyMapping.of('age', 'user_age', ValueType.LONG),
 *     PropertyMapping.of('city', 'location', ValueType.STRING)
 *   ])],
 *
 *   // Company nodes have different properties
 *   [NodeLabel.of('Company'), PropertyMappings.of([
 *     PropertyMapping.of('name', 'company_name', ValueType.STRING),
 *     PropertyMapping.of('industry', 'sector', ValueType.STRING)
 *   ])],
 *
 *   // Some labels might have no properties
 *   [NodeLabel.of('EmptyLabel'), PropertyMappings.empty()]
 * ]);
 * ```
 *
 * **Property Values Structure:**
 * ```typescript
 * // Provide actual values for each mapped property
 * const propertyValues = new Map([
 *   [PropertyMapping.of('name'), stringArrayPropertyValues],
 *   [PropertyMapping.of('age'), longArrayPropertyValues],
 *   [PropertyMapping.of('city'), stringArrayPropertyValues],
 *   [PropertyMapping.of('industry'), stringArrayPropertyValues]
 * ]);
 * ```
 *
 * **Default Value Resolution:**
 * The method implements intelligent default value resolution:
 * ```typescript
 * // User-defined defaults take precedence
 * const userDefault = propertyMapping.defaultValue();
 * if (userDefault.isUserDefined()) {
 *   // Use explicit default provided by user
 *   defaultValue = userDefault;
 * } else {
 *   // Infer default from property value type
 *   defaultValue = nodePropertyValues.valueType().fallbackValue();
 *   // e.g., 0 for numbers, "" for strings, false for booleans
 * }
 * ```
 *
 * **Usage Examples:**
 *
 * **Loading from CSV:**
 * ```typescript
 * // Load nodes from CSV with property mappings
 * const csvLoader = new CsvNodeLoader('nodes.csv');
 * const { idMap, propertyMappings, propertyValues } = csvLoader.load();
 *
 * const nodes = Nodes.of(
 *   idMap,
 *   propertyMappings,
 *   propertyValues,
 *   PropertyState.PERSISTENT
 * );
 * ```
 *
 * **Loading from Neo4j:**
 * ```typescript
 * // Load nodes from Neo4j database
 * const neo4jLoader = new Neo4jNodeLoader(databaseService);
 * const loadResult = neo4jLoader.loadNodes(nodeQuery);
 *
 * const nodes = Nodes.of(
 *   loadResult.idMap(),
 *   loadResult.propertyMappings(),
 *   loadResult.propertyValues(),
 *   PropertyState.PERSISTENT
 * );
 * ```
 *
 * **Algorithm Result Storage:**
 * ```typescript
 * // Store computed algorithm results as new properties
 * const algorithmResults = pageRank.compute();
 * const resultPropertyValues = NodePropertyValues.of(algorithmResults);
 *
 * const enrichedNodes = Nodes.of(
 *   existingNodes.idMap(),
 *   existingPropertyMappings.plus('pagerank'),
 *   existingPropertyValues.plus(PropertyMapping.of('pagerank'), resultPropertyValues),
 *   PropertyState.TRANSIENT
 * );
 * ```
 *
 * @param idMap The ID mapping between original and internal node identifiers
 * @param propertyMappings Map from node labels to their property definitions
 * @param propertyValues Map from property mappings to actual property value arrays
 * @param propertyState The state of properties (PERSISTENT, TRANSIENT, etc.)
 * @returns A new immutable Nodes instance with the specified configuration
 */
export function createNodes(
  idMap: IdMap,
  propertyMappings: Map<NodeLabel, PropertyMappings>,
  propertyValues: Map<PropertyMapping, NodePropertyValues>,
  propertyState: PropertyState
): Nodes {
  // Initialize empty schema and property store builder
  const nodeSchema = MutableNodeSchema.empty();
  const nodePropertyStoreBuilder = NodePropertyStore.builder();

  // Process each node label and its associated property mappings
  propertyMappings.forEach((mappings, nodeLabel) => {
    if (mappings.mappings().length === 0) {
      // Label has no properties - just add the label to schema
      nodeSchema.addLabel(nodeLabel);
    } else {
      // Label has properties - process each property mapping
      mappings.mappings().forEach(propertyMapping => {
        // Get the actual property values for this mapping
        const nodePropertyValues = propertyValues.get(propertyMapping);
        if (!nodePropertyValues) {
          throw new Error(`No property values found for mapping: ${propertyMapping.propertyKey()}`);
        }

        // Resolve default value: user-defined takes precedence over type fallback
        const defaultValue = propertyMapping.defaultValue().isUserDefined()
          ? propertyMapping.defaultValue()
          : nodePropertyValues.valueType().fallbackValue();

        // Create property schema with type information and default value
        const propertySchema = ImmutablePropertySchema.builder()
          .key(propertyMapping.propertyKey())
          .valueType(nodePropertyValues.valueType())
          .defaultValue(defaultValue)
          .state(propertyState)
          .build();

        // Add property to the schema under this node label
        nodeSchema.addProperty(nodeLabel, propertySchema.key(), propertySchema);

        // Store the property values in the property store
        nodePropertyStoreBuilder.putProperty(
          propertySchema.key(),
          ImmutableNodeProperty.of(nodePropertyValues, propertySchema)
        );
      });
    }
  });

  // Build and return the immutable Nodes instance
  return {
    schema: () => nodeSchema,
    idMap: () => idMap,
    properties: () => nodePropertyStoreBuilder.build()
  };
}

/**
 * Namespace for Nodes-related utilities and factory methods.
 *
 * This provides a clean API that mirrors the original Java static methods
 * while maintaining TypeScript conventions.
 */
export namespace Nodes {
  /**
   * Creates a Nodes instance from property mappings and values.
   *
   * This is the main factory method for constructing Nodes instances during
   * graph loading operations. See `createNodes` function documentation for
   * detailed information about the construction process.
   *
   * @param idMap The ID mapping for node identifiers
   * @param propertyMappings Mapping from labels to their properties
   * @param propertyValues Actual property value arrays
   * @param propertyState State information for the properties
   * @returns New Nodes instance
   */
  export const of = createNodes;
}
