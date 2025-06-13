import { NodeLabel } from "@/projection";
import { NodeSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { ElementVisitor } from "./ElementVisitor";

/**
 * Abstract base class for visiting nodes during import/export operations.
 * Extends ElementVisitor to handle node-specific data like IDs and labels.
 */
export abstract class NodeVisitor extends ElementVisitor<PropertySchema> {
  private static readonly EMPTY_LABELS: string[] = [];
  protected static readonly DEFAULT_LABELS: NodeLabel[] = [NodeLabel.ALL_NODES];

  protected readonly nodeSchema: NodeSchema;
  private currentId: number = -1;
  protected currentLabels: string[] = [];
  private labelIdentifier: string = "";

  protected constructor(nodeSchema: NodeSchema) {
    super(nodeSchema.allProperties());
    this.nodeSchema = nodeSchema;
    this.reset();
  }

  // Accessors for node related data

  /**
   * Returns the current node ID being processed.
   */
  public id(): number {
    return this.currentId;
  }

  /**
   * Returns the current node labels being processed.
   */
  public labels(): string[] {
    return this.currentLabels;
  }

  // Additional listeners for node related data

  /**
   * Sets the current node ID.
   *
   * @param id The node ID
   * @returns true to continue processing
   */
  public setId(id: number): boolean {
    this.currentId = id;
    return true;
  }

  /**
   * Sets the current node ID with group (compatibility method).
   *
   * @param id The node ID
   * @param group The group (unused in this implementation)
   * @returns true to continue processing
   */
  public setIdWithGroup(id: any, group?: any): boolean {
    return this.setId(Number(id));
  }

  /**
   * Sets the current node ID with group and ID sequence (compatibility method).
   *
   * @param id The node ID
   * @param group The group (unused in this implementation)
   * @param idSequence The ID sequence (unused in this implementation)
   * @returns true to continue processing
   */
  public setIdWithGroupAndSequence(
    id: any,
    group?: any,
    idSequence?: any
  ): boolean {
    return this.setId(Number(id));
  }

  /**
   * Sets the current node labels.
   *
   * @param labels Array of label strings
   * @returns true to continue processing
   */
  public setLabels(labels: string[]): boolean {
    // Sort labels for consistent ordering
    const sortedLabels = [...labels].sort();

    if (!this.arraysEqual(this.currentLabels, sortedLabels)) {
      this.currentLabels = sortedLabels;
      this.labelIdentifier = labels.join("_");
    }

    return true;
  }

  // Overrides from ElementVisitor

  /**
   * Returns the identifier for the current element (label combination).
   */
  public elementIdentifier(): string {
    return this.labelIdentifier;
  }

  /**
   * Returns the property schema for the current node labels.
   */
  protected getPropertySchema(): PropertySchema[] {
    const nodeLabels =
      this.currentLabels.length === 0
        ? new Set(NodeVisitor.DEFAULT_LABELS) // Convert to Set for consistency
        : new Set(this.currentLabels.map((label) => NodeLabel.of(label))); // Create Set from mapped labels

    const propertySchemaForLabels = this.nodeSchema.filter(nodeLabels);
    return Array.from(propertySchemaForLabels.unionProperties().values());
  }

  /**
   * Resets the visitor state for processing a new node.
   */
  public reset(): void {
    this.currentId = -1;
    this.currentLabels = NodeVisitor.EMPTY_LABELS;
    this.labelIdentifier = "";
  }

  /**
   * Utility method to compare arrays for equality.
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

/**
 * Abstract builder class for creating NodeVisitor instances.
 *
 * @template SELF The concrete builder type
 * @template VISITOR The concrete visitor type
 */
export abstract class NodeVisitorBuilder<
  SELF extends NodeVisitorBuilder<SELF, VISITOR>,
  VISITOR extends NodeVisitor
> {
  protected nodeSchema?: NodeSchema;

  /**
   * Sets the node schema for the visitor.
   *
   * @param nodeSchema The node schema
   * @returns This builder instance
   */
  withNodeSchema(nodeSchema: NodeSchema): SELF {
    this.nodeSchema = nodeSchema;
    return this.me();
  }

  /**
   * Returns this builder instance with proper typing.
   */
  protected abstract me(): SELF;

  /**
   * Builds the visitor instance.
   */
  abstract build(): VISITOR;
}
