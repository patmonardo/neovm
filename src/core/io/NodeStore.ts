import { NodeLabel } from '@/projection';
import { GraphStore } from '@/api';
import { IdMap } from '@/api';
import { NodePropertyValues } from '@/api/properties/nodes';
import { HugeIntArray } from '@/collections';
import { IdentifierMapper } from './IdentifierMapper';

/**
 * Storage and access layer for node data in the GraphStore.
 * Provides efficient access to node labels, properties, and metadata
 * with support for label mapping and additional properties.
 */
export class NodeStore {
  private static readonly EMPTY_LABELS: string[] = [];

  private readonly _nodeCount: number;
  private readonly _labelCounts: HugeIntArray;
  private readonly _idMap: IdMap;
  private readonly _nodeProperties: Map<string, Map<string, NodePropertyValues>> | null;
  private readonly _additionalProperties: Map<string, (nodeId: number) => any>;
  private readonly _availableNodeLabels: Set<NodeLabel>;
  private readonly _hasLabelsFlag: boolean;
  private readonly _nodeLabelMapping: IdentifierMapper<NodeLabel>;

  private constructor(
    nodeCount: number,
    labelCounts: HugeIntArray,
    idMap: IdMap,
    hasLabels: boolean,
    nodeProperties: Map<string, Map<string, NodePropertyValues>> | null,
    additionalProperties: Map<string, (nodeId: number) => any>,
    nodeLabelMapping: IdentifierMapper<NodeLabel>
  ) {
    this._nodeCount = nodeCount;
    this._labelCounts = labelCounts;
    this._idMap = idMap;
    this._nodeProperties = nodeProperties;
    this._hasLabelsFlag = hasLabels;
    this._availableNodeLabels = idMap.availableNodeLabels();
    this._additionalProperties = additionalProperties;
    this._nodeLabelMapping = nodeLabelMapping;
  }

  /**
   * Factory method that creates a NodeStore from a GraphStore.
   *
   * @param graphStore The source GraphStore
   * @param additionalProperties Map of additional property functions
   * @param nodeLabelMapping Mapper for converting node labels to identifiers
   * @returns A new NodeStore instance
   */
  static of(
    graphStore: GraphStore,
    additionalProperties: Map<string, (nodeId: number) => any>,
    nodeLabelMapping: IdentifierMapper<NodeLabel>
  ): NodeStore {
    let labelCounts = HugeIntArray.of();

    const nodeLabels = graphStore.nodes();
    const nodeProperties = new Map<string, Map<string, NodePropertyValues>>();

    const hasNodeLabels = !graphStore.schema().nodeSchema().containsOnlyAllNodesLabel();

    if (hasNodeLabels) {
      labelCounts = HugeIntArray.newArray(graphStore.nodeCount());
      labelCounts.setAll((i: number) => {
        let labelCount = 0;
        for (const nodeLabel of nodeLabels.availableNodeLabels()) {
          if (nodeLabels.hasLabel(i, nodeLabel)) {
            labelCount++;
          }
        }
        return labelCount;
      });
    }

    // Build node properties map organized by label
    for (const label of graphStore.nodeLabels()) {
      const properties = this.getOrCreatePropertiesMap(nodeProperties, label.name());

      const propertySchemas = graphStore.schema().nodeSchema().propertySchemasFor(label);
      for (const propertySchema of propertySchemas) {
        properties.set(
          propertySchema.key(),
          graphStore.nodeProperty(propertySchema.key()).values()
        );
      }
    }

    return new NodeStore(
      graphStore.nodeCount(),
      labelCounts,
      nodeLabels,
      hasNodeLabels,
      nodeProperties.size > 0 ? nodeProperties : null,
      additionalProperties,
      nodeLabelMapping
    );
  }

  /**
   * Helper method to get or create properties map for a label.
   */
  private static getOrCreatePropertiesMap(
    nodeProperties: Map<string, Map<string, NodePropertyValues>>,
    labelName: string
  ): Map<string, NodePropertyValues> {
    let properties = nodeProperties.get(labelName);
    if (!properties) {
      properties = new Map<string, NodePropertyValues>();
      nodeProperties.set(labelName, properties);
    }
    return properties;
  }

  /**
   * Returns whether this store contains node labels.
   */
  hasLabels(): boolean {
    return this._hasLabelsFlag;
  }

  /**
   * Returns whether this store contains node properties.
   */
  hasProperties(): boolean {
    return this._nodeProperties !== null;
  }

  /**
   * Gets the total number of nodes.
   */
  nodeCount(): number {
    return this._nodeCount;
  }

  /**
   * Gets the ID map for node ID translations.
   */
  idMap(): IdMap {
    return this._idMap;
  }

  /**
   * Gets the map of additional property functions.
   */
  additionalProperties(): Map<string, (nodeId: number) => any> {
    return this._additionalProperties;
  }

  /**
   * Returns the number of distinct node labels.
   */
  labelCount(): number {
    return !this.hasLabels() ? 0 : this._idMap.availableNodeLabels().size;
  }

  /**
   * Gets the node label mapping strategy.
   */
  labelMapping(): IdentifierMapper<NodeLabel> {
    return this._nodeLabelMapping;
  }

  /**
   * Returns the total number of node properties across all labels.
   */
  propertyCount(): number {
    if (this._nodeProperties === null) {
      return 0;
    }

    let count = 0;
    for (const properties of this._nodeProperties.values()) {
      count += properties.size;
    }
    return count;
  }

  /**
   * Gets the labels for a specific node as string identifiers.
   *
   * @param nodeId The internal node ID
   * @returns Array of label identifiers for the node
   */
  labels(nodeId: number): string[] {
    const labelCount = this._labelCounts.get(nodeId);
    if (labelCount === 0) {
      return NodeStore.EMPTY_LABELS;
    }

    const labels: string[] = new Array(labelCount);
    let i = 0;

    for (const nodeLabel of this._availableNodeLabels) {
      if (this._idMap.hasLabel(nodeId, nodeLabel)) {
        labels[i++] = this._nodeLabelMapping.identifierFor(nodeLabel);
      }
    }

    return labels;
  }

  /**
   * Gets the node properties organized by label identifier.
   * Converts internal label objects to their string identifiers.
   *
   * @returns Map from label identifiers to their property maps
   */
  labelToNodeProperties(): Map<string, Map<string, NodePropertyValues>> {
    if (this._nodeProperties === null) {
      return new Map();
    }

    const result = new Map<string, Map<string, NodePropertyValues>>();

    for (const [labelName, properties] of this._nodeProperties) {
      const labelIdentifier = this._nodeLabelMapping.identifierFor(NodeLabel.of(labelName));
      result.set(labelIdentifier, properties);
    }

    return result;
  }

  /**
   * Returns a string representation of this NodeStore.
   */
  toString(): string {
    return `NodeStore{` +
      `nodeCount=${this._nodeCount}, ` +
      `hasLabels=${this._hasLabelsFlag}, ` +
      `hasProperties=${this.hasProperties()}, ` +
      `labelCount=${this.labelCount()}, ` +
      `propertyCount=${this.propertyCount()}` +
      `}`;
  }
}
