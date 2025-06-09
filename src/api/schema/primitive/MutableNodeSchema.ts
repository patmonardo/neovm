import { NodeLabel } from "@/projection";
import { ValueType } from "@/api";
import { NodeSchema } from "../abstract/NodeSchema";
import { PropertySchema } from "../abstract/PropertySchema";
import { NodeSchemaEntry } from "../abstract/NodeSchemaEntry";
import { MutableNodeSchemaEntry } from "./MutableNodeSchemaEntry";

/**
 * Mutable implementation of NodeSchema that allows adding and removing
 * node labels and properties.
 */
export class MutableNodeSchema extends NodeSchema {
  /**
   * Map of node labels to their schema entries.
   */
  protected readonly _labelEntries: Map<NodeLabel, MutableNodeSchemaEntry>;

  /**
   * Creates a new mutable node schema.
   *
   * @param labelEntries Map of node labels to schema entries
   */
  public constructor(
    labelEntries: Map<NodeLabel, MutableNodeSchemaEntry> = new Map()
  ) {
    super();
    this._labelEntries = labelEntries;
  }

  /**
   * Creates an empty node schema with no entries.
   *
   * @returns An empty mutable node schema
   */
  public static empty(): MutableNodeSchema {
    return new MutableNodeSchema();
  }

  /**
   * Creates a mutable node schema from an existing node schema.
   *
   * @param fromSchema The source node schema
   * @returns A new mutable copy of the schema
   */
  public static from(fromSchema: NodeSchema): MutableNodeSchema {
    const nodeSchema = MutableNodeSchema.empty();
    fromSchema.entries().forEach((fromEntry) => {
      nodeSchema.set(
        new MutableNodeSchemaEntry(
          fromEntry.identifier(),
          new Map(fromEntry.properties()) // Map constructor copies the Map
        )
      );
    });

    return nodeSchema;
  }

  /**
   * Returns all available node labels in this schema.
   *
   * @returns Array of all node labels
   */
  public availableLabels(): Array<NodeLabel> {
    return Array.from(this._labelEntries.keys());
  }

  /**
   * Creates a filtered version of this schema containing only the specified labels.
   *
   * @param labelsToKeep Array of node labels to include
   * @returns A new filtered node schema
   */
  public filter(labelsToKeep: Array<NodeLabel>): NodeSchema {
    const filteredEntries = new Map<NodeLabel, MutableNodeSchemaEntry>();

    // ✅ ARRAY-BASED FILTERING - NO HASH CODES NEEDED!
    this._labelEntries.forEach((entry, label) => {
      // Use includes() with proper equals() method
      if (labelsToKeep.some((keepLabel) => keepLabel.equals(label))) {
        filteredEntries.set(label, MutableNodeSchemaEntry.from(entry));
      }
    });

    return new MutableNodeSchema(filteredEntries);
  }

  /**
   * Combines this schema with another schema.
   *
   * @param other The schema to merge with this one
   * @returns A new schema containing elements from both schemas
   */
  public union(other: NodeSchema): NodeSchema {
    const unionMap = this.unionEntries(other);
    return new MutableNodeSchema(unionMap);
  }

  /**
   * Returns all schema entries.
   *
   * @returns Collection of schema entries
   */
  public entries(): Array<NodeSchemaEntry> {
    return Array.from(this._labelEntries.values());
  }

  /**
   * Gets a schema entry by its identifier.
   *
   * @param identifier The node label
   * @returns The schema entry for the given label, or undefined if not found
   */
  public get(identifier: NodeLabel): NodeSchemaEntry | undefined {
    return this._labelEntries.get(identifier);
  }

  /**
   * Sets a schema entry.
   *
   * @param entry The schema entry to set
   */
  public set(entry: MutableNodeSchemaEntry): void {
    this._labelEntries.set(entry.identifier(), entry);
  }

  /**
   * Removes a schema entry by its label.
   *
   * @param identifier The node label to remove
   */
  public remove(identifier: NodeLabel): void {
    this._labelEntries.delete(identifier);
  }

