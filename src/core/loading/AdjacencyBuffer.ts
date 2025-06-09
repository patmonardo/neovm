// import { RelationshipType } from '@/projection';
// import { AdjacencyCompressorFactory, LongArrayBuffer } from '@/api/compress';
// import { Aggregation } from '@/core';
// import { AdjacencyCompression } from '@/core/compression';
// import { ZigZagLongDecoding } from '@/core/compression';
// import { Concurrency } from '@/concurrency';
// import { MemoryEstimation, MemoryEstimations } from '@/mem';
// import { BitUtil } from '@/mem';
// import { ReentrantLock } from '@/utils';
// import { LongAdder } from '@/utils';
// import { ChunkedAdjacencyLists } from './ChunkedAdjacencyLists';
// import { ImportSizing } from './ImportSizing';
// import { SingleTypeRelationshipImporter } from './SingleTypeRelationshipImporter';
// import { AdjacencyPreAggregation } from './AdjacencyPreAggregation';

// /**
//  * Advanced buffering system for relationship adjacency data during graph import.
//  *
//  * AdjacencyBuffer is the core component responsible for efficiently collecting,
//  * compressing, and organizing relationship data during large-scale graph imports.
//  * It exists exactly once per relationship type and handles the complex process of:
//  *
//  * 1. **Raw Data Collection**: Receives relationship records from import buffers
//  * 2. **Compression**: Compresses raw records into efficient long arrays
//  * 3. **Paging**: Distributes data across pages for parallel processing
//  * 4. **Task Generation**: Creates builder tasks for final adjacency list construction
//  *
//  * Key architectural features:
//  * - **Paged storage**: Distributes relationships across multiple pages for parallelism
//  * - **Chunk-based locking**: Fine-grained synchronization for concurrent writes
//  * - **Adaptive compression**: Uses specialized compressors for different data patterns
//  * - **Property support**: Handles relationship properties with aggregation
//  * - **Memory optimization**: Estimates and manages memory usage efficiently
//  *
//  * Architecture:
//  * ```
//  * Raw Relationships → AdjacencyBuffer → Compressed Pages → Final Adjacency Lists
//  * [src→tgt, props]   [Page 0, 1, 2]     [Compressed]      [Graph Structure]
//  * ```
//  *
//  * Memory Management:
//  * - Automatically estimates memory requirements based on node count and degree
//  * - Uses paged allocation to handle large graphs that exceed memory limits
//  * - Provides configurable page sizes for different workload characteristics
//  */
// export class AdjacencyBuffer {
//   private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory;
//   private readonly chunkLocks: ReentrantLock[];
//   private readonly chunkedAdjacencyLists: ChunkedAdjacencyLists[];
//   private readonly paging: AdjacencyBufferPaging;
//   private readonly relationshipCounter: LongAdder;
//   private readonly propertyKeyIds: number[];
//   private readonly defaultValues: number[];
//   private readonly aggregations: Aggregation[];
//   private readonly atLeastOnePropertyToLoad: boolean;

//   /**
//    * Estimate memory usage for an AdjacencyBuffer based on relationship type characteristics.
//    *
//    * @param relationshipType Type of relationships to estimate for
//    * @param propertyCount Number of properties per relationship
//    * @param undirected Whether relationships are undirected (doubles storage)
//    * @returns Memory estimation function
//    */
//   static memoryEstimation(
//     relationshipType: RelationshipType,
//     propertyCount: number,
//     undirected: boolean
//   ): MemoryEstimation {
//     return MemoryEstimations.setup('AdjacencyBuffer', (dimensions, concurrency) => {
//       const nodeCount = dimensions.nodeCount();
//       const relCountForType = dimensions
//         .relationshipCounts()
//         .get(relationshipType) ?? dimensions.relCountUpperBound();
//       const relCount = undirected ? relCountForType * 2 : relCountForType;
//       const avgDegree = nodeCount > 0 ? BitUtil.ceilDiv(relCount, nodeCount) : 0;

//       return AdjacencyBuffer.memoryEstimationWithMetrics(avgDegree, nodeCount, propertyCount, concurrency);
//     });
//   }

