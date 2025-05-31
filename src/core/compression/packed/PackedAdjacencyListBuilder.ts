/**
 * Packed Adjacency List Builder - Off-Heap Memory Allocation
 *
 * **The Real Off-Heap**: This is where we actually allocate memory outside
 * the JavaScript heap using UnsafeUtil.allocateMemory() equivalent.
 *
 * **Key Difference**: Other builders allocate arrays (byte[], long[])
 * This builder allocates raw memory addresses - true systems programming!
 *
 * **No Positional Allocation**: Packed compression doesn't support
 * positional allocation because the bit-packing makes alignment impossible.
 */

import { AdjacencyListBuilder } from '../../api/compress/AdjacencyListBuilder';
import { ModifiableSlice } from '../../api/compress/ModifiableSlice';
import { HugeIntArray } from '../../collections/ha/HugeIntArray';
import { HugeLongArray } from '../../collections/ha/HugeLongArray';
import { MemoryInfo } from '../MemoryInfo';
import { MemoryInfoUtil } from '../MemoryInfoUtil';
import { BumpAllocator, BumpAllocatorFactory } from '../common/BumpAllocator';
import { MemoryTracker } from '../common/MemoryTracker';
import { MemoryUsage } from '../../mem/MemoryUsage';
import { UnsafeUtil } from '../../internal/unsafe/UnsafeUtil';
import { EmptyMemoryTracker } from '../../memory/EmptyMemoryTracker';
import { Address, allocateOffHeapMemory } from './Address';
import { PackedAdjacencyList } from './PackedAdjacencyList';

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

export class PackedAdjacencyListBuilder implements AdjacencyListBuilder<Address, PackedAdjacencyList> {

  // ============================================================================
  // OFF-HEAP ALLOCATION INFRASTRUCTURE
  // ============================================================================

  /**
   * Bump allocator for off-heap memory addresses.
   * **Key Difference**: Allocates Address objects (memory pointers)
   * instead of arrays like other builders.
   */
  private readonly builder: BumpAllocator<Address>;

  /**
   * Memory usage tracking for both on-heap and off-heap allocations.
   */
  private readonly memoryTracker: MemoryTracker;

  constructor(memoryTracker: MemoryTracker) {
    this.builder = new BumpAllocator<Address>(AddressFactory.INSTANCE);
    this.memoryTracker = memoryTracker;
  }

  // ============================================================================
  // ALLOCATOR FACTORY METHODS
  // ============================================================================

  /**
   * Create new allocator for sequential off-heap allocation.
   * **For**: Compressed adjacency data and properties
   */
  newAllocator(): Allocator {
    return new Allocator(this.builder.newLocalAllocator(), this.memoryTracker);
  }

  /**
   * Positional allocation not supported for packed compression.
   *
   * **Why Not Supported**: Bit-packing makes it impossible to predict
   * exact memory positions. Each compression block can have different
   * bit widths, so alignment is unpredictable.
   *
   * **Alternative**: Use separate property builders that don't require alignment.
   */
  newPositionalAllocator(): AdjacencyListBuilder.PositionalAllocator<Address> {
    throw new Error("Packed adjacency lists do not support positional allocation.");
  }

  // ============================================================================
  // FINAL ASSEMBLY
  // ============================================================================

  /**
   * Build the final packed adjacency list.
   *
   * **Assembly Process**:
   * 1. Extract all allocated Address objects from bump allocator
   * 2. Optionally reorder for cache performance
   * 3. Convert Address objects to raw memory pointers
   * 4. Calculate memory usage statistics
   * 5. Create final PackedAdjacencyList instance
   */
  build(degrees: HugeIntArray, offsets: HugeLongArray, allowReordering: boolean): PackedAdjacencyList {
    const intoPages = this.builder.intoPages();

    if (allowReordering) {
      // ✅ CACHE OPTIMIZATION: Reorder for spatial locality
      this.reorder(intoPages, offsets, degrees);
    }

    // ✅ EXTRACT RAW POINTERS: Convert Address objects to memory pointers
    const pages: number[] = new Array(intoPages.length);
    const allocationSizes: number[] = new Array(intoPages.length);

    for (let i = 0; i < intoPages.length; i++) {
      const address = intoPages[i];
      pages[i] = address.address();           // Raw memory pointer
      allocationSizes[i] = address.bytes();   // Size for cleanup
    }

    // ✅ MEMORY ANALYSIS: Calculate comprehensive statistics
    const memoryInfo = this.memoryInfo(allocationSizes, degrees, offsets);

    return new PackedAdjacencyList(pages, allocationSizes, degrees, offsets, memoryInfo);
  }

