import { ComputeStep, InitFunction, ComputeFunction } from './ComputeStep';
import { PregelConfig } from './PregelConfig';
import { InitContext } from './context/InitContext';
import { ComputeContext } from './context/ComputeContext';
import { NodeValue } from './NodeValue';
import { HugeAtomicBitSet } from '../core/utils/paged/HugeAtomicBitSet';
import { Messenger, MessageIterator } from './Messenger';
import { Partition } from '../core/utils/partition/Partition';
import { MutableInt } from '../utils/MutableInt';
import { AtomicBoolean } from '../utils/AtomicBoolean';
import { ProgressTracker } from '../core/utils/progress/tasks/ProgressTracker';
import { Messages } from './Messages';
import { BitUtil } from '../mem/BitUtil';
import { Task } from '../core/concurrency/Task';
import { TaskPool } from '../core/concurrency/TaskPool';

/**
 * TypeScript implementation of ForkJoinComputeStep
 */
export class ForkJoinComputeStep<
  CONFIG extends PregelConfig,
  ITERATOR extends MessageIterator,
  INIT_CONTEXT extends InitContext<CONFIG>,
  COMPUTE_CONTEXT extends ComputeContext<CONFIG>
> implements ComputeStep<CONFIG, ITERATOR, INIT_CONTEXT, COMPUTE_CONTEXT>, Task<void> {
  
  private static readonly SEQUENTIAL_THRESHOLD = 1000;

  private readonly initFunction: InitFunction<CONFIG, INIT_CONTEXT>;
  private readonly computeFunction: ComputeFunction<CONFIG, COMPUTE_CONTEXT>;
  private readonly initContextSupplier: () => INIT_CONTEXT;
  private readonly computeContextSupplier: () => COMPUTE_CONTEXT;
  private readonly computeContext: COMPUTE_CONTEXT;
  private readonly nodeValue: NodeValue;
  private readonly voteBits: HugeAtomicBitSet;
  private readonly messenger: Messenger<ITERATOR>;
  private nodeBatch: Partition;
  private readonly iteration: MutableInt;
  private readonly hasSentMessage: AtomicBoolean;
  private readonly progressTracker: ProgressTracker;
  
  // For task completion tracking (replaces Java's CountedCompleter)
  private readonly parent?: ForkJoinComputeStep<any, any, any, any>; 
  private pendingSubtasks = 0;
  private completed = false;
  private readonly completionCallback?: () => void;

  constructor(
    initFunction: InitFunction<CONFIG, INIT_CONTEXT>,
    computeFunction: ComputeFunction<CONFIG, COMPUTE_CONTEXT>,
    initContextSupplier: () => INIT_CONTEXT,
    computeContextSupplier: () => COMPUTE_CONTEXT,
    iteration: MutableInt,
    nodeBatch: Partition,
    nodeValue: NodeValue,
    messenger: Messenger<ITERATOR>,
    voteBits: HugeAtomicBitSet,
    parent?: ForkJoinComputeStep<any, any, any, any>,
    hasSentMessage?: AtomicBoolean,
    progressTracker?: ProgressTracker,
    completionCallback?: () => void
  ) {
    this.initFunction = initFunction;
    this.computeFunction = computeFunction;
    this.initContextSupplier = initContextSupplier;
    this.computeContextSupplier = computeContextSupplier;
    this.iteration = iteration;
    this.voteBits = voteBits;
    this.nodeBatch = nodeBatch;
    this.nodeValue = nodeValue;
    this.messenger = messenger;
    this.hasSentMessage = hasSentMessage || new AtomicBoolean(false);
    this.progressTracker = progressTracker || new NoOpProgressTracker();
    this.computeContext = computeContextSupplier();
    this.parent = parent;
    this.completionCallback = completionCallback;
  }

  // Execute the task with the possibility of dividing it further
  execute(): Promise<void> {
    return new Promise<void>(resolve => {
      // Setup completion callback
      this.completionCallback = () => resolve();
      
      // Start computation
      this.compute();
    });
  }
  
  // Core computation logic (equivalent to Java compute() method)
  compute(): void {
    // Check if we should subdivide the work
    if (this.nodeBatch.nodeCount() >= ForkJoinComputeStep.SEQUENTIAL_THRESHOLD) {
      const startNode = this.nodeBatch.startNode();
      const batchSize = this.nodeBatch.nodeCount();
      const isEven = batchSize % 2 === 0;

      const pivot = BitUtil.ceilDiv(batchSize, 2);

      // Create right batch
      const rightBatch = isEven
        ? Partition.of(startNode + pivot, startNode + batchSize)
        : Partition.of(startNode + pivot, startNode + batchSize);

      // Create left batch
      const leftBatch = Partition.of(startNode, startNode + pivot);

      // Create left task
      const leftTask = new ForkJoinComputeStep<CONFIG, ITERATOR, INIT_CONTEXT, COMPUTE_CONTEXT>(
        this.initFunction,
        this.computeFunction,
        this.initContextSupplier,
        this.computeContextSupplier,
        this.iteration,
        leftBatch,
        this.nodeValue,
        this.messenger,
        this.voteBits,
        this, // This task is parent
        this.hasSentMessage,
        this.progressTracker
      );

      // Update this task to handle only the right batch
      this.nodeBatch = rightBatch;

      // Track pending subtask
      this.pendingSubtasks++;
      
      // Submit left task to worker pool
      TaskPool.submit(leftTask);

      // Continue with right half in this task
      this.compute();
    } else {
      // Base case - process this batch sequentially
      this.computeBatch();
      
      // Update sent message flag
      if (this.computeContext.hasSentMessage()) {
        this.hasSentMessage.set(true);
      }
      
      // Mark this task as complete
      this.tryComplete();
    }
  }

  // Implementation of ComputeStep interface
  voteBits(): HugeAtomicBitSet {
    return this.voteBits;
  }

  initFunction(): InitFunction<CONFIG, INIT_CONTEXT> {
    return this.initFunction;
  }

  computeFunction(): ComputeFunction<CONFIG, COMPUTE_CONTEXT> {
    return this.computeFunction;
  }

  nodeValue(): NodeValue {
    return this.nodeValue;
  }

  messenger(): Messenger<ITERATOR> {
    return this.messenger;
  }

  nodeBatch(): Partition {
    return this.nodeBatch;
  }

  initContext(): INIT_CONTEXT {
    return this.initContextSupplier();
  }

  computeContext(): COMPUTE_CONTEXT {
    return this.computeContext;
  }

  progressTracker(): ProgressTracker {
    return this.progressTracker;
  }

  // The actual computation logic for a batch of nodes
  computeBatch(): void {
    const messenger = this.messenger();
    const messageIterator = messenger.messageIterator();
    const messages = new Messages(messageIterator);

    const nodeBatch = this.nodeBatch();
    const initContext = this.initContext();
    const computeContext = this.computeContext();
    const voteBits = this.voteBits();
    const isInitialSuperstep = computeContext.isInitialSuperstep();

    nodeBatch.consume(nodeId => {
      if (isInitialSuperstep) {
        initContext.setNodeId(nodeId);
        this.initFunction().init(initContext);
      }
      
      // Set up context for compute function
      computeContext.setNodeId(nodeId);
      messageIterator.reset();
      
      // Process this node
      this.computeFunction().compute(computeContext, messages);
      
      this.progressTracker.logProgress();
    });
  }

  // Called by child tasks when they complete
  onChildCompleted(): void {
    this.pendingSubtasks--;
    this.tryComplete();
  }

  // Try to complete this task if all subtasks are done
  private tryComplete(): void {
    if (!this.completed && this.pendingSubtasks === 0) {
      this.completed = true;
      
      // Notify parent if exists
      if (this.parent) {
        this.parent.onChildCompleted();
      } 
      // Otherwise call completion callback
      else if (this.completionCallback) {
        this.completionCallback();
      }
    }
  }
}

/**
 * A TaskPool that manages the execution of parallel tasks
 * This is a simplified version - a real implementation would use Worker threads
 */
export class TaskPool {
  // In a real implementation, this would manage worker threads
  // For simplicity, we're using a simple Promise-based approach
  static submit(task: Task<any>): Promise<any> {
    // In a real implementation, this would dispatch to actual worker threads
    // For now, just execute the task after a small delay to simulate async behavior
    return new Promise(resolve => {
      setTimeout(() => {
        task.execute().then(resolve);
      }, 0);
    });
  }
}

/**
 * Interface for tasks that can be submitted to the task pool
 */
export interface Task<T> {
  execute(): Promise<T>;
}

/**
 * A no-op progress tracker implementation
 */
class NoOpProgressTracker implements ProgressTracker {
  logProgress(): void {}
  // Implement other required methods
}