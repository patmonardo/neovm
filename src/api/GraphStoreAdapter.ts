import { Graph } from "./Graph";
import { GraphStore } from "./GraphStore";
import { NodeLabel } from "@/projection/NodeLabel"; // Assuming this path
import { RelationshipType } from "@/projection/RelationshipType"; // Assuming this path
import { ValueType } from "@/api/ValueType"; // Assuming this path
import { GraphProperty } from "./properties/graph/GraphProperty";
import { GraphPropertyValues } from "./properties/graph/GraphPropertyValues";
import { NodeProperty } from "./properties/nodes/NodeProperty";
import { NodePropertyValues } from "./properties/nodes/NodePropertyValues";
import { RelationshipProperty } from "./properties/relationships/abstract/RelationshipProperty";
import { RelationshipPropertyStore } from "./properties/relationships/RelationshipPropertyStore";
import { GraphSchema } from "./schema/abstract/GraphSchema";
import { Capabilities } from "@/core/loading/Capabilities"; // Assuming this path
import { DeletionResult } from "@/core/loading/DeletionResult"; // Assuming this path
import { SingleTypeRelationships } from "@/core/loading/SingleTypeRelationships"; // Assuming this path
import { DatabaseInfo } from "./DatabaseInfo"; // Assuming this path
import { IdMap } from "./IdMap"; // Assuming this path
import { Topology } from "./Topology"; // Assuming this path
import { CompositeRelationshipIterator } from "./CompositeRelationshipIterator"; // Assuming this path

export abstract class GraphStoreAdapter implements GraphStore {
  protected readonly graphStore: GraphStore;

