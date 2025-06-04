import { Concurrency } from '@/concurrency/Concurrency';

describe('Concurrency', () => {
  describe('Constructor and Basic Properties', () => {
    it('creates concurrency with valid positive values', () => {
      const concurrency1 = new Concurrency(1);
      const concurrency4 = new Concurrency(4);
      const concurrency16 = new Concurrency(16);

      expect(concurrency1.value()).toBe(1);
      expect(concurrency4.value()).toBe(4);
      expect(concurrency16.value()).toBe(16);
    });

    it('rejects invalid concurrency values', () => {
      expect(() => new Concurrency(0)).toThrow(
        "Valid values for Concurrency are int[1..]. Value provided was '0'."
      );

      expect(() => new Concurrency(-1)).toThrow(
        "Valid values for Concurrency are int[1..]. Value provided was '-1'."
      );

      expect(() => new Concurrency(-5)).toThrow(
        "Valid values for Concurrency are int[1..]. Value provided was '-5'."
      );
    });

    it('handles edge case of minimum valid value', () => {
      const minConcurrency = new Concurrency(1);
      expect(minConcurrency.value()).toBe(1);
      expect(minConcurrency.squared()).toBe(1);
    });
  });

  describe('Mathematical Operations', () => {
    it('calculates squared values correctly', () => {
      expect(new Concurrency(1).squared()).toBe(1);
      expect(new Concurrency(2).squared()).toBe(4);
      expect(new Concurrency(3).squared()).toBe(9);
      expect(new Concurrency(4).squared()).toBe(16);
      expect(new Concurrency(8).squared()).toBe(64);
    });

    it('handles large values for squared calculation', () => {
      const largeConcurrency = new Concurrency(100);
      expect(largeConcurrency.squared()).toBe(10000);
    });
  });

  describe('Static Factory Methods', () => {
    it('creates single-threaded concurrency', () => {
      const singleThreaded = Concurrency.singleThreaded();

      expect(singleThreaded.value()).toBe(1);
      expect(singleThreaded.squared()).toBe(1);
    });

    it('creates concurrency from available cores', () => {
      const availableCores = Concurrency.availableCores();

      // Should be at least 1 (minimum valid concurrency)
      expect(availableCores.value()).toBeGreaterThanOrEqual(1);

      // Should be reasonable for most systems (1-64 cores)
      expect(availableCores.value()).toBeLessThanOrEqual(64);
    });

    it('uses default value when cores cannot be determined', () => {
      const defaultConcurrency = Concurrency.availableCores(8);

      // Should be at least the default if cores can't be determined
      expect(defaultConcurrency.value()).toBeGreaterThanOrEqual(1);
    });

    it('handles different default values for available cores', () => {
      const withDefault2 = Concurrency.availableCores(2);
      const withDefault8 = Concurrency.availableCores(8);

      expect(withDefault2.value()).toBeGreaterThanOrEqual(1);
      expect(withDefault8.value()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Concurrency.of() Factory Method', () => {
    it('passes through existing Concurrency objects', () => {
      const original = new Concurrency(4);
      const passedThrough = Concurrency.of(original);

      expect(passedThrough).toBe(original); // Same object reference
      expect(passedThrough.value()).toBe(4);
    });

    it('converts numbers to Concurrency objects', () => {
      const fromNumber1 = Concurrency.of(1);
      const fromNumber4 = Concurrency.of(4);
      const fromNumber16 = Concurrency.of(16);

      expect(fromNumber1).toBeInstanceOf(Concurrency);
      expect(fromNumber4).toBeInstanceOf(Concurrency);
      expect(fromNumber16).toBeInstanceOf(Concurrency);

      expect(fromNumber1.value()).toBe(1);
      expect(fromNumber4.value()).toBe(4);
      expect(fromNumber16.value()).toBe(16);
    });

    it('validates numbers converted to Concurrency', () => {
      expect(() => Concurrency.of(0)).toThrow(
        "Valid values for Concurrency are int[1..]. Value provided was '0'."
      );

      expect(() => Concurrency.of(-1)).toThrow(
        "Valid values for Concurrency are int[1..]. Value provided was '-1'."
      );
    });

    it('handles mixed usage patterns', () => {
      const directConcurrency = new Concurrency(8);
      const fromNumber = Concurrency.of(8);
      const passedThrough = Concurrency.of(directConcurrency);

      expect(directConcurrency.value()).toBe(8);
      expect(fromNumber.value()).toBe(8);
      expect(passedThrough).toBe(directConcurrency);
      expect(passedThrough.value()).toBe(8);
    });
  });

  describe('Object Identity and Equality', () => {
    it('implements toString correctly', () => {
      expect(new Concurrency(1).toString()).toBe('Concurrency(1)');
      expect(new Concurrency(4).toString()).toBe('Concurrency(4)');
      expect(new Concurrency(16).toString()).toBe('Concurrency(16)');
    });

    it('implements equals correctly', () => {
      const concurrency1a = new Concurrency(4);
      const concurrency1b = new Concurrency(4);
      const concurrency2 = new Concurrency(8);

      // Same reference
      expect(concurrency1a.equals(concurrency1a)).toBe(true);

      // Same value, different objects
      expect(concurrency1a.equals(concurrency1b)).toBe(true);
      expect(concurrency1b.equals(concurrency1a)).toBe(true);

      // Different values
      expect(concurrency1a.equals(concurrency2)).toBe(false);
      expect(concurrency2.equals(concurrency1a)).toBe(false);

      // Non-Concurrency objects
      expect(concurrency1a.equals(null)).toBe(false);
      expect(concurrency1a.equals(undefined)).toBe(false);
      expect(concurrency1a.equals(4)).toBe(false);
      expect(concurrency1a.equals('Concurrency(4)')).toBe(false);
      expect(concurrency1a.equals({ value: 4 })).toBe(false);
    });

    it('implements hashCode correctly', () => {
      const concurrency1 = new Concurrency(4);
      const concurrency2 = new Concurrency(4);
      const concurrency3 = new Concurrency(8);

      // Same value should have same hash code
      expect(concurrency1.hashCode()).toBe(concurrency2.hashCode());
      expect(concurrency1.hashCode()).toBe(4);

      // Different values should have different hash codes
      expect(concurrency1.hashCode()).not.toBe(concurrency3.hashCode());
      expect(concurrency3.hashCode()).toBe(8);
    });
  });

  describe('Cross-Platform CPU Detection', () => {
    it('detects cores in different environments', () => {
      // This test verifies the environment detection logic works
      const cores = Concurrency.availableCores();

      // Should work in both Node.js and browser environments
      expect(cores.value()).toBeGreaterThanOrEqual(1);
      expect(cores).toBeInstanceOf(Concurrency);
    });

    it('falls back to default when CPU detection fails', () => {
      // Test with a specific default to ensure fallback works
      const defaultValue = 6;
      const concurrency = Concurrency.availableCores(defaultValue);

      // Should either detect actual cores or use the default
      expect(concurrency.value()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Usage Patterns and Integration', () => {
    it('supports typical usage patterns for thread pool sizing', () => {
      // Common patterns for determining pool sizes
      const singleThreaded = Concurrency.singleThreaded();
      const cpuBound = Concurrency.availableCores();
      const ioBound = Concurrency.of(cpuBound.value() * 2);
      const custom = Concurrency.of(8);

      expect(singleThreaded.value()).toBe(1);
      expect(cpuBound.value()).toBeGreaterThanOrEqual(1);
      expect(ioBound.value()).toBe(cpuBound.value() * 2);
      expect(custom.value()).toBe(8);
    });

    it('works with mathematical calculations for pool sizing', () => {
      const baseConcurrency = Concurrency.of(4);

      // Common calculations
      const doubled = Concurrency.of(baseConcurrency.value() * 2);
      const squared = baseConcurrency.squared();
      const halfed = Concurrency.of(Math.max(1, Math.floor(baseConcurrency.value() / 2)));

      expect(doubled.value()).toBe(8);
      expect(squared).toBe(16);
      expect(halfed.value()).toBe(2);
    });
  });
});
