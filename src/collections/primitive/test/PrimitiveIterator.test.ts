import {
  PrimitiveLongCollections,
  PrimitiveLongIterators,
  NoSuchElementException
} from '../PrimitiveLongCollections';
import { PrimitiveIterator, LongPredicate } from '../PrimitiveIterator';

describe('PrimitiveLongCollections - Real Implementation Tests', () => {

  test('PrimitiveLongCollections.range() works correctly', () => {
    console.log('\n🎯 RANGE ITERATOR TEST: Real Implementation');
    console.log('==========================================');

    console.log('Testing PrimitiveLongCollections.range()...');

    // Test basic range
    console.log('\n1. Basic range(5, 10):');
    const rangeIterator = PrimitiveLongCollections.range(5, 10);
    const values: number[] = [];

    while (rangeIterator.hasNext()) {
      const value = rangeIterator.nextLong();
      values.push(value);
      console.log(`  nextLong() = ${value}`);
    }

    console.log(`  Collected: [${values.join(', ')}]`);
    const expected = [5, 6, 7, 8, 9, 10];
    expect(values).toEqual(expected);

    // Test that iterator is properly exhausted
    console.log('\n2. Exhaustion handling:');
    expect(rangeIterator.hasNext()).toBe(false);
    console.log('  hasNext() after exhaustion: false ✓');

    expect(() => rangeIterator.nextLong()).toThrow(NoSuchElementException);
    console.log('  nextLong() after exhaustion throws NoSuchElementException ✓');

    // Test edge cases
    console.log('\n3. Edge case: single element range(42, 42):');
    const singleRange = PrimitiveLongCollections.range(42, 42);
    expect(singleRange.hasNext()).toBe(true);
    expect(singleRange.nextLong()).toBe(42);
    expect(singleRange.hasNext()).toBe(false);
    console.log('  Single element range works ✓');

    // Test zero-length range
    console.log('\n4. Edge case: empty range(10, 5):');
    const emptyRange = PrimitiveLongCollections.range(10, 5); // start > end
    expect(emptyRange.hasNext()).toBe(false);
    expect(() => emptyRange.nextLong()).toThrow(NoSuchElementException);
    console.log('  Empty range (start > end) works ✓');

    console.log('✅ PrimitiveLongCollections.range() works correctly!');
  });

  test('PrimitiveLongBaseIterator fetchNext pattern works correctly', () => {
    console.log('\n🎯 BASE ITERATOR TEST: FetchNext Pattern');
    console.log('========================================');

    console.log('Testing PrimitiveLongBaseIterator fetchNext() pattern...');

    // Use range iterator to test base iterator behavior
    const iterator = PrimitiveLongCollections.range(100, 102);

    console.log('\n1. hasNext() -> fetchNext() -> storeValue cycle:');

    // First cycle
    console.log('  First iteration cycle:');
    const hasNext1 = iterator.hasNext();
    console.log(`    hasNext() = ${hasNext1} (should call fetchNext() internally)`);
    expect(hasNext1).toBe(true);

    const value1 = iterator.nextLong();
    console.log(`    nextLong() = ${value1} (should return stored value)`);
    expect(value1).toBe(100);

    // Second cycle
    console.log('  Second iteration cycle:');
    const hasNext2 = iterator.hasNext();
    console.log(`    hasNext() = ${hasNext2} (should call fetchNext() again)`);
    expect(hasNext2).toBe(true);

    const value2 = iterator.nextLong();
    console.log(`    nextLong() = ${value2}`);
    expect(value2).toBe(101);

    // Third cycle
    console.log('  Third iteration cycle:');
    const hasNext3 = iterator.hasNext();
    console.log(`    hasNext() = ${hasNext3}`);
    expect(hasNext3).toBe(true);

    const value3 = iterator.nextLong();
    console.log(`    nextLong() = ${value3}`);
    expect(value3).toBe(102);

    // Final cycle - exhaustion
    console.log('  Final iteration cycle (exhaustion):');
    const hasNext4 = iterator.hasNext();
    console.log(`    hasNext() = ${hasNext4} (fetchNext() should return false)`);
    expect(hasNext4).toBe(false);

    console.log('\n2. Multiple hasNext() calls without nextLong():');
    const iterator2 = PrimitiveLongCollections.range(200, 201);

    // Multiple hasNext() calls should be idempotent
    expect(iterator2.hasNext()).toBe(true);
    expect(iterator2.hasNext()).toBe(true);
    expect(iterator2.hasNext()).toBe(true);
    console.log('  Multiple hasNext() calls are idempotent ✓');

    expect(iterator2.nextLong()).toBe(200);
    expect(iterator2.hasNext()).toBe(true);
    expect(iterator2.nextLong()).toBe(201);
    expect(iterator2.hasNext()).toBe(false);
    console.log('  Sequence remains correct after multiple hasNext() calls ✓');

    console.log('✅ PrimitiveLongBaseIterator fetchNext pattern works!');
  });

  test('PrimitiveLongIterators utility functions work correctly', () => {
    console.log('\n🎯 ITERATORS UTILITIES TEST: Real Factory Functions');
    console.log('==================================================');

    console.log('Testing PrimitiveLongIterators utility functions...');

    console.log('\n1. PrimitiveLongIterators.of():');
    const ofIterator = PrimitiveLongIterators.of(10, 20, 30, 40);
    const ofValues: number[] = [];

    while (ofIterator.hasNext()) {
      ofValues.push(ofIterator.nextLong());
    }

    console.log(`  of(10, 20, 30, 40) = [${ofValues.join(', ')}]`);
    expect(ofValues).toEqual([10, 20, 30, 40]);

    // Test empty of()
    const emptyOf = PrimitiveLongIterators.of();
    expect(emptyOf.hasNext()).toBe(false);
    console.log('  of() with no arguments creates empty iterator ✓');

    console.log('\n2. PrimitiveLongIterators.empty():');
    const emptyIterator = PrimitiveLongIterators.empty();
    expect(emptyIterator.hasNext()).toBe(false);
    expect(() => emptyIterator.nextLong()).toThrow(NoSuchElementException);
    console.log('  empty() creates properly empty iterator ✓');

    console.log('\n3. PrimitiveLongIterators.single():');
    const singleIterator = PrimitiveLongIterators.single(999);
    expect(singleIterator.hasNext()).toBe(true);
    expect(singleIterator.nextLong()).toBe(999);
    expect(singleIterator.hasNext()).toBe(false);
    expect(() => singleIterator.nextLong()).toThrow(NoSuchElementException);
    console.log('  single(999) creates correct single-element iterator ✓');

    console.log('\n4. PrimitiveLongIterators.toArray():');
    const sourceIterator = PrimitiveLongCollections.range(5, 8);
    const arrayResult = PrimitiveLongIterators.toArray(sourceIterator);
    console.log(`  toArray(range(5, 8)) = [${arrayResult.join(', ')}]`);
    expect(arrayResult).toEqual([5, 6, 7, 8]);

    // Test toArray with empty iterator
    const emptyArray = PrimitiveLongIterators.toArray(PrimitiveLongIterators.empty());
    expect(emptyArray).toEqual([]);
    console.log('  toArray(empty()) = [] ✓');

    console.log('\n5. PrimitiveLongIterators.count():');
    const countIterator = PrimitiveLongCollections.range(1, 100);
    const count = PrimitiveLongIterators.count(countIterator);
    console.log(`  count(range(1, 100)) = ${count}`);
    expect(count).toBe(100);

    // Test count with empty iterator
    const emptyCount = PrimitiveLongIterators.count(PrimitiveLongIterators.empty());
    expect(emptyCount).toBe(0);
    console.log('  count(empty()) = 0 ✓');

    console.log('✅ PrimitiveLongIterators utility functions work!');
  });

  test('JavaScript Iterator protocol compliance works correctly', () => {
    console.log('\n🎯 JS ITERATOR PROTOCOL TEST: Standard Compliance');
    console.log('================================================');

    console.log('Testing JavaScript Iterator protocol compliance...');

    const iterator = PrimitiveLongCollections.range(10, 12);

    console.log('\n1. next() method compliance:');
    let result = iterator.next();
    console.log(`  First next(): {value: ${result.value}, done: ${result.done}}`);
    expect(result.done).toBe(false);
    expect(result.value).toBe(10);

    result = iterator.next();
    console.log(`  Second next(): {value: ${result.value}, done: ${result.done}}`);
    expect(result.done).toBe(false);
    expect(result.value).toBe(11);

    result = iterator.next();
    console.log(`  Third next(): {value: ${result.value}, done: ${result.done}}`);
    expect(result.done).toBe(false);
    expect(result.value).toBe(12);

    result = iterator.next();
    console.log(`  Fourth next(): {value: ${result.value}, done: ${result.done}}`);
    expect(result.done).toBe(true);
    expect(result.value).toBeUndefined();

    console.log('\n2. Symbol.iterator compliance:');
    const iterator2 = PrimitiveLongIterators.of(100, 200, 300);
    const collected: number[] = [];

    for (const value of iterator2) {
      collected.push(value);
      console.log(`  for-of yielded: ${value}`);
    }

    expect(collected).toEqual([100, 200, 300]);

    console.log('\n3. Array.from() compatibility:');
    const iterator3 = PrimitiveLongCollections.range(20, 22);
    const arrayFromResult = Array.from(iterator3);
    console.log(`  Array.from(range(20, 22)) = [${arrayFromResult.join(', ')}]`);
    expect(arrayFromResult).toEqual([20, 21, 22]);

    console.log('\n4. Destructuring assignment:');
    const iterator4 = PrimitiveLongIterators.of(1, 2, 3, 4, 5);
    const [first, second, ...rest] = iterator4;
    console.log(`  [first, second, ...rest] = [${first}, ${second}, [${rest.join(', ')}]]`);
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(rest).toEqual([3, 4, 5]);

    console.log('✅ JavaScript Iterator protocol compliance works!');
  });

  test('LongPredicate functional interface works correctly', () => {
    console.log('\n🎯 LONG PREDICATE TEST: Functional Programming');
    console.log('==============================================');

    console.log('Testing LongPredicate functional interface...');

    // Create test data using real iterator
    const testIterator = PrimitiveLongCollections.range(1, 20);
    const testValues = PrimitiveLongIterators.toArray(testIterator);

    console.log('\n1. Basic predicate functions:');
    const isEven: LongPredicate = (value: number) => value % 2 === 0;
    const isLarge: LongPredicate = (value: number) => value > 10;
    const isPrime: LongPredicate = (n: number) => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    };

    console.log('  Testing even number predicate:');
    const evenNumbers = testValues.filter(isEven);
    console.log(`    Even numbers: [${evenNumbers.join(', ')}]`);
    expect(evenNumbers).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);

    console.log('  Testing large number predicate:');
    const largeNumbers = testValues.filter(isLarge);
    console.log(`    Large numbers (>10): [${largeNumbers.join(', ')}]`);
    expect(largeNumbers).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

    console.log('  Testing prime number predicate:');
    const primeNumbers = testValues.filter(isPrime);
    console.log(`    Prime numbers: [${primeNumbers.join(', ')}]`);
    expect(primeNumbers).toEqual([2, 3, 5, 7, 11, 13, 17, 19]);

    console.log('\n2. Predicate composition:');
    const isEvenAndLarge: LongPredicate = (value: number) => isEven(value) && isLarge(value);
    const evenAndLarge = testValues.filter(isEvenAndLarge);
    console.log(`  Even AND large: [${evenAndLarge.join(', ')}]`);
    expect(evenAndLarge).toEqual([12, 14, 16, 18, 20]);

    const isPrimeOrEven: LongPredicate = (value: number) => isPrime(value) || isEven(value);
    const primeOrEven = testValues.filter(isPrimeOrEven);
    console.log(`  Prime OR even: [${primeOrEven.join(', ')}]`);
    expect(primeOrEven).toEqual([2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20]);

    console.log('\n3. Real-world predicate scenarios:');

    // Graph node ID patterns
    const isValidNodeId: LongPredicate = (id: number) => id >= 0 && id <= 1000000;
    const isBoundaryNode: LongPredicate = (id: number) => id % 1000 === 0;

    const nodeIds = PrimitiveLongIterators.toArray(PrimitiveLongCollections.range(999, 1002));
    console.log(`  Testing node IDs: [${nodeIds.join(', ')}]`);

    const validNodes = nodeIds.filter(isValidNodeId);
    const boundaryNodes = nodeIds.filter(isBoundaryNode);

    console.log(`    Valid node IDs: [${validNodes.join(', ')}]`);
    console.log(`    Boundary nodes: [${boundaryNodes.join(', ')}]`);

    expect(validNodes).toEqual([999, 1000, 1001, 1002]);
    expect(boundaryNodes).toEqual([1000]);

    console.log('✅ LongPredicate functional interface works!');
  });

  test('error handling and edge cases work correctly', () => {
    console.log('\n🎯 ERROR HANDLING TEST: Edge Cases and Exceptions');
    console.log('=================================================');

    console.log('Testing error handling and edge cases...');

    console.log('\n1. NoSuchElementException handling:');

    // Test with empty iterator
    const emptyIterator = PrimitiveLongIterators.empty();
    expect(() => emptyIterator.nextLong()).toThrow(NoSuchElementException);
    console.log('  empty().nextLong() throws NoSuchElementException ✓');

    // Test with exhausted iterator
    const singleIterator = PrimitiveLongIterators.single(42);
    expect(singleIterator.nextLong()).toBe(42);
    expect(() => singleIterator.nextLong()).toThrow(NoSuchElementException);
    console.log('  exhausted iterator.nextLong() throws NoSuchElementException ✓');

    console.log('\n2. Large number handling:');
    const maxSafeInt = Number.MAX_SAFE_INTEGER;
    const minSafeInt = Number.MIN_SAFE_INTEGER;

    const largeIterator = PrimitiveLongIterators.of(maxSafeInt, minSafeInt, 0);
    const largeValues = PrimitiveLongIterators.toArray(largeIterator);

    console.log(`  MAX_SAFE_INTEGER: ${maxSafeInt}`);
    console.log(`  MIN_SAFE_INTEGER: ${minSafeInt}`);
    console.log(`  Collected: [${largeValues.join(', ')}]`);

    expect(largeValues).toEqual([maxSafeInt, minSafeInt, 0]);
    expect(Number.isSafeInteger(largeValues[0])).toBe(true);
    expect(Number.isSafeInteger(largeValues[1])).toBe(true);

    console.log('\n3. Range edge cases:');

    // Test negative ranges
    const negativeRange = PrimitiveLongCollections.range(-5, -2);
    const negativeValues = PrimitiveLongIterators.toArray(negativeRange);
    console.log(`  range(-5, -2) = [${negativeValues.join(', ')}]`);
    expect(negativeValues).toEqual([-5, -4, -3, -2]);

    // Test large ranges (but not too large to cause memory issues)
    const largeRange = PrimitiveLongCollections.range(1000000, 1000002);
    const largeRangeValues = PrimitiveLongIterators.toArray(largeRange);
    console.log(`  range(1000000, 1000002) = [${largeRangeValues.join(', ')}]`);
    expect(largeRangeValues).toEqual([1000000, 1000001, 1000002]);

    console.log('\n4. Iterator state consistency:');

    // Test that hasNext() doesn't modify state
    const stateIterator = PrimitiveLongCollections.range(1, 3);

    // Multiple hasNext() calls
    expect(stateIterator.hasNext()).toBe(true);
    expect(stateIterator.hasNext()).toBe(true);
    expect(stateIterator.hasNext()).toBe(true);

    // Should still get correct first value
    expect(stateIterator.nextLong()).toBe(1);

    // Continue normal iteration
    expect(stateIterator.hasNext()).toBe(true);
    expect(stateIterator.nextLong()).toBe(2);
    expect(stateIterator.hasNext()).toBe(true);
    expect(stateIterator.nextLong()).toBe(3);
    expect(stateIterator.hasNext()).toBe(false);

    console.log('  Iterator state remains consistent ✓');

    console.log('✅ Error handling and edge cases work correctly!');
  });

  test('performance and memory patterns work correctly', () => {
    console.log('\n🎯 PERFORMANCE TEST: Efficiency and Memory Usage');
    console.log('===============================================');

    console.log('Testing performance and memory patterns...');

    console.log('\n1. Large range iteration efficiency:');
    const LARGE_SIZE = 100000;
    const largeRangeIterator = PrimitiveLongCollections.range(1, LARGE_SIZE);

    let count = 0;
    let sum = 0;
    const startTime = Date.now();

    while (largeRangeIterator.hasNext()) {
      const value = largeRangeIterator.nextLong();
      sum += value;
      count++;
    }

    const endTime = Date.now();
    const expectedSum = (LARGE_SIZE * (LARGE_SIZE + 1)) / 2; // Sum formula

    console.log(`  Iterated ${count} elements in ${endTime - startTime}ms`);
    console.log(`  Sum: ${sum} (expected: ${expectedSum})`);
    expect(count).toBe(LARGE_SIZE);
    expect(sum).toBe(expectedSum);

    console.log('\n2. Memory efficiency - lazy evaluation:');
    // Create very large range but don't iterate - should be memory efficient
    const hugeLazyRange = PrimitiveLongCollections.range(1, 10000000);

    expect(hugeLazyRange.hasNext()).toBe(true);
    expect(hugeLazyRange.nextLong()).toBe(1);
    expect(hugeLazyRange.nextLong()).toBe(2);

    console.log('  Large range created without memory issues ✓');
    console.log('  Values generated on-demand ✓');

    console.log('\n3. Iterator factory performance:');
    const factoryStartTime = Date.now();

    // Create many small iterators
    const iterators: PrimitiveIterator.OfLong[] = [];
    for (let i = 0; i < 1000; i++) {
      iterators.push(PrimitiveLongIterators.of(i, i + 1, i + 2));
    }

    const factoryEndTime = Date.now();
    console.log(`  Created 1000 iterators in ${factoryEndTime - factoryStartTime}ms`);
    expect(iterators.length).toBe(1000);

    // Verify they all work correctly
    const firstIterator = iterators[0];
    expect(PrimitiveLongIterators.toArray(firstIterator)).toEqual([0, 1, 2]);

    console.log('\n4. toArray() efficiency test:');
    const arrayTestIterator = PrimitiveLongCollections.range(1, 10000);
    const arrayStartTime = Date.now();
    const resultArray = PrimitiveLongIterators.toArray(arrayTestIterator);
    const arrayEndTime = Date.now();

    console.log(`  Converted 10000 elements to array in ${arrayEndTime - arrayStartTime}ms`);
    expect(resultArray.length).toBe(10000);
    expect(resultArray[0]).toBe(1);
    expect(resultArray[9999]).toBe(10000);

    console.log('✅ Performance and memory patterns work correctly!');
  });

  test('real-world usage patterns work correctly', () => {
    console.log('\n🎯 REAL-WORLD PATTERNS TEST: Practical Usage');
    console.log('============================================');

    console.log('Testing real-world usage patterns...');

    console.log('\n1. Graph node ID generation:');
    const nodeIdRange = PrimitiveLongCollections.range(1000000, 1000010);
    const nodeIds = PrimitiveLongIterators.toArray(nodeIdRange);

    console.log(`  Generated node IDs: [${nodeIds.slice(0, 5).join(', ')}, ...]`);
    expect(nodeIds.length).toBe(11);
    expect(nodeIds[0]).toBe(1000000);
    expect(nodeIds[nodeIds.length - 1]).toBe(1000010);

    console.log('\n2. Batch processing simulation:');
    const batchSize = 1000;
    const totalElements = 5000;
    let processedBatches = 0;
    let totalProcessed = 0;

    const dataRange = PrimitiveLongCollections.range(1, totalElements);

    // Process in batches
    while (dataRange.hasNext()) {
      const batch: number[] = [];
      let batchCount = 0;

      while (dataRange.hasNext() && batchCount < batchSize) {
        batch.push(dataRange.nextLong());
        batchCount++;
      }

      processedBatches++;
      totalProcessed += batch.length;

      if (processedBatches <= 2 || processedBatches === 5) {
        console.log(`    Batch ${processedBatches}: ${batch.length} elements (${batch[0]} to ${batch[batch.length - 1]})`);
      }
    }

    console.log(`  Processed ${processedBatches} batches, ${totalProcessed} total elements`);
    expect(totalProcessed).toBe(totalElements);
    expect(processedBatches).toBe(5); // 5000 / 1000 = 5 batches

    console.log('\n3. Filtering and aggregation:');
    const dataIterator = PrimitiveLongCollections.range(1, 100);
    const dataValues = PrimitiveLongIterators.toArray(dataIterator);

    // Filter even numbers and calculate statistics
    const evenNumbers = dataValues.filter(x => x % 2 === 0);
    const sum = evenNumbers.reduce((a, b) => a + b, 0);
    const average = sum / evenNumbers.length;
    const max = Math.max(...evenNumbers);
    const min = Math.min(...evenNumbers);

    console.log(`    Even numbers count: ${evenNumbers.length}`);
    console.log(`    Sum: ${sum}, Average: ${average.toFixed(2)}`);
    console.log(`    Min: ${min}, Max: ${max}`);

    expect(evenNumbers.length).toBe(50);
    expect(min).toBe(2);
    expect(max).toBe(100);

    console.log('\n4. Iterator composition for pipelines:');

    // Create a pipeline: range -> filter primes -> take first 5
    const pipelineSource = PrimitiveLongCollections.range(2, 50);
    const sourceValues = PrimitiveLongIterators.toArray(pipelineSource);

    const isPrime = (n: number): boolean => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    };

    const primes = sourceValues.filter(isPrime).slice(0, 5);
    console.log(`    First 5 primes from range(2, 50): [${primes.join(', ')}]`);
    expect(primes).toEqual([2, 3, 5, 7, 11]);

    console.log('✅ Real-world usage patterns work correctly!');
  });
});
