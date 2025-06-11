// import { NodeLabel } from "@/projection";
// import { CSRGraph } from "@/api";
// import { CSRGraphAdapter } from "@/api";
// import { FilteredIdMap } from "@/api";
// import { GraphSchema } from "@/api/schema";
// import { NodePropertyValues } from "@/api/properties";
// import { RelationshipConsumer } from "@/api/properties";
// import { RelationshipWithPropertyConsumer } from "@/api/properties";
// import { RelationshipCursor } from "@/api/properties";
// import { ModifiableRelationshipCursor } from "@/api/properties";
// import { PrimitiveLongIterable } from "@/collections";
// import { Concurrency } from "@/concurrency";
// import { RunWithConcurrency } from "@/concurrency";
// import { Partition } from "@/core/utils/partition/Partition";
// import { PartitionUtils } from "@/core/utils/partition/PartitionUtils";
// import { CloseableThreadLocal } from "@/utils";
// import { FilteredNodePropertyValues } from "./FilteredNodePropertyValues";

// const NO_DEGREE = -1;

// export class NodeFilteredGraph
//   extends CSRGraphAdapter
//   implements FilteredIdMap
// {
//   private readonly filteredIdMap: FilteredIdMap;
//   private relationshipCountValue: number;
//   private readonly degreeCache: Int32Array;
//   private readonly degreeInverseCache?: Int32Array;
//   private readonly threadLocalGraph: CloseableThreadLocal<NodeFilteredGraph>;

//   constructor(originalGraph: CSRGraph, filteredIdMap: FilteredIdMap) {
//     super(originalGraph);
//     this.filteredIdMap = filteredIdMap;
//     this.degreeCache = NodeFilteredGraph.emptyDegreeCache(filteredIdMap);
//     this.degreeInverseCache = originalGraph.characteristics().isInverseIndexed()
//       ? NodeFilteredGraph.emptyDegreeCache(filteredIdMap)
//       : undefined;
//     this.relationshipCountValue = -1;
//     this.threadLocalGraph = CloseableThreadLocal.withInitial(
//       () => this.concurrentCopy() as NodeFilteredGraph
//     );
//   }

//   private static emptyDegreeCache(filteredIdMap: FilteredIdMap): Int32Array {
//     const arr = new Int32Array(filteredIdMap.nodeCount());
//     arr.fill(NO_DEGREE);
//     return arr;
//   }

//   schema(): GraphSchema {
//     return this.csrGraph
//       .schema()
//       .filterNodeLabels(this.filteredIdMap.availableNodeLabels());
//   }

//   nodeIterator(): IterableIterator<number> {
//     return this.filteredIdMap.nodeIterator();
//   }

//   nodeIteratorWithLabels(labels: Set<NodeLabel>): IterableIterator<number> {
//     return this.filteredIdMap.nodeIterator(labels);
//   }

//   batchIterables(batchSize: number): Iterable<PrimitiveLongIterable> {
//     return this.filteredIdMap.batchIterables(batchSize);
//   }

//   forEachNode(consumer: (nodeId: number) => boolean): void {
//     this.filteredIdMap.forEachNode(consumer);
//   }

//   degree(nodeId: number): number {
//     const cached = this.degreeCache[nodeId];
//     if (cached !== NO_DEGREE) return cached;
//     let degree = 0;
//     this.threadLocalGraph.get().forEachRelationship(nodeId, () => {
//       degree++;
//       return true;
//     });
//     this.degreeCache[nodeId] = degree;
//     return degree;
//   }

//   degreeWithoutParallelRelationships(nodeId: number): number {
//     const degreeCounter = new NonDuplicateRelationshipsDegreeCounter();
//     this.forEachRelationship(nodeId, degreeCounter.accept.bind(degreeCounter));
//     return degreeCounter.degree;
//   }

//   degreeInverse(nodeId: number): number {
//     this.validateIndexInverse();
//     const cached = this.degreeInverseCache![nodeId];
//     if (cached !== NO_DEGREE) return cached;
//     let degree = 0;
//     this.threadLocalGraph.get().forEachInverseRelationship(nodeId, () => {
//       degree++;
//       return true;
//     });
//     this.degreeInverseCache![nodeId] = degree;
//     return degree;
//   }

//   nodeCount(): number {
//     return this.filteredIdMap.nodeCount();
//   }

//   nodeCountWithLabel(nodeLabel: NodeLabel): number {
//     return this.filteredIdMap.nodeCount(nodeLabel);
//   }

//   rootNodeCount(): number | undefined {
//     return this.filteredIdMap.rootNodeCount();
//   }

