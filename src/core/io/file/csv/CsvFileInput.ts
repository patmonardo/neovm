import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import {
  MutableNodeSchema,
  MutableRelationshipSchema,
  PropertySchema,
  RelationshipPropertySchema
} from '@/api/schema';
import { Capabilities } from '@/core/loading';
import { GraphInfo } from '@/core/io/file';
import { ElementIdentifier } from '@/gds';

// Import all the loaders we created
import { UserInfoLoader } from './UserInfoLoader';
import { GraphInfoLoader } from './GraphInfoLoader';
import { NodeSchemaLoader } from './NodeSchemaLoader';
import { RelationshipSchemaLoader } from './RelationshipSchemaLoader';
import { GraphPropertySchemaLoader } from './GraphPropertySchemaLoader';
import { NodeLabelMappingLoader } from './NodeLabelMappingLoader';
import { RelationshipTypeMappingLoader } from './RelationshipTypeMappingLoader';
import { GraphCapabilitiesLoader } from './GraphCapabilitiesLoader';

/**
 * Main CSV file input implementation.
 * Orchestrates the entire CSV import process using all the specialized loaders.
 */
export class CsvFileInput implements FileInput {
  private static readonly COLUMN_SEPARATOR = ',';
  private static readonly ARRAY_ELEMENT_SEPARATOR = ';';

  private readonly importPath: string;
  private readonly userName: string;
  private readonly graphInfo: GraphInfo;
  private readonly nodeSchema: MutableNodeSchema;
  private readonly labelMapping: Map<string, string> | null;
  private readonly relationshipSchema: MutableRelationshipSchema;
  private readonly graphPropertySchema: Map<string, PropertySchema>;
  private readonly capabilities: Capabilities;
  private readonly typeMapping: Map<string, string> | null;

  constructor(importPath: string) {
    this.importPath = importPath;

    try {
      // Load all schemas and metadata using our loaders
      this.userName = new UserInfoLoader(importPath).load();
      this.graphInfo = new GraphInfoLoader(importPath).load();
      this.nodeSchema = new NodeSchemaLoader(importPath).load();
      this.labelMapping = new NodeLabelMappingLoader(importPath).load();
      this.typeMapping = new RelationshipTypeMappingLoader(importPath).load();
      this.relationshipSchema = new RelationshipSchemaLoader(importPath).load();
      this.graphPropertySchema = new GraphPropertySchemaLoader(importPath).load();
      this.capabilities = new GraphCapabilitiesLoader(importPath).load();
    } catch (error) {
      throw new Error(`Failed to initialize CSV file input from ${importPath}: ${error}`);
    }
  }

  /**
   * Create node input iterable.
   */
  nodes(): InputIterable {
    const pathMapping = CsvImportFileUtil.nodeHeaderToFileMapping(this.importPath);
    const headerToDataFilesMapping = new Map<NodeFileHeader, string[]>();

    for (const [headerPath, dataFiles] of pathMapping) {
      const labelMapper = this.labelMapping
        ? (label: string) => this.labelMapping!.get(label) || label
        : Functions.identity<string>();

      const header = CsvImportFileUtil.parseNodeHeader(headerPath, labelMapper);
      headerToDataFilesMapping.set(header, dataFiles);
    }

    return {
      iterator: () => new NodeImporter(headerToDataFilesMapping, this.nodeSchema)
    };
  }

  /**
   * Get available node labels.
   */
  private nodeLabels(): string[] {
    if (this.labelMapping) {
      return Array.from(this.labelMapping.keys());
    } else {
      return Array.from(this.nodeSchema.availableNodeLabels())
        .map(label => label.name);
    }
  }

  /**
   * Create relationship input iterable.
   */
  relationships(): InputIterable {
    const pathMapping = CsvImportFileUtil.relationshipHeaderToFileMapping(this.importPath);
    const headerToDataFilesMapping = new Map<RelationshipFileHeader, string[]>();

    for (const [headerPath, dataFiles] of pathMapping) {
      const typeMapper = this.typeMapping
        ? (type: string) => this.typeMapping!.get(type) || type
        : Functions.identity<string>();

      const header = CsvImportFileUtil.parseRelationshipHeader(headerPath, typeMapper);
      headerToDataFilesMapping.set(header, dataFiles);
    }

    return {
      iterator: () => new RelationshipImporter(headerToDataFilesMapping, this.relationshipSchema)
    };
  }

