import { NodeLabel } from '@/api/NodeLabel';
import { RelationshipType } from '@/api/RelationshipType';
import { Direction } from '@/api/schema/Direction';
import { Aggregation } from '@/core/Aggregation';
import { PropertyProducer } from './PropertyProducer';
import { NodeLabelProducer } from './NodeLabelProducer';
import { RelationshipDistribution } from './RelationshipDistribution';
import { RandomGraphGenerator } from './RandomGraphGenerator';

/**
 * Enumeration for self-loop configuration in random graph generation.
 */
export enum AllowSelfLoops {
  YES = "YES",
  NO = "NO"
}

export namespace AllowSelfLoops {
  export function value(allowSelfLoops: AllowSelfLoops): boolean {
    return allowSelfLoops === AllowSelfLoops.YES;
  }
}

/**
 * Builder for configuring and creating RandomGraphGenerator instances.
 * Provides a fluent API for setting all graph generation parameters including
 * topology, properties, and structural constraints.
 */
export class RandomGraphGeneratorBuilder {
  private _nodeCount: number = 0;
  private _averageDegree: number = 0;
  private _relationshipDistribution?: RelationshipDistribution;
  private _seed: number = Date.now(); // TypeScript equivalent of System.currentTimeMillis()
  private _maybeNodeLabelProducer?: NodeLabelProducer;
  private _nodePropertyProducers: Map<NodeLabel, Set<PropertyProducer<any>>> = new Map();
  private _maybeRelationshipPropertyProducer?: PropertyProducer<number[]>;
  private _aggregation: Aggregation = Aggregation.NONE;
  private _direction: Direction = Direction.DIRECTED;
  private _allowSelfLoops: AllowSelfLoops = AllowSelfLoops.NO;
  private _relationshipType: RelationshipType = RelationshipType.of("REL");
  private _forceDag: boolean = false;
  private _inverseIndex: boolean = false;

  /**
   * Sets the number of nodes in the generated graph.
   */
  nodeCount(nodeCount: number): this {
    this._nodeCount = nodeCount;
    return this;
  }

  /**
   * Sets the average degree (number of connections per node) in the generated graph.
   */
  averageDegree(averageDegree: number): this {
    this._averageDegree = averageDegree;
    return this;
  }

  /**
   * Sets the relationship type for all relationships in the generated graph.
   */
  relationshipType(relationshipType: RelationshipType): this {
    this._relationshipType = relationshipType;
    return this;
  }

  /**
   * Sets the relationship distribution algorithm (Uniform, Power Law, etc.).
   */
  relationshipDistribution(relationshipDistribution: RelationshipDistribution): this {
    this._relationshipDistribution = relationshipDistribution;
    return this;
  }

  /**
   * Sets the random seed for reproducible graph generation.
   */
  seed(seed: number): this {
    this._seed = seed;
    return this;
  }

  /**
   * Sets the node label producer for generating node labels.
   */
  nodeLabelProducer(nodeLabelProducer: NodeLabelProducer): this {
    this._maybeNodeLabelProducer = nodeLabelProducer;
    return this;
  }

  /**
   * Adds a property producer for all nodes in the graph.
   */
  nodePropertyProducer(nodePropertyProducer: PropertyProducer<any>): this {
    return this.addNodePropertyProducer(NodeLabel.ALL_NODES, nodePropertyProducer);
  }

  /**
   * Adds a property producer for nodes with a specific label.
   */
  addNodePropertyProducer(nodeLabel: NodeLabel, nodePropertyProducer: PropertyProducer<any>): this {
    // Only add if the producer is not empty
    if (nodePropertyProducer.getPropertyName() !== null) {
      if (!this._nodePropertyProducers.has(nodeLabel)) {
        this._nodePropertyProducers.set(nodeLabel, new Set());
      }
      this._nodePropertyProducers.get(nodeLabel)!.add(nodePropertyProducer);
    }
    return this;
  }

