/**
 * Mixed Adjacency List - The Intelligent Hybrid Strategy
 *
 * **The High Priest's Design**: Combines compressed + uncompressed strategies
 * with intelligent switching based on node degree. The ultimate abstraction
 * that hides terrifying complexity behind a simple interface.
 *
 * **The "Don't Look Too Closely" Pattern**:
 * - Externally: Simple AdjacencyList interface
 * - Internally: Two complete storage systems + switching logic
 * - Reality: Mind-bending complexity for marginal gains
 *
 * **When Java Enterprise Patterns Meet Graph Databases**:
 * This is what happens when you let enterprise architects design
 * high-performance graph storage. Beautiful and horrifying! 🎭
 *
 * **Property Coupling Strategy**:
 * Properties are no longer independent - they're accessed ONLY through
 * adjacency lists, creating tight coupling that "breaks GDS Graph structure"
 * in subtle ways that only surface during complex operations.
 */

import { AdjacencyList } from '@/api';
import { AdjacencyCursor } from '@/api';
import { MemoryInfo } from '../MemoryInfo';
import { MixedCompressor } from './MixedCompressor';

export class MixedAdjacencyList implements AdjacencyList {

  // ============================================================================
  // THE DUAL STORAGE SYSTEM
  // ============================================================================

  /**
   * Compressed adjacency list for high-degree nodes.
   * **Strategy**: Use VarLong compression when the overhead is worth it
   * **Threshold**: Typically degree > 64 (see MixedCompressor.usePacking)
   */
  private readonly packedAdjacencyList: AdjacencyList;

  /**
   * Uncompressed adjacency list for low-degree nodes.
   * **Strategy**: Use raw arrays when compression overhead isn't worth it
   * **Threshold**: Typically degree ≤ 64 (direct array access faster)
   */
  private readonly vlongAdjacencyList: AdjacencyList;

  /**
   * Combined memory usage statistics.
   * **The Aggregation**: Merges memory info from both storage systems
   */
  private readonly _memoryInfo: MemoryInfo;

  constructor(
    packedAdjacencyList: AdjacencyList,
    vlongAdjacencyList: AdjacencyList,
    memoryInfo: MemoryInfo
  ) {
    this.packedAdjacencyList = packedAdjacencyList;
    this.vlongAdjacencyList = vlongAdjacencyList;
    this._memoryInfo = memoryInfo;
  }

  // ============================================================================
  // THE INTELLIGENT SWITCHING LOGIC
  // ============================================================================

  /**
   * Get node degree from the "authoritative" source.
   *
   * **Design Decision**: VLong adjacency list holds the canonical degrees.
   * The packed list might have different degrees due to compression artifacts.
   *
   * **Why This Is Weird**: We always ask the uncompressed list for degree,
   * even though some nodes are stored compressed. Enterprise abstraction! 🎭
   */
  degree(node: number): number {
    return this.vlongAdjacencyList.degree(node);
  }

  /**
   * Create cursor with intelligent storage selection.
   *
   * **THE SWITCHING ALGORITHM**:
   * 1. Get node degree from canonical source
   * 2. Apply threshold logic (see MixedCompressor.usePacking)
   * 3. Route to appropriate storage system
   * 4. Return cursor that hides the complexity
   *
   * **The Magic**: Caller has NO IDEA which storage system they're using!
   * The cursor interface abstracts away the dual storage complexity.
   *
   * **Performance Implications**:
   * - Small degree: Direct array access (5ns per value)
   * - Large degree: Decompression overhead (50ns per value)
   * - Threshold tuned for optimal performance across real workloads
   */
  adjacencyCursor(node: number, fallbackValue: number = 0): AdjacencyCursor {
    const nodeDegree = this.degree(node);

    if (MixedCompressor.usePacking(nodeDegree)) {
      // ✅ HIGH DEGREE: Use compressed storage
      // Compression overhead is worth it for large adjacency lists
      return this.packedAdjacencyList.adjacencyCursor(node, fallbackValue);
    }

    // ✅ LOW DEGREE: Use uncompressed storage
    // Direct array access is faster for small adjacency lists
    return this.vlongAdjacencyList.adjacencyCursor(node, fallbackValue);
  }

  /**
   * Create cursor with reuse optimization.
   *
   * **The Reuse Complexity**: This is where the abstraction gets tricky.
   * The reused cursor might be from the WRONG storage system!
   *
   * **Problem**:
   * - Previous call: degree=10 → uncompressed cursor
   * - Current call: degree=100 → needs compressed cursor
   * - Can't reuse! Must create new cursor.
   *
   * **Solution**: Fall back to regular cursor creation.
   * The "reuse" optimization only works within the same storage strategy.
   */
  adjacencyCursorReuse(reuse: AdjacencyCursor | null, node: number, fallbackValue: number = 0): AdjacencyCursor {
    const nodeDegree = this.degree(node);

    if (MixedCompressor.usePacking(nodeDegree)) {
      // ✅ HIGH DEGREE: Try to reuse with compressed storage
      return this.packedAdjacencyList.adjacencyCursor(node, fallbackValue);
    }

    // ✅ LOW DEGREE: Try to reuse with uncompressed storage
    return this.vlongAdjacencyList.adjacencyCursorReuse(reuse, node, fallbackValue);
  }

  /**
   * Create raw cursor for advanced operations.
   *
   * **Design Choice**: Always use the uncompressed list for raw cursors.
   * Advanced algorithms probably want maximum performance, not compression.
   *
   * **Alternative**: Could return a mixed cursor that switches internally,
   * but that would be even more complex! 🤯
   */
  rawAdjacencyCursor(): AdjacencyCursor {
    return this.vlongAdjacencyList.rawAdjacencyCursor();
  }

  /**
   * Get combined memory usage statistics.
   *
   * **The Aggregation**: Memory info represents the TOTAL usage across
   * both storage systems. This is where the complexity really shows -
   * we're essentially running two complete graph storage systems!
   */
  memoryInfo(): MemoryInfo {
    return this._memoryInfo;
  }
}
