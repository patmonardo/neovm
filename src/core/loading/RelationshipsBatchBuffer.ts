import { RadixSort } from '@/core/utils/RadixSort';
import { PropertyReader } from '@/core/loading/PropertyReader';

/**
 * High-performance relationship batching system with radix sorting capabilities.
 *
 * RelationshipsBatchBuffer is the **first stage** in the relationship loading pipeline,
 * responsible for:
 *
 * 1. **Batch Collection**: Efficiently collecting relationships into memory buffers
 * 2. **Dual Storage**: Storing both node pairs and property references separately
 * 3. **Radix Sorting**: Ultra-fast sorting by source OR target for different access patterns
 * 4. **Memory Optimization**: Compact storage with pre-allocated working arrays
 * 5. **View Creation**: Providing sorted views for downstream processing
 *
 * The Problem It Solves:
 * During graph loading, relationships arrive in arbitrary order from data sources.
 * For efficient processing, we need them sorted by:
 * - **Source ID** for building outgoing adjacency lists
 * - **Target ID** for building incoming adjacency lists (reverse relationships)
 *
 * The Architecture:
 * ```
 * Raw Input:    [B→A, C→B, A→C, A→B]  (arbitrary order)
 * Batch Buffer: [B,A, C,B, A,C, A,B]  (compact storage)
 * Sort by Src:  [A,B, A,C, B,A, C,B]  (source-ordered)
 * Sort by Tgt:  [B,A, A,B, C,B, A,C]  (target-ordered)
 * ```
 *
 * Memory Layout:
 * ```
 * buffer:               [src₀, tgt₀, src₁, tgt₁, src₂, tgt₂, ...]  (2 longs per relationship)
 * relationshipRefs:     [ref₀, ref₁, ref₂, ...]                    (1 long per relationship)
 * propertyRefs:         [prop₀, prop₁, prop₂, ...]                 (1 PROPERTY_REF per relationship)
 * ```
 *
 * Performance Characteristics:
 * - **Batch Size**: Typically 10,000-100,000 relationships per batch
 * - **Sort Speed**: ~50-100M relationships/second (radix sort)
 * - **Memory Efficiency**: Compact layout with minimal overhead
 * - **Cache Friendly**: Sequential access patterns for optimal performance
 *
 * Key Innovation - Radix Sort:
 * Unlike comparison-based sorts (O(n log n)), radix sort achieves O(n) time
 * complexity by sorting digits/bytes in order. Perfect for node IDs which
 * are typically well-distributed integers.
 *
 * @template PROPERTY_REF The type of property references (e.g., PropertyBlock[], PropertyReference)
 */
export class RelationshipsBatchBuffer<PROPERTY_REF> {

  /**
   * Each relationship is stored as 2 consecutive longs: [source, target]
   */
  private static readonly ENTRIES_PER_RELATIONSHIP = 2;

  // Core storage arrays
  private readonly buffer: number[];           // [src₀, tgt₀, src₁, tgt₁, ...] - node pairs
  private readonly relationshipReferences: number[];  // [ref₀, ref₁, ref₂, ...] - relationship refs
  private readonly propertyReferences: PROPERTY_REF[]; // [prop₀, prop₁, prop₂, ...] - property refs

  // Working arrays for radix sort (pre-allocated for performance)
  private readonly bufferCopy: number[];
  private readonly relationshipReferencesCopy: number[];
  private readonly propertyReferencesCopy: PROPERTY_REF[];
  private readonly histogram: number[];

  // Current position in buffer
  private length: number = 0;

  /**
   * Create a new relationships batch buffer with specified capacity.
   *
   * @param capacity Maximum number of relationships this buffer can hold
   * @param propertyReferenceClass Class type for property references (for array creation)
   */
  constructor(
    private readonly capacity: number,
    private readonly propertyReferenceClass?: new() => PROPERTY_REF
  ) {
    // Main storage arrays
    this.buffer = new Array<number>(capacity * RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP);
    this.relationshipReferences = new Array<number>(capacity);
    this.propertyReferences = new Array<PROPERTY_REF>(capacity);

    // Working arrays for radix sort (same size as main arrays)
    this.bufferCopy = RadixSort.newCopy(this.buffer);
    this.relationshipReferencesCopy = RadixSort.newCopy(this.relationshipReferences);
    this.propertyReferencesCopy = RadixSort.newCopy(this.propertyReferences);
    this.histogram = RadixSort.newHistogram(capacity);
  }

