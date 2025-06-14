import { CypherMapWrapper } from "@/core/CypherMapWrapper";
import { GraphStoreToFileExporterConfig } from "./GraphStoreToFileExporterConfig";

/**
 * Configuration interface for CSV export estimation operations.
 * Extends the base file exporter configuration with sampling-specific options.
 */
export interface GraphStoreToCsvEstimationConfig
  extends GraphStoreToFileExporterConfig {
  /**
   * The sampling factor for estimation (between 0.0 and 1.0).
   * Used to estimate export size by sampling a fraction of the data.
   *
   * @returns The sampling factor
   * @default 0.001 (0.1% sampling)
   */
  samplingFactor(): number;
}

/**
 * Implementation of GraphStoreToCsvEstimationConfig.
 */
class GraphStoreToCsvEstimationConfigImpl
  implements GraphStoreToCsvEstimationConfig
{
  private readonly username: string;
  private readonly config: CypherMapWrapper;

  constructor(username: string, config: CypherMapWrapper) {
    this.username = username;
    this.config = config;
  }

  samplingFactor(): number {
    const factor = this.config.getDouble("samplingFactor", 0.001);

    // Validate range (0.0 to 1.0)
    if (factor < 0.0 || factor > 1.0) {
      throw new Error(
        `samplingFactor must be between 0.0 and 1.0, got ${factor}`
      );
    }

    return factor;
  }

  // Delegated methods from GraphStoreToFileExporterConfig
  includeMetaData(): boolean {
    return this.config.getBool("includeMetaData", false);
  }

  username(): string {
    return this.username;
  }

  exportName(): string {
    return this.config.requireString("exportName");
  }

  useLabelMapping(): boolean {
    return this.config.getBool("useLabelMapping", false);
  }

  concurrency(): number {
    return this.config.getInt("concurrency", 4);
  }

  batchSize(): number {
    return this.config.getInt("batchSize", 10000);
  }

  defaultRelationshipType(): string {
    return this.config.getString("defaultRelationshipType", "REL");
  }
}

/**
 * Static factory methods for creating estimation configuration instances.
 */
export class GraphStoreToCsvEstimationConfig {
  /**
   * Creates a new estimation configuration instance.
   *
   * @param username The username for the export operation
   * @param config The configuration parameters wrapped in CypherMapWrapper
   * @returns A new GraphStoreToCsvEstimationConfig instance
   */
  static of(
    username: string,
    config: CypherMapWrapper
  ): GraphStoreToCsvEstimationConfig {
    return new GraphStoreToCsvEstimationConfigImpl(username, config);
  }
}