//   relationshipCount(): number {
//     if (this.relationshipCountValue === -1) {
//       this.doCount();
//     }
//     return this.relationshipCountValue;
//   }

//   private doCount(): void {
//     // Partitioning and concurrency logic simplified for TS
//     const partitions = PartitionUtils.rangePartition(
//       Concurrency.DEFAULT,
//       this.nodeCount(),
//       (partition: Partition) =>
//         new RelationshipCounter(this.concurrentCopy(), partition)
//     );
//     RunWithConcurrency.builder()
//       .concurrency(Concurrency.DEFAULT)
//       .tasks(partitions)
//       .run();
//     this.relationshipCountValue = partitions.reduce(
//       (sum, task) => sum + task.relationshipCount(),
//       0
//     );
//   }

//   highestOriginalId(): number {
//     return this.filteredIdMap.highestOriginalId();
//   }

//   toMappedNodeId(originalNodeId: number): number {
//     return this.filteredIdMap.toMappedNodeId(originalNodeId);
//   }

//   toRootNodeId(mappedNodeId: number): number {
//     return this.filteredIdMap.toRootNodeId(mappedNodeId);
//   }

//   toOriginalNodeId(mappedNodeId: number): number {
//     return this.filteredIdMap.toOriginalNodeId(mappedNodeId);
//   }

//   toFilteredNodeId(rootNodeId: number): number {
//     return this.filteredIdMap.toFilteredNodeId(rootNodeId);
//   }

//   containsOriginalId(originalNodeId: number): boolean {
//     return this.filteredIdMap.containsOriginalId(originalNodeId);
//   }

//   containsRootNodeId(rootNodeId: number): boolean {
//     return this.filteredIdMap.containsRootNodeId(rootNodeId);
//   }

//   forEachRelationship(nodeId: number, consumer: RelationshipConsumer): void {
//     super.forEachRelationship(this.filteredIdMap.toRootNodeId(nodeId), (s, t) =>
//       this.filterAndConsume(s, t, consumer)
//     );
//   }

//   forEachRelationshipWithProperty(
//     nodeId: number,
//     fallbackValue: number,
//     consumer: RelationshipWithPropertyConsumer
//   ): void {
//     super.forEachRelationshipWithProperty(
//       this.filteredIdMap.toRootNodeId(nodeId),
//       fallbackValue,
//       (s, t, p) => this.filterAndConsumeWithProperty(s, t, p, consumer)
//     );
//   }

//   forEachInverseRelationship(
//     nodeId: number,
//     consumer: RelationshipConsumer
//   ): void {
//     this.validateIndexInverse();
//     super.forEachInverseRelationship(
//       this.filteredIdMap.toRootNodeId(nodeId),
//       (s, t) => this.filterAndConsume(s, t, consumer)
//     );
//   }

//   forEachInverseRelationshipWithProperty(
//     nodeId: number,
//     fallbackValue: number,
//     consumer: RelationshipWithPropertyConsumer
//   ): void {
//     this.validateIndexInverse();
//     super.forEachInverseRelationshipWithProperty(
//       this.filteredIdMap.toRootNodeId(nodeId),
//       fallbackValue,
//       (s, t, p) => this.filterAndConsumeWithProperty(s, t, p, consumer)
//     );
//   }

//   streamRelationships(
//     nodeId: number,
//     fallbackValue: number
//   ): Iterable<RelationshipCursor> {
//     if (
//       !this.filteredIdMap.containsRootNodeId(
//         this.filteredIdMap.toRootNodeId(nodeId)
//       )
//     ) {
//       return [];
//     }
//     const base = super.streamRelationships(
//       this.filteredIdMap.toRootNodeId(nodeId),
//       fallbackValue
//     );
//     function* filtered(thisGraph: NodeFilteredGraph) {
//       for (const rel of base) {
//         if (thisGraph.filteredIdMap.containsRootNodeId(rel.targetId())) {
//           yield (rel as ModifiableRelationshipCursor)
//             .setSourceId(nodeId)
//             .setTargetId(
//               thisGraph.filteredIdMap.toFilteredNodeId(rel.targetId())
//             );
//         }
//       }
//     }
//     return filtered(this);
//   }

//   asNodeFilteredGraph(): FilteredIdMap {
//     return this;
//   }

//   exists(sourceNodeId: number, targetNodeId: number): boolean {
//     return super.exists(
//       this.filteredIdMap.toRootNodeId(sourceNodeId),
//       this.filteredIdMap.toRootNodeId(targetNodeId)
//     );
//   }

