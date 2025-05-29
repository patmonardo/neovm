import { HugeArrays } from '@/mem';
import { HugeIntArray } from '../HugeIntArray';

describe('HugeIntArray', () => {
  let array: HugeIntArray;

  afterEach(() => {
    // Clean up memory after each test
    if (array) {
      array.release();
    }
  });

  describe('Factory Methods', () => {
    it('should create small arrays as SingleHugeIntArray', () => {
      const size = 1000;
      array = HugeIntArray.newSingleArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('SingleHugeIntArray');
    });

    it('should create large arrays as PagedHugeIntArray', () => {
      const size = HugeArrays.PAGE_SIZE + 1000;
      array = HugeIntArray.newPagedArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('PagedHugeIntArray');
    });

    it('should create array from values', () => {
      array = HugeIntArray.of(1, 2, 3, 4, 5);

      expect(array.size()).toBe(5);
      expect(array.get(0)).toBe(1);
      expect(array.get(4)).toBe(5);
    });

    it('should estimate memory correctly', () => {
      const size = 10000;
      const estimation = HugeIntArray.memoryEstimation(size);

      expect(estimation).toBeGreaterThan(0);
      expect(typeof estimation).toBe('number');
    });

    it('should use test factory methods', () => {
      const singleArray = HugeIntArray.newSingleArray(100);
      expect(singleArray.constructor.name).toBe('SingleHugeIntArray');
      singleArray.release();

      const pagedArray = HugeIntArray.newPagedArray(HugeArrays.PAGE_SIZE + 100);
      expect(pagedArray.constructor.name).toBe('PagedHugeIntArray');
      pagedArray.release();
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      array = HugeIntArray.newArray(100);
    });

    it('should get and set values correctly', () => {
      array.set(0, 42);
      array.set(50, 123);
      array.set(99, 999);

      expect(array.get(0)).toBe(42);
      expect(array.get(50)).toBe(123);
      expect(array.get(99)).toBe(999);
    });

    it('should initialize with zeros', () => {
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(0);
      }
    });

    it('should handle negative values', () => {
      array.set(0, -42);
      array.set(1, -2147483648); // Min 32-bit int
      array.set(2, 2147483647);  // Max 32-bit int

      expect(array.get(0)).toBe(-42);
      expect(array.get(1)).toBe(-2147483648);
      expect(array.get(2)).toBe(2147483647);
    });

    it('should throw on invalid indices', () => {
      expect(() => array.get(-1)).toThrow();
      expect(() => array.get(array.size())).toThrow();
      expect(() => array.set(-1, 42)).toThrow();
      expect(() => array.set(array.size(), 42)).toThrow();
    });
  });

  describe('Integer-Specific Bitwise Operations', () => {
    beforeEach(() => {
      array = HugeIntArray.newArray(10);
    });

    it('should perform OR operations correctly', () => {
      array.set(0, 5); // Binary: 101
      array.or(0, 3);  // Binary: 011

      expect(array.get(0)).toBe(7); // Binary: 111
    });

    it('should perform AND operations correctly', () => {
      array.set(0, 7); // Binary: 111
      const result = array.and(0, 5); // Binary: 101

      expect(result).toBe(5); // Binary: 101
      expect(array.get(0)).toBe(5);
    });

    it('should handle 32-bit integer flags correctly', () => {
      const VISITED = 1;
      const PROCESSED = 2;
      const IN_QUEUE = 4;
      const HAS_OUTGOING = 8;
      const HAS_INCOMING = 16;

      // Set multiple flags using OR
      array.or(0, VISITED);
      array.or(0, PROCESSED);
      array.or(0, HAS_OUTGOING);

      expect(array.get(0)).toBe(VISITED | PROCESSED | HAS_OUTGOING); // 11

      // Test individual flags
      expect(array.get(0) & VISITED).toBeTruthy();
      expect(array.get(0) & PROCESSED).toBeTruthy();
      expect(array.get(0) & HAS_OUTGOING).toBeTruthy();
      expect(array.get(0) & IN_QUEUE).toBeFalsy();
      expect(array.get(0) & HAS_INCOMING).toBeFalsy();

      // Clear specific flags using AND with complement
      array.and(0, ~VISITED);
      expect(array.get(0)).toBe(PROCESSED | HAS_OUTGOING); // 10
      expect(array.get(0) & VISITED).toBeFalsy();
    });

    it('should handle complex bitmask operations', () => {
      // Test with larger bitmasks
      const mask1 = 0x12345678; // Complex pattern
      const mask2 = 0x87654321; // Another pattern

      array.set(0, mask1);
      array.or(0, mask2);

      expect(array.get(0)).toBe(mask1 | mask2);

      // Test masking operation
      const testMask = 0x0000FFFF;
      const result = array.and(0, testMask);
      expect(result).toBe((mask1 | mask2) & testMask);
    });
  });

  describe('Integer Arithmetic Operations', () => {
    beforeEach(() => {
      array = HugeIntArray.newArray(10);
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

    it('should accumulate values for counters', () => {
      // Simulate node degree counting
      array.addTo(0, 1); // First connection
      array.addTo(0, 1); // Second connection
      array.addTo(0, 1); // Third connection

      expect(array.get(0)).toBe(3);
    });

    it('should handle negative arithmetic', () => {
      array.set(0, 10);
      array.addTo(0, -3);

      expect(array.get(0)).toBe(7);

      const oldValue = array.getAndAdd(0, -7);
      expect(oldValue).toBe(7);
      expect(array.get(0)).toBe(0);
    });

    it('should handle integer overflow gracefully', () => {
      // JavaScript handles this automatically, but test the behavior
      array.set(0, 2147483647); // Max 32-bit signed int
      array.addTo(0, 1);

      // Should handle overflow according to JavaScript semantics
      expect(array.get(0)).toBe(2147483648);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      array = HugeIntArray.newArray(100);
    });

    it('should fill with constant value', () => {
      array.fill(42);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(42);
      }
    });

    it('should set all with generator function', () => {
      array.setAll(index => index * 2);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(i * 2);
      }
    });

    it('should generate node ID mappings', () => {
      // Common pattern: generate compact node IDs
      array.setAll(index => index + 1000); // Offset node IDs

      expect(array.get(0)).toBe(1000);
      expect(array.get(50)).toBe(1050);
      expect(array.get(99)).toBe(1099);
    });

    it('should generate categorical data', () => {
      // Simulate node categories (0-4)
      array.setAll(index => index % 5);

      for (let i = 0; i < 25; i++) {
        expect(array.get(i)).toBe(i % 5);
      }
    });

    it('should handle mathematical sequences', () => {
      // Generate powers of 2 (within integer range)
      array.setAll(index => Math.min(1 << index, 2147483647));

      expect(array.get(0)).toBe(1);
      expect(array.get(1)).toBe(2);
      expect(array.get(2)).toBe(4);
      expect(array.get(3)).toBe(8);
      expect(array.get(10)).toBe(1024);
    });
  });

  describe('Array Conversion and Copying', () => {
    beforeEach(() => {
      array = HugeIntArray.of(1, 2, 3, 4, 5);
    });

    it('should convert to regular array', () => {
      const regularArray = array.toArray();

      expect(regularArray).toEqual([1, 2, 3, 4, 5]);
      expect(Array.isArray(regularArray)).toBe(true);
    });

    it('should create copy with different length', () => {
      const copy = array.copyOf(3);

      expect(copy.size()).toBe(3);
      expect(copy.get(0)).toBe(1);
      expect(copy.get(1)).toBe(2);
      expect(copy.get(2)).toBe(3);

      copy.release();
    });

    it('should create copy with larger length', () => {
      const copy = array.copyOf(8);

      expect(copy.size()).toBe(8);
      expect(copy.get(0)).toBe(1);
      expect(copy.get(4)).toBe(5);
      expect(copy.get(5)).toBe(0); // Should be zero-filled
      expect(copy.get(7)).toBe(0);

      copy.release();
    });

    it('should handle boxed operations', () => {
      expect(array.boxedGet(0)).toBe(1);

      array.boxedSet(0, 99);
      expect(array.get(0)).toBe(99);

      array.boxedFill(77);
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(77);
      }
    });
  });

  describe('Copy Operations Between Arrays', () => {
    let source: HugeIntArray;
    let dest: HugeIntArray;

    beforeEach(() => {
      source = HugeIntArray.of(10, 20, 30, 40, 50);
      dest = HugeIntArray.newArray(10);
    });

    afterEach(() => {
      source.release();
      dest.release();
    });

    it('should copy to another array', () => {
      source.copyTo(dest, 5);

      expect(dest.get(0)).toBe(10);
      expect(dest.get(4)).toBe(50);
      expect(dest.get(5)).toBe(0); // Should remain zero
    });

    it('should copy partial data', () => {
      source.copyTo(dest, 3);

      expect(dest.get(0)).toBe(10);
      expect(dest.get(2)).toBe(30);
      expect(dest.get(3)).toBe(0); // Should remain zero
    });

    it('should copy between single and paged arrays', () => {
      const largeDest = HugeIntArray.newArray(HugeArrays.PAGE_SIZE + 100);

      source.copyTo(largeDest, 5);

      expect(largeDest.get(0)).toBe(10);
      expect(largeDest.get(4)).toBe(50);
      expect(largeDest.get(5)).toBe(0);

      largeDest.release();
    });
  });

  describe('Cursor Operations', () => {
    beforeEach(() => {
      array = HugeIntArray.newArray(100);
      array.setAll(index => index * 10); // Distinct values
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
      expect(sum).toBe(49500); // Sum of 0*10 + 1*10 + ... + 99*10
    });

    it('should handle empty arrays with cursor', () => {
      const emptyArray = HugeIntArray.newArray(0);
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
      const largeArray = HugeIntArray.newPagedArray(HugeArrays.PAGE_SIZE + 1000);
      largeArray.setAll(index => index % 1000); // Repeating pattern

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
      array = HugeIntArray.newArray(1000);
      const memoryUsed = array.sizeOf();

      expect(memoryUsed).toBeGreaterThan(0);
      expect(typeof memoryUsed).toBe('number');
    });

    it('should release memory', () => {
      array = HugeIntArray.newArray(1000);
      const memoryUsed = array.sizeOf();
      const freedMemory = array.release();

      expect(freedMemory).toBe(memoryUsed);

      // Second release should return 0
      const secondRelease = array.release();
      expect(secondRelease).toBe(0);
    });

    it('should estimate memory before allocation', () => {
      const size = 50000;
      const estimation = HugeIntArray.memoryEstimation(size);

      array = HugeIntArray.newArray(size);
      const actualMemory = array.sizeOf();

      // Estimation should be reasonably close to actual
      expect(Math.abs(estimation - actualMemory)).toBeLessThan(actualMemory * 0.1);
    });
  });

  describe('Large Array Scenarios', () => {
    it('should handle page boundaries correctly', () => {
      const size = HugeArrays.PAGE_SIZE + 100; // Cross page boundary
      array = HugeIntArray.newArray(size);

      // Set values around page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.set(boundaryIndex, 999);
      array.set(boundaryIndex + 1, 1000);

      expect(array.get(boundaryIndex)).toBe(999);
      expect(array.get(boundaryIndex + 1)).toBe(1000);
    });

    it('should perform operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE * 2 + 100;
      array = HugeIntArray.newArray(size);

      // Fill array with index values
      array.setAll(index => index);

      // Check values across different pages
      expect(array.get(0)).toBe(0);
      expect(array.get(HugeArrays.PAGE_SIZE)).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(size - 1)).toBe(size - 1);
    });

    it('should handle bitwise operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE + 100;
      array = HugeIntArray.newArray(size);

      // Set flags across page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.or(boundaryIndex, 0xFF);
      array.or(boundaryIndex + 1, 0xAA);

      expect(array.get(boundaryIndex)).toBe(0xFF);
      expect(array.get(boundaryIndex + 1)).toBe(0xAA);

      // Test AND operations
      const result1 = array.and(boundaryIndex, 0x0F);
      const result2 = array.and(boundaryIndex + 1, 0xF0);

      expect(result1).toBe(0x0F);
      expect(result2).toBe(0xA0);
    });
  });

  describe('Graph Algorithm Simulation', () => {
    it('should simulate node degree counting', () => {
      const nodeCount = 1000;
      const degrees = HugeIntArray.newArray(nodeCount);

      // Simulate edges being added
      const edges = [
        [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [4, 5]
      ];

      for (const [source, target] of edges) {
        degrees.addTo(source, 1); // Out-degree
        degrees.addTo(target, 1); // In-degree
      }

      expect(degrees.get(0)).toBe(2); // Connected to 1, 2
      expect(degrees.get(1)).toBe(3); // Connected to 0, 2, 3
      expect(degrees.get(2)).toBe(3); // Connected to 0, 1, 3
      expect(degrees.get(3)).toBe(3); // Connected to 1, 2, 4
      expect(degrees.get(4)).toBe(2); // Connected to 3, 5
      expect(degrees.get(5)).toBe(1); // Connected to 4

      degrees.release();
    });

    it('should simulate algorithm state flags', () => {
      const nodeCount = 100;
      const flags = HugeIntArray.newArray(nodeCount);

      const VISITED = 1;
      const PROCESSED = 2;
      const IN_QUEUE = 4;
      const BLOCKED = 8;

      // BFS-style algorithm simulation
      flags.or(0, VISITED | IN_QUEUE); // Start node
      flags.or(1, VISITED);            // Discovered node
      flags.or(2, VISITED | PROCESSED); // Completed node
      flags.or(3, BLOCKED);            // Blocked node

      // Check node states
      expect(flags.get(0) & VISITED).toBeTruthy();
      expect(flags.get(0) & IN_QUEUE).toBeTruthy();
      expect(flags.get(0) & PROCESSED).toBeFalsy();

      expect(flags.get(1) & VISITED).toBeTruthy();
      expect(flags.get(1) & PROCESSED).toBeFalsy();

      expect(flags.get(2) & VISITED).toBeTruthy();
      expect(flags.get(2) & PROCESSED).toBeTruthy();

      expect(flags.get(3) & BLOCKED).toBeTruthy();
      expect(flags.get(3) & VISITED).toBeFalsy();

      flags.release();
    });

    it('should simulate community detection', () => {
      const nodeCount = 1000;
      const communityIds = HugeIntArray.newArray(nodeCount);

      // Initialize: each node in its own community
      communityIds.setAll(nodeId => nodeId);

      // Simulate community merging
      const communities = [
        { nodes: [0, 1, 2], newId: 0 },
        { nodes: [3, 4, 5], newId: 3 },
        { nodes: [6, 7, 8, 9], newId: 6 }
      ];

      for (const community of communities) {
        for (const nodeId of community.nodes) {
          communityIds.set(nodeId, community.newId);
        }
      }

      // Verify community assignments
      expect(communityIds.get(0)).toBe(0);
      expect(communityIds.get(1)).toBe(0);
      expect(communityIds.get(2)).toBe(0);

      expect(communityIds.get(3)).toBe(3);
      expect(communityIds.get(4)).toBe(3);
      expect(communityIds.get(5)).toBe(3);

      expect(communityIds.get(6)).toBe(6);
      expect(communityIds.get(9)).toBe(6);

      // Remaining nodes should be in their original communities
      expect(communityIds.get(10)).toBe(10);

      communityIds.release();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero-sized arrays', () => {
      array = HugeIntArray.newArray(0);

      expect(array.size()).toBe(0);
      expect(array.toArray()).toEqual([]);
    });

    it('should handle single element arrays', () => {
      array = HugeIntArray.newArray(1);
      array.set(0, 42);

      expect(array.size()).toBe(1);
      expect(array.get(0)).toBe(42);
      expect(array.toArray()).toEqual([42]);
    });

    it('should handle exact page size arrays', () => {
      array = HugeIntArray.newArray(HugeArrays.PAGE_SIZE);
      array.fill(123);

      expect(array.size()).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(0)).toBe(123);
      expect(array.get(HugeArrays.PAGE_SIZE - 1)).toBe(123);
    });

    it('should handle maximum 32-bit integer values', () => {
      array = HugeIntArray.newArray(10);

      const maxInt = 2147483647;
      const minInt = -2147483648;

      array.set(0, maxInt);
      array.set(1, minInt);
      array.set(2, 0);

      expect(array.get(0)).toBe(maxInt);
      expect(array.get(1)).toBe(minInt);
      expect(array.get(2)).toBe(0);
    });
  });

  describe('String Representation', () => {
    it('should provide string representation for small arrays', () => {
      array = HugeIntArray.of(1, 2, 3);
      const str = array.toString();

      expect(str).toContain('1');
      expect(str).toContain('2');
      expect(str).toContain('3');
    });

    it('should handle toString for single element', () => {
      array = HugeIntArray.of(42);
      const str = array.toString();

      expect(str).toContain('42');
    });
  });
});
