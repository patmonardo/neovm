import { GraphProjectConfig } from "@/config"; // Placeholder
import { GraphStoreFactorySupplier } from "./GraphStoreFactory"; // Assuming GraphStoreFactory.ts contains GraphStoreFactorySupplier

/**
 * Provides a GraphStoreFactory.Supplier based on a given GraphProjectConfig.
 * The `@Service` annotation from Java indicates this is likely a component
 * managed by a dependency injection or service locator framework.
 * In TypeScript, this would typically be registered with such a framework if one is used.
 */
export interface GraphStoreFactorySupplierProvider {
  /**
   * Checks if this provider can supply a factory supplier for the given graph project configuration.
   * @param graphProjectConfig The configuration to check.
   * @returns True if a supplier can be provided, false otherwise.
   */
  canSupplyFactoryFor(graphProjectConfig: GraphProjectConfig): boolean;

  /**
   * Gets a GraphStoreFactory.Supplier for the given graph project configuration.
   * Should typically only be called if `canSupplyFactoryFor` returns true for the same config.
   * @param graphProjectConfig The configuration for which to get the supplier.
   * @returns A GraphStoreFactory.Supplier instance.
   */
  supplier(graphProjectConfig: GraphProjectConfig): GraphStoreFactorySupplier;
}
