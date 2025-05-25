import { Validator } from '@/common/Validator';
import { NodeLabel } from '@/api/NodeLabel';
import { RelationshipType } from '@/api/RelationshipType';
import { GraphStore } from '@/api/GraphStore';
import { IdMap } from '@/api/IdMap';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { IdentifierMapper } from './IdentifierMapper';
import { NeoNodeProperties } from './NeoNodeProperties';
import { GraphStoreInput } from './GraphStoreInput';
import { MetaDataStore } from './MetaDataStore';
import { NodeStore } from './NodeStore';
import { RelationshipStore } from './RelationshipStore';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for ID mapping functions that handle different ID strategies.
 */
export interface IdMapFunction {
  /**
   * Gets the ID to use for export based on the mapping strategy.
   */
  getId(idMap: IdMap, id: number): number;

  /**
   * Gets the highest ID value for this mapping strategy.
   */
  highestId(idMap: IdMap): number;

  /**
   * Checks if the ID map contains the given ID for this mapping strategy.
   */
  contains(idMap: IdMap, id: number): boolean;
}

/**
 * Enumeration of ID mapping strategies for export operations.
 */
export enum IdMappingType {
  /**
   * Use mapped (internal) IDs directly.
   * IDs are 0-based and contiguous.
   */
  MAPPED = 'MAPPED',

  /**
   * Use original IDs from the source database.
   * IDs match the original database values.
   */
  ORIGINAL = 'ORIGINAL'
}

/**
 * Implementation of ID mapping functions for each strategy.
 */
export const IdMappingFunctions: Record<IdMappingType, IdMapFunction> = {
  [IdMappingType.MAPPED]: {
    getId(idMap: IdMap, id: number): number {
      return id;
    },

    highestId(idMap: IdMap): number {
      return idMap.nodeCount() - 1;
    },

    contains(idMap: IdMap, id: number): boolean {
      return this.highestId(idMap) >= id;
    }
  },

  [IdMappingType.ORIGINAL]: {
    getId(idMap: IdMap, id: number): number {
      return idMap.toOriginalNodeId(id);
    },

    highestId(idMap: IdMap): number {
      return idMap.highestOriginalId();
    },

    contains(idMap: IdMap, id: number): boolean {
      return idMap.containsOriginalId(id);
    }
  }
};

/**
 * Record containing the count of exported properties.
 */
export interface ExportedProperties {
  nodePropertyCount: number;
  relationshipPropertyCount: number;
}

/**
 * Abstract base class for exporting GraphStore data to various formats.
 * Provides common functionality for preparing data and coordinating the export process.
 */
export abstract class GraphStoreExporter {
  protected readonly graphStore: GraphStore;
  private readonly neoNodeProperties: Map<string, (id: number) => any>;
  private readonly nodeLabelMapping: IdentifierMapper<NodeLabel>;
  private readonly relationshipTypeMapping: IdentifierMapper<RelationshipType>;
  private readonly defaultRelationshipType: RelationshipType;
  protected readonly concurrency: Concurrency;
  private readonly batchSize: number;

  protected constructor(
    graphStore: GraphStore,
    neoNodeProperties: NeoNodeProperties | undefined,
    nodeLabelMapping: IdentifierMapper<NodeLabel>,
    relationshipTypeMapping: IdentifierMapper<RelationshipType>,
    defaultRelationshipType: RelationshipType,
    concurrency: Concurrency,
    batchSize: number
  ) {
    this.graphStore = graphStore;
    this.defaultRelationshipType = defaultRelationshipType;
    this.concurrency = concurrency;
    this.batchSize = batchSize;
    this.neoNodeProperties = neoNodeProperties?.neoNodeProperties() ?? new Map();
    this.nodeLabelMapping = nodeLabelMapping;
    this.relationshipTypeMapping = relationshipTypeMapping;
  }

  /**
   * Abstract method that subclasses implement to perform the actual export.
   *
   * @param graphStoreInput The prepared input data for export
   */
  protected abstract export(graphStoreInput: GraphStoreInput): void;

  /**
   * Abstract method that subclasses implement to specify the ID mapping strategy.
   *
   * @returns The ID mapping type to use for this export
   */
  protected abstract idMappingType(): IdMappingType;

  /**
   * Main entry point to run the export process.
   * Prepares all necessary data structures and delegates to the abstract export method.
   *
   * @returns Statistics about the exported properties
   */
  public run(): ExportedProperties {
    const metaDataStore = MetaDataStore.of(this.graphStore);
    const nodeStore = NodeStore.of(
      this.graphStore,
      this.neoNodeProperties,
      this.nodeLabelMapping
    );
    const relationshipStore = RelationshipStore.of(
      this.graphStore,
      this.defaultRelationshipType,
      this.relationshipTypeMapping
    );

    const graphProperties = new Set(
      this.graphStore.graphPropertyKeys()
        .map(key => this.graphStore.graphProperty(key))
    );

    const graphStoreInput = GraphStoreInput.of(
      metaDataStore,
      nodeStore,
      relationshipStore,
      this.graphStore.capabilities(),
      graphProperties,
      this.batchSize,
      this.concurrency,
      this.idMappingType()
    );

    this.export(graphStoreInput);

    const importedNodeProperties = (nodeStore.propertyCount() + this.neoNodeProperties.size) * this.graphStore.nodeCount();
    const importedRelationshipProperties = relationshipStore.propertyCount();

    return {
      nodePropertyCount: importedNodeProperties,
      relationshipPropertyCount: importedRelationshipProperties
    };
  }

  /**
   * Validator to ensure directory exists and is writable.
   */
  public static readonly DIRECTORY_IS_WRITABLE: Validator<string> = (value: string) => {
    try {
      // Create directories if they don't exist
      fs.mkdirSync(value, { recursive: true });

      const stats = fs.statSync(value);
      if (!stats.isDirectory()) {
        throw new Error(`'${value}' is not a directory`);
      }

      // Test writability by trying to create a temporary file
      const testFile = path.join(value, '.write-test');
      try {
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
      } catch (error) {
        throw new Error(`Directory '${value}' not writable`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Directory '${value}' not writable: ${error.message}`);
      }
      throw new Error(`Directory '${value}' not writable: ${String(error)}`);
    }
  };
}
