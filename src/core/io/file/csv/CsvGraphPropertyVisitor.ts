import * as fs from 'fs';
import * as path from 'path';
import { GraphPropertyVisitor } from '@/core/io/file';
import { PropertySchema } from '@/api/schema';
import { CsvFileAppender } from './CsvFileAppender';

/**
 * CSV visitor that exports graph properties to separate CSV files.
 * Creates one data file per property plus header files.
 */
export class CsvGraphPropertyVisitor extends GraphPropertyVisitor {
  static readonly GRAPH_PROPERTY_DATA_FILE_NAME_TEMPLATE = 'graph_property_%s_%d.csv';
  private static readonly GRAPH_PROPERTY_HEADER_FILE_NAME_TEMPLATE = 'graph_property_%s_header.csv';

  private readonly fileLocation: string;
  private readonly graphPropertySchemas: Map<string, PropertySchema>;
  private readonly visitorId: number;
  private readonly csvAppenders: Map<string, CsvFileAppender>;
  private readonly headerFiles: Set<string>;

  constructor(
    fileLocation: string,
    graphPropertySchemas: Map<string, PropertySchema>,
    headerFiles: Set<string>,
    visitorId: number
  ) {
    super();
    this.fileLocation = fileLocation;
    this.graphPropertySchemas = graphPropertySchemas;
    this.headerFiles = headerFiles;
    this.visitorId = visitorId;
    this.csvAppenders = new Map();
  }

  /**
   * Export a property key-value pair.
   */
  property(key: string, value: any): boolean {
    const appender = this.getAppender(key);

    try {
      appender.startLine();
      appender.appendAny(value);
      appender.endLine();
    } catch (error) {
      throw new Error(`Failed to write property ${key}: ${error}`);
    }

    return true;
  }

  /**
   * Flush all CSV appenders.
   */
  async flush(): Promise<void> {
    const flushPromises = Array.from(this.csvAppenders.values())
      .map(appender => appender.flush());

    await Promise.all(flushPromises);
  }

  /**
   * Close all CSV appenders.
   */
  async close(): Promise<void> {
    const closePromises = Array.from(this.csvAppenders.values())
      .map(async (appender) => {
        try {
          await appender.flush();
          await appender.close();
        } catch (error) {
          throw new Error(`Failed to close appender: ${error}`);
        }
      });

    await Promise.all(closePromises);
  }

  /**
   * Get or create appender for a property key.
   */
  private getAppender(propertyKey: string): CsvFileAppender {
    let appender = this.csvAppenders.get(propertyKey);

    if (!appender) {
      const headerFileName = this.formatString(
        CsvGraphPropertyVisitor.GRAPH_PROPERTY_HEADER_FILE_NAME_TEMPLATE,
        propertyKey
      );
      const dataFileName = this.formatString(
        CsvGraphPropertyVisitor.GRAPH_PROPERTY_DATA_FILE_NAME_TEMPLATE,
        propertyKey,
        this.visitorId.toString()
      );
      const propertySchema = this.graphPropertySchemas.get(propertyKey);

      if (!propertySchema) {
        throw new Error(`No schema found for property: ${propertyKey}`);
      }

      // Write header file if not already written
      if (!this.headerFiles.has(headerFileName)) {
        this.writeHeaderFile(propertySchema, headerFileName);
        this.headerFiles.add(headerFileName);
      }

      // Create data file appender
      const dataFilePath = path.join(this.fileLocation, dataFileName);
      appender = CsvFileAppender.of(dataFilePath, [propertySchema]);
      this.csvAppenders.set(propertyKey, appender);
    }

    return appender;
  }

  /**
   * Write header file for a property.
   */
  private writeHeaderFile(propertySchema: PropertySchema, headerFileName: string): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);

    try {
      const propertyHeader = this.formatString(
        '%s:%s',
        propertySchema.key(),
        propertySchema.valueType().csvName()
      );

      fs.writeFileSync(headerFilePath, propertyHeader + '\n', 'utf8');
    } catch (error) {
      throw new Error(`Could not write header file ${headerFileName}: ${error}`);
    }
  }

  /**
   * Format string with locale (equivalent to Java formatWithLocale).
   */
  private formatString(template: string, ...args: string[]): string {
    let result = template;
    for (let i = 0; i < args.length; i++) {
      result = result.replace('%s', args[i]);
      result = result.replace('%d', args[i]);
    }
    return result;
  }

  /**
   * Static factory method.
   */
  static create(
    fileLocation: string,
    graphPropertySchemas: Map<string, PropertySchema>,
    headerFiles: Set<string>,
    visitorId: number
  ): CsvGraphPropertyVisitor {
    return new CsvGraphPropertyVisitor(fileLocation, graphPropertySchemas, headerFiles, visitorId);
  }
}
