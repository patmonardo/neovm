import { GraphStoreAddedEvent } from './GraphStoreAddedEvent';

/**
 * Listener interface for graph store added events.
 * Implementations will be notified when graphs are added to the catalog.
 */
export interface GraphStoreAddedEventListener {
  /**
   * Called when a graph store is added to the catalog.
   * 
   * @param graphStoreAddedEvent Event containing information about the added graph
   */
  onGraphStoreAdded(graphStoreAddedEvent: GraphStoreAddedEvent): void;
}