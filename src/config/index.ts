/**
 * CONFIGURATION SYSTEM - UNIFIED API
 *
 * FOLDER STRUCTURE:
 * /config/
 * ├── BaseTypes.ts              - Base configuration BaseTypes and interfaces
 * ├── interfaces.ts         - Specific configuration interfaces
 * ├── IOFactory.ts          - I/O configuration creation factories
 * ├── AlgoFactory.ts        - Algorithm configuration creation factories
 * ├── GraphFactory.ts       - Graph construction configuration factories
 * ├── ConfigLoader.ts       - YAML/environment variable loading
 * ├── ConfigValidation.ts   - Configuration validation logic
 * ├── tests/                - Test files (kept separate)
 * └── index.ts              - This file - unified API entry point
 *
 * USAGE PATTERNS:
 * 1. Simple configs:   ConfigFactory.pageRank()
 * 2. Custom configs:   ConfigFactory.pageRank({ iterations: 20 })
 * 3. File-based:       ConfigFactory.loadFromFile('myconfig.yaml')
 * 4. Environment:      ConfigFactory.fromEnvironment('PROD')
 */

// === TYPE EXPORTS ===
export type { BaseConfig } from "./BaseTypes";
export type { DeduplicationConfig } from "./BaseTypes";
export type { BuilderConfig } from "./BaseTypes";
export type { AlgoBaseConfig } from "./BaseTypes";
export type { ConcurrencyConfig } from "./BaseTypes";
export type { IterationsConfig } from "./BaseTypes";
export type { MutateConfig } from "./BaseTypes";
export type { EmbeddingDimensionConfig } from "./BaseTypes";
export type { FeaturePropertiesConfig } from "./BaseTypes";
export type { WriteConfig } from "./BaseTypes";

// === INTERFACE EXPORTS ===
export type { GraphCreateConfig } from "./GraphConfigs";
export type { GraphProjectConfig } from "./GraphConfigs";
//export type { GraphStoreConfig } from "./GraphStoreConfigs";
export type { GraphCatalogConfig } from "./GraphCatalogConfigs";
export type { PropertyConfig } from "./GraphConfigs";
export type { NodesBuilderConfig } from "./GraphConfigs";
export type { RelationshipsBuilderConfig } from "./GraphConfigs";
export type { RandomGraphGeneratorConfig } from "./GraphConfigs";
export type { GraphStoreFileExporterConfig } from "./IOConfigs";
export type { GraphStoreFileImporterConfig } from "./IOConfigs";
export type { GraphStoreDatabaseExporterConfig } from "./IOConfigs";
export type { GraphStoreDatabaseImporterConfig } from "./IOConfigs";
export type { PageRankConfig } from "./AlgoConfigs";
export type { LouvainConfig } from "./AlgoConfigs";
export type { NodeSimilarityConfig } from "./AlgoConfigs";
export type { BetweennessCentralityConfig } from "./AlgoConfigs";
export type { CommunityDetectionConfig } from "./AlgoConfigs";

// === FACTORY EXPORTS ===
export { IOConfigFactory } from "./IOConfigFactory";
export { AlgoConfigFactory } from "./AlgoConfigFactory";
export { GraphConfigFactory } from "./GraphConfigFactory";

// === LOADER EXPORTS ===
export { ConfigLoader } from "./ConfigLoader";
export { ConfigValidation } from "./ConfigValidation";

// === UNIFIED API IMPORTS ===
import { GraphConfigFactory } from "./GraphConfigFactory";
import { IOConfigFactory } from "./IOConfigFactory";
import { AlgoConfigFactory } from "./AlgoConfigFactory";
import { ConfigLoader } from "./ConfigLoader";

/**
 * Unified configuration factory - single entry point for all config creation.
 *
 * DESIGN PRINCIPLES:
 * - One-stop shop for all configurations
 * - Consistent API across all config BaseTypes
 * - Built-in validation and defaults
 * - File/environment integration
 * - Type-safe configuration creation
 */
export class ConfigFactory {
  // ==================== I/O OPERATIONS ====================
  /** Create file export configuration */
  static fileExporter = IOConfigFactory.fileExporter;

  /** Create database export configuration */
  static databaseExporter = IOConfigFactory.databaseExporter;

  /** Create file import configuration */
  static fileImporter = IOConfigFactory.fileImporter;

  /** Create database import configuration */
  static databaseImporter = IOConfigFactory.databaseImporter;

  // ==================== GRAPH ALGORITHMS ====================
  /** Create PageRank algorithm configuration */
  static pageRank = AlgoConfigFactory.pageRank;

  /** Create Louvain community detection configuration */
  static louvain = AlgoConfigFactory.louvain;

  /** Create node similarity configuration */
  static nodeSimilarity = AlgoConfigFactory.nodeSimilarity;

  /** Create betweenness centrality configuration */
  static betweennessCentrality = AlgoConfigFactory.betweennessCentrality;

  /** Create community detection configuration */
  static communityDetection = AlgoConfigFactory.communityDetection;

  // ==================== GRAPH CONSTRUCTION ====================
  /** Create nodes builder configuration */
  static nodesBuilder = GraphConfigFactory.nodesBuilder;

  /** Create property configuration */
  static propertyConfig = GraphConfigFactory.propertyConfig;

  /** Create relationships builder configuration */
  static relationshipsBuilder = GraphConfigFactory.relationshipsBuilder;

  // ==================== CONFIGURATION LOADING ====================
  /** Load configuration from YAML file */
  static loadFromFile = ConfigLoader.loadFromFile;

  /** Load configuration from environment variables */
  static fromEnvironment = ConfigLoader.loadFromEnvironment;

  /** Get default configuration for profile */
  static getDefaults = ConfigLoader.getDefaults;
}

// === DEFAULT EXPORT ===
export default ConfigFactory;
