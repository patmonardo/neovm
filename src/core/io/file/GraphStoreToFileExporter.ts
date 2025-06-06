// import { NodeLabel } from '@/api/NodeLabel';
// import { RelationshipType } from '@/api/RelationshipType';
// import { GraphStore } from '@/api/GraphStore';
// import { GraphStoreExporter, IdMappingType } from '@/core/io/GraphStoreExporter';
// import { GraphStoreInput } from '@/core/io/GraphStoreInput';
// import { IdentifierMapper } from '@/core/io/IdentifierMapper';
// import { NeoNodeProperties } from '@/core/io/NeoNodeProperties';
// import { ElementSchemaVisitor } from '@/core/io/schema/ElementSchemaVisitor';
// import { NodeSchemaVisitor } from '@/core/io/schema/NodeSchemaVisitor';
// import { RelationshipSchemaVisitor } from '@/core/io/schema/RelationshipSchemaVisitor';
// import { SimpleVisitor } from '@/core/io/schema/SimpleVisitor';
// import { Capabilities } from '@/core/loading/Capabilities';
// import { ParallelUtil } from '@/core/concurrency/ParallelUtil';
// import { RunWithConcurrency } from '@/core/concurrency/RunWithConcurrency';
// import { TaskRegistryFactory } from '@/core/utils/progress/TaskRegistryFactory';
// import { ProgressTracker } from '@/core/utils/progress/tasks/ProgressTracker';
// import { Task } from '@/core/utils/progress/tasks/Task';
// import { TaskProgressTracker } from '@/core/utils/progress/tasks/TaskProgressTracker';
// import { Tasks } from '@/core/utils/progress/tasks/Tasks';
// import { Log } from '@/logging/Log';
// import { GraphStoreToFileExporterParameters } from './GraphStoreToFileExporterParameters';
// import { VisitorProducer } from './VisitorProducer';
// import { NodeVisitor } from './NodeVisitor';
// import { RelationshipVisitor } from './RelationshipVisitor';
// import { GraphPropertyVisitor } from './GraphPropertyVisitor';
// import { SingleRowVisitor } from './SingleRowVisitor';
// import { SimpleWriter } from './SimpleWriter';
// import { ElementImportRunner } from './ElementImportRunner';
// import { GraphInfo } from './GraphInfo';

// /**
//  * Exports a GraphStore to files using a visitor pattern.
//  * This class orchestrates the entire export process, including:
//  * - Schema exports (nodes, relationships, graph properties)
//  * - Data exports (nodes, relationships, graph properties)
//  * - Metadata exports (user info, graph info, mappings)
//  */
// export class GraphStoreToFileExporter extends GraphStoreExporter {
//   private readonly parameters: GraphStoreToFileExporterParameters;
//   private readonly nodeVisitorSupplier: VisitorProducer<NodeVisitor>;
//   private readonly relationshipVisitorSupplier: VisitorProducer<RelationshipVisitor>;
//   private readonly graphPropertyVisitorSupplier: VisitorProducer<GraphPropertyVisitor>;

//   private readonly userInfoVisitorSupplier: () => SingleRowVisitor<string>;
//   private readonly graphInfoVisitorSupplier: () => SingleRowVisitor<GraphInfo>;
//   private readonly nodeSchemaVisitorSupplier: () => NodeSchemaVisitor;
//   private readonly labelMappingVisitorSupplier: () => SimpleVisitor<Map.Entry<NodeLabel, string>>;
//   private readonly typeMappingVisitorSupplier: () => SimpleVisitor<Map.Entry<RelationshipType, string>>;

//   private readonly relationshipSchemaVisitorSupplier: () => RelationshipSchemaVisitor;
//   private readonly graphPropertySchemaVisitorSupplier: () => ElementSchemaVisitor;
//   private readonly graphCapabilitiesWriterSupplier: () => SimpleWriter<Capabilities>;

//   private readonly taskRegistryFactory: TaskRegistryFactory;
//   private readonly log: Log;
//   private readonly rootTaskName: string;
//   private readonly executorService: any; // ExecutorService equivalent

