 /**
 * CSV TO GRAPH STORE IMPORTER - CSV FILE IMPORT IMPLEMENTATION
 *
 * Concrete importer that handles CSV file directories.
 * Extends FileToGraphStoreImporter with CSV-specific file input.
 */

import { Log } from "@/utils";
import { Concurrency } from "@/concurrency";
import { FileInput } from "@/core/io/file";
import { FileToGraphStoreImporter } from "@/core/io/file";
import { TaskRegistryFactory } from "@/core/utils/progress";
import { CsvFileInput } from "./CsvFileInput";

export class CsvToGraphStoreImporter extends FileToGraphStoreImporter {
  constructor(
    concurrency: Concurrency,
    importPath: string,
    log: Log,
    taskRegistryFactory: TaskRegistryFactory
  ) {
    super(concurrency, importPath, log, taskRegistryFactory);
  }

  protected fileInput(importPath: string): FileInput {
    return new CsvFileInput(importPath);
  }

  protected rootTaskName(): string {
    return "Csv";
  }
}
