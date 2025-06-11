import { RelationshipType } from "@/projection";
import { BaseConfig } from "@/config";
import { WriteConfig } from "@/config";

/**
 * Input/Output configuration interfaces.
 */

export interface GraphStoreFileImporterConfig extends BaseConfig {
  importPath: string;
  readConcurrency: number;
  batchSize: number;
  skipInvalidLines: boolean;
  delimiter: string;
  quotationCharacter: string;
  escapeCharacter: string;
}

export interface GraphStoreFileExporterConfig extends WriteConfig {
  exportPath: string;
  batchSize: number;
  defaultRelationshipType: RelationshipType;
}

export interface GraphStoreDatabaseImporterConfig extends BaseConfig {
  databaseName: string;
  readConcurrency: number;
  batchSize: number;
  nodeQuery?: string;
  relationshipQuery?: string;
}

export interface GraphStoreDatabaseExporterConfig extends WriteConfig {
  databaseName: string;
  batchSize: number;
  defaultRelationshipType: RelationshipType;
  enableDebugLog: boolean;
  databaseFormat: string;
  highIO: boolean;
  force: boolean;
}
