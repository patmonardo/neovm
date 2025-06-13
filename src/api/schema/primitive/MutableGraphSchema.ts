import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { GraphSchema } from "../abstract/GraphSchema";
import { PropertySchema } from "../abstract/PropertySchema";
import { MutableNodeSchema } from "./MutableNodeSchema";
import { MutableRelationshipSchema } from "./MutableRelationshipSchema";

/**
 * A mutable implementation of GraphSchema that supports building and modifying graph schemas.
 */
export class MutableGraphSchema extends GraphSchema {
  private readonly _graphProperties: Map<string, PropertySchema>;
  private readonly _nodeSchema: MutableNodeSchema;
  private readonly _relationshipSchema: MutableRelationshipSchema;

  /**
   * Creates a new MutableGraphSchema.
   *
   * @param nodeSchema The node schema
   * @param relationshipSchema The relationship schema
   * @param graphProperties The graph properties
   */
  constructor(
    nodeSchema: MutableNodeSchema,
    relationshipSchema: MutableRelationshipSchema,
    graphProperties: Map<string, PropertySchema> = new Map()
  ) {
    super();
    this._nodeSchema = nodeSchema;
    this._relationshipSchema = relationshipSchema;
    this._graphProperties = graphProperties;
  }

  /**
   * Creates an empty mutable graph schema with no nodes, relationships, or properties.
   *
   * @returns An empty mutable graph schema
   */
  public static empty(): MutableGraphSchema {
    return new MutableGraphSchema(
      MutableNodeSchema.empty(),
      MutableRelationshipSchema.empty(),
      new Map()
    );
  }

  /**
   * Creates a mutable graph schema from an existing graph schema.
   *
   * @param from The source graph schema
   * @returns A new mutable copy of the schema
   */
  public static from(from: GraphSchema): MutableGraphSchema {
    const graphProperties = new Map<string, PropertySchema>();
    from.graphProperties().forEach((schema, key) => {
      graphProperties.set(key, schema);
    });

    return new MutableGraphSchema(
      MutableNodeSchema.from(from.nodeSchema()),
      MutableRelationshipSchema.from(from.relationshipSchema()),
      graphProperties
    );
  }

  /**
   * Creates a mutable graph schema with the specified components.
   *
   * @param nodeSchema The node schema
   * @param relationshipSchema The relationship schema
   * @param graphProperties The graph properties
   * @returns A new mutable graph schema
   */
  public static of(
    nodeSchema: MutableNodeSchema,
    relationshipSchema: MutableRelationshipSchema,
    graphProperties: Map<string, PropertySchema>
  ): MutableGraphSchema {
    return new MutableGraphSchema(
      nodeSchema,
      relationshipSchema,
      graphProperties
    );
  }

  /**
   * Returns the node schema for this graph.
   */
  public nodeSchema(): MutableNodeSchema {
    return this._nodeSchema;
  }

  /**
   * Returns the relationship schema for this graph.
   */
  public relationshipSchema(): MutableRelationshipSchema {
    return this._relationshipSchema;
  }

  /**
   * Returns graph-level properties.
   */
  public graphProperties(): Map<string, PropertySchema> {
    return this._graphProperties;
  }

  /**
   * Creates a filtered version of this schema containing only the specified node labels.
   *
   * @param labelsToKeep Set of node labels to include
   * @returns A new schema containing only the specified node labels
   */
  public filterNodeLabels(labelsToKeep: Set<NodeLabel>): MutableGraphSchema {
    return new MutableGraphSchema(
      this.nodeSchema().filter(labelsToKeep),
      this.relationshipSchema(),
      this.graphProperties()
    );
  }

  /**
   * Creates a filtered version of this schema containing only the specified relationship types.
   *
   * @param relationshipTypesToKeep Set of relationship types to include
   * @returns A new schema containing only the specified relationship types
   */
  public filterRelationshipTypes(
    relationshipTypesToKeep: Set<RelationshipType>
  ): MutableGraphSchema {
    return new MutableGraphSchema(
      this.nodeSchema(),
      this.relationshipSchema().filter(
        relationshipTypesToKeep
      ) as MutableRelationshipSchema,
      this.graphProperties()
    );
  }

