import { PartialIdMap, IdMap } from "@/api";
import { AdjacencyCompressor } from "@/api/compress";
import { StringJoining } from "@/utils";
import { SingleTypeRelationships } from "@/core/loading";
import { SingleTypeRelationshipsBuilder } from "./SingleTypeRelationshipsBuilder";
import { LocalRelationshipsBuilderProvider } from "./LocalRelationshipsBuilderProvider";

/**
 * High-level API for building relationships with validation and node ID mapping.
 * Provides a clean interface that delegates to the underlying concurrent building infrastructure.
 */
export class RelationshipsBuilder {
  static readonly NO_PROPERTY_REF = -1;

  private readonly idMap: PartialIdMap;
  private readonly singleTypeRelationshipsBuilder: SingleTypeRelationshipsBuilder;
  private readonly localBuilderProvider: LocalRelationshipsBuilderProvider;
  private readonly skipDanglingRelationships: boolean;

  constructor(
    singleTypeRelationshipsBuilder: SingleTypeRelationshipsBuilder,
    localBuilderProvider: LocalRelationshipsBuilderProvider,
    skipDanglingRelationships: boolean
  ) {
    this.singleTypeRelationshipsBuilder = singleTypeRelationshipsBuilder;
    this.idMap = singleTypeRelationshipsBuilder.partialIdMap();
    this.localBuilderProvider = localBuilderProvider;
    this.skipDanglingRelationships = skipDanglingRelationships;
  }

