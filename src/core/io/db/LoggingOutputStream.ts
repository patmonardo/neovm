import { Log } from "@/utils";
import { Writable } from "stream";

/**
 * A writable stream that redirects output to a logger.
 * Buffers incoming data and logs complete lines when line separators are encountered.
 *
 * This is useful for capturing output from external processes or libraries
 * and routing it through the application's logging system instead of stdout/stderr.
 */
export class LoggingOutputStream extends Writable {
  private readonly log: Log;
  private readonly lineSeparator: string;
  private readonly lineSeparatorLength: number;
  private buffer: string = "";

  constructor(log: Log) {
    super();
    this.log = log;
    this.lineSeparator = require("os").EOL; // Platform-specific line separator
    this.lineSeparatorLength = this.lineSeparator.length;
  }

  /**
   * Writes data to the stream buffer.
   * When a complete line is detected (ends with line separator), it's logged and the buffer is cleared.
   *
   * @param chunk The data to write
   * @param encoding The character encoding (ignored for string input)
   * @param callback Called when the write operation completes
   */
  _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    try {
      // Convert chunk to string if it's a Buffer
      const data =
        chunk instanceof Buffer ? chunk.toString(encoding) : chunk.toString();

      this.buffer += data;

      // Check if we have a complete line
      const lineSeparatorIndex = this.buffer.lastIndexOf(this.lineSeparator);
      if (lineSeparatorIndex !== -1) {
        // Extract the complete line(s) without the line separator
        const lineToLog = this.buffer.substring(0, lineSeparatorIndex);

        // Keep any remaining data after the last line separator
        this.buffer = this.buffer.substring(
          lineSeparatorIndex + this.lineSeparatorLength
        );

        // Log the complete line(s)
        if (lineToLog.length > 0) {
          // Split multiple lines if present and log each separately
          const lines = lineToLog.split(this.lineSeparator);
          lines.forEach((line) => {
            if (line.length > 0) {
              this.log.debug(line);
            }
          });
        }
      }

      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Flushes any remaining buffered data when the stream is closed.
   *
   * @param callback Called when the close operation completes
   */
  _final(callback: (error?: Error | null) => void): void {
    try {
      this.flushBuffer();
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Manually flush any buffered data to the log.
   * This will log any incomplete line that remains in the buffer.
   */
  flush(): void {
    this.flushBuffer();
  }

  /**
   * Internal method to flush the buffer contents to the log.
   */
  private flushBuffer(): void {
    if (this.buffer.length > 0) {
      this.log.debug(this.buffer);
      this.buffer = "";
    }
  }

  /**
   * Alternative factory method for creating a LoggingOutputStream.
   *
   * @param log The logger to use for output
   * @returns A new LoggingOutputStream instance
   */
  static create(log: Log): LoggingOutputStream {
    return new LoggingOutputStream(log);
  }
}
