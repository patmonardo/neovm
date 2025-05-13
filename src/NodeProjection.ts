import {
  ElementProjection,
  InlineProperties,
  InlinePropertiesBuilder,
} from "./ElementProjection";
import { PropertyMappings } from "./PropertyMappings";
import { NodeLabel } from "@/NodeLabel";

/**
 * Represents a projection for nodes in a graph.
 */
export abstract class NodeProjection extends ElementProjection {
  /**
   * Key used for node labels in configuration objects.
   */
  public static readonly LABEL_KEY = "label";

  /**
   * Returns the node label for this projection.
   */
  public abstract label(): string;

  /**
   * Returns the property mappings for this projection.
   */
  public abstract properties(): PropertyMappings;

  /**
   * Checks if this projection includes all nodes.
   */
  public abstract projectAll(): boolean;

  /**
   * Creates a new projection with additional property mappings.
   *
   * @param mappings The mappings to add
   */
  public abstract withAdditionalPropertyMappings(
    mappings: PropertyMappings
  ): NodeProjection;

  /**
   * Writes this projection's specific properties to the given object.
   *
   * @param value The object to write to
   */
  protected writeToObject(value: Record<string, any>): void {
    value[NodeProjection.LABEL_KEY] = this.label();
  }

  /**
   * Checks if aggregation should be included in serialized objects.
   */
  protected includeAggregation(): boolean {
    return false;
  }
}

/**
 * Concrete implementation of NodeProjection.
 */
class NodeProjectionImpl extends NodeProjection {
  /**
   * The node label for this projection.
   */
  private readonly _label: string;

  /**
   * The property mappings for this projection.
   */
  private readonly _properties: PropertyMappings;

  /**
   * Creates a new NodeProjection implementation.
   *
   * @param label The node label
   * @param properties The property mappings
   */
  constructor(label: string, properties: PropertyMappings) {
    super();
    this._label = label;
    this._properties = properties;
  }

  /**
   * Returns the node label for this projection.
   */
  public label(): string {
    return this._label;
  }

  /**
   * Returns the property mappings for this projection.
   */
  public properties(): PropertyMappings {
    return this._properties;
  }

  /**
   * Checks if this projection includes all nodes.
   */
  public projectAll(): boolean {
    return this.label() === ElementProjection.PROJECT_ALL;
  }

  /**
   * Creates a new projection with additional property mappings.
   *
   * @param mappings The mappings to add
   */
  public withAdditionalPropertyMappings(
    mappings: PropertyMappings
  ): NodeProjection {
    const newMappings = this.properties().mergeWith(mappings);
    if (newMappings === this.properties()) {
      return this;
    }
    return new NodeProjectionImpl(this.label(), newMappings);
  }
}

/**
 * Factory methods and utilities for NodeProjection.
 */
export namespace NodeProjection {
  /**
   * A projection that includes all nodes.
   */
  export const ALL: NodeProjection = fromString(ElementProjection.PROJECT_ALL);

  /**
   * Creates a NodeProjection from a string label.
   *
   * @param label The node label
   * @returns A new NodeProjection
   */
  export function fromString(label: string | null): NodeProjection {
    return builder()
      .label(label || "")
      .build();
  }

  /**
   * Creates a NodeProjection from an object.
   *
   * @param object The object to create from
   * @param nodeLabel The default node label
   * @returns A new NodeProjection
   */
  export function fromObject(object: any, nodeLabel: NodeLabel): NodeProjection {
    if (typeof object === "string") {
      return fromString(object);
    }

    if (
      object instanceof Map ||
      (typeof object === "object" && object !== null)
    ) {
      const map: Record<string, any> = {};

      // Convert Map or object to case-insensitive record
      if (object instanceof Map) {
        for (const [key, value] of object.entries()) {
          map[key.toLowerCase()] = value;
        }
      } else {
        for (const key of Object.keys(object)) {
          map[key.toLowerCase()] = object[key];
        }
      }

      return fromMap(map, nodeLabel);
    }

    if (object instanceof NodeProjection) {
      return object;
    }

    throw new Error(
      `Cannot construct a node filter out of a ${
        object?.constructor?.name || typeof object
      }`
    );
  }

