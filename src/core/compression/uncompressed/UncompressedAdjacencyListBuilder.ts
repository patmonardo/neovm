/**
 * Builder for uncompressed adjacency lists using raw long arrays.
 *
 * **The "Fast Lane" Builder**: Zero compression overhead, pure speed.
 * Uses the same bump allocator infrastructure but stores raw 64-bit values
 * instead of compressed bytes.
 *
 * **Memory Trade-off**: 8 bytes per value vs 1-2 bytes compressed
 * **Performance Gain**: Zero decompression overhead during queries
 */

import { MemoryUsage } from '@/mem';
import { AdjacencyListBuilder } from '@/api/compress';
import { ModifiableSlice } from '@/api/compress';
import { HugeIntArray } from '@/collections';
import { HugeLongArray } from '@/collections';
import { MemoryInfo } from '../MemoryInfo';
import { MemoryInfoUtil } from '../MemoryInfoUtil';
import { MemoryTracker } from '@/core/compression';
import { BumpAllocator, BumpAllocatorFactory, BumpAllocatorPositionalFactory } from '@/core/compression';
import { UncompressedAdjacencyList } from './UncompressedAdjacencyList';

/**
 * Mutable wrapper for tracking values during construction
 */
class MutableLong {
  constructor(public value: number = 0) {}

  add(delta: number): void {
    this.value += delta;
  }

  longValue(): number {
    return this.value;
  }
}

export class UncompressedAdjacencyListBuilder implements AdjacencyListBuilder<number[], UncompressedAdjacencyList> {

  // ============================================================================
  // CORE ALLOCATION INFRASTRUCTURE
  // ============================================================================

  /**
   * Bump allocator for raw long arrays.
   * **Key Difference**: Allocates `number[]` instead of `Uint8Array`
   */
  private readonly builder: BumpAllocator<number[]>;

  /**
   * Memory usage tracking for analytics.
   */
  private readonly memoryTracker: MemoryTracker;

  constructor(memoryTracker: MemoryTracker) {
    this.memoryTracker = memoryTracker;
    this.builder = new BumpAllocator<number[]>(LongArrayFactory.INSTANCE);
  }

  // ============================================================================
  // ALLOCATOR FACTORY METHODS
  // ============================================================================

  /**
   * Create new allocator for sequential allocation.
   * **Use Case**: First property allocator, adjacency data
   */
  newAllocator(): Allocator {
    return new Allocator(this.builder.newLocalAllocator(), this.memoryTracker);
  }

  /**
   * Create positional allocator for aligned allocation.
   * **Use Case**: Additional property types that must align with first property
   */
  newPositionalAllocator(): PositionalAllocator {
    return new PositionalAllocator(
      this.builder.newLocalPositionalAllocator(LongArrayPositionalFactory.INSTANCE)
    );
  }

  // ============================================================================
  // FINAL ASSEMBLY
  // ============================================================================

  /**
   * Build the final uncompressed adjacency list.
   *
   * **Assembly Process**:
   * 1. Extract all allocated pages from bump allocator
   * 2. Optionally reorder for cache performance
   * 3. Calculate memory usage statistics
   * 4. Create final UncompressedAdjacencyList instance
   */
  build(degrees: HugeIntArray, offsets: HugeLongArray, allowReordering: boolean): UncompressedAdjacencyList {
    const pages = this.builder.intoPages();

    if (allowReordering) {
      // ✅ CACHE OPTIMIZATION: Reorder for spatial locality
      this.reorder(pages, offsets, degrees);
    }

    // ✅ MEMORY ANALYSIS: Calculate final statistics
    const memoryInfo = this.memoryInfo(pages, degrees, offsets);

    return new UncompressedAdjacencyList(pages, degrees, offsets, memoryInfo);
  }

  // ============================================================================
  // MEMORY ANALYSIS
  // ============================================================================

  /**
   * Calculate comprehensive memory usage statistics.
   *
   * **Key Metrics**:
   * - Page count and sizes
   * - Heap memory usage (all data stays on heap)
   * - Object overhead for arrays and metadata
   */
  private memoryInfo(pages: number[][], degrees: HugeIntArray, offsets: HugeLongArray): MemoryInfo {
    // ✅ TRACK PAGE SIZES: Record each page for analytics
    for (const page of pages) {
      this.memoryTracker.recordPageSize(page.length * 8); // 8 bytes per long
    }

    const memoryInfoBuilder = MemoryInfoUtil
      .builder(this.memoryTracker)
      .pages(pages.length)
      .bytesOffHeap(0); // All data stays on heap

    // ✅ CALCULATE HEAP USAGE
    const sizeOnHeap = new MutableLong();

    // Pages array memory
    const pagesMemory = MemoryUsage.sizeOfObject(pages);
    if (pagesMemory !== undefined) {
      sizeOnHeap.add(pagesMemory);
    }

    // Degrees array memory
    const degreesMemory = MemoryUsage.sizeOfObject(degrees);
    if (degreesMemory !== undefined) {
      sizeOnHeap.add(degreesMemory);
    }

    // Offsets array memory
    const offsetsMemory = MemoryUsage.sizeOfObject(offsets);
    if (offsetsMemory !== undefined) {
      sizeOnHeap.add(offsetsMemory);
    }

    memoryInfoBuilder.bytesOnHeap(sizeOnHeap.longValue());

    return memoryInfoBuilder.build();
  }

