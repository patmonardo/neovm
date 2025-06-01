import { GraphStoreFactorySupplier as IGraphStoreFactorySupplier } from "@/api";
import { GraphStoreFactorySupplierProvider } from "@/api";
import { GraphProjectConfig } from "@/config"; // Adjust path as needed
import { formatWithLocale } from "@/utils"; // Adjust path as needed, or use a simple string formatter

// This array will hold the registered provider instances.
// In Java, ServiceLoader populates this dynamically. Here, we'll need explicit registration.
const PROVIDERS: GraphStoreFactorySupplierProvider[] = [];

/**
 * Utility class to obtain a GraphStoreFactory.Supplier based on a GraphProjectConfig.
 * This class replaces the Java ServiceLoader mechanism with an explicit registration pattern for providers.
 */
export class GraphStoreFactorySupplier {
  /**
   * Private constructor to prevent instantiation, as this class provides only static methods.
   */
  private constructor() {}

  /**
   * Registers a GraphStoreFactorySupplierProvider.
   * This method should be called during application setup for each provider implementation.
   * @param provider The provider instance to register.
   */
  public static registerProvider(
    provider: GraphStoreFactorySupplierProvider
  ): void {
    // You might want to add checks here, e.g., to prevent duplicate registrations
    // or to ensure providers are registered in a specific order if that matters.
    PROVIDERS.push(provider);
  }

  /**
   * Clears all registered providers.
   * Useful for testing environments or when re-initializing providers.
   */
  public static clearProviders(): void {
    PROVIDERS.length = 0; // Effectively clears the array
  }

  /**
   * Retrieves a GraphStoreFactory.Supplier appropriate for the given GraphProjectConfig.
   * It iterates through the registered providers to find one that can handle the configuration.
   *
   * @param graphProjectConfig The configuration for which a supplier is needed.
   * @returns The suitable GraphStoreFactory.Supplier.
   * @throws Error if no suitable provider is found for the given configuration.
   */
  public static supplier(
    graphProjectConfig: GraphProjectConfig
  ): IGraphStoreFactorySupplier {
    const suitableProvider = PROVIDERS.find((p) =>
      p.canSupplyFactoryFor(graphProjectConfig)
    );

    if (!suitableProvider) {
      // Attempt to get a meaningful name for the config for the error message.
      // In Java, it's graphProjectConfig.getClass().getName().
      // In TypeScript, constructor.name can be used but might be minified.
      // A 'type' or 'name' property on GraphProjectConfig would be more robust.
      const configIdentifier =
        (graphProjectConfig as any)?.constructor?.name ||
        (typeof graphProjectConfig === "object" && graphProjectConfig !== null
          ? Object.getPrototypeOf(graphProjectConfig)?.constructor?.name
          : "UnknownConfig");

      throw new Error(
        formatWithLocale(
          "%s does not support GraphStoreFactory creation",
          configIdentifier
        )
      );
    }

    return suitableProvider.supplier(graphProjectConfig);
  }
}

// HOW TO USE:
//
// 1. Define your GraphStoreFactorySupplierProvider implementations:
//    // e.g., in MyCypherGraphStoreFactorySupplierProvider.ts
//    class MyCypherProvider implements GraphStoreFactorySupplierProvider {
//        canSupplyFactoryFor(config: GraphProjectConfig): boolean { /* ... */ }
//        supplier(config: GraphProjectConfig): IGraphStoreFactorySupplier { /* ... */ }
//    }
//
// 2. Register them during your application's initialization phase:
//    // e.g., in your main application setup file
//    import { GraphStoreFactorySupplier } from './core/GraphStoreFactorySupplier';
//    import { MyCypherProvider } from './providers/MyCypherGraphStoreFactorySupplierProvider';
//
//    GraphStoreFactorySupplier.registerProvider(new MyCypherProvider());
//    // Register other providers...
//
// 3. Later, when you need a supplier:
//    const config: GraphProjectConfig = /* ... your graph project config ... */;
//    const factorySupplier = GraphStoreFactorySupplier.supplier(config);
//    // Now you can use factorySupplier.get(...) or factorySupplier.getWithDimension(...)
