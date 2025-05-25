import { AlgoBaseConfig, IterationsConfig } from '../types';

/**
 * Algorithm configuration interfaces.
 */

export interface PageRankConfig extends AlgoBaseConfig, IterationsConfig {
  dampingFactor: number;
  sourceNodes?: string[];
}

export interface LouvainConfig extends AlgoBaseConfig, IterationsConfig {
  seedProperty?: string;
  includeIntermediateCommunities: boolean;
  gamma: number;
  theta: number;
}

export interface BetweennessCentralityConfig extends AlgoBaseConfig {
  samplingSize?: number;
  samplingSeed?: number;
}

export interface ClosenessCentralityConfig extends AlgoBaseConfig {
  useWassermanFaust: boolean;
}

export interface CommunityDetectionConfig extends AlgoBaseConfig, IterationsConfig {
  includeIntermediateCommunities: boolean;
}

export interface TriangleCountConfig extends AlgoBaseConfig {
  // Triangle counting specific config
}

export interface LocalClusteringCoefficientConfig extends AlgoBaseConfig {
  triangleCountProperty?: string;
}

export interface NodeSimilarityConfig extends AlgoBaseConfig {
  similarityCutoff: number;
  degreeCutoff: number;
  topK: number;
  bottomK: number;
}

export interface ShortestPathConfig extends AlgoBaseConfig {
  sourceNode: string;
  targetNode: string;
  relationshipWeightProperty?: string;
}

export interface AllShortestPathsConfig extends AlgoBaseConfig {
  sourceNode: string;
  relationshipWeightProperty?: string;
}
