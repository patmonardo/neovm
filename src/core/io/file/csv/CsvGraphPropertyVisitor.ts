/**
 * CSV GRAPH PROPERTY VISITOR - EXPORTS GRAPH PROPERTIES TO CSV FILES
 *
 * Visitor that exports graph properties to CSV files, one file per property.
 * Creates separate header and data files for each graph property.
 */

import { PropertySchema } from "@/api/schema/";
import { GraphPropertyVisitor } from "@/core/io/file";
import { SimpleCsvWriter } from "./SimpleCsvWriter";
import * as fs from "fs";
import * as path from "path";

export class CsvGraphPropertyVisitor extends GraphPropertyVisitor {
  static readonly GRAPH_PROPERTY_DATA_FILE_NAME_TEMPLATE =
    "graph_property_%s_%d.csv";
  private static readonly GRAPH_PROPERTY_HEADER_FILE_NAME_TEMPLATE =
    "graph_property_%s_header.csv";

  private readonly fileLocation: string;
  private readonly graphPropertySchemas: Map<string, PropertySchema>;
  private readonly visitorId: number;
  private readonly csvWriters: Map<string, SimpleCsvWriter>;
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
    this.csvWriters = new Map<string, SimpleCsvWriter>();
  }

  property(key: string, value: any): boolean {
    const writer = this.getWriter(key);

    // Write single property value as CSV row
    writer.writeRow([this.formatCsvValue(value)]);

    return true;
  }

  flush(): void {
    for (const writer of this.csvWriters.values()) {
      writer.flush();
    }
  }

  close(): void {
    for (const writer of this.csvWriters.values()) {
      try {
        writer.flush();
        writer.close();
      } catch (error) {
        throw new Error(
          `Failed to close CSV writer: ${(error as Error).message}`
        );
      }
    }
  }

  private getWriter(propertyKey: string): SimpleCsvWriter {
    return this.csvWriters.get(propertyKey) || this.createWriter(propertyKey);
  }

  private createWriter(propertyKey: string): SimpleCsvWriter {
    const headerFileName = this.formatFileName(
      CsvGraphPropertyVisitor.GRAPH_PROPERTY_HEADER_FILE_NAME_TEMPLATE,
      propertyKey
    );
    const dataFileName = this.formatFileName(
      CsvGraphPropertyVisitor.GRAPH_PROPERTY_DATA_FILE_NAME_TEMPLATE,
      propertyKey,
      this.visitorId
    );

    const propertySchema = this.graphPropertySchemas.get(propertyKey);
    if (!propertySchema) {
      throw new Error(`No schema found for graph property: ${propertyKey}`);
    }

    // Write header file if not already written
    if (this.headerFiles.add(headerFileName)) {
      this.writeHeaderFile(propertySchema, headerFileName);
    }

    // Create data file writer
    const dataFilePath = path.join(this.fileLocation, dataFileName);
    const writer = new SimpleCsvWriter(dataFilePath);

    this.csvWriters.set(propertyKey, writer);
    return writer;
  }

  private writeHeaderFile(
    propertySchema: PropertySchema,
    headerFileName: string
  ): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);

    const propertyHeader = `${propertySchema.key()}:${propertySchema
      .valueType()
      .csvName()}`;

    try {
      fs.writeFileSync(headerFilePath, propertyHeader, "utf-8");
    } catch (error) {
      throw new Error(
        `Could not write header file: ${(error as Error).message}`
      );
    }
  }

  private formatFileName(template: string, ...args: any[]): string {
    let result = template;
    args.forEach((arg, index) => {
      result = result.replace("%s", String(arg)).replace("%d", String(arg));
    });
    return result;
  }

  private formatCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    const str = value.toString();

    // Escape CSV special characters
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }
}
