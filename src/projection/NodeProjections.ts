import { NodeLabel } from "./NodeLabel";
import { AbstractProjections } from "./AbstractProjections";
import { ElementProjection } from "./ElementProjection";
import { NodeProjection } from "./NodeProjection";
import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";

/**
 * Collection of node projections for configuring node filtering in graph projections.
 */
export abstract class NodeProjections extends AbstractProjections<
  NodeLabel,
  NodeProjection
> {
  /**
   * Returns the underlying projections map.
   */
  public abstract projections(): Map<NodeLabel, NodeProjection>;

  /**
   * Adds property mappings to all projections.
   *
   * @param mappings The mappings to add
   * @returns A new NodeProjections
   */
  public abstract addPropertyMappings(
    mappings: PropertyMappings
  ): NodeProjections;

  /**
   * Returns a string representation of the label projections.
   *
   * @returns Comma-separated list of labels
   */
  public labelProjection(): string {
    if (this.isEmpty()) {
      return "";
    }

    return Array.from(this.projections().values())
      .map((projection) => projection.label())
      .join(", ");
  }

  /**
   * Checks if this projections is empty.
   *
   * @returns True if empty
   */
  public isEmpty(): boolean {
    return this.projections().size === 0;
  }

  /**
   * Converts this projections to an object.
   *
   * @returns Object representation
   */
  public toObject(): Record<string, any> {
    const value: Record<string, any> = {};

    for (const [identifier, projection] of this.projections().entries()) {
      value[identifier.name()] = projection.toObject();
    }

    return value;
  }

  /**
   * Validates property key mappings.
   * Ensures there are no conflicting property mappings.
   *
   * @throws Error if there are conflicts
   */
  public validatePropertyKeyMappings(): void {
    const seenMappings = new Map<string, PropertyMapping>();

    for (const nodeProjection of this.projections().values()) {
      for (const propertyMapping of nodeProjection.properties()) {
        const propertyKey = propertyMapping.propertyKey();

        if (propertyKey === null) {
          continue;
        }

        if (seenMappings.has(propertyKey)) {
          // We have another mapping with the same GDS key
          const seenMapping = seenMappings.get(propertyKey)!;

          if (
            seenMapping.neoPropertyKey() !== propertyMapping.neoPropertyKey()
          ) {
            throw new Error(
              `Specifying multiple neoPropertyKeys for the same property is not allowed, ` +
                `found propertyKey: \`${propertyKey}\` with conflicting neoPropertyKeys: ` +
                `\`${propertyMapping.neoPropertyKey()}\`, \`${seenMapping.neoPropertyKey()}\`.`
            );
          }

          if (
            !this.defaultValuesEqual(
              seenMapping.defaultValue(),
              propertyMapping.defaultValue()
            )
          ) {
            throw new Error(
              `Specifying different default values for the same property with identical neoPropertyKey is not allowed, ` +
                `found propertyKey: \`${propertyKey}\` with conflicting default values: ` +
                `\`${propertyMapping.defaultValue()}\`, \`${seenMapping // Removed .getObject()
                  .defaultValue()}\`.` // Removed .getObject()
            );
          }
        }

        seenMappings.set(propertyKey, propertyMapping);
      }
    }
  }

  /**
   * Checks if two default values are equal.
   *
   * @param a First value
   * @param b Second value
   * @returns True if the values are equal
   */
  protected defaultValuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;

    // Handle primitive types
    if (typeof a !== "object" && typeof b !== "object") {
      return a === b;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.defaultValuesEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Handle objects
    if (typeof a === "object" && typeof b === "object") {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) return false;

      for (const key of aKeys) {
        if (!bKeys.includes(key) || !this.defaultValuesEqual(a[key], b[key]))
          return false;
      }

      return true;
    }

    return false;
  }
}

/**
 * Concrete implementation of NodeProjections.
 */
class NodeProjectionsImpl extends NodeProjections {
  /**
   * The underlying projections map.
   */
  private readonly _projections: Map<NodeLabel, NodeProjection>;

  /**
   * Creates a new NodeProjections implementation.
   *
   * @param projections Map of node labels to projections
   */
  constructor(projections: Map<NodeLabel, NodeProjection>) {
    super();
    this._projections = projections;
  }

  /**
   * Returns the underlying projections map.
   */
  public projections(): Map<NodeLabel, NodeProjection> {
    return this._projections;
  }

  /**
   * Adds property mappings to all projections.
   *
   * @param mappings The mappings to add
   * @returns A new NodeProjections
   */
  public addPropertyMappings(mappings: PropertyMappings): NodeProjections {
    if (!mappings.hasMappings()) {
      return this;
    }

    const newProjections = new Map<NodeLabel, NodeProjection>();

    for (const [key, value] of this.projections().entries()) {
      newProjections.set(key, value.withAdditionalPropertyMappings(mappings));
    }

    if (newProjections.size === 0) {
      newProjections.set(
        NodeLabel.ALL_NODES,
        NodeProjection.all().withAdditionalPropertyMappings(mappings)
      );
    }

    return NodeProjections.create(newProjections);
  }
}

