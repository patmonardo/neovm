import {
  PropertyReader,
  RelationshipsBatchBufferBuilder,
  SingleTypeRelationshipImporter,
  ThreadLocalSingleTypeRelationshipImporter
} from '@/core/loading';
import { RelationshipsBuilder } from './RelationshipsBuilder';

/**
 * Abstract base class for thread-local relationship builders.
 * Handles batching and property management for relationship import.
 */
export abstract class LocalRelationshipsBuilder implements AutoCloseable {

  /**
   * Add a relationship without properties.
   */
  abstract addRelationship(source: number, target: number): void;

  /**
   * Add a relationship with a single property value.
   */
  abstract addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void;

  /**
   * Add a relationship with multiple property values.
   */
  abstract addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void;

  /**
   * Close the builder and flush any remaining data.
   */
  abstract close(): void;

  /**
   * AutoCloseable implementation for use with try-with-resources pattern.
   */
  [Symbol.dispose](): void {
    this.close();
  }
}

/**
 * Non-indexed (directed) relationship builder implementation.
 * Imports relationships in a single direction only.
 */
export class NonIndexedLocalRelationshipsBuilder extends LocalRelationshipsBuilder {
  private readonly importer: ThreadLocalSingleTypeRelationshipImporter<number>;
  private readonly bufferedPropertyReader: PropertyReader.Buffered<number> | null;
  private readonly propertyCount: number;
  private localRelationshipId = 0;

  constructor(
    singleTypeRelationshipImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount: number
  ) {
    super();
    this.propertyCount = propertyCount;

    const relationshipsBatchBuffer = new RelationshipsBatchBufferBuilder<number>()
      .capacity(bufferSize)
      .propertyReferenceClass(Number)
      .build();

    if (propertyCount > 1) {
      this.bufferedPropertyReader = PropertyReader.buffered(bufferSize, propertyCount);
      this.importer = singleTypeRelationshipImporter.threadLocalImporter(
        relationshipsBatchBuffer,
        this.bufferedPropertyReader
      );
    } else {
      this.bufferedPropertyReader = null;
      this.importer = singleTypeRelationshipImporter.threadLocalImporter(
        relationshipsBatchBuffer,
        PropertyReader.preLoaded()
      );
    }
  }