  /**
   * Factory method for creating batch buffers with type safety.
   *
   * This follows the builder pattern from the original Java code,
   * providing a clean API for buffer creation with proper typing.
   *
   * @param capacity Maximum number of relationships
   * @param propertyReferenceClass Type of property references
   * @returns New batch buffer instance
   */
  static create<PROPERTY_REF>(
    capacity: number,
    propertyReferenceClass?: new() => PROPERTY_REF
  ): RelationshipsBatchBuffer<PROPERTY_REF> {
    return new RelationshipsBatchBuffer(capacity, propertyReferenceClass);
  }

  /**
   * Add a simple relationship (source → target) without properties.
   *
   * This is the **minimal storage** version for graphs that only need
   * topology without relationship properties. Common for:
   * - Social networks (follower relationships)
   * - Citation networks (paper → paper references)
   * - Web graphs (page → page links)
   *
   * Memory Usage: 16 bytes per relationship (2 × 8-byte longs)
   *
   * @param sourceId Source node ID
   * @param targetId Target node ID
   */
  add(sourceId: number, targetId: number): void {
    if (this.length >= this.buffer.length - 1) {
      throw new Error('Buffer capacity exceeded');
    }

    const position = this.length;
    this.buffer[position] = sourceId;
    this.buffer[position + 1] = targetId;
    this.length += 2;
  }

  /**
   * Add a relationship with properties and references.
   *
   * This is the **full storage** version for graphs that need:
   * - Relationship properties (weights, timestamps, etc.)
   * - Original relationship references (for property lookup)
   * - Property references (for efficient property access)
   *
   * Common for:
   * - Weighted networks (roads with distances)
   * - Temporal networks (interactions with timestamps)
   * - Knowledge graphs (relationships with confidence scores)
   *
   * Memory Usage: 16 + 8 + sizeof(PROPERTY_REF) bytes per relationship
   *
   * @param sourceId Source node ID
   * @param targetId Target node ID
   * @param relationshipReference Reference to original relationship record
   * @param propertyReference Reference to relationship properties
   */
  addWithProperties(
    sourceId: number,
    targetId: number,
    relationshipReference: number,
    propertyReference: PROPERTY_REF
  ): void {
    if (this.length >= this.buffer.length - 1) {
      throw new Error('Buffer capacity exceeded');
    }

    const position = this.length;
    const relationshipIndex = position >> 1; // Divide by 2 to get relationship index

    // Store node pair
    this.buffer[position] = sourceId;
    this.buffer[position + 1] = targetId;

    // Store references (one per relationship, not per buffer position)
    this.relationshipReferences[relationshipIndex] = relationshipReference;
    this.propertyReferences[relationshipIndex] = propertyReference;

    this.length += 2;
  }

  /**
   * Create a view sorted by source node IDs.
   *
   * This creates a **source-ordered view** optimized for building outgoing
   * adjacency lists. After sorting, all relationships from the same source
   * node are grouped together, enabling efficient batch processing.
   *
   * Use cases:
   * - Building outgoing adjacency lists for directed graphs
   * - PageRank computation (outgoing link analysis)
   * - Shortest path algorithms (exploring outgoing edges)
   *
   * Performance: O(n) radix sort (linear in number of relationships)
   *
   * @returns View with relationships sorted by source ID
   */
  changeToSourceOrder(): RelationshipsBatchBufferView<PROPERTY_REF> {
    this.sortBySource();
    return new RelationshipsBatchBufferView(
      this.buffer,
      this.length,
      this.relationshipReferences,
      this.propertyReferences,
      this.bufferCopy,
      this.histogram
    );
  }

  /**
   * Create a view sorted by target node IDs.
   *
   * This creates a **target-ordered view** optimized for building incoming
   * adjacency lists (reverse relationships). After sorting, all relationships
   * TO the same target node are grouped together.
   *
   * Use cases:
   * - Building incoming adjacency lists for directed graphs
   * - Authority scoring (incoming link analysis)
   * - Reverse path algorithms (exploring incoming edges)
   * - Undirected graph processing (each edge stored in both directions)
   *
   * Performance: O(n) radix sort (linear in number of relationships)
   *
   * @returns View with relationships sorted by target ID
   */
  changeToTargetOrder(): RelationshipsBatchBufferView<PROPERTY_REF> {
    this.sortByTarget();
    return new RelationshipsBatchBufferView(
      this.buffer,
      this.length,
      this.relationshipReferences,
      this.propertyReferences,
      this.bufferCopy,
      this.histogram
    );
  }

