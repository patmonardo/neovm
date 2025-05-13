import { NodeLabel } from "@/NodeLabel";
import { RelationshipType } from "@/RelationshipType";
import { GraphStore } from "@/api/GraphStore";
import { Configuration } from "@/annotations/Configuration";
import { MutateConfig } from "./MutateConfig";
import { formatWithLocale } from "@/utils/StringFormatting";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

/**
 * Configuration for algorithms that mutate a relationship in the graph
 */
@Configuration
export abstract class MutateRelationshipConfig extends MutateConfig {
  // Constants as static properties
  static readonly MUTATE_RELATIONSHIP_TYPE_KEY = "mutateRelationshipType";

  /**
   * Returns the relationship type name to mutate
   */
  @Configuration.ConvertWith(
    "MutateRelationshipConfig.validateMutateRelationshipTypeIdentifier"
  )
  @Configuration.Key(MutateRelationshipConfig.MUTATE_RELATIONSHIP_TYPE_KEY)
  mutateRelationshipType(): string | null {
    return null;
  }

  /**
   * Validates that the relationship type to mutate doesn't already exist
   */
  @Configuration.GraphStoreValidationCheck
  validateMutateRelationships(
    graphStore: GraphStore,
    selectedLabels: Set<NodeLabel>,
    selectedRelationshipTypes: Set<RelationshipType>
  ): void {
    const mutateRelationshipType = this.mutateRelationshipType();

    if (
      mutateRelationshipType !== null &&
      graphStore.hasRelationshipType(
        RelationshipType.of(mutateRelationshipType)
      )
    ) {
      throw new Error(
        formatWithLocale(
          "Relationship type `%s` already exists in the in-memory graph.",
          mutateRelationshipType
        )
      );
    }
  }

  /**
   * Validates a relationship type name
   * @param input The relationship type name to validate
   * @returns The validated relationship type name or null
   */
  static validateMutateRelationshipTypeIdentifier(
    input: string
  ): string | null {
    return validateNoWhiteCharacter(
      emptyToNull(input),
      MutateRelationshipConfig.MUTATE_RELATIONSHIP_TYPE_KEY
    );
  }
}
