import { Worker } from "worker_threads";
import { Graph } from "../api/graph";
import {
  BasePregelComputation,
  PregelComputation,
  BidirectionalPregelComputation,
} from "./PregelComputation";
import { PregelConfig } from "./PregelConfig";
import { NodeValue } from "./NodeValue";
import { Messenger } from "./Messenger";
import { HugeAtomicBitSet } from "../core/utils/paged/HugeAtomicBitSet";
import { ProgressTracker } from "../core/utils/progress/tasks/progressTracker";
import { Partition } from "../core/utils/partition/Partition";
import {
  ComputeContext,
  BidirectionalComputeContext,
} from "./context/ComputeContext";
import { InitContext, BidirectionalInitContext } from "./context/InitContext";
import { PregelComputer } from "./PregelComputer";
import { ForkJoinComputeStep } from "./ForkJoinComputeStep";
import { MutableInt } from "../utils/MutableInt";
import { Optional } from "../utils/Optional";
import { WorkerPool } from "../core/concurrency/WorkerPool";

export class ForkJoinComputer<
  CONFIG extends PregelConfig
> extends PregelComputer<CONFIG> {
  private readonly workerPool: WorkerPool;
  private sentMessage: AtomicBoolean;
  private rootTask: ForkJoinComputeStep<CONFIG, any, any, any>;

  constructor(
    graph: Graph,
    computation: BasePregelComputation<CONFIG>,
    config: CONFIG,
    nodeValues: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    workerPool: WorkerPool,
    progressTracker: ProgressTracker
  ) {
    super(
      graph,
      computation,
      config,
      nodeValues,
      messenger,
      voteBits,
      progressTracker
    );
    this.workerPool = workerPool;
  }

  initComputation(): void {
    // silence is golden (keeping the same empty implementation as Java)
  }

  initIteration(iteration: number): void {
    this.sentMessage = new AtomicBoolean(false);
    const mutableIteration = new MutableInt(iteration);
    const partition = Partition.of(0, this.graph.nodeCount());

    // Type check to determine which kind of compute step to create
    this.rootTask =
      this.computation instanceof BidirectionalPregelComputation
        ? this.createBidirectionalComputeSteps(
            mutableIteration,
            this.sentMessage,
            partition
          )
        : this.createComputeStep(mutableIteration, this.sentMessage, partition);
  }

  runIteration(): void {
    // Instead of ForkJoinPool.invoke, we use our WorkerPool to execute the task
    this.workerPool.execute(this.rootTask);
  }

  hasConverged(): boolean {
    return !this.sentMessage.get() && this.voteBits.allSet();
  }

  release(): void {
    this.workerPool.shutdown();
    this.computation.close();
  }

  private createComputeStep(
    iteration: MutableInt,
    hasSentMessages: AtomicBoolean,
    partition: Partition
  ): ForkJoinComputeStep<
    CONFIG,
    any,
    InitContext<CONFIG>,
    ComputeContext<CONFIG>
  > {
    const initContext = () =>
      new InitContext<CONFIG>(
        this.graph.concurrentCopy(),
        this.config,
        this.nodeValues,
        this.progressTracker
      );

    const computeContext = () =>
      new ComputeContext<CONFIG>(
        this.graph.concurrentCopy(),
        this.config,
        this.computation,
        this.nodeValues,
        this.messenger,
        this.voteBits,
        iteration,
        Optional.empty(),
        this.progressTracker
      );

    // Cast the computation to the correct type and extract the methods
    const typedComputation = this.computation as PregelComputation<CONFIG>;

    return new ForkJoinComputeStep<
      CONFIG,
      any,
      InitContext<CONFIG>,
      ComputeContext<CONFIG>
    >(
      (ctx: InitContext<CONFIG>) => typedComputation.init(ctx),
      (ctx: ComputeContext<CONFIG>) => typedComputation.compute(ctx),
      initContext,
      computeContext,
      iteration,
      partition,
      this.nodeValues,
      this.messenger,
      this.voteBits,
      null,
      hasSentMessages,
      this.progressTracker
    );
  }

  private createBidirectionalComputeSteps(
    iteration: MutableInt,
    hasSentMessages: AtomicBoolean,
    partition: Partition
  ): ForkJoinComputeStep<
    CONFIG,
    any,
    BidirectionalInitContext<CONFIG>,
    BidirectionalComputeContext<CONFIG>
  > {
    const initContext = () =>
      new BidirectionalInitContext<CONFIG>(
        this.graph.concurrentCopy(),
        this.config,
        this.nodeValues,
        this.progressTracker
      );

    const computeContext = () =>
      new BidirectionalComputeContext<CONFIG>(
        this.graph.concurrentCopy(),
        this.config,
        this.computation,
        this.nodeValues,
        this.messenger,
        this.voteBits,
        iteration,
        Optional.empty(),
        this.progressTracker
      );

    // Cast the computation to the correct type and extract the methods
    const typedComputation = this
      .computation as BidirectionalPregelComputation<CONFIG>;

    return new ForkJoinComputeStep<
      CONFIG,
      any,
      BidirectionalInitContext<CONFIG>,
      BidirectionalComputeContext<CONFIG>
    >(
      (ctx: BidirectionalInitContext<CONFIG>) => typedComputation.init(ctx),
      (ctx: BidirectionalComputeContext<CONFIG>) =>
        typedComputation.compute(ctx),
      initContext,
      computeContext,
      iteration,
      partition,
      this.nodeValues,
      this.messenger,
      this.voteBits,
      undefined,
      hasSentMessages,
      this.progressTracker
    );
  }
}

/**
 * TypeScript implementation of Java's AtomicBoolean
 */
class AtomicBoolean {
  private value: boolean;

  constructor(initialValue: boolean = false) {
    this.value = initialValue;
  }

  get(): boolean {
    return this.value;
  }

  set(newValue: boolean): void {
    this.value = newValue;
  }

  getAndSet(newValue: boolean): boolean {
    const oldValue = this.value;
    this.value = newValue;
    return oldValue;
  }

  compareAndSet(expected: boolean, update: boolean): boolean {
    if (this.value === expected) {
      this.value = update;
      return true;
    }
    return false;
  }
}
