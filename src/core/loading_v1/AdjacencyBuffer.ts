// Assuming mocks are in a way that they can be imported, e.g.:
// import { MutableLong, RelationshipType, ... } from './mocks';

// Use the placeholder definitions from above

export class AdjacencyBuffer {
  private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory;
  private readonly chunkLocks: ReentrantLock[];
  private readonly chunkedAdjacencyLists: ChunkedAdjacencyLists[];
  private readonly paging: AdjacencyBufferPaging;
  private readonly relationshipCounter: LongAdder;
  private readonly propertyKeyIds: number[];
  private readonly defaultValues: number[];
  private readonly aggregations: Aggregation[];
  private readonly atLeastOnePropertyToLoad: boolean;

  private constructor(
    importMetaData: ImportMetaData,
    adjacencyCompressorFactory: AdjacencyCompressorFactory,
    chunkLocks: ReentrantLock[],
    chunkedAdjacencyLists: ChunkedAdjacencyLists[],
    paging: AdjacencyBufferPaging,
    atLeastOnePropertyToLoad: boolean
  ) {
    this.adjacencyCompressorFactory = adjacencyCompressorFactory;
    this.chunkLocks = chunkLocks;
    this.chunkedAdjacencyLists = chunkedAdjacencyLists;
    this.paging = paging;
    this.relationshipCounter = adjacencyCompressorFactory.relationshipCounter();
    this.propertyKeyIds = importMetaData.propertyKeyIds();
    this.defaultValues = importMetaData.defaultValues();
    this.aggregations = importMetaData.aggregations();
    this.atLeastOnePropertyToLoad = atLeastOnePropertyToLoad;
  }

  public static memoryEstimation(
    relationshipType: RelationshipType,
    propertyCount: number,
    undirected: boolean
  ): MemoryEstimation {
    return MemoryEstimations.setup("", (dimensions, concurrency) => {
      const nodeCount = dimensions.nodeCount();
      const relCountForType = dimensions.relationshipCounts().get(relationshipType) ?? dimensions.relCountUpperBound();
      const relCount = undirected ? relCountForType * 2n : relCountForType;
      const avgDegree = nodeCount > 0n ? BitUtil.ceilDiv(relCount, nodeCount) : 0n;
      return AdjacencyBuffer._memoryEstimation(avgDegree, nodeCount, propertyCount, concurrency);
    });
  }

  private static _memoryEstimation(
    avgDegree: number,
    nodeCount: number,
    propertyCount: number,
    concurrency: Concurrency
  ): MemoryEstimation {
    const importSizing = ImportSizing.of(concurrency, nodeCount);
    const numberOfPages = importSizing.numberOfPages();
    const pageSizeOpt = importSizing.pageSize();
    return MemoryEstimations.builder(AdjacencyBuffer)
      .fixed("ChunkedAdjacencyLists pages", Estimate.sizeOfObjectArray(numberOfPages))
      .add("ChunkedAdjacencyLists",
        ChunkedAdjacencyLists.memoryEstimation(avgDegree, pageSizeOpt.orElse(0), propertyCount).times(numberOfPages)
      )
      .build();
  }

  public static of(
    importMetaData: ImportMetaData,
    adjacencyCompressorFactory: AdjacencyCompressorFactory,
    importSizing: ImportSizing
  ): AdjacencyBuffer {
    const numPages = importSizing.numberOfPages();
    const pageSizeOpt = importSizing.pageSize();
    const chunkLocks: ReentrantLock[] = Array.from({ length: numPages }, () => new ReentrantLock());
    const chunkedLists: ChunkedAdjacencyLists[] = Array.from({ length: numPages }, () =>
      ChunkedAdjacencyLists.of(importMetaData.propertyKeyIds().length, pageSizeOpt.orElse(0))
    );
    const atLeastOneProperty = importMetaData.propertyKeyIds().some(id => id !== NO_SUCH_PROPERTY_KEY);
    const paging = pageSizeOpt.isPresent()
      ? new PagingWithKnownPageSize(pageSizeOpt.get())
      : new PagingWithUnknownPageSize(numPages);
    return new AdjacencyBuffer(importMetaData, adjacencyCompressorFactory, chunkLocks, chunkedLists, paging, atLeastOneProperty);
  }

  public addAll(
    batch: number[], // (source, target, source, target, ...)
    targetsSlice: number[], // all targets from batch
    propertyValues: number[][] | null, // properties for each target in targetsSlice
    offsets: number[], // end-offsets for each source node's targets in targetsSlice
    length: number // number of source nodes in this batch (length of relevant part of offsets)
  ): void {
    const pagingImpl = this.paging;
    let currentLock: ReentrantLock | null = null;
    let lastPageIndex = -1;
    let currentSegmentStartOffset = 0; // Start index in targetsSlice for the current source node

    try {
      for (let i = 0; i < length; ++i) {
        const currentSegmentEndOffset = offsets[i];

        if (currentSegmentEndOffset <= currentSegmentStartOffset) {
          currentSegmentStartOffset = currentSegmentEndOffset; // Advance for next iteration
          continue;
        }

        const sourceNodeId = batch[currentSegmentStartOffset * 2]; // Source for the current segment
        const pageIndex = pagingImpl.pageId(sourceNodeId);

        if (pageIndex !== lastPageIndex) {
          currentLock?.unlock();
          currentLock = this.chunkLocks[pageIndex];
          currentLock.lock();
          lastPageIndex = pageIndex;
        }

        const localId = pagingImpl.localId(sourceNodeId);
        const listForPage = this.chunkedAdjacencyLists[pageIndex];
        let targetsInSegmentToImport = currentSegmentEndOffset - currentSegmentStartOffset;

        if (propertyValues === null) {
          listForPage.add(localId, targetsSlice, currentSegmentStartOffset, currentSegmentEndOffset, targetsInSegmentToImport);
        } else {
          if (this.aggregations.length > 0 && this.aggregations[0] !== Aggregation.NONE && targetsInSegmentToImport > 1) {
            // preAggregate works on the segment [currentSegmentStartOffset, currentSegmentEndOffset)
            // of targetsSlice and propertyValues. It returns the new count of targets for this segment.
            targetsInSegmentToImport = AdjacencyPreAggregation.preAggregate(
              targetsSlice, propertyValues, currentSegmentStartOffset, currentSegmentEndOffset, this.aggregations
            );
          }
          listForPage.add(localId, targetsSlice, propertyValues, currentSegmentStartOffset, currentSegmentEndOffset, targetsInSegmentToImport);
        }
        currentSegmentStartOffset = currentSegmentEndOffset; // Move to the start of the next segment
      }
    } finally {
      currentLock?.unlock();
    }
  }

