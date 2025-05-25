import { InputIterable, InputIterator, InputChunk } from '@/batchimport/api/InputIterable';
import { IdType } from '@/batchimport/api/input/IdType';
import { Input } from '@/batchimport/api/input/Input';
import { InputEntityVisitor } from '@/batchimport/api/input/InputEntityVisitor';
import { ReadableGroups } from '@/batchimport/api/input/ReadableGroups';
import { NodeLabel } from '@/api/NodeLabel';
import { RelationshipType } from '@/api/RelationshipType';
import { CompositeRelationshipIterator } from '@/api/CompositeRelationshipIterator';
import { IdMap } from '@/api/IdMap';
import { GraphProperty } from '@/api/properties/graph/GraphProperty';
import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { IdMapFunction, IdMappingType } from './GraphStoreExporter';
import { Capabilities } from '@/core/loading/Capabilities';
import { LongEncoder } from '@/batchimport/cache/idmapping/string/LongEncoder';
import { Groups } from '@/batchimport/input/Groups';
import { IdValidator } from '@/id/IdValidator';
import { EntityLongIdVisitor } from './EntityLongIdVisitor';
import { MetaDataStore } from './MetaDataStore';
import { NodeStore } from './NodeStore';
import { RelationshipStore } from './RelationshipStore';
import { IdentifierMapper } from './IdentifierMapper';

/**
 * The comprehensive input representation of a GraphStore for import/export operations.
 * This is the **core data structure** that defines what a GraphStore contains and
 * how it can be processed by batch import systems.
 *
 * Contains:
 * - Node data (IDs, labels, properties)
 * - Relationship data (connections, types, properties)
 * - Graph-level properties
 * - Metadata and capabilities
 * - Parallel processing configuration
 */
export class GraphStoreInput {
  private readonly metaDataStore: MetaDataStore;
  private readonly nodeStore: NodeStore;
  private readonly relationshipStore: RelationshipStore;
  private readonly graphProperties: Set<GraphProperty>;
  private readonly batchSize: number;
  private readonly concurrency: Concurrency;
  private readonly idMapFunction: IdMapFunction;
  private readonly idMode: IdMode;
  private readonly capabilities: Capabilities;

  /**
   * Factory method that creates a GraphStoreInput with appropriate ID handling strategy.
   * Automatically chooses between direct ID mapping and group-based mapping based on ID ranges.
   */
  static of(
    metaDataStore: MetaDataStore,
    nodeStore: NodeStore,
    relationshipStore: RelationshipStore,
    capabilities: Capabilities,
    graphProperties: Set<GraphProperty>,
    batchSize: number,
    concurrency: Concurrency,
    idMappingType: IdMappingType
  ): GraphStoreInput {
    // Neo reserves node id 2^32 - 1 for handling special internal cases.
    // If our id space is below that value, we can use actual mapping, i.e.,
    // we directly forward the internal GDS ids to the batch importer.
    // If the GDS ids contain the reserved id, we need to fall back to Neo's
    // id mapping functionality. This however, is limited to external ids up
    // until 2^58, which is why we need to ensure that we don't exceed that.

    const idMapFunction = idMappingType === IdMappingType.ORIGINAL
      ? IdMappingFunctions[IdMappingType.ORIGINAL]
      : IdMappingFunctions[IdMappingType.MAPPED];

    if (idMapFunction.highestId(nodeStore.idMap()) >= IdValidator.INTEGER_MINUS_ONE
        && idMapFunction.contains(nodeStore.idMap(), IdValidator.INTEGER_MINUS_ONE)) {
      try {
        // We try to encode the highest mapped neo id in order to check if we
        // exceed the limit. This is the encoder used when using IdType.INTEGER
        new LongEncoder().encode(idMapFunction.highestId(nodeStore.idMap()));
      } catch (error) {
        throw new Error(`The range of original ids specified in the graph exceeds the limit: ${error}`);
      }
      return new GraphStoreInput(
        metaDataStore,
        nodeStore,
        relationshipStore,
        capabilities,
        graphProperties,
        batchSize,
        concurrency,
        idMapFunction,
        IdMode.MAPPING
      );
    } else {
      return new GraphStoreInput(
        metaDataStore,
        nodeStore,
        relationshipStore,
        capabilities,
        graphProperties,
        batchSize,
        concurrency,
        idMapFunction,
        IdMode.ACTUAL
      );
    }
  }

