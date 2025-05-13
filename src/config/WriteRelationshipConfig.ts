import { Configuration } from "@/annotations/Configuration";
import { WriteConfig } from "./WriteConfig";
import { validateNoWhiteCharacter } from "@/core/StringIdentifierValidations";

/**
 * Configuration for algorithms that write results to a relationship
 */
@Configuration
export abstract class WriteRelationshipConfig extends WriteConfig {
  // Constants as static properties
  static readonly WRITE_RELATIONSHIP_TYPE_KEY = "writeRelationshipType";

  /**
   * Returns the relationship type name to write resultss to
   */
  @Configuration.ConvertWith(
    "WriteRelationshipConfig.validateRelationshipTypeName"
  )
  @Configuration.Key(WriteRelationshipConfig.WRITE_RELATIONSHIP_TYPE_KEY)
  writeRelationshipType(): string {
    return WriteRelationshipConfig.WRITE_RELATIONSHIP_TYPE_KEY;
  }

  /**
   * Validates a relationship type name
   * @param input The relationship type name to validate
   * @returns The validated relationship type name or null
   */
  static validateRelationshipTypeName(input: string): string | null {
    return validateNoWhiteCharacter(
      input,
      WriteRelationshipConfig.WRITE_RELATIONSHIP_TYPE_KEY
    );
  }
}
