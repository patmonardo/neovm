// import { RelationshipType } from '@/api/RelationshipType';
// import { IdMap } from '@/api/IdMap';
// import { RelationshipSchema } from '@/api/schema/RelationshipSchema';
// import { Concurrency } from '@/core/concurrency/Concurrency';
// import { RelationshipBuilderFromVisitor } from './file/RelationshipBuilderFromVisitor';
// import { RelationshipVisitor } from './file/RelationshipVisitor';
// import { GraphFactory } from '@/core/loading/construction/GraphFactory';
// import { RelationshipsBuilder } from '@/core/loading/construction/RelationshipsBuilder';
// import { RelationshipsBuilderBuilder } from '@/core/loading/construction/RelationshipsBuilderBuilder';
// import { IdentifierMapper } from './IdentifierMapper';

// /**
//  * Concrete implementation of RelationshipVisitor that builds relationships into GraphStore.
//  * This visitor takes relationship data and creates the appropriate RelationshipsBuilder
//  * instances for each relationship type, handling property configuration and indexing.
//  */
// export class GraphStoreRelationshipVisitor extends RelationshipVisitor {
//   private readonly relationshipBuilderSupplier: () => RelationshipsBuilderBuilder;
//   private readonly relationshipBuilders: Map<string, RelationshipsBuilder>;
//   private readonly inverseIndexedRelationshipTypes: RelationshipType[];
//   private readonly relationshipFromVisitorBuilders: Map<string, RelationshipBuilderFromVisitor>;

//   constructor(
//     relationshipSchema: RelationshipSchema,
//     relationshipBuilderSupplier: () => RelationshipsBuilderBuilder,
//     relationshipBuilders: Map<string, RelationshipsBuilder>,
//     inverseIndexedRelationshipTypes: RelationshipType[]
//   ) {
//     super(
//       relationshipSchema,
//       IdentifierMapper.biject(
//         (relationshipType: RelationshipType) => relationshipType.name,
//         (name: string) => RelationshipType.of(name)
//       )
//     );
//     this.relationshipBuilderSupplier = relationshipBuilderSupplier;
//     this.relationshipBuilders = relationshipBuilders;
//     this.inverseIndexedRelationshipTypes = inverseIndexedRelationshipTypes;
//     this.relationshipFromVisitorBuilders = new Map();
//   }

//   /**
//    * Exports the current relationship element to the appropriate builder.
//    * Creates relationship builders on-demand for each relationship type encountered.
//    */
//   protected exportElement(): void {
//     // TODO: this logic should move to the RelationshipsBuilder
//     const relationshipsBuilder = this.getOrCreateRelationshipBuilder(this.relationshipType());
//     relationshipsBuilder.addFromVisitor();
//   }

//   /**
//    * Gets or creates a RelationshipBuilderFromVisitor for the given relationship type.
//    */
//   private getOrCreateRelationshipBuilder(relationshipTypeString: string): RelationshipBuilderFromVisitor {
//     let builder = this.relationshipFromVisitorBuilders.get(relationshipTypeString);

//     if (!builder) {
//       const propertyConfigs = this.getPropertySchema().map(schema =>
//         GraphFactory.PropertyConfig.of(
//           schema.key(),
//           schema.aggregation(),
//           schema.defaultValue()
//         )
//       );

//       const relationshipType = RelationshipType.of(relationshipTypeString);

//       const relBuilder = this.relationshipBuilderSupplier()
//         .relationshipType(relationshipType)
//         .propertyConfigs(propertyConfigs)
//         .indexInverse(this.inverseIndexedRelationshipTypes.includes(relationshipType))
//         // TODO: Shouldn't we warn on dangling relationships?
//         .skipDanglingRelationships(true)
//         .build();

//       this.relationshipBuilders.set(relationshipTypeString, relBuilder);

//       builder = RelationshipBuilderFromVisitor.of(
//         propertyConfigs.length,
//         relBuilder,
//         this
//       );

//       this.relationshipFromVisitorBuilders.set(relationshipTypeString, builder);
//     }

//     return builder;
//   }

//   /**
//    * Builder class for creating GraphStoreRelationshipVisitor instances.
//    */
//   static Builder = class extends RelationshipVisitor.RelationshipVisitorBuilder<
//     GraphStoreRelationshipVisitor.Builder,
//     GraphStoreRelationshipVisitor
//   > {
//     private relationshipBuildersByType?: Map<string, RelationshipsBuilder>;
//     private concurrency?: Concurrency;
//     private nodes?: IdMap;
//     private inverseIndexedRelationshipTypes?: RelationshipType[];

//     /**
//      * Sets the map to store relationship builders by type.
//      */
//     withRelationshipBuildersToTypeResultMap(relationshipBuildersByType: Map<string, RelationshipsBuilder>): this {
//       this.relationshipBuildersByType = relationshipBuildersByType;
//       return this;
//     }

//     /**
//      * Sets the concurrency level for relationship building.
//      */
//     withConcurrency(concurrency: Concurrency): this {
//       this.concurrency = concurrency;
//       return this;
//     }

//     /**
//      * Sets the node ID map for relationship building.
//      */
//     withNodes(nodes: IdMap): this {
//       this.nodes = nodes;
//       return this;
//     }

//     /**
//      * Sets allocation tracker (no-op in TypeScript version).
//      */
//     withAllocationTracker(): this {
//       return this;
//     }

//     /**
//      * Sets the relationship types that should have inverse indexes.
//      */
//     withInverseIndexedRelationshipTypes(inverseIndexedRelationshipTypes: RelationshipType[]): this {
//       this.inverseIndexedRelationshipTypes = inverseIndexedRelationshipTypes;
//       return this;
//     }

//     /**
//      * Returns this builder instance with proper typing.
//      */
//     protected me(): this {
//       return this;
//     }

//     /**
//      * Builds the GraphStoreRelationshipVisitor instance.
//      */
//     build(): GraphStoreRelationshipVisitor {
//       if (!this.relationshipSchema) {
//         throw new Error('relationshipSchema is required');
//       }
//       if (!this.relationshipBuildersByType) {
//         throw new Error('relationshipBuildersByType is required');
//       }
//       if (!this.concurrency) {
//         throw new Error('concurrency is required');
//       }
//       if (!this.nodes) {
//         throw new Error('nodes is required');
//       }
//       if (!this.inverseIndexedRelationshipTypes) {
//         throw new Error('inverseIndexedRelationshipTypes is required');
//       }

//       const relationshipBuilderSupplier = (): RelationshipsBuilderBuilder =>
//         GraphFactory.initRelationshipsBuilder()
//           .concurrency(this.concurrency!)
//           .nodes(this.nodes!);

//       return new GraphStoreRelationshipVisitor(
//         this.relationshipSchema,
//         relationshipBuilderSupplier,
//         this.relationshipBuildersByType,
//         this.inverseIndexedRelationshipTypes
//       );
//     }
//   };
// }
