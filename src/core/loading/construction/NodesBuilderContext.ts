/**
 * NODES BUILDER CONTEXT - CONCURRENT NODE CONSTRUCTION COORDINATION
 *
 * This class coordinates shared state across multiple threads during node construction.
 * It manages the complex relationships between:
 *
 * 🧵 THREAD COORDINATION: Each thread gets its own context for isolated work
 * 🏷️  LABEL TOKENIZATION: Converts NodeLabel objects to integer tokens
 * 📦 PROPERTY BUILDERS: Shared builders that accumulate properties across threads
 * 🗺️  SCHEMA MAPPING: Tracks which properties belong to which labels
 *
 * TWO STRATEGIES:
 *
 * 1. LAZY: Discovers schema from imported data (flexible)
 *    - Creates property builders on-demand as new properties are encountered
 *    - Thread-safe concurrent map ensures only one builder per property key
 *    - Used when schema is unknown or flexible
 *
 * 2. FIXED: Validates against predefined schema (strict)
 *    - Property builders created upfront from known schema
 *    - Throws errors if unexpected properties encountered
 *    - Used when schema is known and must be enforced
 *
 * THREAD COORDINATION PATTERN:
 * 1. Main thread creates NodesBuilderContext (shared state)
 * 2. Each worker thread calls threadLocalContext() (isolated state)
 * 3. Threads add nodes using thread-local context
 * 4. All property data flows to shared builders for final assembly
 *
 * CRITICAL INSIGHT:
 * The context manages TWO types of mappings:
 * - Thread-local: Each thread tracks its own label→property associations
 * - Thread-global: All threads write to the same property value builders
 */

import { NodeLabel } from '@/projection';
import { DefaultValue } from '@/api';
import { NodeSchema } from '@/api/schema';
import { Concurrency } from '@/concurrency';
import {
  NodeLabelTokenSet,
  NodePropertiesFromStoreBuilder,
  TokenToNodeLabels
} from '@/core/loading';
import { NodeLabelToken } from './NodeLabelTokens';
import { NodeLabelTokenToPropertyKeys } from './NodeLabelTokenToPropertyKeys';

/**
 * Abstract base class for coordinating concurrent node building operations.
 *
 * DESIGN PATTERNS:
 * - Strategy Pattern: Lazy vs Fixed implementation strategies
 * - Factory Pattern: Static methods create appropriate strategy
 * - Context Pattern: Manages shared and thread-local state
 * - Supplier Pattern: Deferred creation of expensive objects
 */
export abstract class NodesBuilderContext {
  /** Default value for properties that don't have explicit values */
  private static readonly NO_PROPERTY_VALUE = null; // DefaultValue.of(null);

  // THREAD-LOCAL SUPPLIERS: Each thread gets its own instances
  private readonly tokenToNodeLabelSupplier: () => TokenToNodeLabels;
  private readonly nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys;

  // THREAD-GLOBAL STATE: Shared across all threads
  private readonly threadLocalNodeLabelTokenToPropertyKeys: Set<NodeLabelTokenToPropertyKeys>;
  protected readonly propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>;
  protected readonly concurrency: Concurrency;

  /**
   * Create a LAZY context for schema discovery.
   *
   * WHEN TO USE:
   * - Schema is unknown or flexible
   * - Property keys discovered during import
   * - Different input sources with varying schemas
   *
   * BEHAVIOR:
   * - Creates property builders on-demand
   * - Thread-safe discovery of new property keys
   * - Flexible but requires more runtime coordination
   */
  static lazy(concurrency: Concurrency): NodesBuilderContext {
    return new LazyNodesBuilderContext(
      () => TokenToNodeLabels.lazy(),
      () => NodeLabelTokenToPropertyKeys.lazy(),
      new Map<string, NodePropertiesFromStoreBuilder>(), // Will be populated dynamically
      concurrency
    );
  }

  /**
   * Create a FIXED context for schema validation.
   *
   * WHEN TO USE:
   * - Schema is known upfront
   * - Strict validation required
   * - Performance-critical scenarios (no dynamic discovery)
   *
   * BEHAVIOR:
   * - Pre-creates all property builders from schema
   * - Validates that imported data matches schema
   * - Faster but less flexible
   */
  static fixed(nodeSchema: NodeSchema, concurrency: Concurrency): NodesBuilderContext {
    // Pre-create property builders for all known properties
    const propertyBuildersByPropertyKey = new Map<string, NodePropertiesFromStoreBuilder>();

    for (const [key, propertySchema] of nodeSchema.unionProperties()) {
      propertyBuildersByPropertyKey.set(
        key,
        NodePropertiesFromStoreBuilder.of(propertySchema.defaultValue(), concurrency)
      );
    }

    return new FixedNodesBuilderContext(
      () => TokenToNodeLabels.fixed(nodeSchema.availableLabels()),
      () => NodeLabelTokenToPropertyKeys.fixed(nodeSchema),
      propertyBuildersByPropertyKey,
      concurrency
    );
  }