//   /**
//    * Estimate memory usage with specific metrics.
//    *
//    * @param avgDegree Average degree per node
//    * @param nodeCount Total number of nodes
//    * @param propertyCount Number of properties per relationship
//    * @param concurrency Concurrency configuration
//    * @returns Memory estimation
//    */
//   static memoryEstimationWithMetrics(
//     avgDegree: number,
//     nodeCount: number,
//     propertyCount: number,
//     concurrency: Concurrency
//   ): MemoryEstimation {
//     const importSizing = ImportSizing.of(concurrency, nodeCount);
//     const numberOfPages = importSizing.numberOfPages();
//     const pageSize = importSizing.pageSize();

//     return MemoryEstimations
//       .builder('AdjacencyBuffer')
//       .fixed('ChunkedAdjacencyLists pages', numberOfPages * 8) // Object array overhead
//       .add(
//         'ChunkedAdjacencyLists',
//         ChunkedAdjacencyLists.memoryEstimation(avgDegree, pageSize, propertyCount).times(numberOfPages)
//       )
//       .build();
//   }

//   /**
//    * Create a new AdjacencyBuffer with the specified configuration.
//    *
//    * @param importMetaData Metadata about the import (property keys, aggregations, etc.)
//    * @param adjacencyCompressorFactory Factory for creating compressors
//    * @param importSizing Sizing configuration for import pages
//    * @returns New AdjacencyBuffer instance
//    */
//   static of(
//     importMetaData: SingleTypeRelationshipImporter.ImportMetaData,
//     adjacencyCompressorFactory: AdjacencyCompressorFactory,
//     importSizing: ImportSizing
//   ): AdjacencyBuffer {
//     const numPages = importSizing.numberOfPages();
//     const pageSize = importSizing.pageSize();

//     // Create locks and chunked lists for each page
//     const chunkLocks: ReentrantLock[] = new Array(numPages);
//     const compressedAdjacencyLists: ChunkedAdjacencyLists[] = new Array(numPages);

//     for (let page = 0; page < numPages; page++) {
//       compressedAdjacencyLists[page] = ChunkedAdjacencyLists.of(
//         importMetaData.propertyKeyIds().length,
//         pageSize
//       );
//       chunkLocks[page] = new ReentrantLock();
//     }

//     // Determine if we have any properties to load
//     const atLeastOnePropertyToLoad = importMetaData.propertyKeyIds()
//       .some(keyId => keyId !== NO_SUCH_PROPERTY_KEY);

//     // Choose paging strategy based on whether page size is known
//     const paging: AdjacencyBufferPaging = pageSize !== null
//       ? new PagingWithKnownPageSize(pageSize)
//       : new PagingWithUnknownPageSize(numPages);

//     return new AdjacencyBuffer(
//       importMetaData,
//       adjacencyCompressorFactory,
//       chunkLocks,
//       compressedAdjacencyLists,
//       paging,
//       atLeastOnePropertyToLoad
//     );
//   }

//   private constructor(
//     importMetaData: SingleTypeRelationshipImporter.ImportMetaData,
//     adjacencyCompressorFactory: AdjacencyCompressorFactory,
//     chunkLocks: ReentrantLock[],
//     chunkedAdjacencyLists: ChunkedAdjacencyLists[],
//     paging: AdjacencyBufferPaging,
//     atLeastOnePropertyToLoad: boolean
//   ) {
//     this.adjacencyCompressorFactory = adjacencyCompressorFactory;
//     this.chunkLocks = chunkLocks;
//     this.chunkedAdjacencyLists = chunkedAdjacencyLists;
//     this.paging = paging;
//     this.relationshipCounter = adjacencyCompressorFactory.relationshipCounter();
//     this.propertyKeyIds = importMetaData.propertyKeyIds();
//     this.defaultValues = importMetaData.defaultValues();
//     this.aggregations = importMetaData.aggregations();
//     this.atLeastOnePropertyToLoad = atLeastOnePropertyToLoad;
//   }

