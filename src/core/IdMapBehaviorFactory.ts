import { LicenseState } from "../LicenseState"; // Adjust path as needed
import { IdMapBehavior } from "./IdMapBehavior";   // Adjust path as needed

/**
 * A factory for creating IdMapBehavior instances.
 * The `@Service` annotation from Java suggests this is likely a component
 * managed by a dependency injection or service locator framework,
 * where multiple implementations might exist and be chosen based on priority.
 */
export interface IdMapBehaviorFactory {
  /**
   * Creates an IdMapBehavior instance.
   * The specific behavior might depend on the provided license state.
   *
   * @param licenseState The current license state of the GDS library.
   * @returns An IdMapBehavior instance.
   */
  create(licenseState: LicenseState): IdMapBehavior;

  /**
   * Returns the priority of this factory.
   * In systems with multiple IdMapBehaviorFactory providers,
   * the one with the highest priority (or lowest, depending on convention)
   * might be chosen.
   *
   * @returns An integer representing the priority.
   */
  priority(): number;
}
