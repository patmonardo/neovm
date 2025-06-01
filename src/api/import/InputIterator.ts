/**
 * INPUT ITERATOR - THREAD-SAFE CHUNK STREAMING
 *
 * Provides chunks of input data in a thread-safe manner.
 * Each thread gets its own chunk instance to avoid contention.
 *
 * WARNING: Implementations must be thread safe!
 */

import { InputChunk } from './input/InputChunk';

export interface InputIterator {
  /**
   * Called by each thread that will be reading input data.
   * The returned instances will be local to that thread.
   *
   * @returns an instance which is capable of receiving data in chunks
   */
  newChunk(): InputChunk;

  /**
   * Fills the given chunk with more data.
   * Should be called by the same thread that allocated the chunk.
   *
   * @param chunk to receive the new data
   * @returns true if data was retrieved into the chunk, false if no more data
   * @throws Error on I/O error
   */
  next(chunk: InputChunk): Promise<boolean>;

  /**
   * Close resources and cleanup.
   */
  close(): Promise<void>;
}
