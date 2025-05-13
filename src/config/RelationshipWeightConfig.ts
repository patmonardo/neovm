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
 * Configuration for algorithms that use relationship weights
 */
@Configuration
export abstract class RelationshipWeightConfig {
  // Constants as static property
  static readonly RELATIONSHIP_WEIGHT_PROPERTY = "relationshipWeightProperty";

  /**
   * Returns the relationship weight property name, if any
   */
  @Configuration.ConvertWith("RelationshipWeightConfig.validateWeightProperty")
  @Configuration.Key(RelationshipWeightConfig.RELATIONSHIP_WEIGHT_PROPERTY)
  relationshipWeightProperty(): string | undefined {
    return undefined;
  }

  /**
   * Validates a weight property name
   */
  static validateWeightProperty(
    input: string | null | undefined
  ): string | undefined {
    if (input === null || input === undefined || input.trim() === "") {
      return undefined;
    }

    validateNoWhiteCharacter(
      input,
      RelationshipWeightConfig.RELATIONSHIP_WEIGHT_PROPERTY
    );

    return input;
  }

  /**
   * Returns whether this config has a relationship weight property
   */
  @Configuration.Ignore
  hasRelationshipWeightProperty(): boolean {
    return this.relationshipWeightProperty() !== undefined;
  }

  /**
   * Validates the relationship weight property
   */
  @Configuration.Check
  validateRelationshipWeightProperty(): void {
    const property = this.relationshipWeightProperty();
    if (property !== undefined) {
      validateNoWhiteCharacter(
        emptyToNull(property),
        RelationshipWeightConfig.RELATIONSHIP_WEIGHT_PROPERTY
      );
    }
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
    const weightProperty = this.relationshipWeightProperty();

    if (weightProperty !== undefined) {
      const relTypesWithoutProperty = Array.from(
        selectedRelationshipTypes
      ).filter(
        (relType) =>
          !graphStore.hasRelationshipProperty(relType, weightProperty)
      );

      if (relTypesWithoutProperty.length > 0) {
        throw new Error(
          formatWithLocale(
            "Relationship weight property `%s` not found in relationship types %s. Properties existing on all relationship types: %s",
            weightProperty,
            join(relTypesWithoutProperty.map((relType) => relType.name())),
            join(graphStore.relationshipPropertyKeys(selectedRelationshipTypes))
          )
        );
      }
    }
  }
}
