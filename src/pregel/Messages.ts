/**
 * Iterator for messages in the Pregel computation.
 * Provides iteration over double values with optional sender tracking.
 */
export interface MessageIterator {
  /**
   * Check if there are more messages to iterate over
   */
  hasNext(): boolean;
  
  /**
   * Get the next message value
   * @throws Error if no more elements
   */
  next(): number;
  
  /**
   * Reset the iterator to start from the beginning
   */
  reset(): void;
  
  /**
   * Check if the message collection is empty
   */
  isEmpty(): boolean;
  
  /**
   * Get the sender of the current message, if sender tracking is enabled
   * @returns The sender node ID or undefined if not available
   */
  sender?(): number | undefined;
}

/**
 * Collection of messages received by a node during a Pregel superstep.
 * Provides iteration over message values.
 */
export class Messages implements Iterable<number> {
  private readonly iterator: MessageIterator;
  
  /**
   * Create a new Messages instance wrapping a message iterator
   */
  constructor(iterator: MessageIterator) {
    this.iterator = iterator;
  }
  
  /**
   * Get an iterator for the messages (implements Iterable interface)
   */
  [Symbol.iterator](): Iterator<number> {
    // Create an adapter that converts our MessageIterator to a standard Iterator
    return {
      next: () => {
        if (this.iterator.hasNext()) {
          return { 
            value: this.iterator.next(), 
            done: false 
          };
        } else {
          return { 
            value: undefined as any, 
            done: true 
          };
        }
      }
    };
  }
  
  /**
   * Get the raw message iterator for primitive iteration
   */
  doubleIterator(): MessageIterator {
    return this.iterator;
  }
  
  /**
   * Check if there are any messages
   */
  isEmpty(): boolean {
    return this.iterator.isEmpty();
  }
  
  /**
   * If the computation defined a Reducer, this method will
   * return the sender of the aggregated message. Depending on the reducer implementation, the
   * sender is deterministically defined by the reducer, e.g., for Max or Min. In any other case,
   * the sender will be one of the node ids that sent messages to that node.
   * 
   * Note, that PregelConfig.trackSender() must return true to enable sender tracking.
   *
   * @returns The sender of an aggregated message or undefined if no reducer is defined
   * or sender tracking is disabled
   */
  sender(): number | undefined {
    return this.iterator.sender ? this.iterator.sender() : undefined;
  }
}