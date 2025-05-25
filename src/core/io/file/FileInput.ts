import { InputIterable } from '@/batchimport/api/InputIterable';
import { MutableNodeSchema } from '@/api/schema/MutableNodeSchema';
import { MutableRelationshipSchema } from '@/api/schema/MutableRelationshipSchema';
import { PropertySchema } from '@/api/schema/PropertySchema';
import { Capabilities } from '@/core/loading/Capabilities';
import { GraphInfo } from './GraphInfo';

/**
 * Interface representing input data from files for graph import operations.
 * Provides access to all components needed to reconstruct a graph from file storage:
 * - Graph elements (nodes, relationships, graph properties)
 * - Schema information (node schema, relationship schema, property schemas)
 * - Metadata (user info, graph info, capabilities, mappings)
 */
export interface FileInput {
  /**
   * Returns an iterable of nodes from the file input.
   * Each node contains ID, labels, and property data.
   *
   * @returns InputIterable for processing nodes
   */
  nodes(): InputIterable;

  /**
   * Returns an iterable of relationships from the file input.
   * Each relationship contains start node, end node, type, and property data.
   *
   * @returns InputIterable for processing relationships
   */
  relationships(): InputIterable;

  /**
   * Returns an iterable of graph-level properties from the file input.
   * These are properties that belong to the graph itself, not to nodes or relationships.
   *
   * @returns InputIterable for processing graph properties
   */
  graphProperties(): InputIterable;

  /**
   * Returns the username associated with this graph data.
   * Used for tracking data provenance and ownership.
   *
   * @returns The username string
   */
  userName(): string;

  /**
   * Returns graph metadata including node counts, relationship counts, and type information.
   *
   * @returns GraphInfo containing graph statistics and metadata
   */
  graphInfo(): GraphInfo;

  /**
   * Returns the mutable node schema defining node labels and their properties.
   *
   * @returns MutableNodeSchema for the graph
   */
  nodeSchema(): MutableNodeSchema;

  /**
   * Returns optional mapping from node labels to their string identifiers.
   * Used for compact storage where labels are mapped to shorter identifiers.
   *
   * @returns Optional Map of label mappings, or undefined if no mapping exists
   */
  labelMapping(): Map<string, string> | undefined;

  /**
   * Returns the mutable relationship schema defining relationship types and their properties.
   *
   * @returns MutableRelationshipSchema for the graph
   */
  relationshipSchema(): MutableRelationshipSchema;

  /**
   * Returns the schema for graph-level properties.
   * Maps property names to their corresponding property schemas.
   *
   * @returns Map from property names to PropertySchema objects
   */
  graphPropertySchema(): Map<string, PropertySchema>;

  /**
   * Returns the capabilities of the graph system that created this file.
   * Used to understand what features and operations are supported.
   *
   * @returns Capabilities object describing system features
   */
  capabilities(): Capabilities;
}