//   /**
//    * Add a batch of relationships to the buffer.
//    *
//    * This is the core method that receives relationship data from importers and
//    * distributes it across pages with proper synchronization. The method handles:
//    * - Page-based distribution for parallel processing
//    * - Fine-grained locking to minimize contention
//    * - Property aggregation when required
//    * - Efficient batch processing of source-grouped relationships
//    *
//    * @param batch Two-tuple values sorted by source (source, target)
//    * @param targets Slice of batch on second position; all targets in source-sorted order
//    * @param propertyValues Index-synchronized with targets (null if no properties)
//    * @param offsets Offsets into targets; every offset indicates a source node group
//    * @param length Length of offsets array (number of source tuples to import)
//    */
//   addAll(
//     batch: number[],
//     targets: number[],
//     propertyValues: number[][] | null,
//     offsets: number[],
//     length: number
//   ): void {
//     const paging = this.paging;

//     let lock: ReentrantLock | null = null;
//     let lastPageIndex = -1;
//     let endOffset: number;
//     let startOffset = 0;

//     try {
//       for (let i = 0; i < length; i++) {
//         endOffset = offsets[i];

//         // Skip if there are no relationships for this node
//         if (endOffset <= startOffset) {
//           continue;
//         }

//         const source = batch[startOffset << 1]; // Get source from batch[startOffset * 2]
//         const pageIndex = paging.pageId(source);

//         // Switch to the appropriate page lock if needed
//         if (pageIndex !== lastPageIndex) {
//           if (lock !== null) {
//             lock.unlock();
//           }
//           const newLock = this.chunkLocks[pageIndex];
//           newLock.lock();
//           lock = newLock;
//           lastPageIndex = pageIndex;
//         }

//         const localId = paging.localId(source);
//         const compressedTargets = this.chunkedAdjacencyLists[pageIndex];

//         let targetsToImport = endOffset - startOffset;

//         if (propertyValues === null) {
//           // No properties - simple case
//           compressedTargets.add(localId, targets, startOffset, endOffset, targetsToImport);
//         } else {
//           // Handle property aggregation if needed
//           if (this.aggregations[0] !== Aggregation.NONE && targetsToImport > 1) {
//             targetsToImport = AdjacencyPreAggregation.preAggregate(
//               targets,
//               propertyValues,
//               startOffset,
//               endOffset,
//               this.aggregations
//             );
//           }
//           compressedTargets.add(localId, targets, propertyValues, startOffset, endOffset, targetsToImport);
//         }

//         startOffset = endOffset;
//       }
//     } finally {
//       // Always release the lock if we acquired it
//       if (lock !== null && lock.isHeldByCurrentThread()) {
//         lock.unlock();
//       }
//     }
//   }

//   /**
//    * Create builder tasks for constructing the final adjacency lists.
//    *
//    * This method generates a collection of tasks that can be executed in parallel
//    * to build the final compressed adjacency lists from the buffered data.
//    * Each task handles one page of the buffer.
//    *
//    * @param mapper Optional value mapper for node ID transformation
//    * @param drainCountConsumer Optional consumer for relationship count tracking
//    * @returns Collection of tasks for parallel execution
//    */
//   adjacencyListBuilderTasks(
//     mapper?: AdjacencyCompressor.ValueMapper,
//     drainCountConsumer?: (count: number) => void
//   ): AdjacencyListBuilderTask[] {
//     this.adjacencyCompressorFactory.init();

//     const tasks: AdjacencyListBuilderTask[] = [];

//     for (let page = 0; page < this.chunkedAdjacencyLists.length; page++) {
//       tasks.push(new AdjacencyListBuilderTask(
//         page,
//         this.paging,
//         this.adjacencyCompressorFactory,
//         this.chunkedAdjacencyLists[page],
//         this.relationshipCounter,
//         mapper ?? ZigZagLongDecoding.Identity.INSTANCE,
//         drainCountConsumer ?? (() => {})
//       ));
//     }

//     return tasks;
//   }

//   /**
//    * Get the property key IDs for this buffer.
//    */
//   getPropertyKeyIds(): number[] {
//     return this.propertyKeyIds;
//   }

