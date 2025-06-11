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

import { NodeLabel } from "@/projection";
import { ValueType } from "@/api";
import { IdMap } from "@/api";
import { PropertyState } from "@/api";
import { ImmutableNodes } from "@/core/loading";
import { ImmutableNodeProperty } from "@/api/properties";
import { NodeProperty } from "@/api/properties";
import { NodePropertyStore } from "@/api/properties";
import { MutableNodeSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { Concurrency } from "@/concurrency";
import { IdMapBuilder } from "@/core/loading";
import { LabelInformation } from "@/core/loading";
import { LabelInformationBuilders } from "@/core/loading";
import { NodeImporter } from "@/core/loading";
import { Nodes } from "@/core/loading";
import { NodePropertiesFromStoreBuilder } from "@/core/loading";
import { HugeAtomicBitSet } from "@/core/utils/paged";
import { HugeAtomicGrowingBitSet } from "@/core/utils/paged";
import { GdsValue } from "@/values";
import { NodeLabelToken } from "./NodeLabelToken";
import { NodeLabelTokens } from "./NodeLabelTokens";
import { NodesBuilderContext } from "./NodesBuilderContext";
import { LocalNodesBuilder } from "./LocalNodesBuilder";
import { LocalNodesBuilderProvider } from "./LocalNodesBuilderProvider";
import { PropertyValues } from "./PropertyValues";
import { NodeLabelTokenToPropertyKeys } from "./NodeLabelTokenToPropertyKeys";
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
  private readonly labelInformationBuilder: LabelInformation;
  private readonly _importedNodes: LongAdder;
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
      propertyStateFunction,
    } = config;

    this.maxOriginalId = maxOriginalId;
    this.concurrency = concurrency;
    this.nodesBuilderContext = context;
    this.idMapBuilder = idMapBuilder;
    this.propertyStates = propertyStateFunction;

    // Label information strategy: all-nodes vs multi-label
    this.labelInformationBuilder = !hasLabelInformation
      ? LabelInformationBuilders.allNodes() // Simple: all nodes have same treatment
      : LabelInformationBuilders.multiLabelWithCapacity(maxIntermediateId + 1); // Complex: track per-label

    this._importedNodes = new LongAdder();

    // Create the node importer that does the actual work
    const nodeImporter = new NodeImporterBuilder()
      .idMapBuilder(idMapBuilder)
      .labelInformationBuilder(this.labelInformationBuilder)
      .importProperties(hasProperties)
      .build();

    // Deduplication strategy: bitset or no-op predicate
    const seenNodeIdPredicate = this.createSeenNodesPredicate(
      deduplicateIds,
      maxOriginalId
    );

    // LocalNodesBuilder factory for thread-local instances
    const nodesBuilderSupplier = (): LocalNodesBuilder =>
      new LocalNodesBuilder({
        importedNodes: this._importedNodes,
        nodeImporter,
        seenNodeIdPredicate,
        hasLabelInformation,
        hasProperties,
        threadLocalContext: this.nodesBuilderContext.threadLocalContext(),
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
   * Add a node with ID and labels.
   *
   * OVERLOADS:
   * - addNode(id): Node with no labels
   * - addNode(id, labelToken): Node with pre-built label token
   * - addNode(id, label): Node with single NodeLabel
   * - addNode(id, ...labels): Node with multiple NodeLabels
   *
   * CORE METHOD: All variants use the same thread-safe acquire/release pattern
   * THREAD SAFETY: Acquires LocalNodesBuilder from pool/thread-local
   */
  addNode(originalId: number): void;
  addNode(originalId: number, nodeLabels: NodeLabelToken): void;
  addNode(originalId: number, nodeLabel: NodeLabel): void;
  addNode(originalId: number, ...nodeLabels: NodeLabel[]): void;
  addNode(
    originalId: number,
    nodeLabelsOrToken?: NodeLabelToken | NodeLabel | NodeLabel[]
  ): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      // Determine the label token based on input type
      let labelToken: NodeLabelToken;

      if (!nodeLabelsOrToken) {
        // addNode(originalId: number): void - no labels
        labelToken = NodeLabelTokens.empty();
      } else if (nodeLabelsOrToken instanceof NodeLabelToken) {
        // addNode(originalId: number, nodeLabels: NodeLabelToken): void - pre-built token
        labelToken = nodeLabelsOrToken;
      } else if (Array.isArray(nodeLabelsOrToken)) {
        // addNode(originalId: number, ...nodeLabels: NodeLabel[]): void - multiple labels
        labelToken = NodeLabelTokens.ofNodeLabels(...nodeLabelsOrToken);
      } else {
        // addNode(originalId: number, nodeLabel: NodeLabel): void - single label
        labelToken = NodeLabelTokens.ofNodeLabels(nodeLabelsOrToken);
      }

      slot.get().addNode(originalId, labelToken);
    } finally {
      slot.release(); // Always release for pooled providers
    }
  }
  /**
   * Add a node with ID, properties, and optional labels.
   *
   * OVERLOADS:
   * - addNodeWithProperties(id, props): Node with properties, no labels
   * - addNodeWithProperties(id, props, labelToken): Node with properties and pre-built token
   * - addNodeWithProperties(id, props, label): Node with properties and single label
   * - addNodeWithProperties(id, props, ...labels): Node with properties and multiple labels
   */
  addNodeWithProperties(
    originalId: number,
    properties: Map<string, GdsValue>
  ): void;
  addNodeWithProperties(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabels: NodeLabelToken
  ): void;
  addNodeWithProperties(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabel: NodeLabel
  ): void;
  addNodeWithProperties(
    originalId: number,
    properties: Map<string, GdsValue>,
    ...nodeLabels: NodeLabel[]
  ): void;
  addNodeWithProperties(
    originalId: number,
    properties: Map<string, GdsValue>,
    nodeLabelsOrToken?: NodeLabelToken | NodeLabel | NodeLabel[]
  ): void {
    const slot = this.localNodesBuilderProvider.acquire();
    try {
      // Same label token logic as above
      let labelToken: NodeLabelToken;

      if (!nodeLabelsOrToken) {
        labelToken = NodeLabelTokens.empty();
      } else if (nodeLabelsOrToken instanceof NodeLabelToken) {
        labelToken = nodeLabelsOrToken;
      } else if (Array.isArray(nodeLabelsOrToken)) {
        labelToken = NodeLabelTokens.ofNodeLabels(...nodeLabelsOrToken);
      } else {
        labelToken = NodeLabelTokens.ofNodeLabels(nodeLabelsOrToken);
      }

      slot.get().addNode(originalId, labelToken, PropertyValues.of(properties));
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
    return this._importedNodes.sum();
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
    const idMap = this.idMapBuilder.build(
      this.labelInformationBuilder,
      highestNeoId,
      this.concurrency
    );

    // Step 3: Build properties from all thread-local property builders
    const nodeProperties = this.buildProperties(idMap);

    // Step 4: Build schema by combining labels and property information
    const nodeSchema = this.buildNodeSchema(idMap, nodeProperties);

    // Step 5: Create property store
    const nodePropertyStore = NodePropertyStore.builder()
      .properties(nodeProperties)
      .build();

    // Step 6: Assemble final immutable structure
    return new ImmutableNodes({
      schema: nodeSchema,
      idMap,
      properties: nodePropertyStore,
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
    const localLabelTokenToPropertyKeys =
      this.nodesBuilderContext.nodeLabelTokenToPropertyKeys();

    // Collect property schemas from imported property values
    const propertyKeysToSchema = new Map<string, PropertySchema>();
    for (const [key, property] of nodeProperties) {
      propertyKeysToSchema.set(key, property.propertySchema());
    }

    // Union the label-to-property mappings from each import thread
    const globalLabelTokenToPropertyKeys = localLabelTokenToPropertyKeys.reduce(
      (left, right) =>
        NodeLabelTokenToPropertyKeys.union(left, right, propertyKeysToSchema),
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
        globalLabelTokenToPropertyKeys.propertySchemas(
          nodeLabel,
          propertyKeysToSchema
        )
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

    for (const [
      key,
      builder,
    ] of this.nodesBuilderContext.nodePropertyBuilders()) {
      const nodeProperty = this.entryToNodeProperty(
        key,
        builder,
        this.propertyStates(key),
        idMap
      );
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
      propertySchema: PropertySchema.of(
        propertyKey,
        valueType,
        ValueType.fallbackValue(valueType),
        propertyState
      ),
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
