import * as path from 'path';
import { NodeLabel, RelationshipType } from '@/projection';
import { GraphStore } from '@/api';
import { ValueType } from '@/api';
import { MutableNodeSchema } from '@/api/schema';
import { IdentifierMapper } from '@/core/io';
import { NeoNodeProperties } from '@/core/io';
import { GraphStoreToFileExporter } from '@/core/io/file';
import { GraphStoreToFileExporterParameters } from '@/core/io/file';
import { TaskRegistryFactory } from '@/core/utils/progress';
import { Log } from '@/logging';

// Import the UserInfoVisitor we already created
import { UserInfoVisitor } from './UserInfoVisitor';

// Import visitors we need to create
import { CsvGraphInfoVisitor } from './CsvGraphInfoVisitor';
import { CsvNodeSchemaVisitor } from './CsvNodeSchemaVisitor';
import { CsvNodeLabelMappingVisitor } from './CsvNodeLabelMappingVisitor';
import { CsvRelationshipTypeMappingVisitor } from './CsvRelationshipTypeMappingVisitor';
import { CsvRelationshipSchemaVisitor } from './CsvRelationshipSchemaVisitor';
import { CsvGraphPropertySchemaVisitor } from './CsvGraphPropertySchemaVisitor';
import { CsvGraphCapabilitiesWriter } from './CsvGraphCapabilitiesWriter';
import { CsvNodeVisitor } from './CsvNodeVisitor';
import { CsvRelationshipVisitor } from './CsvRelationshipVisitor';
import { CsvGraphPropertyVisitor } from './CsvGraphPropertyVisitor';

/**
 * Factory class for creating CSV export system.
 * Creates a complete GraphStoreToFileExporter configured for CSV output
 * by wiring together all necessary visitors and mappers.
 */
export class GraphStoreToCsvExporter {

  /**
   * Create a complete CSV exporter with all necessary visitors.
   */
  static create(
    graphStore: GraphStore,
    parameters: GraphStoreToFileExporterParameters,
    exportPath: string,
    neoNodeProperties: NeoNodeProperties | null,
    taskRegistryFactory: TaskRegistryFactory,
    log: Log,
    executorService: any // Thread pool equivalent
  ): GraphStoreToFileExporter {

    // Concurrent set for tracking header files
    const headerFiles = new Set<string>();

    const nodeSchema = graphStore.schema().nodeSchema();
    const relationshipSchema = graphStore.schema().relationshipSchema();

    // Create mutable node schema for additional properties
    const neoNodeSchema = MutableNodeSchema.empty();

    // Add additional properties to each label present in the graph store
    if (neoNodeProperties) {
      const additionalProps = neoNodeProperties.neoNodeProperties();

      for (const [propertyKey, _] of additionalProps) {
        for (const label of nodeSchema.availableLabels()) {
          neoNodeSchema.getOrCreateLabel(label).addProperty(propertyKey, ValueType.STRING);
        }
      }
    }

    // Build label mapper
    const labelMapperBuilder = IdentifierMapper.builder<NodeLabel>("label");
    for (const nodeLabel of graphStore.nodeLabels()) {
      labelMapperBuilder.getOrCreateIdentifierFor(nodeLabel);
    }
    const labelMapper = labelMapperBuilder.build();

    // Build relationship type mapper
    const relationshipTypeMapperBuilder = IdentifierMapper.builder<RelationshipType>("type");
    for (const relationshipType of graphStore.relationshipTypes()) {
      relationshipTypeMapperBuilder.getOrCreateIdentifierFor(relationshipType);
    }
    const relationshipTypeMapper = relationshipTypeMapperBuilder.build();

    // Create the complete exporter with all visitors
    return new GraphStoreToFileExporter(
      graphStore,
      parameters,
      neoNodeProperties,
      labelMapper,
      relationshipTypeMapper,

      // Metadata visitors (single instance each)
      () => new UserInfoVisitor(exportPath),
      () => new CsvGraphInfoVisitor(exportPath),
      () => new CsvNodeSchemaVisitor(exportPath),
      () => new CsvNodeLabelMappingVisitor(exportPath),
      () => new CsvRelationshipTypeMappingVisitor(exportPath),
      () => new CsvRelationshipSchemaVisitor(exportPath),
      () => new CsvGraphPropertySchemaVisitor(exportPath),
      () => new CsvGraphCapabilitiesWriter(exportPath),

      // Data visitors (indexed for parallel processing)
      (index: number) => new CsvNodeVisitor(
        exportPath,
        nodeSchema.union(neoNodeSchema),
        headerFiles,
        index,
        labelMapper
      ),
      (index: number) => new CsvRelationshipVisitor(
        exportPath,
        relationshipSchema,
        headerFiles,
        index,
        relationshipTypeMapper
      ),
      (index: number) => new CsvGraphPropertyVisitor(
        exportPath,
        graphStore.schema().graphProperties(),
        headerFiles,
        index
      ),

      taskRegistryFactory,
      log,
      "Csv", // Export format name
      executorService
    );
  }

  // Private constructor - this is a utility class
  private constructor() {}
}
