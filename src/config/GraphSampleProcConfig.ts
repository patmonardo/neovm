import { Configuration } from "@/annotations/Configuration";
import { GraphProjectConfig } from "./GraphProjectConfig";
import { GraphNameConfig } from "./GraphNameConfig";
import { GraphSampleAlgoConfig } from "./GraphSampleAlgoConfig";

/**
 * Configuration for graph sampling procedures
 * Combines project configuration with algorithm-specific configuration
 */
@Configuration
export abstract class GraphSampleProcConfig implements GraphNameConfig {
  /**
   * Returns the original graph project configuration
   */
  @Configuration.Parameter()
  originalConfig(): GraphProjectConfig {
    return {} as GraphProjectConfig;
  }

  /**
   * Returns the name of the source graph to sample from
   */
  @Configuration.Parameter()
  fromGraphName(): string {
    return "";
  }

  /**
   * Returns the algorithm-specific sampling configuration
   */
  @Configuration.Parameter()
  sampleAlgoConfig(): GraphSampleAlgoConfig {
    return {} as GraphSampleAlgoConfig;
  }

  /**
   * Returns the name of the graph
   * Delegates to the original config
   */
  graphName(): string {
    return this.originalConfig().graphName();
  }

  /**
   * Returns a map representation for procedure result fields
   * Combines fields from original config and algorithm config
   */
  @Configuration.Ignore
  asProcedureResultConfigurationField(): Record<string, any> {
    const result = this.originalConfig().asProcedureResultConfigurationField();
    const cleansedSampleAlgoConfig = this.cleansed(
      this.sampleAlgoConfig().toMap(),
      this.sampleAlgoConfig().outputFieldDenylist()
    );

    return { ...result, ...cleansedSampleAlgoConfig };
  }

  /**
   * Helper method to remove keys from a map
   * This is delegated from GraphProjectConfig
   */
  @Configuration.Ignore
  cleansed(
    map: Record<string, any>,
    keysToIgnore: Set<string>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(map)) {
      if (!keysToIgnore.has(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Creates a map representation of this configuration
   */
  toMap(): Record<string, any> {
    const result = this.originalConfig().toMap();
    const algoConfig = this.sampleAlgoConfig().toMap();

    return { ...result, ...algoConfig };
  }
}

/**
 * Default implementation of the GraphSampleProcConfig
 */
export class DefaultGraphSampleProcConfig extends GraphSampleProcConfig {
  /**
   * Original graph project configuration
   */
  private readonly _originalConfig: GraphProjectConfig;

  /**
   * Name of the source graph to sample from
   */
  private readonly _fromGraphName: string;

  /**
   * Algorithm-specific configuration
   */
  private readonly _sampleAlgoConfig: GraphSampleAlgoConfig;

  /**
   * Creates a new DefaultGraphSampleProcConfig
   *
   * @param originalConfig The original graph project config
   * @param fromGraphName The source graph name
   * @param sampleAlgoConfig The algorithm-specific config
   */
  constructor(
    originalConfig: GraphProjectConfig,
    fromGraphName: string,
    sampleAlgoConfig: GraphSampleAlgoConfig
  ) {
    super();
    this._originalConfig = originalConfig;
    this._fromGraphName = fromGraphName;
    this._sampleAlgoConfig = sampleAlgoConfig;
  }

  /**
   * Returns the original graph project configuration
   */
  originalConfig(): GraphProjectConfig {
    return this._originalConfig;
  }

  /**
   * Returns the name of the source graph to sample from
   */
  fromGraphName(): string {
    return this._fromGraphName;
  }

  /**
   * Returns the algorithm-specific sampling configuration
   */
  sampleAlgoConfig(): GraphSampleAlgoConfig {
    return this._sampleAlgoConfig;
  }
}

/**
 * Static factory methods for GraphSampleProcConfig
 */
export namespace GraphSampleProcConfig {
  /**
   * Creates a new GraphSampleProcConfig
   *
   * @param originalConfig The original graph project config
   * @param fromGraphName The source graph name
   * @param sampleAlgoConfig The algorithm-specific config
   */
  export function of(
    originalConfig: GraphProjectConfig,
    fromGraphName: string,
    sampleAlgoConfig: GraphSampleAlgoConfig
  ): GraphSampleProcConfig {
    return new DefaultGraphSampleProcConfig(
      originalConfig,
      fromGraphName,
      sampleAlgoConfig
    );
  }
}
