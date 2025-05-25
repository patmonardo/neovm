import { NodeLabel } from '@/api/NodeLabel';
import { RelationshipType } from '@/api/RelationshipType';
import { DefaultValue } from '@/api/DefaultValue';
import { IdMap } from '@/api/IdMap';
import { Direction } from '@/api/schema/Direction';
import { MutableGraphSchema } from '@/api/schema/MutableGraphSchema';
import { MutableNodeSchema } from '@/api/schema/MutableNodeSchema';
import { MutableRelationshipSchema } from '@/api/schema/MutableRelationshipSchema';
import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { NodePropertyValuesAdapter } from '@/api/properties/nodes/NodePropertyValuesAdapter';
import { Aggregation } from '@/core/Aggregation';
import { HugeGraph } from '@/core/huge/HugeGraph';
import { GraphFactory } from '@/core/loading/construction/GraphFactory';
import { NodesBuilder } from '@/core/loading/construction/NodesBuilder';
import { RelationshipsBuilder } from '@/core/loading/construction/RelationshipsBuilder';
import { HugeArray } from '@/collections/ha/HugeArray';
import { HugeDoubleArray } from '@/collections/ha/HugeDoubleArray';
import { HugeLongArray } from '@/collections/ha/HugeLongArray';
import { HugeObjectArray } from '@/collections/ha/HugeObjectArray';
import { HugeCursor } from '@/collections/cursor/HugeCursor';
import { ShuffleUtil } from '@/core/utils/shuffle/ShuffleUtil';
import { PropertyProducer } from './PropertyProducer';
import { NodeLabelProducer } from './NodeLabelProducer';
import { RelationshipDistribution } from './RelationshipDistribution';
import { AllowSelfLoops } from './AllowSelfLoops';
import { formatWithLocale } from '@/utils/StringFormatting';

/**
 * Interface for the node properties and schema result.
 */
interface NodePropertiesAndSchema {
  nodeSchema(): MutableNodeSchema;
  nodeProperties(): Map<string, NodePropertyValues>;
}

/**
 * High-performance random graph generator that creates realistic graph structures
 * with configurable topology, node labels, and properties.
 *
 * Supports multiple graph models (Erdős–Rényi, Barabási–Albert, Power Law) and
 * can generate graphs with millions of nodes and relationships efficiently.
 */
export class RandomGraphGenerator {
  private readonly nodeCount: number;
  private readonly averageDegree: number;
  private readonly random: Random;
  private readonly propertyValueRandom: Random;

  private readonly relationshipType: RelationshipType;
  private readonly relationshipDistribution: RelationshipDistribution;
  private readonly aggregation: Aggregation;
  private readonly direction: Direction;
  private readonly allowSelfLoops: AllowSelfLoops;
  private readonly inverseIndex: boolean;

  private readonly maybeNodeLabelProducer?: NodeLabelProducer;
  private readonly maybeRelationshipPropertyProducer?: PropertyProducer<number[]>;
  private readonly nodePropertyProducers: Map<NodeLabel, Set<PropertyProducer<any>>>;
  private readonly forceDag: boolean;
  private readonly randomDagMapping?: HugeLongArray;

  constructor(
    nodeCount: number,
    averageDegree: number,
    relationshipType: RelationshipType,
    relationshipDistribution: RelationshipDistribution,
    seed: number,
    maybeNodeLabelProducer: NodeLabelProducer | undefined,
    nodePropertyProducers: Map<NodeLabel, Set<PropertyProducer<any>>>,
    maybeRelationshipPropertyProducer: PropertyProducer<number[]> | undefined,
    aggregation: Aggregation,
    direction: Direction,
    allowSelfLoops: AllowSelfLoops,
    forceDag: boolean,
    inverseIndex: boolean
  ) {
    this.nodeCount = nodeCount;
    this.averageDegree = averageDegree;
    this.relationshipType = relationshipType;
    this.relationshipDistribution = relationshipDistribution;
    this.maybeNodeLabelProducer = maybeNodeLabelProducer;
    this.nodePropertyProducers = nodePropertyProducers;
    this.maybeRelationshipPropertyProducer = maybeRelationshipPropertyProducer;
    this.aggregation = aggregation;
    this.direction = direction;
    this.allowSelfLoops = allowSelfLoops;
    this.forceDag = forceDag;
    this.inverseIndex = inverseIndex;
    this.random = new Random(seed);
    this.propertyValueRandom = new Random(seed);
    this.randomDagMapping = this.generateRandomMapping(seed);
  }