  /**
   * Add a relationship between two nodes using original node IDs.
   * Throws error if nodes are not found and skipDanglingRelationships is false.
   */
  add(originalSourceId: number, originalTargetId: number): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(originalSourceId),
        this.idMap.toMappedNodeId(originalTargetId)
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(
        originalSourceId,
        originalTargetId,
        this.idMap
      );
    }
  }

  /**
   * Add a relationship with a single property value.
   */
  addWithProperty(
    source: number,
    target: number,
    relationshipPropertyValue: number
  ): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(source),
        this.idMap.toMappedNodeId(target),
        relationshipPropertyValue
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(source, target, this.idMap);
    }
  }

  /**
   * Add a relationship with multiple property values.
   */
  addWithProperties(
    source: number,
    target: number,
    relationshipPropertyValues: number[]
  ): void {
    if (
      !this.addFromInternal(
        this.idMap.toMappedNodeId(source),
        this.idMap.toMappedNodeId(target),
        relationshipPropertyValues
      ) &&
      !this.skipDanglingRelationships
    ) {
      RelationshipsBuilder.throwUnmappedNodeIds(source, target, this.idMap);
    }
  }

  /**
   * Add a relationship using already-mapped internal node IDs.
   * Returns true if the relationship was added, false if nodes were not found.
   */
  addFromInternal(mappedSourceId: number, mappedTargetId: number): boolean {
    if (this.validateRelationships(mappedSourceId, mappedTargetId)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationship(mappedSourceId, mappedTargetId);
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  /**
   * Add a relationship with single property using mapped internal node IDs.
   */
  addFromInternalWithProperty(
    mappedSourceId: number,
    mappedTargetId: number,
    relationshipPropertyValue: number
  ): boolean {
    if (this.validateRelationships(mappedSourceId, mappedTargetId)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationshipWithProperty(
            mappedSourceId,
            mappedTargetId,
            relationshipPropertyValue
          );
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  /**
   * Add a relationship with multiple properties using mapped internal node IDs.
   */
  addFromInternalWithProperties(
    source: number,
    target: number,
    relationshipPropertyValues: number[]
  ): boolean {
    if (this.validateRelationships(source, target)) {
      const threadLocalBuilder = this.localBuilderProvider.acquire();
      try {
        threadLocalBuilder
          .get()
          .addRelationshipWithProperties(
            source,
            target,
            relationshipPropertyValues
          );
      } finally {
        threadLocalBuilder.release();
      }
      return true;
    }
    return false;
  }

  /**
   * Validate that both source and target node IDs are valid (not NOT_FOUND).
   */
  private validateRelationships(source: number, target: number): boolean {
    return source !== IdMap.NOT_FOUND && target !== IdMap.NOT_FOUND;
  }

  /**
   * Throw an error for unmapped node IDs with detailed information.
   */
  private static throwUnmappedNodeIds(
    source: number,
    target: number,
    idMap: PartialIdMap
  ): never {
    const mappedSource = idMap.toMappedNodeId(source);
    const mappedTarget = idMap.toMappedNodeId(target);

    const unmappedIds: string[] = [];
    if (mappedSource === IdMap.NOT_FOUND) {
      unmappedIds.push(source.toString());
    }
    if (mappedTarget === IdMap.NOT_FOUND) {
      unmappedIds.push(target.toString());
    }

    const message = `The following node ids are not present in the node id space: ${StringJoining.join(
      unmappedIds
    )}`;
    throw new Error(message);
  }

  /**
   * Build the final SingleTypeRelationships without compression or progress tracking.
   */
  build(): SingleTypeRelationships {
    return this.buildWithOptions();
  }

  /**
   * Build the final SingleTypeRelationships with optional compression and progress tracking.
   *
   * @param mapper A mapper to transform values before compressing them. Must be thread-safe.
   * @param drainCountConsumer A consumer called when adjacency lists are drained. Must be thread-safe.
   */
  buildWithOptions(
    mapper?: AdjacencyCompressor.ValueMapper,
    drainCountConsumer?: (count: number) => void
  ): SingleTypeRelationships {
    try {
      this.localBuilderProvider.close();
    } catch (error) {
      throw new Error(`Failed to close local builder provider: ${error}`);
    }
    return this.singleTypeRelationshipsBuilder.build(
      mapper,
      drainCountConsumer
    );
  }
}

/**
 * Interface representing a relationship with source, target, and optional property.
 */
export interface Relationship {
  sourceNodeId(): number;
  targetNodeId(): number;
  property(): number;
}

/**
 * Simple implementation of the Relationship interface.
 */
export class SimpleRelationship implements Relationship {
  private readonly source: number;
  private readonly target: number;
  private readonly propertyValue: number;

  constructor(source: number, target: number, propertyValue = 0.0) {
    this.source = source;
    this.target = target;
    this.propertyValue = propertyValue;
  }

  sourceNodeId(): number {
    return this.source;
  }

  targetNodeId(): number {
    return this.target;
  }

  property(): number {
    return this.propertyValue;
  }

  toString(): string {
    return `Relationship(${this.source} -> ${this.target}, property=${this.propertyValue})`;
  }

  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof SimpleRelationship)) return false;
    return (
      this.source === other.source &&
      this.target === other.target &&
      Math.abs(this.propertyValue - other.propertyValue) < 1e-10
    );
  }

  hashCode(): number {
    let hash = 17;
    hash = hash * 31 + this.source;
    hash = hash * 31 + this.target;
    hash = hash * 31 + Math.floor(this.propertyValue * 1000); // Simple hash for double
    return hash >>> 0; // Ensure positive
  }
}

/**
 * Builder for RelationshipsBuilder configuration.
 */
export class RelationshipsBuilderBuilder {
  private singleTypeBuilder?: SingleTypeRelationshipsBuilder;
  private localBuilderProvider?: LocalRelationshipsBuilderProvider;
  private skipDangling = false;

  singleTypeRelationshipsBuilder(
    builder: SingleTypeRelationshipsBuilder
  ): this {
    this.singleTypeBuilder = builder;
    return this;
  }

  localRelationshipsBuilderProvider(
    provider: LocalRelationshipsBuilderProvider
  ): this {
    this.localBuilderProvider = provider;
    return this;
  }

  skipDanglingRelationships(skip: boolean): this {
    this.skipDangling = skip;
    return this;
  }

  build(): RelationshipsBuilder {
    if (!this.singleTypeBuilder) {
      throw new Error("SingleTypeRelationshipsBuilder is required");
    }
    if (!this.localBuilderProvider) {
      throw new Error("LocalRelationshipsBuilderProvider is required");
    }

    return new RelationshipsBuilder(
      this.singleTypeBuilder,
      this.localBuilderProvider,
      this.skipDangling
    );
  }
}
