import { NodeLabel } from "@/projection";
import { RawValues } from "@/core/utils";
import { NodeLabelTokenSet } from "./NodeLabelTokenSet";
import { NodesBatchBuffer } from "./NodesBatchBuffer";
import { IdMapBuilder } from "./IdMapBuilder";
import { LabelInformation } from "./LabelInformation";

/**
 * Handles the import of nodes from batch buffers into the graph structure.
 * Orchestrates ID mapping, label assignment, and property import.
 *
 * This is a key component in the node loading pipeline that:
 * - Builds ID mappings from original to internal node IDs
 * - Associates nodes with their labels
 * - Imports node properties through configurable readers
 */
export class NodeImporter {
  private readonly idMapBuilder: IdMapBuilder;
  private readonly labelInformationBuilder: LabelInformation.Builder;
  private readonly labelTokenNodeLabelMapping?: Map<number, NodeLabel[]>;
  private readonly importProperties: boolean;

  constructor(config: NodeImporterConfig) {
    this.idMapBuilder = config.idMapBuilder;
    this.labelInformationBuilder = config.labelInformationBuilder;
    this.labelTokenNodeLabelMapping = config.labelTokenNodeLabelMapping;
    this.importProperties = config.importProperties ?? true;
  }

  /**
   * Import nodes from a batch buffer using the configured label mapping.
   */
  importNodes<PROPERTY_REF>(
    buffer: NodesBatchBuffer<PROPERTY_REF>,
    reader: NodeImporter.PropertyReader<PROPERTY_REF>
  ): number {
    if (!this.labelTokenNodeLabelMapping) {
      throw new Error("Missing Token-to-NodeLabel mapping");
    }
    return this.importNodesWithMapping(
      buffer,
      this.labelTokenNodeLabelMapping,
      reader
    );
  }

  /**
   * Import nodes from a batch buffer with explicit label mapping.
   */
  importNodesWithMapping<PROPERTY_REF>(
    buffer: NodesBatchBuffer<PROPERTY_REF>,
    tokenToNodeLabelsMap: Map<number, NodeLabel[]>,
    reader: NodeImporter.PropertyReader<PROPERTY_REF>
  ): number {
    let batchLength = buffer.length();
    if (batchLength === 0) {
      return 0;
    }

    // Allocate space in the ID map for this batch
    const idMapAllocator = this.idMapBuilder.allocate(batchLength);

    // Since we read the graph size in one transaction and load in multiple
    // different transactions, any new data that is being added during loading
    // will show up while scanning, but would not be accounted for when
    // sizing the data structures used for loading.
    //
    // The node loading part only accepts nodes that are within the
    // calculated capacity that we have available.
    batchLength = idMapAllocator.allocatedSize();

    if (batchLength === 0) {
      return 0;
    }

    const batch = buffer.batch();
    const properties = buffer.propertyReferences();
    const labelTokens = buffer.labelTokens();

    // Import node IDs
    idMapAllocator.insert(batch);

    // Import node labels
    if (buffer.hasLabelInformation()) {
      this.setNodeLabelInformation(
        batch,
        batchLength,
        labelTokens,
        (nodeIds, pos) => nodeIds[pos],
        tokenToNodeLabelsMap
      );
    }

    // Import node properties
    const importedProperties = this.importProperties
      ? NodeImporter.importProperties(
          reader,
          batch,
          properties,
          labelTokens,
          batchLength
        )
      : 0;

    return RawValues.combineIntInt(batchLength, importedProperties);
  }