  /**
   * Creates a builder for configuring random graph generation.
   */
  static builder(): RandomGraphGeneratorBuilder {
    return new RandomGraphGeneratorBuilder();
  }

  /**
   * Generates the random graph with all configured properties and relationships.
   *
   * @returns A complete HugeGraph with nodes, relationships, and properties
   */
  generate(): HugeGraph {
    // Build nodes
    const nodesBuilder = GraphFactory.initNodesBuilder()
      .maxOriginalId(this.nodeCount)
      .hasLabelInformation(this.maybeNodeLabelProducer !== undefined)
      .build();

    if (this.maybeNodeLabelProducer) {
      this.generateNodes(nodesBuilder, this.maybeNodeLabelProducer);
    } else {
      this.generateNodes(nodesBuilder);
    }

    const idMap = nodesBuilder.build().idMap();
    const nodePropertiesAndSchema = this.generateNodeProperties(idMap);

    // Build relationships
    const relationshipsBuilder = GraphFactory.initRelationshipsBuilder()
      .nodes(idMap)
      .relationshipType(this.relationshipType)
      .orientation(this.direction.toOrientation())
      .addAllPropertyConfigs(
        this.maybeRelationshipPropertyProducer
          ? [GraphFactory.PropertyConfig.of(
              this.maybeRelationshipPropertyProducer.getPropertyName(),
              this.aggregation,
              DefaultValue.forDouble()
            )]
          : []
      )
      .indexInverse(this.inverseIndex)
      .aggregation(this.aggregation)
      .build();

    this.generateRelationships(relationshipsBuilder);

    const relationships = relationshipsBuilder.build();

    // Build schema
    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.set(relationships.relationshipSchemaEntry());

    const graphSchema = MutableGraphSchema.of(
      nodePropertiesAndSchema.nodeSchema(),
      relationshipSchema,
      new Map()
    );

    return GraphFactory.create(
      graphSchema,
      idMap,
      nodePropertiesAndSchema.nodeProperties(),
      relationships
    );
  }

  /**
   * Gets the relationship distribution used by this generator.
   */
  getRelationshipDistribution(): RelationshipDistribution {
    return this.relationshipDistribution;
  }

  /**
   * Gets the relationship property producer if configured.
   */
  getMaybeRelationshipPropertyProducer(): PropertyProducer<number[]> | undefined {
    return this.maybeRelationshipPropertyProducer;
  }

  /**
   * Generates nodes with labels using the configured label producer.
   */
  private generateNodes(nodesBuilder: NodesBuilder, nodeLabelProducer: NodeLabelProducer): void {
    for (let i = 0; i < this.nodeCount; i++) {
      nodesBuilder.addNode(i, nodeLabelProducer.labels(i));
    }
  }

  /**
   * Generates nodes without labels.
   */
  private generateNodes(nodesBuilder: NodesBuilder): void {
    for (let i = 0; i < this.nodeCount; i++) {
      nodesBuilder.addNode(i);
    }
  }

  /**
   * Generates relationships according to the configured distribution and properties.
   */
  private generateRelationships(relationshipsImporter: RelationshipsBuilder): void {
    const degreeProducer = this.relationshipDistribution.degreeProducer(
      this.nodeCount,
      this.averageDegree,
      this.random
    );
    const relationshipProducer = this.relationshipDistribution.relationshipProducer(
      this.nodeCount,
      this.averageDegree,
      this.random
    );
    const relationshipPropertyProducer = this.maybeRelationshipPropertyProducer ||
      new PropertyProducer.EmptyPropertyProducer();

    const property = [0.0]; // Array for property value

    for (let nodeId = 0; nodeId < this.nodeCount; nodeId++) {
      const degree = degreeProducer(nodeId);

      for (let j = 0; j < degree; j++) {
        let targetId = relationshipProducer(nodeId);

        // Avoid self-loops if not allowed
        if (!this.allowSelfLoops.value()) {
          while (targetId === nodeId) {
            targetId = relationshipProducer(nodeId);
          }
        }

        console.assert(targetId < this.nodeCount, 'Target ID must be within node count');

        relationshipPropertyProducer.setProperty(nodeId, property, 0, this.propertyValueRandom);

        if (this.forceDag) {
          this.addDagRelationship(relationshipsImporter, nodeId, targetId, property);
        }
        // For POWER_LAW, we generate a normal distributed out-degree value
        // and connect to nodes where the target is power-law-distributed.
        // In order to have the out degree follow a power-law distribution,
        // we have to swap the relationship.
        else if (this.relationshipDistribution === RelationshipDistribution.POWER_LAW) {
          relationshipsImporter.addFromInternal(targetId, nodeId, property[0]);
        } else {
          relationshipsImporter.addFromInternal(nodeId, targetId, property[0]);
        }
      }
    }
  }

