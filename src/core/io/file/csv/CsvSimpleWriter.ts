import * as fs from 'fs';
import * as path from 'path';

export class CsvSimpleWriter {
  private readonly filePath: string;
  private isOpen: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.openFile();
  }

  writeRow(row: string[]): void {
    if (!this.isOpen) {
      throw new Error(`CSV writer is not open for file: ${this.filePath}`);
    }

    const csvLine = row.join(',') + '\n';
    // Simple synchronous append
    fs.appendFileSync(this.filePath, csvLine, 'utf8');
  }

  writeRows(rows: string[][]): void {
    for (const row of rows) {
      this.writeRow(row);
    }
  }

  flush(): void {
    // No-op for sync operations
  }

  close(): void {
    this.isOpen = false;
  }

  isFileOpen(): boolean {
    return this.isOpen;
  }

  getFilePath(): string {
    return this.filePath;
  }

  private openFile(): void {
    // Create directory if needed
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create empty file
    fs.writeFileSync(this.filePath, '', 'utf8');
    this.isOpen = true;
  }
}
