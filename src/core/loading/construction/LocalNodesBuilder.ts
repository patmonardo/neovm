import { ParallelUtil } from '@/core/concurrency';
import { RawValues } from '@/core/utils';
import {
  NodeImporter,
  NodeLabelTokenSet,
  NodesBatchBuffer,
  NodesBatchBufferBuilder
} from '@/core/loading';
import { NodeLabelToken } from './NodeLabelToken';
import { PropertyValues } from './PropertyValues';
import { ThreadLocalContext } from './NodesBuilderContext';

/**
 * Thread-local worker for processing and importing nodes.
 * Handles batching, property storage, and coordination with the underlying import infrastructure.
 */
export class LocalNodesBuilder implements AutoCloseable {
  static readonly NO_PROPERTY = -1;

  private readonly importedNodes: LongAdder;
  private readonly seenNodeIdPredicate: (id: number) => boolean;
  private readonly buffer: NodesBatchBuffer<number>;
  private readonly nodeImporter: NodeImporter;
  private readonly batchNodeProperties: PropertyValues[];
  private readonly threadLocalContext: ThreadLocalContext;

  constructor(
    importedNodes: LongAdder,
    nodeImporter: NodeImporter,
    seenNodeIdPredicate: (id: number) => boolean,
    hasLabelInformation: boolean,
    hasProperties: boolean,
    threadLocalContext: ThreadLocalContext
  ) {
    this.importedNodes = importedNodes;
    this.seenNodeIdPredicate = seenNodeIdPredicate;
    this.threadLocalContext = threadLocalContext;

    this.buffer = new NodesBatchBufferBuilder<number>()
      .capacity(ParallelUtil.DEFAULT_BATCH_SIZE)
      .hasLabelInformation(hasLabelInformation)
      .readProperty(hasProperties)
      .propertyReferenceClass(Number)
      .build();

    this.nodeImporter = nodeImporter;
    this.batchNodeProperties = new Array(this.buffer.capacity());
  }

  /**
   * Add a node without properties.
   */
  addNode(originalId: number, nodeLabelToken: NodeLabelToken): void {
    if (!this.seenNodeIdPredicate(originalId)) {
      const threadLocalTokens = this.threadLocalContext.addNodeLabelToken(nodeLabelToken);

      this.buffer.add(originalId, LocalNodesBuilder.NO_PROPERTY, threadLocalTokens);
      if (this.buffer.isFull()) {
        this.flushBuffer();
        this.reset();
      }
    }
  }

  /**
   * Add a node with properties.
   */
  addNodeWithProperties(originalId: number, nodeLabelToken: NodeLabelToken, properties: PropertyValues): void {
    if (!this.seenNodeIdPredicate(originalId)) {
      const threadLocalTokens = this.threadLocalContext.addNodeLabelTokenAndPropertyKeys(
        nodeLabelToken,
        properties.propertyKeys()
      );

      const propertyReference = this.batchNodeProperties.length;
      this.batchNodeProperties.push(properties);

      this.buffer.add(originalId, propertyReference, threadLocalTokens);
      if (this.buffer.isFull()) {
        this.flushBuffer();
        this.reset();
      }
    }
  }

  /**
   * Reset the buffer and property storage for the next batch.
   */
  private reset(): void {
    this.buffer.reset();
    this.batchNodeProperties.length = 0; // Clear array efficiently
  }

  /**
   * Flush the current buffer to the node importer.
   */
  private flushBuffer(): void {
    const importedNodesAndProperties = this.nodeImporter.importNodes(
      this.buffer,
      this.threadLocalContext.threadLocalTokenToNodeLabels(),
      (nodeReference: number, labelTokens: NodeLabelTokenSet, propertyValueIndex: number) =>
        this.importProperties(nodeReference, labelTokens, propertyValueIndex)
    );

    const importedNodeCount = RawValues.getHead(importedNodesAndProperties);
    this.importedNodes.add(importedNodeCount);
  }

  /**
   * Import properties for a specific node.
   */
  private importProperties(nodeReference: number, labelTokens: NodeLabelTokenSet, propertyValueIndex: number): number {
    if (propertyValueIndex !== LocalNodesBuilder.NO_PROPERTY) {
      const properties = this.batchNodeProperties[propertyValueIndex];

      properties.forEach((propertyKey, propertyValue) => {
        const nodePropertyBuilder = this.threadLocalContext.nodePropertyBuilder(propertyKey);
        if (!nodePropertyBuilder) {
          throw new Error(`Observed property key '${propertyKey}' that is not present in schema`);
        }
        nodePropertyBuilder.set(nodeReference, propertyValue);
      });

      return properties.size();
    }
    return 0;
  }

