import { Configuration } from "@/annotations/Configuration";
import { AlgoBaseConfig } from "./AlgoBaseConfig";
import { RelationshipWeightConfig } from "./RelationshipWeightConfig";
import { NodeLabel } from "../NodeLabel";
import { RelationshipType } from "../RelationshipType";
import { GraphStore } from "@/api/GraphStore";

/**
 * Configuration for graph sampling algorithms
 *
 * Note: In Java this extends both AlgoBaseConfig and RelationshipWeightConfig,
 * but TypeScript doesn't support multiple inheritance. We extend AlgoBaseConfig
 * and delegate to RelationshipWeightConfig for its functionality.
 */
@Configuration
export abstract class GraphSampleAlgoConfig extends AlgoBaseConfig {
  /**
   * Delegate object for relationship weight configuration
   */
  private readonly weightConfig: RelationshipWeightConfig =
    new RelationshipWeightDelegate();

  /**
   * Returns the relationship weight property name, if any
   */
  @Configuration.ConvertWith("RelationshipWeightConfig.validateWeightProperty")
  @Configuration.Key(RelationshipWeightConfig.RELATIONSHIP_WEIGHT_PROPERTY)
  relationshipWeightProperty(): string | undefined {
    return this.weightConfig.relationshipWeightProperty();
  }

  /**
   * Returns whether this config has a relationship weight property
   */
  @Configuration.Ignore
  hasRelationshipWeightProperty(): boolean {
    return this.weightConfig.hasRelationshipWeightProperty();
  }

  /**
   * Validates the relationship weight property
   */
  @Configuration.Check
  validateRelationshipWeightProperty(): void {
    this.weightConfig.validateRelationshipWeightProperty();
  }

  /**
   * Validates that the specified relationship weight property exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  relationshipWeightValidation(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    this.weightConfig.relationshipWeightValidation(
      graphStore,
      selectedLabels,
      selectedRelationshipTypes
    );
  }

  /**
   * Returns the fields that should be excluded from output
   */
  @Configuration.Ignore
  outputFieldDenylist(): Set<string> {
    return new Set(["jobId", "concurrency", "sudo"]);
  }
}

/**
 * Default implementation of RelationshipWeightConfig used for delegation
 */
class RelationshipWeightDelegate extends RelationshipWeightConfig {
  // Minimal implementation to satisfy abstract base class
  asProcedureResultConfigurationField(): Record<string, any> {
    return {};
  }
}