  protected constructor(
    tokenToNodeLabelSupplier: () => TokenToNodeLabels,
    nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys,
    propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>,
    concurrency: Concurrency
  ) {
    this.tokenToNodeLabelSupplier = tokenToNodeLabelSupplier;
    this.nodeLabelTokenToPropertyKeysSupplier = nodeLabelTokenToPropertyKeysSupplier;
    this.propertyKeyToPropertyBuilder = propertyKeyToPropertyBuilder;
    this.concurrency = concurrency;
    this.threadLocalNodeLabelTokenToPropertyKeys = new Set();
  }

  /**
   * Get all property builders managed by this context.
   *
   * USAGE:
   * - Called during final assembly phase
   * - Each builder contains property values from all threads
   * - Used to create final NodeProperty instances
   */
  nodePropertyBuilders(): Map<string, NodePropertiesFromStoreBuilder> {
    return this.propertyKeyToPropertyBuilder;
  }

  /**
   * Get all thread-local label token to property key mappings.
   *
   * SCHEMA BUILDING:
   * - Each element represents mappings from one thread
   * - Union operation combines all mappings for final schema
   * - Used to determine which labels have which properties
   */
  nodeLabelTokenToPropertyKeys(): NodeLabelTokenToPropertyKeys[] {
    return Array.from(this.threadLocalNodeLabelTokenToPropertyKeys);
  }

  /**
   * Create a thread-local context for concurrent processing.
   *
   * THREAD ISOLATION:
   * - Each thread gets its own TokenToNodeLabels instance
   * - Each thread gets its own NodeLabelTokenToPropertyKeys instance
   * - Shared property builders enable cross-thread coordination
   *
   * LIFECYCLE:
   * - Called once per worker thread at start of processing
   * - Thread-local contexts are independent and safe for concurrent use
   * - Context accumulates thread's contribution to overall schema
   */
  threadLocalContext(): ThreadLocalContext {
    // Create thread-local mapping for this thread
    const nodeLabelTokenToPropertyKeys = this.nodeLabelTokenToPropertyKeysSupplier();

    // Register it with global context for final schema assembly
    this.threadLocalNodeLabelTokenToPropertyKeys.add(nodeLabelTokenToPropertyKeys);

    return new ThreadLocalContext(
      this.tokenToNodeLabelSupplier(),
      nodeLabelTokenToPropertyKeys,
      (propertyKey: string) => this.getPropertyBuilder(propertyKey)
    );
  }

  /**
   * Get or create a property builder for the given property key.
   *
   * STRATEGY-SPECIFIC:
   * - Lazy: Creates builder on-demand with thread-safe coordination
   * - Fixed: Returns pre-created builder or throws error
   */
  abstract getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder | null;
}

/**
 * FIXED STRATEGY IMPLEMENTATION
 *
 * Uses predefined schema to validate imported data.
 * All property builders are created upfront from the schema.
 */
class FixedNodesBuilderContext extends NodesBuilderContext {
  constructor(
    tokenToNodeLabelSupplier: () => TokenToNodeLabels,
    nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys,
    propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>,
    concurrency: Concurrency
  ) {
    super(tokenToNodeLabelSupplier, nodeLabelTokenToPropertyKeysSupplier, propertyKeyToPropertyBuilder, concurrency);
  }

  /**
   * Return pre-created property builder or null if not in schema.
   *
   * STRICT VALIDATION:
   * - Only returns builders for properties defined in schema
   * - Returns null for unknown properties (handled by caller)
   * - No dynamic creation of new property builders
   */
  getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder | null {
    return this.propertyKeyToPropertyBuilder.get(propertyKey) || null;
  }
}

/**
 * LAZY STRATEGY IMPLEMENTATION
 *
 * Discovers schema dynamically by observing imported data.
 * Creates property builders on-demand with thread-safe coordination.
 */
class LazyNodesBuilderContext extends NodesBuilderContext {
  constructor(
    tokenToNodeLabelSupplier: () => TokenToNodeLabels,
    nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys,
    propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>,
    concurrency: Concurrency
  ) {
    super(tokenToNodeLabelSupplier, nodeLabelTokenToPropertyKeysSupplier, propertyKeyToPropertyBuilder, concurrency);
  }

  /**
   * Get existing property builder or create new one thread-safely.
   *
   * THREAD-SAFE CREATION:
   * - Uses JavaScript's Map which is not thread-safe in true concurrent scenarios
   * - In browser: single-threaded, so Map is safe
   * - In Node.js with workers: would need proper synchronization
   *
   * CREATION STRATEGY:
   * - Check if builder already exists
   * - If not, create new builder with default value
   * - Handle race condition where another thread creates it
   */
  getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder {
    let builder = this.propertyKeyToPropertyBuilder.get(propertyKey);

    if (!builder) {
      // Create new builder with default value
      builder = NodePropertiesFromStoreBuilder.of(
        NodesBuilderContext.NO_PROPERTY_VALUE,
        this.concurrency
      );

      // In a truly concurrent environment, we'd need to handle race conditions here
      // For now, simple assignment (JavaScript is single-threaded in browser)
      this.propertyKeyToPropertyBuilder.set(propertyKey, builder);
    }

    return builder;
  }
}