  /**
   * Import properties for a batch of nodes.
   */
  private static importProperties<PROPERTY_REF>(
    reader: NodeImporter.PropertyReader<PROPERTY_REF>,
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
   * Set label information for nodes in the batch.
   */
  private setNodeLabelInformation(
    batch: number[],
    batchLength: number,
    labelIds: NodeLabelTokenSet[],
    idFunction: IdFunction,
    tokenToNodeLabelsMap: Map<number, NodeLabel[]>
  ): void {
    const cappedBatchLength = Math.min(labelIds.length, batchLength);

    for (let i = 0; i < cappedBatchLength; i++) {
      const nodeId = idFunction(batch, i);
      const labelTokensForNode = labelIds[i];

      for (let j = 0; j < labelTokensForNode.length(); j++) {
        const labelToken = labelTokensForNode.get(j);
        const nodeLabels = tokenToNodeLabelsMap.get(labelToken) || [];

        for (const nodeLabel of nodeLabels) {
          this.labelInformationBuilder.addNodeIdToLabel(nodeLabel, nodeId);
        }
      }
    }
  }

  /**
   * Get statistics about the import process.
   */
  getImportStats(): NodeImportStats {
    return {
      totalNodesProcessed: this.idMapBuilder.nodeCount(),
      labelsRegistered: this.labelInformationBuilder.labelCount(),
      propertiesImported: this.importProperties,
      idMapType: this.idMapBuilder.typeId(),
    };
  }
}

export namespace NodeImporter {
  /**
   * Interface for reading node properties during import.
   */
  export interface PropertyReader<PROPERTY_REF> {
    /**
     * Read properties for a single node.
     *
     * @param nodeReference    The node ID/reference
     * @param labelTokens      The label tokens for this node
     * @param propertiesReference Reference to the property data
     * @returns Number of properties imported for this node
     */
    readProperty(
      nodeReference: number,
      labelTokens: NodeLabelTokenSet,
      propertiesReference: PROPERTY_REF
    ): number;
  }

  /**
   * Factory for creating commonly used property readers.
   */
  export class PropertyReaderFactory {
    /**
     * Create a no-op property reader that imports no properties.
     */
    static noProperties<PROPERTY_REF>(): PropertyReader<PROPERTY_REF> {
      return {
        readProperty: () => 0,
      };
    }

    /**
     * Create a property reader that counts properties without importing them.
     */
    static countingOnly<PROPERTY_REF>(): PropertyReader<PROPERTY_REF> {
      return {
        readProperty: (nodeRef, labelTokens, propRef) => {
          return propRef ? 1 : 0;
        },
      };
    }

    /**
     * Create a property reader that delegates to a custom function.
     */
    static custom<PROPERTY_REF>(
      readFunction: (
        nodeRef: number,
        labelTokens: NodeLabelTokenSet,
        propRef: PROPERTY_REF
      ) => number
    ): PropertyReader<PROPERTY_REF> {
      return {
        readProperty: readFunction,
      };
    }
  }
}

/**
 * Statistics about the node import process.
 */
export interface NodeImportStats {
  totalNodesProcessed: number;
  labelsRegistered: number;
  propertiesImported: boolean;
  idMapType: string;
}

/**
 * Function type for extracting node IDs from batch arrays.
 */
type IdFunction = (batch: number[], pos: number) => number;

/**
 * Factory for creating NodeImporter instances with common configurations.
 */
export class NodeImporterFactory {
  /**
   * Create a node importer for basic ID mapping only.
   */
  static idMappingOnly(idMapBuilder: IdMapBuilder): NodeImporter {
    return new NodeImporter({
      idMapBuilder,
      labelInformationBuilder: LabelInformation.builder(),
      importProperties: false,
    });
  }

  /**
   * Create a node importer with label support.
   */
  static withLabels(
    idMapBuilder: IdMapBuilder,
    labelMapping: Map<number, NodeLabel[]>
  ): NodeImporter {
    return new NodeImporter({
      idMapBuilder,
      labelInformationBuilder: LabelInformation.builder(),
      labelTokenNodeLabelMapping: labelMapping,
      importProperties: false,
    });
  }

  /**
   * Create a full-featured node importer with labels and properties.
   */
  static fullImport(
    idMapBuilder: IdMapBuilder,
    labelMapping: Map<number, NodeLabel[]>
  ): NodeImporter {
    return new NodeImporter({
      idMapBuilder,
      labelInformationBuilder: LabelInformation.builder(),
      labelTokenNodeLabelMapping: labelMapping,
      importProperties: true,
    });
  }

  /**
   * Create a node importer optimized for single-label graphs.
   */
  static singleLabel(
    idMapBuilder: IdMapBuilder,
    label: NodeLabel,
    labelToken: number = 0
  ): NodeImporter {
    const labelMapping = new Map<number, NodeLabel[]>();
    labelMapping.set(labelToken, [label]);

    return new NodeImporter({
      idMapBuilder,
      labelInformationBuilder: LabelInformation.builder(),
      labelTokenNodeLabelMapping: labelMapping,
      importProperties: true,
    });
  }
}
