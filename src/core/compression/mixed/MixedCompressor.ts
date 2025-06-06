// /**
//  * Mixed Compressor - The Synthesis of Graph Compression Dialectics
//  *
//  * **The Middle Way**: Following the ancient path of the Tao Te Ching:
//  * "The wise find pleasure in water; the virtuous find pleasure in hills"
//  * - Low degree nodes find pleasure in VarLong compression (flowing like water)
//  * - High degree nodes find pleasure in packed compression (transcendent like mountains)
//  *
//  * **The Sacred Threshold**: degree > 512 (8 blocks × 64 values per block)
//  * - Below 512: VarLong compression (the classical path)
//  * - Above 512: Packed compression (the transcendent path!)
//  *
//  * **"Intense Research" Methodology**: "we tried a few different values
//  * and this one seemed to work" - The empirical enlightenment! 😂
//  */

// import { AdjacencyCompressor } from '../../api/compress/AdjacencyCompressor';
// import { AdjacencyCompressorFactory } from '../../api/compress/AdjacencyCompressorFactory';
// import { AdjacencyListBuilderFactory } from '../../api/compress/AdjacencyListBuilderFactory';
// import { AdjacencyListsWithProperties } from '../../api/compress/AdjacencyListsWithProperties';
// import { ImmutableAdjacencyListsWithProperties } from '../../api/compress/ImmutableAdjacencyListsWithProperties';
// import { AdjacencyList } from '../../api/AdjacencyList';
// import { AdjacencyProperties } from '../../api/AdjacencyProperties';
// import { PropertyMappings } from '../../PropertyMappings';
// import { Aggregation } from '../../core/Aggregation';
// import { MemoryInfo } from '../MemoryInfo';
// import { ImmutableMemoryInfo } from '../ImmutableMemoryInfo';
// import { MemoryTracker } from '../common/MemoryTracker';
// import { HugeIntArray } from '../../collections/ha/HugeIntArray';
// import { HugeLongArray } from '../../collections/ha/HugeLongArray';
// import { PackedCompressor } from '../packed/PackedCompressor';
// import { DeltaVarLongCompressor } from '../varlong/DeltaVarLongCompressor';
// import { AdjacencyPacking } from '../packed/AdjacencyPacking';
// import { Address } from '../packed/Address';
// import { MixedAdjacencyList } from './MixedAdjacencyList';
// import { MixedAdjacencyProperties } from './MixedAdjacencyProperties';

// export class MixedCompressor implements AdjacencyCompressor {

//   /**
//    * The threshold for when to use packing vs VarLong compression.
//    *
//    * **The Sacred Number**: 512 (8 blocks × 64 values per block)
//    * **Research Methodology**: "intense research ... we tried a few different
//    * values and this one seemed to work" 😂
//    *
//    * **The Wisdom**:
//    * - Below 512: VarLong compression offers good space savings
//    * - Above 512: Packed compression with bit manipulation becomes worth it
//    * - At exactly 512: The universe is perfectly balanced ☯️
//    */
//   private static readonly PACKING_DEGREE_THRESHOLD = AdjacencyPacking.BLOCK_SIZE * 8; // 512

//   /**
//    * The Path of Transcendence: Packed compression for high-degree nodes.
//    * **Beyond VarLong**: Uses bit manipulation and block encoding
//    * **For**: Nodes with degree > 512 (the social media influencers!)
//    */
//   private readonly packedCompressor: AdjacencyCompressor;

//   /**
//    * The Path of Flow: VarLong compression for low-degree nodes.
//    * **The Classical Way**: Delta + VarLong encoding
//    * **For**: Nodes with degree ≤ 512 (us mere mortals)
//    */
//   private readonly vLongCompressor: AdjacencyCompressor;

//   private constructor(
//     packedCompressor: AdjacencyCompressor,
//     vLongCompressor: AdjacencyCompressor
//   ) {
//     this.packedCompressor = packedCompressor;
//     this.vLongCompressor = vLongCompressor;
//   }

//   // ============================================================================
//   // THE ORACLE'S WISDOM - THE THRESHOLD DECISION
//   // ============================================================================

//   /**
//    * The Oracle's Judgment: Should this degree use packing?
//    *
//    * **The Sacred Question**: Is this node worthy of transcendence?
//    * **The Answer**: degree > 512 → YES, enter the packed realm
//    *                degree ≤ 512 → Follow the VarLong way
//    *
//    * **Why This Works**:
//    * - Low degree: VarLong overhead is minimal, compression is good
//    * - High degree: Packed compression benefits outweigh complexity
//    * - The threshold balances CPU vs memory perfectly
//    */
//   static usePacking(degree: number): boolean {
//     return degree > MixedCompressor.PACKING_DEGREE_THRESHOLD;
//   }

