import { RelationshipType } from "@/projection";
import { RelationshipPropertySchema } from "@/api/schema";
import { RelationshipSchema } from "@/api/schema";
import { IdentifierMapper } from "@/core/io/IdentifierMapper";
import { ElementVisitor } from "./ElementVisitor";

/**
 * Abstract base class for visiting relationships during import/export operations.
 * Extends ElementVisitor to handle relationship-specific data like start/end nodes and types.
 */
export abstract class RelationshipVisitor extends ElementVisitor<RelationshipPropertySchema> {
  private readonly relationshipSchema: RelationshipSchema;
  private readonly relationshipTypeMapping: IdentifierMapper<RelationshipType>;

  private currentStartNode: number = -1;
  private currentEndNode: number = -1;
  private _relationshipType: string = "";

  protected constructor(
    relationshipSchema: RelationshipSchema,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ) {
    super(relationshipSchema.allProperties());
    this.relationshipSchema = relationshipSchema;
    this.relationshipTypeMapping = relationshipTypeMapping;
    this.reset();
  }

  // Accessors for relationship related data

  /**
   * Returns the current start node ID being processed.
   */
  public startNode(): number {
    return this.currentStartNode;
  }

  /**
   * Returns the current end node ID being processed.
   */
  public endNode(): number {
    return this.currentEndNode;
  }

  /**
   * Returns the mapped identifier for the current relationship type.
   */
  public relationshipType(): string {
    return this.relationshipTypeMapping.identifierFor(
      RelationshipType.of(this._relationshipType)
    );
  }

  // Additional listeners for relationship related data

  /**
   * Sets the start node ID for the current relationship.
   *
   * @param id The start node ID
   * @returns true to continue processing
   */
  public startId(id: number): boolean {
    this.currentStartNode = id;
    return true;
  }

  /**
   * Sets the start node ID with group (compatibility method).
   *
   * @param id The start node ID
   * @param group The group (unused in this implementation)
   * @returns true to continue processing
   */
  public startIdWithGroup(id: any, group?: any): boolean {
    return this.startId(Number(id));
  }

  /**
   * Sets the end node ID for the current relationship.
   *
   * @param id The end node ID
   * @returns true to continue processing
   */
  public endId(id: number): boolean {
    this.currentEndNode = id;
    return true;
  }

  /**
   * Sets the end node ID with group (compatibility method).
   *
   * @param id The end node ID
   * @param group The group (unused in this implementation)
   * @returns true to continue processing
   */
  public endIdWithGroup(id: any, group?: any): boolean {
    return this.endId(Number(id));
  }

  /**
   * Sets the relationship type for the current relationship.
   *
   * @param type The relationship type string
   * @returns true to continue processing
   */
  public type(type: string): boolean {
    this.relationshipType = type;
    return true;
  }

  // Overrides from ElementVisitor

  /**
   * Returns the identifier for the current element (relationship type).
   */
  protected elementIdentifier(): string {
    return this.relationshipType;
  }

  /**
   * Returns the property schema for the current relationship type.
   */
  protected getPropertySchema(): RelationshipPropertySchema[] {
    return this.relationshipSchema.propertySchemasFor(
      RelationshipType.of(this.relationshipType)
    );
  }

  /**
   * Resets the visitor state for processing a new relationship.
   */
  public reset(): void {
    this.currentStartNode = -1;
    this.currentEndNode = -1;
    this.relationshipType = "";
  }
}

/**
 * Abstract builder class for creating RelationshipVisitor instances.
 *
 * @template SELF The concrete builder type
 * @template VISITOR The concrete visitor type
 */
export abstract class RelationshipVisitorBuilder<
  SELF extends RelationshipVisitorBuilder<SELF, VISITOR>,
  VISITOR extends RelationshipVisitor
> {
  protected relationshipSchema?: RelationshipSchema;

  /**
   * Sets the relationship schema for the visitor.
   *
   * @param relationshipSchema The relationship schema
   * @returns This builder instance
   */
  withRelationshipSchema(relationshipSchema: RelationshipSchema): SELF {
    this.relationshipSchema = relationshipSchema;
    return this.me();
  }

  /**
   * Returns this builder instance with proper typing.
   */
  protected abstract me(): SELF;

  /**
   * Builds the visitor instance.
   */
  protected abstract build(): VISITOR;
}