  private constructor(
    metaDataStore: MetaDataStore,
    nodeStore: NodeStore,
    relationshipStore: RelationshipStore,
    capabilities: Capabilities,
    graphProperties: Set<GraphProperty>,
    batchSize: number,
    concurrency: Concurrency,
    idMapFunction: IdMapFunction,
    idMode: IdMode
  ) {
    this.metaDataStore = metaDataStore;
    this.nodeStore = nodeStore;
    this.relationshipStore = relationshipStore;
    this.graphProperties = graphProperties;
    this.batchSize = batchSize;
    this.concurrency = concurrency;
    this.idMapFunction = idMapFunction;
    this.idMode = idMode;
    this.capabilities = capabilities;
  }

  /**
   * Converts this GraphStoreInput to a batch import Input.
   * This is where the GraphStore interfaces with Neo4j's batch import system.
   */
  toInput(): Input {
    const numberOfNodeProperties = this.nodeStore.propertyCount();
    const numberOfRelationshipProperties = this.relationshipStore.propertyCount();

    const estimate = Input.knownEstimates(
      this.nodeStore.nodeCount(),
      this.relationshipStore.relationshipCount(),
      numberOfNodeProperties,
      numberOfRelationshipProperties,
      numberOfNodeProperties * 8, // Double.BYTES = 8
      numberOfRelationshipProperties * 8,
      this.nodeStore.labelCount()
    );

    return Input.input(
      () => new NodeImporter(this.nodeStore, this.batchSize, this.idMode.get(), this.idMapFunction),
      () => new RelationshipImporter(this.relationshipStore, this.batchSize, this.idMode.get(), this.idMapFunction),
      this.idMode.idType,
      estimate,
      this.idMode.readableGroups
    );
  }

  metaDataStore(): MetaDataStore {
    return this.metaDataStore;
  }

  capabilities(): Capabilities {
    return this.capabilities;
  }

  /**
   * Returns an iterable for processing graph properties in parallel.
   */
  graphProperties(): InputIterable {
    return {
      iterator: () => new GraphPropertyIterator(this.graphProperties.values(), this.concurrency)
    };
  }

  labelMapping(): IdentifierMapper<NodeLabel> {
    return this.nodeStore.labelMapping();
  }

  typeMapping(): IdentifierMapper<RelationshipType> {
    return this.relationshipStore.typeMapping();
  }
}

/**
 * ID handling strategies for different scenarios.
 */
enum IdMode {
  MAPPING = 'MAPPING',
  ACTUAL = 'ACTUAL'
}

namespace IdMode {
  export const MAPPING = {
    idType: IdType.INTEGER,
    readableGroups: new Groups(),
    get(): EntityLongIdVisitor {
      return EntityLongIdVisitor.mapping(this.readableGroups);
    }
  };

  export const ACTUAL = {
    idType: IdType.ACTUAL,
    readableGroups: ReadableGroups.EMPTY,
    get(): EntityLongIdVisitor {
      return EntityLongIdVisitor.ACTUAL;
    }
  };
}

/**
 * Iterator for processing graph properties in parallel chunks.
 */
class GraphPropertyIterator implements InputIterator {
  private readonly graphPropertyIterator: Iterator<GraphProperty>;
  private readonly concurrency: Concurrency;
  private readonly splits: Array<any>; // Queue of spliterators
  private currentPropertyName: string | null = null;

  constructor(graphPropertyIterator: Iterator<GraphProperty>, concurrency: Concurrency) {
    this.graphPropertyIterator = graphPropertyIterator;
    this.concurrency = concurrency;
    this.splits = [];
  }

  newChunk(): InputChunk {
    return new GraphPropertyInputChunk();
  }

  next(chunk: InputChunk): boolean {
    if (this.splits.length === 0) {
      if (this.graphPropertyIterator.next().done === false) {
        this.initializeSplits();
      } else {
        return false;
      }
    }

    if (this.splits.length > 0) {
      (chunk as GraphPropertyInputChunk).initialize(
        this.currentPropertyName!,
        this.splits.shift()!
      );
      return true;
    }

    this.currentPropertyName = null;
    return false;
  }

  close(): void {
    // Cleanup if needed
  }

  private initializeSplits(): void {
    const graphPropertyResult = this.graphPropertyIterator.next();
    if (!graphPropertyResult.done) {
      const graphProperty = graphPropertyResult.value;
      const values = Array.from(graphProperty.values().objects());

      // Split into chunks for parallel processing
      const chunkSize = Math.ceil(values.length / this.concurrency.value());
      this.splits.length = 0;

      for (let i = 0; i < values.length; i += chunkSize) {
        this.splits.push(values.slice(i, i + chunkSize));
      }

      this.currentPropertyName = graphProperty.key();
    }
  }
}

/**
 * Input chunk for processing graph property values.
 */
