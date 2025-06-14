import { NodeLabel } from '@/projection';
import { RelationshipType } from '@/projection';

/**
 * Base configuration interfaces that other configs extend.
 */

export interface BaseConfig {
}

export interface ConcurrencyConfig extends BaseConfig {
  concurrency: number;
}

export interface WriteConfig extends BaseConfig {
  writeConcurrency: number;
}

export interface RelationshipWeightConfig extends BaseConfig {
  relationshipWeightProperty?: string;
}

export interface WritePropertyConfig extends WriteConfig {
  writeProperty: string;
}

export interface MutateNodePropertyConfig extends WriteConfig {
  mutateNodeProperty: string;
  mutateNodePropertyType: string;
  mutateNodePropertyValue: string;
  mutateNodePropertyValueType: string;
  mutateNodePropertyValueDefault: string;
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
