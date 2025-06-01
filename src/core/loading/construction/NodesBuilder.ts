/**
 * NODES BUILDER - CONCURRENT GRAPH CONSTRUCTION ORCHESTRATOR
 *
 * This is the main coordinator for building large node collections with:
 * - CONCURRENT PROCESSING: Multiple threads add nodes simultaneously
 * - DEDUPLICATION: Optional removal of duplicate node IDs
 * - PROPERTY MANAGEMENT: Efficient storage and schema building
 * - LABEL HANDLING: Token-based label management for performance
 * - MEMORY OPTIMIZATION: Pooled or thread-local builder management
 *
 * CONSTRUCTION FLOW:
 * 1. Create NodesBuilder with configuration
 * 2. Call addNode() methods from multiple threads (thread-safe)
 * 3. Builder manages LocalNodesBuilder instances per thread
 * 4. Call build() to assemble final Nodes structure
 *
 * THREAD SAFETY:
 * - NodesBuilder: Thread-safe public API
 * - LocalNodesBuilder: Thread-local, not shared between threads
 * - Provider: Manages safe access to LocalNodesBuilder instances
 * - Context: Shared state with proper synchronization
 */

import { NodeLabel } from '@/projection';
import { IdMap, PropertyState } from '@/api';
import {
  ImmutableNodeProperty,
  NodeProperty,
  NodePropertyStore
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
import { NodeLabelToken } from "./NodeLabelToken";
import { NodeLabelTokens } from "./NodeLabelTokens";
import { NodesBuilderContext } from './NodesBuilderContext';
import { LocalNodesBuilder } from './LocalNodesBuilder';
import { LocalNodesBuilderProvider } from './LocalNodesBuilderProvider';
import { PropertyValues } from './PropertyValues';
import { NodeLabelTokenToPropertyKeys } from './NodeLabelTokenToPropertyKeys';

/**
 * Main orchestrator for concurrent node construction.
 *
 * DESIGN PATTERNS:
 * - Builder Pattern: Accumulates nodes then builds final structure
 * - Provider Pattern: Manages thread-safe access to LocalNodesBuilder
 * - Context Pattern: Shared state and property builders across threads
 * - Factory Pattern: Creates optimized deduplication predicates
 */
export class NodesBuilder {
  /** Sentinel value for properties that don't exist */
  static readonly NO_PROPERTY = -1;

  /** Sentinel value when max ID is unknown */
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

    // Label information strategy: all-nodes vs multi-label
    this.labelInformationBuilder = !hasLabelInformation
      ? LabelInformationBuilders.allNodes()  // Simple: all nodes have same treatment
      : LabelInformationBuilders.multiLabelWithCapacity(maxIntermediateId + 1);  // Complex: track per-label

    this.importedNodes = new LongAdder();

    // Create the node importer that does the actual work
    const nodeImporter = new NodeImporterBuilder()
      .idMapBuilder(idMapBuilder)
      .labelInformationBuilder(this.labelInformationBuilder)
      .importProperties(hasProperties)
      .build();

    // Deduplication strategy: bitset or no-op predicate
    const seenNodeIdPredicate = this.createSeenNodesPredicate(deduplicateIds, maxOriginalId);

    // LocalNodesBuilder factory for thread-local instances
    const nodesBuilderSupplier = (): LocalNodesBuilder => new LocalNodesBuilder({
      importedNodes: this.importedNodes,
      nodeImporter,
      seenNodeIdPredicate,
      hasLabelInformation,
      hasProperties,
      threadLocalContext: this.nodesBuilderContext.threadLocalContext()
    });

    // Provider strategy: pooled (reuse) vs thread-local (isolated)
    this.localNodesBuilderProvider = usePooledBuilderProvider
      ? LocalNodesBuilderProvider.pooled(nodesBuilderSupplier, concurrency)
      : LocalNodesBuilderProvider.threadLocal(nodesBuilderSupplier);
  }

  /**
   * Create deduplication predicate based on strategy and max ID.
   *
   * STRATEGIES:
   * - No deduplication: Always return false (never seen)
   * - Unknown max ID: Growing bitset (dynamic sizing)
   * - Known max ID: Fixed bitset (pre-allocated for efficiency)
   *
   * PERFORMANCE:
   * - BitSet operations are O(1) with excellent cache locality
   * - getAndSet() is atomic for thread safety
   * - Pre-allocated bitsets avoid memory allocation during construction
   */
  private createSeenNodesPredicate(
    deduplicateIds: boolean,
    maxOriginalId: number
  ): LongPredicate {
    if (!deduplicateIds) {
      return (nodeId: number) => false; // Never seen = no deduplication
    }

    if (maxOriginalId === NodesBuilder.UNKNOWN_MAX_ID) {
      // Dynamic sizing for unknown ID range
      const seenIds = HugeAtomicGrowingBitSet.create(0);
      return (nodeId: number) => seenIds.getAndSet(nodeId);
    } else {
      // Pre-allocated for known ID range (more efficient)
      const seenIds = HugeAtomicBitSet.create(maxOriginalId + 1);
      return (nodeId: number) => seenIds.getAndSet(nodeId);
    }
  }

  // =============================================================================
  // PUBLIC API - THREAD-SAFE NODE ADDITION METHODS
  // =============================================================================

  /**
   * Add a node with only an ID (no labels, no properties).
   *
   * USAGE: Basic graph construction where labels/properties added later
   */
  addNode(originalId: number): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.empty());
  }

  /**
   * Add a node with ID and label token.
   *
   * CORE METHOD: All other addNode variants eventually call this
   * THREAD SAFETY: Acquires LocalNodesBuilder from pool/thread-local
   */
  addNodeWithLabels(originalId: number, nodeLabels: NodeLabelToken): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      slot.get().addNode(originalId, nodeLabels);
    } finally {
      slot.release(); // Always release for pooled providers
    }
  }

  /**
   * Add a node with ID and NodeLabel array.
   * CONVENIENCE: Type-safe API for multiple labels
   */
  addNodeWithNodeLabels(originalId: number, ...nodeLabels: NodeLabel[]): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.ofNodeLabels(...nodeLabels));
  }

  /**
   * Add a node with ID and single NodeLabel.
   * CONVENIENCE: Most common case - single label
   */
  addNodeWithLabel(originalId: number, nodeLabel: NodeLabel): void {
    this.addNodeWithLabels(originalId, NodeLabelTokens.ofNodeLabels(nodeLabel));
  }

  /**
   * Add a node with ID and properties (no labels).
   * CONVENIENCE: Property-focused construction
   */
  addNodeWithProperties(originalId: number, properties: Map<string, GdsValue>): void {
    this.addNodeWithPropertiesAndLabels(originalId, properties, NodeLabelTokens.empty());
  }

  /**
   * Add a node with ID, properties, and label token.
   * CORE METHOD: Full property + label specification
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
   * CONVENIENCE: Type-safe multi-label with properties
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
   * CONVENIENCE: Most common case - single label with properties
   */
  addNodeWithPropertiesAndLabel(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabel: NodeLabel
  ): void {
    this.addNodeWithPropertiesAndLabels(originalId, properties, NodeLabelTokens.ofNodeLabels(nodeLabel));
  }

  /**
   * Add a node with all components (complete API).
   *
   * ULTIMATE METHOD: Maximum control over node construction
   * THREAD SAFETY: Same acquire/release pattern as other methods
   */
  addNodeComplete(originalId: number, nodeLabels: NodeLabelToken, properties: PropertyValues): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      slot.get().addNode(originalId, nodeLabels, properties);
    } finally {
      slot.release();
    }
  }

  // =============================================================================
  // BUILD PHASE - ASSEMBLY OF FINAL NODES STRUCTURE
  // =============================================================================

  /**
   * Get the current count of imported nodes.
   * THREAD SAFETY: LongAdder provides atomic read across all threads
   */
  importedNodes(): number {
    return this.importedNodes.sum();
  }

  /**
   * Build the final Nodes structure using the configured max original ID.
   */
  build(): Nodes {
    return this.buildWithHighestId(this.maxOriginalId);
  }

  /**
   * Build the final Nodes structure with specified highest Neo4j ID.
   *
   * ASSEMBLY PROCESS:
   * 1. Flush all LocalNodesBuilder buffers
   * 2. Build IdMap from label information
   * 3. Build node properties from context builders
   * 4. Build node schema from labels and properties
   * 5. Assemble final immutable Nodes structure
   */
  buildWithHighestId(highestNeoId: number): Nodes {
    // Step 1: Flush remaining buffer contents from all threads
    this.localNodesBuilderProvider.close();

    // Step 2: Build the ID mapping from accumulated label information
    const idMap = this.idMapBuilder.build(this.labelInformationBuilder, highestNeoId, this.concurrency);

    // Step 3: Build properties from all thread-local property builders
    const nodeProperties = this.buildProperties(idMap);

    // Step 4: Build schema by combining labels and property information
    const nodeSchema = this.buildNodeSchema(idMap, nodeProperties);

    // Step 5: Create property store
    const nodePropertyStore = NodePropertyStore.builder().properties(nodeProperties).build();

    // Step 6: Assemble final immutable structure
    return new ImmutableNodes({
      schema: nodeSchema,
      idMap,
      properties: nodePropertyStore
    });
  }

  /**
   * Build the node schema from imported data.
   *
   * SCHEMA CONSTRUCTION:
   * 1. Collect property schemas from imported properties
   * 2. Union label-to-property mappings from all threads
   * 3. Collect all node labels (with and without properties)
   * 4. Build final schema with complete label-property relationships
   */
  private buildNodeSchema(
    idMap: IdMap,
    nodeProperties: Map<string, NodeProperty>
  ): MutableNodeSchema {
    // Get label-to-property mappings from all import threads
    const localLabelTokenToPropertyKeys = this.nodesBuilderContext.nodeLabelTokenToPropertyKeys();

    // Collect property schemas from imported property values
    const propertyKeysToSchema = new Map<string, PropertySchema>();
    for (const [key, property] of nodeProperties) {
      propertyKeysToSchema.set(key, property.propertySchema());
    }

    // Union the label-to-property mappings from each import thread
    const globalLabelTokenToPropertyKeys = localLabelTokenToPropertyKeys.reduce(
      (left, right) => NodeLabelTokenToPropertyKeys.union(left, right, propertyKeysToSchema),
      NodeLabelTokenToPropertyKeys.lazy()
    );

    // Collect node labels without properties from the ID map
    const nodeLabels = new Set(idMap.availableNodeLabels());

    // Add labels that actually have node properties attached
    for (const localMapping of localLabelTokenToPropertyKeys) {
      for (const label of localMapping.nodeLabels()) {
        nodeLabels.add(label);
      }
    }

    // Build final schema using all labels and their property mappings
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
   *
   * PROPERTY BUILDING:
   * - Each property key has its own builder accumulated across threads
   * - Builders are converted to final NodeProperty instances
   * - Property state (TRANSIENT, PERSISTENT) is applied
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
   * Used for error handling during construction.
   */
  close(exception: Error): never {
    this.localNodesBuilderProvider.close();
    throw exception;
  }
}

