/**
 * Mixed Page - The Dual-Personality Memory Container
 *
 * **The Hybrid Slice**: Contains BOTH types of memory slices needed
 * for the mixed compression strategy:
 * - Address slice: For packed compression (off-heap, bit-level magic)
 * - Bytes slice: For VarLong compression (on-heap, delta encoding)
 *
 * **Reuse Optimization**: Created once, reused throughout compression
 * to avoid allocation overhead in the hot path.
 *
 * **Visitor Pattern Corpse**: The commented-out visitor pattern shows
 * the Java enterprise architect's original vision - thankfully simplified!
 */

import { ModifiableSlice } from '@/api/compress';
import { AdjacencyListBuilder } from '@/api/compress';
import { Address } from '../packed/Address';

export class MixedPage {

  // ============================================================================
  // THE DUAL SLICES
  // ============================================================================

  /**
   * Address slice for packed compression.
   * **For**: High-degree nodes that use off-heap bit-packed storage
   * **Contains**: Address references to packed data structures
   */
  private readonly addressSlice: AdjacencyListBuilder.Slice<Address>;

  /**
   * Bytes slice for VarLong compression.
   * **For**: Low-degree nodes that use delta + VarLong encoding
   * **Contains**: Raw byte arrays with compressed data
   */
  private readonly bytesSlice: AdjacencyListBuilder.Slice<Uint8Array>;

  constructor() {
    this.addressSlice = ModifiableSlice.create<Address>();
    this.bytesSlice = ModifiableSlice.create<Uint8Array>();
  }

  // ============================================================================
  // SLICE ACCESS
  // ============================================================================

  /**
   * Get the address slice for packed compression operations.
   * **Usage**: When degree > threshold, use this slice
   */
  address(): AdjacencyListBuilder.Slice<Address> {
    return this.addressSlice;
  }

  /**
   * Get the bytes slice for VarLong compression operations.
   * **Usage**: When degree ≤ threshold, use this slice
   */
  bytes(): AdjacencyListBuilder.Slice<Uint8Array> {
    return this.bytesSlice;
  }
}

/*
 * === VISITOR PATTERN ARCHAEOLOGY ===
 *
 * The commented-out visitor pattern shows the original enterprise architect's
 * vision for handling the dual nature of mixed pages:
 *
 * interface MixedPageVisitor<R, P> {
 *   visitAddress(address: Address, param: P): R;
 *   visitBytes(bytes: Uint8Array, param: P): R;
 * }
 *
 * This would have created a type-safe way to handle both address and byte
 * pages, but at the cost of massive complexity. The current approach is
 * much simpler - just expose both slices and let the caller decide!
 *
 * Sometimes the enterprise architects get it right by accident when
 * they comment out their own over-engineering! 😂
 */
