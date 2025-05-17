import { LicenseState } from "./LicenseState";
import { IdMapBehavior } from "./IdMapBehavior";
import { IdMapBehaviorFactory } from "./IdMapBehaviorFactory";
import { OpenGdsIdMapBehavior } from "./OpenGdsIdMapBehavior";

/**
 * A factory for creating OpenGdsIdMapBehavior instances.
 *
 * The `@ServiceProvider` annotation in the Java version indicates that this class
 * is intended to be discoverable via Java's ServiceLoader mechanism as an
 * implementation of IdMapBehaviorFactory. In a TypeScript environment,
 * if a similar service discovery is needed, it would typically be handled
 * by a dependency injection framework or a manual registration process.
 */
export class OpenGdsIdMapBehaviorFactory implements IdMapBehaviorFactory {
  /**
   * Creates a new instance of OpenGdsIdMapBehavior.
   * The licenseState parameter is ignored in this specific implementation.
   *
   * @param licenseState The current license state (unused in this factory).
   * @returns A new OpenGdsIdMapBehavior instance.
   */
  public create(licenseState: LicenseState): IdMapBehavior {
    // The licenseState parameter is present to match the interface,
    // but this specific factory implementation does not use it.
    return new OpenGdsIdMapBehavior();
  }

  /**
   * Returns the priority of this factory.
   * For OpenGDS, this is typically a default or baseline priority.
   *
   * @returns The priority value (0 for this factory).
   */
  public priority(): number {
    return 0;
  }
}

// How this might be used in a system that mimics ServiceLoader:
//
// If you have a central registry for IdMapBehaviorFactory providers:
//
// interface FactoryRegistry {
//   register(factory: IdMapBehaviorFactory): void;
//   getBehavior(licenseState: LicenseState): IdMapBehavior;
// }
//
// const registry: FactoryRegistry = {
//   providers: [] as IdMapBehaviorFactory[],
//   register(factory: IdMapBehaviorFactory) {
//     this.providers.push(factory);
//     this.providers.sort((a, b) => b.priority() - a.priority()); // Sort by priority (descending)
//   },
//   getBehavior(licenseState: LicenseState): IdMapBehavior {
//     if (this.providers.length === 0) {
//       throw new Error("No IdMapBehaviorFactory providers registered.");
//     }
//     // For simplicity, using the highest priority one.
//     // A real system might iterate and find the first suitable one.
//     return this.providers[0].create(licenseState);
//   }
// };
//
// // During application setup:
// registry.register(new OpenGdsIdMapBehaviorFactory());
// // registry.register(new SomeOtherIdMapBehaviorFactory()); // if other factories exist
//
// // Later:
// // const behavior = registry.getBehavior(currentLicenseState);