  /**
   * Adds a relationship ensuring DAG property by using random mapping.
   */
  private addDagRelationship(
    relationshipsImporter: RelationshipsBuilder,
    nodeId: number,
    targetId: number,
    property: number[]
  ): void {
    if (!this.randomDagMapping) {
      throw new Error('Random DAG mapping not initialized');
    }

    if (targetId > nodeId) {
      relationshipsImporter.addFromInternal(
        this.randomDagMapping.get(nodeId),
        this.randomDagMapping.get(targetId),
        property[0]
      );
    } else {
      relationshipsImporter.addFromInternal(
        this.randomDagMapping.get(targetId),
        this.randomDagMapping.get(nodeId),
        property[0]
      );
    }
  }

  /**
   * Generates node properties for all configured labels and property producers.
   */
  private generateNodeProperties(idMap: IdMap): NodePropertiesAndSchema {
    if (this.nodePropertyProducers.size === 0) {
      const nodeSchema = MutableNodeSchema.empty();
      for (const nodeLabel of idMap.availableNodeLabels()) {
        nodeSchema.getOrCreateLabel(nodeLabel);
      }
      return {
        nodeSchema: () => nodeSchema,
        nodeProperties: () => new Map()
      };
    }

    const propertyNameToLabels = new Map<string, NodeLabel[]>();
    const propertyNameToProducers = new Map<string, PropertyProducer<any>>();

    for (const [nodeLabel, propertyProducers] of this.nodePropertyProducers) {
      if (nodeLabel !== NodeLabel.ALL_NODES && !idMap.availableNodeLabels().has(nodeLabel)) {
        continue;
      }

      for (const propertyProducer of propertyProducers) {
        // Map property names to all labels for that property
        const propertyName = propertyProducer.getPropertyName();
        if (!propertyNameToLabels.has(propertyName)) {
          propertyNameToLabels.set(propertyName, []);
        }
        propertyNameToLabels.get(propertyName)!.push(nodeLabel);

        // Group producers by property name
        const existingProducer = propertyNameToProducers.get(propertyName);
        if (existingProducer && !existingProducer.equals(propertyProducer)) {
          throw new Error(formatWithLocale(
            "Duplicate node properties with name [%s]. The first property producer is [%s], the second one is [%s].",
            propertyName,
            existingProducer.toString(),
            propertyProducer.toString()
          ));
        }
        propertyNameToProducers.set(propertyName, propertyProducer);
      }
    }

    const generatedProperties = new Map<string, NodePropertyValues>();

    for (const [propertyName, propertyProducer] of propertyNameToProducers) {
      const nodeLabels = new Set(propertyNameToLabels.get(propertyName)!);
      const nodes = idMap.nodeIterator(nodeLabels);
      generatedProperties.set(propertyName, this.generateProperties(nodes, propertyProducer));
    }

    // Create corresponding node schema
    const nodeSchema = MutableNodeSchema.empty();
    for (const [propertyKey, property] of generatedProperties) {
      const labels = propertyNameToLabels.get(propertyKey)!;
      for (const nodeLabel of labels) {
        if (nodeLabel === NodeLabel.ALL_NODES) {
          for (const actualNodeLabel of idMap.availableNodeLabels()) {
            nodeSchema
              .getOrCreateLabel(actualNodeLabel)
              .addProperty(propertyKey, property.valueType());
          }
        } else {
          nodeSchema
            .getOrCreateLabel(nodeLabel)
            .addProperty(propertyKey, property.valueType());
        }
      }
    }

    return {
      nodeSchema: () => nodeSchema,
      nodeProperties: () => generatedProperties
    };
  }

