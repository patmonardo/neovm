import { Configuration } from '@/annotations/Configuration';
import { NodeLabel } from '@/NodeLabel';
import { NodeProjection } from '@/NodeProjection';
import {
  NodeProjections,
} from "@/NodeProjections";
import {
  ImmutableNodeProjections,
} from "@/ImmutableNodeProjections";
import { RelationshipType } from '../RelationshipType';
import { RelationshipProjection } from '../RelationshipProjection';
import {
  RelationshipProjections,
} from "@/RelationshipProjections";
import {
  ImmutableRelationshipProjections,
} from "@/ImmutableRelationshipProjections";
import { Orientation } from '../Orientation';
import { Aggregation } from '@/core/Aggregation';
import { RelationshipDistribution } from '@/core/generator/RelationshipDistribution';
import { CypherMapWrapper } from '@/core/CypherMapWrapper';
import { GraphProjectConfig } from "./GraphProjectConfig";

/**
 * Configuration for random graph generation
 */
@Configuration
export abstract class RandomGraphGeneratorConfig extends GraphProjectConfig {
  // Constants as static properties
  static readonly RELATIONSHIP_SEED_KEY = 'relationshipSeed';
  static readonly RELATIONSHIP_PROPERTY_KEY = 'relationshipProperty';
  static readonly RELATIONSHIP_DISTRIBUTION_KEY = 'relationshipDistribution';
  static readonly RELATIONSHIP_PROPERTY_NAME_KEY = 'name';
  static readonly RELATIONSHIP_PROPERTY_TYPE_KEY = 'type';
  static readonly RELATIONSHIP_PROPERTY_MIN_KEY = 'min';
  static readonly RELATIONSHIP_PROPERTY_MAX_KEY = 'max';
  static readonly RELATIONSHIP_PROPERTY_VALUE_KEY = 'value';

  /**
   * Returns a map representation for procedure result fields
   */
  @Configuration.Ignore
  override asProcedureResultConfigurationField(): Record<string, any> {
    return this.cleansed(this.toMap(), this.outputFieldDenylist());
  }

  /**
   * Returns the node count for the generated graph
   */
  @Configuration.Parameter()
   nodeCount(): number {
    return 0;
  }

  /**
   * Returns the average degree for the generated graph
   */
  @Configuration.Parameter()
   averageDegree(): number {
    return 0;
  }

  /**
   * Returns the aggregation method for relationship properties
   */
  @Configuration.ConvertWith('Aggregation.parse')
  @Configuration.ToMapValue('Aggregation.toString')
  aggregation(): Aggregation {
    return Aggregation.NONE;
  }

  /**
   * Returns the orientation for generated relationships
   */
  @Configuration.ConvertWith('Orientation.parse')
  @Configuration.ToMapValue('Orientation.toString')
  orientation(): Orientation {
    return Orientation.NATURAL;
  }

  /**
   * Whether to allow self-loops in the generated graph
   */
  allowSelfLoops(): boolean {
    return false;
  }

  /**
   * Returns the relationship distribution to use
   */
  @Configuration.ConvertWith('RelationshipDistribution.parse')
  @Configuration.ToMapValue('RelationshipDistribution.toString')
  relationshipDistribution(): RelationshipDistribution {
    return RelationshipDistribution.UNIFORM;
  }

  /**
   * Returns the seed for relationship generation, if any
   */
  relationshipSeed(): number | null {
    return null;
  }

  /**
   * Returns relationship property configuration
   */
  relationshipProperty(): Record<string, any> {
    return {};
  }

  /**
   * Returns the node projections for the generated graph
   */
  @Configuration.ToMapValue('NodeProjections.toObject')
  nodeProjections(): NodeProjections {
    return ImmutableNodeProjections.builder()
      .putProjection(
        NodeLabel.of(`${this.nodeCount()}_Nodes`),
        NodeProjection.of(`${this.nodeCount()}_Nodes`)
      )
      .build();
  }

  /**
   * Returns the relationship type for the generated graph
   */
  @Configuration.Ignore
  relationshipType(): RelationshipType {
    return RelationshipType.of('REL');
  }

