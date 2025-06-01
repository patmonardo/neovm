import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { ValueType } from "./ValueType";
import { GraphProperty } from "./properties/graph";
import { GraphPropertyValues } from "./properties/graph";
import { NodeProperty } from "./properties/nodes";
import { NodePropertyValues } from "./properties/nodes";
import { RelationshipProperty } from "./properties/relationships";
import { RelationshipPropertyStore } from "./properties/relationships";
import { GraphSchema } from "./schema/abstract/GraphSchema";
import { Capabilities } from "../core/loading/Capabilities";
import { DeletionResult } from "../core/loading/DeletionResult";
import { SingleTypeRelationships } from "../core/loading/SingleTypeRelationships";
import { Topology } from "./Topology";
import { DatabaseInfo } from "./DatabaseInfo";
import { Graph } from "./Graph";
import { IdMap } from "./IdMap";
import { CompositeRelationshipIterator } from "./CompositeRelationshipIterator";

/**
 * Central interface for managing and accessing graph data.
 * Provides methods for querying and manipulating nodes, relationships,
 * and their properties at both individual and collection levels.
 */
export interface GraphStore {
  /**
   * Returns information about the database this graph store was created from.
   */
  databaseInfo(): DatabaseInfo;

  /**
   * Returns the schema of this graph store.
   */
  schema(): GraphSchema;

  /**
   * Returns the creation time of this graph store.
   */
  creationTime(): Date;

  /**
   * Returns the last modification time of this graph store.
   */
  modificationTime(): Date;

  /**
   * Returns the capabilities of this graph store.
   */
  capabilities(): Capabilities;

  // Graph Properties

  /**
   * Returns all graph property keys.
   */
  graphPropertyKeys(): Set<string>;

  /**
   * Checks if a graph property exists.
   *
   * @param propertyKey Property key to check
   */
  hasGraphProperty(propertyKey: string): boolean;

  /**
   * Returns a graph property.
   *
   * @param propertyKey Property key to retrieve
   */
  graphProperty(propertyKey: string): GraphProperty;

  /**
   * Returns graph property values.
   *
   * @param propertyKey Property key to retrieve values for
   */
  graphPropertyValues(propertyKey: string): GraphPropertyValues;

  /**
   * Adds a graph property.
   *
   * @param propertyKey Property key to add
   * @param propertyValues Property values to add
   */
  addGraphProperty(
    propertyKey: string,
    propertyValues: GraphPropertyValues
  ): void;

  /**
   * Removes a graph property.
   *
   * @param propertyKey Property key to remove
   */
  removeGraphProperty(propertyKey: string): void;

  // Nodes

  /**
   * Returns the total number of nodes in the graph store.
   */
  nodeCount(): number;

  /**
   * Returns the node mapping data.
   */
  nodes(): IdMap;

  /**
   * Returns all node labels in the graph store.
   */
  nodeLabels(): Set<NodeLabel>;

  /**
   * Adds a new node label to the graph store.
   *
   * @param nodeLabel Node label to add
   */
  addNodeLabel(nodeLabel: NodeLabel): void;

  // Node Properties

  /**
   * Returns all property keys for a specific node label.
   *
   * @param label Node label to get properties for
   */
  nodePropertyKeys(label: NodeLabel): Set<string>;

  /**
   * Returns all node property keys in the graph store.
   */
  nodePropertyKeys(): Set<string>;

  /**
   * Checks if a node property exists.
   *
   * @param propertyKey Property key to check
   */
  hasNodeProperty(propertyKey: string): boolean;

  /**
   * Checks if a node property exists for a specific label.
   *
   * @param label Node label to check
   * @param propertyKey Property key to check
   */
  hasNodeProperty(label: NodeLabel, propertyKey: string): boolean;

  /**
   * Checks if a node property exists for a collection of labels.
   *
   * @param labels Array of node labels to check
   * @param propertyKey Property key to check
   */
  hasNodeProperty(labels: Set<NodeLabel>, propertyKey: string): boolean;

  /**
   * Returns property keys common to all specified node labels.
   *
   * @param labels Array of node labels to get common properties for
   */
  nodePropertyKeys(labels: Array<NodeLabel>): string[];

  /**
   * Returns a node property.
   *
   * @param propertyKey Property key to retrieve
   */
  nodeProperty(propertyKey: string): NodeProperty;

  /**
   * Adds a node property.
   *
   * @param nodeLabels Node labels to add property to
   * @param propertyKey Property key to add
   * @param propertyValues Property values to add
   */
  addNodeProperty(
    nodeLabels: Set<NodeLabel>,
    propertyKey: string,
    propertyValues: NodePropertyValues
  ): void;

  /**
   * Removes a node property.
   *
   * @param propertyKey Property key to remove
   */
  removeNodeProperty(propertyKey: string): void;

  // Relationships

  /**
   * Returns the total number of relationships in the graph store.
   */
  relationshipCount(): number;

  /**
   * Returns the number of relationships of a specific type.
   *
   * @param relationshipType Relationship type to count
   */
  relationshipCount(relationshipType: RelationshipType): number;

  /**
   * Returns all relationship types in the graph store.
   */
  relationshipTypes(): Set<RelationshipType>;

