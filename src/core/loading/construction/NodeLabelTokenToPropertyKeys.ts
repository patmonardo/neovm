/**
 * NODE LABEL TOKEN TO PROPERTY KEYS MAPPING
 *
 * This system manages the relationship between node labels and their associated
 * property keys during graph construction. It's a critical component for:
 *
 * - SCHEMA DISCOVERY: Learning which properties exist for each label
 * - SCHEMA VALIDATION: Ensuring imported data matches expected schema
 * - THREAD COORDINATION: Combining property mappings from multiple import threads
 * - FINAL SCHEMA BUILDING: Creating the complete NodeSchema from imported data
 *
 * TWO STRATEGIES:
 *
 * 1. LAZY (Discovery Mode):
 *    - Builds schema by observing imported data
 *    - Thread-safe accumulation of label → property mappings
 *    - Used when schema is unknown or flexible
 *
 * 2. FIXED (Validation Mode):
 *    - Validates imported data against predefined schema
 *    - Strict checking of property keys and value types
 *    - Used when schema is known and must be enforced
 *
 * USAGE IN CONSTRUCTION PIPELINE:
 * 1. Each import thread maintains its own mapping
 * 2. Properties are added as nodes are imported
 * 3. Union operation combines all thread mappings
 * 4. Final schema is built from complete mapping
 */

import { NodeLabel } from "@/projection";
import { NodeSchema, PropertySchema } from "@/api/schema";
import { join } from "@/utils";
import { NodeLabelToken, NodeLabelTokens } from "./NodeLabelTokens";

/**
 * Abstract base class for managing label-to-property-key mappings.
 *
 * CORE OPERATIONS:
 * - add(): Associate property keys with a label token
 * - nodeLabels(): Get all labels that have been registered
 * - propertySchemas(): Get property schemas for a specific label
 * - union(): Combine multiple mappings (static method)
 */
export abstract class NodeLabelTokenToPropertyKeys {
  /**
   * Create a thread-safe, mutable mapping for schema discovery.
   *
   * LAZY STRATEGY:
   * - Discovers property schemas from input data
   * - Thread-safe accumulation of mappings
   * - No validation - accepts any property keys
   * - Used when schema is unknown or flexible
   *
   * @returns Lazy mapping that builds schema from imported data
   */
  static lazy(): NodeLabelTokenToPropertyKeys {
    return new Lazy();
  }

  /**
   * Create a thread-safe, immutable mapping for schema validation.
   *
   * FIXED STRATEGY:
   * - Validates imported data against predefined schema
   * - Strict checking of property keys and value types
   * - Throws errors for missing or incompatible properties
   * - Used when schema is known and must be enforced
   *
   * @param nodeSchema Predefined schema to validate against
   * @returns Fixed mapping that validates imported data
   */
  static fixed(nodeSchema: NodeSchema): NodeLabelTokenToPropertyKeys {
    return new Fixed(nodeSchema);
  }

  /**
   * Associate property keys with a node label token.
   *
   * BEHAVIOR:
   * - Lazy: Accumulates property keys for each label
   * - Fixed: Ignores calls (schema is already defined)
   *
   * THREAD SAFETY:
   * - Must be safe for concurrent calls from multiple threads
   * - Uses set semantics (duplicate keys are merged)
   *
   * @param nodeLabelToken Label token to associate properties with
   * @param propertyKeys Property keys to associate with the label
   */
  abstract add(
    nodeLabelToken: NodeLabelToken,
    propertyKeys: Iterable<string>
  ): void;

  /**
   * Get all node labels that have been registered in this mapping.
   *
   * USAGE:
   * - Enumerate all labels for final schema building
   * - Discover what labels were actually imported
   * - Validate that expected labels were found
   *
   * @returns Set of all NodeLabels in this mapping
   */
  abstract nodeLabels(): Set<NodeLabel>;

  /**
   * Get property schemas for a specific node label.
   *
   * COMBINES:
   * - Label-to-property-key mappings (from this class)
   * - Property-key-to-schema mappings (from import process)
   *
   * RESULT:
   * - Complete property schemas for the given label
   * - Includes property key, value type, default value, state
   *
   * @param nodeLabel Label to get property schemas for
   * @param importPropertySchemas Map from property key to schema
   * @returns Map from property key to complete PropertySchema
   */
  abstract propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema>;

