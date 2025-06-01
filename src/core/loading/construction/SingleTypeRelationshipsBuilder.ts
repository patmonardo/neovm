/**
 * SINGLE TYPE RELATIONSHIPS BUILDER - COORDINATION HUB FOR RELATIONSHIP CONSTRUCTION
 *
 * This is the coordination hub that manages the construction of relationships for a single
 * relationship type (e.g., "FRIENDS", "FOLLOWS", "CONNECTED_TO").
 *
 * KEY RESPONSIBILITIES:
 * 🏗️ COORDINATION: Manages the overall relationship building process
 * 🔄 DIRECTION HANDLING: Supports directed (NonIndexed) and undirected (Indexed) relationships
 * 🧵 CONCURRENCY: Orchestrates parallel adjacency list construction
 * 📊 PROPERTY MANAGEMENT: Handles relationship properties and schema building
 * ⚡ COMPRESSION: Optional value compression for memory efficiency
 *
 * TWO STRATEGIES (same as LocalRelationshipsBuilder):
 *
 * 1. NON-INDEXED (Directed): Single importer, one direction only
 *    - Memory efficient: ~50% of indexed
 *    - Use case: Social media follows, web links, dependencies
 *
 * 2. INDEXED (Undirected): Two importers, both directions
 *    - Bidirectional traversal: A↔B stored as both A→B and B→A
 *    - Use case: Friendships, road networks, physical connections
 *
 * SIZE ANALYSIS - WHY TYPESCRIPT IS LARGER:
 * - Java: Immutables library generates builder code automatically
 * - TypeScript: We write all builder interfaces/classes manually
 * - Java: Static inner classes are more compact
 * - TypeScript: More explicit type definitions and interfaces
 * - Java: Less documentation (assumes familiarity)
 * - TypeScript: More comprehensive documentation for clarity
 */

import { PartialIdMap } from '@/api';
import { AdjacencyCompressor } from '@/api/compress';
import { Direction } from '@/api/schema';
import { RelationshipType } from '@/gds';
import { Concurrency, RunWithConcurrency } from '@/concurrency';
import {
  AdjacencyBuffer,
  SingleTypeRelationshipImporter,
  SingleTypeRelationships
} from '@/core/loading';
import { LocalRelationshipsBuilder } from './LocalRelationshipsBuilder';

/**
 * Configuration for relationship property handling.
 * Simplified from complex GraphFactory.PropertyConfig to focus on essentials.
 */
export interface PropertyConfig {
  propertyKey: string;
  defaultValue: number;
  aggregation: PropertyAggregation;
  propertyState: PropertyState;
}

export enum PropertyAggregation {
  DEFAULT = 'DEFAULT',
  SUM = 'SUM',
  MIN = 'MIN',
  MAX = 'MAX'
}

export enum PropertyState {
  PERSISTENT = 'PERSISTENT',
  TRANSIENT = 'TRANSIENT'
}

/**
 * Abstract coordinator for single relationship type construction.
 *
 * DESIGN PATTERNS:
 * - Template Method: Abstract class with concrete implementations
 * - Strategy Pattern: NonIndexed vs Indexed strategies
 * - Factory Pattern: Static factory method chooses correct implementation
 * - Builder Pattern: Flexible configuration and assembly
 */
export abstract class SingleTypeRelationshipsBuilder {
  protected readonly idMap: PartialIdMap;
  protected readonly bufferSize: number;
  protected readonly relationshipType: RelationshipType;
  protected readonly propertyConfigs: PropertyConfig[];
  protected readonly isMultiGraph: boolean;
  protected readonly loadRelationshipProperty: boolean;
  protected readonly direction: Direction;
  protected readonly executorService: ExecutorService;
  protected readonly concurrency: Concurrency;

  /**
   * Factory method that chooses the correct implementation strategy.
   *
   * STRATEGY SELECTION:
   * - If inverse importer provided → Indexed (undirected)
   * - If no inverse importer → NonIndexed (directed)
   */
  static create(config: SingleTypeRelationshipsBuilderConfig): SingleTypeRelationshipsBuilder {
    return config.inverseImporter
      ? new IndexedSingleTypeRelationshipsBuilder(config)
      : new NonIndexedSingleTypeRelationshipsBuilder(config);
  }

  protected constructor(config: SingleTypeRelationshipsBuilderConfig) {
    this.idMap = config.idMap;
    this.bufferSize = config.bufferSize;
    this.relationshipType = config.relationshipType;
    this.propertyConfigs = config.propertyConfigs;
    this.isMultiGraph = config.isMultiGraph;
    this.loadRelationshipProperty = config.loadRelationshipProperty;
    this.direction = config.direction;
    this.executorService = config.executorService;
    this.concurrency = config.concurrency;
  }

  // =============================================================================
  // ABSTRACT METHODS - IMPLEMENTED BY STRATEGIES
  // =============================================================================

  /** Create thread-local builder for concurrent relationship processing */
  abstract threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder;

  /** Get tasks for parallel adjacency list construction */
  abstract adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[];

  /** Build final SingleTypeRelationships from accumulated data */
  abstract singleTypeRelationshipImportResult(): SingleTypeRelationships;

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /** Get the partial ID map for node ID resolution */
  partialIdMap(): PartialIdMap {
    return this.idMap;
  }

  /**
   * Build the final SingleTypeRelationships with optional compression and progress tracking.
   *
   * BUILD PROCESS:
   * 1. Get adjacency list builder tasks from strategy
   * 2. Run tasks in parallel using configured concurrency
   * 3. Assemble final result from completed import data
   */
  build(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): SingleTypeRelationships {
    const adjacencyListBuilderTasks = this.adjacencyListBuilderTasks(mapper, drainCountConsumer);

    RunWithConcurrency.builder()
      .concurrency(this.concurrency)
      .tasks(adjacencyListBuilderTasks)
      .executor(this.executorService)
      .run();

    return this.singleTypeRelationshipImportResult();
  }
}

