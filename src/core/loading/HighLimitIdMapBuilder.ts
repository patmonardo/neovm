import { IdMap } from '../../api/IdMap'; // Adjust path
import { Concurrency } from '../concurrency/Concurrency'; // Adjust path
import { ShardedLongLongMapBatchedBuilder } from '../utils/paged/ShardedLongLongMapBatchedBuilder'; // Adjust path
import { ShardedLongLongMap } from '../utils/paged/ShardedLongLongMap'; // Adjust path
import { CloseableThreadLocalMock } from '../../utils/CloseableThreadLocalMock'; // Adjust path
import { IdMapBuilder } from './IdMapBuilder';
import { IdMapAllocator } from './IdMapAllocator';
import { LabelInformation } from './LabelInformation';
import { HighLimitIdMap } from './HighLimitIdMap';

// Nested BulkAdder class
class BulkAdder implements IdMapAllocator {
  private intermediateAllocator!: IdMapAllocator; // Definite assignment assertion
  private internalAllocator!: IdMapAllocator; // Definite assignment assertion
  private _batchLength: number = 0;

  // Public constructor for direct instantiation if needed, though primarily used via reset
  constructor() {}

  public reset(
    batchLength: number,
    internalAllocator: IdMapAllocator,
    intermediateAllocator: IdMapAllocator
  ): void {
    this._batchLength = batchLength;
    this.internalAllocator = internalAllocator;
    this.intermediateAllocator = intermediateAllocator;
  }

  public allocatedSize(): number {
    return this._batchLength;
  }

  public insert(nodeIds: number[]): void {
    // nodeIds initially contains original IDs.
    // intermediateAllocator.insert might modify nodeIds in place to contain intermediate IDs.
    this.intermediateAllocator.insert(nodeIds);
    // Now nodeIds (potentially modified) are passed to internalAllocator.
    this.internalAllocator.insert(nodeIds);
  }

  public close?(): void {
      // If allocators themselves need closing
      if (typeof this.intermediateAllocator?.close === 'function') {
          this.intermediateAllocator.close();
      }
      if (typeof this.internalAllocator?.close === 'function') {
          this.internalAllocator.close();
      }
  }
}

export class HighLimitIdMapBuilder implements IdMapBuilder {
  public static readonly ID = "highlimit";

  private readonly originalToIntermediateMapping: ShardedLongLongMapBatchedBuilder;
  private readonly intermediateToInternalMapping: IdMapBuilder;
  private readonly bulkAdders: CloseableThreadLocalMock<BulkAdder>;

  public static of(concurrency: Concurrency, internalIdMapBuilder: IdMapBuilder): HighLimitIdMapBuilder {
    return new HighLimitIdMapBuilder(concurrency, internalIdMapBuilder);
  }

  private constructor(concurrency: Concurrency, internalIdMapBuilder: IdMapBuilder) {
    // We use a builder that overrides the node ids in the input batch with the
    // generated intermediate node ids. This is necessary for downstream label
    // and property processing.
    this.originalToIntermediateMapping = ShardedLongLongMapBatchedBuilder.batchedBuilder(concurrency, true);
    this.intermediateToInternalMapping = internalIdMapBuilder;
    this.bulkAdders = CloseableThreadLocalMock.withInitial(() => new BulkAdder());
  }

  public allocate(batchLength: number): IdMapAllocator {
    const batchIntermediateAllocator = this.originalToIntermediateMapping.prepareBatch(batchLength);
    const internalAllocatorForBatch = this.intermediateToInternalMapping.allocate(batchLength);
    const bulkAdder = this.bulkAdders.get();
    bulkAdder.reset(batchLength, internalAllocatorForBatch, batchIntermediateAllocator);
    return bulkAdder;
  }

  public build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number, // This is the highest *original* node ID for the overall map
    concurrency: Concurrency
  ): IdMap {
    this.bulkAdders.close(); // Close the thread-local, which might close BulkAdders

    const intermediateIdMap = this.originalToIntermediateMapping.build();
    // The highestNodeId for the internalIdMapBuilder is the highest *intermediate* ID.
    // This is derived from the number of unique original IDs mapped by intermediateIdMap.
    const highestIntermediateId = intermediateIdMap.size() > 0n ? intermediateIdMap.size() - 1n : -1n; // Or however size relates to max ID

    const internalIdMap = this.intermediateToInternalMapping.build(
      labelInformationBuilder,
      highestIntermediateId, // Pass highest *intermediate* ID here
      concurrency
    );

    return new HighLimitIdMap(intermediateIdMap, internalIdMap);
  }
}
