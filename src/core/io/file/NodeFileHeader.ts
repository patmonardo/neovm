import { NodeLabel } from '@/gds';
import { MutableNodeSchema, PropertySchema } from '@/api/schema';
import { FileHeader } from './FileHeader';
import { HeaderProperty, HeaderPropertyParser } from './HeaderProperty';
import { StringFormatting } from '@/utils';
import { CsvNodeVisitor } from './csv/CsvNodeVisitor';

/**
 * File header for node CSV files.
 * Nodes can have multiple labels and many properties.
 */
export interface NodeFileHeader extends FileHeader<MutableNodeSchema, PropertySchema> {
  /**
   * Array of node label names for this header.
   */
  nodeLabels(): string[];
}

/**
 * Implementation of NodeFileHeader.
 */
export class NodeFileHeaderImpl implements NodeFileHeader {
  constructor(
    private readonly _nodeLabels: string[],
    private readonly _propertyMappings: Set<HeaderProperty>
  ) {}

  nodeLabels(): string[] {
    return [...this._nodeLabels]; // Return defensive copy
  }

  propertyMappings(): Set<HeaderProperty> {
    return new Set(this._propertyMappings); // Return defensive copy
  }

  schemaForIdentifier(schema: MutableNodeSchema): Map<string, PropertySchema> {
    // Convert string labels to NodeLabel objects
    let labelStream = this._nodeLabels.map(labelName => NodeLabel.of(labelName));

    // If no labels specified, use ALL_NODES
    if (this._nodeLabels.length === 0) {
      labelStream = [NodeLabel.ALL_NODES];
    }

    const nodeLabels = new Set(labelStream);

    // Filter schema by labels and get union of all properties
    return schema.filter(nodeLabels).unionProperties();
  }

  toString(): string {
    return `NodeFileHeader{nodeLabels=[${this._nodeLabels.join(', ')}], properties=${this._propertyMappings.size}}`;
  }
}

/**
 * Factory methods for creating NodeFileHeader instances.
 */
export class NodeFileHeader {
  /**
   * Create a NodeFileHeader from CSV columns and node labels.
   */
  static of(csvColumns: string[], nodeLabels: string[]): NodeFileHeader {
    // Validate first column is the ID column
    if (csvColumns.length === 0 || csvColumns[0] !== CsvNodeVisitor.ID_COLUMN_NAME) {
      throw new Error(StringFormatting.formatWithLocale(
        "First column of header must be %s.",
        CsvNodeVisitor.ID_COLUMN_NAME
      ));
    }

    // Parse property mappings from columns (skip first column which is ID)
    const propertyMappings = new Set<HeaderProperty>();
    for (let i = 1; i < csvColumns.length; i++) {
      const headerProperty = HeaderPropertyParser.parse(i, csvColumns[i]);
      propertyMappings.add(headerProperty);
    }

    return new NodeFileHeaderImpl(nodeLabels, propertyMappings);
  }

  /**
   * Create a NodeFileHeader from a single header line with embedded labels.
   * Format: "nodeId,prop1:TYPE,prop2:TYPE" with labels from filename or metadata.
   */
  static fromHeaderLine(headerLine: string, nodeLabels: string[]): NodeFileHeader {
    const csvColumns = headerLine.split(',').map(col => col.trim());
    return this.of(csvColumns, nodeLabels);
  }

  /**
   * Create a NodeFileHeader for a single label with properties.
   */
  static forLabel(
    labelName: string,
    properties: Array<{ name: string; type: ValueType; position: number }>
  ): NodeFileHeader {
    const propertyMappings = new Set<HeaderProperty>();

    // Add ID column
    const csvColumns = [CsvNodeVisitor.ID_COLUMN_NAME];

    // Add property columns
    for (const prop of properties) {
      csvColumns.push(`${prop.name}:${prop.type}`);
      const headerProperty = HeaderPropertyParser.parse(prop.position, `${prop.name}:${prop.type}`);
      propertyMappings.add(headerProperty);
    }

    return new NodeFileHeaderImpl([labelName], propertyMappings);
  }

  /**
   * Create a NodeFileHeader for multiple labels with common properties.
   */
  static forMultipleLabels(
    labelNames: string[],
    properties: Array<{ name: string; type: ValueType }>
  ): NodeFileHeader {
    const propertyMappings = new Set<HeaderProperty>();

    // Create property mappings
    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];
      const headerProperty = HeaderPropertyParser.parse(i + 1, `${prop.name}:${prop.type}`);
      propertyMappings.add(headerProperty);
    }

    return new NodeFileHeaderImpl(labelNames, propertyMappings);
  }
}
