import { Configuration } from "@/annotations/Configuration";
import { ElementProjection } from "../ElementProjection";
import { NodeLabel } from "../NodeLabel";
import { RelationshipType } from "../RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { ElementTypeValidator } from "./ElementTypeValidator";
import { BaseConfig } from "./BaseConfig";

/**
 * Base configuration for all algorithm executions
 */
@Configuration
export abstract class AlgoBaseConfig extends BaseConfig {
  // Constants as static properties
  static readonly NODE_LABELS_KEY = "nodeLabels";
  static readonly RELATIONSHIP_TYPES_KEY = "relationshipTypes";

  /**
   * Returns the relationship types to consider
   */
  @Configuration.Key(AlgoBaseConfig.RELATIONSHIP_TYPES_KEY)
  relationshipTypes(): string[] {
    return [ElementProjection.PROJECT_ALL];
  }

  /**
   * Returns relationship type filters, excluding PROJECT_ALL
   */
  @Configuration.Ignore
  relationshipTypesFilter(): Set<RelationshipType> {
    return new Set(
      this.relationshipTypes()
        .filter((type) => type !== ElementProjection.PROJECT_ALL)
        .map((type) => RelationshipType.of(type))
    );
  }

  /**
   * Whether all relationship types should be projected
   */
  @Configuration.Ignore
  projectAllRelationshipTypes(): boolean {
    return (
      this.relationshipTypes().length === 1 &&
      this.relationshipTypes().includes(ElementProjection.PROJECT_ALL)
    );
  }

  /**
   * Returns internal relationship types from graph store
   */
  @Configuration.Ignore
  internalRelationshipTypes(graphStore: GraphStore): Set<RelationshipType> {
    return ElementTypeValidator.resolveTypes(
      graphStore,
      this.relationshipTypes()
    );
  }

  /**
   * Returns the node labels to consider
   */
  @Configuration.Key(AlgoBaseConfig.NODE_LABELS_KEY)
  nodeLabels(): string[] {
    return [ElementProjection.PROJECT_ALL];
  }

  /**
   * Returns node label filters, excluding PROJECT_ALL
   */
  @Configuration.Ignore
  nodeLabelsFilter(): Set<NodeLabel> {
    return new Set(
      this.nodeLabels()
        .filter((label) => label !== ElementProjection.PROJECT_ALL)
        .map((label) => NodeLabel.of(label))
    );
  }

  /**
   * Returns node label identifiers from graph store
   */
  @Configuration.Ignore
  nodeLabelIdentifiers(graphStore: GraphStore): Set<NodeLabel> {
    return ElementTypeValidator.resolve(graphStore, this.nodeLabels());
  }

  /**
   * Graph store validation hook
   */
  @Configuration.GraphStoreValidation
  graphStoreValidation(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    // Empty default implementation
  }

  /**
   * Validates that node labels exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateNodeLabels(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ElementTypeValidator.validate(graphStore, selectedLabels, "`nodeLabels`");
  }

  /**
   * Validates that relationship types exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateRelationshipTypes(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    ElementTypeValidator.validateTypes(
      graphStore,
      selectedRelationshipTypes,
      "`relationshipTypes`"
    );
  }
}
