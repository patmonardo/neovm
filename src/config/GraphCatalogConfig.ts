import { Configuration } from "@/annotations/Configuration";
import { GraphProjectConfig } from "./GraphProjectConfig";

/**
 * Configuration for graph catalog operations
 */
@Configuration
export abstract class GraphCatalogConfig extends GraphProjectConfig {
  /**
   * Returns a map representation for procedure result fields,
   * excluding certain fields from the output
   */
  @Configuration.Ignore
  asProcedureResultConfigurationField(): Record<string, any> {
    return this.cleansed(this.toMap(), this.outputFieldDenylist());
  }

  /**
   * Returns the list of fields that should be excluded from procedure results
   */
  @Configuration.Ignore
  outputFieldDenylist(): Set<string> {
    return new Set([
      GraphProjectConfig.NODE_COUNT_KEY,
      GraphProjectConfig.RELATIONSHIP_COUNT_KEY,
    ]);
  }

  /**
   * Helper method to remove denied fields from a map
   * @param map The original map
   * @param denylist The set of keys to exclude
   * @returns A new map without the denied keys
   */
  cleansed(
    map: Record<string, any>,
    denylist: Set<string>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(map)) {
      if (!denylist.has(key)) {
        result[key] = value;
      }
    }

    return result;
  }
}
