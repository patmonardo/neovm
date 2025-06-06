import { AtomicNumber, AtomicLong, AtomicDouble, AtomicInteger } from '../AtomicNumber';

describe('AtomicNumber - Comprehensive Tests', () => {
  let atomic: AtomicNumber;

  beforeEach(() => {
    atomic = new AtomicNumber();
  });

  describe('Basic Construction and Initialization', () => {
    it('creates AtomicNumber with default value 0', () => {
      const defaultAtomic = new AtomicNumber();
      expect(defaultAtomic.get()).toBe(0);
    });

    it('creates AtomicNumber with specified initial value', () => {
      const values = [42, -17, 3.14159, 0, 1000000, -999.999];

      values.forEach(value => {
        const atomicWithValue = new AtomicNumber(value);
        expect(atomicWithValue.get()).toBe(value);
      });
    });

    it('handles edge case numeric values', () => {
      const edgeCases = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.EPSILON,
        -0,
        0.1 + 0.2, // Floating point precision test
      ];

      edgeCases.forEach(value => {
        const atomicEdge = new AtomicNumber(value);
        expect(atomicEdge.get()).toBe(value);
      });
    });

    it('handles NaN values correctly', () => {
      const nanAtomic = new AtomicNumber(NaN);
      expect(Number.isNaN(nanAtomic.get())).toBe(true);
    });
  });

  describe('Basic Get and Set Operations', () => {
    it('gets current value correctly', () => {
      atomic.set(123.456);
      expect(atomic.get()).toBe(123.456);
    });

    it('sets value correctly', () => {
      const testValues = [0, 42, -17, 3.14159, Number.MAX_SAFE_INTEGER];

      testValues.forEach(value => {
        atomic.set(value);
        expect(atomic.get()).toBe(value);
      });
    });

    it('maintains precision for floating point values', () => {
      const precisionValues = [
        Math.PI,
        Math.E,
        0.123456789,
        -0.987654321,
        1.23e-10,
        9.87e15
      ];

      precisionValues.forEach(value => {
        atomic.set(value);
        expect(atomic.get()).toBe(value);
      });
    });

    it('handles rapid get/set operations', () => {
      for (let i = 0; i < 1000; i++) {
        atomic.set(i);
        expect(atomic.get()).toBe(i);
      }
    });
  });

  describe('Atomic GetAndSet Operations', () => {
    it('getAndSet returns old value and sets new value', () => {
      atomic.set(100);
      const oldValue = atomic.getAndSet(200);

      expect(oldValue).toBe(100);
      expect(atomic.get()).toBe(200);
    });

    it('getAndSet works with various value types', () => {
      const testCases = [
        { initial: 0, newValue: 42 },
        { initial: 3.14, newValue: 2.71 },
        { initial: -100, newValue: 100 },
        { initial: Number.MAX_SAFE_INTEGER, newValue: 0 }
      ];

      testCases.forEach(({ initial, newValue }) => {
        console.log(`Testing getAndSet with initial: ${initial}, newValue: ${newValue}`);
        atomic = new AtomicNumber(initial);
        const returned = atomic.getAndSet(newValue);

        expect(returned).toBe(initial);
        expect(atomic.get()).toBe(newValue);
      });
    });

    it('getAndSet is atomic (sequential consistency)', () => {
      atomic.set(500);

      // Multiple sequential getAndSet operations
      const results: number[] = [];
      const values = [100, 200, 300, 400, 500];

      values.forEach(value => {
        results.push(atomic.getAndSet(value));
      });

      expect(results).toEqual([500, 100, 200, 300, 400]);
      expect(atomic.get()).toBe(500);
    });
  });

  describe('Increment and Decrement Operations', () => {
    it('getAndIncrement returns old value and increments', () => {
      atomic.set(10);
      const oldValue = atomic.getAndIncrement();

      expect(oldValue).toBe(10);
      expect(atomic.get()).toBe(11);
    });

    it('getAndDecrement returns old value and decrements', () => {
      atomic.set(10);
      const oldValue = atomic.getAndDecrement();

      expect(oldValue).toBe(10);
      expect(atomic.get()).toBe(9);
    });

    it('incrementAndGet increments and returns new value', () => {
      atomic.set(5);
      const newValue = atomic.incrementAndGet();

      expect(newValue).toBe(6);
      expect(atomic.get()).toBe(6);
    });

    it('decrementAndGet decrements and returns new value', () => {
      atomic.set(5);
      const newValue = atomic.decrementAndGet();

      expect(newValue).toBe(4);
      expect(atomic.get()).toBe(4);
    });

    it('handles increment/decrement sequences correctly', () => {
      atomic.set(0);

      // Mixed increment and decrement operations
      expect(atomic.incrementAndGet()).toBe(1);  // 0 -> 1
      expect(atomic.incrementAndGet()).toBe(2);  // 1 -> 2
      expect(atomic.getAndDecrement()).toBe(2);  // 2 -> 1, returns 2
      expect(atomic.decrementAndGet()).toBe(0);  // 1 -> 0
      expect(atomic.getAndIncrement()).toBe(0);  // 0 -> 1, returns 0

      expect(atomic.get()).toBe(1);
    });

    it('handles large increment/decrement operations', () => {
      atomic.set(Number.MAX_SAFE_INTEGER - 10);

      for (let i = 0; i < 5; i++) {
        atomic.incrementAndGet();
      }

      expect(atomic.get()).toBe(Number.MAX_SAFE_INTEGER - 5);
    });

    it('handles negative value increment/decrement', () => {
      atomic.set(-10);

      expect(atomic.incrementAndGet()).toBe(-9);
      expect(atomic.incrementAndGet()).toBe(-8);
      expect(atomic.decrementAndGet()).toBe(-9);
      expect(atomic.decrementAndGet()).toBe(-10);
    });
  });

  describe('Add Operations', () => {
    it('getAndAdd returns old value and adds delta', () => {
      atomic.set(100);
      const oldValue = atomic.getAndAdd(25);

      expect(oldValue).toBe(100);
      expect(atomic.get()).toBe(125);
    });

    it('addAndGet adds delta and returns new value', () => {
      atomic.set(100);
      const newValue = atomic.addAndGet(25);

      expect(newValue).toBe(125);
      expect(atomic.get()).toBe(125);
    });

    it('handles negative delta values', () => {
      atomic.set(50);

      expect(atomic.getAndAdd(-20)).toBe(50);
      expect(atomic.get()).toBe(30);

      expect(atomic.addAndGet(-10)).toBe(20);
      expect(atomic.get()).toBe(20);
    });

    it('handles floating point delta values', () => {
      atomic.set(10.5);

      const oldValue = atomic.getAndAdd(2.3);
      expect(oldValue).toBe(10.5);
      expect(atomic.get()).toBeCloseTo(12.8, 10);

      const newValue = atomic.addAndGet(-1.8);
      expect(newValue).toBeCloseTo(11.0, 10);
    });

    it('handles zero delta correctly', () => {
      atomic.set(42);

      expect(atomic.getAndAdd(0)).toBe(42);
      expect(atomic.get()).toBe(42);

      expect(atomic.addAndGet(0)).toBe(42);
      expect(atomic.get()).toBe(42);
    });

    it('handles large delta values', () => {
      atomic.set(1000);

      const largeDelta = 1000000;
      expect(atomic.addAndGet(largeDelta)).toBe(1001000);
      expect(atomic.getAndAdd(-largeDelta)).toBe(1001000);
      expect(atomic.get()).toBe(1000);
    });
  });

  describe('Compare and Set Operations', () => {
    it('compareAndSet succeeds when expected value matches', () => {
      atomic.set(100);
      const result = atomic.compareAndSet(100, 200);

      expect(result).toBe(true);
      expect(atomic.get()).toBe(200);
    });

    it('compareAndSet fails when expected value does not match', () => {
      atomic.set(100);
      const result = atomic.compareAndSet(99, 200);

      expect(result).toBe(false);
      expect(atomic.get()).toBe(100); // Value unchanged
    });

    it('compareAndSet works with floating point values', () => {
      const initialValue = 3.14159;
      const expectedValue = 3.14159;
      const newValue = 2.71828;

      atomic.set(initialValue);
      const result = atomic.compareAndSet(expectedValue, newValue);

      expect(result).toBe(true);
      expect(atomic.get()).toBe(newValue);
    });

    it('compareAndSet handles edge cases', () => {
      // Test with 0 and -0
      atomic.set(0);
      expect(atomic.compareAndSet(0, 42)).toBe(true);
      expect(atomic.get()).toBe(42);

      // Test with NaN
      atomic.set(NaN);
      // NaN !== NaN, so this should fail
      expect(atomic.compareAndSet(NaN, 123)).toBe(false);
    });

    it('compareAndSet provides sequential consistency', () => {
      atomic.set(1);

      // Only one of these should succeed
      const result1 = atomic.compareAndSet(1, 2);
      const result2 = atomic.compareAndSet(1, 3);

      expect(result1 || result2).toBe(true);
      expect(result1 && result2).toBe(false);

      const finalValue = atomic.get();
      expect(finalValue === 2 || finalValue === 3).toBe(true);
    });
  });

  describe('Update Function Operations', () => {
    it('getAndUpdate applies function and returns old value', () => {
      atomic.set(10);
      const oldValue = atomic.getAndUpdate(x => x * 2);

      expect(oldValue).toBe(10);
      expect(atomic.get()).toBe(20);
    });

    it('updateAndGet applies function and returns new value', () => {
      atomic.set(10);
      const newValue = atomic.updateAndGet(x => x * 2);

      expect(newValue).toBe(20);
      expect(atomic.get()).toBe(20);
    });

    it('handles complex update functions', () => {
      atomic.set(5);

      // Quadratic function: x^2 + 2x + 1
      const quadratic = (x: number) => x * x + 2 * x + 1;

      const oldValue = atomic.getAndUpdate(quadratic);
      expect(oldValue).toBe(5);
      expect(atomic.get()).toBe(36); // 5^2 + 2*5 + 1 = 36

      const newValue = atomic.updateAndGet(x => Math.sqrt(x));
      expect(newValue).toBe(6);
      expect(atomic.get()).toBe(6);
    });

    it('handles update functions that return same value', () => {
      atomic.set(42);

      const identity = (x: number) => x;

      expect(atomic.getAndUpdate(identity)).toBe(42);
      expect(atomic.get()).toBe(42);

      expect(atomic.updateAndGet(identity)).toBe(42);
      expect(atomic.get()).toBe(42);
    });

    it('handles update functions with floating point operations', () => {
      atomic.set(10.0);

      const trigUpdate = (x: number) => Math.sin(x) * 100;

      atomic.updateAndGet(trigUpdate);
      const result = atomic.get();

      expect(result).toBeCloseTo(Math.sin(10.0) * 100, 10);
    });

    it('retry mechanism works for update functions', () => {
      atomic.set(1);
      let callCount = 0;

      const incrementCounter = (x: number) => {
        callCount++;
        return x + 1;
      };

      atomic.updateAndGet(incrementCounter);

      expect(callCount).toBeGreaterThanOrEqual(1);
      expect(atomic.get()).toBe(2);
    });
  });

  describe('Type Conversion Methods', () => {
    it('intValue returns truncated integer value', () => {
      const testCases = [
        { input: 42.0, expected: 42 },
        { input: 42.7, expected: 42 },
        { input: -42.7, expected: -42 },
        { input: 0.9, expected: 0 },
        { input: -0.9, expected: -0 }
      ];

      testCases.forEach(({ input, expected }) => {
        atomic.set(input);
        expect(atomic.intValue()).toBe(expected);
      });
    });

    it("longValue returns truncated long value", () => {
      const atomic1 = new AtomicNumber(Number.MAX_SAFE_INTEGER + 0.99);
      expect(atomic1.longValue()).toBe(
        Math.trunc(Number.MAX_SAFE_INTEGER + 0.99)
      );

      const atomic2 = new AtomicNumber(-123.456);
      expect(atomic2.longValue()).toBe(-123);
    });

    it('floatValue returns current value as float', () => {
      const floatValue = 3.14159;
      atomic.set(floatValue);
      expect(atomic.floatValue()).toBe(floatValue);
    });

    it('doubleValue returns current value as double', () => {
      const doubleValue = Math.PI;
      atomic.set(doubleValue);
      expect(atomic.doubleValue()).toBe(doubleValue);
    });

    it('toString returns string representation', () => {
      const testValues = [0, 42, -17, 3.14159, Number.MAX_SAFE_INTEGER];

      testValues.forEach(value => {
        atomic.set(value);
        expect(atomic.toString()).toBe(value.toString());
      });
    });
  });

  describe('Type Aliases and Factory Functions', () => {
    it('AtomicLong factory creates truncated integer AtomicNumber', () => {
      const atomicLong = AtomicLong.create(42.7);
      expect(atomicLong.get()).toBe(42);
      expect(atomicLong).toBeInstanceOf(AtomicNumber);
    });

    it('AtomicDouble factory creates AtomicNumber with precise value', () => {
      const atomicDouble = AtomicDouble.create(3.14159);
      expect(atomicDouble.get()).toBe(3.14159);
      expect(atomicDouble).toBeInstanceOf(AtomicNumber);
    });

    it('AtomicInteger factory creates truncated integer AtomicNumber', () => {
      const atomicInt = AtomicInteger.create(-42.9);
      expect(atomicInt.get()).toBe(-42);
      expect(atomicInt).toBeInstanceOf(AtomicNumber);
    });

    it('factory functions handle default values correctly', () => {
      expect(AtomicLong.create().get()).toBe(0);
      expect(AtomicDouble.create().get()).toBe(0);
      expect(AtomicInteger.create().get()).toBe(0);
    });
  });

  describe('SharedArrayBuffer vs Fallback Behavior', () => {
    it('works regardless of SharedArrayBuffer availability', () => {
      // Test that basic operations work in both modes
      const atomic1 = new AtomicNumber(100);

      expect(atomic1.get()).toBe(100);
      expect(atomic1.incrementAndGet()).toBe(101);
      expect(atomic1.compareAndSet(101, 200)).toBe(true);
      expect(atomic1.get()).toBe(200);
    });

    it('maintains consistency across different operation types', () => {
      const atomic = new AtomicNumber(0);

      // Mix different types of operations
      atomic.set(10);
      expect(atomic.getAndIncrement()).toBe(10);
      expect(atomic.addAndGet(5)).toBe(16);
      expect(atomic.compareAndSet(16, 20)).toBe(true);
      expect(atomic.updateAndGet(x => x / 2)).toBe(10);
      expect(atomic.get()).toBe(10);
    });
  });

  describe('Stress Testing and Performance', () => {
    it('handles rapid sequential operations', () => {
      const iterations = 10000;
      atomic.set(0);

      for (let i = 0; i < iterations; i++) {
        atomic.incrementAndGet();
      }

      expect(atomic.get()).toBe(iterations);
    });

    it('handles mixed operation patterns', () => {
      atomic.set(1000);

      for (let i = 0; i < 100; i++) {
        const operation = i % 4;
        switch (operation) {
          case 0:
            atomic.incrementAndGet();
            break;
          case 1:
            atomic.decrementAndGet();
            break;
          case 2:
            atomic.addAndGet(i);
            break;
          case 3:
            atomic.updateAndGet(x => Math.abs(x));
            break;
        }
      }

      // Should still have a valid number
      expect(typeof atomic.get()).toBe('number');
      expect(Number.isFinite(atomic.get())).toBe(true);
    });

    it('maintains precision under stress', () => {
      atomic.set(0.1);

      for (let i = 0; i < 1000; i++) {
        atomic.addAndGet(0.001);
      }

      // Should be close to 1.1 (0.1 + 1000 * 0.001)
      expect(atomic.get()).toBeCloseTo(1.1, 10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles overflow scenarios gracefully', () => {
      atomic.set(Number.MAX_SAFE_INTEGER);

      // Should not throw, but behavior may vary
      expect(() => {
        atomic.incrementAndGet();
      }).not.toThrow();
    });

    it('handles underflow scenarios gracefully', () => {
      atomic.set(Number.MIN_SAFE_INTEGER);

      expect(() => {
        atomic.decrementAndGet();
      }).not.toThrow();
    });

    it('handles special numeric values', () => {
      const specialValues = [
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN,
        Number.EPSILON,
        -0
      ];

      specialValues.forEach(value => {
        expect(() => {
          atomic.set(value);
          atomic.get();
          atomic.incrementAndGet();
          atomic.compareAndSet(atomic.get(), 42);
        }).not.toThrow();
      });
    });
  });
});
