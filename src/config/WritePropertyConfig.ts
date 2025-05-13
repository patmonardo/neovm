import { Configuration } from "@/annotations/Configuration";
import { WriteConfig } from "./WriteConfig";
import {
  emptyToNull,
  validateNoWhiteCharacter,
} from "@/core/StringIdentifierValidations";

/**
 * Configuration for algorithms that write results to a property
 */
@Configuration
export abstract class WritePropertyConfig extends WriteConfig {
  // Constants as static properties
  static readonly WRITE_PROPERTY_KEY = "writeProperty";

  /**
   * Returns the property name to write results to
   */
  @Configuration.ConvertWith("WritePropertyConfig.validatePropertyName")
  @Configuration.Key(WritePropertyConfig.WRITE_PROPERTY_KEY)
  writeProperty(): string {
    return WritePropertyConfig.WRITE_PROPERTY_KEY;
  }

  /**
   * Validates a property name
   * @param input The property name to validate
   * @returns The validated property name or null
   */
  static validatePropertyName(input: string): string | null {
    return validateNoWhiteCharacter(
      emptyToNull(input),
      WritePropertyConfig.WRITE_PROPERTY_KEY
    );
  }
}
