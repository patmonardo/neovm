import { IdMapBehavior } from "./IdMapBehavior"; // Adjust path as needed
import { OpenGdsIdMapBehavior } from "./OpenGdsIdMapBehavior"; // Adjust path as needed - this is the default implementation

/**
 * Provides a global access point for an IdMapBehavior instance.
 * This allows for a default IdMapBehavior to be set and potentially overridden.
 */
export class IdMapBehaviorServiceProvider {
  /**
   * The singleton instance of IdMapBehavior.
   * Initialized with a default behavior.
   */
  private static instance: IdMapBehavior = new OpenGdsIdMapBehavior();

  /**
   * Private constructor to prevent direct instantiation of this service provider class.
   */
  private constructor() {}

  /**
   * Overrides the current global IdMapBehavior instance.
   *
   * @param idMapBehavior The new IdMapBehavior instance to set.
   */
  public static setIdMapBehavior(idMapBehavior: IdMapBehavior): void {
    IdMapBehaviorServiceProvider.instance = idMapBehavior;
  }

  /**
   * Retrieves the current global IdMapBehavior instance.
   *
   * @returns The current IdMapBehavior instance.
   */
  public static getIdMapBehavior(): IdMapBehavior {
    return IdMapBehaviorServiceProvider.instance;
  }

  /**
   * Resets the IdMapBehavior instance to the default OpenGdsIdMapBehavior.
   * Useful for testing or re-initializing to a known state.
   */
  public static resetToDefault(): void {
    IdMapBehaviorServiceProvider.instance = new OpenGdsIdMapBehavior();
  }
}

// Example of how it might be used:
//
// // Get the current behavior
// const currentBehavior = IdMapBehaviorServiceProvider.getIdMapBehavior();
//
// // If you have a custom behavior (e.g., for testing or a different GDS edition)
// class MyCustomIdMapBehavior implements IdMapBehavior {
//   // ... implementation ...
//   create(concurrency: any, maxOriginalId?: number, nodeCount?: number): any { throw new Error("Method not implemented."); }
//   memoryEstimation(): any { throw new Error("Method not implemented."); }
// }
// IdMapBehaviorServiceProvider.setIdMapBehavior(new MyCustomIdMapBehavior());
//
// // Reset to default if needed
// IdMapBehaviorServiceProvider.resetToDefault();