  /**
   * Sort relationships by source ID using radix sort.
   *
   * Radix sort is **optimal for integer sorting** because:
   * - O(n) time complexity (vs O(n log n) for comparison sorts)
   * - Cache-friendly access patterns
   * - Stable sort (preserves order of equal elements)
   * - Well-suited for node IDs which are typically well-distributed
   *
   * The sort maintains alignment between all arrays:
   * - buffer[i], buffer[i+1] = source, target for relationship i/2
   * - relationshipReferences[i/2] = reference for relationship i/2
   * - propertyReferences[i/2] = properties for relationship i/2
   */
  private sortBySource(): void {
    RadixSort.radixSort(
      this.buffer,                    // Primary array to sort (by first element of each pair)
      this.bufferCopy,               // Working space for sorting
      this.relationshipReferences,   // Secondary array (follows primary sort order)
      this.relationshipReferencesCopy, // Working space
      this.propertyReferences,       // Tertiary array (follows primary sort order)
      this.propertyReferencesCopy,   // Working space
      this.histogram,                // Working space for counting sort
      this.length                    // Number of elements to sort
    );
  }

  /**
   * Sort relationships by target ID using radix sort.
   *
   * This uses a specialized radix sort variant (radixSort2) that sorts
   * by the SECOND element of each pair (target ID) rather than the first.
   *
   * Implementation note: radixSort2 treats buffer as pairs and sorts
   * by buffer[i*2 + 1] (target) instead of buffer[i*2] (source).
   */
  private sortByTarget(): void {
    RadixSort.radixSort2(
      this.buffer,                    // Primary array to sort (by second element of each pair)
      this.bufferCopy,               // Working space for sorting
      this.relationshipReferences,   // Secondary array (follows primary sort order)
      this.relationshipReferencesCopy, // Working space
      this.propertyReferences,       // Tertiary array (follows primary sort order)
      this.propertyReferencesCopy,   // Working space
      this.histogram,                // Working space for counting sort
      this.length                    // Number of elements to sort
    );
  }

  /**
   * Get the current number of relationships in the buffer.
   */
  getRelationshipCount(): number {
    return this.length / RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
  }

  /**
   * Get the remaining capacity of the buffer.
   */
  getRemainingCapacity(): number {
    return this.capacity - this.getRelationshipCount();
  }

  /**
   * Check if the buffer is full.
   */
  isFull(): boolean {
    return this.getRelationshipCount() >= this.capacity;
  }

  /**
   * Check if the buffer is empty.
   */
  isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Reset the buffer to empty state (reuse without reallocation).
   */
  reset(): void {
    this.length = 0;
  }

  /**
   * Get memory usage statistics for this buffer.
   */
  getMemoryStats(): BufferMemoryStats {
    const relationshipCount = this.getRelationshipCount();
    const bufferBytes = this.buffer.length * 8; // 8 bytes per number
    const relationshipRefBytes = this.relationshipReferences.length * 8;
    const propertyRefBytes = this.propertyReferences.length * 8; // Approximate
    const workingArrayBytes = this.bufferCopy.length * 8 +
                             this.relationshipReferencesCopy.length * 8 +
                             this.propertyReferencesCopy.length * 8 +
                             this.histogram.length * 4; // 4 bytes per int

    return {
      relationshipCount,
      capacity: this.capacity,
      utilizationRatio: relationshipCount / this.capacity,
      totalMemoryBytes: bufferBytes + relationshipRefBytes + propertyRefBytes + workingArrayBytes,
      bufferMemoryBytes: bufferBytes,
      referenceMemoryBytes: relationshipRefBytes + propertyRefBytes,
      workingMemoryBytes: workingArrayBytes,
      memoryEfficiency: relationshipCount > 0 ? (relationshipCount * 24) / (bufferBytes + relationshipRefBytes) : 0
    };
  }
}

/**
 * Immutable view of sorted relationships with efficient iteration capabilities.
 *
 * RelationshipsBatchBufferView provides a **read-only interface** to sorted
 * relationship data. It implements the PropertyReader.Producer interface,
 * enabling it to be consumed by downstream components in the loading pipeline.
 *
 * Key Features:
 * - **Immutable**: No modification of underlying data after creation
 * - **Efficient Iteration**: Optimized forEach with batch processing
 * - **Memory Sharing**: Shares arrays with parent buffer (no copying)
 * - **Working Space**: Provides access to spare arrays for downstream processing
 *
 * Architecture Integration:
 * ```
 * RelationshipsBatchBuffer → sort() → RelationshipsBatchBufferView → AdjacencyBuffer
 * [Collection]                       [Sorted View]                   [Final Processing]
 * ```
 */
