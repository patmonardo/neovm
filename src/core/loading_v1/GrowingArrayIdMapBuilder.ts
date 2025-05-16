import { IdMap } from "../../api/IdMap"; // Adjust path
import { HugeLongArray } from "../../collections/ha/HugeLongArray"; // Adjust path
import { Concurrency } from "../concurrency/Concurrency"; // Adjust path
import { HugeLongArrayBuilder } from "../utils/paged/HugeLongArrayBuilder"; // Adjust path
import { HugeLongArrayBuilderAllocator } from "../utils/paged/HugeLongArrayBuilderAllocator"; // Adjust path
import { AutoCloseableThreadLocalMock } from "../../utils/AutoCloseableThreadLocalMock"; // Adjust path
import { AtomicLongMock } from "../../utils/AtomicLongMock"; // Adjust path
import { IdMapBuilder } from "./IdMapBuilder";
import { LabelInformation } from "./LabelInformation";
import { ArrayIdMapBuilderOps } from "./ArrayIdMapBuilderOps";

export class GrowingArrayIdMapBuilder implements IdMapBuilder {
  private readonly arrayBuilder: HugeLongArrayBuilder;
  private readonly allocationIndex: AtomicLongMock;
  private readonly allocators: AutoCloseableThreadLocalMock<HugeLongArrayBuilderAllocator>;

  public static of(): GrowingArrayIdMapBuilder {
    const array = HugeLongArrayBuilder.newBuilder();
    return new GrowingArrayIdMapBuilder(array);
  }

  private constructor(arrayBuilder: HugeLongArrayBuilder) {
    this.arrayBuilder = arrayBuilder;
    this.allocationIndex = new AtomicLongMock();
    // The supplier creates a new Allocator instance for each "thread" (or once in our mock)
    this.allocators = AutoCloseableThreadLocalMock.withInitial(
      () => new HugeLongArrayBuilderAllocator()
    );
  }

  public allocate(batchLength: number): HugeLongArrayBuilderAllocator {
    const startIndex = this.allocationIndex.getAndAdd(BigInt(batchLength));

    const allocator = this.allocators.get();
    // The arrayBuilder.allocate method configures the allocator instance
    // to work on the specified segment.
    this.arrayBuilder.allocate(startIndex, batchLength, allocator);

    return allocator;
  }

  public build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): IdMap {
    this.allocators.close(); // Close the thread-local, potentially closing allocators
    const nodeCount = this.size();
    const graphIds = this.arrayBuilder.build(nodeCount);
    return ArrayIdMapBuilderOps.build(
      graphIds,
      nodeCount,
      labelInformationBuilder,
      highestNodeId,
      concurrency
    );
  }

  public array(): HugeLongArray {
    // Note: In Java, this might return a snapshot or the current state.
    // Here, it builds based on the current size.
    return this.arrayBuilder.build(this.size());
  }

  public size(): number {
    return this.allocationIndex.get();
  }
}