//   constructor(
//     graphStore: GraphStore,
//     parameters: GraphStoreToFileExporterParameters,
//     neoNodeProperties: NeoNodeProperties | undefined,
//     nodeLabelMapping: IdentifierMapper<NodeLabel>,
//     relationshipTypeMapping: IdentifierMapper<RelationshipType>,
//     userInfoVisitorSupplier: () => SingleRowVisitor<string>,
//     graphInfoVisitorSupplier: () => SingleRowVisitor<GraphInfo>,
//     nodeSchemaVisitorSupplier: () => NodeSchemaVisitor,
//     labelMappingVisitorSupplier: () => SimpleVisitor<Map.Entry<NodeLabel, string>>,
//     typeMappingVisitorSupplier: () => SimpleVisitor<Map.Entry<RelationshipType, string>>,
//     relationshipSchemaVisitorSupplier: () => RelationshipSchemaVisitor,
//     graphPropertySchemaVisitorSupplier: () => ElementSchemaVisitor,
//     graphCapabilitiesWriterSupplier: () => SimpleWriter<Capabilities>,
//     nodeVisitorSupplier: VisitorProducer<NodeVisitor>,
//     relationshipVisitorSupplier: VisitorProducer<RelationshipVisitor>,
//     graphPropertyVisitorSupplier: VisitorProducer<GraphPropertyVisitor>,
//     taskRegistryFactory: TaskRegistryFactory,
//     log: Log,
//     rootTaskName: string,
//     executorService: any
//   ) {
//     super(
//       graphStore,
//       neoNodeProperties,
//       nodeLabelMapping,
//       relationshipTypeMapping,
//       parameters.defaultRelationshipType(),
//       parameters.concurrency(),
//       parameters.batchSize()
//     );

//     this.parameters = parameters;
//     this.nodeVisitorSupplier = nodeVisitorSupplier;
//     this.relationshipVisitorSupplier = relationshipVisitorSupplier;
//     this.graphPropertyVisitorSupplier = graphPropertyVisitorSupplier;
//     this.userInfoVisitorSupplier = userInfoVisitorSupplier;
//     this.graphInfoVisitorSupplier = graphInfoVisitorSupplier;
//     this.nodeSchemaVisitorSupplier = nodeSchemaVisitorSupplier;
//     this.labelMappingVisitorSupplier = labelMappingVisitorSupplier;
//     this.typeMappingVisitorSupplier = typeMappingVisitorSupplier;
//     this.relationshipSchemaVisitorSupplier = relationshipSchemaVisitorSupplier;
//     this.graphPropertySchemaVisitorSupplier = graphPropertySchemaVisitorSupplier;
//     this.graphCapabilitiesWriterSupplier = graphCapabilitiesWriterSupplier;
//     this.taskRegistryFactory = taskRegistryFactory;
//     this.log = log;
//     this.rootTaskName = rootTaskName;
//     this.executorService = executorService;
//   }

//   protected export(graphStoreInput: GraphStoreInput): void {
//     const progressTracker = this.createProgressTracker(graphStoreInput);
//     const pbiInput = graphStoreInput.toInput();

//     try {
//       progressTracker.beginSubTask("Csv export");
//       this.exportUserName();
//       this.exportGraphInfo(graphStoreInput);
//       this.exportNodeSchema(graphStoreInput);
//       this.exportRelationshipSchema(graphStoreInput);
//       this.exportGraphPropertySchema(graphStoreInput);
//       this.exportGraphCapabilities(graphStoreInput);
//       this.exportNodeLabelMapping(graphStoreInput);
//       this.exportRelationshipTypeMapping(graphStoreInput);
//       this.exportNodes(pbiInput, progressTracker);
//       this.exportRelationships(pbiInput, progressTracker);
//       this.exportGraphProperties(graphStoreInput, progressTracker);
//     } catch (e) {
//       // as the tracker is created in this method
//       progressTracker.endSubTaskWithFailure();
//       throw e;
//     }
//     progressTracker.endSubTask();
//   }

//   protected idMappingType(): IdMappingType {
//     return IdMappingType.ORIGINAL;
//   }

//   private createProgressTracker(graphStoreInput: GraphStoreInput): ProgressTracker {
//     const graphInfo = graphStoreInput.metaDataStore().graphInfo();

//     const importTasks: Task[] = [];
//     importTasks.push(Tasks.leaf("Export nodes", graphInfo.nodeCount));