  addRelationship(source: number, target: number): void {
    this.importer.buffer().add(source, target);
    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void {
    this.importer.buffer().add(
      source,
      target,
      this.doubleToLongBits(relationshipPropertyValue),
      RelationshipsBuilder.NO_PROPERTY_REF
    );
    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void {
    const nextRelationshipId = this.localRelationshipId++;
    this.importer.buffer().add(source, target, nextRelationshipId, RelationshipsBuilder.NO_PROPERTY_REF);

    if (!this.bufferedPropertyReader) {
      throw new Error('Buffered property reader not initialized for multiple properties');
    }

    for (let propertyKeyId = 0; propertyKeyId < this.propertyCount; propertyKeyId++) {
      this.bufferedPropertyReader.add(
        nextRelationshipId,
        propertyKeyId,
        relationshipPropertyValues[propertyKeyId]
      );
    }

    if (this.importer.buffer().isFull()) {
      this.flushBuffer();
    }
  }

  close(): void {
    this.flushBuffer();
  }

  /**
   * Get current buffer statistics.
   */
  getBufferStats(): BufferStats {
    const buffer = this.importer.buffer();
    return {
      currentSize: buffer.size(),
      capacity: buffer.capacity(),
      utilization: buffer.size() / buffer.capacity(),
      isFull: buffer.isFull()
    };
  }

  /**
   * Force flush the buffer even if not full.
   */
  forceFlush(): void {
    this.flushBuffer();
  }

  private flushBuffer(): void {
    this.importer.importRelationships();
    this.importer.buffer().reset();
    this.localRelationshipId = 0;
  }

  /**
   * Convert double to long bits (equivalent to Java's Double.doubleToLongBits).
   */
  private doubleToLongBits(value: number): number {
    const buffer = new ArrayBuffer(8);
    const floatView = new Float64Array(buffer);
    const intView = new BigInt64Array(buffer);
    floatView[0] = value;
    return Number(intView[0]);
  }
}

/**
 * Indexed (undirected) relationship builder implementation.
 * Imports relationships in both directions for undirected graphs.
 */
export class IndexedLocalRelationshipsBuilder extends LocalRelationshipsBuilder {
  private readonly forwardBuilder: NonIndexedLocalRelationshipsBuilder;
  private readonly reverseBuilder: NonIndexedLocalRelationshipsBuilder;

  constructor(forwardBuilder: NonIndexedLocalRelationshipsBuilder, reverseBuilder: NonIndexedLocalRelationshipsBuilder) {
    super();
    this.forwardBuilder = forwardBuilder;
    this.reverseBuilder = reverseBuilder;
  }

  addRelationship(source: number, target: number): void {
    this.forwardBuilder.addRelationship(source, target);
    this.reverseBuilder.addRelationship(target, source); // Note: reversed for undirected
  }

  addRelationshipWithProperty(source: number, target: number, relationshipPropertyValue: number): void {
    this.forwardBuilder.addRelationshipWithProperty(source, target, relationshipPropertyValue);
    this.reverseBuilder.addRelationshipWithProperty(target, source, relationshipPropertyValue);
  }

  addRelationshipWithProperties(source: number, target: number, relationshipPropertyValues: number[]): void {
    this.forwardBuilder.addRelationshipWithProperties(source, target, relationshipPropertyValues);
    this.reverseBuilder.addRelationshipWithProperties(target, source, relationshipPropertyValues);
  }

  close(): void {
    try {
      this.forwardBuilder.close();
    } finally {
      this.reverseBuilder.close();
    }
  }

  /**
   * Get combined buffer statistics from both directions.
   */
  getCombinedBufferStats(): CombinedBufferStats {
    const forwardStats = this.forwardBuilder.getBufferStats();
    const reverseStats = this.reverseBuilder.getBufferStats();

    return {
      forward: forwardStats,
      reverse: reverseStats,
      totalCurrentSize: forwardStats.currentSize + reverseStats.currentSize,
      totalCapacity: forwardStats.capacity + reverseStats.capacity,
      averageUtilization: (forwardStats.utilization + reverseStats.utilization) / 2
    };
  }

  /**
   * Force flush both buffers.
   */
  forceFlush(): void {
    this.forwardBuilder.forceFlush();
    this.reverseBuilder.forceFlush();
  }
}

/**
 * Factory for creating LocalRelationshipsBuilder instances.
 */
export class LocalRelationshipsBuilderFactory {
  /**
   * Create a non-indexed (directed) relationship builder.
   */
  static createNonIndexed(
    singleTypeRelationshipImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount: number = 0
  ): NonIndexedLocalRelationshipsBuilder {
    return new NonIndexedLocalRelationshipsBuilder(
      singleTypeRelationshipImporter,
      bufferSize,
      propertyCount
    );
  }

  /**
   * Create an indexed (undirected) relationship builder.
   */
  static createIndexed(
    forwardImporter: SingleTypeRelationshipImporter,
    reverseImporter: SingleTypeRelationshipImporter,
    bufferSize: number,
    propertyCount: number = 0
  ): IndexedLocalRelationshipsBuilder {
    const forwardBuilder = new NonIndexedLocalRelationshipsBuilder(
      forwardImporter,
      bufferSize,
      propertyCount
    );

    const reverseBuilder = new NonIndexedLocalRelationshipsBuilder(
      reverseImporter,
      bufferSize,
      propertyCount
    );

    return new IndexedLocalRelationshipsBuilder(forwardBuilder, reverseBuilder);
  }

  /**
   * Create a builder based on orientation configuration.
   */
  static create(
    config: RelationshipBuilderConfig
  ): LocalRelationshipsBuilder {
    if (config.isUndirected) {
      if (!config.reverseImporter) {
        throw new Error('Reverse importer required for undirected relationships');
      }
      return this.createIndexed(
        config.forwardImporter,
        config.reverseImporter,
        config.bufferSize,
        config.propertyCount
      );
    } else {
      return this.createNonIndexed(
        config.forwardImporter,
        config.bufferSize,
        config.propertyCount
      );
    }
  }
}

/**
 * Configuration for relationship builder creation.
 */
export interface RelationshipBuilderConfig {
  forwardImporter: SingleTypeRelationshipImporter;
  reverseImporter?: SingleTypeRelationshipImporter;
  bufferSize: number;
  propertyCount: number;
  isUndirected: boolean;
}

/**
 * Buffer statistics interface.
 */
export interface BufferStats {
  currentSize: number;
  capacity: number;
  utilization: number;
  isFull: boolean;
}

/**
 * Combined buffer statistics for indexed builders.
 */
export interface CombinedBufferStats {
  forward: BufferStats;
  reverse: BufferStats;
  totalCurrentSize: number;
  totalCapacity: number;
  averageUtilization: number;
}

/**
 * AutoCloseable interface for TypeScript.
 */
export interface AutoCloseable {
  close(): void;
}
