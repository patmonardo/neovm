import * as fs from 'fs';
import * as path from 'path';
import { RelationshipVisitor } from '@/core/io/file';
import { RelationshipType, ValueType } from '@/projection';
import { RelationshipSchema, PropertySchema, IdentifierMapper } from '@/api/schema';
import { JacksonFileAppender, CsvSchemaBuilder } from './JacksonFileAppender';

/**
 * CSV visitor that exports relationships to separate CSV files based on their types.
 * Creates one data file per relationship type plus header files.
 */
export class CsvRelationshipVisitor extends RelationshipVisitor {
  public static readonly START_ID_COLUMN_NAME = ':START_ID';
  public static readonly END_ID_COLUMN_NAME = ':END_ID';

  private readonly fileLocation: string;
  private readonly headerFiles: Set<string>;
  private readonly visitorId: number;
  private readonly csvAppenders: Map<string, JacksonFileAppender>;

  constructor(
    fileLocation: string,
    relationshipSchema: RelationshipSchema,
    headerFiles: Set<string>,
    visitorId: number,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ) {
    super(relationshipSchema, relationshipTypeMapping);
    this.fileLocation = fileLocation;
    this.headerFiles = headerFiles;
    this.visitorId = visitorId;
    this.csvAppenders = new Map();
  }

  /**
   * Test constructor with defaults.
   */
  static forTesting(
    fileLocation: string,
    relationshipSchema: RelationshipSchema,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>
  ): CsvRelationshipVisitor {
    return new CsvRelationshipVisitor(fileLocation, relationshipSchema, new Set(), 0, relationshipTypeMapping);
  }

  /**
   * Export current relationship element to CSV.
   */
  protected exportElement(): void {
    const fileAppender = this.getAppender();

    try {
      fileAppender.startLine();

      // Write start and end nodes
      fileAppender.append(this.startNode());
      fileAppender.append(this.endNode());

      // Write properties
      this.forEachProperty((key: string, value: any) => {
        fileAppender.appendAny(value);
      });

      fileAppender.endLine();
    } catch (error) {
      throw new Error(`Failed to export relationship element: ${error}`);
    }
  }

  /**
   * Close all CSV appenders.
   */
  public async close(): Promise<void> {
    const closePromises = Array.from(this.csvAppenders.values())
      .map(async (csvAppender) => {
        try {
          await csvAppender.flush();
          await csvAppender.close();
        } catch (error) {
          throw new Error(`Failed to close appender: ${error}`);
        }
      });

    await Promise.all(closePromises);
  }

  /**
   * Flush all CSV appenders.
   */
  public async flush(): Promise<void> {
    const flushPromises = Array.from(this.csvAppenders.values())
      .map(csvAppender => csvAppender.flush());

    await Promise.all(flushPromises);
  }

  /**
   * Get or create appender for current relationship type.
   */
  private getAppender(): JacksonFileAppender {
    const relType = this.relationshipType();

    let appender = this.csvAppenders.get(relType);

    if (!appender) {
      const fileName = this.formatWithLocale('relationships_%s', relType);
      const headerFileName = this.formatWithLocale('%s_header.csv', fileName);
      const dataFileName = this.formatWithLocale('%s_%d.csv', fileName, this.visitorId.toString());

      // Write header file if not already written
      if (this.headerFiles.add(headerFileName)) {
        this.writeHeaderFile(headerFileName);
      }

      // Create data file appender
      const dataFilePath = path.join(this.fileLocation, dataFileName);
      appender = this.fileAppender(dataFilePath);
      this.csvAppenders.set(relType, appender);
    }

    return appender;
  }

  /**
   * Write header file for current relationship type.
   */
  private writeHeaderFile(headerFileName: string): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);

    try {
      const headerAppender = this.fileAppender(headerFilePath);

      headerAppender.startLine();
      headerAppender.append(CsvRelationshipVisitor.START_ID_COLUMN_NAME);
      headerAppender.append(CsvRelationshipVisitor.END_ID_COLUMN_NAME);

      this.forEachPropertyWithType((key: string, value: any, type: ValueType) => {
        const propertyHeader = this.formatWithLocale(
          '%s:%s',
          key,
          type.csvName()
        );
        headerAppender.append(propertyHeader);
      });

      headerAppender.endLine();
      headerAppender.close();
    } catch (error) {
      throw new Error(`Could not write header file ${headerFileName}: ${error}`);
    }
  }

  /**
   * Create file appender with proper schema.
   */
  private fileAppender(filePath: string): JacksonFileAppender {
    const propertySchema = this.getPropertySchema();

    // Sort by property key for deterministic output
    propertySchema.sort((a, b) => a.key().localeCompare(b.key()));

    return JacksonFileAppender.of(
      filePath,
      propertySchema,
      (csvSchemaBuilder) => csvSchemaBuilder
        .addNumberColumn(CsvRelationshipVisitor.START_ID_COLUMN_NAME)
        .addNumberColumn(CsvRelationshipVisitor.END_ID_COLUMN_NAME)
    );
  }

  /**
   * Format string with locale (equivalent to Java formatWithLocale).
   */
  private formatWithLocale(template: string, ...args: string[]): string {
    let result = template;
    for (const arg of args) {
      result = result.replace('%s', arg).replace('%d', arg);
    }
    return result;
  }
}