//   nthTarget(nodeId: number, offset: number): number {
//     // Assuming Graph.nthTarget is a static helper
//     return CSRGraph.nthTarget(this, nodeId, offset);
//   }

//   relationshipProperty(
//     sourceNodeId: number,
//     targetNodeId: number,
//     fallbackValue?: number
//   ): number {
//     return super.relationshipProperty(
//       this.filteredIdMap.toRootNodeId(sourceNodeId),
//       this.filteredIdMap.toRootNodeId(targetNodeId),
//       fallbackValue
//     );
//   }

//   relationshipPropertyNoFallback(
//     sourceNodeId: number,
//     targetNodeId: number
//   ): number {
//     return super.relationshipProperty(
//       this.filteredIdMap.toRootNodeId(sourceNodeId),
//       this.filteredIdMap.toRootNodeId(targetNodeId)
//     );
//   }

//   concurrentCopy(): NodeFilteredGraph {
//     return new NodeFilteredGraph(
//       this.csrGraph.concurrentCopy(),
//       this.filteredIdMap
//     );
//   }

//   availableNodeLabels(): Set<NodeLabel> {
//     return this.filteredIdMap.availableNodeLabels();
//   }

//   nodeLabels(mappedNodeId: number): NodeLabel[] {
//     return this.filteredIdMap.nodeLabels(mappedNodeId);
//   }

//   hasLabel(mappedNodeId: number, label: NodeLabel): boolean {
//     return this.filteredIdMap.hasLabel(mappedNodeId, label);
//   }

//   forEachNodeLabel(
//     mappedNodeId: number,
//     consumer: (label: NodeLabel) => void
//   ): void {
//     this.filteredIdMap.forEachNodeLabel(mappedNodeId, consumer);
//   }

//   withFilteredLabels(
//     nodeLabels: Iterable<NodeLabel>,
//     concurrency: Concurrency
//   ): FilteredIdMap | undefined {
//     return this.filteredIdMap.withFilteredLabels(nodeLabels, concurrency);
//   }

//   nodeProperties(propertyKey: string): NodePropertyValues | null {
//     const properties = this.csrGraph.nodeProperties(propertyKey);
//     if (!properties) return null;
//     return new FilteredNodePropertyValues.FilteredToOriginalNodePropertyValues(
//       properties,
//       this
//     );
//   }

//   private validateIndexInverse(): void {
//     if (!this.degreeInverseCache) {
//       throw new Error(
//         "Cannot access inverse relationships as this graph is not inverse indexed."
//       );
//     }
//   }

//   private filterAndConsume(
//     source: number,
//     target: number,
//     consumer: RelationshipConsumer
//   ): boolean {
//     if (
//       this.filteredIdMap.containsRootNodeId(source) &&
//       this.filteredIdMap.containsRootNodeId(target)
//     ) {
//       const internalSourceId = this.filteredIdMap.toFilteredNodeId(source);
//       const internalTargetId = this.filteredIdMap.toFilteredNodeId(target);
//       return consumer.accept(internalSourceId, internalTargetId);
//     }
//     return true;
//   }

//   private filterAndConsumeWithProperty(
//     source: number,
//     target: number,
//     propertyValue: number,
//     consumer: RelationshipWithPropertyConsumer
//   ): boolean {
//     if (
//       this.filteredIdMap.containsRootNodeId(source) &&
//       this.filteredIdMap.containsRootNodeId(target)
//     ) {
//       const internalSourceId = this.filteredIdMap.toFilteredNodeId(source);
//       const internalTargetId = this.filteredIdMap.toFilteredNodeId(target);
//       return consumer.accept(internalSourceId, internalTargetId, propertyValue);
//     }
//     return true;
//   }
// }

// class RelationshipCounter {
//   private _relationshipCount = 0;
//   private readonly graph: NodeFilteredGraph;
//   private readonly partition: Partition;

//   constructor(graph: NodeFilteredGraph, partition: Partition) {
//     this.graph = graph;
//     this.partition = partition;
//   }

//   run(): void {
//     this.partition.consume((nodeId) => {
//       this.graph.forEachRelationship(nodeId, () => {
//         this._relationshipCount++;
//         return true;
//       });
//     });
//   }

//   relationshipCount(): number {
//     return this._relationshipCount;
//   }
// }

// class NonDuplicateRelationshipsDegreeCounter {
//   private previousNodeId = -1;
//   public degree = 0;

//   accept(_s: number, t: number): boolean {
//     if (t !== this.previousNodeId) {
//       this.degree++;
//       this.previousNodeId = t;
//     }
//     return true;
//   }
// }
