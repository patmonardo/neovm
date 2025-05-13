import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { ConfigNodesValidations } from "./ConfigNodesValidations";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

@Configuration
export abstract class SeedConfig {
  // Constants as static property
  static readonly SEED_PROPERTY_KEY = "seedProperty";

  /**
   * Returns the seed property name, if configured
   */
  @Configuration.ConvertWith("SeedConfig.validatePropertyName")
  @Configuration.Key(SeedConfig.SEED_PROPERTY_KEY)
  seedProperty(): string | null {
    return null;
  }

  /**
   * Whether this configuration uses incremental mode via a seed property
   */
  @Configuration.Ignore
  isIncremental(): boolean {
    return this.seedProperty() !== null;
  }

  /**
   * Validates property name
   */
  static validatePropertyName(input: string): string | null {
    return validateNoWhiteCharacter(
      emptyToNull(input),
      SeedConfig.SEED_PROPERTY_KEY
    );
  }

  /**
   * Validates that the seed property exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateSeedProperty(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    const seedProperty = this.seedProperty();
    if (seedProperty !== null) {
      ConfigNodesValidations.validateNodePropertyExists(
        graphStore,
        selectedLabels,
        "Seed property",
        seedProperty
      );
    }
  }
}