  /**
   * Generates properties for nodes using the specified property producer.
   */
  private generateProperties(
    nodes: IterableIterator<number>,
    propertyProducer: PropertyProducer<any>
  ): NodePropertyValues {
    switch (propertyProducer.propertyType()) {
      case ValueType.LONG: {
        const longValues = HugeLongArray.newArray(this.nodeCount);
        longValues.fill(DefaultValue.forLong().longValue());
        return this.generatePropertiesTyped(
          nodes,
          longValues,
          propertyProducer as PropertyProducer<number[]>,
          NodePropertyValuesAdapter.adapt
        );
      }
      case ValueType.DOUBLE: {
        const doubleValues = HugeDoubleArray.newArray(this.nodeCount);
        doubleValues.fill(DefaultValue.forDouble().doubleValue());
        return this.generatePropertiesTyped(
          nodes,
          doubleValues,
          propertyProducer as PropertyProducer<number[]>,
          NodePropertyValuesAdapter.adapt
        );
      }
      case ValueType.DOUBLE_ARRAY:
        return this.generatePropertiesTyped(
          nodes,
          HugeObjectArray.newArray(this.nodeCount),
          propertyProducer as PropertyProducer<number[][]>,
          NodePropertyValuesAdapter.adapt
        );
      case ValueType.FLOAT_ARRAY:
        return this.generatePropertiesTyped(
          nodes,
          HugeObjectArray.newArray(this.nodeCount),
          propertyProducer as PropertyProducer<number[][]>,
          NodePropertyValuesAdapter.adapt
        );
      case ValueType.LONG_ARRAY:
        return this.generatePropertiesTyped(
          nodes,
          HugeObjectArray.newArray(this.nodeCount),
          propertyProducer as PropertyProducer<number[][]>,
          NodePropertyValuesAdapter.adapt
        );
      default:
        throw new Error('Properties producer must return a known value type');
    }
  }

  /**
   * Type-safe property generation with cursor-based efficient iteration.
   */
  private generatePropertiesTyped<T, A extends HugeArray<T, any, A>>(
    nodes: IterableIterator<number>,
    values: A,
    propertyProducer: PropertyProducer<T>,
    toProperties: (values: A) => NodePropertyValues
  ): NodePropertyValues {
    const cursor = values.initCursor(values.newCursor());

    for (const nodeId of nodes) {
      const i = this.seek(nodeId, cursor);
      propertyProducer.setProperty(nodeId, cursor.array, i, this.random);
    }

    return toProperties(values);
  }

  /**
   * Seeks to the correct position in the huge array cursor.
   */
  private seek<T>(targetNode: number, cursor: HugeCursor<T>): number {
    while (cursor.base < targetNode && cursor.base + cursor.limit < targetNode) {
      if (!cursor.next()) {
        throw new Error('Cursor exhausted before reaching target node');
      }
    }
    return Math.floor(targetNode - cursor.base);
  }

  /**
   * Generates random mapping for DAG enforcement.
   */
  private generateRandomMapping(seed: number): HugeLongArray | undefined {
    if (this.forceDag) {
      const randomDagMapping = HugeLongArray.newArray(this.nodeCount);
      randomDagMapping.setAll(i => i);
      ShuffleUtil.shuffleArray(randomDagMapping, new SplittableRandom(seed));
      return randomDagMapping;
    }
    return undefined;
  }
}

/**
 * Simple Random interface for consistent random number generation.
 */
interface Random {
  nextDouble(): number;
  nextFloat(): number;
  nextLong(): number;
}

/**
 * Simple Random implementation using Math.random with seeding.
 */
class Random {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  nextDouble(): number {
    // Simple seeded random implementation
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextFloat(): number {
    return this.nextDouble();
  }

  nextLong(): number {
    return Math.floor(this.nextDouble() * Number.MAX_SAFE_INTEGER);
  }
}

/**
 * Splittable random for parallel random generation.
 */
class SplittableRandom extends Random {
  constructor(seed: number) {
    super(seed);
  }
}
