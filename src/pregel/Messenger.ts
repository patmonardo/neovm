import { MessageIterator } from './Messages';

/**
 * Interface for message passing between nodes in a Pregel computation.
 * Handles sending messages between nodes and providing iterators for received messages.
 * 
 * @typeParam ITERATOR - The type of message iterator returned by this messenger
 */
export interface Messenger<ITERATOR extends MessageIterator> {
  /**
   * Initialize the messenger for a new iteration
   * 
   * @param iteration The iteration number to initialize
   */
  initIteration(iteration: number): void;
  
  /**
   * Send a message from a source node to a target node
   * 
   * @param sourceNodeId The ID of the node sending the message
   * @param targetNodeId The ID of the node receiving the message
   * @param message The message value to send
   */
  sendTo(sourceNodeId: number, targetNodeId: number, message: number): void;
  
  /**
   * Get a message iterator for reuse
   * 
   * @returns A message iterator instance
   */
  messageIterator(): ITERATOR;
  
  /**
   * Initialize a message iterator for a specific node
   * 
   * @param messageIterator The iterator to initialize
   * @param nodeId The node ID to get messages for
   * @param isFirstIteration Whether this is the first iteration
   */
  initMessageIterator(messageIterator: ITERATOR, nodeId: number, isFirstIteration: boolean): void;
  
  /**
   * Get the sender of the latest message for a node, if sender tracking is enabled
   * 
   * @param nodeId The ID of the node to get the sender for
   * @returns The sender node ID or undefined if not available
   */
  sender?(nodeId: number): number | undefined;
  
  /**
   * Release resources used by this messenger
   */
  release(): void;
}

/**
 * Abstract base implementation of Messenger with common functionality
 */
export abstract class AbstractMessenger<ITERATOR extends MessageIterator> implements Messenger<ITERATOR> {
  /**
   * Initialize the messenger for a new iteration
   */
  abstract initIteration(iteration: number): void;
  
  /**
   * Send a message from a source node to a target node
   */
  abstract sendTo(sourceNodeId: number, targetNodeId: number, message: number): void;
  
  /**
   * Get a message iterator for reuse
   */
  abstract messageIterator(): ITERATOR;
  
  /**
   * Initialize a message iterator for a specific node
   */
  abstract initMessageIterator(messageIterator: ITERATOR, nodeId: number, isFirstIteration: boolean): void;
  
  /**
   * Default implementation returns undefined (no sender tracking)
   */
  sender(nodeId: number): number | undefined {
    return undefined;
  }
  
  /**
   * Default implementation does nothing
   */
  release(): void {
    // No resources to release by default
  }
}