//   // ============================================================================
//   // THE MAIN COMPRESSION DHARMA
//   // ============================================================================

//   /**
//    * Compress according to the degree-based path selection.
//    *
//    * **The Dharma**: Each node follows its destined path:
//    * 1. Consult the Oracle (usePacking)
//    * 2. Follow the appropriate path
//    * 3. Achieve compression enlightenment
//    *
//    * **No Middle Ground**: You are either packed or VarLong.
//    * There is no try, only compress or compress differently! 🧙‍♂️
//    */
//   compress(nodeId: number, targets: number[], properties: number[][] | null, degree: number): number {
//     if (MixedCompressor.usePacking(degree)) {
//       // ✅ THE PATH OF TRANSCENDENCE: Packed compression
//       return this.packedCompressor.compress(nodeId, targets, properties, degree);
//     } else {
//       // ✅ THE PATH OF FLOW: VarLong compression
//       return this.vLongCompressor.compress(nodeId, targets, properties, degree);
//     }
//   }

//   /**
//    * Close both paths when the journey ends.
//    */
//   close(): void {
//     this.packedCompressor.close();
//     this.vLongCompressor.close();
//   }

//   // ============================================================================
//   // THE FACTORY OF ENLIGHTENMENT
//   // ============================================================================

//   /**
//    * Create the mixed compressor factory - the gateway to the middle way.
//    *
//    * **The Assembly**: Brings together the two compression traditions
//    * into a single harmonious factory that can create enlightened compressors.
//    */
//   static factory(
//     nodeCountSupplier: () => number,
//     packedAdjacencyListBuilder: AdjacencyListBuilderFactory<Address, AdjacencyList, number[], AdjacencyProperties>,
//     vlongAdjacencyListBuilder: AdjacencyListBuilderFactory<Uint8Array, AdjacencyList, number[], AdjacencyProperties>,
//     propertyMappings: PropertyMappings,
//     aggregations: Aggregation[],
//     noAggregation: boolean,
//     memoryTracker: MemoryTracker
//   ): AdjacencyCompressorFactory {

//     const relationshipCounter = { value: 0 };

//     // ✅ CREATE THE TWO PATHS
//     const packedCompressorFactory = PackedCompressor.factory(
//       nodeCountSupplier,
//       packedAdjacencyListBuilder,
//       propertyMappings,
//       aggregations,
//       noAggregation,
//       memoryTracker
//     );

//     const vlongCompressorFactory = DeltaVarLongCompressor.factory(
//       nodeCountSupplier,
//       vlongAdjacencyListBuilder,
//       propertyMappings,
//       aggregations,
//       noAggregation,
//       memoryTracker
//     );

//     return new MixedCompressorFactory(
//       nodeCountSupplier,
//       relationshipCounter,
//       packedCompressorFactory,
//       vlongCompressorFactory
//     );
//   }
// }

// // ============================================================================
// // THE FACTORY OF SYNTHESIS
// // ============================================================================

// export class MixedCompressorFactory implements AdjacencyCompressorFactory {

//   private readonly nodeCountSupplier: () => number;
//   private readonly relationshipCounter: { value: number };
//   private readonly packedCompressorFactory: AdjacencyCompressorFactory;
//   private readonly vlongCompressorFactory: AdjacencyCompressorFactory;

//   constructor(
//     nodeCountSupplier: () => number,
//     relationshipCounter: { value: number },
//     packedCompressorFactory: AdjacencyCompressorFactory,
//     vlongCompressorFactory: AdjacencyCompressorFactory
//   ) {
//     this.nodeCountSupplier = nodeCountSupplier;
//     this.relationshipCounter = relationshipCounter;
//     this.packedCompressorFactory = packedCompressorFactory;
//     this.vlongCompressorFactory = vlongCompressorFactory;
//   }

//   /**
//    * Initialize both compression paths with shared metadata.
//    *
//    * **The Shared Foundation**: Both paths use the same degree, adjacency offset,
//    * and property offset arrays. This is what enables the seamless switching!
//    */
//   init(): void {
//     const nodeCount = this.nodeCountSupplier();
//     const adjacencyDegrees = HugeIntArray.newArray(nodeCount);
//     const adjacencyOffsets = HugeLongArray.newArray(nodeCount);
//     const propertyOffsets = HugeLongArray.newArray(nodeCount);

//     this.init(adjacencyDegrees, adjacencyOffsets, propertyOffsets);
//   }