//   /**
//    * Get the default values for properties.
//    */
//   getDefaultValues(): number[] {
//     return this.defaultValues;
//   }

//   /**
//    * Get the aggregation strategies for properties.
//    */
//   getAggregations(): Aggregation[] {
//     return this.aggregations;
//   }

//   /**
//    * Check if this buffer has at least one property to load.
//    */
//   atLeastOnePropertyToLoad(): boolean {
//     return this.atLeastOnePropertyToLoad;
//   }

//   /**
//    * Get statistics about the current state of this buffer.
//    */
//   getStatistics(): AdjacencyBufferStatistics {
//     let totalMemoryBytes = 0;
//     let totalRelationships = 0;

//     for (const chunkedList of this.chunkedAdjacencyLists) {
//       const stats = chunkedList.getStatistics();
//       totalMemoryBytes += stats.memoryUsageBytes;
//       totalRelationships += stats.relationshipCount;
//     }

//     return {
//       pageCount: this.chunkedAdjacencyLists.length,
//       totalRelationships,
//       totalMemoryBytes,
//       propertyCount: this.propertyKeyIds.length,
//       hasProperties: this.atLeastOnePropertyToLoad,
//       averageRelationshipsPerPage: totalRelationships / this.chunkedAdjacencyLists.length
//     };
//   }

//   /**
//    * Estimate the current memory usage of this buffer.
//    */
//   estimateMemoryUsage(): number {
//     let totalBytes = 0;

//     // Memory for locks array
//     totalBytes += this.chunkLocks.length * 64; // Estimated lock overhead

//     // Memory for chunked adjacency lists
//     for (const chunkedList of this.chunkedAdjacencyLists) {
//       totalBytes += chunkedList.estimateMemoryUsage?.() || 0;
//     }

//     // Memory for arrays
//     totalBytes += this.propertyKeyIds.length * 4;
//     totalBytes += this.defaultValues.length * 8;
//     totalBytes += this.aggregations.length * 8;

//     return totalBytes;
//   }
// }

// /**
//  * Task responsible for building adjacency lists from a single page of buffered data.
//  *
//  * This task takes the compressed relationship data from one page and builds the
//  * final adjacency list structures using the configured compressor. It handles:
//  * - Decompression of ZigZag-encoded targets
//  * - Value mapping for node ID transformation
//  * - Property handling and compression
//  * - Relationship counting and statistics
//  */
// export class AdjacencyListBuilderTask implements Runnable {
//   private readonly page: number;
//   private readonly paging: AdjacencyBufferPaging;
//   private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory;
//   private readonly chunkedAdjacencyLists: ChunkedAdjacencyLists;
//   private readonly relationshipCounter: LongAdder;
//   private readonly valueMapper: AdjacencyCompressor.ValueMapper;
//   private readonly drainCountConsumer: (count: number) => void;

//   constructor(
//     page: number,
//     paging: AdjacencyBufferPaging,
//     adjacencyCompressorFactory: AdjacencyCompressorFactory,
//     chunkedAdjacencyLists: ChunkedAdjacencyLists,
//     relationshipCounter: LongAdder,
//     valueMapper: AdjacencyCompressor.ValueMapper,
//     drainCountConsumer: (count: number) => void
//   ) {
//     this.page = page;
//     this.paging = paging;
//     this.adjacencyCompressorFactory = adjacencyCompressorFactory;
//     this.chunkedAdjacencyLists = chunkedAdjacencyLists;
//     this.relationshipCounter = relationshipCounter;
//     this.valueMapper = valueMapper;
//     this.drainCountConsumer = drainCountConsumer;
//   }

//   /**
//    * Execute the adjacency list building for this page.
//    *
//    * This method processes all the chunked adjacency data for this page:
//    * 1. Creates a compressor instance
//    * 2. Iterates through all stored adjacency data
//    * 3. Decompresses ZigZag-encoded targets
//    * 4. Applies value mapping for node ID transformation
//    * 5. Compresses the final adjacency list
//    * 6. Updates relationship counters
//    */
//   async run(): Promise<void> {
//     const compressor = this.adjacencyCompressorFactory.createCompressor();
//     const buffer = new LongArrayBuffer();
//     let importedRelationships = 0;

