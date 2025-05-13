/**
 * Interface for objects that can rename the current thread/worker.
 * This is useful for debugging and logging to identify which component
 * is performing an operation.
 */
export interface RenamesCurrentThread {
  /**
   * Returns the name to use for the current thread when executing operations.
   * 
   * @returns The thread name to use
   */
  threadName(): string;
}

export namespace RenamesCurrentThread {
  /**
   * Interface for objects that can revert a thread name change.
   * The `close` method should be called when the temporary name is no longer needed.
   */
  export interface Revert {
    /**
     * Reverts the thread name change.
     */
    close(): void;
  }

  /**
   * Thread name storage - in browsers this is stored in a global variable,
   * in Node.js workers it would be stored in thread-local storage.
   */
  const threadNameStorage = {
    current: typeof self !== 'undefined' && 'name' in self ? self.name : 'main'
  };

  /**
   * An empty revert implementation that does nothing.
   */
  export const EMPTY: Revert = { close: () => {} };

  /**
   * Renames the current thread/worker to the specified name.
   * 
   * @param newThreadName The new name for the current thread/worker
   * @returns A Revert object that can be used to restore the original name
   */
  export function renameThread(newThreadName: string): Revert {
    const oldThreadName = threadNameStorage.current;

    // Don't rename if the new name is the same as the current name
    if (oldThreadName === newThreadName) {
      return EMPTY;
    }

    let renamed = false;
    try {
      // If running in a worker with a name property, try to set it
      if (typeof self !== 'undefined' && 'name' in self) {
        self.name = newThreadName;
      }
      
      // Store the current name in our thread-local storage
      threadNameStorage.current = newThreadName;
      renamed = true;
    } catch (e) {
      // Failed to rename thread, proceed as usual
      console.debug(`Failed to rename thread: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (renamed) {
      return {
        close: () => {
          // Restore the original name
          threadNameStorage.current = oldThreadName;
          if (typeof self !== 'undefined' && 'name' in self) {
            self.name = oldThreadName;
          }
        }
      };
    }
    
    return EMPTY;
  }

  /**
   * Gets the current thread/worker name.
   * 
   * @returns The current thread name
   */
  export function getCurrentThreadName(): string {
    return threadNameStorage.current;
  }

  /**
   * Executes a function with a temporary thread name and automatically
   * reverts to the original name when finished.
   * 
   * @param name The temporary thread name
   * @param fn The function to execute
   * @returns The result of the function
   */
  export function withThreadName<T>(name: string, fn: () => T): T {
    const revert = renameThread(name);
    try {
      return fn();
    } finally {
      revert.close();
    }
  }

  /**
   * Executes an async function with a temporary thread name and automatically
   * reverts to the original name when finished.
   * 
   * @param name The temporary thread name
   * @param fn The async function to execute
   * @returns A Promise resolving to the result of the function
   */
  export async function withThreadNameAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const revert = renameThread(name);
    try {
      return await fn();
    } finally {
      revert.close();
    }
  }
}

/**
 * Base class that provides thread renaming functionality.
 * Classes that need to rename threads can extend this.
 */
export abstract class ThreadRenamingSupport implements RenamesCurrentThread {
  /**
   * Returns a name for the current thread based on the class name and instance identity.
   * 
   * @returns A name for the current thread
   */
  threadName(): string {
    return `${this.constructor.name}-${this.getInstanceId()}`;
  }

  /**
   * Gets a unique ID for this instance.
   * In JavaScript we don't have System.identityHashCode, so we use a Symbol.
   * 
   * @returns A string representation of the instance identity
   */
  private getInstanceId(): string {
    if (!this._instanceId) {
      this._instanceId = Symbol("instanceId");
    }
    return this._instanceId.toString().slice(7, -1); // Remove 'Symbol(' and ')'
  }

  private _instanceId?: Symbol;

  /**
   * Renames the current thread to this object's thread name.
   * 
   * @returns A Revert object that can be used to restore the original name
   */
  protected renameToThreadName(): RenamesCurrentThread.Revert {
    return RenamesCurrentThread.renameThread(this.threadName());
  }
}