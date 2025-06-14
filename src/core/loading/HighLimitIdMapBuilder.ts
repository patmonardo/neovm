import { IdMap } from '@/api';
import { Concurrency } from '@/concurrency';
import { ShardedLongLongMap } from '@/core/utils/paged';
import { CloseableThreadLocal } from '@/utils';
import { IdMapBuilder } from './IdMapBuilder';
import { IdMapAllocator } from './IdMapAllocator';
import { HighLimitIdMap } from './HighLimitIdMap';

/**
 * Builder for creating HighLimitIdMap instances with two-level ID mapping.
 *
 * Manages the construction of both the intermediate mapping (original → intermediate)
 * and the internal mapping (intermediate → internal) with thread-safe batch processing.
 *
 * Uses thread-local bulk adders for efficient concurrent construction while
 * maintaining the proper sequence of ID transformations.
 */
export class HighLimitIdMapBuilder implements IdMapBuilder {
  public static readonly ID = 'highlimit';

  private readonly originalToIntermediateMapping: ShardedLongLongMap.BatchedBuilder;
  private readonly intermediateToInternalMapping: IdMapBuilder;
  private readonly bulkAdders: CloseableThreadLocal<BulkAdder>;

  /**
   * Create a new HighLimitIdMapBuilder.
   *
   * @param concurrency Concurrency configuration for parallel processing
   * @param internalIdMapBuilder Builder for the internal ID mapping layer
   * @returns A new HighLimitIdMapBuilder instance
   */
  static of(concurrency: Concurrency, internalIdMapBuilder: IdMapBuilder): HighLimitIdMapBuilder {
    return new HighLimitIdMapBuilder(concurrency, internalIdMapBuilder);
  }

  private constructor(concurrency: Concurrency, internalIdMapBuilder: IdMapBuilder) {
    // Create builder that overrides node IDs in input batch with generated intermediate IDs.
    // This is necessary for downstream label and property processing.
    this.originalToIntermediateMapping = ShardedLongLongMap.batchedBuilder(concurrency, true);
    this.intermediateToInternalMapping = internalIdMapBuilder;
    this.bulkAdders = CloseableThreadLocal.withInitial(() => this.newBulkAdder());
  }

  allocate(batchLength: number): IdMapAllocator {
    // Prepare intermediate mapping batch
    const intermediateBatch = this.originalToIntermediateMapping.prepareBatch(batchLength);

    // Allocate space in internal mapping
    const internalAllocator = this.intermediateToInternalMapping.allocate(batchLength);

    // Get thread-local bulk adder
    const bulkAdder = this.bulkAdders.get();
    bulkAdder.reset(batchLength, internalAllocator, intermediateBatch);

    return bulkAdder;
  }

  build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): IdMap {
    // Build the intermediate mapping (original → intermediate)
    const intermediateIdMap = this.originalToIntermediateMapping.build();

    // The highest intermediate ID is the size - 1 (dense mapping)
    const highestIntermediateId = intermediateIdMap.size() - 1;

    // Build the internal mapping (intermediate → internal)
    const internalIdMap = this.intermediateToInternalMapping.build(
      labelInformationBuilder,
      highestIntermediateId,
      concurrency
    );

    return new HighLimitIdMap(intermediateIdMap, internalIdMap);
  }

  /**
   * Close thread-local resources.
   */
  close(): void {
    this.bulkAdders.close();
  }

  /**
   * Get statistics about the builder state.
   */
  getBuilderStats(): HighLimitIdMapBuilderStats {
    return {
      builderId: HighLimitIdMapBuilder.ID,
      intermediateMapSize: this.originalToIntermediateMapping.size(),
      concurrency: this.originalToIntermediateMapping.getConcurrency(),
      hasThreadLocalAdders: true
    };
  }

  private newBulkAdder(): BulkAdder {
    return new BulkAdder();
  }
}

/**
 * Thread-local bulk adder that coordinates insertion into both mapping levels.
 *
 * Handles the two-phase insertion:
 * 1. Insert original IDs → intermediate IDs (with overwrite)
 * 2. Insert intermediate IDs → internal IDs
 */
class BulkAdder implements IdMapAllocator {
  private intermediateAllocator: IdMapAllocator | null = null;
  private internalAllocator: IdMapAllocator | null = null;
  private batchLength: number = 0;

  /**
   * Reset this bulk adder for a new batch.
   *
   * @param batchLength Number of IDs in this batch
   * @param internalAllocator Allocator for internal ID mapping
   * @param intermediateAllocator Allocator for intermediate ID mapping
   */
  reset(
    batchLength: number,
    internalAllocator: IdMapAllocator,
    intermediateAllocator: IdMapAllocator
  ): void {
    this.batchLength = batchLength;
    this.internalAllocator = internalAllocator;
    this.intermediateAllocator = intermediateAllocator;
  }

  allocatedSize(): number {
    return this.batchLength;
  }

  insert(nodeIds: number[]): void {
    if (!this.intermediateAllocator || !this.internalAllocator) {
      throw new Error('BulkAdder not properly initialized - call reset() first');
    }

    if (nodeIds.length !== this.batchLength) {
      throw new Error(`Expected ${this.batchLength} node IDs, got ${nodeIds.length}`);
    }

    // Phase 1: Insert into intermediate mapping
    // This overwrites the nodeIds array with intermediate IDs
    this.intermediateAllocator.insert(nodeIds);

    // Phase 2: Insert intermediate IDs into internal mapping
    // The nodeIds array now contains intermediate IDs from phase 1
    this.internalAllocator.insert(nodeIds);
  }

  /**
   * Check if this bulk adder is properly initialized.
   */
  isInitialized(): boolean {
    return this.intermediateAllocator !== null && this.internalAllocator !== null;
  }

  /**
   * Get debug information about the current state.
   */
  getDebugInfo(): BulkAdderDebugInfo {
    return {
      batchLength: this.batchLength,
      hasIntermediateAllocator: this.intermediateAllocator !== null,
      hasInternalAllocator: this.internalAllocator !== null,
      intermediateAllocatedSize: this.intermediateAllocator?.allocatedSize() ?? 0,
      internalAllocatedSize: this.internalAllocator?.allocatedSize() ?? 0
    };
  }
}

/**
 * Statistics about HighLimitIdMapBuilder state.
 */
export interface HighLimitIdMapBuilderStats {
  builderId: string;
  intermediateMapSize: number;
  concurrency: number;
  hasThreadLocalAdders: boolean;
}

/**
 * Debug information about BulkAdder state.
 */
interface BulkAdderDebugInfo {
  batchLength: number;
  hasIntermediateAllocator: boolean;
  hasInternalAllocator: boolean;
  intermediateAllocatedSize: number;
  internalAllocatedSize: number;
}
