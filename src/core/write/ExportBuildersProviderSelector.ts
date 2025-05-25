import { ExporterContext } from './ExporterContext';
import { NodePropertyExporterBuilder } from './NodePropertyExporterBuilder';
import { RelationshipStreamExporterBuilder } from './RelationshipStreamExporterBuilder';
import { RelationshipExporterBuilder } from './RelationshipExporterBuilder';
import { RelationshipPropertiesExporterBuilder } from './RelationshipPropertiesExporterBuilder';
import { NodeLabelExporterBuilder } from './NodeLabelExporterBuilder';

/**
 * Provider interface for creating different types of export builders.
 *
 * This is the **core factory interface** for the export framework. It provides
 * a unified way to create all types of exporters (nodes, relationships, properties)
 * while keeping the implementation details abstracted away.
 *
 * **Design Philosophy:**
 * - **Pure interface** - No implementation details, just contracts
 * - **Factory pattern** - Creates builders rather than direct exporters
 * - **Context-aware** - All builders receive an ExporterContext for configuration
 * - **Extensible** - Easy to add new export types by extending this interface
 *
 * **Usage Patterns:**
 * ```typescript
 * // File-based export provider
 * const fileProvider: ExportBuildersProvider = new FileExportBuildersProvider();
 *
 * // In-memory result store provider
 * const resultProvider: ExportBuildersProvider = new ResultStoreExportBuildersProvider();
 *
 * // Use the provider to create specific exporters
 * const nodeExporter = fileProvider.nodePropertyExporterBuilder(context);
 * const relExporter = fileProvider.relationshipExporterBuilder(context);
 * ```
 *
 * **Typical Implementations:**
 * - `FileExportBuildersProvider` - Exports to CSV, JSON, Parquet files
 * - `ResultStoreExportBuildersProvider` - Keeps results in memory for further processing
 * - `StreamExportBuildersProvider` - Streams results to external systems
 * - `DatabaseExportBuildersProvider` - Writes to different database systems
 */
export interface ExportBuildersProvider {
  /**
   * Creates a builder for exporting node properties.
   *
   * Node property exporters handle writing computed or transformed node
   * properties back to storage systems. This includes algorithm results
   * like PageRank scores, community IDs, centrality measures, etc.
   *
   * @param ctx The export context containing configuration and dependencies
   * @returns A builder for configuring and creating node property exporters
   */
  nodePropertyExporterBuilder(ctx: ExporterContext): NodePropertyExporterBuilder;

  /**
   * Creates a builder for streaming relationship exports.
   *
   * Relationship stream exporters provide efficient, memory-conscious ways
   * to export large relationship sets without loading everything into memory.
   * Ideal for processing massive graphs or real-time export scenarios.
   *
   * @param ctx The export context containing configuration and dependencies
   * @returns A builder for configuring and creating relationship stream exporters
   */
  relationshipStreamExporterBuilder(ctx: ExporterContext): RelationshipStreamExporterBuilder;

  /**
   * Creates a builder for bulk relationship exports.
   *
   * Relationship exporters handle writing relationship topology (source, target)
   * and basic relationship metadata. This is for exporting the graph structure
   * itself, typically used for graph serialization or migration.
   *
   * @param ctx The export context containing configuration and dependencies
   * @returns A builder for configuring and creating relationship exporters
   */
  relationshipExporterBuilder(ctx: ExporterContext): RelationshipExporterBuilder;

  /**
   * Creates a builder for exporting relationship properties.
   *
   * Relationship property exporters handle writing computed or stored
   * properties associated with relationships, such as weights, distances,
   * similarity scores, or other edge attributes.
   *
   * @param ctx The export context containing configuration and dependencies
   * @returns A builder for configuring and creating relationship property exporters
   */
  relationshipPropertiesExporterBuilder(ctx: ExporterContext): RelationshipPropertiesExporterBuilder;

  /**
   * Creates a builder for exporting node labels.
   *
   * Node label exporters handle writing node classification results,
   * such as community assignments, cluster IDs, or predicted labels
   * from machine learning algorithms.
   *
   * @param ctx The export context containing configuration and dependencies
   * @returns A builder for configuring and creating node label exporters
   */
  nodeLabelExporterBuilder(ctx: ExporterContext): NodeLabelExporterBuilder;
}