//     try {
//       this.chunkedAdjacencyLists.consume((
//         localId: number,
//         targets: number[],
//         properties: number[][] | null,
//         compressedByteSize: number,
//         numberOfCompressedTargets: number
//       ) => {
//         // Convert local ID back to global source node ID
//         const sourceNodeId = this.paging.sourceNodeId(localId, this.page);
//         const nodeId = this.valueMapper.map(sourceNodeId);

//         // Decompress the ZigZag-encoded targets
//         AdjacencyCompression.zigZagUncompressFrom(
//           buffer,
//           targets,
//           numberOfCompressedTargets,
//           compressedByteSize,
//           this.valueMapper
//         );

//         // Compress the final adjacency list
//         const compressedCount = compressor.compress(
//           nodeId,
//           buffer.buffer,
//           properties,
//           numberOfCompressedTargets
//         );

//         importedRelationships += compressedCount;
//       });

//       // Update global counters
//       this.relationshipCounter.add(importedRelationships);
//       this.drainCountConsumer(importedRelationships);
//     } finally {
//       compressor.close?.();
//     }
//   }

//   /**
//    * Get statistics about this task.
//    */
//   getTaskStatistics(): AdjacencyListBuilderTaskStatistics {
//     return {
//       page: this.page,
//       estimatedRelationships: this.chunkedAdjacencyLists.estimateRelationshipCount?.() || 0,
//       estimatedMemoryUsage: this.chunkedAdjacencyLists.estimateMemoryUsage?.() || 0
//     };
//   }
// }

// /**
//  * Paging implementation when page size is known at construction time.
//  *
//  * This uses bit shifting for efficient page/offset calculations when
//  * the page size is a power of 2.
//  */
// class PagingWithKnownPageSize implements AdjacencyBufferPaging {
//   private readonly pageShift: number;
//   private readonly pageMask: number;

//   constructor(pageSize: number) {
//     this.pageShift = Math.clz32(pageSize - 1) === Math.clz32(pageSize)
//       ? 32 - Math.clz32(pageSize) - 1  // Power of 2
//       : Math.floor(Math.log2(pageSize)); // Approximate for non-power-of-2
//     this.pageMask = pageSize - 1;
//   }

//   pageId(source: number): number {
//     return Math.floor(source / (1 << this.pageShift));
//   }

//   localId(source: number): number {
//     return source & this.pageMask;
//   }

//   sourceNodeId(localId: number, pageId: number): number {
//     return (pageId << this.pageShift) + localId;
//   }
// }

// /**
//  * Paging implementation when page size is unknown at construction time.
//  *
//  * This uses a hash-based approach to distribute nodes across pages
//  * when the final page size cannot be determined upfront.
//  */
// class PagingWithUnknownPageSize implements AdjacencyBufferPaging {
//   private readonly pageShift: number;
//   private readonly pageMask: number;

//   constructor(numberOfPages: number) {
//     this.pageShift = Math.floor(Math.log2(numberOfPages));
//     this.pageMask = numberOfPages - 1;
//   }

//   pageId(source: number): number {
//     // Use least significant bits for page distribution
//     // TODO: Could shift source by a few bits for better locality
//     return source & this.pageMask;
//   }

//   localId(source: number): number {
//     return source >>> this.pageShift;
//   }

//   sourceNodeId(localId: number, pageId: number): number {
//     return (localId << this.pageShift) + pageId;
//   }
// }

// // Constants
// const NO_SUCH_PROPERTY_KEY = -1;

// // Statistics interfaces
// export interface AdjacencyBufferStatistics {
//   pageCount: number;
//   totalRelationships: number;
//   totalMemoryBytes: number;
//   propertyCount: number;
//   hasProperties: boolean;
//   averageRelationshipsPerPage: number;
// }

// export interface AdjacencyListBuilderTaskStatistics {
//   page: number;
//   estimatedRelationships: number;
//   estimatedMemoryUsage: number;
// }

// // Runnable interface for TypeScript
// export interface Runnable {
//   run(): void | Promise<void>;
// }
