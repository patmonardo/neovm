import { PregelConfig } from './PregelConfig';
import { InitContext } from './context/InitContext';
import { ComputeContext } from './context/ComputeContext';
import { HugeAtomicBitSet } from '../core/utils/paged/HugeAtomicBitSet';
import { Partition } from '../core/utils/partition/Partition';
import { ProgressTracker } from '../core/utils/progress/tasks/progressTracker';
import { NodeValue } from './NodeValue';
import { Messenger } from './Messenger';
import { MessageIterator } from './Messages';
import { Messages } from './Messages';

/**
 * Represents a single compute step that processes a batch of nodes in a Pregel computation.
 */
export interface ComputeStep<
  CONFIG extends PregelConfig,
  ITERATOR extends MessageIterator,
  INIT_CONTEXT extends InitContext<CONFIG>,
  COMPUTE_CONTEXT extends ComputeContext<CONFIG>
> {
  /**
   * Get the bit set used for keeping track of node votes
   */
  voteBits(): HugeAtomicBitSet;

  /**
   * Get the init function for the computation
   */
  initFunction(): InitFunction<CONFIG, INIT_CONTEXT>;

  /**
   * Get the compute function for the computation
   */
  computeFunction(): ComputeFunction<CONFIG, COMPUTE_CONTEXT>;

  /**
   * Get the node value storage
   */
  nodeValue(): NodeValue;

  /**
   * Get the messenger for sending/receiving messages
   */
  messenger(): Messenger<ITERATOR>;

  /**
   * Get the batch of nodes to process
   */
  nodeBatch(): Partition;

  /**
   * Get the initialization context
   */
  initContext(): INIT_CONTEXT;

  /**
   * Get the compute context
   */
  computeContext(): COMPUTE_CONTEXT;

  /**
   * Get the progress tracker
   */
  progressTracker(): ProgressTracker;

  /**
   * Compute the batch of nodes
   */
  computeBatch(): void;
}

/**
 * Default implementation of computeBatch that can be used by implementing classes
 */
export function defaultComputeBatch<
  CONFIG extends PregelConfig,
  ITERATOR extends MessageIterator,
  INIT_CONTEXT extends InitContext<CONFIG>,
  COMPUTE_CONTEXT extends ComputeContext<CONFIG>
>(step: ComputeStep<CONFIG, ITERATOR, INIT_CONTEXT, COMPUTE_CONTEXT>): void {
  const messenger = step.messenger();
  const messageIterator = messenger.messageIterator();
  const messages = new Messages(messageIterator);

  const nodeBatch = step.nodeBatch();
  const initContext = step.initContext();
  const computeContext = step.computeContext();
  const voteBits = step.voteBits();
  const isInitialSuperstep = computeContext.isInitialSuperstep();

  nodeBatch.consume(nodeId => {
    if (isInitialSuperstep) {
      initContext.setNodeId(nodeId);
      step.initFunction().init(initContext);
    }
    
    // Set up context for compute function
    computeContext.setNodeId(nodeId);
    messageIterator.reset();
    
    // Process this node
    step.computeFunction().compute(computeContext, messages);
    
    step.progressTracker().logProgress();
  });
}

/**
 * Function interface for initialization logic
 */
export interface InitFunction<CONFIG extends PregelConfig, INIT_CONTEXT extends InitContext<CONFIG>> {
  /**
   * Initialize a node
   */
  init(context: INIT_CONTEXT): void;
}

/**
 * Function interface for computation logic
 */
export interface ComputeFunction<CONFIG extends PregelConfig, COMPUTE_CONTEXT extends ComputeContext<CONFIG>> {
  /**
   * Process a node with incoming messages
   */
  compute(context: COMPUTE_CONTEXT, messages: Messages): void;
}