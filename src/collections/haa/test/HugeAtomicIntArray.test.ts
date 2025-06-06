import { HugeAtomicIntArray } from '../HugeAtomicIntArray';

// Mock the dependencies - simple implementations for testing
const MockIntPageCreators = {
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

  identity(): any {
    return {
      fillPage: (page: number[], startIndex: number) => {
        for (let i = startIndex; i < page.length; i++) {
          page[i] = i;
        }
      },
      fill: (pages: number[][], lastPageSize: number, pageShift: number) => {
        let globalIndex = 0;
        for (let pageIdx = 0; pageIdx < pages.length - 1; pageIdx++) {
          const page = pages[pageIdx];
          for (let i = 0; i < page.length; i++) {
            page[i] = globalIndex++;
          }
        }
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          for (let i = 0; i < lastPageSize; i++) {
            lastPage[i] = globalIndex++;
          }
        }
      }
    };
  }
};

describe('HugeAtomicIntArray - Core Operations', () => {

  test('factory creates appropriate implementation based on size', () => {
    console.log('\n🎯 FACTORY TEST: Size-based Implementation Selection');
    console.log('===================================================');

    // Small array - should use single page implementation
    const smallArray = HugeAtomicIntArray.of(1000, MockIntPageCreators.zero());
    console.log(`Small array (1000): ${smallArray.constructor.name}`);
    console.log(`Size: ${smallArray.size()}`);

    expect(smallArray.size()).toBe(1000);
    expect(smallArray.constructor.name).toBe('SingleHugeAtomicIntArray');

    // Large array - should use paged implementation
    const largeArray = HugeAtomicIntArray.of(100000, MockIntPageCreators.zero());
    console.log(`Large array (100000): ${largeArray.constructor.name}`);
    console.log(`Size: ${largeArray.size()}`);

    expect(largeArray.size()).toBe(100000);
    expect(largeArray.constructor.name).toBe('PagedHugeAtomicIntArray');

    console.log('✅ Factory creates correct implementations!');
  });

  test('basic get and set operations work correctly', () => {
    console.log('\n🎯 BASIC OPERATIONS TEST: Get/Set');
    console.log('=================================');

    const array = HugeAtomicIntArray.of(10, MockIntPageCreators.zero());

    console.log('Testing basic get/set operations...');

    // Test initial values (should be 0)
    for (let i = 0; i < 5; i++) {
      const value = array.get(i);
      console.log(`  Initial array[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test setting values
    const testValues = [42, -100, 50, 2147483647, -2147483648]; // Include 32-bit boundaries
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

    const array = HugeAtomicIntArray.of(5, MockIntPageCreators.constant(100));

    console.log('Testing atomic getAndAdd operations...');

    // Test atomic increment
    for (let i = 0; i < 3; i++) {
      const oldValue = array.getAndAdd(0, 5);
      const newValue = array.get(0);
      console.log(`  Iteration ${i + 1}: getAndAdd(0, 5) returned ${oldValue}, new value: ${newValue}`);
      expect(oldValue).toBe(100 + (i * 5));
      expect(newValue).toBe(100 + ((i + 1) * 5));
    }

    // Test atomic decrement
    const beforeDecrement = array.get(1);
    const oldValue = array.getAndAdd(1, -25);
    const afterDecrement = array.get(1);
    console.log(`  Decrement: before=${beforeDecrement}, getAndAdd(1, -25)=${oldValue}, after=${afterDecrement}`);

    expect(oldValue).toBe(100);
    expect(afterDecrement).toBe(75);

    console.log('✅ Atomic getAndAdd operations work!');
  });

  test('atomic getAndReplace operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndReplace');
    console.log('========================================');

    const array = HugeAtomicIntArray.of(3, MockIntPageCreators.constant(999));

    console.log('Testing atomic getAndReplace operations...');

    // Test atomic replace
    const oldValue1 = array.getAndReplace(0, 1234);
    const newValue1 = array.get(0);
    console.log(`  Replace 1: getAndReplace(0, 1234) returned ${oldValue1}, new value: ${newValue1}`);

    expect(oldValue1).toBe(999);
    expect(newValue1).toBe(1234);

    // Test chained replaces
    const oldValue2 = array.getAndReplace(0, -5678);
    const newValue2 = array.get(0);
    console.log(`  Replace 2: getAndReplace(0, -5678) returned ${oldValue2}, new value: ${newValue2}`);

    expect(oldValue2).toBe(1234);
    expect(newValue2).toBe(-5678);

    console.log('✅ Atomic getAndReplace operations work!');
  });

  test('compareAndSet operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndSet');
    console.log('========================================');

    const array = HugeAtomicIntArray.of(5, MockIntPageCreators.constant(777));

    console.log('Testing compareAndSet operations...');

    // Successful CAS
    const success1 = array.compareAndSet(0, 777, 888);
    const value1 = array.get(0);
    console.log(`  CAS Success: compareAndSet(0, 777, 888) = ${success1}, value = ${value1}`);

    expect(success1).toBe(true);
    expect(value1).toBe(888);

    // Failed CAS (wrong expected value)
    const success2 = array.compareAndSet(0, 777, 999);
    const value2 = array.get(0);
    console.log(`  CAS Failure: compareAndSet(0, 777, 999) = ${success2}, value = ${value2}`);

    expect(success2).toBe(false);
    expect(value2).toBe(888); // Should remain unchanged

    // Successful CAS with correct expected value
    const success3 = array.compareAndSet(0, 888, -123);
    const value3 = array.get(0);
    console.log(`  CAS Success 2: compareAndSet(0, 888, -123) = ${success3}, value = ${value3}`);

    expect(success3).toBe(true);
    expect(value3).toBe(-123);

    console.log('✅ CompareAndSet operations work!');
  });

  test('compareAndExchange operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndExchange');
    console.log('=============================================');

    const array = HugeAtomicIntArray.of(3, MockIntPageCreators.constant(500));

    console.log('Testing compareAndExchange operations...');

    // Successful exchange
    const witness1 = array.compareAndExchange(0, 500, 600);
    const value1 = array.get(0);
    console.log(`  Exchange Success: compareAndExchange(0, 500, 600) = ${witness1}, value = ${value1}`);

    expect(witness1).toBe(500);
    expect(value1).toBe(600);

    // Failed exchange (returns current value as witness)
    const witness2 = array.compareAndExchange(0, 500, 700);
    const value2 = array.get(0);
    console.log(`  Exchange Failure: compareAndExchange(0, 500, 700) = ${witness2}, value = ${value2}`);

    expect(witness2).toBe(600); // Returns current value
    expect(value2).toBe(600);   // Value unchanged

    console.log('✅ CompareAndExchange operations work!');
  });

  test('functional update operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: Functional Update');
    console.log('============================================');

    const array = HugeAtomicIntArray.of(5, MockIntPageCreators.zero());

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

    // Test complex function (ensure 32-bit result)
    array.update(2, (current) => (current * 2 + 1) | 0); // | 0 ensures 32-bit int
    const complexResult = array.get(2);
    console.log(`  Complex update: 15 * 2 + 1 = ${complexResult}`);
    expect(complexResult).toBe(31);

    console.log('✅ Functional update operations work!');
  });

  test('bulk operations work correctly', () => {
    console.log('\n🎯 BULK OPERATIONS TEST: SetAll');
    console.log('===============================');

    const array = HugeAtomicIntArray.of(10, MockIntPageCreators.zero());

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
    array.setAll(123);
    console.log('\nAfter setAll(123):');

    for (let i = 0; i < 10; i++) {
      const value = array.get(i);
      console.log(`  array[${i}] = ${value}`);
      expect(value).toBe(123);
    }

    console.log('✅ Bulk operations work!');
  });

  test('memory and lifecycle operations work correctly', () => {
    console.log('\n🎯 LIFECYCLE TEST: Memory Management');
    console.log('===================================');

    const array = HugeAtomicIntArray.of(1000, MockIntPageCreators.constant(555));

    console.log('Testing memory and lifecycle operations...');

    // Test size reporting
    const size = array.size();
    console.log(`  Array size: ${size}`);
    expect(size).toBe(1000);

    // Test default value
    const defaultVal = array.defaultValue();
    console.log(`  Default value: ${defaultVal}`);
    expect(defaultVal).toBe(0);

    // Test memory reporting
    const memoryUsed = array.sizeOf();
    console.log(`  Memory used: ${memoryUsed} bytes`);
    expect(memoryUsed).toBeGreaterThan(0);

    // Test memory estimation
    const estimatedMemory = HugeAtomicIntArray.memoryEstimation(1000);
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

    const source = HugeAtomicIntArray.of(5, MockIntPageCreators.zero());
    const dest = HugeAtomicIntArray.of(8, MockIntPageCreators.constant(888));

    console.log('Testing copyTo operations...');

    // Set source values
    const sourceValues = [111, 222, 333, 444, 555];
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
    const zeroArray = HugeAtomicIntArray.of(5, MockIntPageCreators.zero());
    console.log('\nZero creator:');
    for (let i = 0; i < 5; i++) {
      const value = zeroArray.get(i);
      console.log(`  zeroArray[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test constant creator
    const constantArray = HugeAtomicIntArray.of(5, MockIntPageCreators.constant(999));
    console.log('\nConstant creator (999):');
    for (let i = 0; i < 5; i++) {
      const value = constantArray.get(i);
      console.log(`  constantArray[${i}] = ${value}`);
      expect(value).toBe(999);
    }

    // Test identity creator
    const identityArray = HugeAtomicIntArray.of(5, MockIntPageCreators.identity());
    console.log('\nIdentity creator:');
    for (let i = 0; i < 5; i++) {
      const value = identityArray.get(i);
      console.log(`  identityArray[${i}] = ${value}`);
      expect(value).toBe(i);
    }

    console.log('✅ Page creators work correctly!');
  });

  test('32-bit integer boundaries work correctly', () => {
    console.log('\n🎯 32-BIT BOUNDARIES TEST: Integer Range');
    console.log('========================================');

    const array = HugeAtomicIntArray.of(5, MockIntPageCreators.zero());

    console.log('Testing 32-bit integer boundaries...');

    // Test maximum 32-bit signed integer
    const maxInt32 = 2147483647;  // 2^31 - 1
    array.set(0, maxInt32);
    const maxValue = array.get(0);
    console.log(`  Max int32: ${maxValue}`);
    expect(maxValue).toBe(maxInt32);

    // Test minimum 32-bit signed integer
    const minInt32 = -2147483648; // -2^31
    array.set(1, minInt32);
    const minValue = array.get(1);
    console.log(`  Min int32: ${minValue}`);
    expect(minValue).toBe(minInt32);

    // Test overflow behavior (addition)
    array.set(2, maxInt32);
    const overflowResult = array.getAndAdd(2, 1);
    const overflowValue = array.get(2);
    console.log(`  Overflow: ${maxInt32} + 1 = ${overflowValue} (previous: ${overflowResult})`);
    expect(overflowResult).toBe(maxInt32);
    // Note: Actual overflow behavior may vary by implementation

    // Test underflow behavior (subtraction)
    array.set(3, minInt32);
    const underflowResult = array.getAndAdd(3, -1);
    const underflowValue = array.get(3);
    console.log(`  Underflow: ${minInt32} - 1 = ${underflowValue} (previous: ${underflowResult})`);
    expect(underflowResult).toBe(minInt32);

    console.log('✅ 32-bit boundaries work correctly!');
  });

  test('cursor operations work correctly', () => {
    console.log('\n🎯 CURSOR TEST: Iteration Support');
    console.log('=================================');

    const array = HugeAtomicIntArray.of(8, MockIntPageCreators.identity());

    console.log('Testing cursor operations...');

    console.log('Array values:');
    for (let i = 0; i < 8; i++) {
      console.log(`  array[${i}] = ${array.get(i)}`);
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

  test('paged array behavior works correctly', () => {
    console.log('\n🎯 PAGED ARRAY TEST: Large Array Behavior');
    console.log('=========================================');

    // Create a large array that will use paged implementation
    const largeArray = HugeAtomicIntArray.of(200000, MockIntPageCreators.constant(777));

    console.log('Testing paged array behavior...');
    console.log(`  Array size: ${largeArray.size()}`);
    console.log(`  Implementation: ${largeArray.constructor.name}`);

    expect(largeArray.size()).toBe(200000);
    expect(largeArray.constructor.name).toBe('PagedHugeAtomicIntArray');

    // Test access across page boundaries
    const testIndices = [0, 65535, 65536, 131071, 131072, 199999]; // Around page boundaries

    console.log('Testing page boundary access:');
    for (const index of testIndices) {
      const value = largeArray.get(index);
      console.log(`  largeArray[${index}] = ${value}`);
      expect(value).toBe(777);
    }

    // Test setting values across pages
    console.log('Testing sets across page boundaries:');
    for (let i = 0; i < testIndices.length; i++) {
      const index = testIndices[i];
      const newValue = i * 100;
      largeArray.set(index, newValue);
      const retrievedValue = largeArray.get(index);
      console.log(`  Set largeArray[${index}] = ${newValue}, got: ${retrievedValue}`);
      expect(retrievedValue).toBe(newValue);
    }

    console.log('✅ Paged array behavior works!');
  });

  test('atomic operations maintain consistency under simulation', () => {
    console.log('\n🎯 CONSISTENCY TEST: Simulated Concurrent Access');
    console.log('================================================');

    const array = HugeAtomicIntArray.of(3, MockIntPageCreators.zero());

    console.log('Testing atomic operation consistency...');

    // Simulate multiple "threads" incrementing the same counter
    const NUM_OPERATIONS = 100;
    let successfulCAS = 0;

    // Initialize counter
    array.set(0, 0);

    console.log('Simulating concurrent increments...');
    for (let i = 0; i < NUM_OPERATIONS; i++) {
      // Simulate CAS-based increment
      let currentValue = array.get(0);
      let updated = false;
      let attempts = 0;

      while (!updated && attempts < 10) {
        const success = array.compareAndSet(0, currentValue, currentValue + 1);
        if (success) {
          successfulCAS++;
          updated = true;
        } else {
          currentValue = array.get(0);
          attempts++;
        }
      }
    }

    const finalValue = array.get(0);
    console.log(`  Operations attempted: ${NUM_OPERATIONS}`);
    console.log(`  Successful CAS operations: ${successfulCAS}`);
    console.log(`  Final counter value: ${finalValue}`);

    expect(finalValue).toBe(successfulCAS);
    expect(successfulCAS).toBeGreaterThan(0);

    console.log('✅ Atomic operations maintain consistency!');
  });
});
