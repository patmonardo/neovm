/**
 * Block-level compression statistics for adjacency list compression.
 *
 * **Core Purpose**: Analyzes compression blocks to determine optimal bit packing
 * and compression strategies. This is the "compression intelligence" that decides
 * whether delta encoding, PFOR, or other strategies work best.
 *
 * **FastPFOR Integration**: Includes sophisticated cost analysis for Patched
 * Frame of Reference compression - one of the most effective integer compression
 * algorithms for graph data.
 */
import { BitUtil } from '@/mem';
import { BoundedHistogram } from '../BoundedHistogram';
import { ImmutableHistogram } from './ImmutableHistogram';

/**
 * Block size constants for adjacency compression.
 * **Note**: These should match your AdjacencyPacking configuration.
 */
export class AdjacencyPacking {
  static readonly BLOCK_SIZE = 128; // Typical block size for compression
}

// /**
//  * Bit manipulation utilities.
//  */
// export class BitUtil {
//   /**
//    * Ceiling division: (a + b - 1) / b
//    */
//   static ceilDiv(dividend: number, divisor: number): number {
//     return Math.floor((dividend + divisor - 1) / divisor);
//   }

//   /**
//    * Count leading zeros in a 32-bit integer.
//    * JavaScript doesn't have Long.numberOfLeadingZeros, so we approximate.
//    */
//   static numberOfLeadingZeros(value: number): number {
//     if (value === 0) return 32;

//     let zeros = 0;
//     if (value <= 0x0000FFFF) { zeros += 16; value <<= 16; }
//     if (value <= 0x00FFFFFF) { zeros += 8; value <<= 8; }
//     if (value <= 0x0FFFFFFF) { zeros += 4; value <<= 4; }
//     if (value <= 0x3FFFFFFF) { zeros += 2; value <<= 2; }
//     if (value <= 0x7FFFFFFF) { zeros += 1; }

//     return zeros;
//   }
// }

export class BlockStatistics {

  /**
   * Empty singleton for no-op scenarios.
   */
  static readonly EMPTY = new BlockStatistics();

  // ============================================================================
  // PER-BLOCK WORKING HISTOGRAM
  // ============================================================================

  /**
   * Working histogram for analyzing current block.
   * Gets reset for each block, used to calculate statistics.
   */
  private readonly bitsPerValue: BoundedHistogram;

  // ============================================================================
  // CROSS-BLOCK AGGREGATE STATISTICS
  // ============================================================================

  private _blockCount: number = 0;

  /**
   * Standard deviation of bit usage within blocks.
   * **Compression Insight**: Low stdDev = consistent compression, good for bit packing.
   */
  private readonly stdDevBitsHist: BoundedHistogram;

  /**
   * Mean bits per value across blocks.
   * **Compression Insight**: Overall compression effectiveness metric.
   */
  private readonly meanBitsHist: BoundedHistogram;

  /**
   * Median bits per value across blocks.
   * **Compression Insight**: More robust than mean for skewed distributions.
   */
  private readonly medianBitsHist: BoundedHistogram;

  /**
   * Distribution of block lengths.
   * **Compression Insight**: Optimal block size affects compression ratio.
   */
  private readonly blockLengthsHist: BoundedHistogram;

  /**
   * Maximum bits needed in each block.
   * **Compression Insight**: Outliers that hurt compression efficiency.
   */
  private readonly maxBitsHist: BoundedHistogram;

  /**
   * Minimum bits needed in each block.
   * **Compression Insight**: Best-case compression in each block.
   */
  private readonly minBitsHist: BoundedHistogram;

  /**
   * Position of minimum value within blocks.
   * **Compression Insight**: Clustering patterns affect delta encoding.
   */
  private readonly indexOfMinValueHist: BoundedHistogram;

  /**
   * Position of maximum value within blocks.
   * **Compression Insight**: Outlier positions affect compression strategy.
   */
  private readonly indexOfMaxValueHist: BoundedHistogram;