// =============================================================================
// CONFIGURATION AND UTILITY TYPES
// =============================================================================

/**
 * Configuration interface for NodesBuilder construction.
 *
 * Encapsulates all the options needed to configure the concurrent
 * node building process, deduplication, and memory management.
 */
export interface NodesBuilderConfig {
  /** Maximum original node ID (-1 if unknown) */
  maxOriginalId: number;

  /** Maximum intermediate ID for label information sizing */
  maxIntermediateId: number;

  /** Concurrency level for parallel processing */
  concurrency: Concurrency;

  /** Shared context for property building across threads */
  context: NodesBuilderContext;

  /** Builder for the final ID mapping */
  idMapBuilder: IdMapBuilder;

  /** Whether to track label information per node */
  hasLabelInformation: boolean;

  /** Whether nodes have properties to import */
  hasProperties: boolean;

  /** Whether to deduplicate node IDs across imports */
  deduplicateIds: boolean;

  /** Whether to use pooled (true) or thread-local (false) builders */
  usePooledBuilderProvider: boolean;

  /** Function to determine property state (TRANSIENT/PERSISTENT) */
  propertyStateFunction: (propertyKey: string) => PropertyState;
}

/**
 * Thread-safe atomic long adder for counting operations.
 * Provides atomic increment/add operations across multiple threads.
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
 * Provides exclusive access to critical sections.
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
 * Predicate type for checking if a node ID has been seen before.
 * Used for deduplication during concurrent node construction.
 */
export type LongPredicate = (value: number) => boolean;
