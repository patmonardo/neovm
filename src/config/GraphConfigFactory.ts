import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { Orientation } from "@/projection";
import { PropertyState } from "@/api";
import { DefaultValue } from "@/api";
import { Aggregation } from "@/core";
import { ConfigLoader } from "./ConfigLoader";
import { ConfigValidation } from "./ConfigValidation";
import { NodesBuilderConfig } from "./GraphConfigs";
import { PropertyConfig } from "./GraphConfigs";
import { RelationshipsBuilderConfig } from "./GraphConfigs";

export class GraphConfigFactory {
  /**
   * Create NodesBuilder configuration with defaults and validation.
   */
  static nodesBuilder(
    params: Partial<NodesBuilderConfig> = {}
  ): NodesBuilderConfig {
    // Get defaults from config files
    const fileDefaults =
      ConfigLoader.getDefaults<NodesBuilderConfig>("generation");

    // Built-in sensible defaults
    const builtInDefaults: NodesBuilderConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      maxOriginalId: -1,
      maxIntermediateId: -1,
      hasLabelInformation: true,
      hasProperties: true,
      deduplicateIds: true,
      usePooledBuilderProvider: false,
      propertyState: PropertyState.PERSISTENT,
      idMapBuilderType: "SORTED_SPARSE_MAP",
      // These would need to be provided or have factory methods:
      context: params.context!, // ?? createDefaultContext(),
      idMapBuilder: params.idMapBuilder!, // ?? createDefaultIdMapBuilder(),
      propertyStateFunction:
        params.propertyStateFunction ?? (() => PropertyState.PERSISTENT),
    };

    // Merge: built-in < file < user params (precedence order)
    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    // Validation
    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    if (config.maxOriginalId >= 0) {
      ConfigValidation.validatePositive(config.maxOriginalId, "maxOriginalId");
    }

    return config;
  }

  /**
   * Create PropertyConfig with defaults.
   */
  static propertyConfig(
    propertyKey: string,
    params: Partial<Omit<PropertyConfig, "propertyKey">> = {}
  ): PropertyConfig {
    const defaults = {
      aggregation: Aggregation.NONE,
      defaultValue: DefaultValue.forDouble(),
      propertyState: PropertyState.TRANSIENT,
    };

    const config = {
      propertyKey,
      ...defaults,
      ...params,
    };

    // Validation
    if (!propertyKey || propertyKey.trim().length === 0) {
      throw new Error("Property key cannot be empty");
    }

    return config;
  }

  /**
   * Create RelationshipsBuilder configuration.
   */
  static relationshipsBuilder(
    params: Partial<RelationshipsBuilderConfig>
  ): RelationshipsBuilderConfig {
    if (!params.nodes) {
      throw new Error("RelationshipsBuilderConfig requires 'nodes' parameter");
    }
    if (!params.relationshipType) {
      throw new Error(
        "RelationshipsBuilderConfig requires 'relationshipType' parameter"
      );
    }

    const fileDefaults =
      ConfigLoader.getDefaults<RelationshipsBuilderConfig>("generation");

    const builtInDefaults = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      orientation: Orientation.NATURAL,
      propertyConfigs: [],
      aggregation: Aggregation.NONE,
      skipDanglingRelationships: false,
      usePooledBuilderProvider: false,
      maxOriginalId: -1,
      maxIntermediateId: -1,
      indexInverse: false,
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    // Validation
    ConfigValidation.validatePositive(config.concurrency, "concurrency");

    return config;
  }
}
