import { Configuration } from "@/annotations/Configuration";
import { MutateConfig } from "./MutateConfig";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

/**
 * Configuration for algorithms that mutate relationship properties
 */
@Configuration
export abstract class MutateRelationshipPropertyConfig extends MutateConfig {
  // Constants as static property
  static readonly MUTATE_PROPERTY_KEY = "mutateProperty";

  /**
   * Returns the property name to mutate
   */
  @Configuration.ConvertWith(
    "MutateRelationshipPropertyConfig.validateProperty"
  )
  @Configuration.Key(MutateRelationshipPropertyConfig.MUTATE_PROPERTY_KEY)
  mutateProperty(): string {
    return MutateRelationshipPropertyConfig.MUTATE_PROPERTY_KEY;
  }

  /**
   * Validates a property name
   */
  static validateProperty(input: string): string | null {
    return validateNoWhiteCharacter(emptyToNull(input), "mutateProperty");
  }
}
