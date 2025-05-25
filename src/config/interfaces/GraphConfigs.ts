import { AlgoBaseConfig } from '../types';
import { RelationshipDistribution } from '@/core/generator/RelationshipDistribution';
import { RelationshipType } from '@/projection';

/**
 * Graph creation and manipulation configuration interfaces.
 */

export interface GraphCreateConfig extends AlgoBaseConfig {
  graphName: string;
  nodeProjection: string | string[];
  relationshipProjection: string | string[];
  nodeProperties?: string[];
  relationshipProperties?: string[];
  readConcurrency: number;
}

export interface GraphProjectConfig extends GraphCreateConfig {
  // Projection-specific config
}

export interface GraphSampleConfig extends AlgoBaseConfig {
  sampleSize: number;
  samplingMethod: 'RANDOM' | 'DEGREE_BASED';
}

export interface RandomGraphGeneratorConfig {
  nodeCount: number;
  averageDegree: number;
  relationshipType: RelationshipType;
  relationshipDistribution: RelationshipDistribution;
  seed: number;
  allowSelfLoops: boolean;
  forceDag: boolean;
  inverseIndex: boolean;
}

export interface GraphCatalogConfig {
  graphName: string;
  nodeProjection: string | string[];
  relationshipProjection: string | string[];
}
