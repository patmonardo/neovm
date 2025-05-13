import { Graph } from '../api/graph';
import { BasePregelComputation } from './BasePregelComputation';
import { PregelComputation } from './PregelComputation';
import { BidirectionalPregelComputation } from './BidirectionalPregelComputation';
import { PregelConfig } from './PregelConfig';
import { NodeValue } from './NodeValue';
import { Messenger } from './Messenger';
import { HugeAtomicBitSet } from '../core/utils/paged/hugeAtomicBitSet';
import { Concurrency } from '../core/concurrency/concurrency';
import { RunWithConcurrency } from '../core/concurrency/runWithConcurrency';
import { WorkerPool } from '../core/concurrency/workerPool';
import { Partition } from '../core/utils/partition/partition';
import { PartitionUtils } from '../core/utils/partition/partitionUtils';
import { ProgressTracker } from '../core/utils/progress/tasks/progressTracker';
import { MutableInt } from '../utils/mutableInt';
import { MutableBoolean } from '../utils/mutableBoolean';
import { Optional } from '../utils/optional';
import { PartitionedComputeStep } from './PartitionedComputeStep';
import { PregelComputer } from './PregelComputer';
import { InitContext, BidirectionalInitContext } from './context/InitContext';
import { ComputeContext, BidirectionalComputeContext } from './context/ComputeContext';
import { Partitioning } from './Partitioning';

/**
 * A PregelComputer implementation that partitions the graph and distributes
 * computation across multiple threads/workers.
 */
export class PartitionedComputer<CONFIG extends PregelConfig> extends PregelComputer<CONFIG> {
  private readonly workerPool: WorkerPool;
  private readonly concurrency: Concurrency;
  private computeSteps: PartitionedComputeStep<CONFIG, any, any, any>[] = [];

  constructor(
    graph: Graph,
    computation: BasePregelComputation<CONFIG>,
    config: CONFIG,
    nodeValues: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    concurrency: Concurrency,
    workerPool: WorkerPool,
    progressTracker: ProgressTracker
  ) {
    super(graph, computation, config, nodeValues, messenger, voteBits, progressTracker);
    this.workerPool = workerPool;
    this.concurrency = concurrency;
  }

  /**
   * Initialize the computation by creating compute steps for each partition
   */
  initComputation(): void {
    this.computeSteps = this.createComputeSteps(this.voteBits);
  }

  /**
   * Initialize each compute step for a new iteration
   */
  initIteration(iteration: number): void {
    for (const computeStep of this.computeSteps) {
      computeStep.init(iteration);
    }
  }

  /**
   * Run the current iteration by executing all compute steps in parallel
   */
  runIteration(): void {
    RunWithConcurrency.builder()
      .concurrency(this.concurrency)
      .tasks(this.computeSteps)
      .executor(this.workerPool)
      .run();
  }

  /**
   * Check if the computation has converged (no messages sent and all nodes voted to halt)
   */
  hasConverged(): boolean {
    // No messages have been sent and all nodes voted to halt
    const lastIterationSendMessages = this.computeSteps
      .some(step => step.hasSentMessage());

    return !lastIterationSendMessages && this.voteBits.allSet();
  }

  /**
   * Release resources
   */
  release(): void {
    // Unlike in the sibling ForkJoinComputer, we will not shut down the
    // worker pool, since we use the shared global thread pool.
    this.computation.close();
  }

  /**
   * Create compute steps for each partition based on the partitioning strategy
   */
  private createComputeSteps(voteBits: HugeAtomicBitSet): PartitionedComputeStep<CONFIG, any, any, any>[] {
    const partitionFunction = (partition: Partition) => {
      if (this.computation instanceof BidirectionalPregelComputation) {
        return this.createBidirectionalComputeSteps(
          this.graph.concurrentCopy(), 
          voteBits, 
          partition
        );
      } else {
        return this.createComputeStep(
          this.graph.concurrentCopy(), 
          voteBits, 
          partition
        );
      }
    };

    switch (this.config.partitioning()) {
      case Partitioning.RANGE:
        return PartitionUtils.rangePartition(
          this.concurrency,
          this.graph.nodeCount(),
          partitionFunction,
          Optional.empty()
        );
      case Partitioning.DEGREE:
        return PartitionUtils.degreePartition(
          this.graph,
          this.concurrency,
          partitionFunction,
          Optional.empty()
        );
      default:
        throw new Error(`Unsupported partitioning '${this.config.partitioning()}'`);
    }
  }

  /**
   * Create a compute step for regular computations
   */
  private createComputeStep(
    graph: Graph,
    voteBits: HugeAtomicBitSet,
    partition: Partition
  ): PartitionedComputeStep<CONFIG, any, InitContext<CONFIG>, ComputeContext<CONFIG>> {
    const iteration = new MutableInt(0);
    const hasSentMessages = new MutableBoolean(false);

    const initContext = new InitContext<CONFIG>(
      graph,
      this.config,
      this.nodeValues,
      this.progressTracker
    );

    const computeContext = new ComputeContext<CONFIG>(
      graph,
      this.config,
      this.computation,
      this.nodeValues,
      this.messenger,
      voteBits,
      iteration,
      Optional.of(hasSentMessages),
      this.progressTracker
    );

    // Cast to access the specific methods
    const typedComputation = this.computation as PregelComputation<CONFIG>;

    return new PartitionedComputeStep<CONFIG, any, InitContext<CONFIG>, ComputeContext<CONFIG>>(
      (ctx: InitContext<CONFIG>) => typedComputation.init?.(ctx),
      (ctx: ComputeContext<CONFIG>, messages) => typedComputation.compute(ctx, messages),
      initContext,
      computeContext,
      partition,
      this.nodeValues,
      this.messenger,
      voteBits,
      iteration,
      hasSentMessages,
      this.progressTracker
    );
  }

  /**
   * Create a compute step for bidirectional computations
   */
  private createBidirectionalComputeSteps(
    graph: Graph,
    voteBits: HugeAtomicBitSet,
    partition: Partition
  ): PartitionedComputeStep<CONFIG, any, BidirectionalInitContext<CONFIG>, BidirectionalComputeContext<CONFIG>> {
    const iteration = new MutableInt(0);
    const hasSentMessages = new MutableBoolean(false);

    const initContext = new BidirectionalInitContext<CONFIG>(
      graph,
      this.config,
      this.nodeValues,
      this.progressTracker
    );

    const computeContext = new BidirectionalComputeContext<CONFIG>(
      graph,
      this.config,
      this.computation,
      this.nodeValues,
      this.messenger,
      voteBits,
      iteration,
      Optional.of(hasSentMessages),
      this.progressTracker
    );

    // Cast to access the specific methods
    const typedComputation = this.computation as BidirectionalPregelComputation<CONFIG>;

    return new PartitionedComputeStep<CONFIG, any, BidirectionalInitContext<CONFIG>, BidirectionalComputeContext<CONFIG>>(
      (ctx: BidirectionalInitContext<CONFIG>) => typedComputation.init?.(ctx),
      (ctx: BidirectionalComputeContext<CONFIG>, messages) => typedComputation.compute(ctx, messages),
      initContext,
      computeContext,
      partition,
      this.nodeValues,
      this.messenger,
      voteBits,
      iteration,
      hasSentMessages,
      this.progressTracker
    );
  }
}