//   init(degrees: HugeIntArray, adjacencyOffsets: HugeLongArray, propertyOffsets: HugeLongArray): void {
//     // ✅ SHARED METADATA: Both compression paths use the same arrays!
//     this.packedCompressorFactory.init(degrees, adjacencyOffsets, propertyOffsets);
//     this.vlongCompressorFactory.init(degrees, adjacencyOffsets, propertyOffsets);
//   }

//   /**
//    * Create a mixed compressor that harmonizes both paths.
//    */
//   createCompressor(): AdjacencyCompressor {
//     const packedCompressor = this.packedCompressorFactory.createCompressor();
//     const vlongCompressor = this.vlongCompressorFactory.createCompressor();
//     return new MixedCompressor(packedCompressor, vlongCompressor);
//   }

//   /**
//    * Build the final mixed adjacency lists and properties.
//    *
//    * **The Grand Assembly**: Creates the dual-personality data structures
//    * that seamlessly switch between compressed and packed storage.
//    */
//   build(allowReordering: boolean): AdjacencyListsWithProperties {
//     // ✅ BUILD BOTH PATHS
//     const packedAdjacencyList = this.packedCompressorFactory.build(false);
//     const vlongAdjacencyList = this.vlongCompressorFactory.build(false);

//     // ✅ MERGE MEMORY INFORMATION
//     const memoryInfo = MixedCompressorFactory.mergeMemoryInfo(
//       packedAdjacencyList.adjacency().memoryInfo(),
//       vlongAdjacencyList.adjacency().memoryInfo()
//     );

//     // ✅ CREATE MIXED ADJACENCY LIST
//     const mixedAdjacencyList = new MixedAdjacencyList(
//       packedAdjacencyList.adjacency(),
//       vlongAdjacencyList.adjacency(),
//       memoryInfo
//     );

//     // ✅ CREATE MIXED PROPERTIES
//     const mixedAdjacencyProperties: AdjacencyProperties[] = [];
//     for (let i = 0; i < packedAdjacencyList.properties().length; i++) {
//       const packedProps = packedAdjacencyList.properties()[i];
//       const vlongProps = vlongAdjacencyList.properties()[i];
//       const mixedProps = new MixedAdjacencyProperties(
//         vlongAdjacencyList.adjacency(), // Always use VLong for canonical degrees
//         packedProps,
//         vlongProps
//       );
//       mixedAdjacencyProperties.push(mixedProps);
//     }

//     return ImmutableAdjacencyListsWithProperties.builder()
//       .adjacency(mixedAdjacencyList)
//       .addAllProperties(mixedAdjacencyProperties)
//       .relationshipCount(this.relationshipCounter.value)
//       .build();
//   }

//   /**
//    * Merge memory info from both compression strategies.
//    *
//    * **The Accounting**: Total memory = VLong memory + Packed off-heap memory
//    * **Key Insight**: VLong provides the canonical on-heap structures,
//    * Packed provides additional off-heap optimizations.
//    */
//   private static mergeMemoryInfo(packed: MemoryInfo, vlong: MemoryInfo): MemoryInfo {
//     return ImmutableMemoryInfo.builder()
//       .pages(packed.pages() + vlong.pages())
//       .pageSizes(vlong.pageSizes().merge(packed.pageSizes()))
//       // We use the vlong on heap data structures (pages, offsets and degrees),
//       // where offsets and degrees are shared with the packed adjacency list.
//       .bytesOnHeap(vlong.bytesOnHeap())
//       .heapAllocations(vlong.heapAllocations())
//       // We only need to track the off heap data structures of the packed adjacency list.
//       .bytesOffHeap(packed.bytesOffHeap())
//       .nativeAllocations(packed.nativeAllocations())
//       // We only need to track the header statistics of the packed adjacency list.
//       .headerBits(packed.headerBits())
//       .headerAllocations(packed.headerAllocations())
//       .stdDevBits(packed.stdDevBits())
//       .meanBits(packed.meanBits())
//       .medianBits(packed.medianBits())
//       .minBits(packed.minBits())
//       .maxBits(packed.maxBits())
//       .indexOfMinValue(packed.indexOfMinValue())
//       .indexOfMaxValue(packed.indexOfMaxValue())
//       .headTailDiffBits(packed.headTailDiffBits())
//       .bestMaxDiffBits(packed.bestMaxDiffBits())
//       .pforExceptions(packed.pforExceptions())
//       .build();
//   }

//   relationshipCounter(): { value: number } {
//     return this.relationshipCounter;
//   }
// }
