import { PoolSizesService } from '@/concurrency';
import { PoolSizes } from '@/concurrency';

describe('PoolSizesService', () => {
  // Store original instance to restore after tests
  let originalInstance: any;

  beforeEach(() => {
    // Clear singleton for clean test state
    originalInstance = (PoolSizesService as any)._instance;
    (PoolSizesService as any)._instance = null;
  });

  afterEach(() => {
    // Restore original instance
    (PoolSizesService as any)._instance = originalInstance;
  });

  describe('Singleton Pattern', () => {
    it('provides a singleton instance', () => {
      const instance1 = PoolSizesService.getInstance();
      const instance2 = PoolSizesService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PoolSizesService);
    });

    it('can be instantiated directly for custom configurations', () => {
      const customPoolSizes = PoolSizes.fixed(8);
      const service = new PoolSizesService(customPoolSizes);

      expect(service).toBeInstanceOf(PoolSizesService);
      expect(service.poolSizes()).toBe(customPoolSizes);
      expect(service.poolSizes().corePoolSize()).toBe(8);
    });
  });

  describe('Constructor and Initialization', () => {
    it('initializes with default pool sizes when no argument provided', () => {
      const service = new PoolSizesService();
      const poolSizes = service.poolSizes();

      expect(poolSizes.corePoolSize()).toBe(4); // Default is 4
      expect(poolSizes.maxPoolSize()).toBe(4);
    });

    it('initializes with custom pool sizes when provided', () => {
      const customSizes = PoolSizes.custom(2, 6);
      const service = new PoolSizesService(customSizes);

      expect(service.poolSizes()).toBe(customSizes);
      expect(service.poolSizes().corePoolSize()).toBe(2);
      expect(service.poolSizes().maxPoolSize()).toBe(6);
    });

    it('singleton initializes with defaults', () => {
      const instance = PoolSizesService.getInstance();
      const poolSizes = instance.poolSizes();

      expect(poolSizes.corePoolSize()).toBe(4);
      expect(poolSizes.maxPoolSize()).toBe(4);
    });
  });

  describe('Instance Methods', () => {
    it('returns configured pool sizes', () => {
      const service = new PoolSizesService(PoolSizes.fixed(6));
      const poolSizes = service.poolSizes();

      expect(poolSizes.corePoolSize()).toBe(6);
      expect(poolSizes.maxPoolSize()).toBe(6);
    });

    it('allows updating pool sizes', () => {
      const service = new PoolSizesService(PoolSizes.fixed(2));

      // Initial configuration
      expect(service.poolSizes().corePoolSize()).toBe(2);

      // Update configuration
      const newSizes = PoolSizes.custom(4, 8);
      service.setPoolSizes(newSizes);

      expect(service.poolSizes()).toBe(newSizes);
      expect(service.poolSizes().corePoolSize()).toBe(4);
      expect(service.poolSizes().maxPoolSize()).toBe(8);
    });

    it('handles multiple updates', () => {
      const service = new PoolSizesService();

      // Update 1
      service.setPoolSizes(PoolSizes.singleThreaded());
      expect(service.poolSizes().corePoolSize()).toBe(1);

      // Update 2
      service.setPoolSizes(PoolSizes.fromCpuCores(2));
      expect(service.poolSizes().corePoolSize()).toBeGreaterThanOrEqual(2);

      // Update 3
      service.setPoolSizes(PoolSizes.custom(3, 12));
      expect(service.poolSizes().corePoolSize()).toBe(3);
      expect(service.poolSizes().maxPoolSize()).toBe(12);
    });
  });

  describe('Static Methods', () => {
    it('provides static access to pool sizes', () => {
      const poolSizes = PoolSizesService.poolSizes();

      expect(poolSizes.corePoolSize()).toBe(4); // Default
      expect(poolSizes.maxPoolSize()).toBe(4);
    });

    it('allows static configuration updates', () => {
      // Initial state
      expect(PoolSizesService.poolSizes().corePoolSize()).toBe(4);

      // Update via static method
      const newSizes = PoolSizes.fixed(16);
      PoolSizesService.setPoolSizes(newSizes);

      expect(PoolSizesService.poolSizes()).toBe(newSizes);
      expect(PoolSizesService.poolSizes().corePoolSize()).toBe(16);
    });

    it('static methods affect the singleton instance', () => {
      const instance = PoolSizesService.getInstance();

      // Update via static method
      const customSizes = PoolSizes.custom(5, 10);
      PoolSizesService.setPoolSizes(customSizes);

      // Instance should reflect the change
      expect(instance.poolSizes()).toBe(customSizes);
      expect(instance.poolSizes().corePoolSize()).toBe(5);
      expect(instance.poolSizes().maxPoolSize()).toBe(10);
    });
  });

  describe('Service Configuration Patterns', () => {
    it('supports application startup configuration', () => {
      // Simulate application startup configuration
      PoolSizesService.setPoolSizes(PoolSizes.fromCpuCores(1.5));

      const configuredSizes = PoolSizesService.poolSizes();
      expect(configuredSizes.corePoolSize()).toBeGreaterThanOrEqual(1);
    });

    it('supports runtime reconfiguration', () => {
      // Initial configuration
      PoolSizesService.setPoolSizes(PoolSizes.fixed(4));
      expect(PoolSizesService.poolSizes().corePoolSize()).toBe(4);

      // Runtime reconfiguration (e.g., based on load)
      PoolSizesService.setPoolSizes(PoolSizes.custom(2, 8));
      expect(PoolSizesService.poolSizes().corePoolSize()).toBe(2);
      expect(PoolSizesService.poolSizes().maxPoolSize()).toBe(8);
    });

    it('supports different pool sizing strategies', () => {
      const strategies = [
        { name: 'debug', sizes: PoolSizes.singleThreaded() },
        { name: 'development', sizes: PoolSizes.fixed(2) },
        { name: 'production-cpu', sizes: PoolSizes.fromCpuCores(1) },
        { name: 'production-io', sizes: PoolSizes.fromCpuCores(4) },
        { name: 'custom', sizes: PoolSizes.custom(4, 16) }
      ];

      strategies.forEach(strategy => {
        PoolSizesService.setPoolSizes(strategy.sizes);
        const current = PoolSizesService.poolSizes();

        expect(current).toBe(strategy.sizes);
        expect(current.corePoolSize()).toBeGreaterThanOrEqual(1);
        expect(current.maxPoolSize()).toBeGreaterThanOrEqual(current.corePoolSize());
      });
    });
  });

  describe('Multiple Service Instances', () => {
    it('singleton is independent of direct instances', () => {
      // Direct instance with custom configuration
      const directInstance = new PoolSizesService(PoolSizes.fixed(20));

      // Singleton should still have defaults (not affected by direct instance)
      const singletonSizes = PoolSizesService.poolSizes();
      expect(singletonSizes.corePoolSize()).toBe(4); // Still default

      // Direct instance should have its own configuration
      expect(directInstance.poolSizes().corePoolSize()).toBe(20);
    });

    it('multiple direct instances are independent', () => {
      const instance1 = new PoolSizesService(PoolSizes.fixed(5));
      const instance2 = new PoolSizesService(PoolSizes.custom(2, 8));

      expect(instance1.poolSizes().corePoolSize()).toBe(5);
      expect(instance2.poolSizes().corePoolSize()).toBe(2);

      // Updating one doesn't affect the other
      instance1.setPoolSizes(PoolSizes.fixed(10));
      expect(instance1.poolSizes().corePoolSize()).toBe(10);
      expect(instance2.poolSizes().corePoolSize()).toBe(2); // Unchanged
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('always returns valid PoolSizes objects', () => {
      const service = new PoolSizesService();
      const poolSizes = service.poolSizes();

      expect(typeof poolSizes.corePoolSize).toBe('function');
      expect(typeof poolSizes.maxPoolSize).toBe('function');
      expect(typeof poolSizes.corePoolSize()).toBe('number');
      expect(typeof poolSizes.maxPoolSize()).toBe('number');
    });

    it('validates PoolSizes assignments', () => {
      const service = new PoolSizesService();

      // All valid PoolSizes should work
      const validConfigurations = [
        PoolSizes.defaults(),
        PoolSizes.fixed(8),
        PoolSizes.singleThreaded(),
        PoolSizes.fromCpuCores(),
        PoolSizes.custom(1, 4)
      ];

      validConfigurations.forEach(config => {
        service.setPoolSizes(config);
        expect(service.poolSizes()).toBe(config);
      });
    });
  });
});
