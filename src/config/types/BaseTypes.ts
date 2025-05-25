import { RelationshipType } from '@/projection';
import { NodeLabel } from '@/projection';

/**
 * Base configuration interfaces that other configs extend.
 */

export interface BaseConfig {
  // Common validation methods can be added here
}

export interface ConcurrencyConfig extends BaseConfig {
  concurrency: number;
}

export interface WriteConfig extends BaseConfig {
  writeConcurrency: number;
}

export interface AlgoBaseConfig extends ConcurrencyConfig {
  nodeLabels: NodeLabel[];
  relationshipTypes: RelationshipType[];
}

export interface MutateConfig extends WriteConfig {
  mutateProperty: string;
}

export interface IterationsConfig extends BaseConfig {
  maxIterations: number;
  tolerance?: number;
}

export interface EmbeddingDimensionConfig extends BaseConfig {
  embeddingDimension: number;
}

export interface FeaturePropertiesConfig extends BaseConfig {
  featureProperties: string[];
}