  /**
   * Checks if a relationship type exists.
   *
   * @param relationshipType Relationship type to check
   */
  hasRelationshipType(relationshipType: RelationshipType): boolean;

  /**
   * Returns relationship types that have an inverse index.
   */
  inverseIndexedRelationshipTypes(): Array<RelationshipType>;

  // Relationship Properties

  /**
   * Checks if a relationship property exists for a specific relationship type.
   *
   * @param relType Relationship type to check
   * @param propertyKey Property key to check
   */
  hasRelationshipProperty(
    relType: RelationshipType,
    propertyKey: string
  ): boolean;

  /**
   * Returns property keys common to all specified relationship types.
   *
   * @param relTypes Array of relationship types to get common properties for
   */
  relationshipPropertyKeys(relTypes: Array<RelationshipType>): string[];

  /**
   * Returns the value type of a relationship property.
   *
   * @param propertyKey Property key to get type for
   */
  relationshipPropertyType(propertyKey: string): ValueType;

  /**
   * Returns all relationship property keys in the graph store.
   */
  relationshipPropertyKeys(): Set<string>;

  /**
   * Returns all property keys for a specific relationship type.
   *
   * @param relationshipType Relationship type to get properties for
   */
  relationshipPropertyKeys(relationshipType: RelationshipType): Set<string>;

  /**
   * Returns relationship property values.
   *
   * @param relationshipType Relationship type to get property values for
   * @param propertyKey Property key to retrieve values for
   */
  relationshipPropertyValues(
    relationshipType: RelationshipType,
    propertyKey: string
  ): RelationshipProperty;

  /**
   * Adds a relationship type.
   *
   * @param relationships Single type relationships to add
   */
  addRelationshipType(relationships: SingleTypeRelationships): void;

  /**
   * Adds an inverse index for a relationship type.
   *
   * @param relationshipType Relationship type to add index for
   * @param topology Topology to use for the index
   * @param properties Optional properties to include in the index
   */
  addInverseIndex(
    relationshipType: RelationshipType,
    topology: Topology,
    properties?: RelationshipPropertyStore
  ): void;

  /**
   * Deletes relationships of a specific type.
   *
   * @param relationshipType Relationship type to delete
   * @returns Result of the deletion operation
   */
  deleteRelationships(relationshipType: RelationshipType): DeletionResult;

  /**
   * Returns a graph filtered by relationship types.
   *
   * @param relationshipType Relationship types to include
   */
  getGraph(...relationshipType: RelationshipType[]): Graph;

  /**
   * Returns a graph filtered by relationship property.
   *
   * @param relationshipProperty Relationship property to filter by
   */
  getGraph(relationshipProperty: string): Graph;

  /**
   * Returns a graph filtered by relationship type and optional property.
   *
   * @param relationshipType Relationship type to filter by
   * @param relationshipProperty Optional relationship property to filter by
   */
  getGraph(
    relationshipType: RelationshipType,
    relationshipProperty?: string
  ): Graph;

  /**
   * Returns a graph filtered by relationship types and optional property.
   *
   * @param relationshipTypes Array of relationship types to filter by
   * @param relationshipProperty Optional relationship property to filter by
   */
  getGraph(
    relationshipTypes: Array<RelationshipType>,
    relationshipProperty?: string
  ): Graph;

  /**
   * Returns a graph filtered by node label, relationship type, and optional property.
   *
   * @param nodeLabel Node label to filter by
   * @param relationshipType Relationship type to filter by
   * @param relationshipProperty Optional relationship property to filter by
   */
  getGraph(
    nodeLabel: string,
    relationshipType: string,
    relationshipProperty?: string
  ): Graph;

  /**
   * Returns a graph containing only nodes with the given node label.
   *
   * @param nodeLabel Node label to filter by
   */
  getGraph(nodeLabel: NodeLabel): Graph;

  /**
   * Returns a graph containing only nodes with the given node labels.
   *
   * @param nodeLabels Array of node labels to filter by
   */
  getGraph(nodeLabels: Array<NodeLabel>): Graph;

  /**
   * Returns a graph filtered by node label, relationship type, and optional property.
   *
   * @param nodeLabel Node label to filter by
   * @param relationshipType Relationship type to filter by
   * @param relationshipProperty Optional relationship property to filter by
   */
  getGraph(
    nodeLabel: NodeLabel,
    relationshipType: RelationshipType,
    relationshipProperty?: string
  ): Graph;

  /**
   * Returns a graph filtered by node labels, relationship types, and optional property.
   *
   * @param nodeLabels Array of node labels to filter by
   * @param relationshipTypes Array of relationship types to filter by
   * @param relationshipProperty Optional relationship property to filter by
   */
  getGraph(
    nodeLabels: Array<NodeLabel>,
    relationshipTypes: Array<RelationshipType>,
    relationshipProperty?: string
  ): Graph;

  /**
   * Returns a union of all graphs in the store.
   */
  getUnion(): Graph;

  /**
   * Returns a composite relationship iterator for a relationship type and property keys.
   *
   * @param relationshipType Relationship type to iterate
   * @param propertyKeys Array of property keys to include
   */
  getCompositeRelationshipIterator(
    relationshipType: RelationshipType,
    propertyKeys: Array<string>
  ): CompositeRelationshipIterator;
}