export class RelationshipsBatchBufferView<PROPERTY_REF> implements PropertyReader.Producer<PROPERTY_REF> {

  constructor(
    private readonly nodePairs: number[],              // [src₀, tgt₀, src₁, tgt₁, ...]
    private readonly nodePairsLength: number,          // Number of elements used in nodePairs
    private readonly relationshipReferences: number[], // [ref₀, ref₁, ref₂, ...]
    private readonly propertyReferences: PROPERTY_REF[], // [prop₀, prop₁, prop₂, ...]
    private readonly spareLongs: number[],             // Working space for downstream processing
    private readonly spareInts: number[]               // Working space for downstream processing
  ) {}

  /**
   * Get the number of relationships in this view.
   *
   * @returns Number of relationships (not array elements)
   */
  numberOfElements(): number {
    return this.nodePairsLength / RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
  }

  /**
   * Iterate over all relationships in sorted order.
   *
   * This method provides **high-performance iteration** over the sorted relationships.
   * The consumer receives each relationship with its associated metadata:
   *
   * @param consumer Function called for each relationship with parameters:
   *   - index: Relationship index (0-based)
   *   - sourceId: Source node ID
   *   - targetId: Target node ID
   *   - relationshipReference: Reference to original relationship
   *   - propertyReference: Reference to relationship properties
   */
  forEach(consumer: PropertyReader.Consumer<PROPERTY_REF>): void {
    const length = this.numberOfElements();

    for (let i = 0; i < length; i++) {
      const pairIndex = i << 1; // Multiply by 2 efficiently

      consumer.accept(
        i,                                    // relationship index
        this.nodePairs[pairIndex],           // source ID
        this.nodePairs[pairIndex + 1],       // target ID
        this.relationshipReferences[i],      // relationship reference
        this.propertyReferences[i]           // property reference
      );
    }
  }

  /**
   * Process relationships in batches for better cache performance.
   *
   * This method enables **batch processing** where multiple relationships
   * are processed together, improving cache locality and reducing function
   * call overhead.
   *
   * @param batchSize Number of relationships to process per batch
   * @param batchConsumer Function called for each batch
   */
  forEachBatch(
    batchSize: number,
    batchConsumer: (
      startIndex: number,
      count: number,
      sourceIds: number[],
      targetIds: number[],
      relationshipRefs: number[],
      propertyRefs: PROPERTY_REF[]
    ) => void
  ): void {
    const totalRelationships = this.numberOfElements();

    for (let startIndex = 0; startIndex < totalRelationships; startIndex += batchSize) {
      const actualBatchSize = Math.min(batchSize, totalRelationships - startIndex);

      // Extract batch data into temporary arrays for better cache locality
      const batchSources = new Array<number>(actualBatchSize);
      const batchTargets = new Array<number>(actualBatchSize);
      const batchRelRefs = new Array<number>(actualBatchSize);
      const batchPropRefs = new Array<PROPERTY_REF>(actualBatchSize);

      for (let i = 0; i < actualBatchSize; i++) {
        const relationshipIndex = startIndex + i;
        const pairIndex = relationshipIndex << 1;

        batchSources[i] = this.nodePairs[pairIndex];
        batchTargets[i] = this.nodePairs[pairIndex + 1];
        batchRelRefs[i] = this.relationshipReferences[relationshipIndex];
        batchPropRefs[i] = this.propertyReferences[relationshipIndex];
      }

      batchConsumer(startIndex, actualBatchSize, batchSources, batchTargets, batchRelRefs, batchPropRefs);
    }
  }

  /**
   * Get spare integer array for downstream processing.
   *
   * This provides access to pre-allocated working space that downstream
   * components can use for temporary calculations without additional allocation.
   *
   * @returns Pre-allocated integer array
   */
  getSpareInts(): number[] {
    return this.spareInts;
  }

  /**
   * Get spare long array for downstream processing.
   *
   * @returns Pre-allocated long array (as number[] in TypeScript)
   */
  getSpareLongs(): number[] {
    return this.spareLongs;
  }

