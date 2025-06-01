import * as fs from 'fs';
import * as path from 'path';
import { SingleRowVisitor } from '@/core/io';

/**
 * Visitor for writing user information to CSV files.
 * Implements SingleRowVisitor to write a single user info string to a file.
 */
export class UserInfoVisitor implements SingleRowVisitor<string> {
  public static readonly USER_INFO_FILE_NAME = '.userinfo';

  private readonly writer: fs.WriteStream;
  private readonly filePath: string;

  constructor(fileLocation: string) {
    this.filePath = path.join(fileLocation, UserInfoVisitor.USER_INFO_FILE_NAME);

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.writer = fs.createWriteStream(this.filePath, {
        encoding: 'utf8',
        flags: 'w' // Write mode (overwrite if exists)
      });
    } catch (error) {
      throw new Error(`Failed to create user info writer at ${this.filePath}: ${error}`);
    }
  }

  /**
   * Export username to the file.
   */
  export(username: string): void {
    try {
      this.writer.write(username);
    } catch (error) {
      throw new Error(`Failed to write username to ${this.filePath}: ${error}`);
    }
  }

  /**
   * Close the writer and flush data.
   */
  close(): void {
    try {
      this.writer.end(); // This flushes and closes the stream
    } catch (error) {
      throw new Error(`Failed to close user info writer: ${error}`);
    }
  }

  /**
   * Get the file path being written to.
   */
  getFilePath(): string {
    return this.filePath;
  }
}
