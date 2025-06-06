// /**
//  * Inlined Head Packed Tail Unpacker - The Zen Master of Decompression
//  *
//  * **The Enlightened Strategy**: Seamlessly handles the hybrid format where
//  * the first value is inlined in the header and remaining values are bit-packed.
//  *
//  * **The Zen Approach**:
//  * - First value: Immediately available (enlightenment is instant)
//  * - Remaining values: Revealed through decompression (wisdom through practice)
//  * - Transition: Invisible to the user (the way that can be spoken is not the true way)
//  *
//  * **State Management Koan**:
//  * "The unpacker that knows it has no first block is wiser than
//  *  the unpacker that thinks it has all blocks."
//  *
//  * **Memory Layout Understanding**:
//  * ```
//  * [Header: blockBits + VarLong first] [Alignment] [Packed remaining values]
//  * ```
//  *
//  * **The First Value Trick**: Store the inlined first value at the END of
//  * the block array (position 63) and start reading from there. This creates
//  * the illusion that all values come from blocks, achieving perfect unity.
//  */

// import { ByteArrayBuffer } from '../../api/compress/ByteArrayBuffer';
// import { AdjacencyCompression } from '../common/AdjacencyCompression';
// import { VarLongDecoding } from '../common/VarLongDecoding';
// import { BitUtil } from '../../mem/BitUtil';
// import { UnsafeUtil } from '../../internal/unsafe/UnsafeUtil';
// import { AdjacencyPacking } from './AdjacencyPacking';
// import { AdjacencyUnpacking } from './AdjacencyUnpacking';

// /**
//  * Mutable wrapper for VarLong decoding results
//  */
// class MutableLong {
//   constructor(public value: number = 0) {}

//   longValue(): number {
//     return this.value;
//   }
// }

// export class InlinedHeadPackedTailUnpacker {

//   // ============================================================================
//   // CONSTANTS - THE ETERNAL TRUTHS
//   // ============================================================================

//   private static readonly BLOCK_SIZE = AdjacencyPacking.BLOCK_SIZE; // 64

//   // ============================================================================
//   // COMPRESSED DATA STATE - THE HIDDEN REALITY
//   // ============================================================================

//   /**
//    * Header buffer containing block bit widths.
//    * **Zen Note**: Does NOT contain the inlined first value directly,
//    * the first value follows the block headers in the memory stream.
//    */
//   private readonly header: ByteArrayBuffer;

//   /**
//    * Pointer to current position in compressed data.
//    * **The Moving Finger**: Points to the packed remaining values
//    */
//   private targetPtr: number = 0;

//   /**
//    * Number of blocks containing remaining values.
//    * **Important**: This is blocks for (degree - 1) values, not degree values!
//    */
//   private headerLength: number = 0;

//   // ============================================================================
//   // DECOMPRESSION STATE - THE ENLIGHTENED MIND
//   // ============================================================================

//   /**
//    * Current decompressed block (64 values).
//    * **The Zen Trick**: Position 63 initially contains the inlined first value!
//    */
//   private readonly block: number[] = new Array(InlinedHeadPackedTailUnpacker.BLOCK_SIZE);

//   /**
//    * Temporary storage for VarLong decoded first value.
//    */
//   private readonly headValue: MutableLong;

//   /**
//    * Current position within the decompressed block.
//    * **Zen Starting Point**: Begins at 63 (pointing to inlined first value)
//    */
//   private idxInBlock: number = 0;

//   /**
//    * Current block being processed (for remaining values).
//    * **The Journey**: Tracks progress through packed blocks
//    */
//   private blockId: number = 0;

//   /**
//    * Last value for delta decoding.
//    * **The Chain of Being**: Each value builds upon the previous
//    */
//   private lastValue: number = 0;

//   /**
//    * Remaining values to decompress (excluding the inlined first).
//    * **The Countdown**: How many non-inlined values remain
//    */
//   private remaining: number = 0;

//   constructor() {
//     this.block = new Array(InlinedHeadPackedTailUnpacker.BLOCK_SIZE);
//     this.header = new ByteArrayBuffer();
//     this.headValue = new MutableLong();
//   }