  /**
   * Get the current batch size.
   */
  currentBatchSize(): number {
    return this.buffer.size();
  }

  /**
   * Get the total capacity of the buffer.
   */
  capacity(): number {
    return this.buffer.capacity();
  }

  /**
   * Check if the buffer is full.
   */
  isFull(): boolean {
    return this.buffer.isFull();
  }

  /**
   * Get the number of properties in the current batch.
   */
  currentPropertyCount(): number {
    return this.batchNodeProperties.length;
  }

  /**
   * Force flush the buffer even if not full.
   */
  forceFlush(): void {
    if (this.buffer.size() > 0) {
      this.flushBuffer();
      this.reset();
    }
  }

  /**
   * Get statistics about this builder's activity.
   */
  getStats(): LocalBuilderStats {
    return {
      totalImportedNodes: this.importedNodes.sum(),
      currentBatchSize: this.currentBatchSize(),
      currentPropertyCount: this.currentPropertyCount(),
      capacity: this.capacity(),
      bufferUtilization: this.currentBatchSize() / this.capacity()
    };
  }

  /**
   * Close the builder and flush any remaining data.
   */
  close(): void {
    this.forceFlush();
  }

  /**
   * AutoCloseable implementation for use with try-with-resources pattern.
   */
  [Symbol.dispose](): void {
    this.close();
  }
}

/**
 * Statistics about a LocalNodesBuilder's activity.
 */
export interface LocalBuilderStats {
  totalImportedNodes: number;
  currentBatchSize: number;
  currentPropertyCount: number;
  capacity: number;
  bufferUtilization: number;
}

/**
 * LongAdder implementation for atomic counters.
 */
export class LongAdder {
  private value = 0;

  add(x: number): void {
    this.value += x;
  }

  sum(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }

  increment(): void {
    this.add(1);
  }

  decrement(): void {
    this.add(-1);
  }
}

/**
 * Factory for creating LocalNodesBuilder instances.
 */
export class LocalNodesBuilderFactory {
  /**
   * Create a new LocalNodesBuilder with standard configuration.
   */
  static create(
    nodeImporter: NodeImporter,
    threadLocalContext: ThreadLocalContext,
    options: LocalBuilderOptions = {}
  ): LocalNodesBuilder {
    const {
      importedNodes = new LongAdder(),
      seenNodeIdPredicate = () => false, // Default: no nodes have been seen
      hasLabelInformation = true,
      hasProperties = true
    } = options;

    return new LocalNodesBuilder(
      importedNodes,
      nodeImporter,
      seenNodeIdPredicate,
      hasLabelInformation,
      hasProperties,
      threadLocalContext
    );
  }

  /**
   * Create a LocalNodesBuilder for nodes without properties.
   */
  static createNoProperties(
    nodeImporter: NodeImporter,
    threadLocalContext: ThreadLocalContext,
    options: Partial<LocalBuilderOptions> = {}
  ): LocalNodesBuilder {
    return this.create(nodeImporter, threadLocalContext, {
      ...options,
      hasProperties: false
    });
  }

  /**
   * Create a LocalNodesBuilder for nodes without labels.
   */
  static createNoLabels(
    nodeImporter: NodeImporter,
    threadLocalContext: ThreadLocalContext,
    options: Partial<LocalBuilderOptions> = {}
  ): LocalNodesBuilder {
    return this.create(nodeImporter, threadLocalContext, {
      ...options,
      hasLabelInformation: false
    });
  }

  /**
   * Create a LocalNodesBuilder with deduplication enabled.
   */
  static createWithDeduplication(
    nodeImporter: NodeImporter,
    threadLocalContext: ThreadLocalContext,
    seenNodes: Set<number>,
    options: Partial<LocalBuilderOptions> = {}
  ): LocalNodesBuilder {
    return this.create(nodeImporter, threadLocalContext, {
      ...options,
      seenNodeIdPredicate: (id) => seenNodes.has(id)
    });
  }
}

/**
 * Configuration options for LocalNodesBuilder.
 */
export interface LocalBuilderOptions {
  importedNodes?: LongAdder;
  seenNodeIdPredicate?: (id: number) => boolean;
  hasLabelInformation?: boolean;
  hasProperties?: boolean;
}

/**
 * AutoCloseable interface for TypeScript.
 */
export interface AutoCloseable {
  close(): void;
}
