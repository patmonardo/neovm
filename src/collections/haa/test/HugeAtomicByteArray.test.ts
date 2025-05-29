import { HugeAtomicByteArray } from '../HugeAtomicByteArray';

// Mock the dependencies - simple implementations for testing
const MockBytePageCreators = {
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

  pattern(): any {
    return {
      fillPage: (page: number[], startIndex: number) => {
        for (let i = startIndex; i < page.length; i++) {
          page[i] = (i % 256) - 128; // Pattern from -128 to 127
        }
      },
      fill: (pages: number[][], lastPageSize: number, pageShift: number) => {
        let globalIndex = 0;
        for (let pageIdx = 0; pageIdx < pages.length - 1; pageIdx++) {
          const page = pages[pageIdx];
          for (let i = 0; i < page.length; i++) {
            page[i] = (globalIndex++ % 256) - 128;
          }
        }
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          for (let i = 0; i < lastPageSize; i++) {
            lastPage[i] = (globalIndex++ % 256) - 128;
          }
        }
      }
    };
  }
};

describe('HugeAtomicByteArray - Core Operations', () => {

  test('factory creates appropriate implementation based on size', () => {
    console.log('\n🎯 FACTORY TEST: Size-based Implementation Selection');
    console.log('===================================================');

    // Small array - should use single page implementation
    const smallArray = HugeAtomicByteArray.of(1000, MockBytePageCreators.zero());
    console.log(`Small array (1000): ${smallArray.constructor.name}`);
    console.log(`Size: ${smallArray.size()}`);

    expect(smallArray.size()).toBe(1000);
    expect(smallArray.constructor.name).toBe('SingleHugeAtomicByteArray');

    // Large array - should use paged implementation
    const largeArray = HugeAtomicByteArray.of(100000, MockBytePageCreators.zero());
    console.log(`Large array (100000): ${largeArray.constructor.name}`);
    console.log(`Size: ${largeArray.size()}`);

    expect(largeArray.size()).toBe(100000);
    expect(largeArray.constructor.name).toBe('PagedHugeAtomicByteArray');

    console.log('✅ Factory creates correct implementations!');
  });

  test('basic get and set operations work correctly', () => {
    console.log('\n🎯 BASIC OPERATIONS TEST: Get/Set');
    console.log('=================================');

    const array = HugeAtomicByteArray.of(10, MockBytePageCreators.zero());

    console.log('Testing basic get/set operations...');

    // Test initial values (should be 0)
    for (let i = 0; i < 5; i++) {
      const value = array.get(i);
      console.log(`  Initial array[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test setting values - including 8-bit boundaries
    const testValues = [42, -100, 127, -128, 0]; // Include 8-bit boundaries
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

    const array = HugeAtomicByteArray.of(5, MockBytePageCreators.constant(50));

    console.log('Testing atomic getAndAdd operations...');

    // Test atomic increment
    for (let i = 0; i < 3; i++) {
      const oldValue = array.getAndAdd(0, 5);
      const newValue = array.get(0);
      console.log(`  Iteration ${i + 1}: getAndAdd(0, 5) returned ${oldValue}, new value: ${newValue}`);
      expect(oldValue).toBe(50 + (i * 5));
      expect(newValue).toBe(50 + ((i + 1) * 5));
    }

    // Test atomic decrement
    const beforeDecrement = array.get(1);
    const oldValue = array.getAndAdd(1, -25);
    const afterDecrement = array.get(1);
    console.log(`  Decrement: before=${beforeDecrement}, getAndAdd(1, -25)=${oldValue}, after=${afterDecrement}`);

    expect(oldValue).toBe(50);
    expect(afterDecrement).toBe(25);

    console.log('✅ Atomic getAndAdd operations work!');
  });

  test('atomic getAndReplace operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: GetAndReplace');
    console.log('========================================');

    const array = HugeAtomicByteArray.of(3, MockBytePageCreators.constant(99));

    console.log('Testing atomic getAndReplace operations...');

    // Test atomic replace
    const oldValue1 = array.getAndReplace(0, 123);
    const newValue1 = array.get(0);
    console.log(`  Replace 1: getAndReplace(0, 123) returned ${oldValue1}, new value: ${newValue1}`);

    expect(oldValue1).toBe(99);
    expect(newValue1).toBe(123);

    // Test chained replaces
    const oldValue2 = array.getAndReplace(0, -56);
    const newValue2 = array.get(0);
    console.log(`  Replace 2: getAndReplace(0, -56) returned ${oldValue2}, new value: ${newValue2}`);

    expect(oldValue2).toBe(123);
    expect(newValue2).toBe(-56);

    console.log('✅ Atomic getAndReplace operations work!');
  });

  test('compareAndSet operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndSet');
    console.log('========================================');

    const array = HugeAtomicByteArray.of(5, MockBytePageCreators.constant(77));

    console.log('Testing compareAndSet operations...');

    // Successful CAS
    const success1 = array.compareAndSet(0, 77, 88);
    const value1 = array.get(0);
    console.log(`  CAS Success: compareAndSet(0, 77, 88) = ${success1}, value = ${value1}`);

    expect(success1).toBe(true);
    expect(value1).toBe(88);

    // Failed CAS (wrong expected value)
    const success2 = array.compareAndSet(0, 77, 99);
    const value2 = array.get(0);
    console.log(`  CAS Failure: compareAndSet(0, 77, 99) = ${success2}, value = ${value2}`);

    expect(success2).toBe(false);
    expect(value2).toBe(88); // Should remain unchanged

    // Successful CAS with correct expected value
    const success3 = array.compareAndSet(0, 88, -12);
    const value3 = array.get(0);
    console.log(`  CAS Success 2: compareAndSet(0, 88, -12) = ${success3}, value = ${value3}`);

    expect(success3).toBe(true);
    expect(value3).toBe(-12);

    console.log('✅ CompareAndSet operations work!');
  });

  test('compareAndExchange operations work correctly', () => {
    console.log('\n🎯 ATOMIC OPERATIONS TEST: CompareAndExchange');
    console.log('=============================================');

    const array = HugeAtomicByteArray.of(3, MockBytePageCreators.constant(25));

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

    const array = HugeAtomicByteArray.of(5, MockBytePageCreators.zero());

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

    // Test bit manipulation (byte-specific)
    array.set(2, 15); // Binary: 00001111
    array.update(2, (current) => current | 0x10); // Set bit 4: 00011111 = 31
    const bitResult = array.get(2);
    console.log(`  Bit update: 15 | 16 = ${bitResult}`);
    expect(bitResult).toBe(31);

    console.log('✅ Functional update operations work!');
  });

  test('bulk operations work correctly', () => {
    console.log('\n🎯 BULK OPERATIONS TEST: SetAll');
    console.log('===============================');

    const array = HugeAtomicByteArray.of(10, MockBytePageCreators.zero());

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
    array.setAll(111);
    console.log('\nAfter setAll(111):');

    for (let i = 0; i < 10; i++) {
      const value = array.get(i);
      console.log(`  array[${i}] = ${value}`);
      expect(value).toBe(111);
    }

    console.log('✅ Bulk operations work!');
  });

  test('memory and lifecycle operations work correctly', () => {
    console.log('\n🎯 LIFECYCLE TEST: Memory Management');
    console.log('===================================');

    const array = HugeAtomicByteArray.of(1000, MockBytePageCreators.constant(55));

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
    const estimatedMemory = HugeAtomicByteArray.memoryEstimation(1000);
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

    const source = HugeAtomicByteArray.of(5, MockBytePageCreators.zero());
    const dest = HugeAtomicByteArray.of(8, MockBytePageCreators.constant(88));

    console.log('Testing copyTo operations...');

    // Set source values
    const sourceValues = [11, 22, 33, 44, 55];
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
    const zeroArray = HugeAtomicByteArray.of(5, MockBytePageCreators.zero());
    console.log('\nZero creator:');
    for (let i = 0; i < 5; i++) {
      const value = zeroArray.get(i);
      console.log(`  zeroArray[${i}] = ${value}`);
      expect(value).toBe(0);
    }

    // Test constant creator
    const constantArray = HugeAtomicByteArray.of(5, MockBytePageCreators.constant(99));
    console.log('\nConstant creator (99):');
    for (let i = 0; i < 5; i++) {
      const value = constantArray.get(i);
      console.log(`  constantArray[${i}] = ${value}`);
      expect(value).toBe(99);
    }

    // Test pattern creator
    const patternArray = HugeAtomicByteArray.of(5, MockBytePageCreators.pattern());
    console.log('\nPattern creator:');
    for (let i = 0; i < 5; i++) {
      const value = patternArray.get(i);
      const expectedValue = (i % 256) - 128;
      console.log(`  patternArray[${i}] = ${value} (expected: ${expectedValue})`);
      expect(value).toBe(expectedValue);
    }

    console.log('✅ Page creators work correctly!');
  });

  test('8-bit byte boundaries work correctly', () => {
    console.log('\n🎯 8-BIT BOUNDARIES TEST: Byte Range');
    console.log('====================================');

    const array = HugeAtomicByteArray.of(5, MockBytePageCreators.zero());

    console.log('Testing 8-bit byte boundaries...');

    // Test maximum 8-bit signed integer
    const maxByte = 127;  // 2^7 - 1
    array.set(0, maxByte);
    const maxValue = array.get(0);
    console.log(`  Max byte: ${maxValue}`);
    expect(maxValue).toBe(maxByte);

    // Test minimum 8-bit signed integer
    const minByte = -128; // -2^7
    array.set(1, minByte);
    const minValue = array.get(1);
    console.log(`  Min byte: ${minValue}`);
    expect(minValue).toBe(minByte);

    // Test overflow behavior (addition)
    array.set(2, maxByte);
    const overflowResult = array.getAndAdd(2, 1);
    const overflowValue = array.get(2);
    console.log(`  Overflow: ${maxByte} + 1 = ${overflowValue} (previous: ${overflowResult})`);
    expect(overflowResult).toBe(maxByte);
    // Note: Overflow behavior may wrap around or saturate

    // Test underflow behavior (subtraction)
    array.set(3, minByte);
    const underflowResult = array.getAndAdd(3, -1);
    const underflowValue = array.get(3);
    console.log(`  Underflow: ${minByte} - 1 = ${underflowValue} (previous: ${underflowResult})`);
    expect(underflowResult).toBe(minByte);

    console.log('✅ 8-bit boundaries work correctly!');
  });

  test('bit manipulation operations work correctly', () => {
    console.log('\n🎯 BIT MANIPULATION TEST: Byte-Level Operations');
    console.log('===============================================');

    const array = HugeAtomicByteArray.of(8, MockBytePageCreators.zero());

    console.log('Testing bit manipulation operations...');

    // Test bit flag operations
    console.log('\n1. Bit flag operations:');

    // Set individual bits
    array.set(0, 0); // Start with 0: 00000000
    array.update(0, (current) => current | 0x01); // Set bit 0: 00000001 = 1
    console.log(`  Set bit 0: ${array.get(0)} (binary: ${array.get(0).toString(2).padStart(8, '0')})`);
    expect(array.get(0)).toBe(1);

    array.update(0, (current) => current | 0x02); // Set bit 1: 00000011 = 3
    console.log(`  Set bit 1: ${array.get(0)} (binary: ${array.get(0).toString(2).padStart(8, '0')})`);
    expect(array.get(0)).toBe(3);

    array.update(0, (current) => current | 0x08); // Set bit 3: 00001011 = 11
    console.log(`  Set bit 3: ${array.get(0)} (binary: ${array.get(0).toString(2).padStart(8, '0')})`);
    expect(array.get(0)).toBe(11);

    // Clear bits
    array.update(0, (current) => current & ~0x02); // Clear bit 1: 00001001 = 9
    console.log(`  Clear bit 1: ${array.get(0)} (binary: ${array.get(0).toString(2).padStart(8, '0')})`);
    expect(array.get(0)).toBe(9);

    // Toggle bits
    array.update(0, (current) => current ^ 0x04); // Toggle bit 2: 00001101 = 13
    console.log(`  Toggle bit 2: ${array.get(0)} (binary: ${array.get(0).toString(2).padStart(8, '0')})`);
    expect(array.get(0)).toBe(13);

    // Test multiple flag storage
    console.log('\n2. Multiple flag storage:');
    const FLAGS = {
      VISITED: 0x01,     // 00000001
      PROCESSED: 0x02,   // 00000010
      BOUNDARY: 0x04,    // 00000100
      CORE: 0x08,        // 00001000
      OUTLIER: 0x10,     // 00010000
      MARKED: 0x20,      // 00100000
      ACTIVE: 0x40,      // 01000000
      ERROR: 0x80        // 10000000 (-128 in signed byte)
    };

    array.set(1, 0);

    // Set multiple flags
    array.update(1, (current) => current | FLAGS.VISITED | FLAGS.CORE);
    const flagsValue = array.get(1);
    console.log(`  Multiple flags: ${flagsValue} (binary: ${flagsValue.toString(2).padStart(8, '0')})`);
    expect(flagsValue).toBe(FLAGS.VISITED | FLAGS.CORE);

    // Test flag presence
    const hasVisited = (flagsValue & FLAGS.VISITED) !== 0;
    const hasProcessed = (flagsValue & FLAGS.PROCESSED) !== 0;
    const hasCore = (flagsValue & FLAGS.CORE) !== 0;

    console.log(`  Has VISITED: ${hasVisited}`);
    console.log(`  Has PROCESSED: ${hasProcessed}`);
    console.log(`  Has CORE: ${hasCore}`);

    expect(hasVisited).toBe(true);
    expect(hasProcessed).toBe(false);
    expect(hasCore).toBe(true);

    console.log('✅ Bit manipulation operations work!');
  });

  test('cursor operations work correctly', () => {
    console.log('\n🎯 CURSOR TEST: Iteration Support');
    console.log('=================================');

    const array = HugeAtomicByteArray.of(8, MockBytePageCreators.pattern());

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

  test('memory efficiency compared to other arrays', () => {
    console.log('\n🎯 MEMORY EFFICIENCY TEST: Byte vs Int vs Long');
    console.log('===============================================');

    const size = 1000000; // 1 million elements

    console.log('Testing memory efficiency...');

    const byteMemory = HugeAtomicByteArray.memoryEstimation(size);
    console.log(`  Byte array memory for ${size} elements: ${byteMemory} bytes`);
    console.log(`  Memory per element: ${(byteMemory / size).toFixed(2)} bytes`);

    expect(byteMemory).toBeGreaterThan(0);
    expect(byteMemory / size).toBeLessThan(2); // Should be close to 1 byte per element

    // Test actual array creation and memory usage
    const array = HugeAtomicByteArray.of(1000, MockBytePageCreators.constant(42));
    const actualMemory = array.sizeOf();
    console.log(`  Actual memory for 1000 elements: ${actualMemory} bytes`);
    console.log(`  Actual memory per element: ${(actualMemory / 1000).toFixed(2)} bytes`);

    expect(actualMemory).toBeGreaterThan(0);

    console.log('✅ Memory efficiency verified!');
  });

  test('paged array behavior works correctly', () => {
    console.log('\n🎯 PAGED ARRAY TEST: Large Array Behavior');
    console.log('=========================================');

    // Create a large array that will use paged implementation
    const largeArray = HugeAtomicByteArray.of(200000, MockBytePageCreators.constant(77));

    console.log('Testing paged array behavior...');
    console.log(`  Array size: ${largeArray.size()}`);
    console.log(`  Implementation: ${largeArray.constructor.name}`);

    expect(largeArray.size()).toBe(200000);
    expect(largeArray.constructor.name).toBe('PagedHugeAtomicByteArray');

    // Test access across page boundaries (assuming 64KB pages = 65536 bytes)
    const testIndices = [0, 65535, 65536, 131071, 131072, 199999]; // Around page boundaries

    console.log('Testing page boundary access:');
    for (const index of testIndices) {
      const value = largeArray.get(index);
      console.log(`  largeArray[${index}] = ${value}`);
      expect(value).toBe(77);
    }

    // Test setting values across pages
    console.log('Testing sets across page boundaries:');
    for (let i = 0; i < testIndices.length; i++) {
      const index = testIndices[i];
      const newValue = (i * 20) % 256 - 128; // Keep in byte range
      largeArray.set(index, newValue);
      const retrievedValue = largeArray.get(index);
      console.log(`  Set largeArray[${index}] = ${newValue}, got: ${retrievedValue}`);
      expect(retrievedValue).toBe(newValue);
    }

    console.log('✅ Paged array behavior works!');
  });

  test('state machine operations work correctly', () => {
    console.log('\n🎯 STATE MACHINE TEST: Byte-Based States');
    console.log('========================================');

    const array = HugeAtomicByteArray.of(5, MockBytePageCreators.constant(0));

    console.log('Testing state machine operations...');

    // Define states using byte values
    const States = {
      UNINITIALIZED: 0,
      INITIALIZING: 1,
      READY: 2,
      PROCESSING: 3,
      COMPUTING: 4,
      FINALIZING: 5,
      COMPLETED: 6,
      ERROR: -1
    };

    // Initialize all nodes to uninitialized state
    for (let i = 0; i < array.size(); i++) {
      expect(array.get(i)).toBe(States.UNINITIALIZED);
    }

    // Test state transitions
    console.log('\nState transitions:');

    // Node 0: Normal progression
    let success = array.compareAndSet(0, States.UNINITIALIZED, States.INITIALIZING);
    console.log(`  Node 0: UNINITIALIZED → INITIALIZING: ${success}`);
    expect(success).toBe(true);

    success = array.compareAndSet(0, States.INITIALIZING, States.READY);
    console.log(`  Node 0: INITIALIZING → READY: ${success}`);
    expect(success).toBe(true);

    success = array.compareAndSet(0, States.READY, States.PROCESSING);
    console.log(`  Node 0: READY → PROCESSING: ${success}`);
    expect(success).toBe(true);

    // Node 1: Error transition
    array.compareAndSet(1, States.UNINITIALIZED, States.INITIALIZING);
    array.set(1, States.ERROR);
    const errorState = array.get(1);
    console.log(`  Node 1: Set to ERROR state: ${errorState}`);
    expect(errorState).toBe(States.ERROR);

    // Node 2: Failed transition (wrong expected state)
    const failedTransition = array.compareAndSet(2, States.READY, States.PROCESSING);
    console.log(`  Node 2: Invalid transition attempt: ${failedTransition}`);
    expect(failedTransition).toBe(false);

    console.log('✅ State machine operations work!');
  });

  test('atomic operations maintain consistency under simulation', () => {
    console.log('\n🎯 CONSISTENCY TEST: Simulated Concurrent Access');
    console.log('================================================');

    const array = HugeAtomicByteArray.of(3, MockBytePageCreators.zero());

    console.log('Testing atomic operation consistency...');

    // Simulate multiple "threads" incrementing the same counter with saturation
    const NUM_OPERATIONS = 50;
    const MAX_COUNTER = 100;
    let successfulOperations = 0;

    // Initialize counter
    array.set(0, 0);

    console.log(`Simulating ${NUM_OPERATIONS} saturated increments (max ${MAX_COUNTER})...`);
    for (let i = 0; i < NUM_OPERATIONS; i++) {
      // Simulate saturated increment using update
      let wasIncremented = false;
      const oldValue = array.get(0);

      array.update(0, (current) => {
        if (current < MAX_COUNTER) {
          wasIncremented = true;
          return current + 1;
        }
        return current; // Saturated
      });

      if (wasIncremented && array.get(0) > oldValue) {
        successfulOperations++;
      }
    }

    const finalValue = array.get(0);
    console.log(`  Operations attempted: ${NUM_OPERATIONS}`);
    console.log(`  Successful increments: ${successfulOperations}`);
    console.log(`  Final counter value: ${finalValue}`);
    console.log(`  Expected max: ${Math.min(NUM_OPERATIONS, MAX_COUNTER)}`);

    expect(finalValue).toBeLessThanOrEqual(MAX_COUNTER);
    expect(finalValue).toBeGreaterThan(0);

    console.log('✅ Atomic operations maintain consistency!');
  });
});
