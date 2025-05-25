import { NodeLabel } from '@/gds';
import { DefaultValue } from '@/api';
import { NodeSchema } from '@/api/schema';
import { Concurrency } from '@/core/concurrency';
import {
  NodeLabelTokenSet,
  NodePropertiesFromStoreBuilder,
  TokenToNodeLabels
} from '@/core/loading';
import { NodeLabelToken } from './NodeLabelToken';
import { NodeLabelTokenToPropertyKeys } from './NodeLabelTokenToPropertyKeys';

/**
 * Context for coordinating concurrent node building operations.
 * Manages thread-local contexts, property builders, and label mappings.
 */
export abstract class NodesBuilderContext {
  private static readonly NO_PROPERTY_VALUE = DefaultValue.DEFAULT;

  // Thread-local mappings that can be computed independently
  private readonly tokenToNodeLabelSupplier: () => TokenToNodeLabels;
  private readonly nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys;

  // Thread-global mapping as all threads need to write to the same property builders
  private readonly threadLocalNodeLabelTokenToPropertyKeys: Set<NodeLabelTokenToPropertyKeys>;

  protected readonly propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>;
  protected readonly concurrency: Concurrency;

  /**
   * Used when no node schema information is available and needs to be inferred from input data.
   */
  static lazy(concurrency: Concurrency): NodesBuilderContext {
    return new LazyNodesBuilderContext(
      () => TokenToNodeLabels.lazy(),
      () => NodeLabelTokenToPropertyKeys.lazy(),
      new Map<string, NodePropertiesFromStoreBuilder>(),
      concurrency
    );
  }

  /**
   * Used when a node schema is available upfront.
   */
  static fixed(nodeSchema: NodeSchema, concurrency: Concurrency): NodesBuilderContext {
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
   */
  nodePropertyBuilders(): Map<string, NodePropertiesFromStoreBuilder> {
    return this.propertyKeyToPropertyBuilder;
  }

  /**
   * Get all thread-local label token to property key mappings.
   */
  nodeLabelTokenToPropertyKeys(): NodeLabelTokenToPropertyKeys[] {
    return Array.from(this.threadLocalNodeLabelTokenToPropertyKeys);
  }

  /**
   * Create a thread-local context for concurrent processing.
   */
  threadLocalContext(): ThreadLocalContext {
    const nodeLabelTokenToPropertyKeys = this.nodeLabelTokenToPropertyKeysSupplier();
    this.threadLocalNodeLabelTokenToPropertyKeys.add(nodeLabelTokenToPropertyKeys);

    return new ThreadLocalContext(
      this.tokenToNodeLabelSupplier(),
      nodeLabelTokenToPropertyKeys,
      (propertyKey: string) => this.getPropertyBuilder(propertyKey)
    );
  }

  /**
   * Get or create a property builder for the given property key.
   */
  abstract getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder;
}

/**
 * Fixed context implementation for predefined schemas.
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

  getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder {
    const builder = this.propertyKeyToPropertyBuilder.get(propertyKey);
    if (!builder) {
      throw new Error(`Property builder not found for key: ${propertyKey}`);
    }
    return builder;
  }
}

/**
 * Lazy context implementation for dynamic schema discovery.
 */
class LazyNodesBuilderContext extends NodesBuilderContext {
  private readonly concurrentPropertyBuilders: Map<string, NodePropertiesFromStoreBuilder>;

  constructor(
    tokenToNodeLabelSupplier: () => TokenToNodeLabels,
    nodeLabelTokenToPropertyKeysSupplier: () => NodeLabelTokenToPropertyKeys,
    propertyKeyToPropertyBuilder: Map<string, NodePropertiesFromStoreBuilder>,
    concurrency: Concurrency
  ) {
    super(tokenToNodeLabelSupplier, nodeLabelTokenToPropertyKeysSupplier, propertyKeyToPropertyBuilder, concurrency);
    // Use the same map for concurrent access
    this.concurrentPropertyBuilders = propertyKeyToPropertyBuilder;
  }

  getPropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder {
    let builder = this.concurrentPropertyBuilders.get(propertyKey);
    if (!builder) {
      // Thread-safe creation using computeIfAbsent pattern
      builder = NodePropertiesFromStoreBuilder.of(
        NodesBuilderContext.NO_PROPERTY_VALUE,
        this.concurrency
      );

      // Check if another thread created it while we were creating ours
      const existing = this.concurrentPropertyBuilders.get(propertyKey);
      if (existing) {
        return existing;
      }

      this.concurrentPropertyBuilders.set(propertyKey, builder);
    }
    return builder;
  }
}

/**
 * Thread-local context for individual worker threads.
 */
export class ThreadLocalContext {
  private readonly tokenToNodeLabels: TokenToNodeLabels;
  private readonly nodeLabelTokenToPropertyKeys: NodeLabelTokenToPropertyKeys;
  private readonly propertyBuilderFn: (propertyKey: string) => NodePropertiesFromStoreBuilder;

  constructor(
    tokenToNodeLabels: TokenToNodeLabels,
    nodeLabelTokenToPropertyKeys: NodeLabelTokenToPropertyKeys,
    propertyBuilderFn: (propertyKey: string) => NodePropertiesFromStoreBuilder
  ) {
    this.tokenToNodeLabels = tokenToNodeLabels;
    this.nodeLabelTokenToPropertyKeys = nodeLabelTokenToPropertyKeys;
    this.propertyBuilderFn = propertyBuilderFn;
  }

  /**
   * Get property builder for the given property key.
   */
  nodePropertyBuilder(propertyKey: string): NodePropertiesFromStoreBuilder {
    return this.propertyBuilderFn(propertyKey);
  }

  /**
   * Get the thread-local token to node labels mapping.
   */
  threadLocalTokenToNodeLabels(): Map<number, NodeLabel[]> {
    return this.tokenToNodeLabels.labelTokenNodeLabelMapping();
  }

  /**
   * Add a node label token and get the corresponding token set.
   */
  addNodeLabelToken(nodeLabelToken: NodeLabelToken): NodeLabelTokenSet {
    return this.getOrCreateLabelTokens(nodeLabelToken);
  }

  /**
   * Add a node label token with associated property keys.
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
   * Get or create label tokens for the given node label token.
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
   * Create token set for nodes with any/all labels.
   */
  private anyLabelArray(): NodeLabelTokenSet {
    const token = this.tokenToNodeLabels.getOrCreateToken(NodeLabel.ALL_NODES);
    return NodeLabelTokenSet.from([token]);
  }
}
