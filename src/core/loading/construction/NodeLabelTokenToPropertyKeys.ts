import { NodeLabel } from '@/projection';
import { NodeSchema, PropertySchema } from '@/api/schema';
import { StringJoining } from '@/utils';
import { NodeLabelToken } from './NodeLabelToken';
import { NodeLabelTokens } from './NodeLabelTokens';

/**
 * Abstract mapping between node label tokens and their associated property keys.
 * Supports both lazy (inferred from data) and fixed (schema-based) modes.
 */
export abstract class NodeLabelTokenToPropertyKeys {

  /**
   * Creates a thread-safe, mutable mapping.
   * The property schemas are inferred from the input data.
   */
  static lazy(): NodeLabelTokenToPropertyKeys {
    return new LazyNodeLabelTokenToPropertyKeys();
  }

  /**
   * Creates thread-safe, immutable mapping.
   * The property schemas are inferred from given schema.
   */
  static fixed(nodeSchema: NodeSchema): NodeLabelTokenToPropertyKeys {
    return new FixedNodeLabelTokenToPropertyKeys(nodeSchema);
  }

  /**
   * Assign the given property keys to the given label token.
   * If the token is already present, the property keys are added with set semantics.
   */
  abstract add(nodeLabelToken: NodeLabelToken, propertyKeys: Iterable<string>): void;

  /**
   * Returns all node labels in this mapping.
   */
  abstract nodeLabels(): Set<NodeLabel>;

  /**
   * Return the property schemas for the given node label.
   */
  abstract propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema>;

  /**
   * Computes the union of the two given mappings without
   * changing the contents of the mappings themselves.
   */
  static union(
    left: NodeLabelTokenToPropertyKeys,
    right: NodeLabelTokenToPropertyKeys,
    importPropertySchemas: Map<string, PropertySchema>
  ): NodeLabelTokenToPropertyKeys {
    const union = NodeLabelTokenToPropertyKeys.lazy();

    // Add all mappings from left
    for (const nodeLabel of left.nodeLabels()) {
      const propertyKeys = Array.from(left.propertySchemas(nodeLabel, importPropertySchemas).keys());
      union.add(NodeLabelTokens.ofNodeLabel(nodeLabel), propertyKeys);
    }

    // Add all mappings from right
    for (const nodeLabel of right.nodeLabels()) {
      const propertyKeys = Array.from(right.propertySchemas(nodeLabel, importPropertySchemas).keys());
      union.add(NodeLabelTokens.ofNodeLabel(nodeLabel), propertyKeys);
    }

    return union;
  }
}

/**
 * Fixed (immutable) implementation based on predefined schema.
 */
class FixedNodeLabelTokenToPropertyKeys extends NodeLabelTokenToPropertyKeys {
  private readonly nodeSchema: NodeSchema;

  constructor(nodeSchema: NodeSchema) {
    super();
    this.nodeSchema = nodeSchema;
  }

  add(nodeLabelToken: NodeLabelToken, propertyKeys: Iterable<string>): void {
    // silence is golden - fixed schema doesn't allow modifications
  }

  nodeLabels(): Set<NodeLabel> {
    return this.nodeSchema.availableLabels();
  }

  propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema> {
    const userDefinedPropertySchemas = this.nodeSchema.get(nodeLabel).properties();

    // Find overlap between user-defined schema and imported data
    const overlap = new Set<string>();
    for (const key of importPropertySchemas.keys()) {
      if (userDefinedPropertySchemas.has(key)) {
        overlap.add(key);
      }
    }

    // Validate that all schema properties are present in import data
    if (overlap.size < userDefinedPropertySchemas.size) {
      const missingKeys = new Set(userDefinedPropertySchemas.keys());
      for (const key of overlap) {
        missingKeys.delete(key);
      }

      throw new Error(
        "Missing node properties during import. " +
        "The following keys were part of the schema, " +
        "but not contained in the input data: " +
        StringJoining.join(Array.from(missingKeys))
      );
    }

    // Validate type compatibility between schema and import data
    const keysWithIncompatibleTypes = new Set<string>();
    for (const propertyKey of overlap) {
      const schemaProperty = userDefinedPropertySchemas.get(propertyKey)!;
      const importProperty = importPropertySchemas.get(propertyKey)!;

      if (!schemaProperty.valueType().isCompatibleWith(importProperty.valueType())) {
        keysWithIncompatibleTypes.add(propertyKey);
      }
    }

    if (keysWithIncompatibleTypes.size > 0) {
      throw new Error(
        "Incompatible value types between input schema and input data. " +
        "The following keys have incompatible types: " +
        StringJoining.join(Array.from(keysWithIncompatibleTypes))
      );
    }

    return userDefinedPropertySchemas;
  }
}

/**
 * Lazy (mutable) implementation that builds mapping from input data.
 */
class LazyNodeLabelTokenToPropertyKeys extends NodeLabelTokenToPropertyKeys {
  private readonly labelToPropertyKeys: Map<NodeLabelToken, Set<string>>;

  constructor() {
    super();
    this.labelToPropertyKeys = new Map();
  }

  add(nodeLabelToken: NodeLabelToken, propertyKeys: Iterable<string>): void {
    let existingKeys = this.labelToPropertyKeys.get(nodeLabelToken);
    if (!existingKeys) {
      existingKeys = new Set<string>();
      this.labelToPropertyKeys.set(nodeLabelToken, existingKeys);
    }

    // Add all property keys with set semantics
    for (const propertyKey of propertyKeys) {
      existingKeys.add(propertyKey);
    }
  }

  nodeLabels(): Set<NodeLabel> {
    const nodeLabels = new Set<NodeLabel>();

    for (const nodeLabelToken of this.labelToPropertyKeys.keys()) {
      if (nodeLabelToken.isEmpty()) {
        // Empty token represents ALL_NODES
        nodeLabels.add(NodeLabel.ALL_NODES);
      } else {
        // Add all labels from this token
        const tokenSize = nodeLabelToken.size();
        for (let i = 0; i < tokenSize; i++) {
          nodeLabels.add(nodeLabelToken.get(i));
        }
      }
    }

    return nodeLabels;
  }

  propertySchemas(
    nodeLabel: NodeLabel,
    importPropertySchemas: Map<string, PropertySchema>
  ): Map<string, PropertySchema> {
    const resultSchemas = new Map<string, PropertySchema>();

    // Find all tokens that contain the requested node label
    for (const [nodeLabelToken, propertyKeys] of this.labelToPropertyKeys) {
      if (this.tokenContainsLabel(nodeLabelToken, nodeLabel)) {
        // Add all property schemas for this token
        for (const propertyKey of propertyKeys) {
          const propertySchema = importPropertySchemas.get(propertyKey);
          if (propertySchema && !resultSchemas.has(propertyKey)) {
            resultSchemas.set(propertyKey, propertySchema);
          }
        }
      }
    }

    return resultSchemas;
  }

  /**
   * Check if a node label token contains the specified label.
   */
  private tokenContainsLabel(nodeLabelToken: NodeLabelToken, nodeLabel: NodeLabel): boolean {
    // Handle empty token (ALL_NODES case)
    if (nodeLabelToken.isEmpty() && nodeLabel === NodeLabel.ALL_NODES) {
      return true;
    }

    // Check if any label in the token matches
    const tokenSize = nodeLabelToken.size();
    for (let i = 0; i < tokenSize; i++) {
      if (nodeLabelToken.get(i).equals(nodeLabel)) {
        return true;
      }
    }

    return false;
  }
}