  protected constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
  }

  databaseInfo(): DatabaseInfo {
    return this.graphStore.databaseInfo();
  }

  capabilities(): Capabilities {
    return this.graphStore.capabilities();
  }

  schema(): GraphSchema {
    return this.graphStore.schema();
  }

  creationTime(): Date {
    return this.graphStore.creationTime();
  }

  modificationTime(): Date {
    return this.graphStore.modificationTime();
  }

  graphPropertyKeys(): Set<string> {
    return this.graphStore.graphPropertyKeys();
  }

  hasGraphProperty(propertyKey: string): boolean {
    return this.graphStore.hasGraphProperty(propertyKey);
  }

  graphProperty(propertyKey: string): GraphProperty {
    return this.graphStore.graphProperty(propertyKey);
  }

  graphPropertyValues(propertyKey: string): GraphPropertyValues {
    return this.graphStore.graphPropertyValues(propertyKey);
  }

  addGraphProperty(
    propertyKey: string,
    propertyValues: GraphPropertyValues
  ): void {
    this.graphStore.addGraphProperty(propertyKey, propertyValues);
  }

  removeGraphProperty(propertyKey: string): void {
    this.graphStore.removeGraphProperty(propertyKey);
  }

  nodeCount(): number {
    return this.graphStore.nodeCount();
  }

  nodes(): IdMap {
    return this.graphStore.nodes();
  }

  nodeLabels(): Set<NodeLabel> {
    return this.graphStore.nodeLabels();
  }

  addNodeLabel(nodeLabel: NodeLabel): void {
    this.graphStore.addNodeLabel(nodeLabel);
  }

  nodePropertyKeys(labelOrLabels?: NodeLabel | NodeLabel[]): Set<string> {
     if (labelOrLabels === undefined) {
        return this.graphStore.nodePropertyKeys();
     } else if (Array.isArray(labelOrLabels)) {
        return this.graphStore.nodePropertyKeys(labelOrLabels);
     } else {
        return this.graphStore.nodePropertyKeys(labelOrLabels);
     }
  }

  hasNodeProperty(
    labelOrLabelsOrKey: NodeLabel | NodeLabel[] | string,
    propertyKey?: string
  ): boolean {
    if (typeof labelOrLabelsOrKey === 'string' && propertyKey === undefined) {
        return this.graphStore.hasNodeProperty(labelOrLabelsOrKey);
    } else if (propertyKey !== undefined) {
        if (Array.isArray(labelOrLabelsOrKey)) {
            return this.graphStore.hasNodeProperty(labelOrLabelsOrKey as NodeLabel[], propertyKey);
        } else {
            return this.graphStore.hasNodeProperty(labelOrLabelsOrKey as NodeLabel, propertyKey);
        }
    }
    // Should not happen with proper overloads in GraphStore, but as a fallback:
    throw new Error("Invalid arguments for hasNodeProperty");
  }


  nodeProperty(propertyKey: string): NodeProperty {
    return this.graphStore.nodeProperty(propertyKey);
  }

  addNodeProperty(
    nodeLabels: Set<NodeLabel>,
    propertyKey: string,
    propertyValues: NodePropertyValues
  ): void {
    this.graphStore.addNodeProperty(nodeLabels, propertyKey, propertyValues);
  }

  removeNodeProperty(propertyKey: string): void {
    this.graphStore.removeNodeProperty(propertyKey);
  }

  relationshipCount(relationshipType?: RelationshipType): number {
    if (relationshipType) {
        return this.graphStore.relationshipCount(relationshipType);
    }
    return this.graphStore.relationshipCount();
  }

  relationshipTypes(): Set<RelationshipType> {
    return this.graphStore.relationshipTypes();
  }

  hasRelationshipType(relationshipType: RelationshipType): boolean {
    return this.graphStore.hasRelationshipType(relationshipType);
  }

  inverseIndexedRelationshipTypes(): Set<RelationshipType> {
    return this.graphStore.inverseIndexedRelationshipTypes();
  }

  hasRelationshipProperty(
    relType: RelationshipType,
    propertyKey: string
  ): boolean {
    return this.graphStore.hasRelationshipProperty(relType, propertyKey);
  }

  relationshipPropertyKeys(relTypesOrType?: RelationshipType[] | RelationshipType): Set<string> | string[] {
    if (relTypesOrType === undefined) {
        return this.graphStore.relationshipPropertyKeys();
    } else if (Array.isArray(relTypesOrType)) {
        return this.graphStore.relationshipPropertyKeys(relTypesOrType);
    } else {
        return this.graphStore.relationshipPropertyKeys(relTypesOrType);
    }
  }

  relationshipPropertyType(propertyKey: string): ValueType {
    return this.graphStore.relationshipPropertyType(propertyKey);
  }

  relationshipPropertyValues(
    relationshipType: RelationshipType,
    propertyKey: string
  ): RelationshipProperty {
    return this.graphStore.relationshipPropertyValues(
      relationshipType,
      propertyKey
    );
  }

  addRelationshipType(relationships: SingleTypeRelationships): void {
    this.graphStore.addRelationshipType(relationships);
  }

  addInverseIndex(
    relationshipType: RelationshipType,
    topology: Topology,
    properties?: RelationshipPropertyStore
  ): void {
    this.graphStore.addInverseIndex(relationshipType, topology, properties);
  }

  deleteRelationships(relationshipType: RelationshipType): DeletionResult {
    return this.graphStore.deleteRelationships(relationshipType);
  }

  // For getGraph, the overloads are numerous.
  // The GraphStore interface would define these, and the adapter just passes them through.
  // This requires GraphStore to have a well-defined set of overloads for getGraph.
  getGraph(
    param1: NodeLabel | NodeLabel[] | RelationshipType | string | RelationshipType[],
    param2?: RelationshipType | RelationshipType[] | string | Optional<string>,
    param3?: Optional<string>
  ): Graph {
    // This is a simplified delegation. A real implementation would need to
    // correctly match the overload signature of the underlying graphStore.getGraph
    // For brevity, I'm showing a conceptual delegation.
    // You'd need to implement the full dispatch logic based on argument types and count
    // if the underlying graphStore.getGraph has a single complex signature.
    // If graphStore.getGraph has matching overloads, this becomes simpler.

    // Example of how one might start to differentiate:
    if (param1 instanceof NodeLabel && param2 === undefined) {
        return this.graphStore.getGraph(param1);
    }
    // ... and so on for all 9+ overloads.
    // This part is highly dependent on how GraphStore.getGraph is defined.
    // Assuming graphStore.getGraph has the same overloads:
    return (this.graphStore.getGraph as any)(param1, param2, param3);
  }

  getUnion(): Graph {
    return this.graphStore.getUnion();
  }

  getCompositeRelationshipIterator(
    relationshipType: RelationshipType,
    propertyKeys: string[]
  ): CompositeRelationshipIterator {
    return this.graphStore.getCompositeRelationshipIterator(
      relationshipType,
      propertyKeys
    );
  }
}
