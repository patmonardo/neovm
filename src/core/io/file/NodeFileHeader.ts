import { NodeLabel } from "@/projection";
import { MutableNodeSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { HeaderProperty } from "./HeaderProperty";
import { FileHeader } from "./FileHeader";

/**
 * NODE FILE HEADER - CSV NODE FILE STRUCTURE
 *
 * Defines the structure and schema for CSV node files.
 * Maps CSV columns to node properties and validates header format.
 *
 * CSV Format: ID_COLUMN | property1:type | property2:type | ... | :LABEL
 * Example: ":ID,name:string,age:int,:LABEL"
 */
export interface NodeFileHeader
  extends FileHeader<MutableNodeSchema, PropertySchema> {
  /**
   * Array of node labels that this CSV file contains.
   * Empty array means unlabeled nodes (ALL_NODES).
   */
  nodeLabels(): Array<string>;

  /**
   * Extract property schema for these node labels from the overall schema.
   * If no specific labels, uses ALL_NODES schema.
   */
  schemaForIdentifier(schema: MutableNodeSchema): Map<string, PropertySchema>;
}

export namespace NodeFileHeader {
  /**
   * Create NodeFileHeader from CSV column headers and node labels.
   *
   * @param csvColumns Array of CSV column headers (first must be ID column)
   * @param nodeLabels Array of node label names for this file
   * @returns NodeFileHeader instance
   * @throws Error if first column is not the ID column
   */
  export function of(
    csvColumns: string[],
    nodeLabels: string[]
  ): NodeFileHeader {
    // Validate first column is ID column
    if (csvColumns.length === 0 || csvColumns[0] !== CSV_NODE_ID_COLUMN) {
      throw new Error(`First column of header must be ${CSV_NODE_ID_COLUMN}.`);
    }

    // Parse property columns (skip first ID column AND filter out :LABEL)
    const propertyMappings: HeaderProperty[] = [];
    for (let i = 1; i < csvColumns.length; i++) {
      const column = csvColumns[i];

      // ✅ Skip GDS special columns that don't have property format
      if (column === ":LABEL" || column.startsWith(":")) {
        continue; // Skip this column
      }

      propertyMappings.push(HeaderProperty.parse(i, column));
    }

    return new DefaultNodeFileHeader(propertyMappings, nodeLabels);
  }

  /**
   * CSV node ID column name constant.
   * Must be the first column in every node CSV file.
   */
  export const CSV_NODE_ID_COLUMN = ":ID";

  /**
   * Implementation of NodeFileHeader interface.
   */
  class DefaultNodeFileHeader implements NodeFileHeader {
    constructor(
      private readonly _propertyMappings: HeaderProperty[],
      private readonly _nodeLabels: string[]
    ) {}

    nodeLabels(): string[] {
      return [...this._nodeLabels];
    }

    propertyMappings(): Array<HeaderProperty> {
      return [...this._propertyMappings];
    }

    schemaForIdentifier(
      schema: MutableNodeSchema
    ): Map<string, PropertySchema> {
      // Convert string labels to NodeLabel objects
      let labelStream: NodeLabel[];

      if (this._nodeLabels.length === 0) {
        // No specific labels means ALL_NODES
        labelStream = [NodeLabel.ALL_NODES];
      } else {
        // Convert string labels to NodeLabel instances
        labelStream = this._nodeLabels.map((labelName) =>
          NodeLabel.of(labelName)
        );
      }

      // Filter schema by these labels and get union of all properties
      const nodeLabels = labelStream;
      return schema.filter(nodeLabels).unionProperties();
    }
  }
}
