import {
  AtomicLong,
  CloseableThreadLocal,
  HugeCursor,
  HugeLongArray,
  IdMap,
  IdMapAllocator,
  LabelInformation,
  Concurrency,
  IdMapBuilder,
  ArrayIdMapBuilderOps,
  systemArraycopy
} from './arrayIdMapBuilderTypes'; // Adjust path as needed

export class ArrayIdMapBuilder implements IdMapBuilder {
  public static readonly ID = "array";

  private readonly array: HugeLongArray;
  private readonly capacity: number;
  private readonly allocationIndex: AtomicLong;
  private readonly adders: CloseableThreadLocal<ArrayIdMapBuilder.BulkAdder>;

  public static of(capacity: number | number): ArrayIdMapBuilder {
    const cap = BigInt(capacity);
    const array = HugeLongArray.newArray(cap);
    return new ArrayIdMapBuilder(array, cap);
  }

  private constructor(array: HugeLongArray, capacity: number) {
    this.array = array;
    this.capacity = capacity;
    this.allocationIndex = new AtomicLong();
    this.adders = CloseableThreadLocal.withInitial(() => this.newBulkAdder());
  }

  public allocate(batchLength: number): ArrayIdMapBuilder.BulkAdder {
    const startIndex = this.allocationIndex.getAndAccumulate(batchLength, (current, len) => this.upperAllocation(current, len));
    const adder = this.adders.get();
    adder.reset(startIndex, this.upperAllocation(startIndex, BigInt(batchLength)));
    return adder;
  }

  private newBulkAdder(): ArrayIdMapBuilder.BulkAdder {
    return new ArrayIdMapBuilder.BulkAdder(this.array, this.array.newCursor());
  }

  private upperAllocation(lower: number, nodes: number): number {
    return BigInt(Math.min(Number(this.capacity), Number(lower + nodes)));
  }

  public build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number | number,
    concurrency: Concurrency
  ): IdMap {
    this.adders.close();
    const nodeCount = this.getSize(); // Renamed from size()
    const internalToOriginalIds = this.getArray(); // Renamed from array()
    return ArrayIdMapBuilderOps.build(
      internalToOriginalIds,
      nodeCount,
      labelInformationBuilder,
      BigInt(highestNodeId),
      concurrency
    );
  }

  public getArray(): HugeLongArray { // Renamed from array()
    return this.array;
  }

  private getSize(): number { // Renamed from size()
    return this.allocationIndex.get();
  }

  // --- Nested BulkAdder Class ---
  public static BulkAdder = class implements IdMapAllocator {
    private buffer: number[] | null = null; // Java long[] -> number[]
    private allocationSize: number = 0;
    private offset: number = 0;
    private length: number = 0;
    private readonly array: HugeLongArray;
    private readonly cursor: HugeCursor<number[]>;

    constructor(array: HugeLongArray, cursor: HugeCursor<number[]>) { // Made public for CloseableThreadLocal
      this.array = array;
      this.cursor = cursor;
    }

    public reset(start: number, end: number): void { // Made public
      this.array.initCursor(this.cursor, start, end);
      this.buffer = null;
      this.allocationSize = Number(end - start);
      this.offset = 0;
      this.length = 0;
    }

    private nextBuffer(): boolean { // Kept private
      if (!this.cursor.next()) {
        this.buffer = null; // Ensure buffer is null if no next segment
        return false;
      }
      this.buffer = this.cursor.array;
      this.offset = this.cursor.offset;
      // Ensure length is non-negative and reflects actual data in the segment
      this.length = Math.max(0, this.cursor.limit - this.cursor.offset);
      return true;
    }

    public allocatedSize(): number {
      return this.allocationSize;
    }

    public insert(nodeIds: number[]): void { // nodeIds is long[] in Java
      let batchOffset = 0;
      let remainingToCopy = nodeIds.length;

      // The loop condition `while (nextBuffer())` implies that `nextBuffer` might return true
      // even if the buffer segment it provides is empty (length 0).
      // The copy logic needs to handle this.
      while (remainingToCopy > 0 && this.nextBuffer()) {
        if (this.buffer === null || this.length === 0) {
            // This case should ideally not happen if nextBuffer() returned true and there's data to copy,
            // unless the cursor logic is very specific.
            // If it means no more space in the target HugeLongArray for this allocation,
            // it's an issue. For now, assume nextBuffer()=true means a valid (possibly zero-length) segment.
            continue;
        }

        const countToCopyInThisSegment = Math.min(remainingToCopy, this.length);
        if (countToCopyInThisSegment > 0) {
            systemArraycopy(nodeIds, batchOffset, this.buffer, this.offset, countToCopyInThisSegment);
            batchOffset += countToCopyInThisSegment;
            remainingToCopy -= countToCopyInThisSegment;
        }
      }
      // If remainingToCopy > 0 here, it means the allocated space in HugeLongArray (via cursor segments)
      // was not enough for all nodeIds. The Java code doesn't explicitly check/throw for this
      // in `insert`, relying on `System.arraycopy` to throw if `this.length` (from cursor)
      // is too small, or on the overall allocation logic.
      // Our mock `HugeLongArray` and `HugeCursor` are simplified, so this exact behavior
      // might differ. The key is that `systemArraycopy` copies `this.length` items.
      // The loop in Java is `while (nextBuffer())`, and inside it copies `this.length` items.
      // This implies the sum of `this.length` over all buffers from the cursor for this allocation
      // must equal `nodeIds.length`.
      // The `BulkAdder.reset` sets up the cursor for a range `end - start`.
      // `allocatedSize` is `end - start`. So, `nodeIds.length` should be <= `allocatedSize`.
      if (nodeIds.length > this.allocatedSize) {
          // This check might be useful, though not explicitly in the Java `insert`.
          // console.warn("Attempting to insert more node IDs than allocated space.");
      }
    }
  };
}
