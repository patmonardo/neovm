/**
 * TOKEN-TO-LABEL MAPPING SYSTEM
 *
 * This class manages the bidirectional mapping between NodeLabel objects and integer tokens.
 *
 * WHY TOKENS?
 * - NodeLabels are complex objects with string names ("Person", "Company", etc.)
 * - String operations (comparison, hashing) are expensive at graph scale
 * - Integer tokens (0, 1, 2...) provide O(1) operations and cache-friendly storage
 * - For billion-node graphs, this optimization is critical for performance
 *
 * TWO STRATEGIES:
 * 1. FIXED: Pre-defined set of labels with assigned tokens (closed world)
 * 2. LAZY: Dynamic token assignment as new labels are encountered (open world)
 *
 * USAGE PATTERNS:
 * - Graph Construction: Assign tokens to labels during initial graph building
 * - Node Storage: Store integer tokens with nodes instead of full label objects
 * - Query Processing: Use token-based operations for filtering and traversal
 * - Memory Optimization: Dramatic reduction in memory usage for large graphs
 */

// import { NodeLabel } from "@/projection";
// import { ObjectIntMap } from "@/collections";
// import { StringFormatting } from "@/utils";

import {
  NodeLabel,
  ObjectIntMap,
  ObjectIntScatterMap,
  IntObjectHashMap,
  MutableInt,
  ANY_LABEL,
  NO_SUCH_LABEL,
  StringFormatting,
} from "./tokenToNodeLabelsTypes";

/**
 * Abstract base class for token-to-label mapping strategies.
 *
 * CORE CONCEPT:
 * Maintains bidirectional mapping between NodeLabel objects and integer tokens:
 * - NodeLabel → int (for encoding: assign token when storing node)
 * - int → NodeLabel[] (for decoding: resolve token back to labels)
 *
 * MEMORY LAYOUT:
 * - nodeLabelToLabelTokenMap: NodeLabel → int (forward mapping)
 * - labelTokenToNodeLabelMap: int → NodeLabel[] (reverse mapping)
 *
 * The reverse mapping returns arrays because some tokens might represent
 * multiple labels in advanced scenarios (though typically 1:1).
 */
export abstract class TokenToNodeLabels {
  /** Forward mapping: NodeLabel → integer token */
  protected readonly nodeLabelToLabelTokenMap: ObjectIntMap<NodeLabel>;

  /** Reverse mapping: integer token → NodeLabel array */
  protected readonly labelTokenToNodeLabelMap: IntObjectHashMap<NodeLabel[]>;

  /**
   * Create a FIXED token mapping for a predefined set of labels.
   *
   * FIXED STRATEGY:
   * - Closed world: only specified labels are allowed
   * - Tokens assigned sequentially (0, 1, 2...) except for special cases
   * - NodeLabel.ALL_NODES gets special ANY_LABEL token
   * - Attempting to get token for unknown label throws error
   *
   * USE WHEN:
   * - You know all possible labels in advance
   * - Schema is fixed and controlled
   * - Want strict validation of allowed labels
   *
   * @param nodeLabels Complete set of labels that will be used
   * @returns Fixed token mapper with pre-assigned tokens
   */
  public static fixed(nodeLabels: NodeLabel[]): TokenToNodeLabels {
    const elementIdentifierLabelTokenMapping: ObjectIntScatterMap<NodeLabel> =
      new Map();
    const labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]> = new Map();
    const labelTokenCounter = new MutableInt(0);

    nodeLabels.forEach((nodeLabel) => {
      // Special case: ALL_NODES gets the reserved ANY_LABEL token
      const labelToken =
        nodeLabel === NodeLabel.ALL_NODES
          ? ANY_LABEL // Special reserved token for "all nodes"
          : labelTokenCounter.getAndIncrement(); // Sequential: 0, 1, 2...

      elementIdentifierLabelTokenMapping.set(nodeLabel, labelToken);
      labelTokenNodeLabelMapping.set(labelToken, [nodeLabel]);
    });

    return new Fixed(
      elementIdentifierLabelTokenMapping,
      labelTokenNodeLabelMapping
    );
  }

  /**
   * Create a LAZY token mapping that assigns tokens on-demand.
   *
   * LAZY STRATEGY:
   * - Open world: new labels can be encountered dynamically
   * - Tokens assigned on first encounter with getOrCreateToken()
   * - Sequential assignment starting from 0
   * - No validation - any label is accepted
   *
   * USE WHEN:
   * - Label set is unknown or dynamic
   * - Importing data with varying schemas
   * - Exploratory data analysis scenarios
   * - Want flexibility over strict validation
   *
   * @returns Lazy token mapper that creates tokens on demand
   */
  public static lazy(): TokenToNodeLabels {
    return new Lazy();
  }

  /** Protected constructors for subclass instantiation */
  protected constructor();
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  );
  protected constructor(
    nodeLabelToLabelTokenMap?: ObjectIntMap<NodeLabel>,
    labelTokenToNodeLabelMap?: IntObjectHashMap<NodeLabel[]>
  ) {
    if (nodeLabelToLabelTokenMap && labelTokenToNodeLabelMap) {
      // Fixed strategy: use provided mappings
      this.nodeLabelToLabelTokenMap = nodeLabelToLabelTokenMap;
      this.labelTokenToNodeLabelMap = labelTokenToNodeLabelMap;
    } else {
      // Lazy strategy: initialize empty mappings
      this.nodeLabelToLabelTokenMap = new Map();
      this.labelTokenToNodeLabelMap = new Map();
    }
  }

  /**
   * Get the complete token-to-label mapping.
   *
   * USAGE:
   * - Export current mapping state
   * - Serialize token assignments
   * - Debug token allocation
   * - Provide to other graph components that need token resolution
   *
   * @returns Complete mapping from integer tokens to NodeLabel arrays
   */
  public labelTokenNodeLabelMapping(): IntObjectHashMap<NodeLabel[]> {
    return this.labelTokenToNodeLabelMap;
  }

  /**
   * Get or create an integer token for the given NodeLabel.
   *
   * CORE OPERATION:
   * This is the main interface for token assignment/retrieval.
   * Behavior depends on strategy:
   * - FIXED: Returns existing token or throws error for unknown labels
   * - LAZY: Returns existing token or creates new one for unknown labels
   *
   * PERFORMANCE:
   * - O(1) hash map lookup for existing tokens
   * - O(1) insertion for new tokens (lazy mode)
   * - Critical path operation - must be fast
   *
   * @param nodeLabel The NodeLabel to get/create a token for
   * @returns Integer token representing this label
   * @throws Error if label not allowed (Fixed strategy only)
   */
  public abstract getOrCreateToken(nodeLabel: NodeLabel): number;
}

