import { MutableBoolean } from '../utils/mutableBoolean';
import { MutableInt } from '../utils/mutableInt';
import { ComputeContext } from './context/ComputeContext';
import { InitContext } from './context/InitContext';
import { HugeAtomicBitSet } from '../core/utils/paged/hugeAtomicBitSet';
import { Partition } from '../core/utils/partition/partition';
import { ProgressTracker } from '../core/utils/progress/tasks/progressTracker';
import { PregelConfig } from './PregelConfig';
import { NodeValue } from './NodeValue';
import { Messenger } from './Messenger';
import { MessageIterator } from './Messages';
import { Messages } from './Messages';
import { ComputeStep, InitFunction, ComputeFunction } from './ComputeStep';

/**
 * Single-threaded implementation of a compute step that processes a partition of nodes
 */
export class PartitionedComputeStep<
  CONFIG extends PregelConfig,
  ITERATOR extends MessageIterator,
  INIT_CONTEXT extends InitContext<CONFIG>,
  COMPUTE_CONTEXT extends ComputeContext<CONFIG>
> implements ComputeStep<CONFIG, ITERATOR, INIT_CONTEXT, COMPUTE_CONTEXT> {

  private readonly initFunction: InitFunction<CONFIG, INIT_CONTEXT>;
  private readonly computeFunction: ComputeFunction<CONFIG, COMPUTE_CONTEXT>;
  private readonly initContext: INIT_CONTEXT;
  private readonly computeContext: COMPUTE_CONTEXT;
  private readonly progressTracker: ProgressTracker;
  private readonly nodeBatch: Partition;
  private readonly voteBits: HugeAtomicBitSet;
  private readonly messenger: Messenger<ITERATOR>;

  private readonly iteration: MutableInt;
  private readonly hasSentMessage: MutableBoolean;
  private readonly nodeValue: NodeValue;

  constructor(
    initFunction: InitFunction<CONFIG, INIT_CONTEXT>,
    computeFunction: ComputeFunction<CONFIG, COMPUTE_CONTEXT>,
    initContext: INIT_CONTEXT,
    computeContext: COMPUTE_CONTEXT,
    nodeBatch: Partition,
    nodeValue: NodeValue,
    messenger: Messenger<ITERATOR>,
    voteBits: HugeAtomicBitSet,
    iteration: MutableInt,
    hasSentMessage: MutableBoolean,
    progressTracker: ProgressTracker
  ) {
    this.initFunction = initFunction;
    this.computeFunction = computeFunction;
    this.initContext = initContext;
    this.computeContext = computeContext;
    this.nodeValue = nodeValue;
    this.voteBits = voteBits;
    this.nodeBatch = nodeBatch;
    this.messenger = messenger;
    this.progressTracker = progressTracker;
    this.iteration = iteration;
    this.hasSentMessage = hasSentMessage;
  }

  /**
   * Run this compute step (equivalent to Java's Runnable.run())
   */
  run(): void {
    this.computeBatch();
  }

  /**
   * Implementation of ComputeStep interface
   */
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
    return this.initContext;
  }

  computeContext(): COMPUTE_CONTEXT {
    return this.computeContext;
  }

  progressTracker(): ProgressTracker {
    return this.progressTracker;
  }

  /**
   * Initialize this step for a new iteration
   */
  init(iteration: number): void {
    this.iteration.setValue(iteration);
    this.hasSentMessage.setValue(false);
  }

  /**
   * Check if any messages were sent during this step
   */
  hasSentMessage(): boolean {
    return this.hasSentMessage.getValue();
  }

  /**
   * Process the node batch
   * This implementation comes from the default method in ComputeStep
   */
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
      
      // Check if we sent any messages
      if (computeContext.hasSentMessage()) {
        this.hasSentMessage.setValue(true);
      }

      this.progressTracker.logProgress();
    });
  }
}

/**
 * Implementation of MutableBoolean
 */
class MutableBooleanImpl implements MutableBoolean {
  private value: boolean;

  constructor(initialValue: boolean = false) {
    this.value = initialValue;
  }

  setValue(value: boolean): void {
    this.value = value;
  }

  getValue(): boolean {
    return this.value;
  }

  toBoolean(): boolean {
    return this.value;
  }
}