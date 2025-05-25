import {
  AlgoBaseConfig,
  EmbeddingDimensionConfig,
  FeaturePropertiesConfig,
  IterationsConfig,
} from "../types";

/**
 * Machine Learning algorithm configuration interfaces.
 */

export interface GraphSageConfig
  extends AlgoBaseConfig,
    EmbeddingDimensionConfig,
    FeaturePropertiesConfig,
    IterationsConfig {
  iterationsPerEpoch: number;
  maxEpochs: number;
  batchSize: number;
  learningRate: number;
  searchDepth: number;
  negativeSamplingRate: number;
}

export interface Node2VecConfig
  extends AlgoBaseConfig,
    EmbeddingDimensionConfig,
    IterationsConfig {
  walkLength: number;
  walksPerNode: number;
  inOutFactor: number;
  returnFactor: number;
  windowSize: number;
  negativeSamplingRate: number;
  positiveSamplingFactor: number;
}

export interface FastRPConfig
  extends AlgoBaseConfig,
    EmbeddingDimensionConfig,
    IterationsConfig {
  iterationWeights: number[];
  normalizationStrength: number;
  randomSeed?: number;
}

export interface KMeansConfig extends AlgoBaseConfig {
  k: number;
  maxIterations: number;
  deltaThreshold: number;
  numberOfRestarts: number;
  randomSeed?: number;
  nodeProperty: string;
}

export interface KNNConfig extends AlgoBaseConfig {
  topK: number;
  randomSeed?: number;
  nodeProperties: string[];
  sampleRate: number;
  deltaThreshold: number;
  maxIterations: number;
}
