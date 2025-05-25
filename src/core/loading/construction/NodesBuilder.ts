import { NodeLabel } from '@/gds';
import { IdMap, PropertyState } from '@/api';
import {
  ImmutableNodeProperty,
  NodeProperty,
  NodePropertyStore,
  NodePropertyValues
} from '@/api/properties/nodes';
import {
  MutableNodeSchema,
  PropertySchema
} from '@/api/schema';
import { Concurrency } from '@/core/concurrency';
import {
  IdMapBuilder,
  ImmutableNodes,
  LabelInformation,
  LabelInformationBuilders,
  NodeImporterBuilder,
  Nodes,
  NodePropertiesFromStoreBuilder
} from '@/core/loading';
import {
  HugeAtomicBitSet,
  HugeAtomicGrowingBitSet
} from '@/core/utils/paged';
import { GdsValue } from '@/values';
import { NodeLabelTokens, NodeLabelToken } from './NodeLabelTokens';
import { NodesBuilderContext } from './NodesBuilderContext';
import { LocalNodesBuilder } from './LocalNodesBuilder';
import { LocalNodesBuilderProvider } from './LocalNodesBuilderProvider';
import { PropertyValues } from './PropertyValues';
import { NodeLabelTokenToPropertyKeys } from './NodeLabelTokenToPropertyKeys';

/**
 * Core orchestrator for concurrent node construction.
 * Manages threading, deduplication, label handling, and property building.
 */
export class NodesBuilder {
  static readonly NO_PROPERTY = -1;
  static readonly UNKNOWN_MAX_ID = -1;

  private readonly maxOriginalId: number;
  private readonly concurrency: Concurrency;
  private readonly idMapBuilder: IdMapBuilder;
  private readonly propertyStates: (propertyKey: string) => PropertyState;
  private readonly labelInformationBuilder: LabelInformation.Builder;
  private readonly importedNodes: LongAdder;
  private readonly localNodesBuilderProvider: LocalNodesBuilderProvider;
  private readonly nodesBuilderContext: NodesBuilderContext;

  constructor(config: NodesBuilderConfig) {
    const {
      maxOriginalId,
      maxIntermediateId,
      concurrency,
      context,
      idMapBuilder,
      hasLabelInformation,
      hasProperties,
      deduplicateIds,
      usePooledBuilderProvider,
      propertyStateFunction
    } = config;

    this.maxOriginalId = maxOriginalId;
    this.concurrency = concurrency;
    this.nodesBuilderContext = context;
    this.idMapBuilder = idMapBuilder;
    this.propertyStates = propertyStateFunction;

    // Setup label information builder
    this.labelInformationBuilder = !hasLabelInformation
      ? LabelInformationBuilders.allNodes()
      : LabelInformationBuilders.multiLabelWithCapacity(maxIntermediateId + 1);

    this.importedNodes = new LongAdder();

    // Create node importer
    const nodeImporter = new NodeImporterBuilder()
      .idMapBuilder(idMapBuilder)
      .labelInformationBuilder(this.labelInformationBuilder)
      .importProperties(hasProperties)
      .build();

    // Setup deduplication predicate
    const seenNodeIdPredicate = this.createSeenNodesPredicate(deduplicateIds, maxOriginalId);

    // Create local builder supplier
    const nodesBuilderSupplier = (): LocalNodesBuilder => new LocalNodesBuilder({
      importedNodes: this.importedNodes,
      nodeImporter,
      seenNodeIdPredicate,
      hasLabelInformation,
      hasProperties,
      threadLocalContext: this.nodesBuilderContext.threadLocalContext()
    });

    // Setup provider (pooled vs thread-local)
    this.localNodesBuilderProvider = usePooledBuilderProvider
      ? LocalNodesBuilderProvider.pooled(nodesBuilderSupplier, concurrency)
      : LocalNodesBuilderProvider.threadLocal(nodesBuilderSupplier);
  }

