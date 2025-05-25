import * as path from 'path';
import { FileToGraphStoreImporter, FileInput } from '@/core/io/file';
import { Concurrency, TaskRegistryFactory } from '@/core/concurrency';
import { Log } from '@/logging';
import { SimpleCsvFileInput } from './SimpleCsvFileInput';

/**
 * CSV-specific graph store importer.
 * Extends the base file importer to handle CSV format files.
 */
export class CsvToGraphStoreImporter extends FileToGraphStoreImporter {

  constructor(
    concurrency: Concurrency,
    importPath: string,
    log: Log,
    taskRegistryFactory: TaskRegistryFactory
  ) {
    super(concurrency, importPath, log, taskRegistryFactory);
  }

  /**
   * Create CSV file input for the import path.
   */
  protected fileInput(importPath: string): FileInput {
    return new SimpleCsvFileInput(importPath);
  }

  /**
   * Get the root task name for CSV imports.
   */
  protected rootTaskName(): string {
    return 'Csv';
  }

  /**
   * Static factory method for creating CSV importers.
   */
  static create(
    concurrency: Concurrency,
    importPath: string,
    log: Log,
    taskRegistryFactory?: TaskRegistryFactory
  ): CsvToGraphStoreImporter {
    const factory = taskRegistryFactory || new SimpleTaskRegistryFactory();
    return new CsvToGraphStoreImporter(concurrency, importPath, log, factory);
  }

  /**
   * Create importer with default settings.
   */
  static createDefault(importPath: string, log: Log): CsvToGraphStoreImporter {
    return CsvToGraphStoreImporter.create(
      Concurrency.DEFAULT,
      importPath,
      log
    );
  }

  /**
   * Create single-threaded importer for testing.
   */
  static createSingleThreaded(importPath: string, log: Log): CsvToGraphStoreImporter {
    return CsvToGraphStoreImporter.create(
      Concurrency.SINGLE_THREAD,
      importPath,
      log
    );
  }
}
