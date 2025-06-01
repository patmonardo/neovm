/**
 * INPUT CHUNK - STREAMING DATA CHUNK INTERFACE
 *
 * A chunk of data which an InputEntityVisitor can visit to extract data from.
 * Core streaming pattern for batch imports from any source.
 * There may be zero or more entities in a chunk.
 */

import { InputEntityVisitor } from './InputEntityVisitor';

export interface InputChunk {
  /**
   * Process next chunk of data by visiting it with the provided visitor.
   * @param visitor The visitor that will extract data from this chunk
   * @returns true if there was data to process, false if end of stream
   * @throws Error if processing fails
   */
  next(visitor: InputEntityVisitor): Promise<boolean>;

  /**
   * Clean up resources when done with this chunk.
   */
  close(): Promise<void>;
}