//   // ============================================================================
//   // THE WAY OF COPYING - KNOWLEDGE TRANSFER
//   // ============================================================================

//   /**
//    * Copy state from another unpacker.
//    * **Zen Teaching**: True understanding can be transmitted from master to student.
//    */
//   copyFrom(other: InlinedHeadPackedTailUnpacker): void {
//     // ✅ COPY THE DECOMPRESSED REALITY
//     for (let i = 0; i < InlinedHeadPackedTailUnpacker.BLOCK_SIZE; i++) {
//       this.block[i] = other.block[i];
//     }

//     // ✅ COPY THE COMPRESSED WISDOM
//     this.header.ensureCapacity(other.headerLength);
//     for (let i = 0; i < other.headerLength; i++) {
//       this.header.buffer[i] = other.header.buffer[i];
//     }

//     // ✅ COPY THE STATE OF BEING
//     this.targetPtr = other.targetPtr;
//     this.headerLength = other.headerLength;
//     this.idxInBlock = other.idxInBlock;
//     this.blockId = other.blockId;
//     this.lastValue = other.lastValue;
//     this.remaining = other.remaining;
//   }

//   // ============================================================================
//   // THE ENLIGHTENMENT - INITIALIZATION
//   // ============================================================================

//   /**
//    * Initialize unpacker for a compressed adjacency list.
//    *
//    * **The Zen Initialization Process**:
//    * 1. Calculate blocks needed for (degree - 1) remaining values
//    * 2. Read block headers from memory stream
//    * 3. VarLong decode the inlined first value
//    * 4. Place first value at end of block array (the great illusion!)
//    * 5. Set state to begin reading from the "first" value
//    *
//    * **The Philosophical Trick**: By placing the first value at position 63
//    * and starting idxInBlock at 63, the first call to next() returns the
//    * inlined value seamlessly. Subsequent calls decompress blocks naturally.
//    *
//    * @param ptr Off-heap memory pointer to compressed data
//    * @param degree Total number of neighbors (including inlined first)
//    */
//   reset(ptr: number, degree: number): void {
//     // ✅ CALCULATE REMAINING BLOCKS (degree - 1, since first is inlined)
//     const blocks = BitUtil.ceilDiv(degree - 1, AdjacencyPacking.BLOCK_SIZE);
//     this.header.ensureCapacity(blocks);
//     this.headerLength = blocks;

//     // ✅ READ BLOCK INFORMATION FROM HEADER
//     for (let i = 0; i < blocks; i++) {
//       this.header.buffer[i] = UnsafeUtil.getByte(ptr + i);
//     }
//     ptr += blocks;

//     // ✅ VARLONG DECODE THE INLINED FIRST VALUE
//     ptr = VarLongDecoding.unsafeDecodeVLong(ptr, this.headValue);

//     // ✅ THE ZEN TRICK: Store first value at END of block array
//     // This creates the illusion that all values come from blocks!
//     this.block[InlinedHeadPackedTailUnpacker.BLOCK_SIZE - 1] = this.headValue.longValue();

//     // ✅ SET THE DELTA CHAIN: First value becomes base for remaining values
//     this.lastValue = this.headValue.longValue();

//     // ✅ ALIGN TARGET POINTER FOR BLOCK DATA
//     this.targetPtr = BitUtil.align(ptr, 8); // 8-byte alignment

//     // ✅ THE ENLIGHTENED STARTING STATE
//     this.idxInBlock = InlinedHeadPackedTailUnpacker.BLOCK_SIZE - 1; // Point to inlined value
//     this.blockId = 0;
//     this.remaining = degree - 1; // Exclude the inlined first value
//   }

//   // ============================================================================
//   // THE WAY OF ACCESS - VALUE RETRIEVAL
//   // ============================================================================

