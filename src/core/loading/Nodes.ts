import {
  NodeLabel,
  PropertyMapping,
  PropertyMappings,
  PropertyState,
} from "@/api";
import { ValueType } from "@/api/nodeproperties";
import { IdMap } from "@/api/graph";
import { NodePropertyValues } from "@/api/properties/nodes";
import {
  MutableNodeSchema,
  NodePropertyStore,
  NodeProperty,
  PropertySchema,
} from "@/api/schema";

/**
 * Immutable value class representing the complete node dataset.
 * Contains schema information, ID mapping, and property storage.
 *
 * This is the final assembled structure that contains:
 * - Node schema (labels and property definitions)
 * - ID mapping (original → internal node IDs)
 * - Property storage (actual property values)
 */
export interface Nodes {
  readonly schema: MutableNodeSchema;
  readonly idMap: IdMap;
  readonly properties: NodePropertyStore;
}

/**
 * Implementation of the Nodes interface.
 */
export class NodesImpl implements Nodes {
  readonly schema: MutableNodeSchema;
  readonly idMap: IdMap;
  readonly properties: NodePropertyStore;

  constructor(
    schema: MutableNodeSchema,
    idMap: IdMap,
    properties: NodePropertyStore = NodePropertyStore.empty()
  ) {
    this.schema = schema;
    this.idMap = idMap;
    this.properties = properties;
  }

  /**
   * Get node count from the ID map.
   */
  nodeCount(): number {
    return this.idMap.nodeCount();
  }

  /**
   * Get the highest node ID in the system.
   */
  highestNodeId(): number {
    return this.idMap.highestOriginalId();
  }

  /**
   * Check if the nodes structure has properties.
   */
  hasProperties(): boolean {
    return !this.properties.isEmpty();
  }

  /**
   * Get statistics about the nodes structure.
   */
  getStats(): NodesStats {
    const labelCount = this.schema.availableLabels().size;
    const propertyCount = Array.from(
      this.schema.allProperties().values()
    ).reduce((sum, props) => sum + props.size, 0);

    return {
      nodeCount: this.nodeCount(),
      labelCount,
      propertyCount,
      highestNodeId: this.highestNodeId(),
      hasProperties: this.hasProperties(),
      idMapType: this.idMap.typeId(),
    };
  }

  /**
   * Validate the consistency of the nodes structure.
   */
  validate(): ValidationResult {
    const issues: string[] = [];

    try {
      // Validate node count consistency
      if (this.nodeCount() < 0) {
        issues.push("Node count cannot be negative");
      }

      // Validate schema consistency
      const schemaLabels = this.schema.availableLabels();
      for (const label of schemaLabels) {
        const properties = this.schema.properties(label);
        for (const [propertyKey, propertySchema] of properties) {
          if (!this.properties.hasProperty(propertyKey)) {
            issues.push(
              `Schema defines property '${propertyKey}' but property store does not contain it`
            );
          }
        }
      }

      // Validate property store consistency
      for (const propertyKey of this.properties.propertyKeys()) {
        const nodeProperty = this.properties.getProperty(propertyKey);
        if (nodeProperty) {
          const propertyNodeCount = nodeProperty.values().nodeCount();
          if (propertyNodeCount !== this.nodeCount()) {
            issues.push(
              `Property '${propertyKey}' has ${propertyNodeCount} values but nodes has ${this.nodeCount()}`
            );
          }
        }
      }
    } catch (error) {
      issues.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: this.getStats(),
    };
  }
}

/**
 * Factory class for creating Nodes instances.
 */
