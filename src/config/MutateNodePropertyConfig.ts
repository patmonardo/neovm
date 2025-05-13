import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { MutateConfig } from "./MutateConfig";
import { formatWithLocale } from "@/utils/StringFormatting";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";
import { Configuration } from "@/annotations/Configuration";

/**
 * Configuration for algorithms that mutate node properties
 */
@Configuration
export abstract class MutateNodePropertyConfig extends MutateConfig {
  // Constants as static property
  static readonly MUTATE_PROPERTY_KEY = "mutateProperty";

  /**
   * Returns the property name to mutate
   */
  @Configuration.ConvertWith("MutateNodePropertyConfig.validateProperty")
  @Configuration.Key(MutateNodePropertyConfig.MUTATE_PROPERTY_KEY)
  mutateProperty(): string | null {
    return null;
  }

  /**
   * Validates that the property doesn't already exist in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateMutateProperty(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    if (
      this.mutateProperty() !== null &&
      graphStore.hasNodeProperty(selectedLabels, this.mutateProperty()!)
    ) {
      throw new Error(
        formatWithLocale(
          "Node property `%s` already exists in the in-memory graph.",
          this.mutateProperty()
        )
      );
    }
  }

  /**
   * Validates a property name
   */
  static validateProperty(input: string): string | null {
    return validateNoWhiteCharacter(emptyToNull(input), "mutateProperty");
  }
}
