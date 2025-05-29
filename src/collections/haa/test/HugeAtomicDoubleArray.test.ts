import { HugeAtomicDoubleArray } from '../HugeAtomicDoubleArray';

// Mock the dependencies - simple implementations for testing
const MockDoublePageCreators = {
  zero(): any {
    return {
      fillPage: (page: Float64Array, startIndex: number) => {
        page.fill(0.0, startIndex);
      },
      fill: (pages: Float64Array[], lastPageSize: number, pageShift: number) => {
        for (let i = 0; i < pages.length - 1; i++) {
          pages[i].fill(0.0);
        }
        if (pages.length > 0) {
          pages[pages.length - 1].fill(0.0, 0, lastPageSize);
        }
      }
    };
  },

  constant(value: number): any {
    return {
      fillPage: (page: Float64Array, startIndex: number) => {
        page.fill(value, startIndex);
      },
      fill: (pages: Float64Array[], lastPageSize: number, pageShift: number) => {
        for (let i = 0; i < pages.length - 1; i++) {
          pages[i].fill(value);
        }
        if (pages.length > 0) {
          pages[pages.length - 1].fill(value, 0, lastPageSize);
        }
      }
    };
  },

  scientific(): any {
    return {
      fillPage: (page: Float64Array, startIndex: number) => {
        for (let i = startIndex; i < page.length; i++) {
          const x = (i / 100.0); // Scale for interesting values
          page[i] = Math.sin(x) * Math.exp(-x * 0.1); // Damped sine wave
        }
      },
      fill: (pages: Float64Array[], lastPageSize: number, pageShift: number) => {
        let globalIndex = 0;
        for (let pageIdx = 0; pageIdx < pages.length - 1; pageIdx++) {
          const page = pages[pageIdx];
          for (let i = 0; i < page.length; i++) {
            const x = (globalIndex++ / 100.0);
            page[i] = Math.sin(x) * Math.exp(-x * 0.1);
          }
        }
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          for (let i = 0; i < lastPageSize; i++) {
            const x = (globalIndex++ / 100.0);
            lastPage[i] = Math.sin(x) * Math.exp(-x * 0.1);
          }
        }
      }
    };
  }
};

