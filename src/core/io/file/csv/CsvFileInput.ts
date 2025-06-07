/**
 * CSV FILE INPUT - MAIN CSV IMPORT ORCHESTRATOR
 *
 * This is the heart of the CSV import system. It:
 * 1. Loads all schemas and metadata from CSV files
 * 2. Discovers and maps header files to data files
 * 3. Creates specialized importers for nodes, relationships, and graph properties
 * 4. Provides InputIterators that parse CSV files into visitor calls
 *
 * This replaces Jackson CSV parsing with native TypeScript parsing.
 */

import { InputIterable } from "@/api/import";
import { InputIterator } from "@/api/import";
import { InputChunk } from "@/api/import";
import { InputEntityVisitor } from "@/api/import";
import { MutableNodeSchema } from "@/api/schema";
import { MutableRelationshipSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { RelationshipPropertySchema } from "@/api/schema";
import { FileInput } from "@/core/io/file";
import { GraphInfo } from "@/core/io/file";
import { FileHeader } from "@/core/io/file";
import { NodeFileHeader } from "@/core/io/file";
import { RelationshipFileHeader } from "@/core/io/file";
import { GraphPropertyFileHeader } from "@/core/io/file";
import { Capabilities } from "@/core/loading/Capabilities";
import { MappedListIterator } from "@/core/io/file";

// Import all our CSV loaders
import { UserInfoLoader } from "./UserInfoLoader";
import { GraphInfoLoader } from "./GraphInfoLoader";
import { NodeSchemaLoader } from "./NodeSchemaLoader";
import { NodeLabelMappingLoader } from "./NodeLabelMappingLoader";
import { RelationshipTypeMappingLoader } from "./RelationshipTypeMappingLoader";
import { RelationshipSchemaLoader } from "./RelationshipSchemaLoader";
import { GraphPropertySchemaLoader } from "./GraphPropertySchemaLoader";
import { GraphCapabilitiesLoader } from "./GraphCapabilitiesLoader";
import { CsvImportFileUtil } from "./CsvImportFileUtil";
import { CsvImportParsingUtil } from "./CsvImportParsingUtil";

import * as fs from "fs";

export class CsvFileInput implements FileInput {
  // CSV PARSING CONSTANTS
  private static readonly COLUMN_SEPARATOR = ",";

  // LOADED DATA - All schemas and metadata loaded from CSV files
  private readonly _importPath: string;
  private readonly _userName: string;
  private readonly _graphInfo: GraphInfo;
  private readonly _nodeSchema: MutableNodeSchema;
  private readonly _labelMapping: Map<string, string> | null;
  private readonly _relationshipSchema: MutableRelationshipSchema;
  private readonly _typeMapping: Map<string, string> | null;
  private readonly _graphPropertySchema: Map<string, PropertySchema>;
  public readonly _capabilities: Capabilities;

  constructor(importPath: string) {
    this._importPath = importPath;

    // Load all schemas and metadata using our CSV loaders
    this._userName = new UserInfoLoader(importPath).load();
    this._graphInfo = new GraphInfoLoader(importPath).load();
    this._nodeSchema = new NodeSchemaLoader(importPath).load();
    this._labelMapping = new NodeLabelMappingLoader(importPath).load();
    this._typeMapping = new RelationshipTypeMappingLoader(importPath).load();
    this._relationshipSchema = new RelationshipSchemaLoader(importPath).load();
    this._graphPropertySchema = new GraphPropertySchemaLoader(
      importPath
    ).load();
    this._capabilities = new GraphCapabilitiesLoader(importPath).load();
  }

  // MAIN INPUT ITERABLES - These provide the data streams

  nodes(): InputIterable {
    // 1. Discover header files and map to data files
    const pathMapping = CsvImportFileUtil.nodeHeaderToFileMapping(
      this._importPath
    );

    // 2. Parse headers and create mapping
    const headerToDataFilesMapping = new Map<NodeFileHeader, string[]>();
    for (const [headerPath, dataPaths] of pathMapping.entries()) {
      const labelMappingFn = this._labelMapping
        ? (label: string) => this._labelMapping!.get(label) || label
        : (label: string) => label;

      const header = CsvImportFileUtil.parseNodeHeader(
        headerPath,
        labelMappingFn
      );
      headerToDataFilesMapping.set(header, dataPaths);
    }

    // 3. Return InputIterable that creates NodeImporter
    return {
      iterator: () =>
        new NodeImporter(headerToDataFilesMapping, this._nodeSchema),
    };
  }

  relationships(): InputIterable {
    // 1. Discover relationship files
    const pathMapping = CsvImportFileUtil.relationshipHeaderToFileMapping(
      this._importPath
    );

    // 2. Parse headers and create mapping
    const headerToDataFilesMapping = new Map<
      RelationshipFileHeader,
      string[]
    >();
    for (const [headerPath, dataPaths] of pathMapping.entries()) {
      const typeMappingFn = this._typeMapping
        ? (type: string) => this._typeMapping!.get(type) || type
        : (type: string) => type;

      const header = CsvImportFileUtil.parseRelationshipHeader(
        headerPath,
        typeMappingFn
      );
      headerToDataFilesMapping.set(header, dataPaths);
    }

    // 3. Return InputIterable that creates RelationshipImporter
    return {
      iterator: () =>
        new RelationshipImporter(
          headerToDataFilesMapping,
          this._relationshipSchema
        ),
    };
  }

  graphProperties(): InputIterable {
    // 1. Discover graph property files
    const pathMapping = CsvImportFileUtil.graphPropertyHeaderToFileMapping(
      this._importPath
    );

    // 2. Parse headers and create mapping
    const headerToDataFilesMapping = new Map<
      GraphPropertyFileHeader,
      string[]
    >();
    for (const [headerPath, dataPaths] of pathMapping.entries()) {
      const header = CsvImportFileUtil.parseGraphPropertyHeader(headerPath);
      headerToDataFilesMapping.set(header, dataPaths);
    }

    // 3. Return InputIterable that creates GraphPropertyImporter
    return {
      iterator: () =>
        new GraphPropertyImporter(
          headerToDataFilesMapping,
          this._graphPropertySchema
        ),
    };
  }

  // METADATA ACCESSORS
  userName(): string {
    return this._userName;
  }

  graphInfo(): GraphInfo {
    return this._graphInfo;
  }

  nodeSchema(): MutableNodeSchema {
    return this._nodeSchema;
  }

  labelMapping(): Map<string, string> | null {
    return this._labelMapping;
  }

  relationshipSchema(): MutableRelationshipSchema {
    return this._relationshipSchema;
  }

  typeMapping(): Map<string, string> | null {
    return this._typeMapping;
  }

  graphPropertySchema(): Map<string, PropertySchema> {
    return this._graphPropertySchema;
  }

  capabilities(): Capabilities {
    return this._capabilities;
  }
}

// =============================================================================
// ABSTRACT BASE IMPORTER - Common functionality for all importers
// =============================================================================

abstract class FileImporter<
  HEADER extends FileHeader<SCHEMA, PROPERTY_SCHEMA>,
  SCHEMA,
  PROPERTY_SCHEMA extends PropertySchema
> implements InputIterator
{
  private readonly entryIterator: MappedListIterator<HEADER, string>;
  protected readonly elementSchema: SCHEMA;

  constructor(
    headerToDataFilesMapping: Map<HEADER, string[]>,
    elementSchema: SCHEMA
  ) {
    this.entryIterator = new MappedListIterator(headerToDataFilesMapping);
    this.elementSchema = elementSchema;
  }

  /**
   * Gets the next chunk of data to process.
   * This is called by the batch import framework.
   */
  next(chunk: InputChunk): boolean {
    if (this.entryIterator.hasNext()) {
      const entry = this.entryIterator.next();
      const header = entry.key;
      const dataFilePath = entry.value;

      // Initialize the chunk with header and file path
      if (chunk instanceof LineChunk) {
        (chunk as LineChunk<HEADER, SCHEMA, PROPERTY_SCHEMA>).initialize(
          header,
          dataFilePath
        );
        return true;
      }

      throw new Error("Expected LineChunk");
    }
    return false;
  }

  abstract newChunk(): InputChunk;

  close(): void {
    // No resources to close for file-based iteration
  }
}

// =============================================================================
// CONCRETE IMPORTERS - Specialized for each data type
// =============================================================================

class NodeImporter extends FileImporter<
  NodeFileHeader,
  MutableNodeSchema,
  PropertySchema
> {
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

class RelationshipImporter extends FileImporter<
  RelationshipFileHeader,
  MutableRelationshipSchema,
  RelationshipPropertySchema
> {
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

class GraphPropertyImporter extends FileImporter<
  GraphPropertyFileHeader,
  Map<string, PropertySchema>,
  PropertySchema
> {
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

// =============================================================================
// ABSTRACT LINE CHUNK - Base for all CSV line processing
// =============================================================================

abstract class LineChunk<
  HEADER extends FileHeader<SCHEMA, PROPERTY_SCHEMA>,
  SCHEMA,
  PROPERTY_SCHEMA extends PropertySchema
> implements InputChunk, GraphStoreInput.LastProgress
{
  private readonly schema: SCHEMA;

  // Set during initialization
  protected header?: HEADER;
  protected propertySchemas?: Map<string, PROPERTY_SCHEMA>;
  protected lines?: string[];
  protected currentLineIndex: number = 0;

  constructor(schema: SCHEMA) {
    this.schema = schema;
  }

  /**
   * Initialize chunk with header and data file.
   * Loads entire CSV file into memory for processing.
   */
  initialize(header: HEADER, dataFilePath: string): void {
    this.header = header;
    this.propertySchemas = header.schemaForIdentifier(this.schema);

    // Load entire CSV file - replacing Jackson streaming
    try {
      const fileContent = fs.readFileSync(dataFilePath, "utf-8");
      this.lines = fileContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0); // Skip empty lines
      this.currentLineIndex = 0;
    } catch (error) {
      throw new Error(
        `Failed to read CSV file ${dataFilePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Process next line from CSV file.
   * Returns true if line was processed, false if no more lines.
   */
  next(visitor: InputEntityVisitor): boolean {
    if (
      !this.lines ||
      !this.header ||
      this.currentLineIndex >= this.lines.length
    ) {
      return false;
    }

    const line = this.lines[this.currentLineIndex++];
    if (line.length === 0) {
      return true; // Skip empty lines, continue processing
    }

    // Parse CSV line - simple split, could be enhanced for quoted fields
    const lineArray = this.parseCSVLine(line);

    if (lineArray.length !== 0) {
      this.visitLine(lineArray, this.header, visitor);
    }

    return true;
  }

  /**
   * Simple CSV line parser - splits on comma.
   * TODO: Could be enhanced to handle quoted fields with commas.
   */
  private parseCSVLine(line: string): string[] {
    return line
      .split(CsvFileInput.COLUMN_SEPARATOR)
      .map((field) => field.trim());
  }

  /**
   * Implemented by concrete chunks to process specific entity types.
   */
  abstract visitLine(
    lineArray: string[],
    header: HEADER,
    visitor: InputEntityVisitor
  ): void;

  close(): void {
    // Memory cleanup
    this.lines = undefined;
  }

  lastProgress(): number {
    return 1; // Simple progress tracking
  }
}

// =============================================================================
// CONCRETE LINE CHUNKS - Specialized CSV line processors
// =============================================================================

class NodeLineChunk extends LineChunk<
  NodeFileHeader,
  MutableNodeSchema,
  PropertySchema
> {
  constructor(nodeSchema: MutableNodeSchema) {
    super(nodeSchema);
  }

  visitLine(
    lineArray: string[],
    header: NodeFileHeader,
    visitor: InputEntityVisitor
  ): void {
    // Set node labels
    visitor.labels(header.nodeLabels());

    // Parse and set node ID (first column)
    visitor.id(CsvImportParsingUtil.parseId(lineArray[0]));

    // Process properties
    this.visitProperties(header, this.propertySchemas!, visitor, lineArray);

    // Signal end of entity
    visitor.endOfEntity();
  }

  private visitProperties(
    header: NodeFileHeader,
    propertySchemas: Map<string, PropertySchema>,
    visitor: InputEntityVisitor,
    parsedLine: string[]
  ): void {
    for (const headerProperty of header.propertyMappings()) {
      const stringProperty = parsedLine[headerProperty.position()];
      const propertyKey = headerProperty.propertyKey();
      const propertySchema = propertySchemas.get(propertyKey);

      if (propertySchema) {
        const value = CsvImportParsingUtil.parseProperty(
          stringProperty,
          headerProperty.valueType(),
          propertySchema.defaultValue()
        );
        visitor.property(propertyKey, value);
      }
    }
  }
}

class RelationshipLineChunk extends LineChunk<
  RelationshipFileHeader,
  MutableRelationshipSchema,
  RelationshipPropertySchema
> {
  constructor(relationshipSchema: MutableRelationshipSchema) {
    super(relationshipSchema);
  }

  visitLine(
    lineArray: string[],
    header: RelationshipFileHeader,
    visitor: InputEntityVisitor
  ): void {
    // Set relationship type
    visitor.type(header.relationshipType());

    // Parse and set start/end IDs (first two columns)
    visitor.startId(CsvImportParsingUtil.parseId(lineArray[0]));
    visitor.endId(CsvImportParsingUtil.parseId(lineArray[1]));

    // Process properties
    this.visitProperties(header, this.propertySchemas!, visitor, lineArray);

    // Signal end of entity
    visitor.endOfEntity();
  }

  private visitProperties(
    header: RelationshipFileHeader,
    propertySchemas: Map<string, RelationshipPropertySchema>,
    visitor: InputEntityVisitor,
    parsedLine: string[]
  ): void {
    for (const headerProperty of header.propertyMappings()) {
      const stringProperty = parsedLine[headerProperty.position()];
      const propertyKey = headerProperty.propertyKey();
      const propertySchema = propertySchemas.get(propertyKey);

      if (propertySchema) {
        const value = CsvImportParsingUtil.parseProperty(
          stringProperty,
          headerProperty.valueType,
          propertySchema.defaultValue()
        );
        visitor.property(propertyKey, value);
      }
    }
  }
}

class GraphPropertyLineChunk extends LineChunk<
  GraphPropertyFileHeader,
  Map<string, PropertySchema>,
  PropertySchema
> {
  constructor(graphPropertySchema: Map<string, PropertySchema>) {
    super(graphPropertySchema);
  }

  visitLine(
    lineArray: string[],
    header: GraphPropertyFileHeader,
    visitor: InputEntityVisitor
  ): void {
    // Process properties (graph properties are just properties)
    this.visitProperties(header, this.propertySchemas!, visitor, lineArray);

    // Signal end of entity
    visitor.endOfEntity();
  }

  private visitProperties(
    header: GraphPropertyFileHeader,
    propertySchemas: Map<string, PropertySchema>,
    visitor: InputEntityVisitor,
    parsedLine: string[]
  ): void {
    for (const headerProperty of header.propertyMappings()) {
      const stringProperty = parsedLine[headerProperty.position()];
      const propertyKey = headerProperty.propertyKey();
      const propertySchema = propertySchemas.get(propertyKey);

      if (propertySchema) {
        const value = CsvImportParsingUtil.parseProperty(
          stringProperty,
          headerProperty.valueType(),
          propertySchema.defaultValue()
        );
        visitor.property(propertyKey, value);
      }
    }
  }
}
