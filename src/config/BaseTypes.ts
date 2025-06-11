import { NodeLabel } from '@/projection';
import { RelationshipType } from '@/projection';

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

export interface DeduplicationConfig extends BaseConfig {
  deduplicateIds: boolean;
  seenNodeIdPredicate?: (nodeId: number) => boolean;
}

export interface BuilderConfig extends BaseConfig {
  usePooledBuilderProvider: boolean;
  maxOriginalId: number;
  maxIntermediateId: number;
}
