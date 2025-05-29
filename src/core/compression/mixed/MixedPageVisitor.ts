/**
 * Mixed Page Visitor - The Archaeological Artifact
 *
 * **ENTERPRISE ARCHAEOLOGY ALERT**: This is the actual visitor pattern
 * interface that was deemed "too complex" and commented out in MixedPage!
 *
 * **The Original Vision**: Type-safe handling of dual-personality pages
 * through the sacred visitor pattern. Every Java enterprise architect's
 * favorite hammer for every nail! 🔨
 *
 * **Why It Exists**: To provide "type safety" and "extensibility" for
 * handling both Address and byte[] pages in a "clean, OOP way".
 *
 * **Why It Was Abandoned**: Because sometimes even Java developers
 * realize that simple is better than clever! 😂
 *
 * **Educational Value**: A perfect example of enterprise over-engineering
 * that thankfully got simplified before production!
 */

import { Address } from '../packed/Address';

/**
 * Visitor interface for Mixed Page operations.
 *
 * **The Visitor Pattern**:
 * - R: Return type (what the visitor produces)
 * - P: Parameter type (context passed to visitor methods)
 *
 * **How It Would Work**:
 * ```typescript
 * class CompressionVisitor implements MixedPageVisitor<number, CompressionContext> {
 *   visitAddress(address: Address, context: CompressionContext): number {
 *     return this.compressWithPacking(address, context);
 *   }
 *
 *   visitBytes(bytes: Uint8Array, context: CompressionContext): number {
 *     return this.compressWithVarLong(bytes, context);
 *   }
 * }
 *
 * // Usage:
 * const visitor = new CompressionVisitor();
 * const result = mixedPage.accept(visitor, context);
 * ```
 *
 * **What Actually Happened**:
 * ```typescript
 * // Simple, direct approach:
 * if (usePacking(degree)) {
 *   return compressWithPacking(mixedPage.address(), context);
 * } else {
 *   return compressWithVarLong(mixedPage.bytes(), context);
 * }
 * ```
 *
 * **Lesson**: Sometimes an if statement is better than a design pattern! 🎯
 */
export interface MixedPageVisitor<R, P> {

  /**
   * Visit an Address-based page (packed compression).
   *
   * **For**: High-degree nodes using off-heap bit-packed storage
   * **Purpose**: Handle the packed compression path in a "type-safe" way
   *
   * @param address The packed address to process
   * @param param Context parameter for the operation
   * @returns Result of the address processing
   */
  visitAddress(address: Address, param: P): R;

  /**
   * Visit a byte array page (VarLong compression).
   *
   * **For**: Low-degree nodes using delta + VarLong encoding
   * **Purpose**: Handle the VarLong compression path in a "type-safe" way
   *
   * @param bytes The byte array to process
   * @param param Context parameter for the operation
   * @returns Result of the byte processing
   */
  visitBytes(bytes: Uint8Array, param: P): R;
}

/**
 * Example implementation that would have been used.
 * **Disclaimer**: This is for educational purposes only!
 * Please don't actually implement this pattern. 😅
 */
export class ExampleCompressionVisitor implements MixedPageVisitor<number, any> {

  visitAddress(address: Address, param: any): number {
    console.log("Visiting address with packed compression");
    // Would have called packed compression logic
    return 42; // Placeholder
  }

  visitBytes(bytes: Uint8Array, param: any): number {
    console.log("Visiting bytes with VarLong compression");
    // Would have called VarLong compression logic
    return 24; // Placeholder
  }
}

/**
 * The MixedPage class would have had this method:
 * **Note**: This is the method that was mercifully NOT implemented!
 */
export interface MixedPageWithVisitor {
  /**
   * Accept a visitor and dispatch to appropriate method.
   * **The Double Dispatch**: Classic visitor pattern implementation
   */
  accept<R, P>(visitor: MixedPageVisitor<R, P>, param: P): R;
}
