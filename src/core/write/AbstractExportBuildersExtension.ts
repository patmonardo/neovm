import { Config } from '@/neo4j/configuration/Config';
import { GraphDatabaseService } from '@/neo4j/graphdb/GraphDatabaseService';
import { GlobalProcedures } from '@/neo4j/kernel/api/procedure/GlobalProcedures';
import { ExtensionFactory } from '@/neo4j/kernel/extension/ExtensionFactory';
import { ExtensionType } from '@/neo4j/kernel/extension/ExtensionType';
import { ExtensionContext } from '@/neo4j/kernel/extension/context/ExtensionContext';
import { Lifecycle } from '@/neo4j/kernel/lifecycle/Lifecycle';
import { LifecycleAdapter } from '@/neo4j/kernel/lifecycle/LifecycleAdapter';

import { ExportBuildersProviderSelector } from './ExportBuildersProviderSelector';
import { ExporterContext } from './ExporterContext';
import { NodePropertyExporterBuilder } from './NodePropertyExporterBuilder';
import { RelationshipStreamExporterBuilder } from './RelationshipStreamExporterBuilder';
import { RelationshipExporterBuilder } from './RelationshipExporterBuilder';
import { RelationshipPropertiesExporterBuilder } from './RelationshipPropertiesExporterBuilder';
import { NodeLabelExporterBuilder } from './NodeLabelExporterBuilder';

/**
 * Abstract base class for Neo4j extensions that provide export builder functionality.
 *
 * This extension integrates the GDS (Graph Data Science) export system with Neo4j's
 * extension framework, making export builders available as **globally injectable components**
 * throughout the Neo4j ecosystem. It represents the **bridge between the export framework
 * and Neo4j's dependency injection system**.
 *
 * **Design Philosophy:**
 * - **Framework integration**: Seamlessly integrates export capabilities with Neo4j
 * - **Global availability**: Makes export builders accessible to all procedures and functions
 * - **Configuration-driven**: Uses Neo4j configuration to select appropriate export strategies
 * - **Lifecycle management**: Properly manages extension lifecycle within Neo4j's startup/shutdown
 * - **Dependency injection**: Enables clean dependency injection of export builders
 *
 * **Extension Framework Integration:**
 *
 * **Extension Type: DATABASE**
 * - Scoped to individual database instances rather than global cluster
 * - Each database can have different export configurations
 * - Allows per-database export strategy customization
 *
 * **Extension Key: "gds.write-services"**
 * - Unique identifier for this extension within Neo4j
 * - Groups all export-related services under a single namespace
 * - Enables configuration and management of export services
 *
 * **Lifecycle Integration:**
 * The extension follows Neo4j's standard lifecycle pattern:
 * 1. **Construction**: Extension factory creates the extension
 * 2. **Initialization**: Component registration during database startup
 * 3. **Runtime**: Export builders available for injection into procedures
 * 4. **Shutdown**: Automatic cleanup during database shutdown
 *
 * **Architecture Benefits:**
 *
 * **Separation of Concerns:**
 * - **AbstractExportBuildersExtension**: Framework integration and lifecycle management
 * - **ExportBuildersProviderSelector**: Strategy selection logic
 * - **ExportBuildersProvider**: Concrete export builder creation
 * - **Export builders**: Actual export functionality
 *
 * **Configuration Flexibility:**
 * ```typescript
 * // Different extensions can provide different selection strategies
 * class FileExportExtension extends AbstractExportBuildersExtension {
 *   protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
 *     return new FileBasedProviderSelector(config.getExportDirectory());
 *   }
 * }
 *
 * class DatabaseExportExtension extends AbstractExportBuildersExtension {
 *   protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
 *     return new DatabaseProviderSelector(gds, config.getTargetDatabase());
 *   }
 * }
 * ```
 *
 * **Global Component Registration:**
 * The extension registers all export builder types as global components:
 * - **NodePropertyExporterBuilder**: For node property exports
 * - **RelationshipStreamExporterBuilder**: For streaming relationship exports
 * - **RelationshipExporterBuilder**: For batch relationship exports
 * - **RelationshipPropertiesExporterBuilder**: For multi-property relationship exports
 * - **NodeLabelExporterBuilder**: For node label exports
 *
 * **Procedure Integration Example:**
 * ```typescript
 * // Procedures can inject export builders directly
 * @Procedure("gds.pageRank")
 * class PageRankProcedure {
 *   constructor(
 *     @Inject private nodePropertyExporterBuilder: NodePropertyExporterBuilder
 *   ) {}
 *
 *   public run(graphName: string, config: PageRankConfig): Stream<PageRankResult> {
 *     const algorithm = new PageRank(graph, config);
 *     const results = algorithm.compute();
 *
 *     // Export results using injected builder
 *     const exporter = this.nodePropertyExporterBuilder
 *       .withNodeLabels([NodeLabel.of('Person')])
 *       .withResultStore(Optional.of(resultStore))
 *       .build();
 *
 *     exporter.write('pagerank', results);
 *     return results.stream();
 *   }
 * }
 * ```
 *
 * **Use Cases:**
 * - **Algorithm procedures**: Export algorithm results to various destinations
 * - **Data transformation**: Convert graph data between different formats
 * - **Integration workflows**: Bridge GDS results with external systems
 * - **Development tools**: Provide export capabilities for testing and debugging
 * - **Production pipelines**: Enable automated data export workflows
 */
