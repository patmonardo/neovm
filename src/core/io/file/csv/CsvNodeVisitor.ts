/**
 * CSV NODE VISITOR - EXPORTS NODES TO CSV FILES
 *
 * Visitor that exports node data to CSV files grouped by label combinations.
 * Creates separate header and data files for each unique label set.
 */

import { NodeLabel } from "@/projection";
import { NodeSchema } from "@/api/schema";
import { PropertySchema } from "@/api/schema";
import { IdentifierMapper } from "@/core/io/IdentifierMapper";
import { NodeVisitor } from "@/core/io/file/NodeVisitor";
import { CsvSimpleWriter } from "./CsvSimpleWriter";
import * as fs from "fs";
import * as path from "path";

export class CsvNodeVisitor extends NodeVisitor {
  static readonly ID_COLUMN_NAME = ":ID";

  private readonly fileLocation: string;
  private readonly headerFiles: Set<string>;
  private readonly visitorId: number;
  private readonly nodeLabelMapping: IdentifierMapper<NodeLabel>;
  private readonly csvWriters: Map<string, CsvSimpleWriter>;

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
    this.csvWriters = new Map<string, CsvSimpleWriter>();
  }

  /**
   * Test-only constructor with default values.
   */
  static forTesting(
    fileLocation: string,
    nodeSchema: NodeSchema,
    nodeLabelMapping: IdentifierMapper<NodeLabel>
  ): CsvNodeVisitor {
    return new CsvNodeVisitor(
      fileLocation,
      nodeSchema,
      new Set<string>(),
      0,
      nodeLabelMapping
    );
  }

  protected exportElement(): void {
    const writer = this.getWriter();

    // Start CSV row
    const row: string[] = [];

    // Add ID column
    row.push(this.id().toString());

    // Add property values
    this.forEachProperty((key, value) => {
      row.push(this.formatCsvValue(value));
    });

    // Write row
    writer.writeRow(row);
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

  flush(): void {
    for (const writer of this.csvWriters.values()) {
      writer.flush();
    }
  }

  private getWriter(): CsvSimpleWriter {
    const labelsString = this.elementIdentifier();

    return this.csvWriters.get(labelsString) || this.createWriter(labelsString);
  }

  private createWriter(labelsString: string): CsvSimpleWriter {
    const fileName = labelsString === "" ? "nodes" : `nodes_${labelsString}`;
    const headerFileName = `${fileName}_header.csv`;
    const dataFileName = `${fileName}_${this.visitorId}.csv`;

    // Write header file if not already written
    if (this.headerFiles.add(headerFileName)) {
      this.writeHeaderFile(headerFileName);
    }

    // Create data file writer
    const dataFilePath = path.join(this.fileLocation, dataFileName);
    const writer = new CsvSimpleWriter(dataFilePath);

    this.csvWriters.set(labelsString, writer);
    return writer;
  }

  private writeHeaderFile(headerFileName: string): void {
    const headerFilePath = path.join(this.fileLocation, headerFileName);
    const headerRow: string[] = [];

    // Add ID column
    headerRow.push(CsvNodeVisitor.ID_COLUMN_NAME);

    // Add property columns with types
    this.forEachPropertyWithType((key, value, type) => {
      const propertyHeader = `${key}:${type.csvName()}`;
      headerRow.push(propertyHeader);
    });

    // Write header file
    try {
      const csvContent = headerRow.join(",");
      fs.writeFileSync(headerFilePath, csvContent, "utf-8");
    } catch (error) {
      throw new Error(
        `Could not write header file: ${(error as Error).message}`
      );
    }
  }

  protected getPropertySchema(): PropertySchema[] {
    const nodeLabelList =
      this.currentLabels().length === 0
        ? this.EMPTY_LABELS_LABEL
        : new Set(
            this.currentLabels().map((label) =>
              this.nodeLabelMapping.forIdentifier(label)
            )
          );

    const propertySchemaForLabels = this.nodeSchema().filter(nodeLabelList);
    const properties = Array.from(
      propertySchemaForLabels.unionProperties().values()
    );

    // Sort by key for consistent ordering
    properties.sort((a, b) => a.key().localeCompare(b.key()));

    return properties;
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
