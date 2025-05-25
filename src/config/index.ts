/**
 * SIMPLE CONFIG SYSTEM
 * Main entry point for all configuration functionality.
 */

// Export all interfaces and types
export * from './interfaces';
export * from './types';

// Export loaders and validation
export * from './loader';

// Export factories with a unified interface
import { IOConfigFactory } from './factory/IOFactory';
import { AlgoConfigFactory } from './factory/AlgoFactory';

/**
 * Unified configuration factory - single entry point for all config creation.
 */
export class ConfigFactory {
  // I/O Operations
  static fileExporter = IOConfigFactory.fileExporter;
  static databaseExporter = IOConfigFactory.databaseExporter;
  static fileImporter = IOConfigFactory.fileImporter;
  static databaseImporter = IOConfigFactory.databaseImporter;

  // Algorithms
  static pageRank = AlgoConfigFactory.pageRank;
  static louvain = AlgoConfigFactory.louvain;
  static nodeSimilarity = AlgoConfigFactory.nodeSimilarity;
  static betweennessCentrality = AlgoConfigFactory.betweennessCentrality;
  static communityDetection = AlgoConfigFactory.communityDetection;
}

// Global configuration and loader
export { GlobalConfig } from './loader/ConfigLoader';
export { ConfigLoader } from './loader/ConfigLoader';
export { ConfigValidation } from './loader/ConfigValidation';