  /**
   * Creates a NodeProjection from a map.
   *
   * @param map The map to create from
   * @param nodeLabel The default node label
   * @returns A new NodeProjection
   */
  export function fromMap(
    map: Record<string, any>,
    nodeLabel: NodeLabel
  ): NodeProjection {
    validateConfigKeys(map);

    const label = String(
      map[NodeProjection.LABEL_KEY.toLowerCase()] || nodeLabel.name()
    );

    return ElementProjection.create(
      map,
      (properties) => new NodeProjectionImpl(label, properties)
    );
  }

  /**
   * Creates a NodeProjection with a specific label.
   *
   * @param label The node label
   * @returns A new NodeProjection
   */
  export function of(label: string): NodeProjection {
    return new NodeProjectionImpl(label, PropertyMappings.of());
  }

  /**
   * Returns a projection that includes all nodes.
   *
   * @returns A projection for all nodes
   */
  export function all(): NodeProjection {
    return ALL;
  }

  /**
   * Creates a new builder for NodeProjection.
   *
   * @returns A new builder
   */
  export function builder(): NodeProjectionBuilder {
    return new NodeProjectionBuilder();
  }

  /**
   * Validates the configuration keys in a map.
   *
   * @param map The map to validate
   * @throws Error if the map contains invalid keys
   */
  function validateConfigKeys(map: Record<string, any>): void {
    const validKeys = [
      NodeProjection.LABEL_KEY.toLowerCase(),
      ElementProjection.PROPERTIES_KEY.toLowerCase(),
    ];
    const invalidKeys = Object.keys(map)
      .map((key) => key.toLowerCase())
      .filter((key) => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid keys in node projection: ${invalidKeys.join(", ")}. ` +
          `Valid keys are: ${validKeys.join(", ")}.`
      );
    }
  }

  /**
   * Builder for NodeProjection.
   */
  export class NodeProjectionBuilder
    implements InlineProperties<NodeProjectionBuilder>
  {
    private _label: string = "";
    private _properties: PropertyMappings | null = null;
    private _propertiesBuilder: InlinePropertiesBuilder | null = null;

    /**
     * Sets the label for the projection.
     *
     * @param label The node label
     * @returns This builder
     */
    public label(label: string | null): NodeProjectionBuilder {
      this._label = label || "";
      return this;
    }

    /**
     * Sets the property mappings for the projection.
     *
     * @param properties The property mappings
     * @returns This builder
     */
    public properties(properties: PropertyMappings): NodeProjectionBuilder {
      this._properties = properties;
      return this;
    }

    /**
     * Builds the NodeProjection.
     *
     * @returns A new NodeProjection
     */
    public build(): NodeProjection {
      this.buildProperties();
      return new NodeProjectionImpl(
        this._label,
        this._properties || PropertyMappings.of()
      );
    }

    /**
     * Adds a property mapping.
     *
     * @param mapping The mapping to add
     * @returns This builder
     */
    public addProperty(mapping: any): NodeProjectionBuilder {
      this.inlineBuilder().propertiesBuilder().addProperty(mapping);
      return this;
    }

    /**
     * Adds multiple property mappings.
     *
     * @param properties The mappings to add
     * @returns This builder
     */
    public addProperties(...properties: any[]): NodeProjectionBuilder {
      this.inlineBuilder()
        .propertiesBuilder()
        .addProperties(...properties);
      return this;
    }

    /**
     * Adds all property mappings from an iterable.
     *
     * @param properties The mappings to add
     * @returns This builder
     */
    public addAllProperties(properties: Iterable<any>): NodeProjectionBuilder {
      this.inlineBuilder().propertiesBuilder().addAllProperties(properties);
      return this;
    }

    /**
     * Finalizes the property building process.
     */
    public buildProperties(): void {
      if (this._propertiesBuilder) {
        this._propertiesBuilder.build();
      }
    }

    /**
     * Gets the inline properties builder.
     *
     * @returns The inline properties builder
     */
    public inlineBuilder(): InlinePropertiesBuilder {
      if (!this._propertiesBuilder) {
        this._propertiesBuilder = new InlinePropertiesBuilder(
          () => this._properties,
          (newProperties) => {
            this._properties = newProperties;
          }
        );
      }
      return this._propertiesBuilder;
    }
  }
}
