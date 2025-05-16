/**
 * Defines the capabilities of a graph store implementation.
 */
export interface Capabilities {
  /**
   * Returns the write mode of this graph store.
   */
  writeMode(): Capabilities.WriteMode;

  /**
   * Checks if this graph store can write to a local database.
   */
  canWriteToLocalDatabase?(): boolean;

  /**
   * Checks if this graph store can write to a remote database.
   */
  canWriteToRemoteDatabase?(): boolean;
}

/**
 * Static members and utilities for Capabilities.
 */
export namespace Capabilities {
  /**
   * Enum representing different write modes for graph stores.
   */
  export enum WriteMode {
    LOCAL,
    REMOTE,
    NONE
  }

  /**
   * Default implementation for canWriteToLocalDatabase.
   * Use this when an implementation doesn't provide its own method.
   *
   * @param capabilities The capabilities to check
   */
  export function canWriteToLocalDatabase(capabilities: Capabilities): boolean {
    // If the implementation has its own method, use it
    if (capabilities.canWriteToLocalDatabase) {
      return capabilities.canWriteToLocalDatabase();
    }

    // Otherwise use the default implementation
    return capabilities.writeMode() === WriteMode.LOCAL;
  }

  /**
   * Default implementation for canWriteToRemoteDatabase.
   * Use this when an implementation doesn't provide its own method.
   *
   * @param capabilities The capabilities to check
   */
  export function canWriteToRemoteDatabase(capabilities: Capabilities): boolean {
    // If the implementation has its own method, use it
    if (capabilities.canWriteToRemoteDatabase) {
      return capabilities.canWriteToRemoteDatabase();
    }

    // Otherwise use the default implementation
    return capabilities.writeMode() === WriteMode.REMOTE;
  }
}
