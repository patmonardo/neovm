import { RelationshipType } from '@/gds';
import { MutableRelationshipSchema, RelationshipPropertySchema } from '@/api/schema';
import { FileHeader } from './FileHeader';
import { HeaderProperty, HeaderPropertyParser } from './HeaderProperty';
import { StringFormatting } from '@/utils';
import { CsvRelationshipVisitor } from './csv/CsvRelationshipVisitor';

/**
 * File header for relationship CSV files.
 * Relationships have a single type and property mappings, with required start/end ID columns.
 */
export interface RelationshipFileHeader extends FileHeader<MutableRelationshipSchema, RelationshipPropertySchema> {
  /**
   * The relationship type name for this header.
   */
  relationshipType(): string;
}

/**
 * Implementation of RelationshipFileHeader.
 */
export class RelationshipFileHeaderImpl implements RelationshipFileHeader {
  constructor(
    private readonly _relationshipType: string,
    private readonly _propertyMappings: Set<HeaderProperty>
  ) {}

  relationshipType(): string {
    return this._relationshipType;
  }

  propertyMappings(): Set<HeaderProperty> {
    return new Set(this._propertyMappings); // Return defensive copy
  }

  schemaForIdentifier(schema: MutableRelationshipSchema): Map<string, RelationshipPropertySchema> {
    const relationshipTypeObj = RelationshipType.of(this._relationshipType);
    const filteredSchema = schema.filter(new Set([relationshipTypeObj]));
    return filteredSchema.unionProperties();
  }

  toString(): string {
    return `RelationshipFileHeader{relationshipType='${this._relationshipType}', properties=${this._propertyMappings.size}}`;
  }
}

/**
 * Factory methods for creating RelationshipFileHeader instances.
 */
export class RelationshipFileHeader {
  /**
   * Create a RelationshipFileHeader from CSV columns and relationship type.
   * Validates that first two columns are startNodeId and endNodeId.
   */
  static of(csvColumns: string[], relationshipType: string): RelationshipFileHeader {
    // Validate first column is START_ID
    if (csvColumns.length === 0 || csvColumns[0] !== CsvRelationshipVisitor.START_ID_COLUMN_NAME) {
      throw new Error(StringFormatting.formatWithLocale(
        "First column of header must be %s.",
        CsvRelationshipVisitor.START_ID_COLUMN_NAME
      ));
    }

    // Validate second column is END_ID
    if (csvColumns.length === 1 || csvColumns[1] !== CsvRelationshipVisitor.END_ID_COLUMN_NAME) {
      throw new Error(StringFormatting.formatWithLocale(
        "Second column of header must be %s.",
        CsvRelationshipVisitor.END_ID_COLUMN_NAME
      ));
    }

    // Parse property mappings from remaining columns (skip first two which are IDs)
    const propertyMappings = new Set<HeaderProperty>();
    for (let i = 2; i < csvColumns.length; i++) {
      const headerProperty = HeaderPropertyParser.parse(i, csvColumns[i]);
      propertyMappings.add(headerProperty);
    }

    return new RelationshipFileHeaderImpl(relationshipType, propertyMappings);
  }

  /**
   * Create a RelationshipFileHeader from a header line string.
   */
  static fromHeaderLine(headerLine: string, relationshipType: string): RelationshipFileHeader {
    const csvColumns = headerLine.split(',').map(col => col.trim());
    return this.of(csvColumns, relationshipType);
  }

  /**
   * Create a RelationshipFileHeader with specific properties.
   */
  static create(
    relationshipType: string,
    properties: Array<{ name: string; type: ValueType; position: number }>
  ): RelationshipFileHeader {
    const propertyMappings = new Set<HeaderProperty>();

    for (const prop of properties) {
      const headerProperty = HeaderPropertyParser.parse(prop.position, `${prop.name}:${prop.type}`);
      propertyMappings.add(headerProperty);
    }

    return new RelationshipFileHeaderImpl(relationshipType, propertyMappings);
  }

  /**
   * Create a minimal RelationshipFileHeader with just ID columns.
   */
  static minimal(relationshipType: string): RelationshipFileHeader {
    return new RelationshipFileHeaderImpl(relationshipType, new Set());
  }
}