export class NodesFactory {
  /**
   * Create a Nodes instance from property mappings and values.
   * This is the main factory method that assembles the complete node structure.
   */
  static of(
    idMap: IdMap,
    propertyMappings: Map<NodeLabel, PropertyMappings>,
    propertyValues: Map<PropertyMapping, NodePropertyValues>,
    propertyState: PropertyState
  ): Nodes {
    const nodeSchema = MutableNodeSchema.empty();
    const nodePropertyStoreBuilder = NodePropertyStore.builder();

    // Process each label and its property mappings
    propertyMappings.forEach((mappings, nodeLabel) => {
      if (mappings.mappings().size === 0) {
        // Label with no properties
        nodeSchema.addLabel(nodeLabel);
      } else {
        // Label with properties
        mappings.mappings().forEach((propertyMapping) => {
          const nodePropertyValues = propertyValues.get(propertyMapping);
          if (!nodePropertyValues) {
            throw new Error(
              `No property values found for mapping: ${propertyMapping.propertyKey()}`
            );
          }

          // Determine default value (user-defined or inferred)
          const defaultValue = propertyMapping.defaultValue().isUserDefined()
            ? propertyMapping.defaultValue()
            : nodePropertyValues.valueType().fallbackValue();

          // Create property schema
          const propertySchema = PropertySchema.builder()
            .key(propertyMapping.propertyKey())
            .valueType(nodePropertyValues.valueType())
            .defaultValue(defaultValue)
            .state(propertyState)
            .build();

          // Add to node schema
          nodeSchema.addProperty(
            nodeLabel,
            propertySchema.key(),
            propertySchema
          );

          // Add to property store
          const nodeProperty = NodeProperty.of(
            nodePropertyValues,
            propertySchema
          );
          nodePropertyStoreBuilder.putProperty(
            propertySchema.key(),
            nodeProperty
          );
        });
      }
    });

    return new NodesImpl(nodeSchema, idMap, nodePropertyStoreBuilder.build());
  }

  /**
   * Create a Nodes instance with only an ID map (no properties).
   */
  static withIdMapOnly(idMap: IdMap): Nodes {
    return new NodesImpl(
      MutableNodeSchema.empty(),
      idMap,
      NodePropertyStore.empty()
    );
  }

  /**
   * Create a Nodes instance with labels but no properties.
   */
  static withLabels(idMap: IdMap, labels: NodeLabel[]): Nodes {
    const schema = MutableNodeSchema.empty();
    labels.forEach((label) => schema.addLabel(label));

    return new NodesImpl(schema, idMap, NodePropertyStore.empty());
  }

  /**
   * Create a Nodes instance for testing with mock data.
   */
  static mock(nodeCount: number): Nodes {
    const mockIdMap = createMockIdMap(nodeCount);
    const schema = MutableNodeSchema.empty();
    schema.addLabel(NodeLabel.of("TestNode"));

    return new NodesImpl(schema, mockIdMap, NodePropertyStore.empty());
  }
}

/**
 * Builder class for constructing Nodes instances incrementally.
 */
export class NodesBuilder {
  private readonly idMap: IdMap;
  private readonly schema = MutableNodeSchema.empty();
  private readonly propertyStoreBuilder = NodePropertyStore.builder();
  private propertyState = PropertyState.PERSISTENT;

  constructor(idMap: IdMap) {
    this.idMap = idMap;
  }

  /**
   * Add a label to the schema.
   */
  addLabel(label: NodeLabel): NodesBuilder {
    this.schema.addLabel(label);
    return this;
  }

  /**
   * Add a property to a specific label.
   */
  addProperty(
    label: NodeLabel,
    propertyKey: string,
    propertyValues: NodePropertyValues,
    defaultValue?: any
  ): NodesBuilder {
    const resolvedDefaultValue =
      defaultValue !== undefined
        ? defaultValue
        : propertyValues.valueType().fallbackValue();

    const propertySchema = PropertySchema.builder()
      .key(propertyKey)
      .valueType(propertyValues.valueType())
      .defaultValue(resolvedDefaultValue)
      .state(this.propertyState)
      .build();

    this.schema.addProperty(label, propertyKey, propertySchema);

    const nodeProperty = NodeProperty.of(propertyValues, propertySchema);
    this.propertyStoreBuilder.putProperty(propertyKey, nodeProperty);

    return this;
  }

  /**
   * Set the property state for subsequently added properties.
   */
  setPropertyState(state: PropertyState): NodesBuilder {
    this.propertyState = state;
    return this;
  }

  /**
   * Build the final Nodes instance.
   */
  build(): Nodes {
    return new NodesImpl(
      this.schema,
      this.idMap,
      this.propertyStoreBuilder.build()
    );
  }
}

/**
 * Statistics about a Nodes structure.
 */
export interface NodesStats {
  nodeCount: number;
  labelCount: number;
  propertyCount: number;
  highestNodeId: number;
  hasProperties: boolean;
  idMapType: string;
}

/**
 * Result of validating a Nodes structure.
 */
export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  stats: NodesStats;
}
