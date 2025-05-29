import { HugeArrays } from '@/mem';
import { HugeLongArray } from '../HugeLongArray';

describe('HugeLongArray', () => {
  let array: HugeLongArray;

  afterEach(() => {
    // Clean up memory awrong.fter each test
    if (array) {
      array.release();
    }
  });

  describe('Factory Methods', () => {
    it('should create small arrays as SingleHugeLongArray', () => {
      const size = 1000;
      array = HugeLongArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('SingleHugeLongArray');
    });

    it('should create large arrays as PagedHugeLongArray', () => {
      const size = HugeArrays.MAX_ARRAY_LENGTH + 1000;
      array = HugeLongArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('PagedHugeLongArray');
    });

    it('should create array from values', () => {
      array = HugeLongArray.of(1, 2, 3, 4, 5);

      expect(array.size()).toBe(5);
      expect(array.get(0)).toBe(1);
      expect(array.get(4)).toBe(5);
    });

    it('should estimate memory correctly', () => {
      const size = 10000;
      const estimation = HugeLongArray.memoryEstimation(size);

      expect(estimation).toBeGreaterThan(0);
      expect(typeof estimation).toBe('number');
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(100);
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

    it('should throw on invalid indices', () => {
      expect(() => array.get(-1)).toThrow();
      expect(() => array.get(array.size())).toThrow();
      expect(() => array.set(-1, 42)).toThrow();
      expect(() => array.set(array.size(), 42)).toThrow();
    });
  });

  describe('Bitwise Operations', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(10);
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

    it('should handle bitwise flags correctly', () => {
      const VISITED = 1;
      const PROCESSED = 2;
      const IN_QUEUE = 4;

      // Set multiple flags
      array.or(0, VISITED);
      array.or(0, PROCESSED);

      expect(array.get(0)).toBe(VISITED | PROCESSED);

      // Clear a flag
      array.and(0, ~IN_QUEUE);
      expect(array.get(0)).toBe(VISITED | PROCESSED);

      // Clear specific flag
      array.and(0, ~VISITED);
      expect(array.get(0)).toBe(PROCESSED);
    });
  });

  describe('Arithmetic Operations', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(10);
    });

    it('should add values correctly', () => {
      array.set(0, 10);
      array.addTo(0, 5);

      expect(array.get(0)).toBe(15);
    });

    it('should accumulate values', () => {
      // Simulate degree counting
      array.addTo(0, 1); // First edge
      array.addTo(0, 1); // Second edge
      array.addTo(0, 1); // Third edge

      expect(array.get(0)).toBe(3);
    });

    it('should handle negative additions', () => {
      array.set(0, 10);
      array.addTo(0, -3);

      expect(array.get(0)).toBe(7);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(100);
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

    it('should generate sequential indices', () => {
      array.setAll(index => index);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(i);
      }
    });

    it('should generate mathematical sequences', () => {
      // Generate squares
      array.setAll(index => index * index);

      expect(array.get(0)).toBe(0);
      expect(array.get(1)).toBe(1);
      expect(array.get(2)).toBe(4);
      expect(array.get(3)).toBe(9);
      expect(array.get(4)).toBe(16);
    });
  });

  describe('Binary Search', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(10);
      // Create sorted array: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
      array.setAll(index => index * 2);
    });

    it('should find exact matches', () => {
      expect(array.binarySearch(6)).toBe(3);
      expect(array.binarySearch(14)).toBe(7);
    });

    it('should find insertion points', () => {
      const result = array.binarySearch(5);
      expect(result).toBeGreaterThanOrEqual(2); // Should be between indices 2 and 3
    });

    it('should handle edge cases', () => {
      expect(array.binarySearch(-1)).toBe(-1); // Too small

      const lastIndex = array.size() - 1;
      const result = array.binarySearch(999);
      expect(result).toBe(lastIndex); // Too large
    });
  });

  describe('Array Conversion', () => {
    beforeEach(() => {
      array = HugeLongArray.of(1, 2, 3, 4, 5);
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
  });

  describe('Copy Operations', () => {
    let source: HugeLongArray;
    let dest: HugeLongArray;

    beforeEach(() => {
      source = HugeLongArray.of(1, 2, 3, 4, 5);
      dest = HugeLongArray.newArray(10);
    });

    afterEach(() => {
      source.release();
      dest.release();
    });

    it('should copy to another array', () => {
      source.copyTo(dest, 5);

      expect(dest.get(0)).toBe(1);
      expect(dest.get(4)).toBe(5);
      expect(dest.get(5)).toBe(0); // Should remain zero
    });

    it('should copy partial data', () => {
      source.copyTo(dest, 3);

      expect(dest.get(0)).toBe(1);
      expect(dest.get(2)).toBe(3);
      expect(dest.get(3)).toBe(0); // Should remain zero
    });
  });

  describe('Cursor Operations', () => {
    beforeEach(() => {
      array = HugeLongArray.newArray(100);
      array.setAll(index => index);
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
      expect(sum).toBe(4950); // Sum of 0 to 99
    });

    it('should handle empty arrays with cursor', () => {
      const emptyArray = HugeLongArray.newArray(0);
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
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      array = HugeLongArray.newArray(1000);
      const memoryUsed = array.sizeOf();

      expect(memoryUsed).toBeGreaterThan(0);
      expect(typeof memoryUsed).toBe('number');
    });

    it('should release memory', () => {
      array = HugeLongArray.newArray(1000);
      const memoryUsed = array.sizeOf();
      const freedMemory = array.release();

      expect(freedMemory).toBe(memoryUsed);

      // Second release should return 0
      const secondRelease = array.release();
      expect(secondRelease).toBe(0);
    });
  });

  describe('Large Array Scenarios', () => {
    it('should handle page boundaries correctly', () => {
      const size = HugeArrays.PAGE_SIZE + 100; // Cross page boundary
      array = HugeLongArray.newArray(size);

      // Set values around page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.set(boundaryIndex, 999);
      array.set(boundaryIndex + 1, 1000);

      expect(array.get(boundaryIndex)).toBe(999);
      expect(array.get(boundaryIndex + 1)).toBe(1000);
    });

    it('should perform operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE * 2 + 100;
      array = HugeLongArray.newArray(size);

      // Fill array with index values
      array.setAll(index => index);

      // Check values across different pages
      expect(array.get(0)).toBe(0);
      expect(array.get(HugeArrays.PAGE_SIZE)).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(size - 1)).toBe(size - 1);
    });
  });

  describe('Graph Algorithm Simulation', () => {
    it('should simulate node degree counting', () => {
      const nodeCount = 1000;
      const degrees = HugeLongArray.newArray(nodeCount);

      // Simulate edges being added
      const edges = [
        [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4]
      ];

      for (const [source, target] of edges) {
        degrees.addTo(source, 1); // Out-degree
        degrees.addTo(target, 1); // In-degree
      }

      expect(degrees.get(0)).toBe(2); // Connected to 1, 2
      expect(degrees.get(1)).toBe(3); // Connected to 0, 2, 3
      expect(degrees.get(2)).toBe(3); // Connected to 0, 1, 3
      expect(degrees.get(3)).toBe(3); // Connected to 1, 2, 4
      expect(degrees.get(4)).toBe(1); // Connected to 3

      degrees.release();
    });

    it('should simulate node flags tracking', () => {
      const nodeCount = 100;
      const flags = HugeLongArray.newArray(nodeCount);

      const VISITED = 1;
      const PROCESSED = 2;
      const IN_QUEUE = 4;

      // Mark nodes during traversal
      flags.or(0, VISITED);
      flags.or(0, IN_QUEUE);
      flags.or(1, VISITED);
      flags.or(1, PROCESSED);

      // Check flags
      expect(flags.get(0) & VISITED).toBeTruthy();
      expect(flags.get(0) & IN_QUEUE).toBeTruthy();
      expect(flags.get(0) & PROCESSED).toBeFalsy();

      expect(flags.get(1) & VISITED).toBeTruthy();
      expect(flags.get(1) & PROCESSED).toBeTruthy();
      expect(flags.get(1) & IN_QUEUE).toBeFalsy();

      flags.release();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero-sized arrays', () => {
      array = HugeLongArray.newArray(0);

      expect(array.size()).toBe(0);
      expect(array.toArray()).toEqual([]);
    });

    it('should handle single element arrays', () => {
      array = HugeLongArray.newArray(1);
      array.set(0, 42);

      expect(array.size()).toBe(1);
      expect(array.get(0)).toBe(42);
      expect(array.toArray()).toEqual([42]);
    });

    it('should handle exact page size arrays', () => {
      array = HugeLongArray.newArray(HugeArrays.PAGE_SIZE);
      array.fill(123);

      expect(array.size()).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(0)).toBe(123);
      expect(array.get(HugeArrays.PAGE_SIZE - 1)).toBe(123);
    });
  });
});
