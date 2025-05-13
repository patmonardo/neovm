import { IntObjectMap } from '../collections/IntObjectMap'; // Adjust path
import { NodeLabel } from '../NodeLabel'; // Adjust path
import { RawValues } from '../utils/RawValues'; // Adjust path
import { Optional } from '../utils/Optional'; // Adjust path
import { IdMapBuilder } from './IdMapBuilder';
import { LabelInformation } from './LabelInformation';
import { NodeLabelTokenSet } from './NodeLabelTokenSet';
import { NodesBatchBuffer } from './NodesBatchBuffer';
import { IdMapAllocator } from './IdMapAllocator';

/**
 * Reads properties for a single node.
 */
export interface PropertyReader<PROPERTY_REF> {
  /**
   * Reads and processes properties for a given node.
   * @param nodeReference The original reference/ID of the node (long in Java).
   * @param labelTokens The set of label tokens for this node.
   * @param propertiesReference A reference to the properties data for this node.
   * @returns The number of properties successfully read/imported for this node (int in Java).
   */
  readProperty(nodeReference: number, labelTokens: NodeLabelTokenSet, propertiesReference: PROPERTY_REF): number;
}

/**
 * A function that extracts a node ID from a batch at a given position.
 */
interface IdFunction {
  apply(batch: number[], pos: number): number;
}

export class NodeImporter {
  private readonly idMapBuilder: IdMapBuilder;
  private readonly labelInformationBuilder: LabelInformation.Builder;
  private readonly labelTokenNodeLabelMapping: Optional<IntObjectMap<NodeLabel[]>>;
  private readonly importPropertiesFlag: boolean; // Renamed from importProperties to avoid conflict

  /**
   * Helper static method to import properties for a batch of nodes.
   */
  private static importProperties<PROPERTY_REF>(
    reader: PropertyReader<PROPERTY_REF>,
    batch: number[],
    properties: PROPERTY_REF[],
    labelTokens: NodeLabelTokenSet[],
    length: number
  ): number {
    let batchImportedProperties = 0;
    for (let i = 0; i < length; i++) {
      batchImportedProperties += reader.readProperty(
        batch[i],
        labelTokens[i],
        properties[i]
      );
    }
    return batchImportedProperties;
  }

  /**
   * Constructs a NodeImporter.
   * The @Builder.Constructor annotation in Java suggests this might be typically called by a builder.
   * @param idMapBuilder Builder for the ID map.
   * @param labelInformationBuilder Builder for label information.
   * @param labelTokenNodeLabelMapping Optional mapping from label tokens to NodeLabel arrays.
   * @param importPropertiesFlag Whether to import properties.
   */
  constructor(
    idMapBuilder: IdMapBuilder,
    labelInformationBuilder: LabelInformation.Builder,
    labelTokenNodeLabelMapping: Optional<IntObjectMap<NodeLabel[]>>,
    importPropertiesFlag: boolean
  ) {
    this.idMapBuilder = idMapBuilder;
    this.labelInformationBuilder = labelInformationBuilder;
    this.labelTokenNodeLabelMapping = labelTokenNodeLabelMapping;
    this.importPropertiesFlag = importPropertiesFlag;
  }

  /**
   * Imports nodes from the given buffer, using the configured token-to-NodeLabel mapping.
   * @throws Error if token-to-NodeLabel mapping is required but not provided.
   */
  public importNodes<PROPERTY_REF>(
    buffer: NodesBatchBuffer<PROPERTY_REF>,
    reader: PropertyReader<PROPERTY_REF>
  ): number {
    const tokenToLabelMap = this.labelTokenNodeLabelMapping.orElseThrow(
      () => new Error("Missing Token-to-NodeLabel mapping") // IllegalStateException in Java
    );
    return this._importNodesInternal(buffer, tokenToLabelMap, reader);
  }

  /**
   * Imports nodes from the given buffer using the provided token-to-NodeLabel mapping.
   * This is the core import logic.
   */
  private _importNodesInternal<PROPERTY_REF>(
    buffer: NodesBatchBuffer<PROPERTY_REF>,
    tokenToNodeLabelsMap: IntObjectMap<NodeLabel[]>,
    reader: PropertyReader<PROPERTY_REF>
  ): number {
    let batchLength = buffer.length();
    if (batchLength === 0) {
      return 0n;
    }

    const idMapAllocator: IdMapAllocator = this.idMapBuilder.allocate(batchLength);

    // Adjust batchLength based on actual allocation, as graph size might change during loading.
    batchLength = idMapAllocator.allocatedSize();

    if (batchLength === 0) {
      return 0n;
    }

    const batchNodeIds = buffer.batch();
    const properties = buffer.propertyReferences();
    const labelTokensArray = buffer.labelTokens();

    // Import node IDs
    idMapAllocator.insert(batchNodeIds); // Assumes insert considers only up to batchLength (or allocatedSize)

    // Import node labels
    if (buffer.hasLabelInformation()) {
      this.setNodeLabelInformation(
        batchNodeIds,
        batchLength,
        labelTokensArray,
        (nodeIds, pos) => nodeIds[pos], // Simple IdFunction
        tokenToNodeLabelsMap
      );
    }

    // Import node properties
    const importedPropertiesCount = this.importPropertiesFlag
      ? NodeImporter.importProperties(reader, batchNodeIds, properties, labelTokensArray, batchLength)
      : 0;

    // Combine batchLength (nodes imported) and importedPropertiesCount into a single number
    return RawValues.combineIntInt(batchLength, importedPropertiesCount);
  }

  private setNodeLabelInformation(
    batchNodeIds: number[],
    batchLength: number,
    labelIdsPerNode: NodeLabelTokenSet[],
    idFunction: IdFunction,
    tokenToNodeLabelsMap: IntObjectMap<NodeLabel[]>
  ): void {
    // Ensure we don't go out of bounds if labelIds.length is less than batchLength
    const cappedBatchLength = Math.min(labelIdsPerNode.length, batchLength);

    for (let i = 0; i < cappedBatchLength; i++) {
      const nodeId = idFunction.apply(batchNodeIds, i); // Get the actual node ID
      const labelTokensForNode = labelIdsPerNode[i];

      if (!labelTokensForNode) continue; // Safety check

      for (let j = 0; j < labelTokensForNode.length(); j++) {
        const token = labelTokensForNode.get(j);
        // Collections.emptyList() in Java becomes an empty array [] here
        const nodeLabels = tokenToNodeLabelsMap.getOrDefault(token, []);
        for (const nodeLabel of nodeLabels) {
          this.labelInformationBuilder.addNodeIdToLabel(nodeLabel, nodeId);
        }
      }
    }
  }
}