//     const relationshipCount = Array.from(graphInfo.relationshipTypeCounts.values())
//       .reduce((sum, count) => sum + count, 0);
//     importTasks.push(Tasks.leaf("Export relationships", relationshipCount));

//     if (!graphStoreInput.metaDataStore().graphPropertySchema().isEmpty()) {
//       importTasks.push(Tasks.leaf("Export graph properties"));
//     }

//     const task = Tasks.task(`${this.rootTaskName} export`, importTasks);
//     return new TaskProgressTracker(task, this.log, this.concurrency, this.taskRegistryFactory);
//   }

//   private exportNodes(graphStoreInput: any, progressTracker: ProgressTracker): void {
//     progressTracker.beginSubTask();
//     const nodeInput = graphStoreInput.nodes();
//     const nodeInputIterator = nodeInput.iterator();

//     const tasks = ParallelUtil.tasks(
//       this.concurrency,
//       (index: number) => new ElementImportRunner(
//         this.nodeVisitorSupplier.apply(index),
//         nodeInputIterator,
//         progressTracker
//       )
//     );

//     RunWithConcurrency.builder()
//       .concurrency(this.concurrency)
//       .tasks(tasks)
//       .executor(this.executorService)
//       .run();
//     progressTracker.endSubTask();
//   }

//   private exportRelationships(graphStoreInput: any, progressTracker: ProgressTracker): void {
//     progressTracker.beginSubTask();
//     const relationshipInput = graphStoreInput.relationships();
//     const relationshipInputIterator = relationshipInput.iterator();

//     const tasks = ParallelUtil.tasks(
//       this.concurrency,
//       (index: number) => new ElementImportRunner(
//         this.relationshipVisitorSupplier.apply(index),
//         relationshipInputIterator,
//         progressTracker
//       )
//     );

//     RunWithConcurrency.builder()
//       .concurrency(this.concurrency)
//       .tasks(tasks)
//       .executor(this.executorService)
//       .mayInterruptIfRunning(false)
//       .run();
//     progressTracker.endSubTask();
//   }

//   private exportGraphProperties(
//     graphStoreInput: GraphStoreInput,
//     progressTracker: ProgressTracker
//   ): void {
//     if (!graphStoreInput.metaDataStore().graphPropertySchema().isEmpty()) {
//       progressTracker.beginSubTask();
//       const graphPropertyInput = graphStoreInput.graphProperties();
//       const graphPropertyInputIterator = graphPropertyInput.iterator();

//       const tasks = ParallelUtil.tasks(
//         this.concurrency,
//         (index: number) => new ElementImportRunner(
//           this.graphPropertyVisitorSupplier.apply(index),
//           graphPropertyInputIterator,
//           progressTracker
//         )
//       );

//       RunWithConcurrency.builder()
//         .concurrency(this.concurrency)
//         .tasks(tasks)
//         .executor(this.executorService)
//         .run();
//       progressTracker.endSubTask();
//     }
//   }

//   private exportUserName(): void {
//     const userInfoVisitor = this.userInfoVisitorSupplier();
//     try {
//       userInfoVisitor.export(this.parameters.username());
//     } finally {
//       userInfoVisitor.close?.();
//     }
//   }

//   private exportGraphInfo(graphStoreInput: GraphStoreInput): void {
//     const graphInfo = graphStoreInput.metaDataStore().graphInfo();
//     const graphInfoVisitor = this.graphInfoVisitorSupplier();
//     try {
//       graphInfoVisitor.export(graphInfo);
//     } finally {
//       graphInfoVisitor.close?.();
//     }
//   }

//   private exportNodeSchema(graphStoreInput: GraphStoreInput): void {
//     const nodeSchema = graphStoreInput.metaDataStore().nodeSchema();
//     const nodeSchemaVisitor = this.nodeSchemaVisitorSupplier();
//     try {
//       nodeSchema.entries().forEach(nodeEntry => {
//         if (nodeEntry.properties().isEmpty()) {
//           nodeSchemaVisitor.nodeLabel(nodeEntry.identifier());
//           nodeSchemaVisitor.endOfEntity();
//         } else {
//           nodeEntry.properties().forEach((propertySchema, propertyKey) => {
//             nodeSchemaVisitor.nodeLabel(nodeEntry.identifier());
//             nodeSchemaVisitor.key(propertyKey);
//             nodeSchemaVisitor.defaultValue(propertySchema.defaultValue());
//             nodeSchemaVisitor.valueType(propertySchema.valueType());
//             nodeSchemaVisitor.state(propertySchema.state());
//             nodeSchemaVisitor.endOfEntity();
//           });
//         }
//       });
//     } finally {
//       nodeSchemaVisitor.close?.();
//     }
//   }

