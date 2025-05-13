import { PregelConfig } from './PregelConfig';
import { PregelSchema } from './PregelSchema';
import { MessageReducer } from './Messages';
import { MasterComputeContext } from './context/MasterComputeContext';

/**
 * Base interface for all Pregel computations.
 * This defines the common functionality that all Pregel algorithm implementations must provide.
 * 
 * @typeParam CONFIG - The configuration type for this computation
 */
export interface BasePregelComputation<CONFIG extends PregelConfig> {
  
  /**
   * Returns the schema for this computation, defining which properties will be stored for each node.
   * 
   * @param config The algorithm configuration
   * @returns A PregelSchema defining the node properties
   */
  schema(config: CONFIG): PregelSchema;
  
  /**
   * Optional master compute step that is executed after each iteration.
   * Unlike the regular compute() method which runs per-node, this runs once per superstep.
   * It can be used for global computations, convergence checks, or statistics gathering.
   * 
   * @param context Context for the master compute step
   * @returns True if the computation should terminate, false to continue
   */
  masterCompute?(context: MasterComputeContext<CONFIG>): boolean;
  
  /**
   * Returns an optional message reducer that can combine multiple messages 
   * sent to the same target node into a single message.
   * 
   * @returns A message reducer implementation or undefined if no reduction is needed
   */
  reducer?(): MessageReducer<any>;
  
  /**
   * Cleanup any resources used by this computation.
   * Called when the Pregel computation is finished.
   */
  close?(): void;
}

/**
 * Base class for Pregel computation implementations that provides default behavior.
 */
export abstract class AbstractBasePregelComputation<CONFIG extends PregelConfig> 
  implements BasePregelComputation<CONFIG> {
  
  /**
   * Implementing classes must define the node schema
   */
  abstract schema(config: CONFIG): PregelSchema;
  
  /**
   * Default implementation of masterCompute always continues
   */
  masterCompute(context: MasterComputeContext<CONFIG>): boolean {
    return false; // Don't terminate
  }
  
  /**
   * Default implementation returns no reducer
   */
  reducer(): MessageReducer<any> | undefined {
    return undefined;
  }
  
  /**
   * Default implementation does nothing on close
   */
  close(): void {
    // No resources to clean up
  }
}