  /**
   * Convenience method to add multiple property producers for a node label.
   */
  nodeProperties(nodeLabel: NodeLabel, propertyProducers: Set<PropertyProducer<any>>): this {
    for (const producer of propertyProducers) {
      this.addNodePropertyProducer(nodeLabel, producer);
    }
    return this;
  }

  /**
   * Sets the relationship property producer for generating relationship properties.
   */
  relationshipPropertyProducer(relationshipPropertyProducer: PropertyProducer<number[]>): this {
    this._maybeRelationshipPropertyProducer = relationshipPropertyProducer;
    return this;
  }

  /**
   * Sets the aggregation strategy for combining duplicate relationships.
   */
  aggregation(aggregation: Aggregation): this {
    this._aggregation = aggregation;
    return this;
  }

  /**
   * Sets the direction of relationships (DIRECTED, UNDIRECTED).
   */
  direction(direction: Direction): this {
    this._direction = direction;
    return this;
  }

  /**
   * Sets whether self-loops (nodes connected to themselves) are allowed.
   */
  allowSelfLoops(allowSelfLoops: AllowSelfLoops): this {
    this._allowSelfLoops = allowSelfLoops;
    return this;
  }

  /**
   * Sets whether to force the graph to be a Directed Acyclic Graph (DAG).
   */
  forceDag(forceDag: boolean): this {
    this._forceDag = forceDag;
    return this;
  }

  /**
   * Sets whether to build an inverse index for efficient reverse relationship lookup.
   */
  inverseIndex(inverseIndex: boolean): this {
    this._inverseIndex = inverseIndex;
    return this;
  }

  /**
   * Builds and returns a configured RandomGraphGenerator instance.
   * Validates all parameters before construction.
   */
  build(): RandomGraphGenerator {
    this.validate();
    return new RandomGraphGenerator(
      this._nodeCount,
      this._averageDegree,
      this._relationshipType,
      this._relationshipDistribution!,
      this._seed,
      this._maybeNodeLabelProducer,
      this._nodePropertyProducers,
      this._maybeRelationshipPropertyProducer,
      this._aggregation,
      this._direction,
      this._allowSelfLoops,
      this._forceDag,
      this._inverseIndex
    );
  }

  /**
   * Validates the builder configuration and throws errors for invalid combinations.
   */
  private validate(): void {
    if (this._nodeCount <= 0) {
      throw new Error("Must provide positive nodeCount");
    }
    if (this._averageDegree <= 0) {
      throw new Error("Must provide positive averageDegree");
    }
    if (this._relationshipDistribution === undefined) {
      throw new Error("Must provide a RelationshipDistribution");
    }
    if (AllowSelfLoops.value(this._allowSelfLoops) && this._forceDag) {
      throw new Error("Cannot create DAG with self loops");
    }
    if (this._relationshipDistribution === RelationshipDistribution.POWER_LAW && this._forceDag) {
      throw new Error(
        "Forcing DAG with power law distributions is not supported in current implementation (this limitation might be removed in the future)"
      );
    }
    if (this._inverseIndex && this._direction === Direction.UNDIRECTED) {
      throw new Error("Cannot use the inverse index feature with undirected graphs");
    }
  }

  /**
   * Returns a string representation of the current builder configuration.
   */
  toString(): string {
    return `RandomGraphGeneratorBuilder{` +
      `nodeCount=${this._nodeCount}, ` +
      `averageDegree=${this._averageDegree}, ` +
      `relationshipType=${this._relationshipType.name}, ` +
      `relationshipDistribution=${this._relationshipDistribution}, ` +
      `seed=${this._seed}, ` +
      `direction=${this._direction}, ` +
      `allowSelfLoops=${this._allowSelfLoops}, ` +
      `forceDag=${this._forceDag}, ` +
      `inverseIndex=${this._inverseIndex}` +
      `}`;
  }
}
