import { ElementIdentifier } from './ElementIdentifier';

/**
 * Identifies a relationship type in a graph.
 */
export class RelationshipType extends ElementIdentifier {
  /**
   * Relationship type that matches all relationships.
   */
  public static readonly ALL_RELATIONSHIPS = RelationshipType.of("__ALL__");

  /**
   * Creates a new RelationshipType.
   * 
   * @param name The name of the relationship type
   */
  constructor(name: string) {
    super(name, "Relationship type");
  }

  /**
   * Returns a relationship type that projects all relationships.
   * 
   * @returns ALL_RELATIONSHIPS
   */
  public projectAll(): ElementIdentifier {
    return RelationshipType.ALL_RELATIONSHIPS;
  }

  /**
   * Factory method to create a RelationshipType.
   * 
   * @param name The name of the relationship type
   * @returns A new RelationshipType
   */
  public static of(name: string): RelationshipType {
    return new RelationshipType(name);
  }

  /**
   * Creates a collection of RelationshipTypes from strings.
   * 
   * @param relationshipTypes The relationship type names
   * @returns Array of RelationshipTypes
   */
  public static listOf(...relationshipTypes: string[]): RelationshipType[] {
    return relationshipTypes.map(RelationshipType.of);
  }
}