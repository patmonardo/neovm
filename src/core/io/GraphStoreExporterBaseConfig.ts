// import { RelationshipType } from '@/projection';
// import { BaseConfig } from '@/config/BaseConfig';
// import { ConcurrencyConfig } from '@/config/ConcurrencyConfig';
// import { Concurrency } from '@/concurrency';
// import { ParallelUtil } from '@/concurrency';
// import { PropertyMappings } from '@/projection';
// import { Configuration } from '@/annotations';

// /**
// //  * Base configuration interface for GraphStore export operations.
//  * Provides common configuration options shared across different export formats.
//  */
// export interface GraphStoreExporterBaseConfig extends BaseConfig {
//   /**
//    * The default relationship type to use when exporting relationships
//    * that don't have an explicit type.
//    *
//    * @returns The default relationship type name
//    * @default RelationshipType.ALL_RELATIONSHIPS.name
//    */
//   defaultRelationshipType(): string;

//   /**
//    * The concurrency level for write operations during export.
//    *
//    * @returns The number of concurrent threads/workers to use
//    * @default ConcurrencyConfig.DEFAULT_CONCURRENCY
//    */
//   writeConcurrency(): number;

//   /**
//    * Returns the write concurrency as a typed Concurrency object.
//    *
//    * @returns Concurrency wrapper around writeConcurrency()
//    */
//   typedWriteConcurrency(): Concurrency;

//   /**
//    * The batch size for processing elements during export.
//    * Larger batches can improve throughput but use more memory.
//    *
//    * @returns The number of elements to process in each batch
//    * @default ParallelUtil.DEFAULT_BATCH_SIZE
//    */
//   batchSize(): number;

//   /**
//    * Additional node properties to include in the export.
//    * These are properties beyond what's stored in the graph.
//    *
//    * @returns PropertyMappings defining additional properties
//    * @default PropertyMappings.of() (empty)
//    */
//   additionalNodeProperties(): PropertyMappings;
// }

// /**
//  * Default implementation of GraphStoreExporterBaseConfig.
//  */
// export class GraphStoreExporterBaseConfigImpl implements GraphStoreExporterBaseConfig {
//   defaultRelationshipType(): string {
//     return RelationshipType.ALL_RELATIONSHIPS.name;
//   }

//   writeConcurrency(): number {
//     return ConcurrencyConfig.DEFAULT_CONCURRENCY;
//   }

//   typedWriteConcurrency(): Concurrency {
//     return new Concurrency(this.writeConcurrency());
//   }

//   batchSize(): number {
//     return ParallelUtil.DEFAULT_BATCH_SIZE;
//   }

//   additionalNodeProperties(): PropertyMappings {
//     return PropertyMappings.of();
//   }

//   // Additional methods that would be inherited from BaseConfig
//   // These would be implemented based on your BaseConfig interface
// }

// /**
//  * Builder class for constructing GraphStoreExporterBaseConfig instances.
//  */
// export class GraphStoreExporterBaseConfigBuilder {
//   private _defaultRelationshipType?: string;
//   private _writeConcurrency?: number;
//   private _batchSize?: number;
//   private _additionalNodeProperties?: PropertyMappings;

//   defaultRelationshipType(defaultRelationshipType: string): this {
//     this._defaultRelationshipType = defaultRelationshipType;
//     return this;
//   }

//   writeConcurrency(writeConcurrency: number): this {
//     this._writeConcurrency = writeConcurrency;
//     return this;
//   }

//   batchSize(batchSize: number): this {
//     this._batchSize = batchSize;
//     return this;
//   }

//   additionalNodeProperties(additionalNodeProperties: PropertyMappings): this {
//     this._additionalNodeProperties = additionalNodeProperties;
//     return this;
//   }

//   build(): GraphStoreExporterBaseConfig {
//     return new (class implements GraphStoreExporterBaseConfig {
//       defaultRelationshipType(): string {
//         return _defaultRelationshipType ?? RelationshipType.ALL_RELATIONSHIPS.name;
//       }

//       writeConcurrency(): number {
//         return _writeConcurrency ?? ConcurrencyConfig.DEFAULT_CONCURRENCY;
//       }

//       typedWriteConcurrency(): Concurrency {
//         return new Concurrency(this.writeConcurrency());
//       }

//       batchSize(): number {
//         return _batchSize ?? ParallelUtil.DEFAULT_BATCH_SIZE;
//       }

//       additionalNodeProperties(): PropertyMappings {
//         return _additionalNodeProperties ?? PropertyMappings.of();
//       }
//     })();
//   }
// }

// /**
//  * Static factory methods for creating configuration instances.
//  */
// export class GraphStoreExporterBaseConfig {
//   /**
//    * Creates a new configuration builder.
//    */
//   static builder(): GraphStoreExporterBaseConfigBuilder {
//     return new GraphStoreExporterBaseConfigBuilder();
//   }

//   /**
//    * Creates a default configuration instance.
//    */
//   static defaults(): GraphStoreExporterBaseConfig {
//     return new GraphStoreExporterBaseConfigImpl();
//   }
// }