  /**
   * Gets an existing schema entry by its label, or creates a new one if it doesn't exist.
   *
   * @param key The node label
   * @returns The existing or newly created schema entry
   */
  public getOrCreateLabel(key: NodeLabel): MutableNodeSchemaEntry {
    if (!this._labelEntries.has(key)) {
      this._labelEntries.set(key, new MutableNodeSchemaEntry(key));
    }
    return this._labelEntries.get(key)!;
  }

  /**
   * Adds a node label to the schema.
   *
   * @param nodeLabel The node label to add
   * @returns This schema for method chaining
   */
  public addLabel(nodeLabel: NodeLabel): MutableNodeSchema;

  /**
   * Adds a node label with properties to the schema.
   *
   * @param nodeLabel The node label to add
   * @param nodeProperties Map of property keys to property schemas
   * @returns This schema for method chaining
   */
  public addLabel(
    nodeLabel: NodeLabel,
    nodeProperties: Map<string, PropertySchema>
  ): MutableNodeSchema;

  /**
   * Implementation of the addLabel method.
   */
  public addLabel(
    nodeLabel: NodeLabel,
    nodeProperties?: Map<string, PropertySchema>
  ): MutableNodeSchema {
    const nodeSchemaEntry = this.getOrCreateLabel(nodeLabel);

    if (nodeProperties) {
      nodeProperties.forEach((schema, key) => {
        nodeSchemaEntry.addProperty(key, schema);
      });
    }

    return this;
  }


  /**
   * Adds a property to a node label.
   *
   * @param nodeLabel The node label
   * @param propertyKey The property key
   * @param valueTypeOrSchema The value type or property schema
   * @returns This schema for method chaining
   */
  public addProperty(
    nodeLabel: NodeLabel,
    propertyKey: string,
    valueTypeOrSchema: ValueType | PropertySchema
  ): MutableNodeSchema {
    const entry = this.getOrCreateLabel(nodeLabel);

    if (valueTypeOrSchema instanceof PropertySchema) {
      entry.addProperty(propertyKey, valueTypeOrSchema);
    } else {
      entry.addProperty(propertyKey, valueTypeOrSchema);
    }

    return this;
  }

  /**
   * Creates a union of entries from this schema and another schema.
   *
   * @param other The other schema
   * @returns Map of node labels to merged entries
   */
  protected unionEntries(
    other: NodeSchema
  ): Map<NodeLabel, MutableNodeSchemaEntry> {
    const entriesMap = new Map<NodeLabel, MutableNodeSchemaEntry>();

    // Add entries from this schema
    this._labelEntries.forEach((entry, label) => {
      entriesMap.set(label, MutableNodeSchemaEntry.from(entry));
    });

    // Add or merge entries from the other schema
    other.entries().forEach((entry) => {
      const identifier = entry.identifier();
      if (entriesMap.has(identifier)) {
        const existing = entriesMap.get(identifier)!;
        const merged = existing.union(entry) as MutableNodeSchemaEntry;
        entriesMap.set(identifier, merged);
      } else {
        entriesMap.set(identifier, MutableNodeSchemaEntry.from(entry));
      }
    });

    return entriesMap;
  }

  /**
   * Checks if this schema equals another object.
   *
   * @param obj The object to compare with
   * @returns True if the objects are equal
   */
  public equals(obj: unknown): boolean {
    if (this === obj) return true;
    if (!(obj instanceof MutableNodeSchema)) return false;

    // Compare labels count
    if (this._labelEntries.size !== obj._labelEntries.size) return false;

    // Compare each label and its entries
    for (const [label, entry] of this._labelEntries.entries()) {
      if (!obj._labelEntries.has(label)) return false;

      const otherEntry = obj._labelEntries.get(label)!;
      if (!entry.equals(otherEntry)) return false;
    }

    return true;
  }

  /**
   * Computes a hash code for this schema.
   *
   * @returns The hash code
   */
  public hashCode(): number {
    let result = 0;

    // Add hash codes of all entries
    this._labelEntries.forEach((entry) => {
      result = 31 * result + entry.hashCode();
    });

    return result;
  }
}