  // ============================================================================
  // CACHE OPTIMIZATION
  // ============================================================================

  /**
   * Reorder pages for optimal cache performance.
   *
   * **Cache Strategy**: Same concept as compressed version - arrange
   * frequently accessed data close together in memory.
   *
   * **For Uncompressed**: Even more important since we're using more memory!
   */
  private reorder(pages: number[][], offsets: HugeLongArray, degrees: HugeIntArray): void {
    // TODO: Implement cache-aware reordering for uncompressed data
    console.log(`Reordering ${pages.length} uncompressed pages for ${offsets.size()} nodes`);

    // In production, this would:
    // 1. Analyze degree distribution
    // 2. Group high-degree nodes together
    // 3. Rearrange pages for cache locality
    // 4. Update offsets to reflect new layout
  }
}

// ============================================================================
// LONG ARRAY FACTORY
// ============================================================================

/**
 * Factory for creating long array pages.
 * **Key Difference**: Creates `number[]` instead of `Uint8Array`
 */
class LongArrayFactory implements BumpAllocatorFactory<number[]> {
  static readonly INSTANCE = new LongArrayFactory();

  private constructor() {}

  /**
   * Create empty pages array for initial allocation.
   */
  newEmptyPages(): number[][] {
    return [];
  }

  /**
   * Create new page of specified length.
   * **Storage**: Raw number array for direct access
   */
  newPage(length: number): number[] {
    return new Array<number>(length);
  }
}

// ============================================================================
// POSITIONAL FACTORY
// ============================================================================

/**
 * Factory for positional allocation operations.
 * **Purpose**: Enable aligned allocation for multiple property types
 */
class LongArrayPositionalFactory implements BumpAllocatorPositionalFactory<number[]> {
  static readonly INSTANCE = new LongArrayPositionalFactory();

  private constructor() {}

  /**
   * Create copy of page with specified length.
   * **Use Case**: Extending pages during positional allocation
   */
  copyOfPage(array: number[], length: number): number[] {
    const result = new Array<number>(length);
    for (let i = 0; i < Math.min(array.length, length); i++) {
      result[i] = array[i];
    }
    return result;
  }

  /**
   * Get length of existing page.
   */
  lengthOfPage(array: number[]): number {
    return array.length;
  }
}

// ============================================================================
// SEQUENTIAL ALLOCATOR
// ============================================================================

/**
 * Allocator for sequential memory allocation.
 * **Performance**: Bump pointer allocation for maximum speed
 */
 class Allocator implements AdjacencyListBuilder.Allocator<number[]> {

  private readonly allocator: BumpAllocator.LocalAllocator<number[]>;
  private readonly memoryTracker: MemoryTracker;

  constructor(
    allocator: BumpAllocator.LocalAllocator<number[]>,
    memoryTracker: MemoryTracker
  ) {
    this.allocator = allocator;
    this.memoryTracker = memoryTracker;
  }

  /**
   * Allocate memory for uncompressed data.
   *
   * **The Hot Path**: Called for every node's data during building.
   *
   * @param allocationSize Number of values needed
   * @param into Slice that will receive the allocated memory
   * @returns Address/offset where data was allocated
   */
  async allocate(allocationSize: number, into: ModifiableSlice<number[]>): Promise<number> {
    // ✅ ANALYTICS: Track heap allocation (8 bytes per value)
    this.memoryTracker.recordHeapAllocation(allocationSize * 8);

    // ✅ FAST ALLOCATION: Bump pointer allocation
    return await this.allocator.insertInto(allocationSize, into);
  }

  /**
   * Clean up allocator resources.
   */
  close(): void {
    // No cleanup needed for bump allocator
  }
}

// ============================================================================
// POSITIONAL ALLOCATOR
// ============================================================================

/**
 * Allocator for positional memory allocation.
 * **Purpose**: Write property data at specific addresses to maintain alignment
 */
export class PositionalAllocator implements AdjacencyListBuilder.PositionalAllocator<number[]> {

  private readonly allocator: BumpAllocator.LocalPositionalAllocator<number[]>;

  constructor(allocator: BumpAllocator.LocalPositionalAllocator<number[]>) {
    this.allocator = allocator;
  }

  /**
   * Write data at specific address.
   *
   * **Property Alignment**: This ensures all property arrays for a node
   * start at the same relative positions, enabling fast multi-property queries.
   *
   * @param address Target address to write at
   * @param properties Property values to write
   * @param length Number of values to write
   */
  writeAt(address: number, properties: number[], length: number): void {
    this.allocator.insertAt(address, properties, length);
  }

  /**
   * Clean up allocator resources.
   */
  close(): void {
    // No cleanup needed
  }
}
