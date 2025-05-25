import * as fs from 'fs';
import * as path from 'path';
import { NodeVisitor } from '@/core/io/file';
import { NodeLabel, ValueType } from '@/projection';
import { NodeSchema, PropertySchema, IdentifierMapper } from '@/api/schema';
import { JacksonFileAppender, CsvSchemaBuilder } from './JacksonFileAppender';

/**
 * CSV visitor that exports nodes to separate CSV files based on their labels.
 * Creates one data file per label combination plus header files.
 */
export class CsvNodeVisitor extends NodeVisitor {
  public static readonly ID_COLUMN_NAME = ':ID';

  private readonly fileLocation: string;
  private readonly headerFiles: Set<string>;
  private readonly visitorId: number;
  private readonly nodeLabelMapping: IdentifierMapper<NodeLabel>;
  private readonly csvAppenders: Map<string, JacksonFileAppender>;

  constructor(
    fileLocation: string,
    nodeSchema: NodeSchema,
    headerFiles: Set<string>,
    visitorId: number,
    nodeLabelMapping: IdentifierMapper<NodeLabel>
  ) {
    super(nodeSchema);
    this.fileLocation = fileLocation;
    this.headerFiles = headerFiles;
    this.visitorId = visitorId;
    this.nodeLabelMapping = nodeLabelMapping;
    this.csvAppenders = new Map();
  }

  /**
   * Test constructor with defaults.
   */
  static forTesting(
    fileLocation: string,
    nodeSchema: NodeSchema,
    nodeLabelMapping: IdentifierMapper<NodeLabel>
  ): CsvNodeVisitor {
    return new CsvNodeVisitor(fileLocation, nodeSchema, new Set(), 0, nodeLabelMapping);
  }

  /**
   * Export current node element to CSV.
   */
  protected exportElement(): void {
    const fileAppender = this.getAppender();

    try {
      fileAppender.startLine();
      fileAppender.append(this.id().toString());

      // Write properties
      this.forEachProperty((key: string, value: any) => {
        fileAppender.appendAny(value);
      });

      fileAppender.endLine();
    } catch (error) {
      throw new Error(`Failed to export node element: ${error}`);
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
   * Get or create appender for current labels.
   */
  private getAppender(): JacksonFileAppender {
    const labelsString = this.elementIdentifier();

    let appender = this.csvAppenders.get(labelsString);

    if (!appender) {
      const fileName = labelsString === '' ? 'nodes' : `nodes_${labelsString}`;
      const headerFileName = `${fileName}_header.csv`;
      const dataFileName = `${fileName}_${this.visitorId}.csv`;

      // Write header file if not already written
      if (this.headerFiles.add(headerFileName)) {
        this.writeHeaderFile(headerFileName);
      }

      // Create data file appender
      appender = this.fileAppender(
        path.join(this.fileLocation, dataFileName),
        (csvSchemaBuilder) => csvSchemaBuilder.addNumberColumn(CsvNodeVisitor.ID_COLUMN_NAME)
      );

      this.csvAppenders.set(labelsString, appender);
    }

    return appender;
  }

  /**
   * Write header file for current label combination.
   */
  private writeHeaderFile(headerFileName: string): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);

    try {
      const headerAppender = this.fileAppender(
        headerFilePath,
        (csvSchemaBuilder) => csvSchemaBuilder.addColumn(CsvNodeVisitor.ID_COLUMN_NAME, 'string')
      );

      headerAppender.startLine();
      headerAppender.append(CsvNodeVisitor.ID_COLUMN_NAME);

      this.forEachPropertyWithType((key: string, value: any, type: ValueType) => {
        const propertyHeader = `${key}:${type.csvName()}`;
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
  private fileAppender(
    filePath: string,
    builderFunction: (builder: CsvSchemaBuilder) => CsvSchemaBuilder
  ): JacksonFileAppender {
    const propertySchema = this.getPropertySchema();

    // Sort by property key for deterministic output
    propertySchema.sort((a, b) => a.key().localeCompare(b.key()));

    return JacksonFileAppender.of(filePath, propertySchema, builderFunction);
  }

  /**
   * Get property schema for current labels.
   */
  protected getPropertySchema(): PropertySchema[] {
    const nodeLabelSet = this.currentLabels.length === 0
      ? new Set<string>(NodeVisitor.EMPTY_LABELS_LABEL)
      : new Set(this.currentLabels.map(label => this.nodeLabelMapping.forIdentifier(label)));

    const propertySchemaForLabels = this.nodeSchema.filter(nodeLabelSet);
    return Array.from(propertySchemaForLabels.unionProperties().values());
  }

  /**
   * Format string with locale (equivalent to Java formatWithLocale).
   */
  private static formatWithLocale(template: string, ...args: any[]): string {
    let result = template;
    for (const arg of args) {
      result = result.replace('%s', arg.toString()).replace('%d', arg.toString());
    }
    return result;
  }
}