/**
 * THREAD-LOCAL CONTEXT - ISOLATED STATE PER WORKER THREAD
 *
 * Each worker thread gets its own ThreadLocalContext to avoid contention.
 * Provides isolated access to tokenization and property building services.
 *
 * RESPONSIBILITIES:
 * - Convert NodeLabel objects to integer tokens (thread-local)
 * - Track label→property associations (thread-local)
 * - Route property values to shared builders (thread-global)
 * - Maintain consistent token assignments within thread
 */
export class ThreadLocalContext {
  private readonly tokenToNodeLabels: TokenToNodeLabels;
  private readonly nodeLabelTokenToPropertyKeys: NodeLabelTokenToPropertyKeys;
  private readonly propertyBuilderFn: (propertyKey: string) => NodePropertiesFromStoreBuilder | null;

  constructor(
    tokenToNodeLabels: TokenToNodeLabels,
    nodeLabelTokenToPropertyKeys: NodeLabelTokenToPropertyKeys,
    propertyBuilderFn: (propertyKey: string) => NodePropertiesFromStoreBuilder | null
  ) {
    this.tokenToNodeLabels = tokenToNodeLabels;
    this.nodeLabelTokenToPropertyKeys = nodeLabelTokenToPropertyKeys;
    this.propertyBuilderFn = propertyBuilderFn;
  }

  /**
   * Get property builder for the given property key.
   *
   * DELEGATION:
   * - Delegates to the context's strategy (Lazy vs Fixed)
   * - Returns null if property not supported (Fixed strategy)
   * - Always returns builder for new properties (Lazy strategy)
   */
  nodePropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder | null {
    return this.propertyBuilderFn(propertyKey);
  }

  /**
   * Get the thread-local mapping from label tokens to NodeLabel arrays.
   *
   * USAGE:
   * - Used by NodeImporter to resolve tokens back to labels
   * - Each thread maintains its own consistent token→label mapping
   * - Mapping is built incrementally as labels are encountered
   */
  threadLocalTokenToNodeLabels(): Map<number, NodeLabel[]> {
    return this.tokenToNodeLabels.labelTokenNodeLabelMapping();
  }

  /**
   * Add a node label token and get the corresponding token set.
   *
   * TOKENIZATION WORKFLOW:
   * 1. Convert NodeLabelToken to integer token set
   * 2. Register tokens in thread-local mapping
   * 3. Return NodeLabelTokenSet for use in node storage
   *
   * @param nodeLabelToken Labels for this node
   * @returns Token set representing the labels
   */
  addNodeLabelToken(nodeLabelToken: NodeLabelToken): NodeLabelTokenSet {
    return this.getOrCreateLabelTokens(nodeLabelToken);
  }

  /**
   * Add a node label token with associated property keys.
   *
   * SCHEMA DISCOVERY:
   * 1. Convert labels to token set (same as above)
   * 2. Associate property keys with label token for schema building
   * 3. Used during final schema assembly to determine label→property mappings
   *
   * @param nodeLabelToken Labels for this node
   * @param propertyKeys Property keys associated with these labels
   * @returns Token set representing the labels
   */
  addNodeLabelTokenAndPropertyKeys(
    nodeLabelToken: NodeLabelToken,
    propertyKeys: Iterable<string>
  ): NodeLabelTokenSet {
    const tokens = this.getOrCreateLabelTokens(nodeLabelToken);
    this.nodeLabelTokenToPropertyKeys.add(nodeLabelToken, propertyKeys);
    return tokens;
  }

  /**
   * Convert NodeLabelToken to NodeLabelTokenSet with integer tokens.
   *
   * CONVERSION PROCESS:
   * 1. Handle empty tokens (represent ALL_NODES)
   * 2. Convert each NodeLabel to integer token
   * 3. Create NodeLabelTokenSet from integer array
   *
   * TOKEN GENERATION:
   * - Tokens are assigned incrementally by TokenToNodeLabels
   * - Same NodeLabel gets same token within a thread
   * - Different threads may assign different tokens (resolved during assembly)
   */
  private getOrCreateLabelTokens(nodeLabelToken: NodeLabelToken): NodeLabelTokenSet {
    if (nodeLabelToken.isEmpty()) {
      return this.anyLabelArray();
    }

    const labelIds: number[] = [];
    for (let i = 0; i < nodeLabelToken.size(); i++) {
      const labelId = this.tokenToNodeLabels.getOrCreateToken(nodeLabelToken.get(i));
      labelIds.push(labelId);
    }

    return NodeLabelTokenSet.from(labelIds);
  }

  /**
   * Create token set for nodes with ALL_NODES label.
   *
   * SPECIAL CASE:
   * - Empty NodeLabelToken represents nodes that match any label filter
   * - Converted to special ALL_NODES token for consistent handling
   * - Used in algorithms that don't filter by specific labels
   */
  private anyLabelArray(): NodeLabelTokenSet {
    const token = this.tokenToNodeLabels.getOrCreateToken(NodeLabel.ALL_NODES);
    return NodeLabelTokenSet.from([token]);
  }
}
