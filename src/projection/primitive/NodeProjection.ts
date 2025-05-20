import { ElementProjection } from "../abstract/ElementProjection";
import { PropertyMappings } from "./PropertyMappings";
import { NodeLabel } from "./NodeLabel";

/**
 * Represents a projection for nodes in a graph.
 */
export class NodeProjection extends ElementProjection {
  public static readonly LABEL_KEY = "label";
  private static _ALL: NodeProjection | null = null;

  public static get ALL(): NodeProjection {
    if (!NodeProjection._ALL) {
      NodeProjection._ALL = new NodeProjection(
        ElementProjection.PROJECT_ALL,
        PropertyMappings.of()
      );
    }
    return NodeProjection._ALL;
  }
  // Private fields
  private readonly _label: string;
  private readonly _properties: PropertyMappings;

  /**
   * Creates a new NodeProjection.
   *
   * @param label The label to project
   * @param properties The properties to project
   */
  constructor(label: string, properties: PropertyMappings) {
    super();
    this._label = label || "";
    this._properties = properties || PropertyMappings.of();
  }

  /**
   * Gets the label for this projection.
   */
  public label(): string {
    return this._label;
  }

  /**
   * Gets the properties for this projection.
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
   * @param mappings The additional property mappings
   */
  public withAdditionalPropertyMappings(
    mappings: PropertyMappings
  ): NodeProjection {
    const newMappings = this.properties().mergeWith(mappings);
    if (newMappings === this.properties()) {
      return this;
    }
    return new NodeProjection(this.label(), newMappings);
  }

  /**
   * Converts this projection to a plain object.
   */
  public toObject(): Record<string, any> {
    const result: Record<string, any> = {};
    result[NodeProjection.LABEL_KEY] = this.label();

    const properties = this.properties().toObject(false);
    if (Object.keys(properties).length > 0) {
      result[ElementProjection.PROPERTIES_KEY] = properties;
    }

    return result;
  }

  // Basic static methods (simplified)

  /**
   * Creates a node projection from a string.
   */
  public static fromString(label: string): NodeProjection {
    return new NodeProjection(label, PropertyMappings.of());
  }
  /**
   * Creates a node projection from a map.
   */
  public static fromMap(
    map: Record<string, any>,
    nodeLabel: NodeLabel
  ): NodeProjection {
    NodeProjection.validateConfigKeys(map);
    const label = String(map[NodeProjection.LABEL_KEY] || nodeLabel.name);

    // Extract properties
    const propertiesKey = ElementProjection.PROPERTIES_KEY.toLowerCase();
    const properties = map[propertiesKey]
      ? PropertyMappings.fromObject(map[propertiesKey])
      : PropertyMappings.of();

    return new NodeProjection(label, properties);
  }

  /**
   * Validates that the map contains only allowed keys.
   */
  private static validateConfigKeys(map: Record<string, any>): void {
    const allowedKeys = [
      NodeProjection.LABEL_KEY,
      ElementProjection.PROPERTIES_KEY,
    ];
    for (const key of Object.keys(map)) {
      if (!allowedKeys.includes(key.toLowerCase())) {
        throw new Error(
          `Unexpected key: ${key}. Allowed keys are: ${allowedKeys.join(", ")}`
        );
      }
    }
  }

  /**
   * Creates a basic node projection.
   */
  public static of(label: string): NodeProjection {
    return new NodeProjection(label, PropertyMappings.of());
  }

  /**
   * Creates a projection that includes all nodes.
   */
  public static all(): NodeProjection {
    return NodeProjection.fromString(ElementProjection.PROJECT_ALL);
  }

  /**
   * Creates a node projection from an object.
   */
  public static fromObject(object: any, nodeLabel: NodeLabel): NodeProjection {
    if (object === null || object === undefined) {
      return NodeProjection.of(nodeLabel.name());
    }

    if (typeof object === "string") {
      return NodeProjection.fromString(object);
    }

    if (typeof object === "object") {
      // Convert to case-insensitive map
      const map: Record<string, any> = {};
      for (const key in object) {
        map[key.toLowerCase()] = object[key];
      }

      // Extract label
      const labelKey = NodeProjection.LABEL_KEY.toLowerCase();
      const label = map[labelKey] || nodeLabel.name;

      // Extract properties
      const propertiesKey = ElementProjection.PROPERTIES_KEY.toLowerCase();
      const properties = map[propertiesKey]
        ? PropertyMappings.fromObject(map[propertiesKey])
        : PropertyMappings.of();

      return new NodeProjection(label, properties);
    }

    throw new Error(`Cannot construct a node projection from ${typeof object}`);
  }

  /**
   * Writes node projection data to the provided object.
   * @param target The object to write properties to
   */
  protected writeToObject(target: Record<string, any>): void {
    // Write NodeProjection-specific properties
    target[NodeProjection.LABEL_KEY] = this._label;

    // If you have node-specific properties to serialize, add them here
    // For example:
    // target['additionalNodeInfo'] = this._additionalNodeInfo;
  }

  /**
   * Determines whether aggregation should be included.
   * For nodes, aggregation typically doesn't apply.
   * @returns false since nodes don't have aggregation
   */
  protected includeAggregation(): boolean {
    // Nodes typically don't have aggregation, so return false
    return false;
  }
}