  // ============================================================================
  // MEMORY ANALYSIS
  // ============================================================================

  /**
   * Calculate comprehensive memory usage statistics.
   *
   * **Dual Memory Model**:
   * - Off-heap: Compressed adjacency data (Address pointers)
   * - On-heap: Metadata arrays (degrees, offsets)
   *
   * **Analytics**: Include bit-packing statistics from memory tracker
   */
  private memoryInfo(allocationSizes: number[], degrees: HugeIntArray, offsets: HugeLongArray): MemoryInfo {
    // ✅ TRACK OFF-HEAP ALLOCATION SIZES
    let bytesOffHeap = 0;
    for (const size of allocationSizes) {
      this.memoryTracker.recordPageSize(size);
      bytesOffHeap += size;
    }

    const memoryInfoBuilder = MemoryInfoUtil
      .builder(this.memoryTracker, this.memoryTracker.blockStatistics())
      .pages(allocationSizes.length)
      .bytesOffHeap(bytesOffHeap);

    // ✅ CALCULATE ON-HEAP USAGE (metadata only)
    const sizeOnHeap = new MutableLong();

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
   * **Strategy**: Arrange frequently accessed nodes close together
   * in memory to improve cache locality during graph traversals.
   *
   * **For Packed**: Even more critical than other strategies because
   * decompression is CPU-intensive - cache misses are expensive!
   */
  private reorder(pages: Address[], offsets: HugeLongArray, degrees: HugeIntArray): void {
    // TODO: Implement cache-aware reordering for packed data
    console.log(`Reordering ${pages.length} packed pages for ${offsets.size()} nodes`);

    // In production, this would:
    // 1. Analyze node access patterns
    // 2. Group frequently co-accessed nodes together
    // 3. Rearrange pages for cache locality
    // 4. Update offsets to reflect new layout
  }
}

// ============================================================================
// OFF-HEAP ADDRESS FACTORY
// ============================================================================

/**
 * Factory for creating off-heap memory addresses.
 * **The Real Deal**: Uses actual memory allocation via UnsafeUtil
 */
class AddressFactory implements BumpAllocatorFactory<Address> {
  static readonly INSTANCE = new AddressFactory();

  private constructor() {}

  /**
   * Create empty pages array for initial allocation.
   */
  newEmptyPages(): Address[] {
    return [];
  }

  /**
   * Allocate new off-heap memory page.
   *
   * **TRUE OFF-HEAP**: This calls UnsafeUtil.allocateMemory() which
   * allocates memory outside the JavaScript heap.
   *
   * **Memory Safety**: The Address object tracks the pointer and size
   * for proper cleanup.
   *
   * @param length Size in bytes to allocate
   * @returns Address pointing to allocated memory
   */
  newPage(length: number): Address {
    // ✅ REAL OFF-HEAP ALLOCATION
    const ptr = UnsafeUtil.allocateMemory(length, EmptyMemoryTracker.INSTANCE);
    return Address.createAddress(ptr, length);
  }
}

// ============================================================================
// OFF-HEAP ALLOCATOR
// ============================================================================

/**
 * Allocator for off-heap memory allocation.
 * **Systems Programming**: Direct memory allocation with tracking
 */
class Allocator implements AdjacencyListBuilder.Allocator<Address> {

  private readonly allocator: BumpAllocator.LocalAllocator<Address>;
  private readonly memoryTracker: MemoryTracker;

  constructor(
    allocator: BumpAllocator.LocalAllocator<Address>,
    memoryTracker: MemoryTracker
  ) {
    this.allocator = allocator;
    this.memoryTracker = memoryTracker;
  }

  /**
   * Allocate off-heap memory for compressed data.
   *
   * **The Critical Path**: Called for every node's compressed data during building.
   *
   * **Memory Tracking**: Records native allocation (off-heap)
   * instead of heap allocation like other builders.
   *
   * @param allocationSize Bytes needed for compressed data
   * @param into Slice that will receive the allocated Address
   * @returns Offset where data was allocated
   */
  async allocate(allocationSize: number, into: ModifiableSlice<Address>): Promise<number> {
    // ✅ TRACK NATIVE ALLOCATION: Off-heap memory usage
    this.memoryTracker.recordNativeAllocation(allocationSize);

    // ✅ ALLOCATE OFF-HEAP: Bump pointer allocation of Address objects
    return await this.allocator.insertInto(allocationSize, into);
  }

  /**
   * Clean up allocator resources.
   */
  close(): void {
    // No cleanup needed for bump allocator
    // Individual Address objects handle their own memory cleanup
  }
}