class GraphPropertyInputChunk implements InputChunk, LastProgress {
  private propertyName!: string;
  private propertyValues!: any[];
  private index = 0;

  initialize(propertyName: string, propertyValues: any[]): void {
    this.propertyName = propertyName;
    this.propertyValues = propertyValues;
    this.index = 0;
  }

  next(visitor: InputEntityVisitor): boolean {
    if (this.index < this.propertyValues.length) {
      visitor.property(this.propertyName, this.propertyValues[this.index++]);
      visitor.endOfEntity();
      return true;
    }
    return false;
  }

  close(): void {
    // Cleanup if needed
  }

  lastProgress(): number {
    return 1;
  }
}

/**
 * Base class for importing graph elements (nodes and relationships).
 */
abstract class GraphImporter implements InputIterator {
  protected readonly nodeCount: number;
  protected readonly batchSize: number;
  protected readonly inputEntityIdVisitor: EntityLongIdVisitor;
  protected readonly idMapFunction: IdMapFunction;
  private id = 0;

  constructor(
    nodeCount: number,
    batchSize: number,
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    this.nodeCount = nodeCount;
    this.batchSize = batchSize;
    this.inputEntityIdVisitor = inputEntityIdVisitor;
    this.idMapFunction = idMapFunction;
  }

  next(chunk: InputChunk): boolean {
    if (this.id >= this.nodeCount) {
      return false;
    }
    const startId = this.id;
    this.id = Math.min(this.nodeCount, startId + this.batchSize);

    (chunk as EntityChunk).initialize(startId, this.id);
    return true;
  }

  close(): void {
    // Cleanup if needed
  }

  abstract newChunk(): InputChunk;
}

/**
 * Importer for processing nodes in batches.
 */
class NodeImporter extends GraphImporter {
  private readonly nodeStore: NodeStore;

  constructor(
    nodeStore: NodeStore,
    batchSize: number,
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    super(nodeStore.nodeCount(), batchSize, inputEntityIdVisitor, idMapFunction);
    this.nodeStore = nodeStore;
  }

  newChunk(): InputChunk {
    return new NodeChunk(this.nodeStore, this.inputEntityIdVisitor, this.idMapFunction);
  }
}

/**
 * Importer for processing relationships in batches.
 */
class RelationshipImporter extends GraphImporter {
  private readonly relationshipStore: RelationshipStore;

  constructor(
    relationshipStore: RelationshipStore,
    batchSize: number,
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    super(relationshipStore.nodeCount(), batchSize, inputEntityIdVisitor, idMapFunction);
    this.relationshipStore = relationshipStore;
  }

  newChunk(): InputChunk {
    return new RelationshipChunk(this.relationshipStore.concurrentCopy(), this.inputEntityIdVisitor, this.idMapFunction);
  }
}

/**
 * Interface for tracking progress in chunks.
 */
export interface LastProgress {
  lastProgress(): number;
}

/**
 * Base class for entity chunks (nodes and relationships).
 */
abstract class EntityChunk implements InputChunk, LastProgress {
  protected readonly inputEntityIdVisitor: EntityLongIdVisitor;
  protected id = 0;
  protected endId = 0;

  constructor(inputEntityIdVisitor: EntityLongIdVisitor) {
    this.inputEntityIdVisitor = inputEntityIdVisitor;
  }

  initialize(startId: number, endId: number): void {
    this.id = startId;
    this.endId = endId;
  }

  close(): void {
    // Cleanup if needed
  }

  abstract next(visitor: InputEntityVisitor): boolean;
  abstract lastProgress(): number;
}

/**
 * Chunk for processing batches of nodes.
 */
class NodeChunk extends EntityChunk {
  private readonly nodeStore: NodeStore;
  private readonly hasLabels: boolean;
  private readonly hasProperties: boolean;
  private readonly idMapFunction: IdMapFunction;
  private readonly labelToNodeProperties: Map<string, Map<string, NodePropertyValues>>;

  constructor(
    nodeStore: NodeStore,
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    super(inputEntityIdVisitor);
    this.nodeStore = nodeStore;
    this.hasLabels = nodeStore.hasLabels();
    this.hasProperties = nodeStore.hasProperties();
    this.idMapFunction = idMapFunction;
    this.labelToNodeProperties = nodeStore.labelToNodeProperties();
  }

