import { GraphStore } from "@/api/GraphStore";
import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { Configuration } from "@/annotations";
import { formatWithLocale } from "@/utils";

import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

/**
 * Configuration for algorithms that use a target node property
 */
@Configuration
export abstract class TargetNodePropertyConfig {
  /**
   * Returns the target property name for this configuration
   */
  @Configuration.ConvertWith("TargetNodePropertyConfig.validateProperty")
  targetProperty(): string | null {
    return null;
  }

  /**
   * Validates a property name
   */
  static validateProperty(input: string): string | null {
    return validateNoWhiteCharacter(emptyToNull(input), "targetProperty");
  }

  /**
   * Validates that the target property exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  validateTargetProperty(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    const targetProperty = this.targetProperty();

    if (
      targetProperty !== null &&
      !graphStore.hasNodeProperty(selectedLabels, targetProperty)
    ) {
      throw new Error(
        formatWithLocale(
          "Target property `%s` not found in graph with node properties: %s",
          targetProperty,
          graphStore.nodePropertyKeys()
        )
      );
    }
  }
}
