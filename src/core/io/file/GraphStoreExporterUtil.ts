import * as fs from 'fs';
import * as path from 'path';
import { GraphStore } from '@/api';
import { GraphStoreExporter, ExportedProperties } from '@/core/io';
import { NeoNodeProperties } from '@/core/io';
import { GraphStoreToCsvExporter } from './csv/GraphStoreToCsvExporter';
import { GraphStoreToFileExporterParameters } from './GraphStoreToFileExporterParameters';
import { TaskRegistryFactory } from '@/core/utils/progress';
import { Log } from '@/logging';

/**
 * Utility class for high-level graph store export operations.
 * Provides path validation, directory management, and export orchestration.
 */
export class GraphStoreExporterUtil {
  public static readonly EXPORT_DIR = 'export';

  /**
   * Export a graph store to CSV format with comprehensive error handling and timing.
   */
  static async export(
    graphStore: GraphStore,
    exportPath: string,
    parameters: GraphStoreToFileExporterParameters,
    neoNodeProperties: NeoNodeProperties | null,
    taskRegistryFactory: TaskRegistryFactory,
    log: Log,
    executorService: any // Thread pool equivalent
  ): Promise<ExportToCsvResult> {
    try {
      // Create the CSV exporter
      const exporter = GraphStoreToCsvExporter.create(
        graphStore,
        parameters,
        exportPath,
        neoNodeProperties,
        taskRegistryFactory,
        log,
        executorService
      );

      // Execute export with timing
      const start = process.hrtime.bigint();
      const exportedProperties = await exporter.run();
      const end = process.hrtime.bigint();

      // Calculate duration in milliseconds
      const tookMillis = Number(end - start) / 1_000_000;

      log.info(`[gds] Export completed for '${parameters.exportName()}' in ${tookMillis} ms`);

      return {
        importedProperties: () => exportedProperties,
        tookMillis: () => Math.round(tookMillis)
      };
    } catch (error) {
      log.warn('CSV export failed', error);
      throw error;
    }
  }

  /**
   * Create and validate export path with security checks.
   */
  static exportPath(rootPath: string | null, exportName: string): string {
    if (!rootPath) {
      throw new Error(StringFormatting.formatWithLocale(
        "The configuration option '%s' must be set.",
        GdsSettings.exportLocation().name()
      ));
    }

    // Validate root directory is writable
    DIRECTORY_IS_WRITABLE.validate(rootPath);

    // Resolve and normalize the export path
    const resolvedExportPath = path.resolve(rootPath, exportName);
    const normalizedPath = path.normalize(resolvedExportPath);
    const resolvedParent = path.dirname(normalizedPath);

    // Security check: ensure export path is within root directory
    if (!resolvedParent || !this.isPathWithinRoot(normalizedPath, rootPath)) {
      throw new Error(StringFormatting.formatWithLocale(
        "Illegal parameter value for parameter exportName '%s'. It attempts to write into a forbidden directory.",
        exportName
      ));
    }

    // Check if directory already exists
    if (fs.existsSync(normalizedPath)) {
      throw new Error(StringFormatting.formatWithLocale(
        "The specified export directory '%s' already exists.",
        normalizedPath
      ));
    }

    // Create directory structure
    try {
      fs.mkdirSync(normalizedPath, { recursive: true });
    } catch (error) {
      throw new Error(`Could not create import directory: ${error}`);
    }

    return normalizedPath;
  }

  /**
   * Check if a path is within the root directory (security check).
   */
  private static isPathWithinRoot(targetPath: string, rootPath: string): boolean {
    const normalizedTarget = path.normalize(targetPath);
    const normalizedRoot = path.normalize(rootPath);

    return normalizedTarget.startsWith(normalizedRoot + path.sep) ||
           normalizedTarget === normalizedRoot;
  }

  // Private constructor - utility class
  private constructor() {}
}

/**
 * Result of CSV export operation.
 */
export interface ExportToCsvResult {
  /**
   * Properties that were exported.
   */
  importedProperties(): ExportedProperties;

  /**
   * Time taken in milliseconds.
   */
  tookMillis(): number;
}
