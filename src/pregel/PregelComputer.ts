import { Graph } from "../api/graph";
import { BasePregelComputation } from "./PregelComputation";
import { PregelConfig } from "./PregelConfig";
import { NodeValue } from "./NodeValue";
import { Messenger } from "./Messenger";
import { HugeAtomicBitSet } from "../core/utils/paged/HugeAtomicBitSet";
import { ProgressTracker } from "../core/utils/progress/tasks/progressTracker";
import { WorkerPool } from "../concurrency/workerPool";

/**
 * Abstract base class for Pregel computation engines
 */
export abstract class PregelComputer<CONFIG extends PregelConfig> {
  protected readonly graph: Graph;
  protected readonly computation: BasePregelComputation<CONFIG>;
  protected readonly config: CONFIG;
  protected readonly nodeValues: NodeValue;
  protected readonly messenger: Messenger<any>;
  protected readonly voteBits: HugeAtomicBitSet;
  protected readonly progressTracker: ProgressTracker;

  constructor(
    graph: Graph,
    computation: BasePregelComputation<CONFIG>,
    config: CONFIG,
    nodeValues: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    progressTracker: ProgressTracker
  ) {
    this.graph = graph;
    this.computation = computation;
    this.config = config;
    this.nodeValues = nodeValues;
    this.messenger = messenger;
    this.voteBits = voteBits;
    this.progressTracker = progressTracker;
  }

  /**
   * Initialize the computation before running any iterations
   */
  abstract initComputation(): void;

  /**
   * Initialize a specific iteration
   */
  abstract initIteration(iteration: number): void;

  /**
   * Run a single iteration of the Pregel algorithm
   */
  abstract runIteration(): void;

  /**
   * Check if the computation has converged
   */
  abstract hasConverged(): boolean;

  /**
   * Release any resources held by this computer
   */
  abstract release(): void;

  /**
   * Create a new builder for PregelComputer
   */
  static builder<CONFIG extends PregelConfig>(): PregelComputerBuilder<CONFIG> {
    return new PregelComputerBuilder<CONFIG>();
  }
}

/**
 * Builder for PregelComputer instances
 */
export class PregelComputerBuilder<CONFIG extends PregelConfig> {
  private _graph?: Graph;
  private _computation?: BasePregelComputation<CONFIG>;
  private _config?: CONFIG;
  private _nodeValues?: NodeValue;
  private _messenger?: Messenger<any>;
  private _voteBits?: HugeAtomicBitSet;
  private _workerPool?: WorkerPool | null;
  private _progressTracker?: ProgressTracker;

  /**
   * Set the graph to operate on
   */
  graph(graph: Graph): PregelComputerBuilder<CONFIG> {
    this._graph = graph;
    return this;
  }

  /**
   * Set the Pregel computation to run
   */
  computation(computation: BasePregelComputation<CONFIG>): PregelComputerBuilder<CONFIG> {
    this._computation = computation;
    return this;
  }

  /**
   * Set the configuration for the computation
   */
  config(config: CONFIG): PregelComputerBuilder<CONFIG> {
    this._config = config;
    return this;
  }

  /**
   * Set the node values storage
   */
  nodeValues(nodeValues: NodeValue): PregelComputerBuilder<CONFIG> {
    this._nodeValues = nodeValues;
    return this;
  }

  /**
   * Set the messenger for communication
   */
  messenger(messenger: Messenger<any>): PregelComputerBuilder<CONFIG> {
    this._messenger = messenger;
    return this;
  }

  /**
   * Set the voting bits for convergence tracking
   */
  voteBits(voteBits: HugeAtomicBitSet): PregelComputerBuilder<CONFIG> {
    this._voteBits = voteBits;
    return this;
  }

  /**
   * Set the worker pool for parallel execution
   */
  workerPool(workerPool: WorkerPool | null): PregelComputerBuilder<CONFIG> {
    this._workerPool = workerPool;
    return this;
  }

  /**
   * Set the progress tracker
   */
  progressTracker(progressTracker: ProgressTracker): PregelComputerBuilder<CONFIG> {
    this._progressTracker = progressTracker;
    return this;
  }

  /**
   * Build a PregelComputer instance
   */
  build(): PregelComputer<CONFIG> {
    if (!this._graph) throw new Error("Graph must be set");
    if (!this._computation) throw new Error("Computation must be set");
    if (!this._config) throw new Error("Config must be set");
    if (!this._nodeValues) throw new Error("NodeValues must be set");
    if (!this._messenger) throw new Error("Messenger must be set");
    if (!this._voteBits) throw new Error("VoteBits must be set");
    if (!this._progressTracker) throw new Error("ProgressTracker must be set");

    // In Java, this selects between ForkJoinComputer and PartitionedComputer
    // In our TypeScript version, we'll select between WorkerPoolComputer and SingleThreadedComputer
    if (this._config.useForkJoin() && this._workerPool) {
      return new WorkerPoolComputer<CONFIG>(
        this._graph,
        this._computation,
        this._config,
        this._nodeValues,
        this._messenger,
        this._voteBits,
        this._workerPool,
        this._progressTracker
      );
    }

    return new SingleThreadedComputer<CONFIG>(
      this._graph,
      this._computation,
      this._config,
      this._nodeValues,
      this._messenger,
      this._voteBits,
      this._progressTracker
    );
  }
}

/**
 * PregelComputer implementation using a worker pool for parallel execution
 */
export class WorkerPoolComputer<CONFIG extends PregelConfig> extends PregelComputer<CONFIG> {
  private workerPool: WorkerPool;

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
    super(graph, computation, config, nodeValues, messenger, voteBits, progressTracker);
    this.workerPool = workerPool;
  }

  initComputation(): void {
    // Implementation would distribute initialization across workers
  }

  initIteration(iteration: number): void {
    // Implementation would initialize the iteration in the pool
  }

  runIteration(): void {
    // Implementation would distribute computation across workers
  }

  hasConverged(): boolean {
    // Check if all nodes have voted to halt and no messages are pending
    return false; // Placeholder
  }

  release(): void {
    // Release any resources held
  }
}

/**
 * PregelComputer implementation using a single thread
 */
export class SingleThreadedComputer<CONFIG extends PregelConfig> extends PregelComputer<CONFIG> {
  constructor(
    graph: Graph,
    computation: BasePregelComputation<CONFIG>,
    config: CONFIG,
    nodeValues: NodeValue,
    messenger: Messenger<any>,
    voteBits: HugeAtomicBitSet,
    progressTracker: ProgressTracker
  ) {
    super(graph, computation, config, nodeValues, messenger, voteBits, progressTracker);
  }

  initComputation(): void {
    // Single-threaded initialization
  }

  initIteration(iteration: number): void {
    // Initialize the iteration
  }

  runIteration(): void {
    // Run the iteration on all nodes in a single thread
  }

  hasConverged(): boolean {
    // Check if all nodes have voted to halt and no messages are pending
    return false; // Placeholder
  }

  release(): void {
    // Release any resources held
  }
}