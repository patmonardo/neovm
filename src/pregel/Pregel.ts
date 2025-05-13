import { immerable } from "immer";
import { Graph } from "../api/graph";
import { ValueType } from "../api/valueType";
import { MasterComputeContext } from "./context/MasterComputeContext";
import { HugeAtomicBitSet } from "../core/utils/paged/hugeAtomicBitSet";
import { ProgressTracker } from "../core/utils/progress/tasks/progressTracker";
import { Task } from "../core/utils/progress/tasks/task";
import { Tasks } from "../core/utils/progress/tasks/tasks";
import { PregelComputer, PregelComputerBuilder } from "./PregelComputer";
import { BasePregelComputation, BidirectionalPregelComputation } from "./PregelComputation";
import { PregelConfig } from "./PregelConfig";
import { NodeValue } from "./NodeValue";
import { Messenger } from "./Messenger";
import { AsyncQueueMessenger } from "./AsyncQueueMessenger";
import { SyncQueueMessenger } from "./SyncQueueMessenger";
import { ReducingMessenger } from "./ReducingMessenger";
import { TerminationFlag } from "../termination/terminationFlag";
import { PregelResult } from "./PregelResult";
import { WorkerPool } from "../core/concurrency/workerPool";

export class Pregel<CONFIG extends PregelConfig> {
  private readonly config: CONFIG;
  private readonly computation: BasePregelComputation<CONFIG>;
  private readonly graph: Graph;
  private readonly nodeValues: NodeValue;
  private readonly messenger: Messenger<any>;
  private readonly computer: PregelComputer<CONFIG>;
  private readonly progressTracker: ProgressTracker;
  private terminationFlag: TerminationFlag;
  private readonly workerPool: WorkerPool;

  /**
   * @deprecated Use the variant that properly injects the termination flag instead
   */
  public static create<CONFIG extends PregelConfig>(
    graph: Graph,
    config: CONFIG,
    computation: BasePregelComputation<CONFIG>,
    workerPool: WorkerPool,
    progressTracker: ProgressTracker
  ): Pregel<CONFIG> {
    return this.createWithTermination(
      graph, 
      config, 
      computation, 
      workerPool, 
      progressTracker, 
      TerminationFlag.RUNNING_TRUE
    );
  }

  public static createWithTermination<CONFIG extends PregelConfig>(
    graph: Graph,
    config: CONFIG,
    computation: BasePregelComputation<CONFIG>,
    workerPool: WorkerPool,
    progressTracker: ProgressTracker,
    terminationFlag: TerminationFlag
  ): Pregel<CONFIG> {
    // Validate config (simplified from Java version)
    if (config.concurrency() <= 0) {
      throw new Error("Concurrency must be greater than 0");
    }

    // Check for bidirectional computation requirements
    if (
      computation instanceof BidirectionalPregelComputation && 
      !graph.characteristics().isInverseIndexed()
    ) {
      throw new Error(
        `The Pregel algorithm ${computation.constructor.name} requires inverse indexes ` +
        `for all configured relationships ${config.relationshipTypes().join(', ')}`
      );
    }

    return new Pregel<CONFIG>(
      graph,
      config,
      computation,
      NodeValue.of(computation.schema(config), graph.nodeCount(), config.concurrency()),
      workerPool,
      progressTracker,
      terminationFlag
    );
  }

  public static memoryEstimation(
    propertiesMap: Record<string, ValueType>,
    isQueueBased: boolean,
    isAsync: boolean,
    isTrackingSender: boolean = false
  ): any {
    // Memory estimation is very different in TS/JS than in Java
    // This would need a custom implementation approach
    console.warn("Memory estimation not fully implemented in TypeScript version");
    
    return {
      type: "Pregel memory estimation",
      properties: propertiesMap,
      isQueueBased,
      isAsync,
      isTrackingSender
    };
  }

  public static progressTask<CONFIG extends PregelConfig>(
    graph: Graph, 
    config: CONFIG, 
    taskName?: string
  ): Task {
    const name = taskName ?? config.constructor.name.replace(
      /(Mutate|Stream|Write|Stats)*Config/,
      ""
    );
    
    return Tasks.iterativeDynamic(
      name,
      () => [
        Tasks.leaf("Compute iteration", graph.nodeCount()),
        Tasks.leaf("Master compute iteration", graph.nodeCount())
      ],
      config.maxIterations()
    );
  }

  private constructor(
    graph: Graph,
    config: CONFIG,
    computation: BasePregelComputation<CONFIG>,
    initialNodeValue: NodeValue,
    workerPool: WorkerPool,
    progressTracker: ProgressTracker,
    terminationFlag: TerminationFlag
  ) {
    this.graph = graph;
    this.config = config;
    this.computation = computation;
    this.nodeValues = initialNodeValue;
    this.workerPool = workerPool;
    this.progressTracker = progressTracker;
    this.terminationFlag = terminationFlag;

    // Determine which messenger to use
    const reducer = computation.reducer?.();
    
    if (reducer) {
      this.messenger = ReducingMessenger.create(graph, config, reducer);
    } else if (config.isAsynchronous()) {
      this.messenger = new AsyncQueueMessenger(graph.nodeCount());
    } else {
      this.messenger = new SyncQueueMessenger(graph.nodeCount());
    }

    // Create computer
    // Note: Fork/Join is a Java concept, in TS we use our worker pool
    const useWorkerThreads = config.useForkJoin() && workerPool.size() > 1;
    
    this.computer = new PregelComputerBuilder<CONFIG>()
      .graph(graph)
      .computation(computation)
      .config(config)
      .nodeValues(nodeValues)
      .messenger(this.messenger)
      .voteBits(HugeAtomicBitSet.create(graph.nodeCount()))
      .workerPool(useWorkerThreads ? workerPool : null)
      .progressTracker(progressTracker)
      .build();
  }

  public setTerminationFlag(terminationFlag: TerminationFlag): void {
    this.terminationFlag = terminationFlag;
  }

  public run(): PregelResult {
    let didConverge = false;
    
    this.computer.initComputation();

    try {
      this.progressTracker.beginSubTask();

      let iteration = 0;
      for (; iteration < this.config.maxIterations(); iteration++) {
        this.terminationFlag.assertRunning();
        this.progressTracker.beginSubTask();

        this.computer.initIteration(iteration);
        this.messenger.initIteration(iteration);
        this.computer.runIteration();

        this.progressTracker.endSubTask();
        this.progressTracker.beginSubTask();

        didConverge = this.runMasterComputeStep(iteration) || this.computer.hasConverged();
        this.progressTracker.endSubTask();

        if (didConverge) {
          break;
        }
      }
      
      return {
        nodeValues: this.nodeValues,
        didConverge,
        ranIterations: iteration
      };
    } finally {
      this.progressTracker.endSubTask();
      this.computer.release();
    }
  }

  public release(): void {
    this.progressTracker.release();
    this.messenger.release();
  }

  private runMasterComputeStep(iteration: number): boolean {
    const context = new MasterComputeContext<CONFIG>(
      this.config,
      this.graph,
      iteration,
      this.nodeValues,
      this.workerPool,
      this.progressTracker
    );
    
    return this.computation.masterCompute(context);
  }
}