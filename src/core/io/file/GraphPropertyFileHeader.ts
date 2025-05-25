import { PropertySchema, ValueType } from '@/api';
import { FileHeader } from './FileHeader';
import { HeaderProperty, HeaderPropertyParser } from './HeaderProperty';

/**
 * File header for graph property CSV files.
 * Graph properties have exactly one property column since they represent
 * single-valued properties attached to the entire graph.
 */
export interface GraphPropertyFileHeader extends FileHeader<Map<string, PropertySchema>, PropertySchema> {
  /**
   * The single property mapping for this graph property file.
   */
  propertyMapping(): HeaderProperty;
}

/**
 * Implementation of GraphPropertyFileHeader.
 */
export class GraphPropertyFileHeaderImpl implements GraphPropertyFileHeader {
  constructor(private readonly _propertyMapping: HeaderProperty) {}

  propertyMapping(): HeaderProperty {
    return this._propertyMapping;
  }

  propertyMappings(): Set<HeaderProperty> {
    return new Set([this._propertyMapping]);
  }

  schemaForIdentifier(propertySchema: Map<string, PropertySchema>): Map<string, PropertySchema> {
    const graphPropertySchema = propertySchema.get(this.propertyMapping().propertyKey());

    if (!graphPropertySchema) {
      throw new Error(`No schema found for graph property: ${this.propertyMapping().propertyKey()}`);
    }

    return new Map([[graphPropertySchema.key(), graphPropertySchema]]);
  }

  toString(): string {
    return `GraphPropertyFileHeader{propertyMapping=${this._propertyMapping}}`;
  }
}

/**
 * Factory methods for creating GraphPropertyFileHeader instances.
 */
export class GraphPropertyFileHeader {
  /**
   * Create a GraphPropertyFileHeader from a header line array.
   */
  static of(headerLine: string[]): GraphPropertyFileHeader {
    if (headerLine.length !== 1) {
      throw new Error(
        `Graph property headers should contain exactly one property column, but got: [${headerLine.join(', ')}]`
      );
    }

    const headerProperty = HeaderPropertyParser.parse(0, headerLine[0]);
    return new GraphPropertyFileHeaderImpl(headerProperty);
  }

  /**
   * Create a GraphPropertyFileHeader from a single header property.
   */
  static fromProperty(headerProperty: HeaderProperty): GraphPropertyFileHeader {
    return new GraphPropertyFileHeaderImpl(headerProperty);
  }

  /**
   * Create a GraphPropertyFileHeader from property details.
   */
  static create(propertyKey: string, valueType: ValueType, metadata?: Map<string, string>): GraphPropertyFileHeader {
    const headerProperty = new HeaderPropertyImpl(
      0, // Position 0 since there's only one column
      propertyKey,
      valueType,
      metadata || new Map()
    );

    return new GraphPropertyFileHeaderImpl(headerProperty);
  }
}
