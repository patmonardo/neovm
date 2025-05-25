import { ConfigLoader } from '../loader';
import { ConfigValidation } from '../loader';
import {
  GraphStoreExporterConfig,
  GraphStoreDatabaseExporterConfig,
  GraphStoreFileImporterConfig,
  GraphStoreDatabaseImporterConfig
} from '../interfaces';
import { RelationshipType } from '@/projection';

/**
 * Factory functions for I/O configuration objects.
 */
export class IOConfigFactory {

  static fileExporter(params: Partial<GraphStoreExporterConfig> = {}): GraphStoreExporterConfig {
    const fileDefaults = ConfigLoader.getDefaults<GraphStoreExporterConfig>('export');
    const builtInDefaults: GraphStoreExporterConfig = {
      exportPath: "/tmp/gds-export",
      writeConcurrency: 4,
      batchSize: 10000,
      defaultRelationshipType: RelationshipType.of("REL")
    };

    const config: GraphStoreExporterConfig = {
      ...builtInDefaults,
      ...fileDefaults,
      ...params
    };

    ConfigValidation.validateRequired(config.exportPath, "exportPath");
    ConfigValidation.validatePath(config.exportPath);
    ConfigValidation.validatePositive(config.writeConcurrency, "writeConcurrency");
    ConfigValidation.validateRange(config.writeConcurrency, 1, 100, "writeConcurrency");
    ConfigValidation.validatePositive(config.batchSize, "batchSize");

    return config;
  }

  static databaseExporter(params: Partial<GraphStoreDatabaseExporterConfig> = {}): GraphStoreDatabaseExporterConfig {
    const fileDefaults = ConfigLoader.getDefaults<GraphStoreDatabaseExporterConfig>('database');
    const builtInDefaults: GraphStoreDatabaseExporterConfig = {
      databaseName: "generated-graph",
      writeConcurrency: 4,
      batchSize: 10000,
      defaultRelationshipType: RelationshipType.of("REL"),
      enableDebugLog: false,
      databaseFormat: "standard",
      highIO: false,
      force: false
    };

    const config: GraphStoreDatabaseExporterConfig = {
      ...builtInDefaults,
      ...fileDefaults,
      ...params
    };

    ConfigValidation.validateRequired(config.databaseName, "databaseName");
    ConfigValidation.validateDatabaseName(config.databaseName);
    ConfigValidation.validatePositive(config.writeConcurrency, "writeConcurrency");
    ConfigValidation.validateRange(config.writeConcurrency, 1, 100, "writeConcurrency");
    ConfigValidation.validatePositive(config.batchSize, "batchSize");

    return config;
  }

  static fileImporter(params: Partial<GraphStoreFileImporterConfig> = {}): GraphStoreFileImporterConfig {
    const builtInDefaults: GraphStoreFileImporterConfig = {
      importPath: "/tmp/gds-import",
      readConcurrency: 4,
      batchSize: 10000,
      skipInvalidLines: false,
      delimiter: ",",
      quotationCharacter: '"',
      escapeCharacter: '\\'
    };

    const config = { ...builtInDefaults, ...params };

    ConfigValidation.validateRequired(config.importPath, "importPath");
    ConfigValidation.validatePath(config.importPath);
    ConfigValidation.validatePositive(config.readConcurrency, "readConcurrency");
    ConfigValidation.validatePositive(config.batchSize, "batchSize");

    return config;
  }

  static databaseImporter(params: Partial<GraphStoreDatabaseImporterConfig> = {}): GraphStoreDatabaseImporterConfig {
    const builtInDefaults: GraphStoreDatabaseImporterConfig = {
      databaseName: "source-graph",
      readConcurrency: 4,
      batchSize: 10000
    };

    const config = { ...builtInDefaults, ...params };

    ConfigValidation.validateRequired(config.databaseName, "databaseName");
    ConfigValidation.validateDatabaseName(config.databaseName);
    ConfigValidation.validatePositive(config.readConcurrency, "readConcurrency");
    ConfigValidation.validatePositive(config.batchSize, "batchSize");

    return config;
  }
}