  next(visitor: InputEntityVisitor): boolean {
    if (this.id < this.endId) {
      this.inputEntityIdVisitor.visitNodeId(visitor, this.idMapFunction.getId(this.nodeStore.idMap(), this.id));

      if (this.hasLabels) {
        const labels = this.nodeStore.labels(this.id);
        visitor.labels(labels);

        if (this.hasProperties) {
          this.exportProperties(
            visitor,
            labels.map(label => this.labelToNodeProperties.get(label) || new Map())
          );
        }
      } else if (this.hasProperties) {
        // no label information, but node properties
        this.exportProperties(visitor, Array.from(this.labelToNodeProperties.values()));
      }

      // Export additional properties
      for (const [propertyKey, propertyFn] of this.nodeStore.additionalProperties()) {
        const value = propertyFn(this.id);
        if (value != null) {
          visitor.property(propertyKey, value);
        }
      }

      visitor.endOfEntity();
      this.id++;
      return true;
    }
    return false;
  }

  private exportProperties(
    visitor: InputEntityVisitor,
    propertyStores: Map<string, NodePropertyValues>[]
  ): void {
    const propertyProducers = new Map<string, NodePropertyValues>();

    for (const store of propertyStores) {
      for (const [propertyKey, properties] of store) {
        const previousProducer = propertyProducers.get(propertyKey);
        if (previousProducer) {
          if (previousProducer !== properties) {
            throw new Error(
              "Different producers for the same property, property keys must be unique per node, not per label."
            );
          }
          continue;
        }

        const property = properties.getObject(this.id);
        if (property != null) {
          propertyProducers.set(propertyKey, properties);
          visitor.property(propertyKey, property);
        }
      }
    }
  }

  lastProgress(): number {
    return 1;
  }
}

/**
 * Chunk for processing batches of relationships.
 */
class RelationshipChunk extends EntityChunk {
  private readonly relationshipStore: RelationshipStore;
  private readonly relationshipConsumers: Map<RelationshipType, RelationshipConsumer>;
  private lastProcessed = 0;

  constructor(
    relationshipStore: RelationshipStore,
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    super(inputEntityIdVisitor);
    this.relationshipStore = relationshipStore;

    this.relationshipConsumers = new Map();
    for (const [relationshipType, iterator] of relationshipStore.relationshipIterators()) {
      this.relationshipConsumers.set(
        relationshipType,
        new RelationshipConsumer(
          relationshipStore.idMap(),
          relationshipType.name,
          iterator.propertyKeys(),
          inputEntityIdVisitor,
          idMapFunction
        )
      );
    }
  }

  next(visitor: InputEntityVisitor): boolean {
    this.lastProcessed = 0;

    if (this.id < this.endId) {
      for (const [relationshipType, relationshipIterator] of this.relationshipStore.relationshipIterators()) {
        const relationshipConsumer = this.relationshipConsumers.get(relationshipType)!;
        relationshipConsumer.setVisitor(visitor);

        this.lastProcessed += relationshipIterator.degree(this.id);
        relationshipIterator.forEachRelationship(this.id, relationshipConsumer);
      }
      this.id++;
      return true;
    }
    return false;
  }

  lastProgress(): number {
    return this.lastProcessed;
  }
}

/**
 * Consumer for processing individual relationships.
 */
class RelationshipConsumer implements CompositeRelationshipIterator.RelationshipConsumer {
  private readonly idMap: IdMap;
  private readonly relationshipType: string;
  private readonly propertyKeys: string[];
  private readonly inputEntityIdVisitor: EntityLongIdVisitor;
  private readonly idMapFunction: IdMapFunction;
  private visitor!: InputEntityVisitor;

  constructor(
    idMap: IdMap,
    relationshipType: string,
    propertyKeys: string[],
    inputEntityIdVisitor: EntityLongIdVisitor,
    idMapFunction: IdMapFunction
  ) {
    this.idMap = idMap;
    this.relationshipType = relationshipType;
    this.propertyKeys = propertyKeys;
    this.inputEntityIdVisitor = inputEntityIdVisitor;
    this.idMapFunction = idMapFunction;
  }

  setVisitor(visitor: InputEntityVisitor): void {
    this.visitor = visitor;
  }

  consume(source: number, target: number, properties: number[]): boolean {
    this.inputEntityIdVisitor.visitSourceId(this.visitor, this.idMapFunction.getId(this.idMap, source));
    this.inputEntityIdVisitor.visitTargetId(this.visitor, this.idMapFunction.getId(this.idMap, target));
    this.visitor.type(this.relationshipType);

    for (let propertyIdx = 0; propertyIdx < this.propertyKeys.length; propertyIdx++) {
      this.visitor.property(
        this.propertyKeys[propertyIdx],
        properties[propertyIdx]
      );
    }

    this.visitor.endOfEntity();
    return true;
  }
}
