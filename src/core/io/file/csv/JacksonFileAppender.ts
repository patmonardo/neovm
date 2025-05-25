import * as fs from 'fs';
import * as path from 'path';
import { PropertySchema, ValueType, DefaultValue } from '@/api';

/**
 * CSV file appender using type-safe schema-based writing.
 * Equivalent to Jackson's CsvGenerator but implemented with native CSV writing.
 */
export class JacksonFileAppender implements Flushable, AutoCloseable {
  private readonly writer: fs.WriteStream;
  private readonly csvSchema: CsvSchema;
  private readonly filePath: string;

  private currentColumnIndex: number = 0;
  private isFirstRow: boolean = true;
  private currentRowData: string[] = [];

  /**
   * Create a JacksonFileAppender with schema-based CSV writing.
   */
  static of<PROPERTY_SCHEMA extends PropertySchema>(
    filePath: string,
    propertySchemas: PROPERTY_SCHEMA[],
    schemaEnricher: (builder: CsvSchemaBuilder) => CsvSchemaBuilder
  ): JacksonFileAppender {
    // Build CSV schema
    let csvSchemaBuilder = schemaEnricher(new CsvSchemaBuilder());

    for (const propertySchema of propertySchemas) {
      switch (propertySchema.valueType()) {
        case ValueType.LONG:
        case ValueType.DOUBLE:
          csvSchemaBuilder.addNumberColumn(propertySchema.key());
          break;
        case ValueType.DOUBLE_ARRAY:
        case ValueType.FLOAT_ARRAY:
        case ValueType.LONG_ARRAY:
          csvSchemaBuilder.addArrayColumn(propertySchema.key(), ';');
          break;
        case ValueType.STRING:
          csvSchemaBuilder.addColumn(propertySchema.key());
          break;
        case ValueType.UNKNOWN:
          break;
      }
    }

    const csvSchema = csvSchemaBuilder.build();

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writer = fs.createWriteStream(filePath, {
        encoding: 'utf8',
        flags: 'w'
      });

      return new JacksonFileAppender(writer, csvSchema, filePath);
    } catch (error) {
      throw new Error(`Failed to create CSV appender at ${filePath}: ${error}`);
    }
  }

  private constructor(
    writer: fs.WriteStream,
    csvSchema: CsvSchema,
    filePath: string
  ) {
    this.writer = writer;
    this.csvSchema = csvSchema;
    this.filePath = filePath;
  }

  /**
   * Append a long value.
   */
  append(value: number): void {
    try {
      if (value !== DefaultValue.LONG_DEFAULT_FALLBACK && value !== DefaultValue.INTEGER_DEFAULT_FALLBACK) {
        this.setFieldValue(value.toString());
      } else {
        this.appendEmptyField();
      }
    } catch (error) {
      throw new Error(`Failed to append long value: ${error}`);
    }
  }

  /**
   * Append a double value.
   */
  appendDouble(value: number): void {
    try {
      if (!isNaN(value)) {
        this.setFieldValue(value.toString());
      } else {
        this.appendEmptyField();
      }
    } catch (error) {
      throw new Error(`Failed to append double value: ${error}`);
    }
  }

  /**
   * Append a string value.
   */
  appendString(value: string): void {
    try {
      this.setFieldValue(this.escapeCsvValue(value));
    } catch (error) {
      throw new Error(`Failed to append string value: ${error}`);
    }
  }

  /**
   * Append a double array.
   */
  appendDoubleArray(value: number[]): void {
    try {
      const arrayString = value.join(';');
      this.setFieldValue(this.escapeCsvValue(arrayString));
    } catch (error) {
      throw new Error(`Failed to append double array: ${error}`);
    }
  }

  /**
   * Append a long array.
   */
  appendLongArray(value: number[]): void {
    try {
      const arrayString = value.map(v => Math.floor(v)).join(';');
      this.setFieldValue(this.escapeCsvValue(arrayString));
    } catch (error) {
      throw new Error(`Failed to append long array: ${error}`);
    }
  }

  /**
   * Append a float array.
   */
  appendFloatArray(value: number[]): void {
    try {
      const arrayString = value.join(';');
      this.setFieldValue(this.escapeCsvValue(arrayString));
    } catch (error) {
      throw new Error(`Failed to append float array: ${error}`);
    }
  }

  /**
   * Append any value with type detection.
   */
  appendAny(value: any): void {
    try {
      if (value instanceof Number || typeof value === 'number') {
        if (Number.isInteger(value)) {
          this.append(value);
        } else {
          this.appendDouble(value);
        }
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          if (typeof value[0] === 'number') {
            if (Number.isInteger(value[0])) {
              this.appendLongArray(value);
            } else {
              this.appendDoubleArray(value);
            }
          } else {
            throw new Error(`Unsupported array type: ${typeof value[0]}`);
          }
        } else {
          this.appendEmptyField();
        }
      } else if (typeof value === 'string') {
        this.appendString(value);
      } else if (value === null || value === undefined) {
        this.appendEmptyField();
      } else {
        throw new Error(`Cannot write ${typeof value}`);
      }
    } catch (error) {
      throw new Error(`Failed to append any value: ${error}`);
    }
  }

  /**
   * Start a new line/row.
   */
  startLine(): void {
    try {
      this.currentColumnIndex = 0;
      this.currentRowData = [];
    } catch (error) {
      throw new Error(`Failed to start line: ${error}`);
    }
  }

  /**
   * End the current line/row and write to file.
   */
  endLine(): void {
    try {
      // Write header if this is the first row
      if (this.isFirstRow) {
        const headerRow = [];
        for (let i = 0; i < this.csvSchema.columnCount(); i++) {
          headerRow.push(this.csvSchema.column(i).getName());
        }
        this.writeRow(headerRow);
        this.isFirstRow = false;
      }

      // Fill remaining columns with empty values if needed
      while (this.currentRowData.length < this.csvSchema.columnCount()) {
        this.currentRowData.push('');
      }

      this.writeRow(this.currentRowData);
      this.currentRowData = [];
    } catch (error) {
      throw new Error(`Failed to end line: ${error}`);
    }
  }

  /**
   * Flush the writer.
   */
  flush(): void {
    try {
      // For file streams, we can't force flush but we can ensure data is written
      // The underlying stream will handle buffering
    } catch (error) {
      throw new Error(`Failed to flush: ${error}`);
    }
  }

  /**
   * Close the writer.
   */
  close(): void {
    try {
      this.writer.end();
    } catch (error) {
      throw new Error(`Failed to close: ${error}`);
    }
  }

  /**
   * Get the file path being written to.
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Append an empty field.
   */
  private appendEmptyField(): void {
    this.setFieldValue('');
  }

  /**
   * Set field value at current column index.
   */
  private setFieldValue(value: string): void {
    if (this.currentColumnIndex >= this.csvSchema.columnCount()) {
      throw new Error(`Column index ${this.currentColumnIndex} exceeds schema column count ${this.csvSchema.columnCount()}`);
    }

    // Ensure array is large enough
    while (this.currentRowData.length <= this.currentColumnIndex) {
      this.currentRowData.push('');
    }

    this.currentRowData[this.currentColumnIndex] = value;
    this.currentColumnIndex++;
  }

  /**
   * Write a row to the CSV file.
   */
  private writeRow(rowData: string[]): void {
    const csvLine = rowData.join(',') + '\n';
    this.writer.write(csvLine);
  }

  /**
   * Escape CSV values (handle quotes and commas).
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Escape quotes by doubling them and wrap in quotes
      const escaped = value.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return value;
  }
}
