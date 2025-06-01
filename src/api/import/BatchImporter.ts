/**
 * BATCH IMPORTER - CORE IMPORT ENGINE
 *
 * Main interface for importing graph data from Input sources.
 * This is where the actual file I/O and graph construction happens.
 */

import { Input } from './input/Input';

export interface BatchImporter {
  /**
   * Import graph data from the given input source.
   * This is where all the real work happens - file I/O, parsing, graph construction.
   */
  doImport(input: Input): Promise<void>;
}

/**
 * INCREMENTAL BATCH IMPORTER - THREE-PHASE IMPORT
 *
 * Advanced importer that breaks import into phases for better control.
 * Template method pattern with prepare → build → merge phases.
 */
export interface IncrementalBatchImporter extends BatchImporter {
  /**
   * Default implementation using three-phase approach.
   * Can be overridden for custom import strategies.
   */
  doImport(input: Input): Promise<void>;

  /**
   * Phase 1: Prepare for import - validate input, allocate resources.
   */
  prepare(input: Input): Promise<void>;

  /**
   * Phase 2: Build graph structures from input data.
   */
  build(input: Input): Promise<void>;

  /**
   * Phase 3: Merge and finalize the imported data.
   */
  merge(): Promise<void>;

  /**
   * Cleanup resources.
   */
  close(): Promise<void>;
}

// Default implementation of three-phase import
export abstract class AbstractIncrementalBatchImporter implements IncrementalBatchImporter {
  async doImport(input: Input): Promise<void> {
    await this.prepare(input);
    await this.build(input);
    await this.merge();
  }

  abstract prepare(input: Input): Promise<void>;
  abstract build(input: Input): Promise<void>;
  abstract merge(): Promise<void>;
  abstract close(): Promise<void>;
}