export abstract class AbstractExportBuildersExtension extends ExtensionFactory<AbstractExportBuildersExtension.Dependencies> {
  /**
   * Creates a new export builders extension.
   *
   * **Extension Configuration:**
   * - **Type**: DATABASE - scoped to individual database instances
   * - **Key**: "gds.write-services" - unique identifier for export services
   *
   * **Why DATABASE-scoped:**
   * Database-level scoping allows:
   * - **Per-database configuration**: Different export strategies per database
   * - **Isolation**: Export settings don't affect other databases
   * - **Flexibility**: Development and production databases can use different export methods
   * - **Security**: Export permissions can be database-specific
   */
  protected constructor() {
    super(ExtensionType.DATABASE, "gds.write-services");
  }

  /**
   * Creates a new lifecycle instance for this extension.
   *
   * This method is called by Neo4j during database startup to create the actual
   * extension instance. It follows the factory pattern where the extension factory
   * creates the runtime components needed for the extension to function.
   *
   * **Lifecycle Creation Process:**
   * 1. **Provider selection**: Abstract method creates appropriate provider selector
   * 2. **Component provider creation**: Wraps selector in lifecycle-aware component
   * 3. **Return lifecycle**: Neo4j manages the returned lifecycle instance
   *
   * **Dependency Injection:**
   * The dependencies parameter provides access to:
   * - **GlobalProcedures**: For registering injectable components
   * - **GraphDatabaseService**: For database-specific configuration
   * - **Config**: For reading export-related configuration settings
   *
   * @param context Extension context providing access to Neo4j services
   * @param dependencies Required dependencies for export functionality
   * @returns Lifecycle instance that will manage export component registration
   */
  public newInstance(context: ExtensionContext, dependencies: AbstractExportBuildersExtension.Dependencies): Lifecycle {
    const exportBuildersProviderSelector = this.exportBuildersProviderSelector(
      dependencies.graphDatabaseService(),
      dependencies.config()
    );

    return new GlobalProceduresExporterComponentProvider(
      dependencies.globalProcedures(),
      exportBuildersProviderSelector
    );
  }