/**
 * NON-INDEXED STRATEGY (Directed Relationships)
 * Uses single importer for one-direction relationships.
 */
class NonIndexedSingleTypeRelationshipsBuilder extends SingleTypeRelationshipsBuilder {
  private readonly importer: SingleTypeRelationshipImporter;

  constructor(config: SingleTypeRelationshipsBuilderConfig) {
    super(config);
    this.importer = config.importer;
  }

  threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder {
    return LocalRelationshipsBuilderFactory.createNonIndexed(
      this.importer,
      this.bufferSize,
      this.propertyConfigs.length
    );
  }

  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    return this.importer.adjacencyListBuilderTasks(mapper, drainCountConsumer);
  }

  singleTypeRelationshipImportResult(): SingleTypeRelationships {
    const adjacencyListsWithProperties = this.importer.build();

    const topology = {
      isMultiGraph: this.isMultiGraph,
      adjacencyList: adjacencyListsWithProperties.adjacency(),
      elementCount: adjacencyListsWithProperties.relationshipCount()
    };

    const builder = SingleTypeRelationships.builder().topology(topology);

    // Add properties if configured
    if (this.loadRelationshipProperty) {
      const properties = this.buildRelationshipPropertyStore(adjacencyListsWithProperties);
      builder.properties(properties);
      builder.relationshipSchemaEntry(this.buildRelationshipSchemaEntry(properties));
    } else {
      builder.relationshipSchemaEntry(this.buildRelationshipSchemaEntry());
    }

    return builder.build();
  }

  private buildRelationshipPropertyStore(adjacencyListsWithProperties: any) {
    // Implementation details for property store building
    // Simplified from complex Java implementation
    return null; // Placeholder
  }

  private buildRelationshipSchemaEntry(properties?: any) {
    // Implementation details for schema entry building
    return null; // Placeholder
  }
}

/**
 * INDEXED STRATEGY (Undirected Relationships)
 * Uses two importers for bidirectional relationships.
 */
class IndexedSingleTypeRelationshipsBuilder extends SingleTypeRelationshipsBuilder {
  private readonly forwardImporter: SingleTypeRelationshipImporter;
  private readonly inverseImporter: SingleTypeRelationshipImporter;

  constructor(config: SingleTypeRelationshipsBuilderConfig) {
    super(config);
    this.forwardImporter = config.importer;
    this.inverseImporter = config.inverseImporter!; // Guaranteed to exist for Indexed
  }

  threadLocalRelationshipsBuilder(): LocalRelationshipsBuilder {
    return LocalRelationshipsBuilderFactory.createIndexed(
      this.forwardImporter,
      this.inverseImporter,
      this.bufferSize,
      this.propertyConfigs.length
    );
  }

  adjacencyListBuilderTasks(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): AdjacencyBuffer.AdjacencyListBuilderTask[] {
    const forwardTasks = this.forwardImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);
    const reverseTasks = this.inverseImporter.adjacencyListBuilderTasks(mapper, drainCountConsumer);

    return [...forwardTasks, ...reverseTasks];
  }

  singleTypeRelationshipImportResult(): SingleTypeRelationships {
    const forwardListWithProperties = this.forwardImporter.build();
    const inverseListWithProperties = this.inverseImporter.build();

    const relationshipCount = forwardListWithProperties.relationshipCount();

    const forwardTopology = {
      isMultiGraph: this.isMultiGraph,
      adjacencyList: forwardListWithProperties.adjacency(),
      elementCount: relationshipCount
    };

    const inverseTopology = {
      ...forwardTopology,
      adjacencyList: inverseListWithProperties.adjacency()
    };

    const builder = SingleTypeRelationships.builder()
      .topology(forwardTopology)
      .inverseTopology(inverseTopology);

    // Add properties if configured
    if (this.loadRelationshipProperty) {
      const forwardProperties = this.buildRelationshipPropertyStore(forwardListWithProperties);
      const inverseProperties = this.buildRelationshipPropertyStore(inverseListWithProperties);

      builder.properties(forwardProperties)
             .inverseProperties(inverseProperties)
             .relationshipSchemaEntry(this.buildRelationshipSchemaEntry(forwardProperties));
    } else {
      builder.relationshipSchemaEntry(this.buildRelationshipSchemaEntry());
    }

    return builder.build();
  }

  private buildRelationshipPropertyStore(adjacencyListsWithProperties: any) {
    // Implementation details for property store building
    return null; // Placeholder
  }

  private buildRelationshipSchemaEntry(properties?: any) {
    // Implementation details for schema entry building
    return null; // Placeholder
  }
}

// =============================================================================
// CONFIGURATION AND INTERFACES
// =============================================================================

/**
 * Configuration for SingleTypeRelationshipsBuilder construction.
 * Simplified interface focusing on essential parameters.
 */
export interface SingleTypeRelationshipsBuilderConfig {
  idMap: PartialIdMap;
  importer: SingleTypeRelationshipImporter;
  inverseImporter?: SingleTypeRelationshipImporter; // Optional for directed graphs
  bufferSize: number;
  relationshipType: RelationshipType;
  propertyConfigs: PropertyConfig[];
  isMultiGraph: boolean;
  loadRelationshipProperty: boolean;
  direction: Direction;
  executorService: ExecutorService;
  concurrency: Concurrency;
}

/**
 * Simplified executor service interface.
 * In production, would use Node.js worker threads or browser Web Workers.
 */
export interface ExecutorService {
  execute(task: () => void): void;
  shutdown(): Promise<void>;
}