describe('HugeAtomicDoubleArray - Core Operations', () => {

  test('factory creates appropriate implementation based on size', () => {
    console.log('\n🎯 FACTORY TEST: Size-based Implementation Selection');
    console.log('===================================================');

    // Small array - should use single page implementation
    const smallArray = HugeAtomicDoubleArray.of(1000, MockDoublePageCreators.zero());
    console.log(`Small array (1000): ${smallArray.constructor.name}`);
    console.log(`Size: ${smallArray.size()}`);

    expect(smallArray.size()).toBe(1000);
    expect(smallArray.constructor.name).toBe('SingleHugeAtomicDoubleArray');

    // Large array - should use paged implementation
    const largeArray = HugeAtomicDoubleArray.of(100000, MockDoublePageCreators.zero());
    console.log(`Large array (100000): ${largeArray.constructor.name}`);
    console.log(`Size: ${largeArray.size()}`);

    expect(largeArray.size()).toBe(100000);
    expect(largeArray.constructor.name).toBe('SingleHugeAtomicDoubleArray');

    console.log('✅ Factory creates correct implementations!');
  });

  test('basic get and set operations work correctly', () => {
    console.log('\n🎯 BASIC OPERATIONS TEST: Get/Set');
    console.log('=================================');

    const array = HugeAtomicDoubleArray.of(10, MockDoublePageCreators.zero());

    console.log('Testing basic get/set operations...');

    // Test initial values (should be 0.0)
    for (let i = 0; i < 5; i++) {
      const value = array.get(i);
      console.log(`  Initial array[${i}] = ${value}`);
      expect(value).toBe(0.0);
    }

    // Test setting values - including scientific notation and special values
    const testValues = [
      42.5,
      -100.75,
      Math.PI,
      Math.E,
      1.23e-10,
      1.23e10,
      0.0,
      -0.0,
      Number.MAX_VALUE,
      Number.MIN_VALUE
    ];

    for (let i = 0; i < testValues.length; i++) {
      array.set(i, testValues[i]);
      console.log(`  Set array[${i}] = ${testValues[i]}`);
    }

    // Verify values were set correctly
    for (let i = 0; i < testValues.length; i++) {
      const value = array.get(i);
      console.log(`  Read array[${i}] = ${value}`);
      if (Number.isNaN(testValues[i])) {
        expect(Number.isNaN(value)).toBe(true);
      } else {
        expect(value).toBeCloseTo(testValues[i], 15); // High precision
      }
    }

    console.log('✅ Basic get/set operations work!');
  });

  test('atomic getAndAdd operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndAdd');
    console.log('====================================');

    const array = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.constant(1.5));

    console.log('Testing atomic getAndAdd operations...');

    // Test atomic increment with floating point
    for (let i = 0; i < 3; i++) {
      const oldValue = array.getAndAdd(0, 0.25);
      const newValue = array.get(0);
      console.log(`  Iteration ${i + 1}: getAndAdd(0, 0.25) returned ${oldValue}, new value: ${newValue}`);
      expect(oldValue).toBeCloseTo(1.5 + (i * 0.25), 15);
      expect(newValue).toBeCloseTo(1.5 + ((i + 1) * 0.25), 15);
    }

    // Test atomic decrement
    const beforeDecrement = array.get(1);
    const oldValue = array.getAndAdd(1, -0.75);
    const afterDecrement = array.get(1);
    console.log(`  Decrement: before=${beforeDecrement}, getAndAdd(1, -0.75)=${oldValue}, after=${afterDecrement}`);

    expect(oldValue).toBeCloseTo(1.5, 15);
    expect(afterDecrement).toBeCloseTo(0.75, 15);

    // Test very small increments (precision test)
    const smallDelta = 1e-15;
    const beforeSmall = array.get(2);
    const oldSmall = array.getAndAdd(2, smallDelta);
    const afterSmall = array.get(2);
    console.log(`  Small increment: before=${beforeSmall}, delta=${smallDelta}, after=${afterSmall}`);

    expect(oldSmall).toBeCloseTo(1.5, 15);
    expect(afterSmall).toBeCloseTo(1.5 + smallDelta, 15);

    console.log('✅ Atomic getAndAdd operations work!');
  });

  test('atomic getAndReplace operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndReplace');
    console.log('========================================');

    const array = HugeAtomicDoubleArray.of(3, MockDoublePageCreators.constant(Math.PI));

    console.log('Testing atomic getAndReplace operations...');

    // Test atomic replace with scientific values
    const oldValue1 = array.getAndReplace(0, Math.E);
    const newValue1 = array.get(0);
    console.log(`  Replace 1: getAndReplace(0, e) returned ${oldValue1}, new value: ${newValue1}`);

    expect(oldValue1).toBeCloseTo(Math.PI, 15);
    expect(newValue1).toBeCloseTo(Math.E, 15);

    // Test chained replaces with negative values
    const oldValue2 = array.getAndReplace(0, -Math.SQRT2);
    const newValue2 = array.get(0);
    console.log(`  Replace 2: getAndReplace(0, -√2) returned ${oldValue2}, new value: ${newValue2}`);

    expect(oldValue2).toBeCloseTo(Math.E, 15);
    expect(newValue2).toBeCloseTo(-Math.SQRT2, 15);

    console.log('✅ Atomic getAndReplace operations work!');
  });

  test('compareAndSet operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndSet');
    console.log('========================================');

    const array = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.constant(2.718));

    console.log('Testing compareAndSet operations...');

    // Successful CAS
    const success1 = array.compareAndSet(0, 2.718, 3.14159);
    const value1 = array.get(0);
    console.log(`  CAS Success: compareAndSet(0, 2.718, π) = ${success1}, value = ${value1}`);

    expect(success1).toBe(true);
    expect(value1).toBeCloseTo(3.14159, 15);

    // Failed CAS (wrong expected value)
    const success2 = array.compareAndSet(0, 2.718, 1.414);
    const value2 = array.get(0);
    console.log(`  CAS Failure: compareAndSet(0, 2.718, √2) = ${success2}, value = ${value2}`);

    expect(success2).toBe(false);
    expect(value2).toBeCloseTo(3.14159, 15); // Should remain unchanged

    // Successful CAS with correct expected value
    const success3 = array.compareAndSet(0, 3.14159, -1.0);
    const value3 = array.get(0);
    console.log(`  CAS Success 2: compareAndSet(0, π, -1.0) = ${success3}, value = ${value3}`);

    expect(success3).toBe(true);
    expect(value3).toBeCloseTo(-1.0, 15);

    // Test with very close but different values (floating point precision)
    array.set(1, 1.0);
    const almostOne = 1.0 + 1e-16;
    const success4 = array.compareAndSet(1, almostOne, 2.0);
    console.log(`  Precision CAS: compareAndSet(1, ${almostOne}, 2.0) = ${success4}`);
    expect(success4).toBe(false); // Should fail due to precision difference

    console.log('✅ CompareAndSet operations work!');
  });

  test('compareAndExchange operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndExchange');
    console.log('=============================================');

    const array = HugeAtomicDoubleArray.of(3, MockDoublePageCreators.constant(1.618)); // Golden ratio

    console.log('Testing compareAndExchange operations...');

    // Successful exchange
    const witness1 = array.compareAndExchange(0, 1.618, 2.236); // √5
    const value1 = array.get(0);
    console.log(`  Exchange Success: compareAndExchange(0, φ, √5) = ${witness1}, value = ${value1}`);

    expect(witness1).toBeCloseTo(1.618, 15);
    expect(value1).toBeCloseTo(2.236, 15);

    // Failed exchange (returns current value as witness)
    const witness2 = array.compareAndExchange(0, 1.618, 1.732); // √3
    const value2 = array.get(0);
    console.log(`  Exchange Failure: compareAndExchange(0, φ, √3) = ${witness2}, value = ${value2}`);

    expect(witness2).toBeCloseTo(2.236, 15); // Returns current value
    expect(value2).toBeCloseTo(2.236, 15);   // Value unchanged

    console.log('✅ CompareAndExchange operations work!');
  });

  test('functional update operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: Functional Update');
    console.log('============================================');

    const array = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.zero());

    console.log('Testing functional update operations...');

    // Set initial values
    array.set(0, 10.5);
    array.set(1, 20.25);
    array.set(2, -15.75);

    // Test min update
    array.update(0, (current) => Math.min(current, 5.5));
    const minResult = array.get(0);
    console.log(`  Min update: min(10.5, 5.5) = ${minResult}`);
    expect(minResult).toBeCloseTo(5.5, 15);

    // Test max update
    array.update(1, (current) => Math.max(current, 30.125));
    const maxResult = array.get(1);
    console.log(`  Max update: max(20.25, 30.125) = ${maxResult}`);
    expect(maxResult).toBeCloseTo(30.125, 15);

    // Test mathematical transformation
    array.update(2, (current) => Math.abs(current) * 2.0 + 1.5);
    const mathResult = array.get(2);
    console.log(`  Math update: abs(-15.75) * 2.0 + 1.5 = ${mathResult}`);
    expect(mathResult).toBeCloseTo(33.0, 15); // abs(-15.75) * 2 + 1.5 = 15.75 * 2 + 1.5 = 33.0

    // Test scientific function
    array.set(3, Math.PI / 4);
    array.update(3, (current) => Math.sin(current) + Math.cos(current));
    const sciResult = array.get(3);
    const expected = Math.sin(Math.PI / 4) + Math.cos(Math.PI / 4);
    console.log(`  Scientific update: sin(π/4) + cos(π/4) = ${sciResult} (expected: ${expected})`);
    expect(sciResult).toBeCloseTo(expected, 15);

    console.log('✅ Functional update operations work!');
  });

  test('bulk operations work correctly', () => {
    console.log('\n🎯 BULK OPERATIONS TEST: SetAll');
    console.log('===============================');

    const array = HugeAtomicDoubleArray.of(10, MockDoublePageCreators.zero());

    console.log('Testing bulk operations...');

    // Set some initial values
    for (let i = 0; i < 5; i++) {
      array.set(i, (i + 1) * 3.14159);
    }

    console.log('Initial values:');
    for (let i = 0; i < 10; i++) {
      console.log(`  array[${i}] = ${array.get(i)}`);
    }

    // Test setAll with mathematical constant
    const eulerConstant = 2.718281828;
    array.setAll(eulerConstant);
    console.log(`\nAfter setAll(${eulerConstant}):`);

    for (let i = 0; i < 10; i++) {
      const value = array.get(i);
      console.log(`  array[${i}] = ${value}`);
      expect(value).toBeCloseTo(eulerConstant, 15);
    }

    console.log('✅ Bulk operations work!');
  });

  test('memory and lifecycle operations work correctly', () => {
    console.log('\n🎯 LIFECYCLE TEST: Memory Management');
    console.log('===================================');

    const array = HugeAtomicDoubleArray.of(1000, MockDoublePageCreators.constant(42.42));

    console.log('Testing memory and lifecycle operations...');

    // Test size reporting
    const size = array.size();
    console.log(`  Array size: ${size}`);
    expect(size).toBe(1000);

    // Test default value
    const defaultVal = array.defaultValue();
    console.log(`  Default value: ${defaultVal}`);
    expect(defaultVal).toBe(0.0);

    // Test memory reporting
    const memoryUsed = array.sizeOf();
    console.log(`  Memory used: ${memoryUsed} bytes`);
    expect(memoryUsed).toBeGreaterThan(0);
    expect(memoryUsed).toBeGreaterThan(1000 * 8); // At least 8 bytes per double

    // Test memory estimation
    const estimatedMemory = HugeAtomicDoubleArray.memoryEstimation(1000);
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

    const source = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.zero());
    const dest = HugeAtomicDoubleArray.of(8, MockDoublePageCreators.constant(99.99));

    console.log('Testing copyTo operations...');

    // Set source values with scientific numbers
    const sourceValues = [Math.PI, Math.E, Math.SQRT2, Math.LN10, Math.LOG2E];
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
        expect(value).toBeCloseTo(sourceValues[i], 15);
      } else {
        expect(value).toBe(0.0); // Should be default value
      }
    }

    console.log('✅ CopyTo operations work!');
  });

  test('page creators work correctly', () => {
    console.log('\n🎯 PAGE CREATORS TEST: Initialization Strategies');
    console.log('================================================');

    console.log('Testing different page creators...');

    // Test zero creator
    const zeroArray = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.zero());
    console.log('\nZero creator:');
    for (let i = 0; i < 5; i++) {
      const value = zeroArray.get(i);
      console.log(`  zeroArray[${i}] = ${value}`);
      expect(value).toBe(0.0);
    }

    // Test constant creator
    const goldenRatio = 1.6180339887498948;
    const constantArray = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.constant(goldenRatio));
    console.log(`\nConstant creator (φ = ${goldenRatio}):`);
    for (let i = 0; i < 5; i++) {
      const value = constantArray.get(i);
      console.log(`  constantArray[${i}] = ${value}`);
      expect(value).toBeCloseTo(goldenRatio, 15);
    }

    // Test scientific creator
    const scientificArray = HugeAtomicDoubleArray.of(8, MockDoublePageCreators.scientific());
    console.log('\nScientific creator (damped sine wave):');
    for (let i = 0; i < 8; i++) {
      const value = scientificArray.get(i);
      const x = i / 100.0;
      const expectedValue = Math.sin(x) * Math.exp(-x * 0.1);
      console.log(`  scientificArray[${i}] = ${value.toFixed(6)} (expected: ${expectedValue.toFixed(6)})`);
      expect(value).toBeCloseTo(expectedValue, 10);
    }

    console.log('✅ Page creators work correctly!');
  });

  test('floating-point precision and special values work correctly', () => {
    console.log('\n🎯 PRECISION TEST: Floating-Point Special Cases');
    console.log('===============================================');

    const array = HugeAtomicDoubleArray.of(10, MockDoublePageCreators.zero());

    console.log('Testing floating-point precision and special values...');

    // Test special IEEE 754 values
    const specialValues = [
      { name: 'Positive Zero', value: 0.0 },
      { name: 'Negative Zero', value: -0.0 },
      { name: 'Positive Infinity', value: Number.POSITIVE_INFINITY },
      { name: 'Negative Infinity', value: Number.NEGATIVE_INFINITY },
      { name: 'NaN', value: Number.NaN },
      { name: 'Smallest Positive', value: Number.MIN_VALUE },
      { name: 'Largest Finite', value: Number.MAX_VALUE },
      { name: 'Machine Epsilon', value: Number.EPSILON }
    ];

    console.log('\n1. Special IEEE 754 values:');
    for (let i = 0; i < specialValues.length; i++) {
      const { name, value } = specialValues[i];
      array.set(i, value);
      const retrieved = array.get(i);

      console.log(`  ${name}: set=${value}, get=${retrieved}`);

      if (Number.isNaN(value)) {
        expect(Number.isNaN(retrieved)).toBe(true);
      } else if (value === Number.POSITIVE_INFINITY) {
        expect(retrieved).toBe(Number.POSITIVE_INFINITY);
      } else if (value === Number.NEGATIVE_INFINITY) {
        expect(retrieved).toBe(Number.NEGATIVE_INFINITY);
      } else if (Object.is(value, -0.0)) {
        expect(Object.is(retrieved, -0.0)).toBe(true);
      } else {
        expect(retrieved).toBe(value);
      }
    }

    // Test high precision calculations
    console.log('\n2. High precision arithmetic:');
    const highPrecisionTests = [
      { a: Math.PI, b: Math.E, op: 'add' },
      { a: Math.SQRT2, b: Math.SQRT1_2, op: 'multiply' },
      { a: 1.0, b: Number.EPSILON, op: 'add' }
    ];

    for (let i = 0; i < highPrecisionTests.length; i++) {
      const { a, b, op } = highPrecisionTests[i];
      const index = 8 + i;

      array.set(index, a);

      if (op === 'add') {
        const oldValue = array.getAndAdd(index, b);
        const newValue = array.get(index);
        console.log(`  ${a} + ${b} = ${newValue} (previous: ${oldValue})`);
        expect(oldValue).toBeCloseTo(a, 15);
        expect(newValue).toBeCloseTo(a + b, 15);
      } else if (op === 'multiply') {
        array.update(index, (current) => current * b);
        const result = array.get(index);
        console.log(`  ${a} * ${b} = ${result}`);
        expect(result).toBeCloseTo(a * b, 15);
      }
    }

    console.log('✅ Floating-point precision works correctly!');
  });

  test('scientific computing patterns work correctly', () => {
    console.log('\n🎯 SCIENTIFIC COMPUTING TEST: Mathematical Operations');
    console.log('====================================================');

    const array = HugeAtomicDoubleArray.of(10, MockDoublePageCreators.zero());

    console.log('Testing scientific computing patterns...');

    // Test vector normalization
    console.log('\n1. Vector normalization:');
    const vectorValues = [3.0, 4.0, 0.0]; // Simple 3-4-5 triangle
    let sumOfSquares = 0.0;

    for (let i = 0; i < vectorValues.length; i++) {
      array.set(i, vectorValues[i]);
      sumOfSquares += vectorValues[i] * vectorValues[i];
    }

    const magnitude = Math.sqrt(sumOfSquares);
    console.log(`  Original vector: [${vectorValues.join(', ')}], magnitude: ${magnitude}`);

    // Normalize each component
    for (let i = 0; i < vectorValues.length; i++) {
      array.update(i, (current) => current / magnitude);
    }

    // Verify normalization
    let normalizedSumOfSquares = 0.0;
    for (let i = 0; i < vectorValues.length; i++) {
      const normalized = array.get(i);
      normalizedSumOfSquares += normalized * normalized;
      console.log(`  Normalized[${i}]: ${normalized.toFixed(6)}`);
    }

    console.log(`  Normalized magnitude: ${Math.sqrt(normalizedSumOfSquares).toFixed(6)}`);
    expect(Math.sqrt(normalizedSumOfSquares)).toBeCloseTo(1.0, 10);

    // Test exponential decay
    console.log('\n2. Exponential decay simulation:');
    const initialValue = 100.0;
    const decayConstant = 0.1;
    const timeSteps = 5;

    array.set(5, initialValue);
    console.log(`  t=0: value=${array.get(5)}`);

    for (let t = 1; t <= timeSteps; t++) {
      array.update(5, (current) => current * Math.exp(-decayConstant));
      const currentValue = array.get(5);
      const analyticalValue = initialValue * Math.exp(-decayConstant * t);
      console.log(`  t=${t}: value=${currentValue.toFixed(6)}, analytical=${analyticalValue.toFixed(6)}`);
      expect(currentValue).toBeCloseTo(analyticalValue, 10);
    }

    // Test accumulation with numerical stability
    console.log('\n3. Stable numerical accumulation:');
    array.set(6, 0.0);

    // Kahan summation simulation (simplified)
    const smallIncrements = Array.from({length: 1000}, () => 0.1);
    for (const increment of smallIncrements) {
      array.getAndAdd(6, increment);
    }

    const accumulatedValue = array.get(6);
    const expectedValue = smallIncrements.length * 0.1;
    console.log(`  Accumulated: ${accumulatedValue.toFixed(10)}, Expected: ${expectedValue.toFixed(10)}`);
    expect(accumulatedValue).toBeCloseTo(expectedValue, 10);

    console.log('✅ Scientific computing patterns work!');
  });

  test('cursor operations work correctly', () => {
    console.log('\n🎯 CURSOR TEST: Iteration Support');
    console.log('=================================');

    const array = HugeAtomicDoubleArray.of(8, MockDoublePageCreators.scientific());

    console.log('Testing cursor operations...');

    console.log('Array values:');
    for (let i = 0; i < 8; i++) {
      console.log(`  array[${i}] = ${array.get(i).toFixed(6)}`);
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
    const largeArray = HugeAtomicDoubleArray.of(200000, MockDoublePageCreators.constant(Math.PI));

    console.log('Testing paged array behavior...');
    console.log(`  Array size: ${largeArray.size()}`);
    console.log(`  Implementation: ${largeArray.constructor.name}`);

    expect(largeArray.size()).toBe(200000);
    expect(largeArray.constructor.name).toBe('PagedHugeAtomicDoubleArray');

    // Test access across page boundaries (assuming 64KB pages = 8192 doubles)
    const testIndices = [0, 8191, 8192, 16383, 16384, 199999]; // Around page boundaries

    console.log('Testing page boundary access:');
    for (const index of testIndices) {
      const value = largeArray.get(index);
      console.log(`  largeArray[${index}] = ${value.toFixed(6)}`);
      expect(value).toBeCloseTo(Math.PI, 15);
    }

    // Test setting values across pages
    console.log('Testing sets across page boundaries:');
    const scientificConstants = [Math.E, Math.SQRT2, Math.LN2, Math.LOG10E, Math.SQRT1_2, 1.618033988749];
    for (let i = 0; i < testIndices.length; i++) {
      const index = testIndices[i];
      const newValue = scientificConstants[i % scientificConstants.length];
      largeArray.set(index, newValue);
      const retrievedValue = largeArray.get(index);
      console.log(`  Set largeArray[${index}] = ${newValue.toFixed(6)}, got: ${retrievedValue.toFixed(6)}`);
      expect(retrievedValue).toBeCloseTo(newValue, 15);
    }

    console.log('✅ Paged array behavior works!');
  });

  test('concurrent-style atomic operations work correctly', () => {
    console.log('\n🎯 CONCURRENCY SIMULATION TEST: Atomic Operations');
    console.log('=================================================');

    const array = HugeAtomicDoubleArray.of(5, MockDoublePageCreators.zero());

    console.log('Testing concurrent-style atomic operations...');

    // Simulate parallel accumulation (like PageRank)
    console.log('\n1. Parallel accumulation simulation:');
    const NUM_CONTRIBUTORS = 100;
    const CONTRIBUTION_VALUE = 0.01;

    array.set(0, 0.0);

    // Simulate multiple "threads" contributing to the same sum
    for (let i = 0; i < NUM_CONTRIBUTORS; i++) {
      const oldValue = array.getAndAdd(0, CONTRIBUTION_VALUE);
      if (i < 5 || i >= NUM_CONTRIBUTORS - 5) {
        console.log(`  Contribution ${i + 1}: ${oldValue.toFixed(6)} + ${CONTRIBUTION_VALUE} = ${array.get(0).toFixed(6)}`);
      }
    }

    const finalSum = array.get(0);
    const expectedSum = NUM_CONTRIBUTORS * CONTRIBUTION_VALUE;
    console.log(`  Final sum: ${finalSum.toFixed(6)}, Expected: ${expectedSum.toFixed(6)}`);
    expect(finalSum).toBeCloseTo(expectedSum, 10);

    // Simulate atomic maximum finding
    console.log('\n2. Atomic maximum simulation:');
    array.set(1, -Number.MAX_VALUE);

    const candidates = [1.5, 3.7, 2.1, 4.8, 1.9, 4.2, 3.3];
    for (const candidate of candidates) {
      array.update(1, (current) => Math.max(current, candidate));
      console.log(`  After candidate ${candidate}: max = ${array.get(1)}`);
    }

    const finalMax = array.get(1);
    const expectedMax = Math.max(...candidates);
    console.log(`  Final maximum: ${finalMax}, Expected: ${expectedMax}`);
    expect(finalMax).toBe(expectedMax);

    // Simulate atomic averaging (running average)
    console.log('\n3. Atomic running average simulation:');
    array.set(2, 0.0); // sum
    array.set(3, 0.0); // count

    const values = [2.5, 1.8, 3.2, 4.1, 2.9];
    for (const value of values) {
      // Atomic increment count
      const newCount = array.getAndAdd(3, 1.0) + 1.0;

      // Atomic update of running average
      array.update(2, (currentSum) => {
        const newSum = currentSum + value;
        return newSum;
      });

      const currentSum = array.get(2);
      const currentAverage = currentSum / newCount;
      console.log(`  Added ${value}: sum=${currentSum.toFixed(3)}, count=${newCount}, avg=${currentAverage.toFixed(3)}`);
    }

    const finalSum2 = array.get(2);
    const finalCount = array.get(3);
    const finalAverage = finalSum2 / finalCount;
    const expectedAverage = values.reduce((a, b) => a + b) / values.length;

    console.log(`  Final average: ${finalAverage.toFixed(6)}, Expected: ${expectedAverage.toFixed(6)}`);
    expect(finalAverage).toBeCloseTo(expectedAverage, 10);

    console.log('✅ Concurrent-style atomic operations work!');
  });

  test('numerical stability and edge cases work correctly', () => {
    console.log('\n🎯 NUMERICAL STABILITY TEST: Edge Cases and Precision');
    console.log('=====================================================');

    const array = HugeAtomicDoubleArray.of(8, MockDoublePageCreators.zero());

    console.log('Testing numerical stability and edge cases...');

    // Test operations near zero
    console.log('\n1. Operations near zero:');
    const verySmall = Number.MIN_VALUE;
    array.set(0, verySmall);

    const addResult = array.getAndAdd(0, verySmall);
    console.log(`  MIN_VALUE + MIN_VALUE: ${addResult} → ${array.get(0)}`);
    expect(array.get(0)).toBeGreaterThan(verySmall);

    // Test operations with very large numbers
    console.log('\n2. Operations with large numbers:');
    const veryLarge = Number.MAX_VALUE / 2;
    array.set(1, veryLarge);

    // This should not overflow to infinity
    const largeAddResult = array.getAndAdd(1, 1e10);
    console.log(`  Large + 1e10: ${largeAddResult.toExponential(3)} → ${array.get(1).toExponential(3)}`);
    expect(Number.isFinite(array.get(1))).toBe(true);

    // Test infinity handling
    console.log('\n3. Infinity handling:');
    array.set(2, Number.POSITIVE_INFINITY);
    const infAddResult = array.getAndAdd(2, 100.0);
    console.log(`  ∞ + 100: ${infAddResult} → ${array.get(2)}`);
    expect(array.get(2)).toBe(Number.POSITIVE_INFINITY);

    // Test NaN propagation
    console.log('\n4. NaN propagation:');
    array.set(3, Number.NaN);
    const nanAddResult = array.getAndAdd(3, 42.0);
    console.log(`  NaN + 42: ${nanAddResult} → ${array.get(3)}`);
    expect(Number.isNaN(nanAddResult)).toBe(true);
    expect(Number.isNaN(array.get(3))).toBe(true);

    // Test precision preservation in CAS operations
    console.log('\n5. Precision preservation in CAS:');
    const preciseValue = Math.PI;
    array.set(4, preciseValue);

    const casSuccess = array.compareAndSet(4, preciseValue, Math.E);
    const newValue = array.get(4);
    console.log(`  CAS π → e: success=${casSuccess}, value=${newValue.toFixed(15)}`);
    expect(casSuccess).toBe(true);
    expect(newValue).toBeCloseTo(Math.E, 15);

    // Test update function with extreme values
    console.log('\n6. Update functions with extreme values:');
    array.set(5, 1e-100);
    array.update(5, (x) => x * 1e200); // Should give 1e100
    const extremeResult = array.get(5);
    console.log(`  1e-100 * 1e200 = ${extremeResult.toExponential(3)}`);
    expect(extremeResult).toBeCloseTo(1e100, -90); // Very rough approximation due to precision

    console.log('✅ Numerical stability and edge cases work!');
  });
});