  /**
   * Creates an export builders provider selector for this extension.
   *
   * This is the **key customization point** for concrete extension implementations.
   * Different extensions can provide different provider selection strategies based
   * on configuration, database type, environment, or other factors.
   *
   * **Implementation Examples:**
   *
   * **File-based Export Extension:**
   * ```typescript
   * protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
   *   const exportDir = config.getString('gds.export.directory', '/tmp/gds-exports');
   *   const format = config.getString('gds.export.format', 'csv');
   *   return new FileExportProviderSelector(exportDir, format);
   * }
   * ```
   *
   * **Database Export Extension:**
   * ```typescript
   * protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
   *   const targetDb = config.getString('gds.export.target.database');
   *   return new DatabaseExportProviderSelector(gds, targetDb);
   * }
   * ```
   *
   * **Multi-Strategy Extension:**
   * ```typescript
   * protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
   *   const strategy = config.getString('gds.export.strategy', 'auto');
   *   return switch (strategy) {
   *     case 'file' => new FileExportProviderSelector(config);
   *     case 'database' => new DatabaseExportProviderSelector(gds, config);
   *     case 'resultstore' => new ResultStoreProviderSelector();
   *     default => new AutoDetectProviderSelector(gds, config);
   *   };
   * }
   * ```
   *
   * **Environment-based Selection:**
   * ```typescript
   * protected exportBuildersProviderSelector(gds: GraphDatabaseService, config: Config) {
   *   const environment = config.getString('neo4j.environment', 'production');
   *   return environment === 'development'
   *     ? new ResultStoreProviderSelector() // Fast in-memory for dev
   *     : new DatabaseExportProviderSelector(gds, config); // Persistent for prod
   * }
   * ```
   *
   * @param graphDatabaseService The database service for database-specific logic
   * @param config Neo4j configuration for reading export settings
   * @returns Provider selector that will choose appropriate export strategies
   */
  protected abstract exportBuildersProviderSelector(
    graphDatabaseService: GraphDatabaseService,
    config: Config
  ): ExportBuildersProviderSelector;

  /**
   * Lifecycle component that manages global procedure registration of export builders.
   *
   * This inner class handles the actual registration of export builder components
   * with Neo4j's global procedures registry. It extends LifecycleAdapter to
   * participate in Neo4j's startup/shutdown lifecycle.
   *
   * **Lifecycle Management:**
   * - **init()**: Called during database startup to register components
   * - **start()**: Inherited from LifecycleAdapter (no-op)
   * - **stop()**: Inherited from LifecycleAdapter (automatic cleanup)
   * - **shutdown()**: Inherited from LifecycleAdapter (automatic cleanup)
   *
   * **Component Registration Strategy:**
   * Each export builder type is registered as a global component with:
   * - **Component type**: The builder interface (e.g., NodePropertyExporterBuilder)
   * - **Factory function**: Creates builders using the provider selector
   * - **Context wrapper**: Wraps procedure context for export framework compatibility
   * - **Override flag**: true - allows overriding existing registrations
   *
   * **Why Global Registration:**
   * Global registration enables:
   * - **Automatic injection**: Procedures can declare builder dependencies
   * - **Consistent access**: Same builder creation logic across all procedures
   * - **Configuration isolation**: Builder creation respects database-specific config
   * - **Lifecycle management**: Builders created and destroyed with database lifecycle
   */
  static class GlobalProceduresExporterComponentProvider extends LifecycleAdapter {
    private readonly globalProcedures: GlobalProcedures;
    private readonly exportBuildersProviderSelector: ExportBuildersProviderSelector;

    /**
     * Creates a new component provider.
     *
     * @param globalProcedures Global procedures registry for component registration
     * @param exportBuildersProviderSelector Provider selector for creating export builders
     */
    constructor(
      globalProcedures: GlobalProcedures,
      exportBuildersProviderSelector: ExportBuildersProviderSelector
    ) {
      super();
      this.globalProcedures = globalProcedures;
      this.exportBuildersProviderSelector = exportBuildersProviderSelector;
    }