  /**
   * Returns the relationship projections for the generated graph
   */
    @Configuration.ToMapValue('RelationshipProjections.toObject')
  relationshipProjections(): RelationshipProjections {
    return RelationshipProjections.builder()
      .putProjection(
        this.relationshipType(),
        RelationshipProjection.of({
          type: this.relationshipType().name(),
          orientation: this.orientation(),
          aggregation: this.aggregation()
        })
      )
      .build();
  }
  /**
   * Returns the list of fields that should be excluded from output
   */
  @Configuration.Ignore
  override outputFieldDenylist(): Set<string> {
    return new Set([
      GraphProjectConfig.READ_CONCURRENCY_KEY,
      GraphProjectConfig.NODE_COUNT_KEY,
      GraphProjectConfig.RELATIONSHIP_COUNT_KEY,
      'validateRelationships'
    ]);
  }

  /**
   * Create a new RandomGraphGeneratorConfig
   */
  static of(
    username: string,
    graphName: string,
    nodeCount: number,
    averageDegree: number,
    config: CypherMapWrapper
  ): RandomGraphGeneratorConfig {
    return new RandomGraphGeneratorConfigImpl(nodeCount, averageDegree, username, graphName, config);
  }
}

/**
 * Implementation class for RandomGraphGeneratorConfig
 */
class RandomGraphGeneratorConfigImpl extends RandomGraphGeneratorConfig {
  private readonly _nodeCount: number;
  private readonly _averageDegree: number;
  private readonly _username: string;
  private readonly _graphName: string;
  private readonly _config: CypherMapWrapper;

  constructor(
    nodeCount: number,
    averageDegree: number,
    username: string,
    graphName: string,
    config: CypherMapWrapper
  ) {
    super();
    this._nodeCount = nodeCount;
    this._averageDegree = averageDegree;
    this._username = username;
    this._graphName = graphName;
    this._config = config;
  }

  nodeCount(): number {
    return this._nodeCount;
  }

  averageDegree(): number {
    return this._averageDegree;
  }

  override username(): string {
    return this._username;
  }

  override graphName(): string {
    return this._graphName;
  }

  // Override other methods as needed based on _config
  override aggregation(): Aggregation {
    return this._config.containsKey('aggregation')
      ? Aggregation.parse(this._config.getString('aggregation'))
      : super.aggregation();
  }

  override orientation(): Orientation {
    return this._config.containsKey('orientation')
      ? Orientation.parse(this._config.getString('orientation'))
      : super.orientation();
  }

  override allowSelfLoops(): boolean {
    return this._config.containsKey('allowSelfLoops')
      ? this._config.getBoolean('allowSelfLoops')
      : super.allowSelfLoops();
  }

  override relationshipDistribution(): RelationshipDistribution {
    return this._config.containsKey(RandomGraphGeneratorConfig.RELATIONSHIP_DISTRIBUTION_KEY)
      ? RelationshipDistribution.parse(this._config.getString(RandomGraphGeneratorConfig.RELATIONSHIP_DISTRIBUTION_KEY))
      : super.relationshipDistribution();
  }

  override relationshipSeed(): number | null {
    return this._config.containsKey(RandomGraphGeneratorConfig.RELATIONSHIP_SEED_KEY)
      ? this._config.getNumber(RandomGraphGeneratorConfig.RELATIONSHIP_SEED_KEY)
      : super.relationshipSeed();
  }

  override relationshipProperty(): Record<string, any> {
    return this._config.containsKey(RandomGraphGeneratorConfig.RELATIONSHIP_PROPERTY_KEY)
      ? this._config.getMap(RandomGraphGeneratorConfig.RELATIONSHIP_PROPERTY_KEY)
      : super.relationshipProperty();
  }
}

/**
 * Enum for self-loops configuration
 */
export enum AllowSelfLoops {
  YES = 'YES',
  NO = 'NO'
}

/**
 * Static methods for AllowSelfLoops enum
 */
export namespace AllowSelfLoops {
  /**
   * Convert boolean to AllowSelfLoops enum
   */
  export function of(value: boolean): AllowSelfLoops {
    return value ? AllowSelfLoops.YES : AllowSelfLoops.NO;
  }

  /**
   * Convert AllowSelfLoops enum to boolean
   */
  export function value(selfLoops: AllowSelfLoops): boolean {
    return selfLoops === AllowSelfLoops.YES;
  }
}