  /**
   * Compute the union of two mappings without modifying them.
   *
   * UNION ALGORITHM:
   * 1. Create new lazy mapping for result
   * 2. Add all left mapping's label → property associations
   * 3. Add all right mapping's label → property associations
   * 4. Set semantics automatically handles overlaps
   *
   * THREAD COORDINATION:
   * - Used to combine mappings from multiple import threads
   * - Each thread maintains its own mapping during import
   * - Union creates final mapping for schema building
   *
   * @param left First mapping to union
   * @param right Second mapping to union
   * @param importPropertySchemas Property schemas from import
   * @returns New mapping containing union of both inputs
   */
  static union(
    left: NodeLabelTokenToPropertyKeys,
    right: NodeLabelTokenToPropertyKeys,
    importPropertySchemas: Map<string, PropertySchema>
  ): NodeLabelTokenToPropertyKeys {
    const union = NodeLabelTokenToPropertyKeys.lazy();

    // Add all label-property associations from left mapping
    for (const nodeLabel of left.nodeLabels()) {
      const propertyKeys = left
        .propertySchemas(nodeLabel, importPropertySchemas)
        .keys();
      union.add(NodeLabelTokens.ofNodeLabels(nodeLabel), propertyKeys);
    }

    // Add all label-property associations from right mapping
    for (const nodeLabel of right.nodeLabels()) {
      const propertyKeys = right
        .propertySchemas(nodeLabel, importPropertySchemas)
        .keys();
      union.add(NodeLabelTokens.ofNodeLabels(nodeLabel), propertyKeys);
    }

    return union;
  }
}

/**
 * FIXED STRATEGY IMPLEMENTATION
 *
 * Validates imported data against a predefined NodeSchema.
 * Ensures that:
 * - All expected properties are present in imported data
 * - Property value types are compatible with schema
 * - No unexpected properties are encountered (strict mode)
 *
 * THREAD SAFETY:
 * - Immutable after construction (schema is read-only)
 * - Safe for concurrent access without synchronization
 * - All validation is done on read operations
 */
class Fixed extends NodeLabelTokenToPropertyKeys {
  constructor(private readonly nodeSchema: NodeSchema) {
    super();
  }

  /**
   * Fixed strategy ignores property key additions.
   * The schema is already defined and immutable.
   */
  add(nodeLabelToken: NodeLabelToken, propertyKeys: Iterable<string>): void {
    // Silence is golden - schema is already fixed
  }

  /**
   * Return all labels from the predefined schema.
   */
  nodeLabels(): Set<NodeLabel> {
    return this.nodeSchema.availableLabels();
  }

  /**
   * Validate imported data against predefined schema.
   *
   * VALIDATION PROCESS:
   * 1. Get expected property schemas from predefined schema
   * 2. Check that all expected properties exist in imported data
   * 3. Check that property value types are compatible
   * 4. Throw detailed errors for any mismatches
   *
   * COMPATIBILITY:
   * - Property keys must match exactly
   * - Value types must be compatible (not necessarily identical)
   * - Default values and property states don't need to match
   */
  propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema> {
    const userDefinedPropertySchemas = this.nodeSchema
      .get(nodeLabel)
      .properties();
    const importPropertyKeys = new Set(importPropertySchemas.keys());
    const schemaPropertyKeys = new Set(userDefinedPropertySchemas.keys());

    // Find overlap between expected and imported properties
    const overlap = new Set(
      [...importPropertyKeys].filter((key) => schemaPropertyKeys.has(key))
    );

    // Check for missing properties in imported data
    if (overlap.size < schemaPropertyKeys.size) {
      const missing = new Set(
        [...schemaPropertyKeys].filter((key) => !overlap.has(key))
      );
      throw new Error(
        `Missing node properties during import. ` +
          `The following keys were part of the schema, ` +
          `but not contained in the input data: ${join([
            ...missing,
          ])}`
      );
    }

    // Check for incompatible value types
    const incompatibleTypes = [...overlap].filter((propertyKey) => {
      const schemaValueType = userDefinedPropertySchemas
        .get(propertyKey)!
        .valueType();
      const importValueType = importPropertySchemas
        .get(propertyKey)!
        .valueType();
      return !schemaValueType.isCompatibleWith(importValueType);
    });

    if (incompatibleTypes.length > 0) {
      throw new Error(
        `Incompatible value types between input schema and input data. ` +
          `The following keys have incompatible types: ${join(
            incompatibleTypes
          )}`
      );
    }

    return userDefinedPropertySchemas;
  }
}