//   /**
//    * Get next decompressed value.
//    *
//    * **The Zen Flow**:
//    * - First call: Returns inlined value from position 63 (instant enlightenment)
//    * - Subsequent calls: Decompress blocks as needed (gradual understanding)
//    * - Transition: Invisible to the caller (the way is seamless)
//    *
//    * **Performance Characteristics**:
//    * - First value: ~5ns (direct access from block array)
//    * - Remaining values: ~30ns (standard bit-unpacking)
//    * - Average: Depends on access patterns
//    *
//    * @returns Next neighbor node ID (delta-decoded)
//    */
//   next(): number {
//     if (this.idxInBlock === InlinedHeadPackedTailUnpacker.BLOCK_SIZE) {
//       this.decompressBlock();
//     }
//     return this.block[this.idxInBlock++];
//   }

//   /**
//    * Peek at next value without consuming it.
//    *
//    * **The Observer**: Sees without changing the state of being.
//    */
//   peek(): number {
//     if (this.idxInBlock === InlinedHeadPackedTailUnpacker.BLOCK_SIZE) {
//       this.decompressBlock();
//     }
//     return this.block[this.idxInBlock];
//   }

//   /**
//    * Advance by multiple steps and return the final value.
//    *
//    * **The Leap of Understanding**: Skip intermediate truths to reach
//    * the desired state of knowledge.
//    *
//    * **Delta Chain Limitation**: Cannot skip blocks entirely because
//    * delta decoding requires all intermediate values.
//    *
//    * @param steps Number of values to skip
//    * @returns Value at position current + steps + 1
//    */
//   advanceBy(steps: number): number {
//     // ✅ THE MULTI-BLOCK JOURNEY
//     // Due to delta encoded target ids, we can't yet skip blocks
//     // as we need to decompress all the previous blocks to get
//     // the correct target id.
//     while (this.idxInBlock + steps >= InlinedHeadPackedTailUnpacker.BLOCK_SIZE) {
//       steps = this.idxInBlock + steps - InlinedHeadPackedTailUnpacker.BLOCK_SIZE;
//       this.decompressBlock();
//     }

//     // ✅ THE WITHIN-BLOCK ADVANCEMENT
//     this.idxInBlock += steps;
//     return this.block[this.idxInBlock++];
//   }

//   // ============================================================================
//   // THE WAY OF DECOMPRESSION - REVEALING HIDDEN TRUTHS
//   // ============================================================================

//   /**
//    * Decompress the next block of remaining values.
//    *
//    * **The Zen of Block Processing**: Each block reveals its truth
//    * when the time is right. No block is decompressed before its moment.
//    *
//    * **Tail Block Wisdom**: The final block may contain fewer than
//    * BLOCK_SIZE values. The unpacker adapts to this reality gracefully.
//    *
//    * **Delta Chain Continuation**: Each block builds upon the wisdom
//    * of its predecessors through delta decoding.
//    */
//   private decompressBlock(): void {
//     if (this.blockId < this.headerLength) {
//       // ✅ READ THE BLOCK'S WISDOM (bit width)
//       const bits = this.header.buffer[this.blockId];
//       let length: number;

//       if (this.remaining < InlinedHeadPackedTailUnpacker.BLOCK_SIZE) {
//         // ✅ THE FINAL BLOCK: May be incomplete
//         this.targetPtr = AdjacencyUnpacking.loopUnpack(
//           bits,
//           this.block,
//           0,
//           this.remaining,
//           this.targetPtr
//         );
//         length = this.remaining;
//         this.remaining = 0;
//       } else {
//         // ✅ A FULL BLOCK: Complete understanding
//         this.targetPtr = AdjacencyUnpacking.unpack(bits, this.block, 0, this.targetPtr);
//         this.remaining -= InlinedHeadPackedTailUnpacker.BLOCK_SIZE;
//         length = InlinedHeadPackedTailUnpacker.BLOCK_SIZE;
//       }

//       // ✅ DELTA DECODE: Transform deltas back to absolute truths
//       this.lastValue = AdjacencyCompression.deltaDecode(this.block, length, this.lastValue);
//       this.blockId++;
//     }

//     // ✅ RETURN TO THE BEGINNING
//     this.idxInBlock = 0;
//   }
// }
