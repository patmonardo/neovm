import { NodeLabel } from '@/api';
import { FilteredIdMap, IdMap, LabeledIdMap, NodeLabelConsumer } from '@/api/graph';

/**
 * A labeled ID map that applies filtering through a two-level mapping chain.
 *
 * Mapping Chain: Original → Root → Filtered
 *
 * - originalToRootIdMap: Maps from original node IDs to root graph node IDs
 * - rootToFilteredIdMap: Maps from root graph node IDs to filtered subset node IDs
 *
 * This allows creating filtered views of graphs while maintaining proper ID mappings
 * and label information.
 */
export class FilteredLabeledIdMap extends LabeledIdMap implements FilteredIdMap {
  private readonly originalToRootIdMap: IdMap;
  private readonly rootToFilteredIdMap: IdMap;

  constructor(originalToRootIdMap: IdMap, rootToFilteredIdMap: LabeledIdMap) {
    super(rootToFilteredIdMap.labelInformation(), rootToFilteredIdMap.nodeCount());
    this.originalToRootIdMap = originalToRootIdMap;
    this.rootToFilteredIdMap = rootToFilteredIdMap;
  }

  typeId(): string {
    return this.originalToRootIdMap.typeId();
  }

  rootNodeCount(): number | undefined {
    return this.originalToRootIdMap.rootNodeCount();
  }

  /**
   * Convert filtered node ID to root node ID.
   */
  toRootNodeId(filteredNodeId: number): number {
    return this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
  }

  /**
   * Convert root node ID to filtered node ID.
   */
  toFilteredNodeId(rootNodeId: number): number {
    return this.rootToFilteredIdMap.toMappedNodeId(rootNodeId);
  }

  /**
   * Convert filtered node ID all the way back to original node ID.
   * Chain: filtered → root → original
   */
  toOriginalNodeId(filteredNodeId: number): number {
    const rootNodeId = this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
    return this.originalToRootIdMap.toOriginalNodeId(rootNodeId);
  }

  /**
   * Convert original node ID all the way to filtered node ID.
   * Chain: original → root → filtered
   */
  toMappedNodeId(originalNodeId: number): number {
    const rootNodeId = this.originalToRootIdMap.toMappedNodeId(originalNodeId);
    return this.rootToFilteredIdMap.toMappedNodeId(rootNodeId);
  }

  /**
   * Check if original node ID exists in the filtered view.
   */
  containsOriginalId(originalNodeId: number): boolean {
    const rootNodeId = this.originalToRootIdMap.toMappedNodeId(originalNodeId);
    return this.rootToFilteredIdMap.containsOriginalId(rootNodeId);
  }

  /**
   * Get the highest original node ID in the system.
   */
  highestOriginalId(): number {
    return this.originalToRootIdMap.highestOriginalId();
  }

  /**
   * Check if a root node ID exists in the filtered view.
   */
  containsRootNodeId(rootNodeId: number): boolean {
    return this.rootToFilteredIdMap.containsOriginalId(rootNodeId);
  }

  /**
   * Get the root ID map (original → root mapping).
   */
  rootIdMap(): IdMap {
    return this.originalToRootIdMap;
  }

  /**
   * Get node labels for a filtered node ID.
   * Chains the lookup: filtered → root → original → labels
   */
  nodeLabels(filteredNodeId: number): NodeLabel[] {
    const rootNodeId = this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
    return this.originalToRootIdMap.nodeLabels(rootNodeId);
  }

  /**
   * Iterate over node labels for a filtered node ID.
   */
  forEachNodeLabel(filteredNodeId: number, consumer: NodeLabelConsumer): void {
    const rootNodeId = this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
    this.originalToRootIdMap.forEachNodeLabel(rootNodeId, consumer);
  }

  /**
   * Check if a filtered node has a specific label.
   */
  hasLabel(filteredNodeId: number, label: NodeLabel): boolean {
    const rootNodeId = this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
    return this.originalToRootIdMap.hasLabel(rootNodeId, label);
  }

  /**
   * Add a new node label to the system.
   */
  addNodeLabel(nodeLabel: NodeLabel): void {
    this.originalToRootIdMap.addNodeLabel(nodeLabel);
  }

  /**
   * Associate a filtered node ID with a label.
   * Chains the operation: filtered → root → original
   */
  addNodeIdToLabel(filteredNodeId: number, nodeLabel: NodeLabel): void {
    const rootNodeId = this.rootToFilteredIdMap.toOriginalNodeId(filteredNodeId);
    this.originalToRootIdMap.addNodeIdToLabel(rootNodeId, nodeLabel);
  }

  /**
   * Get mapping statistics and information.
   */
  getMappingStats(): FilteredMappingStats {
    return {
      originalNodeCount: this.originalToRootIdMap.nodeCount(),
      rootNodeCount: this.rootToFilteredIdMap.nodeCount(),
      filteredNodeCount: this.nodeCount(),
      highestOriginalId: this.highestOriginalId(),
      typeId: this.typeId(),
      filteringRatio: this.nodeCount() / this.originalToRootIdMap.nodeCount()
    };
  }