  public adjacencyListBuilderTasks(
    mapperOpt: Optional<AdjacencyCompressor.ValueMapper>,
    drainCountConsumerOpt: Optional<LongConsumer>
  ): AdjacencyListBuilderTask[] {
    this.adjacencyCompressorFactory.init();
    const tasks: AdjacencyListBuilderTask[] = [];
    for (let page = 0; page < this.chunkedAdjacencyLists.length; page++) {
      tasks.push(new AdjacencyListBuilderTask(
        page, this.paging, this.adjacencyCompressorFactory,
        this.chunkedAdjacencyLists[page], this.relationshipCounter,
        mapperOpt.orElse(ZigZagLongDecoding.Identity.INSTANCE),
        drainCountConsumerOpt.orElse(() => {}) // Empty function for no-op
      ));
    }
    return tasks;
  }

  public getPropertyKeyIds = (): number[] => this.propertyKeyIds;
  public getDefaultValues = (): number[] => this.defaultValues;
  public getAggregations = (): Aggregation[] => this.aggregations;
  public atLeastOnePropertyToLoad = (): boolean => this.atLeastOnePropertyToLoad;
}

export class AdjacencyListBuilderTask implements Runnable {
  constructor(
    private readonly page: number,
    private readonly paging: AdjacencyBufferPaging,
    private readonly adjacencyCompressorFactory: AdjacencyCompressorFactory,
    private readonly chunkedAdjacencyLists: ChunkedAdjacencyLists,
    private readonly relationshipCounter: LongAdder,
    private readonly valueMapper: AdjacencyCompressor.ValueMapper,
    private readonly drainCountConsumer: LongConsumer
  ) {}

  public run(): void {
    const compressor = this.adjacencyCompressorFactory.createCompressor();
    try {
      const buffer = new LongArrayBuffer();
      const importedRelationships = new MutableLong(0n);
      this.chunkedAdjacencyLists.consume((localId, targets, properties, compressedByteSize, numberOfCompressedTargets) => {
        const sourceNodeId = this.paging.sourceNodeId(localId, this.page);
        const nodeId = this.valueMapper.map(sourceNodeId);

        AdjacencyCompression.zigZagUncompressFrom(buffer, targets, numberOfCompressedTargets, compressedByteSize, this.valueMapper);

        importedRelationships.add(compressor.compress(
          nodeId, buffer.buffer.slice(0, buffer.length), properties, numberOfCompressedTargets
        ));
      });
      this.relationshipCounter.add(importedRelationships.longValue());
      this.drainCountConsumer(importedRelationships.longValue());
    } finally {
        // Simulate try-with-resources for compressor
        if (typeof (compressor as any)[Symbol.dispose] === 'function') {
            ((compressor as any)[Symbol.dispose] as () => void)();
        } else if (typeof (compressor as any).close === 'function') {
            ((compressor as any).close as () => void)();
        }
    }
  }
}

class PagingWithKnownPageSize implements AdjacencyBufferPaging {
  private readonly pageShift: number;
  private readonly pageMask: number;
  constructor(pageSize: number) {
    if (pageSize <= 0) throw new Error("Page size must be positive");
    // Ensure pageSize is a power of 2 for bitwise operations to be equivalent to division/modulo
    if ((pageSize & (pageSize - 1)) !== 0 && pageSize !== 1) {
        console.warn(`PagingWithKnownPageSize: pageSize ${pageSize} is not a power of 2. Paging logic might be incorrect if division/modulo was intended for non-power-of-2 sizes.`);
    }
    this.pageShift = numberOfTrailingZeros(pageSize);
    this.pageMask = pageSize - 1;
  }
  pageId = (source: number): number => Number(source >> BigInt(this.pageShift));
  localId = (source: number): number => source & BigInt(this.pageMask);
  sourceNodeId = (localId: number, pageId: number): number => (BigInt(pageId) << BigInt(this.pageShift)) + localId;
}

class PagingWithUnknownPageSize implements AdjacencyBufferPaging {
  private readonly pageShift: number;
  private readonly pageMask: number;
  constructor(numberOfPages: number) {
    if (numberOfPages <= 0) throw new Error("Number of pages must be positive");
    if ((numberOfPages & (numberOfPages - 1)) !== 0 && numberOfPages !== 1) {
        console.warn(`PagingWithUnknownPageSize: numberOfPages ${numberOfPages} is not a power of 2. Paging logic might be incorrect.`);
    }
    this.pageShift = numberOfTrailingZeros(numberOfPages);
    this.pageMask = numberOfPages - 1;
  }
  pageId = (source: number): number => Number(source & BigInt(this.pageMask));
  localId = (source: number): number => source >> BigInt(this.pageShift);
  sourceNodeId = (localId: number, pageId: number): number => (localId << BigInt(this.pageShift)) + BigInt(pageId);
}
