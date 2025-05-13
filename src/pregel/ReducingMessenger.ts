import { Messenger, AbstractMessenger } from "./Messenger";
import { MessageIterator } from "./Messages";
import { Reducer } from "./Reducer";
import { HugeObjectArray } from "../collections/ha/HugeObjectArray";
import { HugeDoubleArray } from "../collections/ha/HugeDoubleArray";
import { HugeLongArray } from "../collections/ha/HugeLongArray";

/**
 * A message iterator for reduced messages
 */
export class ReducingMessageIterator implements MessageIterator {
  private hasMessage: boolean = false;
  private message: number = 0;
  private messageRead: boolean = false;

  /**
   * Reset the iterator
   */
  reset(): void {
    this.messageRead = false;
  }

  /**
   * Check if the iterator has messages
   */
  hasNext(): boolean {
    return this.hasMessage && !this.messageRead;
  }

  /**
   * Get the next message value
   */
  next(): number {
    if (!this.hasNext()) {
      throw new Error("No more messages");
    }
    this.messageRead = true;
    return this.message;
  }

  /**
   * Check if there are any messages
   */
  isEmpty(): boolean {
    return !this.hasMessage;
  }

  /**
   * Set the message value
   */
  setMessage(hasMessage: boolean, message: number): void {
    this.hasMessage = hasMessage;
    this.message = message;
    this.messageRead = false;
  }
}

/**
 * A messenger that combines multiple messages sent to the same target node
 * using a reducer.
 */
export class ReducingMessenger extends AbstractMessenger<ReducingMessageIterator> {
  // Stores the current iteration's reduced message for each node
  private readonly currentMessages: HugeDoubleArray;
  // Tracks whether a node has a message
  private readonly hasMessage: HugeObjectArray<boolean>;
  // For sender tracking
  private readonly trackSender: boolean;
  private readonly senders?: HugeLongArray;
  // Reducer used to combine messages
  private readonly reducer: Reducer;

  constructor(
    nodeCount: number,
    reducer: Reducer,
    trackSender: boolean = false
  ) {
    super();
    this.currentMessages = HugeDoubleArray.newArray(nodeCount);
    this.hasMessage = HugeObjectArray.newArray<boolean>(nodeCount);

    if (trackSender) {
      this.senders = HugeLongArray.newArray(nodeCount);
      this.trackSender = true;
    } else {
      this.trackSender = false;
    }

    this.reducer = reducer;
  }

  /**
   * Initialize for a new iteration
   */
  initIteration(iteration: number): void {
    // No initialization needed between iterations
    // Messages are cleared as they are consumed
  }

  /**
   * Send a message from source to target node
   */
  sendTo(sourceNodeId: number, targetNodeId: number, message: number): void {
    if (this.hasMessage.get(targetNodeId)) {
      // Combine with existing message
      const currentValue = this.currentMessages.get(targetNodeId);
      this.currentMessages.set(
        targetNodeId,
        this.reducer.reduce(currentValue, message)
      );

      // Update sender if tracking and this is a new min/max value
      if (this.trackSender) {
        const updatedValue = this.currentMessages.get(targetNodeId);
        if (updatedValue === message) {
          this.senders!.set(targetNodeId, sourceNodeId);
        }
      }
    } else {
      // First message for this target
      this.currentMessages.set(targetNodeId, message);
      this.hasMessage.set(targetNodeId, true);

      // Set sender if tracking
      if (this.trackSender) {
        this.senders!.set(targetNodeId, sourceNodeId);
      }
    }
  }

  /**
   * Create a new message iterator
   */
  messageIterator(): ReducingMessageIterator {
    return new ReducingMessageIterator();
  }

  /**
   * Initialize a message iterator for a specific node
   */
  initMessageIterator(
    messageIterator: ReducingMessageIterator,
    nodeId: number,
    isFirstIteration: boolean
  ): void {
    // In first iteration, messages are ignored since no messages have been sent yet
    if (isFirstIteration) {
      messageIterator.setMessage(false, 0);
      return;
    }

    // Set message and mark as consumed
    const hasMessage = this.hasMessage.get(nodeId);
    if (hasMessage) {
      messageIterator.setMessage(true, this.currentMessages.get(nodeId));
      // Clear the message after it's been read
      this.hasMessage.set(nodeId, false);
    } else {
      messageIterator.setMessage(false, 0);
    }
  }

  /**
   * Get the sender of the message for a node
   */
  sender(nodeId: number): number | undefined {
    if (!this.trackSender) {
      return undefined;
    }

    return this.hasMessage.get(nodeId) ? this.senders!.get(nodeId) : undefined;
  }

  /**
   * Release resources
   */
  release(): void {
    // Clean up arrays (in a real implementation, this would release memory)
  }
}

/**
 * Factory for creating reducing messengers
 */
export class ReducingMessengers {
  /**
   * Create a reducing messenger
   */
  static create(
    nodeCount: number,
    reducer: Reducer,
    trackSender: boolean = false
  ): Messenger<ReducingMessageIterator> {
    return new ReducingMessenger(nodeCount, reducer, trackSender);
  }
}