  /**
   * Create predicate for tracking seen node IDs (deduplication).
   */
  private createSeenNodesPredicate(
    deduplicateIds: boolean,
    maxOriginalId: number
  ): LongPredicate {
    if (!deduplicateIds) {
      return (nodeId: number) => false; // Never seen
    }

    if (maxOriginalId === NodesBuilder.UNKNOWN_MAX_ID) {
      const seenIds = HugeAtomicGrowingBitSet.create(0);
      return (nodeId: number) => seenIds.getAndSet(nodeId);
    } else {
      const seenIds = HugeAtomicBitSet.create(maxOriginalId + 1);
      return (nodeId: number) => seenIds.getAndSet(nodeId);
    }
  }

  /**
   * Add a node with only an ID (no labels, no properties).
   */
  addNode(originalId: number): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.empty());
  }

  /**
   * Add a node with ID and label token.
   */
  addNodeWithLabels(originalId: number, nodeLabels: NodeLabelToken): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      slot.get().addNode(originalId, nodeLabels);
    } finally {
      slot.release();
    }
  }

  /**
   * Add a node with ID and NodeLabel array.
   */
  addNodeWithNodeLabels(originalId: number, ...nodeLabels: NodeLabel[]): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.ofNodeLabels(...nodeLabels));
  }

  /**
   * Add a node with ID and single NodeLabel.
   */
  addNodeWithLabel(originalId: number, nodeLabel: NodeLabel): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.ofNodeLabel(nodeLabel));
  }

  /**
   * Add a node with ID and properties (no labels).
   */
  addNodeWithProperties(originalId: number, properties: Map<string, GdsValue>): void {
    this.addNodeWithPropertiesAndLabels(originalId, properties, NodeLabelTokens.empty());
  }

  /**
   * Add a node with ID, properties, and label token.
   */
  addNodeWithPropertiesAndLabels(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabels: NodeLabelToken
  ): void {
    this.addNodeComplete(originalId, nodeLabels, PropertyValues.of(properties));
  }

  /**
   * Add a node with ID, properties, and NodeLabel array.
   */
  addNodeWithPropertiesAndNodeLabels(
    originalId: number,
    properties: Map<string, GdsValue>,
    ...nodeLabels: NodeLabel[]
  ): void {
    this.addNodeWithPropertiesAndLabels(originalId, properties, NodeLabelTokens.ofNodeLabels(...nodeLabels));
  }

  /**
   * Add a node with ID, properties, and single NodeLabel.
   */
  addNodeWithPropertiesAndLabel(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabel: NodeLabel
  ): void {
    this.addNodeWithPropertiesAndLabels(originalId, properties, NodeLabelTokens.ofNodeLabel(nodeLabel));
  }

  /**
   * Add a node with all components (complete API).
   */
  addNodeComplete(originalId: number, nodeLabels: NodeLabelToken, properties: PropertyValues): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      slot.get().addNode(originalId, nodeLabels, properties);
    } finally {
      slot.release();
    }
  }

  /**
   * Get the current count of imported nodes.
   */
  importedNodes(): number {
    return this.importedNodes.sum();
  }

  /**
   * Build the final Nodes structure using the max original ID.
   */
  build(): Nodes {
    return this.buildWithHighestId(this.maxOriginalId);
  }

  /**
   * Build the final Nodes structure with specified highest Neo4j ID.
   */
  buildWithHighestId(highestNeoId: number): Nodes {
    // Flush remaining buffer contents
    this.localNodesBuilderProvider.close();

    const idMap = this.idMapBuilder.build(this.labelInformationBuilder, highestNeoId, this.concurrency);
    const nodeProperties = this.buildProperties(idMap);
    const nodeSchema = this.buildNodeSchema(idMap, nodeProperties);
    const nodePropertyStore = NodePropertyStore.builder().properties(nodeProperties).build();

    return new ImmutableNodes({
      schema: nodeSchema,
      idMap,
      properties: nodePropertyStore
    });
  }

  /**
   * Build the node schema from imported data.
   */
  private buildNodeSchema(
    idMap: IdMap,
    nodeProperties: Map<string, NodeProperty>
  ): MutableNodeSchema {
    const localLabelTokenToPropertyKeys = this.nodesBuilderContext.nodeLabelTokenToPropertyKeys();

    // Collect property schemas from imported property values
    const propertyKeysToSchema = new Map<string, PropertySchema>();
    for (const [key, property] of nodeProperties) {
      propertyKeysToSchema.set(key, property.propertySchema());
    }

    // Union the label to property key mappings from each import thread
    const globalLabelTokenToPropertyKeys = localLabelTokenToPropertyKeys.reduce(
      (left, right) => NodeLabelTokenToPropertyKeys.union(left, right, propertyKeysToSchema),
      NodeLabelTokenToPropertyKeys.lazy()
    );

    // Collect node labels without properties from the id map
    const nodeLabels = new Set(idMap.availableNodeLabels());

    // Add labels that actually have node properties attached
    for (const localMapping of localLabelTokenToPropertyKeys) {
      for (const label of localMapping.nodeLabels()) {
        nodeLabels.add(label);
      }
    }

    // Use all labels and the global label to property key mapping to construct final schema
    let unionSchema = MutableNodeSchema.empty();
    for (const nodeLabel of nodeLabels) {
      unionSchema = unionSchema.addLabel(
        nodeLabel,
        globalLabelTokenToPropertyKeys.propertySchemas(nodeLabel, propertyKeysToSchema)
      );
    }

    return unionSchema;
  }

  /**
   * Build node properties from the context's property builders.
   */
  private buildProperties(idMap: IdMap): Map<string, NodeProperty> {
    const result = new Map<string, NodeProperty>();

    for (const [key, builder] of this.nodesBuilderContext.nodePropertyBuilders()) {
      const nodeProperty = this.entryToNodeProperty(key, builder, this.propertyStates(key), idMap);
      result.set(key, nodeProperty);
    }

    return result;
  }

  /**
   * Convert a property builder entry to a NodeProperty.
   */
  private entryToNodeProperty(
    propertyKey: string,
    builder: NodePropertiesFromStoreBuilder,
    propertyState: PropertyState,
    idMap: IdMap
  ): NodeProperty {
    const nodePropertyValues = builder.build(idMap);
    const valueType = nodePropertyValues.valueType();

    return new ImmutableNodeProperty({
      values: nodePropertyValues,
      propertySchema: PropertySchema.of(propertyKey, valueType, valueType.fallbackValue(), propertyState)
    });
  }

  /**
   * Close the builder and propagate any exception.
   */
  close(exception: Error): never {
    this.localNodesBuilderProvider.close();
    throw exception;
  }
}

