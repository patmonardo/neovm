import { OpenGdsPoolSizesProvider } from "@/concurrency";
import { OpenGdsPoolSizes } from "@/concurrency";
import { LicenseState } from "@/core";
import { PoolSizesProvider } from "@/concurrency";

describe("OpenGdsPoolSizesProvider", () => {
  let provider: OpenGdsPoolSizesProvider;

  beforeEach(() => {
    provider = new OpenGdsPoolSizesProvider();
  });

  describe("PoolSizesProvider Interface Implementation", () => {
    it("implements PoolSizesProvider interface", () => {
      expect(provider).toBeInstanceOf(OpenGdsPoolSizesProvider);
      expect(typeof provider.get).toBe("function");
      expect(typeof provider.priority).toBe("function");
    });

    it("satisfies PoolSizesProvider contract", () => {
      // Mock license state
      const mockLicenseState = {} as LicenseState;

      const poolSizes = provider.get(mockLicenseState);
      expect(poolSizes).toBeDefined();
      expect(typeof poolSizes.corePoolSize).toBe("function");
      expect(typeof poolSizes.maxPoolSize).toBe("function");
    });
  });

  describe("License-Independent Behavior", () => {
    it("always provides open-source pool sizes", () => {
      const licenseState = {} as LicenseState;
      const poolSizes = provider.get(licenseState);

      // Should be OpenGdsPoolSizes (open-source version)
      expect(poolSizes).toBeInstanceOf(OpenGdsPoolSizes);

      // Should provide reasonable defaults for open-source usage
      expect(poolSizes.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(poolSizes.maxPoolSize()).toBeGreaterThanOrEqual(
        poolSizes.corePoolSize()
      );
    });
  });

  describe("Provider Priority System", () => {
    it("has minimum priority as fallback provider", () => {
      const priority = provider.priority();

      // Should be minimum safe integer (lowest priority)
      expect(priority).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("acts as default fallback in provider chain", () => {
      // This provider should be the last resort
      expect(provider.priority()).toBeLessThan(-1000000);
      expect(provider.priority()).toBeLessThan(0);

      // Any other provider with higher priority should override this
      const higherPriority = provider.priority() + 1;
      expect(higherPriority).toBeGreaterThan(provider.priority());
    });
  });

  describe("GDS Compatibility Layer", () => {
    it("maintains API compatibility with Neo4j GDS", () => {
      const licenseState = {} as LicenseState;
      const poolSizes = provider.get(licenseState);

      // Should match expected GDS PoolSizes interface
      expect(poolSizes).toHaveProperty("corePoolSize");
      expect(poolSizes).toHaveProperty("maxPoolSize");

      // Methods should return numbers (Java int compatibility)
      expect(typeof poolSizes.corePoolSize()).toBe("number");
      expect(typeof poolSizes.maxPoolSize()).toBe("number");
    });

    it("provides enterprise-grade defaults despite being open source", () => {
      const licenseState = {} as LicenseState;
      const poolSizes = provider.get(licenseState);

      // Open source but still enterprise-capable
      expect(poolSizes.corePoolSize()).toBeGreaterThanOrEqual(4); // Reasonable default
      expect(poolSizes.maxPoolSize()).toBeGreaterThanOrEqual(4);

      // Should support real workloads, not toy limits
      expect(poolSizes.maxPoolSize()).toBeLessThanOrEqual(1000); // Sanity check
    });

    it("enables reverse engineering without license checks", () => {
      const provider = new OpenGdsPoolSizesProvider();

      // Should work without any license validation
      const poolSizes = provider.get(null as any);
      expect(poolSizes).toBeInstanceOf(OpenGdsPoolSizes);

      // Should provide full functionality
      expect(poolSizes.corePoolSize()).toBeGreaterThan(0);
      expect(poolSizes.maxPoolSize()).toBeGreaterThan(0);
    });
  });

  describe("Multiple Provider Pattern", () => {
    it("can be used alongside other providers", () => {
      // Simulate a provider registry
      const providers: PoolSizesProvider[] = [
        new OpenGdsPoolSizesProvider(),
        // Could add enterprise providers with higher priority
      ];

      // Sort by priority (higher first)
      providers.sort((a, b) => b.priority() - a.priority());

      // OpenGdsPoolSizesProvider should be last (fallback)
      expect(providers[providers.length - 1]).toBeInstanceOf(
        OpenGdsPoolSizesProvider
      );
    });

    it("provides consistent results across calls", () => {
      const licenseState = {} as LicenseState;

      const poolSizes1 = provider.get(licenseState);
      const poolSizes2 = provider.get(licenseState);

      // Should be consistent (though possibly different instances)
      expect(poolSizes1.corePoolSize()).toBe(poolSizes2.corePoolSize());
      expect(poolSizes1.maxPoolSize()).toBe(poolSizes2.maxPoolSize());
    });
  });

  describe("Anti-License-Lock-In Features", () => {
    it("works without license validation infrastructure", () => {
      // Should not require any license checking classes to be available
      const poolSizes = provider.get({} as LicenseState);

      expect(poolSizes).toBeDefined();
      expect(poolSizes.corePoolSize()).toBeGreaterThan(0);
    });

    it("provides full functionality in open source mode", () => {
      const poolSizes = provider.get({} as LicenseState);

      // No artificial limitations
      expect(poolSizes.corePoolSize()).toBeGreaterThanOrEqual(4);
      expect(poolSizes.maxPoolSize()).toBeGreaterThanOrEqual(4);

      // Should support serious computational workloads
      const cores = poolSizes.corePoolSize();
      const max = poolSizes.maxPoolSize();
      expect(cores).toBeLessThanOrEqual(max);
      expect(max).toBeGreaterThanOrEqual(cores);
    });

    it("enables full GDS reverse engineering capabilities", () => {
      // This is what makes reverse engineering possible
      const provider = new OpenGdsPoolSizesProvider();

      // Works without Neo4j licensing infrastructure
      expect(() => {
        const poolSizes = provider.get({} as LicenseState);
        poolSizes.corePoolSize();
        poolSizes.maxPoolSize();
      }).not.toThrow();
    });
  });

  describe("Enterprise Alternative Pattern", () => {
    it("demonstrates how enterprise providers would work", () => {
      // Mock enterprise provider pattern
      class MockEnterpriseProvider implements PoolSizesProvider {
        get(licenseState: LicenseState): any {
          // Would check license and return premium sizes
          return provider.get(licenseState); // Fallback to open source
        }

        priority(): number {
          return 100; // Higher than open source
        }
      }

      const enterpriseProvider = new MockEnterpriseProvider();
      expect(enterpriseProvider.priority()).toBeGreaterThan(
        provider.priority()
      );
    });
  });
});
