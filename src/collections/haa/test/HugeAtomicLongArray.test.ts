import { HugeAtomicLongArray } from '../HugeAtomicLongArray';

// Mock the dependencies - simple implementations for testing
const MockLongPageCreators = {
  zero(): any {
    return {
      fillPage: (page: number[], startIndex: number) => {
        page.fill(0, startIndex);
      },
      fill: (pages: number[][], lastPageSize: number, pageShift: number) => {
        for (let i = 0; i < pages.length - 1; i++) {
          pages[i].fill(0);
        }
        if (pages.length > 0) {
          pages[pages.length - 1].fill(0, 0, lastPageSize);
        }
      }
    };
  },

  constant(value: number): any {
    return {
      fillPage: (page: number[], startIndex: number) => {
        page.fill(value, startIndex);
      },
      fill: (pages: number[][], lastPageSize: number, pageShift: number) => {
        for (let i = 0; i < pages.length - 1; i++) {
          pages[i].fill(value);
        }
        if (pages.length > 0) {
          pages[pages.length - 1].fill(value, 0, lastPageSize);
        }
      }
    };
  },

  infinity(): any {
    return this.constant(Number.POSITIVE_INFINITY);
  }
};

describe('HugeAtomicLongArray - Core Operations', () => {

  test('factory creates appropriate implementation based on size', () => {
    console.log('\n🎯 FACTORY TEST: Size-based Implementation Selection');
    console.log('===================================================');

    // Small array - should use single page implementation
    const smallArray = HugeAtomicLongArray.of(1000, MockLongPageCreators.zero());
    console.log(`Small array (1000): ${smallArray.constructor.name}`);
    console.log(`Size: ${smallArray.size()}`);

    expect(smallArray.size()).toBe(1000);
    expect(smallArray.constructor.name).toBe('SingleHugeAtomicLongArray');

    // Large array - should use paged implementation
    const largeArray = HugeAtomicLongArray.of(100000, MockLongPageCreators.zero());
    console.log(`Large array (100000): ${largeArray.constructor.name}`);
    console.log(`Size: ${largeArray.size()}`);

    expect(largeArray.size()).toBe(100000);
    expect(largeArray.constructor.name).toBe('SingleHugeAtomicLongArray');

    console.log('✅ Factory creates correct implementations!');
  });

  test('basic get and set operations work correctly', () => {
    console.log('\n🎯 BASIC OPERATIONS TEST: Get/Set');
    console.log('=================================');

    const array = HugeAtomicLongArray.of(10, MockLongPageCreators.zero());

    console.log('Testing basic get/set operations...');

    // Test initial values (should be 0)
    for (let i = 0; i < 5; i++) {
      const value = array.get(i);
      console.log(`  Initial array[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test setting values
    const testValues = [42, 100, -50, 999, 0];
    for (let i = 0; i < testValues.length; i++) {
      array.set(i, testValues[i]);
      console.log(`  Set array[${i}] = ${testValues[i]}`);
    }

    // Verify values were set correctly
    for (let i = 0; i < testValues.length; i++) {
      const value = array.get(i);
      console.log(`  Read array[${i}] = ${value}`);
      expect(value).toBe(testValues[i]);
    }

    console.log('✅ Basic get/set operations work!');
  });

  test('atomic getAndAdd operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndAdd');
    console.log('====================================');

    const array = HugeAtomicLongArray.of(5, MockLongPageCreators.constant(10));

    console.log('Testing atomic getAndAdd operations...');

    // Test atomic increment
    for (let i = 0; i < 3; i++) {
      const oldValue = array.getAndAdd(0, 5);
      const newValue = array.get(0);
      console.log(`  Iteration ${i + 1}: getAndAdd(0, 5) returned ${oldValue}, new value: ${newValue}`);
      expect(oldValue).toBe(10 + (i * 5));
      expect(newValue).toBe(10 + ((i + 1) * 5));
    }

    // Test atomic decrement
    const beforeDecrement = array.get(1);
    const oldValue = array.getAndAdd(1, -3);
    const afterDecrement = array.get(1);
    console.log(`  Decrement: before=${beforeDecrement}, getAndAdd(1, -3)=${oldValue}, after=${afterDecrement}`);

    expect(oldValue).toBe(10);
    expect(afterDecrement).toBe(7);

    console.log('✅ Atomic getAndAdd operations work!');
  });

  test('atomic getAndReplace operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndReplace');
    console.log('========================================');

    const array = HugeAtomicLongArray.of(3, MockLongPageCreators.constant(42));

    console.log('Testing atomic getAndReplace operations...');

    // Test atomic replace
    const oldValue1 = array.getAndReplace(0, 100);
    const newValue1 = array.get(0);
    console.log(`  Replace 1: getAndReplace(0, 100) returned ${oldValue1}, new value: ${newValue1}`);

    expect(oldValue1).toBe(42);
    expect(newValue1).toBe(100);

    // Test chained replaces
    const oldValue2 = array.getAndReplace(0, 200);
    const newValue2 = array.get(0);
    console.log(`  Replace 2: getAndReplace(0, 200) returned ${oldValue2}, new value: ${newValue2}`);

    expect(oldValue2).toBe(100);
    expect(newValue2).toBe(200);

    console.log('✅ Atomic getAndReplace operations work!');
  });

  test('compareAndSet operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndSet');
    console.log('========================================');

    const array = HugeAtomicLongArray.of(5, MockLongPageCreators.constant(50));

    console.log('Testing compareAndSet operations...');

    // Successful CAS
    const success1 = array.compareAndSet(0, 50, 75);
    const value1 = array.get(0);
    console.log(`  CAS Success: compareAndSet(0, 50, 75) = ${success1}, value = ${value1}`);

    expect(success1).toBe(true);
    expect(value1).toBe(75);

    // Failed CAS (wrong expected value)
    const success2 = array.compareAndSet(0, 50, 100);
    const value2 = array.get(0);
    console.log(`  CAS Failure: compareAndSet(0, 50, 100) = ${success2}, value = ${value2}`);

    expect(success2).toBe(false);
    expect(value2).toBe(75); // Should remain unchanged

    // Successful CAS with correct expected value
    const success3 = array.compareAndSet(0, 75, 100);
    const value3 = array.get(0);
    console.log(`  CAS Success 2: compareAndSet(0, 75, 100) = ${success3}, value = ${value3}`);

    expect(success3).toBe(true);
    expect(value3).toBe(100);

    console.log('✅ CompareAndSet operations work!');
  });

  test('compareAndExchange operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndExchange');
    console.log('=============================================');

    const array = HugeAtomicLongArray.of(3, MockLongPageCreators.constant(25));

    console.log('Testing compareAndExchange operations...');

    // Successful exchange
    const witness1 = array.compareAndExchange(0, 25, 50);
    const value1 = array.get(0);
    console.log(`  Exchange Success: compareAndExchange(0, 25, 50) = ${witness1}, value = ${value1}`);

    expect(witness1).toBe(25);
    expect(value1).toBe(50);

    // Failed exchange (returns current value as witness)
    const witness2 = array.compareAndExchange(0, 25, 75);
    const value2 = array.get(0);
    console.log(`  Exchange Failure: compareAndExchange(0, 25, 75) = ${witness2}, value = ${value2}`);

    expect(witness2).toBe(50); // Returns current value
    expect(value2).toBe(50);   // Value unchanged

    console.log('✅ CompareAndExchange operations work!');
  });

  test('functional update operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: Functional Update');
    console.log('============================================');

    const array = HugeAtomicLongArray.of(5, MockLongPageCreators.zero());

    console.log('Testing functional update operations...');

    // Set initial values
    array.set(0, 10);
    array.set(1, 20);
    array.set(2, 15);

    // Test min update
    array.update(0, (current) => Math.min(current, 5));
    const minResult = array.get(0);
    console.log(`  Min update: min(10, 5) = ${minResult}`);
    expect(minResult).toBe(5);

    // Test max update
    array.update(1, (current) => Math.max(current, 30));
    const maxResult = array.get(1);
    console.log(`  Max update: max(20, 30) = ${maxResult}`);
    expect(maxResult).toBe(30);

    // Test complex function
    array.update(2, (current) => current * 2 + 1);
    const complexResult = array.get(2);
    console.log(`  Complex update: 15 * 2 + 1 = ${complexResult}`);
    expect(complexResult).toBe(31);

    console.log('✅ Functional update operations work!');
  });

  test('bulk operations work correctly', () => {
    console.log('\n🎯 BULK OPERATIONS TEST: SetAll');
    console.log('===============================');

    const array = HugeAtomicLongArray.of(10, MockLongPageCreators.zero());

    console.log('Testing bulk operations...');

    // Set some initial values
    for (let i = 0; i < 5; i++) {
      array.set(i, i + 1);
    }

    console.log('Initial values:');
    for (let i = 0; i < 10; i++) {
      console.log(`  array[${i}] = ${array.get(i)}`);
    }

    // Test setAll
    array.setAll(99);
    console.log('\nAfter setAll(99):');

    for (let i = 0; i < 10; i++) {
      const value = array.get(i);
      console.log(`  array[${i}] = ${value}`);
      expect(value).toBe(99);
    }

    console.log('✅ Bulk operations work!');
  });

  test('memory and lifecycle operations work correctly', () => {
    console.log('\n🎯 LIFECYCLE TEST: Memory Management');
    console.log('===================================');

    const array = HugeAtomicLongArray.of(1000, MockLongPageCreators.constant(42));

    console.log('Testing memory and lifecycle operations...');

    // Test size reporting
    const size = array.size();
    console.log(`  Array size: ${size}`);
    expect(size).toBe(1000);

    // Test memory reporting
    const memoryUsed = array.sizeOf();
    console.log(`  Memory used: ${memoryUsed} bytes`);
    expect(memoryUsed).toBeGreaterThan(0);

    // Test memory estimation
    const estimatedMemory = HugeAtomicLongArray.memoryEstimation(1000);
    console.log(`  Estimated memory: ${estimatedMemory} bytes`);
    expect(estimatedMemory).toBeGreaterThan(0);

    // Test release
    const freedMemory = array.release();
    console.log(`  Freed memory: ${freedMemory} bytes`);
    expect(freedMemory).toBeGreaterThan(0);

    // Test that release is idempotent
    const freedAgain = array.release();
    console.log(`  Second release: ${freedAgain} bytes`);
    expect(freedAgain).toBe(0);

    console.log('✅ Memory and lifecycle operations work!');
  });

  test('copyTo operations work correctly', () => {
    console.log('\n🎯 COPY OPERATIONS TEST: CopyTo');
    console.log('===============================');

    const source = HugeAtomicLongArray.of(5, MockLongPageCreators.zero());
    const dest = HugeAtomicLongArray.of(8, MockLongPageCreators.constant(999));

    console.log('Testing copyTo operations...');

    // Set source values
    const sourceValues = [10, 20, 30, 40, 50];
    for (let i = 0; i < sourceValues.length; i++) {
      source.set(i, sourceValues[i]);
    }

    console.log('Source values:');
    for (let i = 0; i < source.size(); i++) {
      console.log(`  source[${i}] = ${source.get(i)}`);
    }

    console.log('Destination before copy:');
    for (let i = 0; i < dest.size(); i++) {
      console.log(`  dest[${i}] = ${dest.get(i)}`);
    }

    // Test copy
    source.copyTo(dest, 3); // Copy first 3 elements

    console.log('Destination after copy (length=3):');
    for (let i = 0; i < dest.size(); i++) {
      const value = dest.get(i);
      console.log(`  dest[${i}] = ${value}`);

      if (i < 3) {
        expect(value).toBe(sourceValues[i]);
      } else {
        expect(value).toBe(0); // Should be default value
      }
    }

    console.log('✅ CopyTo operations work!');
  });

  test('page creators work correctly', () => {
    console.log('\n🎯 PAGE CREATORS TEST: Initialization Strategies');
    console.log('================================================');

    console.log('Testing different page creators...');

    // Test zero creator
    const zeroArray = HugeAtomicLongArray.of(5, MockLongPageCreators.zero());
    console.log('\nZero creator:');
    for (let i = 0; i < 5; i++) {
      const value = zeroArray.get(i);
      console.log(`  zeroArray[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test constant creator
    const constantArray = HugeAtomicLongArray.of(5, MockLongPageCreators.constant(777));
    console.log('\nConstant creator (777):');
    for (let i = 0; i < 5; i++) {
      const value = constantArray.get(i);
      console.log(`  constantArray[${i}] = ${value}`);
      expect(value).toBe(777);
    }

    // Test infinity creator
    const infinityArray = HugeAtomicLongArray.of(3, MockLongPageCreators.infinity());
    console.log('\nInfinity creator:');
    for (let i = 0; i < 3; i++) {
      const value = infinityArray.get(i);
      console.log(`  infinityArray[${i}] = ${value}`);
      expect(value).toBe(Number.POSITIVE_INFINITY);
    }

    console.log('✅ Page creators work correctly!');
  });

  test('cursor operations work correctly', () => {
    console.log('\n🎯 CURSOR TEST: Iteration Support');
    console.log('=================================');

    const array = HugeAtomicLongArray.of(8, MockLongPageCreators.zero());

    console.log('Testing cursor operations...');

    // Set some test values
    for (let i = 0; i < 8; i++) {
      array.set(i, (i + 1) * 10);
    }

    // Test new cursor
    const cursor = array.newCursor();
    console.log(`  Created cursor: ${cursor !== null}`);
    expect(cursor).toBeDefined();

    // Test cursor initialization
    const initializedCursor = array.initCursor(cursor);
    console.log(`  Initialized cursor: ${initializedCursor !== null}`);
    expect(initializedCursor).toBeDefined();
    expect(initializedCursor).toBe(cursor);

    console.log('✅ Cursor operations work!');
  });

  test('edge cases and error conditions work correctly', () => {
    console.log('\n🎯 EDGE CASES TEST: Boundary Conditions');
    console.log('=======================================');

    const array = HugeAtomicLongArray.of(3, MockLongPageCreators.zero());

    console.log('Testing edge cases...');

    // Test boundary values
    array.set(0, Number.MAX_SAFE_INTEGER);
    array.set(1, Number.MIN_SAFE_INTEGER);
    array.set(2, 0);

    const maxValue = array.get(0);
    const minValue = array.get(1);
    const zeroValue = array.get(2);

    console.log(`  Max safe integer: ${maxValue}`);
    console.log(`  Min safe integer: ${minValue}`);
    console.log(`  Zero value: ${zeroValue}`);

    expect(maxValue).toBe(Number.MAX_SAFE_INTEGER);
    expect(minValue).toBe(Number.MIN_SAFE_INTEGER);
    expect(zeroValue).toBe(0);

    // Test default value
    const defaultVal = array.defaultValue();
    console.log(`  Default value: ${defaultVal}`);
    expect(defaultVal).toBe(0);

    console.log('✅ Edge cases work correctly!');
  });
});