    /**
     * Initializes the component provider by registering all export builder types.
     *
     * This method is called during database startup to register export builders
     * as globally injectable components. Each builder type is registered with
     * a factory function that uses the provider selector to create appropriate
     * builders based on configuration and context.
     *
     * **Registration Pattern:**
     * For each builder type:
     * 1. **Select provider**: Use provider selector to get appropriate provider
     * 2. **Wrap context**: Convert procedure context to exporter context
     * 3. **Create builder**: Use provider to create builder with wrapped context
     * 4. **Register component**: Make builder available for injection
     *
     * **Context Wrapping:**
     * The `ExporterContext.ProcedureContextWrapper` bridges the gap between:
     * - **Procedure context**: Neo4j's procedure execution context
     * - **Exporter context**: Export framework's context interface
     *
     * **Override Flag (true):**
     * Allows this extension to override any existing registrations for these
     * component types, ensuring the export system takes precedence.
     *
     * **Component Factory Functions:**
     * Each registration uses a lambda that:
     * - Selects the appropriate export provider for the current configuration
     * - Wraps the procedure context for compatibility with export framework
     * - Creates a builder using the provider's factory method
     * - Returns the configured builder ready for use
     *
     * **Example Injection Usage:**
     * ```typescript
     * @Procedure("gds.algorithm.export")
     * class AlgorithmProcedure {
     *   // Neo4j automatically injects the registered component
     *   constructor(
     *     @Inject private nodePropertyExporter: NodePropertyExporterBuilder,
     *     @Inject private relationshipExporter: RelationshipExporterBuilder
     *   ) {}
     *
     *   public run(): void {
     *     // Use injected builders directly
     *     const nodeExporter = this.nodePropertyExporter.build();
     *     const relExporter = this.relationshipExporter.build();
     *   }
     * }
     * ```
     */
    public init(): void {
      const exportBuildersProvider = this.exportBuildersProviderSelector.select();

      // Register node property exporter builder
      this.globalProcedures.registerComponent(
        NodePropertyExporterBuilder,
        (ctx) => exportBuildersProvider.nodePropertyExporterBuilder(
          new ExporterContext.ProcedureContextWrapper(ctx)
        ),
        true
      );

      // Register relationship stream exporter builder
      this.globalProcedures.registerComponent(
        RelationshipStreamExporterBuilder,
        (ctx) => exportBuildersProvider.relationshipStreamExporterBuilder(
          new ExporterContext.ProcedureContextWrapper(ctx)
        ),
        true
      );

      // Register relationship exporter builder
      this.globalProcedures.registerComponent(
        RelationshipExporterBuilder,
        (ctx) => exportBuildersProvider.relationshipExporterBuilder(
          new ExporterContext.ProcedureContextWrapper(ctx)
        ),
        true
      );

      // Register relationship properties exporter builder
      this.globalProcedures.registerComponent(
        RelationshipPropertiesExporterBuilder,
        (ctx) => exportBuildersProvider.relationshipPropertiesExporterBuilder(
          new ExporterContext.ProcedureContextWrapper(ctx)
        ),
        true
      );

      // Register node label exporter builder
      this.globalProcedures.registerComponent(
        NodeLabelExporterBuilder,
        (ctx) => exportBuildersProvider.nodeLabelExporterBuilder(
          new ExporterContext.ProcedureContextWrapper(ctx)
        ),
        true
      );
    }
  }

  /**
   * Dependencies required for the export builders extension.
   *
   * This interface defines the Neo4j services that the extension needs to function.
   * It follows Neo4j's dependency injection pattern where extensions declare their
   * dependencies as interfaces, and the framework provides concrete implementations.
   *
   * **Dependency Injection Benefits:**
   * - **Testability**: Dependencies can be mocked for unit testing
   * - **Flexibility**: Different implementations can be provided in different environments
   * - **Lifecycle management**: Framework manages dependency lifecycles automatically
   * - **Configuration**: Dependencies are configured based on Neo4j settings
   */
  interface Dependencies {
    /**
     * Global procedures registry for registering injectable components.
     *
     * @returns The global procedures service for component registration
     */
    globalProcedures(): GlobalProcedures;

    /**
     * Graph database service for database-specific operations and configuration.
     *
     * @returns The graph database service instance
     */
    graphDatabaseService(): GraphDatabaseService;

    /**
     * Neo4j configuration for reading export-related settings.
     *
     * @returns The configuration service for reading settings
     */
    config(): Config;
  }
}