/**
 * Factory methods and utilities for NodeProjections.
 */
export namespace NodeProjections {
  /**
   * A projection that includes all nodes.
   */
  export const ALL: NodeProjections = create(
    new Map([[NodeLabel.ALL_NODES, NodeProjection.all()]])
  );

  /**
   * Creates NodeProjections from a map.
   *
   * @param projections Map of node labels to projections
   * @returns A new NodeProjections
   */
  export function create(
    projections: Map<NodeLabel, NodeProjection>
  ): NodeProjections {
    if (projections.size === 0) {
      throw new Error(
        "An empty node projection was given; at least one node label must be projected."
      );
    }
    return new NodeProjectionsImpl(new Map(projections));
  }

  /**
   * Creates NodeProjections with a single projection.
   *
   * @param label The node label
   * @param projection The node projection
   * @returns A new NodeProjections
   */
  export function single(
    label: NodeLabel,
    projection: NodeProjection
  ): NodeProjections {
    return new NodeProjectionsImpl(new Map([[label, projection]]));
  }

  /**
   * Returns a projection that includes all nodes.
   *
   * @returns A projection for all nodes
   */
  export function all(): NodeProjections {
    return ALL;
  }

  /**
   * Creates NodeProjections from an object.
   *
   * @param object The object to create from
   * @returns A new NodeProjections
   */
  export function fromObject(object: any): NodeProjections {
    if (object === null || object === undefined) {
      return fromMap(new Map());
    }

    if (object instanceof NodeProjections) {
      return object;
    }

    if (typeof object === "string") {
      return fromString(object);
    }

    if (
      object instanceof Map ||
      (typeof object === "object" && object !== null)
    ) {
      return fromMap(object);
    }

    if (Symbol.iterator in Object(object)) {
      return fromList(object);
    }

    throw new Error(
      `Cannot construct a node projection out of a ${
        object?.constructor?.name || typeof object
      }`
    );
  }

  /**
   * Creates NodeProjections from a string.
   *
   * @param labelString The label string
   * @returns A new NodeProjections
   */
  export function fromString(
    labelString: string | null | undefined
  ): NodeProjections {
    validateIdentifierName(labelString || "");

    if (!labelString) {
      return create(new Map());
    }

    if (labelString === ElementProjection.PROJECT_ALL) {
      return create(new Map([[NodeLabel.ALL_NODES, NodeProjection.all()]]));
    }

    const nodeLabel = new NodeLabel(labelString);
    const projection = NodeProjection.fromString(labelString);
    return create(new Map([[nodeLabel, projection]]));
  }

  /**
   * Creates NodeProjections from a map.
   *
   * @param map The map to create from
   * @returns A new NodeProjections
   */
  export function fromMap(
    map: Map<string, any> | Record<string, any>
  ): NodeProjections {
    const projections = new Map<NodeLabel, NodeProjection>();

    // Convert object or Map to entries
    const entries: Array<[string, any]> =
      map instanceof Map ? Array.from(map.entries()) : Object.entries(map);

    for (const [name, spec] of entries) {
      const nodeLabel = new NodeLabel(name);
      const projection = NodeProjection.fromObject(spec, nodeLabel);

      // Check for duplicates
      if (projections.has(nodeLabel)) {
        throw new Error(`Duplicate key: ${name}`);
      }

      projections.set(nodeLabel, projection);
    }

    return create(projections);
  }

  /**
   * Creates NodeProjections from a list.
   *
   * @param items The items to create from
   * @returns A new NodeProjections
   */
  export function fromList(items: Iterable<any>): NodeProjections {
    const projections = new Map<NodeLabel, NodeProjection>();

    for (const item of items) {
      const nodeProjections = fromObject(item);

      // Merge projections
      for (const [label, projection] of nodeProjections.projections()) {
        projections.set(label, projection);
      }
    }

    return create(projections);
  }

  /**
   * Converts a NodeProjections to an object.
   *
   * @param nodeProjections The projections to convert
   * @returns Object representation
   */
  export function toObject(
    nodeProjections: NodeProjections
  ): Record<string, any> {
    return nodeProjections.toObject();
  }

  /**
   * Validates an identifier name.
   *
   * @param identifier The identifier to validate
   * @throws Error if the identifier is invalid
   */
  function validateIdentifierName(identifier: string): void {
    if (identifier === NodeLabel.ALL_NODES.name()) {
      throw new Error(
        `${NodeLabel.ALL_NODES.name()} is a reserved node label and may not be used`
      );
    }
  }
}