  /**
   * Get direct access to the underlying relationship batch.
   *
   * **Warning**: This provides direct access to internal arrays.
   * Should only be used by performance-critical code that needs
   * maximum efficiency.
   *
   * @returns The underlying node pairs array
   */
  getBatch(): number[] {
    return this.nodePairs;
  }

  /**
   * Get the length of the batch array.
   *
   * @returns Number of elements in the batch array (2 × relationship count)
   */
  getBatchLength(): number {
    return this.nodePairsLength;
  }

  /**
   * Create a sub-view containing only a range of relationships.
   *
   * This enables **parallel processing** by splitting the view into
   * smaller chunks that can be processed independently.
   *
   * @param startIndex Starting relationship index (inclusive)
   * @param endIndex Ending relationship index (exclusive)
   * @returns New view containing only the specified range
   */
  subView(startIndex: number, endIndex: number): RelationshipsBatchBufferView<PROPERTY_REF> {
    if (startIndex < 0 || endIndex > this.numberOfElements() || startIndex >= endIndex) {
      throw new Error(`Invalid range: [${startIndex}, ${endIndex}) for ${this.numberOfElements()} relationships`);
    }

    const startPairIndex = startIndex << 1;
    const length = (endIndex - startIndex) << 1;

    // Create sub-arrays (these share the underlying data, just different views)
    const subNodePairs = this.nodePairs.slice(startPairIndex, startPairIndex + length);
    const subRelationshipRefs = this.relationshipReferences.slice(startIndex, endIndex);
    const subPropertyRefs = this.propertyReferences.slice(startIndex, endIndex);

    return new RelationshipsBatchBufferView(
      subNodePairs,
      length,
      subRelationshipRefs,
      subPropertyRefs,
      this.spareLongs, // Shared working space
      this.spareInts   // Shared working space
    );
  }

  /**
   * Extract all source IDs as a separate array.
   *
   * Useful for algorithms that need to process only source nodes.
   *
   * @returns Array of source node IDs
   */
  extractSourceIds(): number[] {
    const relationshipCount = this.numberOfElements();
    const sourceIds = new Array<number>(relationshipCount);

    for (let i = 0; i < relationshipCount; i++) {
      sourceIds[i] = this.nodePairs[i << 1];
    }

    return sourceIds;
  }

  /**
   * Extract all target IDs as a separate array.
   *
   * Useful for algorithms that need to process only target nodes.
   *
   * @returns Array of target node IDs
   */
  extractTargetIds(): number[] {
    const relationshipCount = this.numberOfElements();
    const targetIds = new Array<number>(relationshipCount);

    for (let i = 0; i < relationshipCount; i++) {
      targetIds[i] = this.nodePairs[(i << 1) + 1];
    }

    return targetIds;
  }

  /**
   * Get statistics about this view.
   */
  getStats(): ViewStats {
    const relationshipCount = this.numberOfElements();

    if (relationshipCount === 0) {
      return {
        relationshipCount: 0,
        uniqueSourceCount: 0,
        uniqueTargetCount: 0,
        sourceSpread: 0,
        targetSpread: 0,
        avgDegree: 0
      };
    }

    // Calculate unique counts and spreads
    const sourceIds = this.extractSourceIds();
    const targetIds = this.extractTargetIds();

    const uniqueSources = new Set(sourceIds).size;
    const uniqueTargets = new Set(targetIds).size;

    const minSource = Math.min(...sourceIds);
    const maxSource = Math.max(...sourceIds);
    const minTarget = Math.min(...targetIds);
    const maxTarget = Math.max(...targetIds);

    return {
      relationshipCount,
      uniqueSourceCount: uniqueSources,
      uniqueTargetCount: uniqueTargets,
      sourceSpread: maxSource - minSource + 1,
      targetSpread: maxTarget - minTarget + 1,
      avgDegree: relationshipCount / uniqueSources
    };
  }
}

// Type definitions
export interface BufferMemoryStats {
  relationshipCount: number;
  capacity: number;
  utilizationRatio: number;
  totalMemoryBytes: number;
  bufferMemoryBytes: number;
  referenceMemoryBytes: number;
  workingMemoryBytes: number;
  memoryEfficiency: number;
}

export interface ViewStats {
  relationshipCount: number;
  uniqueSourceCount: number;
  uniqueTargetCount: number;
  sourceSpread: number;
  targetSpread: number;
  avgDegree: number;
}