  /**
   * Difference between head and tail compression efficiency.
   * **Compression Insight**: Delta encoding effectiveness measurement.
   */
  private readonly headTailDiffBitsHist: BoundedHistogram;

  /**
   * FastPFOR optimal bit reduction.
   * **Compression Insight**: How much PFOR can reduce bit requirements.
   */
  private readonly bestMaxDiffBitsHist: BoundedHistogram;

  /**
   * FastPFOR exception counts.
   * **Compression Insight**: Number of outliers that need special handling.
   */
  private readonly exceptionsHist: BoundedHistogram;

  constructor() {
    // Initialize all histograms with block size as upper bound
    this.bitsPerValue = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.stdDevBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.meanBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.medianBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.blockLengthsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.maxBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.minBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.indexOfMinValueHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.indexOfMaxValueHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.headTailDiffBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.bestMaxDiffBitsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
    this.exceptionsHist = new BoundedHistogram(AdjacencyPacking.BLOCK_SIZE);
  }

  // ============================================================================
  // PUBLIC ACCESSORS
  // ============================================================================

  blockCount(): number {
    return this._blockCount;
  }

  stdDevBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.stdDevBitsHist);
  }

  meanBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.meanBitsHist);
  }

  medianBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.medianBitsHist);
  }

  blockLengths(): ImmutableHistogram {
    return ImmutableHistogram.of(this.blockLengthsHist);
  }

  maxBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.maxBitsHist);
  }

  minBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.minBitsHist);
  }

  indexOfMinValue(): ImmutableHistogram {
    return ImmutableHistogram.of(this.indexOfMinValueHist);
  }

  indexOfMaxValue(): ImmutableHistogram {
    return ImmutableHistogram.of(this.indexOfMaxValueHist);
  }

  headTailDiffBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.headTailDiffBitsHist);
  }

  bestMaxDiffBits(): ImmutableHistogram {
    return ImmutableHistogram.of(this.bestMaxDiffBitsHist);
  }

  exceptions(): ImmutableHistogram {
    return ImmutableHistogram.of(this.exceptionsHist);
  }

  // ============================================================================
  // CORE ANALYSIS METHOD
  // ============================================================================

  /**
   * Analyze a block of values for compression characteristics.
   *
   * **Algorithm**:
   * 1. Calculate bit requirements for each value
   * 2. Analyze head vs tail compression (delta encoding effectiveness)
   * 3. Find min/max positions (outlier detection)
   * 4. Run FastPFOR cost analysis
   * 5. Record all statistics for algorithm selection
   */
  record(values: number[], start: number, length: number): void {
    // Reset working histogram for this block
    this.bitsPerValue.reset();

    this._blockCount++;
    this.blockLengthsHist.record(length);

    // Analyze bit requirements
    const headBits = this.bitsNeeded(values[start]);
    let tailBitsSum = 0;
    let indexOfMaxValue = start;
    let maxValue = 0;
    let indexOfMinValue = start;
    let minValue = 64; // Max bits for 64-bit integers

    // ✅ CORE LOOP: Analyze each value in the block
    for (let i = start; i < start + length; i++) {
      const bitsPerValue = this.bitsNeeded(values[i]);
      this.bitsPerValue.record(bitsPerValue);

      // Track extremes
      if (bitsPerValue > maxValue) {
        indexOfMaxValue = i;
        maxValue = bitsPerValue;
      }
      if (bitsPerValue < minValue) {
        indexOfMinValue = i;
        minValue = bitsPerValue;
      }

      // Accumulate tail bits (all except first value)
      if (i - start > 0) {
        tailBitsSum += bitsPerValue;
      }
    }

    // ✅ HEAD-TAIL ANALYSIS: Delta encoding effectiveness
    if (tailBitsSum > 0) {
      const tailBitsMean = BitUtil.ceilDiv(tailBitsSum, length - 1);
      if (tailBitsMean <= headBits) {
        this.headTailDiffBitsHist.record(headBits - tailBitsMean);
      }
    }

    // ✅ RECORD BLOCK STATISTICS
    this.stdDevBitsHist.record(Math.ceil(this.bitsPerValue.stdDev()));
    this.meanBitsHist.record(Math.ceil(this.bitsPerValue.mean()));
    this.medianBitsHist.record(this.bitsPerValue.median());
    this.maxBitsHist.record(maxValue);
    this.minBitsHist.record(minValue);
    this.indexOfMaxValueHist.record(indexOfMaxValue - start);
    this.indexOfMinValueHist.record(indexOfMinValue - start);

    // ✅ FASTPFOR ANALYSIS: The crown jewel of compression analysis
    this.recordFastPFORHeuristic(length);
  }

  // ============================================================================
  // FASTPFOR COMPRESSION ANALYSIS
  // ============================================================================

  /**
   * FastPFOR (Patched Frame of Reference) cost analysis.
   *
   * **Algorithm**: Find optimal bit width that minimizes total storage cost:
   * - Pack most values in B bits
   * - Store exceptions (values needing >B bits) separately
   * - Balance packing efficiency vs exception overhead
   *
   * **This is cutting-edge compression science!**
   */
  private recordFastPFORHeuristic(length: number): void {
    const maxBits = this.bitsPerValue.max();
    let bestBits = maxBits;
    let bestCost = bestBits * length;
    let exceptions = 0;
    let bestExceptions = exceptions;

    // ✅ OPTIMIZATION LOOP: Try each possible bit width
    for (let bits = bestBits - 1; bits >= 0; bits--) {
      // Count new exceptions at this bit level
      exceptions += this.bitsPerValue.frequency(bits + 1);

      if (exceptions === length) {
        break; // All values are exceptions - not viable
      }

      // ✅ FASTPFOR COST MODEL
      let currentCost =
        exceptions * 8 +                    // 1 byte per exception index
        exceptions * (maxBits - bits) +     // Exception value storage
        bits * length +                     // Packed value storage
        8;                                  // 1 byte for maxBits metadata

      // Special case: 1-bit reduction doesn't need exception values
      if (maxBits - bits === 1) {
        currentCost -= exceptions;
      }

      // Track optimal configuration
      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestBits = bits;
        bestExceptions = exceptions;
      }
    }

    // ✅ RECORD OPTIMIZATION RESULTS
    this.bestMaxDiffBitsHist.record(maxBits - bestBits);
    this.exceptionsHist.record(bestExceptions);
  }

  // ============================================================================
  // PARALLEL PROCESSING SUPPORT
  // ============================================================================

  /**
   * Merge this BlockStatistics into another (for parallel processing).
   *
   * **Thread Safety**: Used to combine statistics from multiple workers.
   */
  mergeInto(other: BlockStatistics): void {
    other._blockCount += this._blockCount;
    other.minBitsHist.add(this.minBitsHist);
    other.maxBitsHist.add(this.maxBitsHist);
    other.medianBitsHist.add(this.medianBitsHist);
    other.meanBitsHist.add(this.meanBitsHist);
    other.stdDevBitsHist.add(this.stdDevBitsHist);
    other.blockLengthsHist.add(this.blockLengthsHist);
    other.indexOfMaxValueHist.add(this.indexOfMaxValueHist);
    other.indexOfMinValueHist.add(this.indexOfMinValueHist);
    other.headTailDiffBitsHist.add(this.headTailDiffBitsHist);
    other.bestMaxDiffBitsHist.add(this.bestMaxDiffBitsHist);
    other.exceptionsHist.add(this.exceptionsHist);
  }

  /**
   * Resource cleanup (AutoCloseable implementation).
   */
  close(): void {
    // JavaScript doesn't need explicit cleanup, but keeping interface compatible
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Calculate minimum bits needed to represent a value.
   * **JavaScript Note**: Using 32-bit math since JS numbers are limited.
   */
  private bitsNeeded(value: number): number {
    if (value === 0) return 1;
    return 32 - BitUtil.numberOfLeadingZeros(Math.abs(value));
  }
}
