import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HugeByteArray } from '../HugeByteArray';
import { HugeArrays } from '@/mem/HugeArrays';

describe('HugeByteArray', () => {
  let array: HugeByteArray;

  afterEach(() => {
    // Clean up memory after each test
    if (array) {
      array.release();
    }
  });

  describe('Factory Methods', () => {
    it('should create small arrays as SingleHugeByteArray', () => {
      const size = 1000;
      array = HugeByteArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('SingleHugeByteArray');
    });

    it('should create large arrays as PagedHugeByteArray', () => {
      const size = HugeArrays.MAX_ARRAY_LENGTH + 1000;
      array = HugeByteArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('PagedHugeByteArray');
    });

    it('should create array from values', () => {
      array = HugeByteArray.of(1, 2, 3, 4, 5);

      expect(array.size()).toBe(5);
      expect(array.get(0)).toBe(1);
      expect(array.get(4)).toBe(5);
    });

    it('should estimate memory correctly', () => {
      const size = 10000;
      const estimation = HugeByteArray.memoryEstimation(size);

      expect(estimation).toBeGreaterThan(0);
      expect(typeof estimation).toBe('number');
    });

    it('should use test factory methods', () => {
      const singleArray = HugeByteArray.newSingleArray(100);
      expect(singleArray.constructor.name).toBe('SingleHugeByteArray');
      singleArray.release();

      const pagedArray = HugeByteArray.newPagedArray(HugeArrays.PAGE_SIZE + 100);
      expect(pagedArray.constructor.name).toBe('PagedHugeByteArray');
      pagedArray.release();
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      array = HugeByteArray.newArray(100);
    });

    it('should get and set values correctly', () => {
      array.set(0, 42);
      array.set(50, 123);
      array.set(99, 255);

      expect(array.get(0)).toBe(42);
      expect(array.get(50)).toBe(123);
      expect(array.get(99)).toBe(255);
    });

    it('should initialize with zeros', () => {
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(0);
      }
    });

    it('should handle byte range values', () => {
      array.set(0, 0);     // Min unsigned byte
      array.set(1, 255);   // Max unsigned byte
      array.set(2, 128);   // Mid-range value

      expect(array.get(0)).toBe(0);
      expect(array.get(1)).toBe(255);
      expect(array.get(2)).toBe(128);
    });

    it('should throw on invalid indices', () => {
      expect(() => array.get(-1)).toThrow();
      expect(() => array.get(array.size())).toThrow();
      expect(() => array.set(-1, 42)).toThrow();
      expect(() => array.set(array.size(), 42)).toThrow();
    });
  });

  describe('Byte-Specific Bitwise Operations', () => {
    beforeEach(() => {
      array = HugeByteArray.newArray(10);
    });

    it('should perform OR operations correctly', () => {
      array.set(0, 5); // Binary: 00000101
      array.or(0, 3);  // Binary: 00000011

      expect(array.get(0)).toBe(7); // Binary: 00000111
    });

    it('should perform AND operations correctly', () => {
      array.set(0, 7); // Binary: 00000111
      const result = array.and(0, 5); // Binary: 00000101

      expect(result).toBe(5); // Binary: 00000101
      expect(array.get(0)).toBe(5);
    });

    it('should handle byte-level flags correctly', () => {
      const FLAG_A = 1;   // Bit 0: 00000001
      const FLAG_B = 2;   // Bit 1: 00000010
      const FLAG_C = 4;   // Bit 2: 00000100
      const FLAG_D = 8;   // Bit 3: 00001000
      const FLAG_E = 16;  // Bit 4: 00010000

      // Set multiple flags using OR
      array.or(0, FLAG_A);
      array.or(0, FLAG_C);
      array.or(0, FLAG_E);

      expect(array.get(0)).toBe(FLAG_A | FLAG_C | FLAG_E); // 21 = 00010101

      // Test individual flags
      expect(array.get(0) & FLAG_A).toBeTruthy();
      expect(array.get(0) & FLAG_B).toBeFalsy();
      expect(array.get(0) & FLAG_C).toBeTruthy();
      expect(array.get(0) & FLAG_D).toBeFalsy();
      expect(array.get(0) & FLAG_E).toBeTruthy();

      // Clear specific flag
      array.and(0, ~FLAG_C);
      expect(array.get(0)).toBe(FLAG_A | FLAG_E); // 17 = 00010001
      expect(array.get(0) & FLAG_C).toBeFalsy();
    });

    it('should handle full byte bitmask operations', () => {
      // Test with all 8 bits
      array.set(0, 0xFF); // All bits set: 11111111

      // Clear even bits (keep odd bits)
      const oddBitMask = 0xAA; // 10101010
      const result = array.and(0, oddBitMask);

      expect(result).toBe(0xAA);
      expect(array.get(0)).toBe(0xAA);

      // Set even bits back
      array.or(0, 0x55); // 01010101
      expect(array.get(0)).toBe(0xFF); // Back to all bits set
    });

    it('should handle nibble operations', () => {
      // Work with 4-bit nibbles within byte
      array.set(0, 0x34); // High nibble = 3, low nibble = 4

      // Extract high nibble
      const highNibble = (array.get(0) & 0xF0) >> 4;
      expect(highNibble).toBe(3);

      // Extract low nibble
      const lowNibble = array.get(0) & 0x0F;
      expect(lowNibble).toBe(4);

      // Clear high nibble
      array.and(0, 0x0F);
      expect(array.get(0)).toBe(4);

      // Set new high nibble
      array.or(0, 0x70); // Set high nibble to 7
      expect(array.get(0)).toBe(0x74);
    });
  });

  describe('Byte Arithmetic Operations', () => {
    beforeEach(() => {
      array = HugeByteArray.newArray(10);
    });

    it('should add values correctly', () => {
      array.set(0, 10);
      array.addTo(0, 5);

      expect(array.get(0)).toBe(15);
    });

    it('should handle getAndAdd atomic operation', () => {
      array.set(0, 100);
      const oldValue = array.getAndAdd(0, 25);

      expect(oldValue).toBe(100);
      expect(array.get(0)).toBe(125);
    });

    it('should accumulate small counters', () => {
      // Simulate small counter increments
      array.addTo(0, 1); // Count: 1
      array.addTo(0, 1); // Count: 2
      array.addTo(0, 1); // Count: 3

      expect(array.get(0)).toBe(3);
    });

    it('should handle byte overflow in addition', () => {
      array.set(0, 250);
      array.addTo(0, 10); // Would overflow byte range

      // JavaScript numbers don't overflow like C bytes, so result is 260
      expect(array.get(0)).toBe(260);
    });

    it('should handle counter patterns', () => {
      // Simulate event counting with byte-sized counters
      for (let event = 0; event < 50; event++) {
        array.addTo(event % 10, 1); // Distribute events across 10 counters
      }

      // Each counter should have 5 events
      for (let i = 0; i < 10; i++) {
        expect(array.get(i)).toBe(5);
      }
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      array = HugeByteArray.newArray(100);
    });

    it('should fill with constant value', () => {
      array.fill(42);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(42);
      }
    });

    it('should set all with generator function', () => {
      array.setAll(index => index % 256); // Keep in byte range

      for (let i = 0; i < Math.min(array.size(), 256); i++) {
        expect(array.get(i)).toBe(i);
      }
    });

    it('should generate boolean flags', () => {
      // Generate alternating true/false pattern
      array.setAll(index => index % 2);

      for (let i = 0; i < 20; i++) {
        expect(array.get(i)).toBe(i % 2);
      }
    });

    it('should generate categorical data', () => {
      // Simulate categories (0-7)
      array.setAll(index => index % 8);

      for (let i = 0; i < 32; i++) {
        expect(array.get(i)).toBe(i % 8);
      }
    });

    it('should generate bit patterns', () => {
      // Generate powers of 2 within byte range
      array.setAll(index => Math.min(1 << (index % 8), 255));

      expect(array.get(0)).toBe(1);   // 2^0
      expect(array.get(1)).toBe(2);   // 2^1
      expect(array.get(2)).toBe(4);   // 2^2
      expect(array.get(7)).toBe(128); // 2^7
      expect(array.get(8)).toBe(1);   // Cycles back to 2^0
    });
  });

  describe('Array Conversion and Copying', () => {
    beforeEach(() => {
      array = HugeByteArray.of(10, 20, 30, 40, 50);
    });

    it('should convert to regular array', () => {
      const regularArray = array.toArray();

      expect(regularArray).toEqual([10, 20, 30, 40, 50]);
      expect(Array.isArray(regularArray)).toBe(true);
    });

    it('should create copy with different length', () => {
      const copy = array.copyOf(3);

      expect(copy.size()).toBe(3);
      expect(copy.get(0)).toBe(10);
      expect(copy.get(1)).toBe(20);
      expect(copy.get(2)).toBe(30);

      copy.release();
    });

    it('should create copy with larger length', () => {
      const copy = array.copyOf(8);

      expect(copy.size()).toBe(8);
      expect(copy.get(0)).toBe(10);
      expect(copy.get(4)).toBe(50);
      expect(copy.get(5)).toBe(0); // Should be zero-filled
      expect(copy.get(7)).toBe(0);

      copy.release();
    });

    it('should handle boxed operations', () => {
      expect(array.boxedGet(0)).toBe(10);

      array.boxedSet(0, 99);
      expect(array.get(0)).toBe(99);

      array.boxedFill(77);
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(77);
      }
    });
  });

  describe('Copy Operations Between Arrays', () => {
    let source: HugeByteArray;
    let dest: HugeByteArray;

    beforeEach(() => {
      source = HugeByteArray.of(100, 150, 200, 250, 255);
      dest = HugeByteArray.newArray(10);
    });

    afterEach(() => {
      source.release();
      dest.release();
    });

    it('should copy to another array', () => {
      source.copyTo(dest, 5);

      expect(dest.get(0)).toBe(100);
      expect(dest.get(4)).toBe(255);
      expect(dest.get(5)).toBe(0); // Should remain zero
    });

    it('should copy partial data', () => {
      source.copyTo(dest, 3);

      expect(dest.get(0)).toBe(100);
      expect(dest.get(2)).toBe(200);
      expect(dest.get(3)).toBe(0); // Should remain zero
    });

    it('should copy between single and paged arrays', () => {
      const largeDest = HugeByteArray.newPagedArray(HugeArrays.PAGE_SIZE + 100);

      source.copyTo(largeDest, 5);

      expect(largeDest.get(0)).toBe(100);
      expect(largeDest.get(4)).toBe(255);
      expect(largeDest.get(5)).toBe(0);

      largeDest.release();
    });
  });

  describe('Cursor Operations', () => {
    beforeEach(() => {
      array = HugeByteArray.newArray(100);
      array.setAll(index => (index * 3) % 256); // Distinct byte values
    });

    it('should iterate with cursor', () => {
      const cursor = array.newCursor();
      array.initCursor(cursor);

      let elementCount = 0;
      let sum = 0;

      try {
        while (cursor.next()) {
          const page = cursor.array!;
          for (let i = cursor.offset; i < cursor.limit; i++) {
            sum += page[i];
            elementCount++;
          }
        }
      } finally {
        cursor.close();
      }

      expect(elementCount).toBe(100);
      // Calculate expected sum: sum of (i * 3) % 256 for i = 0 to 99
      let expectedSum = 0;
      for (let i = 0; i < 100; i++) {
        expectedSum += (i * 3) % 256;
      }
      expect(sum).toBe(expectedSum);
    });

    it('should handle empty arrays with cursor', () => {
      const emptyArray = HugeByteArray.newArray(0);
      const cursor = emptyArray.newCursor();
      emptyArray.initCursor(cursor);

      let called = false;
      try {
        while (cursor.next()) {
          called = true;
        }
      } finally {
        cursor.close();
        emptyArray.release();
      }

      expect(called).toBe(false);
    });

    it('should process large arrays efficiently with cursor', () => {
      const largeArray = HugeByteArray.newPagedArray(HugeArrays.PAGE_SIZE + 1000);
      largeArray.setAll(index => index % 256); // Byte-safe pattern

      const cursor = largeArray.newCursor();
      largeArray.initCursor(cursor);

      let pageCount = 0;
      let totalElements = 0;

      try {
        while (cursor.next()) {
          pageCount++;
          totalElements += (cursor.limit - cursor.offset);
        }
      } finally {
        cursor.close();
        largeArray.release();
      }

      expect(pageCount).toBeGreaterThan(1); // Should span multiple pages
      expect(totalElements).toBe(HugeArrays.PAGE_SIZE + 1000);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      array = HugeByteArray.newArray(1000);
      const memoryUsed = array.sizeOf();

      expect(memoryUsed).toBeGreaterThan(0);
      expect(typeof memoryUsed).toBe('number');
    });

    it('should release memory', () => {
      array = HugeByteArray.newArray(1000);
      const memoryUsed = array.sizeOf();
      const freedMemory = array.release();

      expect(freedMemory).toBe(memoryUsed);

      // Second release should return 0
      const secondRelease = array.release();
      expect(secondRelease).toBe(0);
    });

    it('should estimate memory before allocation', () => {
      const size = 50000;
      const estimation = HugeByteArray.memoryEstimation(size);

      array = HugeByteArray.newArray(size);
      const actualMemory = array.sizeOf();

      // Estimation should be reasonably close to actual
      expect(Math.abs(estimation - actualMemory)).toBeLessThan(actualMemory * 0.1);
    });
  });

  describe('Large Array Scenarios', () => {
    it('should handle page boundaries correctly', () => {
      const size = HugeArrays.PAGE_SIZE + 100; // Cross page boundary
      array = HugeByteArray.newPagedArray(size);

      // Set values around page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.set(boundaryIndex, 200);
      array.set(boundaryIndex + 1, 201);

      expect(array.get(boundaryIndex)).toBe(200);
      expect(array.get(boundaryIndex + 1)).toBe(201);
    });

    it('should perform operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE * 2 + 100;
      array = HugeByteArray.newPagedArray(size);

      // Fill array with byte-safe index values
      array.setAll(index => index % 256);

      // Check values across different pages
      expect(array.get(0)).toBe(0);
      expect(array.get(255)).toBe(255);
      expect(array.get(256)).toBe(0); // Wraps around
      expect(array.get(HugeArrays.PAGE_SIZE)).toBe(HugeArrays.PAGE_SIZE % 256);
    });

    it('should handle bitwise operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE + 100;
      array = HugeByteArray.newPagedArray(size);

      // Set flags across page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.or(boundaryIndex, 0xF0);   // High nibble
      array.or(boundaryIndex + 1, 0x0F); // Low nibble

      expect(array.get(boundaryIndex)).toBe(0xF0);
      expect(array.get(boundaryIndex + 1)).toBe(0x0F);

      // Test AND operations
      const result1 = array.and(boundaryIndex, 0xFF);     // No change
      const result2 = array.and(boundaryIndex + 1, 0x07); // Clear bit 3

      expect(result1).toBe(0xF0);
      expect(result2).toBe(0x07);
    });
  });

  describe('Graph Algorithm Simulation', () => {
    it('should simulate node visit flags', () => {
      const nodeCount = 1000;
      const visited = HugeByteArray.newArray(nodeCount);

      // Simulate BFS traversal
      const visitOrder = [0, 1, 2, 5, 10, 15, 20];

      for (const nodeId of visitOrder) {
        visited.set(nodeId, 1); // Mark as visited
      }

      // Check visit status
      for (const nodeId of visitOrder) {
        expect(visited.get(nodeId)).toBe(1);
      }

      // Check unvisited nodes
      expect(visited.get(3)).toBe(0);
      expect(visited.get(50)).toBe(0);

      visited.release();
    });

    it('should simulate node state with multiple flags', () => {
      const nodeCount = 100;
      const nodeStates = HugeByteArray.newArray(nodeCount);

      const VISITED = 1;     // Bit 0
      const QUEUED = 2;      // Bit 1
      const PROCESSED = 4;   // Bit 2
      const ACTIVE = 8;      // Bit 3
      const MARKED = 16;     // Bit 4

      // Set multiple states for different nodes
      nodeStates.or(0, VISITED | QUEUED);           // Node 0: visited and queued
      nodeStates.or(1, VISITED | PROCESSED);        // Node 1: visited and processed
      nodeStates.or(2, VISITED | QUEUED | ACTIVE);  // Node 2: visited, queued, active
      nodeStates.or(5, MARKED);                     // Node 5: just marked

      // Check compound states
      expect(nodeStates.get(0) & VISITED).toBeTruthy();
      expect(nodeStates.get(0) & QUEUED).toBeTruthy();
      expect(nodeStates.get(0) & PROCESSED).toBeFalsy();

      expect(nodeStates.get(1) & VISITED).toBeTruthy();
      expect(nodeStates.get(1) & PROCESSED).toBeTruthy();
      expect(nodeStates.get(1) & QUEUED).toBeFalsy();

      expect(nodeStates.get(2) & ACTIVE).toBeTruthy();
      expect(nodeStates.get(5) & MARKED).toBeTruthy();

      // Clear specific flags
      nodeStates.and(0, ~QUEUED); // Remove from queue
      expect(nodeStates.get(0) & QUEUED).toBeFalsy();
      expect(nodeStates.get(0) & VISITED).toBeTruthy(); // Should still be visited

      nodeStates.release();
    });

    it('should simulate small degree counting', () => {
      const nodeCount = 1000;
      const smallDegrees = HugeByteArray.newArray(nodeCount);

      // Simulate edges for nodes with small degrees (< 256)
      const edges = [
        [0, 1], [0, 2], [0, 3],           // Node 0: degree 3
        [1, 2], [1, 3], [1, 4], [1, 5],  // Node 1: degree 4 (+ incoming from 0)
        [2, 4], [2, 5],                  // Node 2: degree 2 (+ incoming from 0,1)
        [10, 11], [10, 12], [10, 13], [10, 14], [10, 15] // Node 10: degree 5
      ];

      for (const [source, target] of edges) {
        // Count both outgoing and incoming edges
        if (smallDegrees.get(source) < 255) smallDegrees.addTo(source, 1);
        if (smallDegrees.get(target) < 255) smallDegrees.addTo(target, 1);
      }

      expect(smallDegrees.get(0)).toBe(3);  // 3 outgoing
      expect(smallDegrees.get(1)).toBe(5);  // 4 outgoing + 1 incoming
      expect(smallDegrees.get(2)).toBe(4);  // 2 outgoing + 2 incoming
      expect(smallDegrees.get(10)).toBe(5); // 5 outgoing
      expect(smallDegrees.get(11)).toBe(1); // 1 incoming

      smallDegrees.release();
    });

    it('should simulate node categories', () => {
      const nodeCount = 1000;
      const categories = HugeByteArray.newArray(nodeCount);

      // Assign categories (0-15) to nodes
      const PERSON = 1;
      const ORGANIZATION = 2;
      const LOCATION = 3;
      const EVENT = 4;
      const DOCUMENT = 5;

      categories.setAll(nodeId => {
        if (nodeId < 100) return PERSON;
        if (nodeId < 200) return ORGANIZATION;
        if (nodeId < 300) return LOCATION;
        if (nodeId < 400) return EVENT;
        return DOCUMENT;
      });

      // Verify categories
      expect(categories.get(50)).toBe(PERSON);
      expect(categories.get(150)).toBe(ORGANIZATION);
      expect(categories.get(250)).toBe(LOCATION);
      expect(categories.get(350)).toBe(EVENT);
      expect(categories.get(500)).toBe(DOCUMENT);

      // Count nodes by category
      let personCount = 0;
      for (let i = 0; i < 500; i++) {
        if (categories.get(i) === PERSON) personCount++;
      }
      expect(personCount).toBe(100);

      categories.release();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero-sized arrays', () => {
      array = HugeByteArray.newArray(0);

      expect(array.size()).toBe(0);
      expect(array.toArray()).toEqual([]);
    });

    it('should handle single element arrays', () => {
      array = HugeByteArray.newArray(1);
      array.set(0, 200);

      expect(array.size()).toBe(1);
      expect(array.get(0)).toBe(200);
      expect(array.toArray()).toEqual([200]);
    });

    it('should handle exact page size arrays', () => {
      array = HugeByteArray.newArray(HugeArrays.PAGE_SIZE);
      array.fill(123);

      expect(array.size()).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(0)).toBe(123);
      expect(array.get(HugeArrays.PAGE_SIZE - 1)).toBe(123);
    });

    it('should handle full byte range values', () => {
      array = HugeByteArray.newArray(10);

      array.set(0, 0);     // Min byte value
      array.set(1, 127);   // Max signed byte value
      array.set(2, 128);   // Min negative signed byte as unsigned
      array.set(3, 255);   // Max unsigned byte value

      expect(array.get(0)).toBe(0);
      expect(array.get(1)).toBe(127);
      expect(array.get(2)).toBe(128);
      expect(array.get(3)).toBe(255);
    });
  });

  describe('String Representation', () => {
    it('should provide string representation for small arrays', () => {
      array = HugeByteArray.of(1, 2, 3);
      const str = array.toString();

      expect(str).toContain('1');
      expect(str).toContain('2');
      expect(str).toContain('3');
    });

    it('should handle toString for single element', () => {
      array = HugeByteArray.of(200);
      const str = array.toString();

      expect(str).toContain('200');
    });

    it('should handle toString for byte range values', () => {
      array = HugeByteArray.of(0, 128, 255);
      const str = array.toString();

      expect(str).toContain('0');
      expect(str).toContain('128');
      expect(str).toContain('255');
    });
  });
});
