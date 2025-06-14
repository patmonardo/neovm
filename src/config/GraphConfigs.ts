import { RelationshipType } from "@/projection";
import { PropertyState } from "@/api";
import { PartialIdMap } from "@/api";
import { DefaultValue } from "@/api";
import { NodeSchema } from "@/api/schema";
import { BaseConfig } from "@/config";
import { AlgoBaseConfig } from "@/config";
import { DeduplicationConfig } from "@/config";
import { BuilderConfig } from "@/config";
import { IdMapBuilder } from "@/core/loading";
import { NodesBuilderContext } from "@/core/loading";
import { RelationshipDistribution } from "@/core/generator";
import { Aggregation } from "@/core";
import { Orientation } from "@/projection";

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

export interface GraphProjectConfig extends GraphCreateConfig {}

export interface GraphSampleConfig extends AlgoBaseConfig {
  sampleSize: number;
  samplingMethod: "RANDOM" | "DEGREE_BASED";
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

// Add your PropertyConfig interface
export interface PropertyConfig extends BaseConfig {
  propertyKey: string;
  aggregation: Aggregation;
  defaultValue: DefaultValue;
  propertyState: PropertyState;
}

// Add your NodesBuilderConfig interface
export interface NodesBuilderConfig
  extends AlgoBaseConfig,
    DeduplicationConfig,
    BuilderConfig {
  nodeCount?: number;
  nodeSchema?: NodeSchema;
  hasLabelInformation: boolean;
  hasProperties: boolean;
  propertyState: PropertyState;
  idMapBuilderType: string;
  context: NodesBuilderContext;
  idMapBuilder: IdMapBuilder;
  propertyStateFunction: (propertyKey: string) => PropertyState;
}

// Add RelationshipsBuilderConfig
export interface RelationshipsBuilderConfig
  extends AlgoBaseConfig,
    BuilderConfig {
  nodes?: PartialIdMap;
  relationshipType?: RelationshipType;
  orientation: Orientation;
  propertyConfigs: PropertyConfig[];
  aggregation: Aggregation;
  skipDanglingRelationships: boolean;
  indexInverse: boolean;
  executorService?: any;
}