//   private exportNodeLabelMapping(graphStoreInput: GraphStoreInput): void {
//     const labelMapping = graphStoreInput.labelMapping();
//     const labelMappingVisitor = this.labelMappingVisitorSupplier();
//     try {
//       labelMapping.forEach((identifier, label) => {
//         labelMappingVisitor.export(new Map.Entry(label, identifier));
//       });
//     } catch (error) {
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error(String(error));
//     } finally {
//       labelMappingVisitor.close?.();
//     }
//   }

//   private exportRelationshipTypeMapping(graphStoreInput: GraphStoreInput): void {
//     const typeMapping = graphStoreInput.typeMapping();
//     const typeMappingVisitor = this.typeMappingVisitorSupplier();
//     try {
//       typeMapping.forEach((identifier, type) => {
//         typeMappingVisitor.export(new Map.Entry(type, identifier));
//       });
//     } catch (error) {
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error(String(error));
//     } finally {
//       typeMappingVisitor.close?.();
//     }
//   }

//   private exportRelationshipSchema(graphStoreInput: GraphStoreInput): void {
//     const relationshipSchema = graphStoreInput.metaDataStore().relationshipSchema();
//     const relationshipSchemaVisitor = this.relationshipSchemaVisitorSupplier();
//     try {
//       relationshipSchema.entries().forEach(relationshipEntry => {
//         if (relationshipEntry.properties().isEmpty()) {
//           relationshipSchemaVisitor.relationshipType(relationshipEntry.identifier());
//           relationshipSchemaVisitor.direction(relationshipEntry.direction());
//           relationshipSchemaVisitor.endOfEntity();
//         } else {
//           relationshipEntry.properties().forEach((propertySchema, propertyKey) => {
//             relationshipSchemaVisitor.relationshipType(relationshipEntry.identifier());
//             relationshipSchemaVisitor.direction(relationshipEntry.direction());
//             relationshipSchemaVisitor.key(propertyKey);
//             relationshipSchemaVisitor.defaultValue(propertySchema.defaultValue());
//             relationshipSchemaVisitor.valueType(propertySchema.valueType());
//             relationshipSchemaVisitor.aggregation(propertySchema.aggregation());
//             relationshipSchemaVisitor.state(propertySchema.state());
//             relationshipSchemaVisitor.endOfEntity();
//           });
//         }
//       });
//     } finally {
//       relationshipSchemaVisitor.close?.();
//     }
//   }

//   private exportGraphPropertySchema(graphStoreInput: GraphStoreInput): void {
//     const graphPropertySchema = graphStoreInput.metaDataStore().graphPropertySchema();
//     const graphPropertySchemaVisitor = this.graphPropertySchemaVisitorSupplier();
//     try {
//       graphPropertySchema.forEach((propertySchema, key) => {
//         graphPropertySchemaVisitor.key(key);
//         graphPropertySchemaVisitor.defaultValue(propertySchema.defaultValue());
//         graphPropertySchemaVisitor.valueType(propertySchema.valueType());
//         graphPropertySchemaVisitor.state(propertySchema.state());
//         graphPropertySchemaVisitor.endOfEntity();
//       });
//     } finally {
//       graphPropertySchemaVisitor.close?.();
//     }
//   }

//   private exportGraphCapabilities(graphStoreInput: GraphStoreInput): void {
//     const capabilitiesMapper = this.graphCapabilitiesWriterSupplier();
//     try {
//       capabilitiesMapper.write(graphStoreInput.capabilities());
//     } catch (error) {
//       if (error instanceof Error) {
//         throw error;
//       }
//       throw new Error(String(error));
//     }
//   }
// }

// // Utility class for Map.Entry since TypeScript doesn't have this built-in
// declare global {
//   namespace Map {
//     class Entry<K, V> {
//       constructor(key: K, value: V);
//       readonly key: K;
//       readonly value: V;
//     }
//   }
// }
