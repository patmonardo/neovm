import { GraphStoreRemovedEvent } from './GraphStoreRemovedEvent';

/**
 * Listener interface for graph store removed events.
 * Implementations will be notified when graphs are removed from the catalog.
 */
export interface GraphStoreRemovedEventListener {
  /**
   * Called when a graph store is removed from the catalog.
   * 
   * @param graphStoreRemovedEvent Event containing information about the removed graph
   */
  onGraphStoreRemoved(graphStoreRemovedEvent: GraphStoreRemovedEvent): void;
}