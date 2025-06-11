/**
 * LOCAL NODES BUILDER - THREAD-LOCAL NODE PROCESSING WORKER
 *
 * This is a thread-local worker that efficiently processes nodes in batches.
 * Each import thread gets its own LocalNodesBuilder to avoid contention.
 *
 * CORE RESPONSIBILITIES:
 * 🔄 BATCHING: Accumulates nodes into efficient batch sizes
 * 🚫 DEDUPLICATION: Filters out already-seen node IDs
 * 🏷️  LABEL PROCESSING: Handles node labels and tokens
 * 📦 PROPERTY STORAGE: Manages node properties during import
 * 🚀 BUFFER MANAGEMENT: Auto-flushes when batches are full
 *
 * WORKFLOW:
 * 1. addNode() called with node data
 * 2. Check if node already seen (deduplication)
 * 3. Add to batch buffer with labels/properties
 * 4. Auto-flush when buffer full
 * 5. close() flushes any remaining data
 *
 * THREAD SAFETY:
 * - Each thread has its own LocalNodesBuilder (no sharing)
 * - Thread-safe coordination through ThreadLocalContext
 * - Atomic counter updates for imported node counts
 */

import { ParallelUtil } from "@/concurrency";
import { RawValues } from "@/core/utils";
import { NodeImporter } from "@/core/loading";
import { NodeLabelTokenSet } from "@/core/loading";
import { NodesBatchBuffer } from "@/core/loading";
import { NodeLabelToken } from "./NodeLabelTokens";
import { PropertyValues } from "./PropertyValues";

/**
 * Thread-local worker for efficient node processing and import.
 *
 * DESIGN PATTERNS:
 * - Worker Pattern: Processes work items (nodes) in batches
 * - Buffer Pattern: Accumulates items before expensive operations
 * - Auto-flush Pattern: Triggers processing when thresholds reached
 * - Resource Management: Implements AutoCloseable for cleanup
 */
export class LocalNodesBuilder implements AutoCloseable {
  /** Sentinel indicating no properties for a node */
  static readonly NO_PROPERTY = -1;

  private readonly importedNodes: LongAdder;
  private readonly seenNodeIdPredicate: LongPredicate;
  private readonly buffer: NodesBatchBuffer<number>;
  private readonly nodeImporter: NodeImporter;
  private readonly batchNodeProperties: PropertyValues[];
  private readonly threadLocalContext: NodesBuilderContext.ThreadLocalContext;

  constructor(config: LocalNodesBuilderConfig) {
    const {
      importedNodes,
      nodeImporter,
      seenNodeIdPredicate,
      hasLabelInformation,
      hasProperties,
      threadLocalContext
    } = config;

    this.importedNodes = importedNodes;
    this.seenNodeIdPredicate = seenNodeIdPredicate;
    this.threadLocalContext = threadLocalContext;
    this.nodeImporter = nodeImporter;

    // Create batch buffer with standard batch size
    this.buffer = new NodesBatchBufferBuilder<number>()
      .capacity(ParallelUtil.DEFAULT_BATCH_SIZE)
      .hasLabelInformation(hasLabelInformation)
      .readProperty(hasProperties)
      .propertyReferenceClass(Number)
      .build();

    // Pre-allocate property storage for the batch
    this.batchNodeProperties = new Array(this.buffer.capacity());
  }

  /**
   * Add a node without properties.
   *
   * FAST PATH:
   * - Most common case for simple node import
   * - Only handles ID and labels, no property processing
   * - Automatic deduplication and batching
   *
   * @param originalId Original node ID from input data
   * @param nodeLabelToken Labels for this node
   */
  addNode(originalId: number, nodeLabelToken: NodeLabelToken): void {
    // Skip if already seen (deduplication)
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
   *
   * PROPERTY PATH:
   * - Handles nodes with attached property data
   * - Stores properties in batch array for efficient processing
   * - Updates label-to-property mappings for schema building
   *
   * @param originalId Original node ID from input data
   * @param nodeLabelToken Labels for this node
   * @param properties Property values for this node
   */
  addNode(originalId: number, nodeLabelToken: NodeLabelToken, properties: PropertyValues): void {
    // Skip if already seen (deduplication)
    if (!this.seenNodeIdPredicate(originalId)) {
      // Register label-property associations for schema building
      const threadLocalTokens = this.threadLocalContext.addNodeLabelTokenAndPropertyKeys(
        nodeLabelToken,
        properties.propertyKeys()
      );

      // Store properties in batch array
      const propertyReference = this.batchNodeProperties.length;
      this.batchNodeProperties[propertyReference] = properties;

      this.buffer.add(originalId, propertyReference, threadLocalTokens);

      if (this.buffer.isFull()) {
        this.flushBuffer();
        this.reset();
      }
    }
  }

  /**
   * Reset buffer and property storage for next batch.
   * Called after each flush to prepare for new batch.
   */
  private reset(): void {
    this.buffer.reset();
    this.batchNodeProperties.length = 0; // Efficient array clear
  }

  /**
   * Flush current batch to the node importer.
   *
   * BATCH PROCESSING:
   * - Sends complete batch to underlying importer
   * - Processes all properties for nodes in batch
   * - Updates atomic counter with import results
   * - Efficient bulk operation reduces per-node overhead
   */
  private flushBuffer(): void {
    const importedNodesAndProperties = this.nodeImporter.importNodes(
      this.buffer,
      this.threadLocalContext.threadLocalTokenToNodeLabels(),
      this.importProperties.bind(this)
    );

    const importedNodeCount = RawValues.getHead(importedNodesAndProperties);
    this.importedNodes.add(importedNodeCount);
  }

  /**
   * Import properties for a specific node during batch processing.
   *
   * PROPERTY IMPORT:
   * - Called by NodeImporter for each node with properties
   * - Distributes property values to appropriate builders
   * - Updates thread-local property builders for final assembly
   *
   * @param nodeReference Internal node reference from importer
   * @param labelTokens Label tokens for this node (unused here)
   * @param propertyValueIndex Index into batchNodeProperties array
   * @returns Number of properties processed
   */
  private importProperties(
    nodeReference: number,
    labelTokens: NodeLabelTokenSet,
    propertyValueIndex: number
  ): number {
    if (propertyValueIndex !== LocalNodesBuilder.NO_PROPERTY) {
      const properties = this.batchNodeProperties[propertyValueIndex];

      properties.forEach((propertyKey, propertyValue) => {
        const nodePropertyBuilder = this.threadLocalContext.nodePropertyBuilder(propertyKey);

        if (!nodePropertyBuilder) {
          throw new Error(
            `Observed property key '${propertyKey}' that is not present in schema`
          );
        }

        nodePropertyBuilder.set(nodeReference, propertyValue);
      });

      return properties.size();
    }
    return 0;
  }

  /**
   * Close the builder and flush any remaining data.
   * Essential for ensuring all data is processed.
   */
  close(): void {
    this.flushBuffer();
  }
}