  /**
   * Create graph properties input iterable.
   */
  graphProperties(): InputIterable {
    const pathMapping = CsvImportFileUtil.graphPropertyHeaderToFileMapping(this.importPath);
    const headerToDataFilesMapping = new Map<GraphPropertyFileHeader, string[]>();

    for (const [headerPath, dataFiles] of pathMapping) {
      const header = CsvImportFileUtil.parseGraphPropertyHeader(headerPath);
      headerToDataFilesMapping.set(header, dataFiles);
    }

    return {
      iterator: () => new GraphPropertyImporter(headerToDataFilesMapping, this.graphPropertySchema)
    };
  }

  // Accessor methods
  userName(): string { return this.userName; }
  graphInfo(): GraphInfo { return this.graphInfo; }
  nodeSchema(): MutableNodeSchema { return this.nodeSchema; }
  labelMapping(): Map<string, string> | null { return this.labelMapping; }
  relationshipSchema(): MutableRelationshipSchema { return this.relationshipSchema; }
  graphPropertySchema(): Map<string, PropertySchema> { return this.graphPropertySchema; }
  capabilities(): Capabilities { return this.capabilities; }
}

/**
 * Abstract base class for file importers.
 */
abstract class FileImporter<
  HEADER extends FileHeader<SCHEMA, PROPERTY_SCHEMA>,
  SCHEMA,
  PROPERTY_SCHEMA extends PropertySchema
> implements InputIterator {
  private readonly entryIterator: MappedListIterator<HEADER, string>;
  protected readonly elementSchema: SCHEMA;

  constructor(
    headerToDataFilesMapping: Map<HEADER, string[]>,
    elementSchema: SCHEMA
  ) {
    this.entryIterator = new MappedListIterator(headerToDataFilesMapping);
    this.elementSchema = elementSchema;
  }

  next(chunk: InputChunk): boolean {
    if (this.entryIterator.hasNext()) {
      const entry = this.entryIterator.next();

      if (!(chunk instanceof LineChunk)) {
        throw new Error('Expected LineChunk');
      }

      const header = entry.getKey();
      const filePath = entry.getValue();
      (chunk as any).initialize(header, filePath);
      return true;
    }
    return false;
  }

  close(): void {
    // No resources to close in base implementation
  }

  abstract newChunk(): InputChunk;
}

/**
 * Node importer implementation.
 */
class NodeImporter extends FileImporter<NodeFileHeader, MutableNodeSchema, PropertySchema> {
  constructor(
    headerToDataFilesMapping: Map<NodeFileHeader, string[]>,
    nodeSchema: MutableNodeSchema
  ) {
    super(headerToDataFilesMapping, nodeSchema);
  }

  newChunk(): InputChunk {
    return new NodeLineChunk(this.elementSchema);
  }
}

/**
 * Relationship importer implementation.
 */
class RelationshipImporter extends FileImporter<RelationshipFileHeader, MutableRelationshipSchema, RelationshipPropertySchema> {
  constructor(
    headerToDataFilesMapping: Map<RelationshipFileHeader, string[]>,
    relationshipSchema: MutableRelationshipSchema
  ) {
    super(headerToDataFilesMapping, relationshipSchema);
  }

  newChunk(): InputChunk {
    return new RelationshipLineChunk(this.elementSchema);
  }
}

/**
 * Graph property importer implementation.
 */
class GraphPropertyImporter extends FileImporter<GraphPropertyFileHeader, Map<string, PropertySchema>, PropertySchema> {
  constructor(
    headerToDataFilesMapping: Map<GraphPropertyFileHeader, string[]>,
    graphPropertySchema: Map<string, PropertySchema>
  ) {
    super(headerToDataFilesMapping, graphPropertySchema);
  }

  newChunk(): InputChunk {
    return new GraphPropertyLineChunk(this.elementSchema);
  }
}

/**
 * Abstract base class for line chunks.
 */
abstract class LineChunk<
  HEADER extends FileHeader<SCHEMA, PROPERTY_SCHEMA>,
  SCHEMA,
  PROPERTY_SCHEMA extends PropertySchema