/**
 * FIXED STRATEGY IMPLEMENTATION
 *
 * Enforces a closed-world assumption: only pre-defined labels are allowed.
 * Provides strict validation but no flexibility for dynamic schemas.
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Token lookup: O(1) hash map access
 * - Memory usage: Fixed, known at construction time
 * - Validation: Immediate error for unknown labels
 *
 * THREAD SAFETY:
 * - Immutable after construction (read-only operations)
 * - Safe for concurrent access without synchronization
 */
class Fixed extends TokenToNodeLabels {
  constructor(
    elementIdentifierLabelTokenMapping: ObjectIntMap<NodeLabel>,
    labelTokenNodeLabelMapping: IntObjectHashMap<NodeLabel[]>
  ) {
    super(elementIdentifierLabelTokenMapping, labelTokenNodeLabelMapping);
  }

  /**
   * Get token for a NodeLabel (Fixed strategy).
   *
   * BEHAVIOR:
   * - Returns pre-assigned token if label was provided at construction
   * - Throws error if label was not in the original set
   * - No new tokens are ever created
   *
   * ERROR CONDITIONS:
   * - Unknown label: Indicates programming error or schema mismatch
   * - Helps catch typos and invalid label usage early
   *
   * @param nodeLabel Label to get token for
   * @returns Pre-assigned integer token
   * @throws Error if label was not in the original fixed set
   */
  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    if (!this.nodeLabelToLabelTokenMap.has(nodeLabel)) {
      throw new Error(
        StringFormatting.formatWithLocale(
          "No token was specified for node label %s. Available labels must be provided at construction time for Fixed strategy.",
          nodeLabel.toString()
        )
      );
    }
    return this.nodeLabelToLabelTokenMap.get(nodeLabel)!;
  }
}

/**
 * LAZY STRATEGY IMPLEMENTATION
 *
 * Implements open-world assumption: new labels can be encountered and
 * will automatically receive new tokens. Provides maximum flexibility
 * but no validation of label correctness.
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Token lookup: O(1) for existing labels
 * - Token creation: O(1) for new labels
 * - Memory usage: Grows with number of unique labels encountered
 *
 * THREAD SAFETY:
 * - NOT thread-safe due to token creation
 * - Requires external synchronization for concurrent access
 * - nextLabelId increment is not atomic
 */
class Lazy extends TokenToNodeLabels {
  /** Counter for assigning sequential tokens (0, 1, 2...) */
  private nextLabelId: number;

  constructor() {
    super(); // Initialize empty mappings
    this.nextLabelId = 0;
  }

  /**
   * Get or create token for a NodeLabel (Lazy strategy).
   *
   * BEHAVIOR:
   * - Returns existing token if label has been seen before
   * - Creates new sequential token if label is encountered for first time
   * - Updates both forward and reverse mappings
   * - Never fails - always returns a valid token
   *
   * TOKEN ASSIGNMENT:
   * - Sequential integers starting from 0
   * - Tokens are never reused or recycled
   * - Order depends on first encounter, not label name
   *
   * SIDE EFFECTS:
   * - Modifies internal mappings for new labels
   * - Increments nextLabelId counter
   * - Not idempotent for new labels (but consistent results)
   *
   * @param nodeLabel Label to get/create token for
   * @returns Integer token (existing or newly created)
   */
  public override getOrCreateToken(nodeLabel: NodeLabel): number {
    // Check if we already have a token for this label
    let token = this.nodeLabelToLabelTokenMap.get(nodeLabel);

    // Handle undefined as NO_SUCH_LABEL (mimics Java HPPC getOrDefault behavior)
    if (token === undefined) {
      token = NO_SUCH_LABEL;
    }

    // Create new token if this is the first time we've seen this label
    if (token === NO_SUCH_LABEL) {
      token = this.nextLabelId++; // Assign sequential token

      // Update both mappings
      this.labelTokenToNodeLabelMap.set(token, [nodeLabel]);
      this.nodeLabelToLabelTokenMap.set(nodeLabel, token);
    }

    return token;
  }
}
