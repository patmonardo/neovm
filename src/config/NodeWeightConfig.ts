import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { formatWithLocale } from "@/utils/StringFormatting";
import { join } from "@/utils/StringJoining";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

/**
 * Configuration for node weights
 */
@Configuration
export abstract class NodeWeightConfig {
  /**
   * Returns the node weight property name, if configured
   */
  @Configuration.ConvertWith("NodeWeightConfig.validatePropertyName")
  nodeWeightProperty(): string | null {
    return null;
  }

  /**
   * Validates that the node weight property exists in the graph
   */
  @Configuration.GraphStoreValidationCheck
  nodeWeightValidation(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    const weightProperty = this.nodeWeightProperty();

    if (
      weightProperty !== null &&
      !graphStore.hasNodeProperty(selectedLabels, weightProperty)
    ) {
      const labelsWithMissingProperty = Array.from(selectedLabels)
        .filter(
          (label) => !graphStore.nodePropertyKeys(label).has(weightProperty)
        )
        .map((label) => label.name());

      throw new Error(
        formatWithLocale(
          "Node weight property `%s` is not present for all requested labels. " +
            "Requested labels: %s. Labels without the property key: %s. " +
            "Properties available on all requested labels: %s",
          weightProperty,
          join(Array.from(selectedLabels).map((label) => label.name())),
          join(labelsWithMissingProperty),
          join(Array.from(graphStore.nodePropertyKeys(selectedLabels)))
        )
      );
    }
  }

  /**
   * Validates a property name
   */
  static validatePropertyName(input: string): string | null {
    return validateNoWhiteCharacter(emptyToNull(input), "nodeWeightProperty");
  }
}
