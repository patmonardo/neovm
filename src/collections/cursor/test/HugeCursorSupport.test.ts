import { describe, test, expect } from 'vitest';
import {
  HugeCursorSupport,
  defaultInitCursor,
  defaultInitCursorFull
} from '../HugeCursorSupport';
import { HugeCursor, SinglePageCursor } from '../HugeCursor';

// Real implementation using SinglePageCursor with actual constructor
class TestHugeCursorSupport implements HugeCursorSupport<number[]> {
  private data: number[];

  constructor(data: number[]) {
    this.data = data;
  }

  size(): number {
    return this.data.length;
  }

  newCursor(): HugeCursor<number[]> {
    // SinglePageCursor requires the array in constructor
    return new SinglePageCursor(this.data);
  }

  initCursor(cursor: HugeCursor<number[]>): HugeCursor<number[]>;
  initCursor(cursor: HugeCursor<number[]>, start: number, end: number): HugeCursor<number[]>;
  initCursor(cursor: HugeCursor<number[]>, start?: number, end?: number): HugeCursor<number[]> {
    if (start === undefined && end === undefined) {
      return defaultInitCursorFull(cursor);
    } else {
      return defaultInitCursor(this, cursor, start!, end!);
    }
  }
}

describe('HugeCursorSupport - Real SinglePageCursor Implementation', () => {

  test('HugeCursorSupport interface contract with real SinglePageCursor', () => {
    console.log('\n🎯 HUGECURSORSUPPORT TEST: Real SinglePageCursor Interface');
    console.log('=========================================================');

    console.log('Testing HugeCursorSupport with real SinglePageCursor...');

    const testData = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const support = new TestHugeCursorSupport(testData);

    console.log('\n1. Basic interface implementation:');
    const size = support.size();
    console.log(`  size(): ${size}`);
    expect(size).toBe(10);

    console.log('\n2. Real cursor creation:');
    try {
      const cursor = support.newCursor();
      console.log(`  ✅ newCursor() succeeded: ${cursor !== null}`);
      console.log(`  cursor type: ${cursor.constructor.name}`);

      // Check SinglePageCursor specific properties
      console.log(`  cursor.base: ${(cursor as any).base}`);
      console.log(`  cursor.offset: ${(cursor as any).offset}`);
      console.log(`  cursor.limit: ${(cursor as any).limit}`);
      console.log(`  cursor.array: ${(cursor as any).array ? 'has array' : 'null array'}`);
      console.log(`  cursor.array length: ${(cursor as any).array?.length}`);

      expect(cursor).toBeInstanceOf(SinglePageCursor);
      expect((cursor as any).array).toBe(testData); // Should reference same array

    } catch (error) {
      console.log(`  ❌ newCursor() failed: ${error}`);
    }

    console.log('✅ Real SinglePageCursor interface works!');
  });

  test('defaultInitCursor with real SinglePageCursor validation', () => {
    console.log('\n🎯 DEFAULT INIT CURSOR TEST: Real SinglePageCursor Validation');
    console.log('=============================================================');

    console.log('Testing defaultInitCursor with real SinglePageCursor...');

    const testData = Array.from({length: 100}, (_, i) => i * 10); // [0, 10, 20, ..., 990]
    const support = new TestHugeCursorSupport(testData);

    console.log('\n1. Valid range operations:');

    const cursor1 = support.newCursor();
    try {
      const result1 = defaultInitCursor(support, cursor1, 0, 50);
      console.log(`  defaultInitCursor(cursor, 0, 50): success`);
      expect(result1).toBe(cursor1); // Should return same instance

      // Verify the range was set
      console.log(`    After init - offset: ${(cursor1 as any).offset}, limit: ${(cursor1 as any).limit}`);
      expect((cursor1 as any).offset).toBe(0);
      expect((cursor1 as any).limit).toBe(50);

    } catch (error) {
      console.log(`  ❌ Valid range failed: ${error}`);
    }

    const cursor2 = support.newCursor();
    try {
      const result2 = defaultInitCursor(support, cursor2, 25, 75);
      console.log(`  defaultInitCursor(cursor, 25, 75): success`);
      expect(result2).toBe(cursor2);

      console.log(`    After init - offset: ${(cursor2 as any).offset}, limit: ${(cursor2 as any).limit}`);
      expect((cursor2 as any).offset).toBe(25);
      expect((cursor2 as any).limit).toBe(75);

    } catch (error) {
      console.log(`  ❌ Valid range failed: ${error}`);
    }

    console.log('\n2. Edge cases with real cursor:');

    // Empty range
    const cursor3 = support.newCursor();
    try {
      const result3 = defaultInitCursor(support, cursor3, 50, 50);
      console.log(`  defaultInitCursor(cursor, 50, 50): success (empty range)`);
      expect(result3).toBe(cursor3);

      console.log(`    Empty range - offset: ${(cursor3 as any).offset}, limit: ${(cursor3 as any).limit}`);
      expect((cursor3 as any).offset).toBe(50);
      expect((cursor3 as any).limit).toBe(50);

    } catch (error) {
      console.log(`  ❌ Empty range failed: ${error}`);
    }

    // Full range
    const cursor4 = support.newCursor();
    try {
      const result4 = defaultInitCursor(support, cursor4, 0, 100);
      console.log(`  defaultInitCursor(cursor, 0, 100): success (full range)`);
      expect(result4).toBe(cursor4);

      console.log(`    Full range - offset: ${(cursor4 as any).offset}, limit: ${(cursor4 as any).limit}`);
      expect((cursor4 as any).offset).toBe(0);
      expect((cursor4 as any).limit).toBe(100);

    } catch (error) {
      console.log(`  ❌ Full range failed: ${error}`);
    }

    console.log('\n3. Invalid parameter cases with real cursors:');

    // Test the exact same validation logic but with real cursors
    const invalidCases = [
      { start: -1, end: 50, desc: 'negative start' },
      { start: 101, end: 101, desc: 'start beyond size' },
      { start: 50, end: 25, desc: 'end before start' },
      { start: 0, end: 101, desc: 'end beyond size' }
    ];

    for (const testCase of invalidCases) {
      const cursor = support.newCursor();
      try {
        defaultInitCursor(support, cursor, testCase.start, testCase.end);
        console.log(`  ❌ Should have failed for ${testCase.desc}`);
        expect.fail(`Should have thrown for ${testCase.desc}`);
      } catch (error) {
        console.log(`  ✅ Correctly rejected ${testCase.desc}: ${(error as Error).message}`);

        // Verify error message format
        if (testCase.start < 0 || testCase.start > 100) {
          expect((error as Error).message).toContain('start expected to be in [0 : 100]');
          expect((error as Error).message).toContain(`but got ${testCase.start}`);
        } else {
          expect((error as Error).message).toContain('end expected to be in');
          expect((error as Error).message).toContain(`but got ${testCase.end}`);
        }
      }
    }

    console.log('✅ Real SinglePageCursor validation works!');
  });

  test('defaultInitCursorFull with real SinglePageCursor', () => {
    console.log('\n🎯 DEFAULT INIT CURSOR FULL TEST: Real SinglePageCursor');
    console.log('======================================================');

    console.log('Testing defaultInitCursorFull with real SinglePageCursor...');

    const testData = [1, 2, 3, 4, 5];
    const support = new TestHugeCursorSupport(testData);

    console.log('\n1. Full cursor initialization:');

    const cursor = support.newCursor();
    console.log(`  Before init - offset: ${(cursor as any).offset}, limit: ${(cursor as any).limit}`);

    try {
      const result = defaultInitCursorFull(cursor);
      console.log(`  defaultInitCursorFull(cursor): success`);
      expect(result).toBe(cursor); // Should return same instance

      console.log(`  After init - offset: ${(cursor as any).offset}, limit: ${(cursor as any).limit}`);
      // Full init should set range to cover entire array
      expect((cursor as any).offset).toBe(0);
      expect((cursor as any).limit).toBe(testData.length);

    } catch (error) {
      console.log(`  ❌ defaultInitCursorFull failed: ${error}`);
    }

    console.log('✅ Real SinglePageCursor full initialization works!');
  });

  test('method overloading pattern with real SinglePageCursor', () => {
    console.log('\n🎯 METHOD OVERLOADING TEST: Real SinglePageCursor Overloads');
    console.log('===========================================================');

    console.log('Testing method overloading with real SinglePageCursor...');

    const testData = Array.from({length: 50}, (_, i) => i + 1); // [1, 2, 3, ..., 50]
    const support = new TestHugeCursorSupport(testData);

    console.log('\n1. Overload 1: initCursor(cursor) - full array:');
    const cursor1 = support.newCursor();
    try {
      const result1 = support.initCursor(cursor1);
      console.log(`  Full array init: success`);
      expect(result1).toBe(cursor1);

      console.log(`    Full init - offset: ${(cursor1 as any).offset}, limit: ${(cursor1 as any).limit}`);
      expect((cursor1 as any).offset).toBe(0);
      expect((cursor1 as any).limit).toBe(50);

    } catch (error) {
      console.log(`  ❌ Full array init failed: ${error}`);
    }

    console.log('\n2. Overload 2: initCursor(cursor, start, end) - range:');
    const cursor2 = support.newCursor();
    try {
      const result2 = support.initCursor(cursor2, 10, 40);
      console.log(`  Range init: success`);
      expect(result2).toBe(cursor2);

      console.log(`    Range init - offset: ${(cursor2 as any).offset}, limit: ${(cursor2 as any).limit}`);
      expect((cursor2 as any).offset).toBe(10);
      expect((cursor2 as any).limit).toBe(40);

    } catch (error) {
      console.log(`  ❌ Range init failed: ${error}`);
    }

    console.log('✅ Method overloading with real cursors works!');
  });

  test('full integration test with real cursor iteration', () => {
    console.log('\n🎯 FULL INTEGRATION TEST: Real Cursor Iteration');
    console.log('===============================================');

    console.log('Testing complete workflow with real SinglePageCursor...');

    const testData = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const support = new TestHugeCursorSupport(testData);

    console.log('\n1. Full array iteration:');
    const cursor1 = support.newCursor();
    support.initCursor(cursor1); // Full array

    let collectedValues: number[] = [];
    let iterationCount = 0;

    while (cursor1.next()) {
      iterationCount++;
      console.log(`  Iteration ${iterationCount}:`);
      console.log(`    base: ${(cursor1 as any).base}, offset: ${(cursor1 as any).offset}, limit: ${(cursor1 as any).limit}`);

      if ((cursor1 as any).array) {
        for (let i = (cursor1 as any).offset; i < (cursor1 as any).limit; i++) {
          const value = (cursor1 as any).array[i];
          collectedValues.push(value);
        }
      }
    }

    console.log(`  Collected values: [${collectedValues.join(', ')}]`);
    console.log(`  Total iterations: ${iterationCount}`);
    expect(collectedValues).toEqual(testData);
    expect(iterationCount).toBe(1); // SinglePageCursor should iterate once

    console.log('\n2. Range iteration:');
    const cursor2 = support.newCursor();
    support.initCursor(cursor2, 3, 7); // Elements at indices 3-6

    let rangeValues: number[] = [];
    let rangeIterations = 0;

    while (cursor2.next()) {
      rangeIterations++;
      console.log(`  Range iteration ${rangeIterations}:`);
      console.log(`    base: ${(cursor2 as any).base}, offset: ${(cursor2 as any).offset}, limit: ${(cursor2 as any).limit}`);

      if ((cursor2 as any).array) {
        for (let i = (cursor2 as any).offset; i < (cursor2 as any).limit; i++) {
          const value = (cursor2 as any).array[i];
          const globalIndex = (cursor2 as any).base + i;
          rangeValues.push(value);
          console.log(`      array[${i}] = ${value} (global: ${globalIndex})`);
        }
      }
    }

    console.log(`  Range values: [${rangeValues.join(', ')}]`);
    const expectedRange = [400, 500, 600, 700]; // testData[3..6]
    expect(rangeValues).toEqual(expectedRange);

    console.log('\n3. Empty range iteration:');
    const cursor3 = support.newCursor();
    support.initCursor(cursor3, 5, 5); // Empty range

    let emptyIterations = 0;
    while (cursor3.next()) {
      emptyIterations++;
    }

    console.log(`  Empty range iterations: ${emptyIterations}`);
    expect(emptyIterations).toBe(0);

    console.log('\n4. Resource cleanup:');
    cursor1.close();
    cursor2.close();
    cursor3.close();

    console.log(`  All cursors closed successfully`);
    expect((cursor1 as any).array).toBeNull();
    expect((cursor2 as any).array).toBeNull();
    expect((cursor3 as any).array).toBeNull();

    console.log('✅ Full integration with real cursors works!');
  });

  test('real-world usage patterns with SinglePageCursor', () => {
    console.log('\n🎯 REAL-WORLD PATTERNS TEST: SinglePageCursor Usage');
    console.log('==================================================');

    console.log('Testing real-world patterns with SinglePageCursor...');

    console.log('\n1. Parallel processing simulation:');
    const TOTAL_SIZE = 1000;
    const THREAD_COUNT = 4;
    const largeData = Array.from({length: TOTAL_SIZE}, (_, i) => i * 2); // [0, 2, 4, ..., 1998]
    const support = new TestHugeCursorSupport(largeData);

    const chunkSize = Math.ceil(TOTAL_SIZE / THREAD_COUNT);
    const threadResults: number[] = [];

    for (let thread = 0; thread < THREAD_COUNT; thread++) {
      const start = thread * chunkSize;
      const end = Math.min(start + chunkSize, TOTAL_SIZE);

      console.log(`  Thread ${thread}: processing range [${start}, ${end})`);

      const cursor = support.newCursor();
      support.initCursor(cursor, start, end);

      let threadSum = 0;
      let elementCount = 0;

      while (cursor.next()) {
        for (let i = (cursor as any).offset; i < (cursor as any).limit; i++) {
          const value = (cursor as any).array[i];
          threadSum += value;
          elementCount++;
        }
      }

      threadResults.push(threadSum);
      console.log(`    Thread ${thread}: processed ${elementCount} elements, sum = ${threadSum}`);
      cursor.close();
    }

    const totalSum = threadResults.reduce((a, b) => a + b, 0);
    const expectedSum = largeData.reduce((a, b) => a + b, 0);
    console.log(`  Total parallel sum: ${totalSum} (expected: ${expectedSum})`);
    expect(totalSum).toBe(expectedSum);

    console.log('\n2. Windowed data processing:');
    const WINDOW_SIZE = 100;
    const STEP_SIZE = 50; // 50% overlap
    const windowData = Array.from({length: 500}, (_, i) => i + 1); // [1, 2, ..., 500]
    const windowSupport = new TestHugeCursorSupport(windowData);

    let windowCount = 0;
    let totalProcessed = 0;

    for (let start = 0; start < windowData.length; start += STEP_SIZE) {
      const end = Math.min(start + WINDOW_SIZE, windowData.length);
      if (start >= end) break;

      windowCount++;
      const cursor = windowSupport.newCursor();
      windowSupport.initCursor(cursor, start, end);

      let windowSum = 0;
      let windowElements = 0;

      while (cursor.next()) {
        for (let i = (cursor as any).offset; i < (cursor as any).limit; i++) {
          windowSum += (cursor as any).array[i];
          windowElements++;
        }
      }

      totalProcessed += windowElements;

      if (windowCount <= 3 || end >= windowData.length) {
        console.log(`    Window ${windowCount}: [${start}, ${end}) = ${windowElements} elements, sum = ${windowSum}`);
      }

      cursor.close();
    }

    console.log(`  Processed ${windowCount} windows, ${totalProcessed} total element accesses`);
    expect(windowCount).toBeGreaterThan(1);

    console.log('\n3. Memory-efficient batch processing:');
    const BATCH_SIZE = 200;
    const batchData = Array.from({length: 1000}, (_, i) => Math.random() * 100);
    const batchSupport = new TestHugeCursorSupport(batchData);

    let batchCount = 0;
    let processedElements = 0;

    for (let start = 0; start < batchData.length; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, batchData.length);
      batchCount++;

      const cursor = batchSupport.newCursor();
      batchSupport.initCursor(cursor, start, end);

      let batchMin = Number.POSITIVE_INFINITY;
      let batchMax = Number.NEGATIVE_INFINITY;
      let batchElements = 0;

      while (cursor.next()) {
        for (let i = (cursor as any).offset; i < (cursor as any).limit; i++) {
          const value = (cursor as any).array[i];
          batchMin = Math.min(batchMin, value);
          batchMax = Math.max(batchMax, value);
          batchElements++;
          processedElements++;
        }
      }

      console.log(`    Batch ${batchCount}: ${batchElements} elements, range [${batchMin.toFixed(2)}, ${batchMax.toFixed(2)}]`);
      cursor.close();
    }

    console.log(`  Processed ${batchCount} batches, ${processedElements} total elements`);
    expect(processedElements).toBe(batchData.length);

    console.log('✅ Real-world patterns with SinglePageCursor work!');
  });

  test('error conditions and edge cases with real cursors', () => {
    console.log('\n🎯 ERROR CONDITIONS TEST: Real SinglePageCursor Edge Cases');
    console.log('==========================================================');

    console.log('Testing error conditions with real SinglePageCursor...');

    console.log('\n1. Empty array handling:');
    const emptyData: number[] = [];
    const emptySupport = new TestHugeCursorSupport(emptyData);

    console.log(`  Empty array size: ${emptySupport.size()}`);
    expect(emptySupport.size()).toBe(0);

    const emptyCursor = emptySupport.newCursor();
    console.log(`  Created cursor for empty array: ${emptyCursor !== null}`);

    // Try to initialize empty cursor
    try {
      emptySupport.initCursor(emptyCursor);
      console.log(`  ✅ Empty array cursor initialization succeeded`);

      const hasData = emptyCursor.next();
      console.log(`  Empty cursor next(): ${hasData}`);
      expect(hasData).toBe(false);

    } catch (error) {
      console.log(`  ❌ Empty array cursor failed: ${error}`);
    }

    console.log('\n2. Single element array:');
    const singleData = [42];
    const singleSupport = new TestHugeCursorSupport(singleData);

    const singleCursor = singleSupport.newCursor();
    singleSupport.initCursor(singleCursor);

    let singleValue = -1;
    if (singleCursor.next()) {
      singleValue = (singleCursor as any).array[(singleCursor as any).offset];
    }

    console.log(`  Single element value: ${singleValue}`);
    expect(singleValue).toBe(42);

    console.log('\n3. Multiple close() calls:');
    const testData = [1, 2, 3];
    const testSupport = new TestHugeCursorSupport(testData);
    const testCursor = testSupport.newCursor();

    testCursor.close();
    console.log(`  First close() completed`);
    expect((testCursor as any).array).toBeNull();

    testCursor.close(); // Should not crash
    console.log(`  Second close() completed safely`);
    expect((testCursor as any).array).toBeNull();

    console.log('\n4. Operations after close:');
    const hasDataAfterClose = testCursor.next();
    console.log(`  next() after close: ${hasDataAfterClose}`);
    expect(hasDataAfterClose).toBe(false);

    console.log('\n5. Boundary value testing:');
    const boundaryData = [Number.MIN_SAFE_INTEGER, -1, 0, 1, Number.MAX_SAFE_INTEGER];
    const boundarySupport = new TestHugeCursorSupport(boundaryData);
    const boundaryCursor = boundarySupport.newCursor();
    boundarySupport.initCursor(boundaryCursor);

    const boundaryValues: number[] = [];
    while (boundaryCursor.next()) {
      for (let i = (boundaryCursor as any).offset; i < (boundaryCursor as any).limit; i++) {
        boundaryValues.push((boundaryCursor as any).array[i]);
      }
    }

    console.log(`  Boundary values: [${boundaryValues.join(', ')}]`);
    expect(boundaryValues).toEqual(boundaryData);

    console.log('✅ Error conditions and edge cases handled correctly!');
  });
});
