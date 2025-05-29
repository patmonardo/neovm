/**
 * Mixed Adjacency Properties - The Property Coupling Incantation
 *
 * **The High Priest's Secret**: Properties are no longer independent!
 * They're forever bound to their adjacency list, creating a coupling
 * that "breaks GDS Graph structure" in subtle, magical ways.
 *
 * **The Single Property Type Constraint**:
 * Each relationship type can have exactly ONE property type:
 * - FOLLOWS relationships → weight (double)
 * - LIKES relationships → timestamp (long)
 * - KNOWS relationships → strength (double)
 *
 * **Why This Matters**:
 * - Simple graphs: "I need the weight of edge A→B"
 * - Complex graphs: "I need weight AND timestamp of edge A→B" ❌ Not supported!
 *
 * **The Coupling Spell**: Properties can ONLY be accessed by asking
 * the adjacency list for the degree first. No direct property access!
 */

import { AdjacencyList } from '../../api/AdjacencyList';
import { AdjacencyProperties } from '../../api/AdjacencyProperties';
import { PropertyCursor } from '../../api/properties/relationships/PropertyCursor';
import { MixedCompressor } from './MixedCompressor';

export class MixedAdjacencyProperties implements AdjacencyProperties {

  // ============================================================================
  // THE MAGICAL TRINITY
  // ============================================================================

  /**
   * The adjacency list that holds the canonical degrees.
   * **The Coupling**: Properties CANNOT be accessed without consulting this first!
   *
   * **Why This Is Weird**: In normal GDS, you could access properties directly:
   * `properties.get(nodeA, nodeB)` - Simple, direct access
   *
   * **In Mixed Strategy**: You MUST go through adjacency list:
   * `adjacencyList.degree(nodeA)` → then route to correct property storage
   *
   * **The Breaking Point**: This coupling means properties can't be optimized
   * independently of adjacency lists. They're forever intertwined! 🔗
   */
  private readonly adjacencyList: AdjacencyList;

  /**
   * Compressed property storage for high-degree nodes.
   * **For**: Nodes where degree > threshold (typically 64)
   * **Storage**: Compressed alongside compressed adjacency lists
   */
  private readonly packedAdjacencyProperties: AdjacencyProperties;

  /**
   * Uncompressed property storage for low-degree nodes.
   * **For**: Nodes where degree ≤ threshold
   * **Storage**: Raw arrays alongside uncompressed adjacency lists
   */
  private readonly vlongAdjacencyProperties: AdjacencyProperties;

  constructor(
    adjacencyList: AdjacencyList,
    packedAdjacencyProperties: AdjacencyProperties,
    vlongAdjacencyProperties: AdjacencyProperties
  ) {
    this.adjacencyList = adjacencyList;
    this.packedAdjacencyProperties = packedAdjacencyProperties;
    this.vlongAdjacencyProperties = vlongAdjacencyProperties;
  }

  // ============================================================================
  // THE COUPLING INCANTATIONS
  // ============================================================================

  /**
   * Create property cursor with degree-based routing.
   *
   * **The Incantation Process**:
   * 1. Ask adjacency list for node degree (REQUIRED step!)
   * 2. Apply threshold magic (MixedCompressor.usePacking)
   * 3. Route to appropriate property storage
   * 4. Return cursor that hides the complexity
   *
   * **The Single Property Type Reality**:
   * This cursor will iterate over exactly ONE type of property value:
   * - Social network: edge weights (how much you like someone)
   * - Citation network: publication years (when paper was cited)
   * - Transport network: travel times (minutes between stations)
   *
   * **NOT SUPPORTED**: Multiple properties per edge
   * - Can't have weight AND timestamp on same edge
   * - Each relationship type = exactly one property type
   * - Want multiple properties? Create multiple relationship types! 🤯
   */
  propertyCursor(node: number, fallbackValue: number = 0): PropertyCursor {
    // ✅ THE COUPLING: Must consult adjacency list first!
    const nodeDegree = this.adjacencyList.degree(node);

    if (MixedCompressor.usePacking(nodeDegree)) {
      // ✅ HIGH DEGREE: Use compressed property storage
      return this.packedAdjacencyProperties.propertyCursor(node, fallbackValue);
    }

    // ✅ LOW DEGREE: Use uncompressed property storage
    return this.vlongAdjacencyProperties.propertyCursor(node, fallbackValue);
  }

  /**
   * Create property cursor with reuse optimization.
   *
   * **The Reuse Complication**: Same issue as adjacency cursors.
   * If the node switched storage strategies between calls, we can't
   * reuse the cursor across the boundary.
   *
   * **Example Problem**:
   * - Call 1: node degree = 50 → uncompressed cursor created
   * - Call 2: different node degree = 200 → need compressed cursor
   * - Can't reuse! Must create new cursor.
   *
   * **Why Reuse Matters**: Property cursors can be expensive to create
   * in hot graph algorithm loops. Reuse is a critical optimization.
   */
  propertyCursorReuse(reuse: PropertyCursor | null, node: number, fallbackValue: number = 0): PropertyCursor {
    const nodeDegree = this.adjacencyList.degree(node);

    if (MixedCompressor.usePacking(nodeDegree)) {
      // ✅ HIGH DEGREE: Route to compressed (can't reuse across boundaries)
      return this.packedAdjacencyProperties.propertyCursor(node, fallbackValue);
    }

    // ✅ LOW DEGREE: Route to uncompressed (try to reuse)
    return this.vlongAdjacencyProperties.propertyCursor(reuse, node, fallbackValue);
  }

  /**
   * Create raw property cursor for advanced operations.
   *
   * **Design Choice**: Always use uncompressed storage for raw cursors.
   * Advanced algorithms that need raw cursors probably prioritize
   * performance over memory usage.
   *
   * **The Assumption**: If you're asking for a raw cursor, you want
   * the fastest possible access, not the most memory-efficient.
   */
  rawPropertyCursor(): PropertyCursor {
    return this.vlongAdjacencyProperties.rawPropertyCursor();
  }
}
