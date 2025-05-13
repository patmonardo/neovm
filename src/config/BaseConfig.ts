import { Configuration } from "@/annotations/Configuration";
import { ToMapConvertible } from "./ToMapConvertible";

/**
 * Base abstract class for all configuration classes
 */
@Configuration
export abstract class BaseConfig implements ToMapConvertible {
  // Constants as static properties
  static readonly SUDO_KEY = "sudo";
  static readonly LOG_PROGRESS_KEY = "logProgress";

  /**
   * Returns the username override, if configured
   */
  @Configuration.Key("username")
  @Configuration.ConvertWith("trim")
  usernameOverride(): string | undefined {
    // Default implementation that subclasses can override
    return undefined;
  }
  /**
   * Whether to bypass security mechanisms
   */
  @Configuration.Key(BaseConfig.SUDO_KEY)
  sudo(): boolean {
    return false;
  }

  /**
   * Whether to log progress
   */
  @Configuration.Key(BaseConfig.LOG_PROGRESS_KEY)
  logProgress(): boolean {
    return true;
  }

  /**
   * Collects configuration keys
   */
  @Configuration.CollectKeys
  configKeys(): string[] {
    return [];
  }

  /**
   * Converts the configuration to a map
   */
  @Configuration.ToMap
  toMap(): Record<string, any> {
    return {};
  }

  /**
   * Helper function to trim strings
   */
  static trim(input: string): string {
    return input.trim();
  }
}