  /**
   * Validate the consistency of the mapping chain.
   */
  validateMappingChain(): ValidationResult {
    const issues: string[] = [];

    try {
      // Test that all filtered nodes can be mapped to valid original nodes
      for (let filteredId = 0; filteredId < this.nodeCount(); filteredId++) {
        const originalId = this.toOriginalNodeId(filteredId);
        const roundTripFiltered = this.toMappedNodeId(originalId);

        if (roundTripFiltered !== filteredId) {
          issues.push(`Round-trip mapping failed for filtered ID ${filteredId}`);
          break; // Don't spam with too many errors
        }
      }

      // Validate node counts make sense
      if (this.nodeCount() > this.rootToFilteredIdMap.nodeCount()) {
        issues.push('Filtered node count cannot exceed root node count');
      }

      const rootCount = this.rootNodeCount();
      if (rootCount !== undefined && this.rootToFilteredIdMap.nodeCount() > rootCount) {
        issues.push('Root-to-filtered node count cannot exceed original root count');
      }

    } catch (error) {
      issues.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      stats: this.getMappingStats()
    };
  }
}

/**
 * Factory for creating filtered labeled ID maps.
 */
export class FilteredLabeledIdMapFactory {
  /**
   * Create a filtered labeled ID map from two mapping layers.
   */
  static create(
    originalToRootIdMap: IdMap,
    rootToFilteredIdMap: LabeledIdMap
  ): FilteredLabeledIdMap {
    return new FilteredLabeledIdMap(originalToRootIdMap, rootToFilteredIdMap);
  }

  /**
   * Create a filtered ID map that applies a node filter predicate.
   */
  static createWithFilter(
    originalIdMap: LabeledIdMap,
    nodeFilter: (nodeId: number, labels: NodeLabel[]) => boolean
  ): FilteredLabeledIdMap {
    // Build the filtered mapping
    const filteredNodes: number[] = [];
    const rootToFilteredMapping = new Map<number, number>();

    for (let rootId = 0; rootId < originalIdMap.nodeCount(); rootId++) {
      const labels = originalIdMap.nodeLabels(rootId);
      if (nodeFilter(rootId, labels)) {
        const filteredId = filteredNodes.length;
        filteredNodes.push(rootId);
        rootToFilteredMapping.set(rootId, filteredId);
      }
    }

    // Create the root-to-filtered ID map
    const rootToFilteredIdMap = new ArrayBasedIdMap(
      filteredNodes,
      rootToFilteredMapping,
      originalIdMap.labelInformation()
    );

    return new FilteredLabeledIdMap(originalIdMap, rootToFilteredIdMap);
  }

  /**
   * Create a filtered ID map for specific node labels.
   */
  static createForLabels(
    originalIdMap: LabeledIdMap,
    allowedLabels: Set<NodeLabel>
  ): FilteredLabeledIdMap {
    return this.createWithFilter(originalIdMap, (nodeId, labels) =>
      labels.some(label => allowedLabels.has(label))
    );
  }

  /**
   * Create a filtered ID map for a specific ID range.
   */
  static createForIdRange(
    originalIdMap: LabeledIdMap,
    minId: number,
    maxId: number
  ): FilteredLabeledIdMap {
    return this.createWithFilter(originalIdMap, (nodeId, labels) =>
      nodeId >= minId && nodeId <= maxId
    );
  }
}

/**
 * Simple array-based ID map implementation for use in filtering.
 */
class ArrayBasedIdMap extends LabeledIdMap {
  private readonly filteredToRoot: number[];
  private readonly rootToFiltered: Map<number, number>;

  constructor(
    filteredToRoot: number[],
    rootToFiltered: Map<number, number>,
    labelInformation: any
  ) {
    super(labelInformation, filteredToRoot.length);
    this.filteredToRoot = [...filteredToRoot];
    this.rootToFiltered = new Map(rootToFiltered);
  }

  typeId(): string {
    return 'ArrayBasedIdMap';
  }

  toOriginalNodeId(mappedNodeId: number): number {
    if (mappedNodeId < 0 || mappedNodeId >= this.filteredToRoot.length) {
      throw new Error(`Invalid mapped node ID: ${mappedNodeId}`);
    }
    return this.filteredToRoot[mappedNodeId];
  }

  toMappedNodeId(originalNodeId: number): number {
    const mappedId = this.rootToFiltered.get(originalNodeId);
    if (mappedId === undefined) {
      throw new Error(`Original node ID ${originalNodeId} not found in mapping`);
    }
    return mappedId;
  }

  containsOriginalId(originalNodeId: number): boolean {
    return this.rootToFiltered.has(originalNodeId);
  }

  highestOriginalId(): number {
    return Math.max(...this.filteredToRoot);
  }

  nodeLabels(nodeId: number): NodeLabel[] {
    // This would typically delegate to the original label information
    return [];
  }

  forEachNodeLabel(nodeId: number, consumer: NodeLabelConsumer): void {
    // This would typically delegate to the original label information
  }

  hasLabel(nodeId: number, label: NodeLabel): boolean {
    // This would typically delegate to the original label information
    return false;
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    // This would typically delegate to the original label information
  }

  addNodeIdToLabel(nodeId: number, nodeLabel: NodeLabel): void {
    // This would typically delegate to the original label information
  }
}

/**
 * Statistics about a filtered mapping.
 */
export interface FilteredMappingStats {
  originalNodeCount: number;
  rootNodeCount: number;
  filteredNodeCount: number;
  highestOriginalId: number;
  typeId: string;
  filteringRatio: number;
}

/**
 * Result of mapping validation.
 */
export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  stats: FilteredMappingStats;
}