  /**
   * Combines this schema with another schema.
   *
   * @param other The schema to merge with this one
   * @returns A new schema containing elements from both schemas
   */
  public union(other: GraphSchema): MutableGraphSchema {
    return new MutableGraphSchema(
      this.nodeSchema().union(other.nodeSchema()) as MutableNodeSchema,
      this.relationshipSchema().union(
        other.relationshipSchema()
      ) as MutableRelationshipSchema,
      this.mergeGraphProperties(other)
    );
  }

  /**
   * Merges the graph properties from this schema and another schema.
   *
   * @param other The other schema
   * @returns A new map containing the merged properties
   */
  private mergeGraphProperties(
    other: GraphSchema
  ): Map<string, PropertySchema> {
    const result = new Map<string, PropertySchema>(this.graphProperties());

    other.graphProperties().forEach((schema, key) => {
      if (result.has(key)) {
        const existingSchema = result.get(key)!;
        if (existingSchema.valueType() !== schema.valueType()) {
          throw new Error(
            `Combining schema entries with value type ${existingSchema.valueType()} and ${schema.valueType()} is not supported.`
          );
        }
        // Keep existing schema if types match
      } else {
        result.set(key, schema);
      }
    });

    return result;
  }

  /**
   * Adds a property to the graph schema.
   *
   * @param key The property key
   * @param schema The property schema
   * @returns This schema for method chaining
   */
  public putGraphProperty(
    key: string,
    schema: PropertySchema
  ): MutableGraphSchema {
    this._graphProperties.set(key, schema);
    return this;
  }

  /**
   * Removes a property from the graph schema.
   *
   * @param key The property key to remove
   * @returns This schema for method chaining
   */
  public removeGraphProperty(key: string): MutableGraphSchema {
    this._graphProperties.delete(key);
    return this;
  }
}

/**
 * Utility functions for MutableGraphSchema.
 */
export namespace MutableGraphSchema {
  /**
   * Returns a new builder for creating a mutable graph schema.
   *
   * @returns A new builder
   */
  export function builder():MutableGraphSchema.Builder {
    return new Builder();
  }

  /**
   * Builder class for constructing a MutableGraphSchema.
   */
  export class Builder {
    private _nodeSchema?: MutableNodeSchema;
    private _relationshipSchema?: MutableRelationshipSchema;
    private _graphProperties: Map<string, PropertySchema> = new Map();

    /**
     * Sets the node schema.
     *
     * @param nodeSchema The node schema
     * @returns This builder for method chaining
     */
    public nodeSchema(nodeSchema: MutableNodeSchema): Builder {
      this._nodeSchema = nodeSchema;
      return this;
    }

    /**
     * Sets the relationship schema.
     *
     * @param relationshipSchema The relationship schema
     * @returns This builder for method chaining
     */
    public relationshipSchema(
      relationshipSchema: MutableRelationshipSchema
    ): Builder {
      this._relationshipSchema = relationshipSchema;
      return this;
    }

    /**
     * Sets the graph properties.
     *
     * @param graphProperties The graph properties
     * @returns This builder for method chaining
     */
    public graphProperties(
      graphProperties: Map<string, PropertySchema>
    ): Builder {
      this._graphProperties = new Map(graphProperties);
      return this;
    }

    /**
     * Adds a graph property.
     *
     * @param key The property key
     * @param schema The property schema
     * @returns This builder for method chaining
     */
    public putGraphProperty(key: string, schema: PropertySchema): Builder {
      this._graphProperties.set(key, schema);
      return this;
    }

    /**
     * Builds the mutable graph schema.
     *
     * @returns A new MutableGraphSchema
     * @throws Error if node schema or relationship schema is not set
     */
    public build(): MutableGraphSchema {
      if (!this._nodeSchema) {
        throw new Error("Node schema must be set");
      }
      if (!this._relationshipSchema) {
        throw new Error("Relationship schema must be set");
      }

      return new MutableGraphSchema(
        this._nodeSchema,
        this._relationshipSchema,
        this._graphProperties
      );
    }
  }
}
