import { BasePregelComputation } from './BasePregelComputation';
import { PregelConfig } from './PregelConfig';
import { BidirectionalInitContext } from './context/InitContext';
import { BidirectionalComputeContext } from './context/ComputeContext';
import { Messages } from './Messages';

/**
 * Main interface to express user-defined logic using the
 * Pregel framework. An algorithm is expressed using a
 * node-centric view. A node can receive messages from
 * other nodes, change its state and send messages to other
 * nodes in each iteration (superstep).
 *
 * In contrast to PregelComputation, this interface ensures and grants access
 * to the inverse index of each configured relationship type.
 *
 * @see Pregel
 * @see https://kowshik.github.io/JPregel/pregel_paper.pdf
 */
export interface BidirectionalPregelComputation<C extends PregelConfig> extends BasePregelComputation<C> {
    
    /**
     * The init method is called in the beginning of the first
     * superstep (iteration) of the Pregel computation and allows
     * initializing node values.
     * 
     * The context parameter provides access to node properties of
     * the in-memory graph and the algorithm configuration.
     */
    init?(context: BidirectionalInitContext<C>): void;
    
    /**
     * The compute method is called individually for each node
     * in every superstep as long as the node receives messages
     * or has not voted to halt yet.
     * 
     * Since a Pregel computation is state-less, a node can only
     * communicate with other nodes via messages. In each super-
     * step, a node receives messages via the input parameter
     * and can send new messages via the context parameter.
     * Messages can be sent to neighbor nodes, outgoing and incoming, or any node if the
     * identifier is known.
     */
    compute(context: BidirectionalComputeContext<C>, messages: Messages): void;
}

/**
 * Base class for implementing bidirectional Pregel computations.
 * Provides an empty default implementation of the init method.
 */
export abstract class AbstractBidirectionalPregelComputation<C extends PregelConfig> 
    implements BidirectionalPregelComputation<C> {
    
    /**
     * Default empty implementation of init
     */
    init(context: BidirectionalInitContext<C>): void {
        // Default empty implementation
    }
    
    /**
     * Implementing classes must override this method
     */
    abstract compute(context: BidirectionalComputeContext<C>, messages: Messages): void;
    
    /**
     * Implementing classes must define a schema
     */
    abstract schema(config: C): any;
    
    /**
     * Default implementation of masterCompute always continues
     */
    masterCompute(context: any): boolean {
        return false; // Don't terminate
    }
    
    /**
     * Default implementation returns no reducer
     */
    reducer(): any {
        return undefined;
    }
    
    /**
     * Default implementation does nothing on close
     */
    close(): void {
        // No resources to clean up
    }
}