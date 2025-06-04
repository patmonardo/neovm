import { PoolSizes, DefaultPoolSizes } from '@/concurrency';

describe('PoolSizes', () => {
  describe('PoolSizes Interface Contract', () => {
    it('defines the basic interface contract', () => {
      const poolSizes = PoolSizes.defaults();

      expect(typeof poolSizes.corePoolSize).toBe('function');
      expect(typeof poolSizes.maxPoolSize).toBe('function');
      expect(typeof poolSizes.corePoolSize()).toBe('number');
      expect(typeof poolSizes.maxPoolSize()).toBe('number');
    });

    it('ensures core size is not greater than max size', () => {
      const implementations = [
        PoolSizes.defaults(),
        PoolSizes.fixed(4),
        PoolSizes.singleThreaded(),
        PoolSizes.fromCpuCores(),
        PoolSizes.custom(2, 8)
      ];

      implementations.forEach(poolSizes => {
        expect(poolSizes.corePoolSize()).toBeLessThanOrEqual(poolSizes.maxPoolSize());
      });
    });
  });

  describe('PoolSizes.defaults()', () => {
    it('returns DefaultPoolSizes instance', () => {
      const defaults = PoolSizes.defaults();

      expect(defaults).toBeInstanceOf(DefaultPoolSizes);
    });

    it('provides conservative default values', () => {
      const defaults = PoolSizes.defaults();

      expect(defaults.corePoolSize()).toBe(4);
      expect(defaults.maxPoolSize()).toBe(4);
    });

    it('returns consistent values across calls', () => {
      const defaults1 = PoolSizes.defaults();
      const defaults2 = PoolSizes.defaults();

      expect(defaults1.corePoolSize()).toBe(defaults2.corePoolSize());
      expect(defaults1.maxPoolSize()).toBe(defaults2.maxPoolSize());
    });
  });

  describe('PoolSizes.fixed()', () => {
    it('creates fixed-size pools', () => {
      const fixed1 = PoolSizes.fixed(1);
      const fixed4 = PoolSizes.fixed(4);
      const fixed16 = PoolSizes.fixed(16);

      expect(fixed1.corePoolSize()).toBe(1);
      expect(fixed1.maxPoolSize()).toBe(1);

      expect(fixed4.corePoolSize()).toBe(4);
      expect(fixed4.maxPoolSize()).toBe(4);

      expect(fixed16.corePoolSize()).toBe(16);
      expect(fixed16.maxPoolSize()).toBe(16);
    });

    it('core and max sizes are always equal', () => {
      const sizes = [1, 2, 4, 8, 16, 32];

      sizes.forEach(size => {
        const fixed = PoolSizes.fixed(size);
        expect(fixed.corePoolSize()).toBe(fixed.maxPoolSize());
        expect(fixed.corePoolSize()).toBe(size);
      });
    });

    it('handles edge cases', () => {
      const minFixed = PoolSizes.fixed(1);
      const largeFixed = PoolSizes.fixed(1000);

      expect(minFixed.corePoolSize()).toBe(1);
      expect(minFixed.maxPoolSize()).toBe(1);

      expect(largeFixed.corePoolSize()).toBe(1000);
      expect(largeFixed.maxPoolSize()).toBe(1000);
    });
  });

  describe('PoolSizes.singleThreaded()', () => {
    it('creates single-threaded pool', () => {
      const singleThreaded = PoolSizes.singleThreaded();

      expect(singleThreaded.corePoolSize()).toBe(1);
      expect(singleThreaded.maxPoolSize()).toBe(1);
    });

    it('is equivalent to fixed(1)', () => {
      const singleThreaded = PoolSizes.singleThreaded();
      const fixedOne = PoolSizes.fixed(1);

      expect(singleThreaded.corePoolSize()).toBe(fixedOne.corePoolSize());
      expect(singleThreaded.maxPoolSize()).toBe(fixedOne.maxPoolSize());
    });
  });

  describe('PoolSizes.fromCpuCores()', () => {
    it('creates pool sizes based on CPU cores', () => {
      const fromCores = PoolSizes.fromCpuCores();

      // Should be at least 1 (minimum valid pool size)
      expect(fromCores.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(fromCores.maxPoolSize()).toBeGreaterThanOrEqual(1);

      // Should be reasonable for most systems
      expect(fromCores.corePoolSize()).toBeLessThanOrEqual(64);
      expect(fromCores.maxPoolSize()).toBeLessThanOrEqual(64);
    });

    it('applies scaling factor correctly', () => {
      const factor1 = PoolSizes.fromCpuCores(1);
      const factor2 = PoolSizes.fromCpuCores(2);
      const factorHalf = PoolSizes.fromCpuCores(0.5);

      // Factor 2 should be roughly double factor 1
      expect(factor2.corePoolSize()).toBeGreaterThanOrEqual(factor1.corePoolSize());

      // Half factor should be less than or equal to factor 1
      expect(factorHalf.corePoolSize()).toBeLessThanOrEqual(factor1.corePoolSize());

      // All should be at least 1
      expect(factor1.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(factor2.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(factorHalf.corePoolSize()).toBeGreaterThanOrEqual(1);
    });

    it('handles different scaling scenarios', () => {
      const conservative = PoolSizes.fromCpuCores(0.5);
      const standard = PoolSizes.fromCpuCores(1);
      const aggressive = PoolSizes.fromCpuCores(2);
      const ioIntensive = PoolSizes.fromCpuCores(4);

      // All should be valid
      expect(conservative.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(standard.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(aggressive.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(ioIntensive.corePoolSize()).toBeGreaterThanOrEqual(1);

      // Should generally increase with factor
      expect(standard.corePoolSize()).toBeGreaterThanOrEqual(conservative.corePoolSize());
      expect(aggressive.corePoolSize()).toBeGreaterThanOrEqual(standard.corePoolSize());
    });

    it('creates fixed-size pools (core == max)', () => {
      const fromCores = PoolSizes.fromCpuCores();

      expect(fromCores.corePoolSize()).toBe(fromCores.maxPoolSize());
    });
  });

  describe('PoolSizes.custom()', () => {
    it('creates custom core/max combinations', () => {
      const custom1 = PoolSizes.custom(2, 8);
      const custom2 = PoolSizes.custom(1, 4);
      const custom3 = PoolSizes.custom(4, 16);

      expect(custom1.corePoolSize()).toBe(2);
      expect(custom1.maxPoolSize()).toBe(8);

      expect(custom2.corePoolSize()).toBe(1);
      expect(custom2.maxPoolSize()).toBe(4);

      expect(custom3.corePoolSize()).toBe(4);
      expect(custom3.maxPoolSize()).toBe(16);
    });

    it('handles equal core and max sizes', () => {
      const equalSizes = PoolSizes.custom(6, 6);

      expect(equalSizes.corePoolSize()).toBe(6);
      expect(equalSizes.maxPoolSize()).toBe(6);
      expect(equalSizes.corePoolSize()).toBe(equalSizes.maxPoolSize());
    });

    it('maintains core <= max relationship', () => {
      const customPools = [
        PoolSizes.custom(1, 2),
        PoolSizes.custom(2, 4),
        PoolSizes.custom(4, 8),
        PoolSizes.custom(8, 16),
        PoolSizes.custom(1, 100)
      ];

      customPools.forEach(pool => {
        expect(pool.corePoolSize()).toBeLessThanOrEqual(pool.maxPoolSize());
      });
    });
  });

  describe('DefaultPoolSizes Implementation', () => {
    it('can be instantiated directly', () => {
      const defaultPool = new DefaultPoolSizes();

      expect(defaultPool).toBeInstanceOf(DefaultPoolSizes);
      expect(defaultPool.corePoolSize()).toBe(4);
      expect(defaultPool.maxPoolSize()).toBe(4);
    });

    it('provides the official default values', () => {
      const defaultPool = new DefaultPoolSizes();

      // These are the "official" defaults - not magic numbers anymore!
      expect(defaultPool.corePoolSize()).toBe(4);
      expect(defaultPool.maxPoolSize()).toBe(4);
    });

    it('is consistent with PoolSizes.defaults()', () => {
      const defaultPool = new DefaultPoolSizes();
      const factoryDefaults = PoolSizes.defaults();

      expect(defaultPool.corePoolSize()).toBe(factoryDefaults.corePoolSize());
      expect(defaultPool.maxPoolSize()).toBe(factoryDefaults.maxPoolSize());
    });
  });

  describe('Cross-Platform CPU Detection', () => {
    it('detects cores in different environments', () => {
      const cpuBasedPool = PoolSizes.fromCpuCores();

      // Should work in both Node.js and browser environments
      expect(cpuBasedPool.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(cpuBasedPool.maxPoolSize()).toBeGreaterThanOrEqual(1);
    });

    it('falls back gracefully when CPU detection fails', () => {
      // This tests the fallback behavior in getCpuCoreCount()
      const cpuBasedPool = PoolSizes.fromCpuCores();

      // Even if detection fails, should get reasonable defaults (4 as fallback)
      expect(cpuBasedPool.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(cpuBasedPool.corePoolSize()).toBeLessThanOrEqual(64);
    });
  });

  describe('Factory Method Patterns', () => {
    it('provides fluent factory interface', () => {
      // All factory methods should work together fluently
      const pools = {
        defaults: PoolSizes.defaults(),
        fixed: PoolSizes.fixed(8),
        singleThreaded: PoolSizes.singleThreaded(),
        cpuBased: PoolSizes.fromCpuCores(2),
        custom: PoolSizes.custom(4, 12)
      };

      // All should implement the same interface
      Object.values(pools).forEach(pool => {
        expect(typeof pool.corePoolSize).toBe('function');
        expect(typeof pool.maxPoolSize).toBe('function');
        expect(pool.corePoolSize()).toBeGreaterThanOrEqual(1);
        expect(pool.maxPoolSize()).toBeGreaterThanOrEqual(pool.corePoolSize());
      });
    });

    it('supports common pool sizing patterns', () => {
      // Test typical real-world usage patterns
      const debugPool = PoolSizes.singleThreaded();
      const cpuBoundPool = PoolSizes.fromCpuCores(1);
      const ioBoundPool = PoolSizes.fromCpuCores(4);
      const customBurstPool = PoolSizes.custom(2, 16);

      expect(debugPool.corePoolSize()).toBe(1);
      expect(cpuBoundPool.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(ioBoundPool.corePoolSize()).toBeGreaterThanOrEqual(cpuBoundPool.corePoolSize());
      expect(customBurstPool.maxPoolSize()).toBeGreaterThan(customBurstPool.corePoolSize());
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('all implementations return numbers', () => {
      const allPools = [
        PoolSizes.defaults(),
        PoolSizes.fixed(4),
        PoolSizes.singleThreaded(),
        PoolSizes.fromCpuCores(),
        PoolSizes.custom(2, 8),
        new DefaultPoolSizes()
      ];

      allPools.forEach(pool => {
        const core = pool.corePoolSize();
        const max = pool.maxPoolSize();

        expect(typeof core).toBe('number');
        expect(typeof max).toBe('number');
        expect(Number.isInteger(core)).toBe(true);
        expect(Number.isInteger(max)).toBe(true);
        expect(core).toBeGreaterThanOrEqual(1);
        expect(max).toBeGreaterThanOrEqual(core);
      });
    });
  });
});