/**
 * LAZY STRATEGY IMPLEMENTATION
 *
 * Discovers schema by observing imported data patterns.
 * Builds up label-to-property mappings as data is imported.
 *
 * THREAD SAFETY:
 * - Uses Map.compute() for atomic updates
 * - Set operations for property keys provide natural deduplication
 * - Safe for concurrent access from multiple import threads
 *
 * MEMORY EFFICIENCY:
 * - Only stores property keys (strings), not full schemas
 * - Property schemas are looked up from import data on demand
 * - Minimal overhead during import phase
 */
class Lazy extends NodeLabelTokenToPropertyKeys {
  /** Map from label token to set of property keys associated with that token */
  private readonly labelToPropertyKeys = new Map<NodeLabelToken, Set<string>>();

  /**
   * Add property keys to a label token using thread-safe accumulation.
   *
   * THREAD SAFETY:
   * - Uses Map.compute() for atomic read-modify-write
   * - Set.add() operations are idempotent (safe for duplicates)
   * - Multiple threads can safely add properties to same label
   */
  add(nodeLabelToken: NodeLabelToken, propertyKeys: Iterable<string>): void {
    // Atomic update using compute function
    const currentKeys =
      this.labelToPropertyKeys.get(nodeLabelToken) ?? new Set<string>();

    // Add all new property keys to the set
    for (const propertyKey of propertyKeys) {
      currentKeys.add(propertyKey);
    }

    this.labelToPropertyKeys.set(nodeLabelToken, currentKeys);
  }

  /**
   * Extract all unique NodeLabels from the registered label tokens.
   *
   * LABEL EXTRACTION:
   * - Handles empty tokens (maps to ALL_NODES)
   * - Flattens multi-label tokens into individual labels
   * - Deduplicates labels across all tokens
   */
  nodeLabels(): Set<NodeLabel> {
    const allLabels = new Set<NodeLabel>();

    for (const nodeLabelToken of this.labelToPropertyKeys.keys()) {
      if (nodeLabelToken.isEmpty()) {
        // Empty token represents ALL_NODES
        allLabels.add(NodeLabel.ALL_NODES);
      } else {
        // Add all labels from this token
        for (const nodeLabel of nodeLabelToken) {
          allLabels.add(nodeLabel);
        }
      }
    }

    return allLabels;
  }

  /**
   * Get property schemas for a label by finding matching tokens.
   *
   * MATCHING ALGORITHM:
   * 1. Find all label tokens that contain the target label
   * 2. Collect property keys from all matching tokens
   * 3. Look up property schemas from import data
   * 4. Deduplicate overlapping properties (first-wins)
   *
   * SPECIAL CASES:
   * - Empty tokens match ALL_NODES label
   * - Multi-label tokens are checked element by element
   * - Property key collisions are resolved by first occurrence
   */
  propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema> {
    const result = new Map<string, PropertySchema>();

    // Find all tokens that contain this label
    for (const [nodeLabelToken, propertyKeys] of this.labelToPropertyKeys) {
      let tokenMatches = false;

      if (nodeLabelToken.isEmpty() && nodeLabel === NodeLabel.ALL_NODES) {
        // Empty token matches ALL_NODES
        tokenMatches = true;
      } else {
        // Check if any label in the token matches
        for (let i = 0; i < nodeLabelToken.size(); i++) {
          if (nodeLabelToken.get(i).equals(nodeLabel)) {
            tokenMatches = true;
            break;
          }
        }
      }

      // If token matches, add its property schemas
      if (tokenMatches) {
        for (const propertyKey of propertyKeys) {
          if (!result.has(propertyKey)) {
            const schema = importPropertySchemas.get(propertyKey);
            if (schema) {
              result.set(propertyKey, schema);
            }
          }
        }
      }
    }

    return result;
  }
}