> implements InputChunk {
  private readonly schema: SCHEMA;
  protected header!: HEADER;
  protected propertySchemas!: Map<string, PROPERTY_SCHEMA>;
  protected lineIterator!: AsyncIterableIterator<string[]>;

  constructor(schema: SCHEMA) {
    this.schema = schema;
  }

  async initialize(header: HEADER, filePath: string): Promise<void> {
    this.header = header;
    this.propertySchemas = header.schemaForIdentifier(this.schema);

    // Create CSV line iterator
    this.lineIterator = this.createLineIterator(filePath);
  }

  private createLineIterator(filePath: string): AsyncIterableIterator<string[]> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const csvStream = stream.pipe(csv({
      headers: false, // We handle headers ourselves
      skipEmptyLines: true,
      separator: CsvFileInput.COLUMN_SEPARATOR
    }));

    return this.convertToStringArrayIterator(csvStream);
  }

  private async* convertToStringArrayIterator(csvStream: any): AsyncIterableIterator<string[]> {
    for await (const row of csvStream) {
      // Convert row object to string array based on column order
      yield Object.values(row) as string[];
    }
  }

  async next(visitor: InputEntityVisitor): Promise<boolean> {
    const result = await this.lineIterator.next();

    if (!result.done) {
      const lineArray = result.value;
      if (lineArray.length > 0) {
        await this.visitLine(lineArray, this.header, visitor);
      }
      return true;
    }
    return false;
  }

  abstract visitLine(
    lineArray: string[],
    header: HEADER,
    visitor: InputEntityVisitor
  ): Promise<void>;

  close(): void {
    // Line iterator will be closed automatically when the stream ends
  }

  lastProgress(): number {
    return 1;
  }
}

/**
 * Node line chunk implementation.
 */
class NodeLineChunk extends LineChunk<NodeFileHeader, MutableNodeSchema, PropertySchema> {
  constructor(nodeSchema: MutableNodeSchema) {
    super(nodeSchema);
  }

  async visitLine(
    lineArray: string[],
    header: NodeFileHeader,
    visitor: InputEntityVisitor
  ): Promise<void> {
    visitor.labels(header.nodeLabels());
    visitor.id(CsvImportParsingUtil.parseId(lineArray[0]));

    await this.visitProperties(header, this.propertySchemas, visitor, lineArray);

    visitor.endOfEntity();
  }

  private async visitProperties(
    header: FileHeader<any, PropertySchema>,
    propertySchemas: Map<string, PropertySchema>,
    visitor: InputEntityVisitor,
    parsedLine: string[]
  ): Promise<void> {
    for (const headerProperty of header.propertyMappings()) {
      const stringProperty = parsedLine[headerProperty.position()];
      const propertyKey = headerProperty.propertyKey();
      const propertySchema = propertySchemas.get(propertyKey);

      if (propertySchema) {
        const defaultValue = propertySchema.defaultValue();
        const value = CsvImportParsingUtil.parseProperty(
          stringProperty,
          headerProperty.valueType(),
          defaultValue,
          null // Array reader - would need implementation
        );
        visitor.property(propertyKey, value);
      }
    }
  }
}

/**
 * Relationship line chunk implementation.
 */
class RelationshipLineChunk extends LineChunk<RelationshipFileHeader, MutableRelationshipSchema, RelationshipPropertySchema> {
  constructor(relationshipSchema: MutableRelationshipSchema) {
    super(relationshipSchema);
  }

  async visitLine(
    lineArray: string[],
    header: RelationshipFileHeader,
    visitor: InputEntityVisitor
  ): Promise<void> {
    visitor.type(header.relationshipType());
    visitor.startId(CsvImportParsingUtil.parseId(lineArray[0]));
    visitor.endId(CsvImportParsingUtil.parseId(lineArray[1]));

    // Visit properties (similar to NodeLineChunk)
    // Implementation would be similar to NodeLineChunk.visitProperties

    visitor.endOfEntity();
  }
}

/**
 * Graph property line chunk implementation.
 */
class GraphPropertyLineChunk extends LineChunk<GraphPropertyFileHeader, Map<string, PropertySchema>, PropertySchema> {
  constructor(graphPropertySchema: Map<string, PropertySchema>) {
    super(graphPropertySchema);
  }

  async visitLine(
    lineArray: string[],
    header: GraphPropertyFileHeader,
    visitor: InputEntityVisitor
  ): Promise<void> {
    // Visit properties only (no ID or labels for graph properties)
    // Implementation would be similar to NodeLineChunk.visitProperties

    visitor.endOfEntity();
  }
}
