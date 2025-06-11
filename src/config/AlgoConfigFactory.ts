import { ConfigLoader } from "./ConfigLoader";
import { ConfigValidation } from "./ConfigValidation";
import { PageRankConfig } from "./AlgoConfigs";
import { LouvainConfig } from "./AlgoConfigs";
import { NodeSimilarityConfig } from "./AlgoConfigs";
import { BetweennessCentralityConfig } from "./AlgoConfigs";
import { CommunityDetectionConfig } from "./AlgoConfigs";
import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";

/**
 * Factory functions for algorithm configuration objects.
 */
export class AlgoConfigFactory {
  static pageRank(params: Partial<PageRankConfig> = {}): PageRankConfig {
    const fileDefaults = ConfigLoader.getDefaults<PageRankConfig>("algorithms");
    const builtInDefaults: PageRankConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      maxIterations: 20,
      dampingFactor: 0.85,
      tolerance: 0.0000001,
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    ConfigValidation.validatePositive(config.maxIterations, "maxIterations");
    ConfigValidation.validateRange(config.dampingFactor, 0, 1, "dampingFactor");
    if (config.tolerance) {
      ConfigValidation.validateRange(config.tolerance, 0, 1, "tolerance");
    }

    return config;
  }

  static louvain(params: Partial<LouvainConfig> = {}): LouvainConfig {
    const fileDefaults = ConfigLoader.getDefaults<LouvainConfig>("algorithms");
    const builtInDefaults: LouvainConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      maxIterations: 10,
      tolerance: 0.0001,
      includeIntermediateCommunities: false,
      gamma: 1.0,
      theta: 0.01,
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    ConfigValidation.validatePositive(config.maxIterations, "maxIterations");
    if (config.tolerance) {
      ConfigValidation.validateRange(config.tolerance, 0, 1, "tolerance");
    }
    ConfigValidation.validateRange(config.gamma, 0, 10, "gamma");
    ConfigValidation.validateRange(config.theta, 0, 1, "theta");

    return config;
  }

  static nodeSimilarity(
    params: Partial<NodeSimilarityConfig> = {}
  ): NodeSimilarityConfig {
    const fileDefaults =
      ConfigLoader.getDefaults<NodeSimilarityConfig>("algorithms");
    const builtInDefaults: NodeSimilarityConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      similarityCutoff: 0.0,
      degreeCutoff: 1,
      topK: 10,
      bottomK: 10,
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    ConfigValidation.validateRange(
      config.similarityCutoff,
      0,
      1,
      "similarityCutoff"
    );
    ConfigValidation.validatePositive(config.degreeCutoff, "degreeCutoff");
    ConfigValidation.validatePositive(config.topK, "topK");
    ConfigValidation.validatePositive(config.bottomK, "bottomK");

    return config;
  }

  static betweennessCentrality(
    params: Partial<BetweennessCentralityConfig> = {}
  ): BetweennessCentralityConfig {
    const fileDefaults =
      ConfigLoader.getDefaults<BetweennessCentralityConfig>("algorithms");
    const builtInDefaults: BetweennessCentralityConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    if (config.samplingSize) {
      ConfigValidation.validatePositive(config.samplingSize, "samplingSize");
    }

    return config;
  }

  static communityDetection(
    params: Partial<CommunityDetectionConfig> = {}
  ): CommunityDetectionConfig {
    const fileDefaults =
      ConfigLoader.getDefaults<CommunityDetectionConfig>("algorithms");
    const builtInDefaults: CommunityDetectionConfig = {
      concurrency: 4,
      nodeLabels: [NodeLabel.ALL_NODES],
      relationshipTypes: [RelationshipType.ALL_RELATIONSHIPS],
      maxIterations: 100,
      tolerance: 0.0001,
      includeIntermediateCommunities: false,
    };

    const config = { ...builtInDefaults, ...fileDefaults, ...params };

    ConfigValidation.validatePositive(config.concurrency, "concurrency");
    ConfigValidation.validatePositive(config.maxIterations, "maxIterations");
    if (config.tolerance) {
      ConfigValidation.validateRange(config.tolerance, 0, 1, "tolerance");
    }

    return config;
  }
}