/**
 * Configuration interface for NodesBuilder.
 */
export interface NodesBuilderConfig {
  maxOriginalId: number;
  maxIntermediateId: number;
  concurrency: Concurrency;
  context: NodesBuilderContext;
  idMapBuilder: IdMapBuilder;
  hasLabelInformation: boolean;
  hasProperties: boolean;
  deduplicateIds: boolean;
  usePooledBuilderProvider: boolean;
  propertyStateFunction: (propertyKey: string) => PropertyState;
}

/**
 * Thread-safe atomic long adder for counting.
 */
export class LongAdder {
  private value = 0;
  private readonly mutex = new Mutex();

  add(delta: number): void {
    this.mutex.runExclusive(() => {
      this.value += delta;
    });
  }

  increment(): void {
    this.add(1);
  }

  sum(): number {
    return this.value;
  }

  reset(): void {
    this.mutex.runExclusive(() => {
      this.value = 0;
    });
  }
}

/**
 * Simple mutex implementation for TypeScript.
 */
class Mutex {
  private locked = false;
  private readonly waitingResolvers: Array<() => void> = [];

  async runExclusive<T>(callback: () => T | Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await callback();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitingResolvers.push(resolve);
      }
    });
  }

  private release(): void {
    if (this.waitingResolvers.length > 0) {
      const resolve = this.waitingResolvers.shift()!;
      resolve();
    } else {
      this.locked = false;
    }
  }
}

/**
 * Long predicate type for node ID checking.
 */
export type LongPredicate = (value: number) => boolean;
