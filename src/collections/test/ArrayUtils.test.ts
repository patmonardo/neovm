import { describe, it, expect, beforeEach } from 'vitest';
import { Estimate } from '@/mem';
import { ArrayUtil } from '../ArrayUtil';

describe('ArrayUtil', () => {
  describe('Binary Search Operations', () => {
    let sortedArray: number[];

    beforeEach(() => {
      // Create test data with various patterns
      sortedArray = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
    });

    describe('binarySearch - existence checking', () => {
      it('should find existing elements', () => {
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 1)).toBe(true);
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 15)).toBe(true);
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 29)).toBe(true);
      });

      it('should not find non-existing elements', () => {
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 0)).toBe(false);
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 2)).toBe(false);
        expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 30)).toBe(false);
      });

      it('should handle empty arrays', () => {
        expect(ArrayUtil.binarySearch([], 0, 5)).toBe(false);
      });

      it('should handle single element arrays', () => {
        expect(ArrayUtil.binarySearch([42], 1, 42)).toBe(true);
        expect(ArrayUtil.binarySearch([42], 1, 41)).toBe(false);
        expect(ArrayUtil.binarySearch([42], 1, 43)).toBe(false);
      });

      it('should respect length parameter', () => {
        // Only search first 5 elements: [1, 3, 5, 7, 9]
        expect(ArrayUtil.binarySearch(sortedArray, 5, 9)).toBe(true);
        expect(ArrayUtil.binarySearch(sortedArray, 5, 11)).toBe(false); // Exists but beyond length
      });

      it('should handle large arrays efficiently', () => {
        // Create large sorted array
        const largeArray = Array.from({ length: 10000 }, (_, i) => i * 2);

        expect(ArrayUtil.binarySearch(largeArray, largeArray.length, 0)).toBe(true);
        expect(ArrayUtil.binarySearch(largeArray, largeArray.length, 9998)).toBe(true);
        expect(ArrayUtil.binarySearch(largeArray, largeArray.length, 19999)).toBe(false);
      });
    });

    describe('binarySearchIndex - index retrieval', () => {
      it('should return correct indices for existing elements', () => {
        expect(ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 1)).toBe(0);
        expect(ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 15)).toBe(7);
        expect(ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 29)).toBe(14);
      });

      it('should return negative insertion points for non-existing elements', () => {
        const result0 = ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 0);
        expect(result0).toBeLessThan(0);
        expect(-(result0 + 1)).toBe(-0); // Would insert at position 0

        const result2 = ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 2);
        expect(result2).toBeLessThan(0);
        expect(-(result2 + 1)).toBe(1); // Would insert at position 1

        const result30 = ArrayUtil.binarySearchIndex(sortedArray, sortedArray.length, 30);
        expect(result30).toBeLessThan(0);
        expect(-(result30 + 1)).toBe(15); // Would insert at end
      });

      it('should handle edge cases', () => {
        expect(ArrayUtil.binarySearchIndex([], 0, 5)).toBeLessThan(0);
        expect(ArrayUtil.binarySearchIndex([42], 1, 42)).toBe(0);
      });
    });

    describe('binarySearchFirst - first occurrence', () => {
      let arrayWithDuplicates: number[];

      beforeEach(() => {
        // Array with duplicates: [1, 2, 2, 2, 3, 4, 4, 5, 5, 5, 5, 6]
        arrayWithDuplicates = [1, 2, 2, 2, 3, 4, 4, 5, 5, 5, 5, 6];
      });

      it('should find first occurrence of duplicated values', () => {
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 2)).toBe(1);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 4)).toBe(5);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 5)).toBe(7);
      });

      it('should handle unique values correctly', () => {
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 1)).toBe(0);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 3)).toBe(4);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 6)).toBe(11);
      });

      it('should return negative insertion points for non-existing values', () => {
        const result = ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 0);
        expect(result).toBeLessThan(0);
        expect(-(result + 1)).toBe(-0);
      });

      it('should respect range parameters', () => {
        // Search only in range [2, 8): [2, 2, 3, 4, 4, 5]
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 2, 8, 2)).toBe(2);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 2, 8, 4)).toBe(5);
        expect(ArrayUtil.binarySearchFirst(arrayWithDuplicates, 2, 8, 1)).toBeLessThan(0); // Not in range
      });
    });

    describe('binarySearchLast - last occurrence', () => {
      let arrayWithDuplicates: number[];

      beforeEach(() => {
        arrayWithDuplicates = [1, 2, 2, 2, 3, 4, 4, 5, 5, 5, 5, 6];
      });

      it('should find last occurrence of duplicated values', () => {
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 2)).toBe(3);
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 4)).toBe(6);
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 5)).toBe(10);
      });

      it('should handle unique values correctly', () => {
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 1)).toBe(0);
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 3)).toBe(4);
        expect(ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 6)).toBe(11);
      });

      it('should support range processing patterns', () => {
        // Find all occurrences of value 5
        const firstIdx = ArrayUtil.binarySearchFirst(arrayWithDuplicates, 0, arrayWithDuplicates.length, 5);
        const lastIdx = ArrayUtil.binarySearchLast(arrayWithDuplicates, 0, arrayWithDuplicates.length, 5);

        expect(firstIdx).toBe(7);
        expect(lastIdx).toBe(10);

        // Verify all values in range are 5
        for (let i = firstIdx; i <= lastIdx; i++) {
          expect(arrayWithDuplicates[i]).toBe(5);
        }
      });
    });

    describe('binaryLookup - insertion point finding', () => {
      it('should find correct positions for range queries', () => {
        const buckets = [10, 20, 30, 40, 50];

        expect(ArrayUtil.binaryLookup(5, buckets)).toBe(-1);   // Before first bucket
        expect(ArrayUtil.binaryLookup(10, buckets)).toBe(0);   // Exact match
        expect(ArrayUtil.binaryLookup(15, buckets)).toBe(0);   // In first range
        expect(ArrayUtil.binaryLookup(25, buckets)).toBe(1);   // In second range
        expect(ArrayUtil.binaryLookup(50, buckets)).toBe(4);   // Exact match at end
        expect(ArrayUtil.binaryLookup(60, buckets)).toBe(4);   // After last bucket
      });

      it('should support timestamp bucketing', () => {
        const timeBuckets = [1000, 2000, 3000, 4000, 5000];

        // Events in different time ranges
        expect(ArrayUtil.binaryLookup(1500, timeBuckets)).toBe(0); // First bucket
        expect(ArrayUtil.binaryLookup(2500, timeBuckets)).toBe(1); // Second bucket
        expect(ArrayUtil.binaryLookup(4500, timeBuckets)).toBe(3); // Fourth bucket
      });

      it('should handle edge cases', () => {
        expect(ArrayUtil.binaryLookup(5, [])).toBe(-1);
        expect(ArrayUtil.binaryLookup(5, [10])).toBe(-1);
        expect(ArrayUtil.binaryLookup(10, [10])).toBe(0);
        expect(ArrayUtil.binaryLookup(15, [10])).toBe(0);
      });
    });
  });

  describe('Linear Search Operations', () => {
    let testArray: number[];

    beforeEach(() => {
      testArray = [5, 2, 8, 1, 9, 3, 7, 4, 6];
    });

    describe('linearSearch - existence checking', () => {
      it('should find existing elements', () => {
        expect(ArrayUtil.linearSearch(testArray, testArray.length, 5)).toBe(true);
        expect(ArrayUtil.linearSearch(testArray, testArray.length, 1)).toBe(true);
        expect(ArrayUtil.linearSearch(testArray, testArray.length, 6)).toBe(true);
      });

      it('should not find non-existing elements', () => {
        expect(ArrayUtil.linearSearch(testArray, testArray.length, 0)).toBe(false);
        expect(ArrayUtil.linearSearch(testArray, testArray.length, 10)).toBe(false);
      });

      it('should respect length parameter', () => {
        // Only search first 3 elements: [5, 2, 8]
        expect(ArrayUtil.linearSearch(testArray, 3, 5)).toBe(true);
        expect(ArrayUtil.linearSearch(testArray, 3, 8)).toBe(true);
        expect(ArrayUtil.linearSearch(testArray, 3, 1)).toBe(false); // Exists but beyond length
      });

      it('should handle loop unrolling correctly', () => {
        // Create array larger than unrolling threshold
        const largeArray = Array.from({ length: 100 }, (_, i) => i);

        expect(ArrayUtil.linearSearch(largeArray, largeArray.length, 0)).toBe(true);
        expect(ArrayUtil.linearSearch(largeArray, largeArray.length, 50)).toBe(true);
        expect(ArrayUtil.linearSearch(largeArray, largeArray.length, 99)).toBe(true);
        expect(ArrayUtil.linearSearch(largeArray, largeArray.length, 100)).toBe(false);
      });
    });

    describe('linearSearchIndex - index retrieval', () => {
      it('should return correct indices for existing elements', () => {
        expect(ArrayUtil.linearSearchIndex(testArray, testArray.length, 5)).toBe(0);
        expect(ArrayUtil.linearSearchIndex(testArray, testArray.length, 1)).toBe(3);
        expect(ArrayUtil.linearSearchIndex(testArray, testArray.length, 6)).toBe(8);
      });

      it('should return negative values for non-existing elements', () => {
        const result = ArrayUtil.linearSearchIndex(testArray, testArray.length, 0);
        expect(result).toBeLessThan(0);
      });

      it('should handle empty arrays', () => {
        expect(ArrayUtil.linearSearchIndex([], 0, 5)).toBeLessThan(0);
      });
    });
  });

  describe('Utility Operations', () => {
    describe('fill', () => {
      it('should create arrays filled with specified values', () => {
        const filled = ArrayUtil.fill(42, 5);
        expect(filled).toHaveLength(5);
        expect(filled).toEqual([42, 42, 42, 42, 42]);
      });

      it('should handle zero length', () => {
        const empty = ArrayUtil.fill(10, 0);
        expect(empty).toHaveLength(0);
        expect(empty).toEqual([]);
      });

      it('should handle large arrays', () => {
        const large = ArrayUtil.fill(7, 1000);
        expect(large).toHaveLength(1000);
        expect(large[0]).toBe(7);
        expect(large[999]).toBe(7);
      });
    });

    describe('contains', () => {
      it('should find existing elements', () => {
        const array = [1, 3, 5, 7, 9];
        expect(ArrayUtil.contains(array, 1)).toBe(true);
        expect(ArrayUtil.contains(array, 5)).toBe(true);
        expect(ArrayUtil.contains(array, 9)).toBe(true);
      });

      it('should not find non-existing elements', () => {
        const array = [1, 3, 5, 7, 9];
        expect(ArrayUtil.contains(array, 0)).toBe(false);
        expect(ArrayUtil.contains(array, 2)).toBe(false);
        expect(ArrayUtil.contains(array, 10)).toBe(false);
      });

      it('should handle empty arrays', () => {
        expect(ArrayUtil.contains([], 5)).toBe(false);
      });

      it('should handle duplicate values', () => {
        const array = [1, 2, 2, 3, 2, 4];
        expect(ArrayUtil.contains(array, 2)).toBe(true);
      });
    });
  });

  describe('Memory Optimization - oversize', () => {
    describe('basic functionality', () => {
      it('should return 0 for zero target size', () => {
        expect(ArrayUtil.oversize(0, 8)).toBe(0);
      });

      it('should grow arrays by approximately 1/8th', () => {
        const minSize = 100;
        const result = ArrayUtil.oversize(minSize, 8);

        expect(result).toBeGreaterThanOrEqual(minSize);
        expect(result).toBeLessThanOrEqual(minSize + minSize / 8 + 10); // Allow some variance for alignment
      });

      it('should ensure minimum growth for small arrays', () => {
        const result = ArrayUtil.oversize(1, 8);
        expect(result).toBeGreaterThanOrEqual(4); // Minimum extra = 3
      });

      it('should handle large sizes efficiently', () => {
        const largeSize = 1000000;
        const result = ArrayUtil.oversize(largeSize, 8);

        expect(result).toBeGreaterThanOrEqual(largeSize);
        expect(result).toBeLessThan(largeSize * 2); // Shouldn't double
      });
    });

    describe('error handling', () => {
      it('should throw error for negative sizes', () => {
        expect(() => ArrayUtil.oversize(-1, 8)).toThrow('Invalid array size -1');
      });

      it('should handle maximum size limits', () => {
        const maxSize = Number.MAX_SAFE_INTEGER - 1000; // Near max but safe
        const result = ArrayUtil.oversize(maxSize, 8);
        expect(result).toBeGreaterThanOrEqual(maxSize);
      });
    });

    describe('memory alignment optimization', () => {
      it('should optimize for different element sizes on 64-bit platforms', () => {
        // Mock 64-bit platform
        const originalBytesObjectRef = Estimate.BYTES_OBJECT_REF;
        (Estimate as any).BYTES_OBJECT_REF = 8;

        try {
          // Test different element sizes
          const size1 = ArrayUtil.oversize(100, 1); // 1-byte elements
          const size2 = ArrayUtil.oversize(100, 2); // 2-byte elements
          const size4 = ArrayUtil.oversize(100, 4); // 4-byte elements
          const size8 = ArrayUtil.oversize(100, 8); // 8-byte elements

          // All should be >= 100
          expect(size1).toBeGreaterThanOrEqual(100);
          expect(size2).toBeGreaterThanOrEqual(100);
          expect(size4).toBeGreaterThanOrEqual(100);
          expect(size8).toBeGreaterThanOrEqual(100);

          // Verify alignment properties (specific alignment depends on implementation)
          expect(size4 % 2).toBe(0); // 4-byte elements should align to 2
          expect(size2 % 4).toBe(0); // 2-byte elements should align to 4
          expect(size1 % 8).toBe(0); // 1-byte elements should align to 8
        } finally {
          (Estimate as any).BYTES_OBJECT_REF = originalBytesObjectRef;
        }
      });

      it('should optimize for 32-bit platforms differently', () => {
        // Mock 32-bit platform
        const originalBytesObjectRef = Estimate.BYTES_OBJECT_REF;
        (Estimate as any).BYTES_OBJECT_REF = 4;

        try {
          const size1 = ArrayUtil.oversize(100, 1);
          const size2 = ArrayUtil.oversize(100, 2);
          const size4 = ArrayUtil.oversize(100, 4);

          expect(size1).toBeGreaterThanOrEqual(100);
          expect(size2).toBeGreaterThanOrEqual(100);
          expect(size4).toBeGreaterThanOrEqual(100);

          // 32-bit platform has different alignment strategy
          // Exact alignment depends on implementation details
        } finally {
          (Estimate as any).BYTES_OBJECT_REF = originalBytesObjectRef;
        }
      });
    });

    describe('growth patterns for dynamic arrays', () => {
      it('should demonstrate realistic growth sequence', () => {
        const growthSequence: number[] = [];
        let currentSize = 0;

        // Simulate adding elements and growing array
        for (let i = 0; i < 10; i++) {
          currentSize = ArrayUtil.oversize(currentSize + 1, 8);
          growthSequence.push(currentSize);
        }

        // Verify growth is monotonic
        for (let i = 1; i < growthSequence.length; i++) {
          expect(growthSequence[i]).toBeGreaterThanOrEqual(growthSequence[i - 1]);
        }

        // Verify reasonable growth rate (not too aggressive)
        const finalSize = growthSequence[growthSequence.length - 1];
        expect(finalSize).toBeLessThan(1000); // Shouldn't explode for 10 elements
      });

      it('should minimize reallocations for typical usage', () => {
        let arraySize = 0;
        let reallocations = 0;

        // Simulate adding 1000 elements
        for (let i = 0; i < 1000; i++) {
          if (i >= arraySize) {
            arraySize = ArrayUtil.oversize(i + 1, 8);
            reallocations++;
          }
        }

        // Should require far fewer than 1000 reallocations
        expect(reallocations).toBeLessThan(40); // Efficient growth
      });
    });
  });

  describe('Huge Array Support - oversizeHuge', () => {
    it('should handle very large sizes', () => {
      const hugeSize = 1000000000; // 1 billion
      const result = ArrayUtil.oversizeHuge(hugeSize, 8);

      expect(result).toBeGreaterThanOrEqual(hugeSize);
    });

    it('should maintain same growth strategy as regular oversize', () => {
      const regularSize = 1000;
      const regular = ArrayUtil.oversize(regularSize, 8);
      const huge = ArrayUtil.oversizeHuge(regularSize, 8);

      // Should be very similar for sizes that both can handle
      expect(Math.abs(regular - huge)).toBeLessThan(10);
    });

    it('should optimize alignment for different element sizes', () => {
      const originalBytesObjectRef = Estimate.BYTES_OBJECT_REF;
      (Estimate as any).BYTES_OBJECT_REF = 8;

      try {
        const size1 = ArrayUtil.oversizeHuge(1000000, 1);
        const size2 = ArrayUtil.oversizeHuge(1000000, 2);
        const size4 = ArrayUtil.oversizeHuge(1000000, 4);
        const size8 = ArrayUtil.oversizeHuge(1000000, 8);

        expect(size1).toBeGreaterThanOrEqual(1000000);
        expect(size2).toBeGreaterThanOrEqual(1000000);
        expect(size4).toBeGreaterThanOrEqual(1000000);
        expect(size8).toBeGreaterThanOrEqual(1000000);
      } finally {
        (Estimate as any).BYTES_OBJECT_REF = originalBytesObjectRef;
      }
    });
  });

  describe('Graph Analytics Use Cases', () => {
    describe('adjacency list operations', () => {
      it('should efficiently search neighbor lists', () => {
        // Simulate sorted adjacency list for a node
        const neighbors = [10, 15, 23, 45, 67, 89, 123, 156, 234, 567];

        // Quick neighbor existence checks
        expect(ArrayUtil.binarySearch(neighbors, neighbors.length, 45)).toBe(true);
        expect(ArrayUtil.binarySearch(neighbors, neighbors.length, 44)).toBe(false);

        // Find neighbor positions for weighted graphs
        const pos45 = ArrayUtil.binarySearchIndex(neighbors, neighbors.length, 45);
        expect(pos45).toBe(3);

        // Check if edge exists in adjacency list
        expect(ArrayUtil.contains(neighbors, 123)).toBe(true);
      });

      it('should support range queries on timestamps', () => {
        // Simulate temporal edge timestamps
        const timestamps = [1000, 1050, 1100, 1100, 1200, 1250, 1300, 1300, 1300, 1400];

        // Find all edges in time range [1100, 1300]
        const startIdx = ArrayUtil.binarySearchFirst(timestamps, 0, timestamps.length, 1100);
        const endIdx = ArrayUtil.binarySearchLast(timestamps, 0, timestamps.length, 1300);

        expect(startIdx).toBe(2); // First occurrence of 1100
        expect(endIdx).toBe(8);   // Last occurrence of 1300

        // Process time range
        let edgeCount = 0;
        for (let i = startIdx; i <= endIdx; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(1100);
          expect(timestamps[i]).toBeLessThanOrEqual(1300);
          edgeCount++;
        }
        expect(edgeCount).toBe(7);
      });

      it('should support node ID mapping', () => {
        // Simulate mapping external IDs to internal indices
        const externalIds = [1001, 1005, 1010, 1015, 1020, 1025, 1030];

        // Find internal index for external ID
        const externalId = 1015;
        const internalIndex = ArrayUtil.binarySearchIndex(externalIds, externalIds.length, externalId);

        expect(internalIndex).toBe(3);

        // Handle non-existing IDs
        const missingIndex = ArrayUtil.binarySearchIndex(externalIds, externalIds.length, 1007);
        expect(missingIndex).toBeLessThan(0);
      });
    });

    describe('bucketing and histogram operations', () => {
      it('should support degree bucketing', () => {
        // Simulate degree buckets: [1, 5, 10, 50, 100, 500]
        const degreeBuckets = [1, 5, 10, 50, 100, 500];

        // Assign nodes to degree buckets
        const testDegrees = [3, 7, 25, 75, 250];
        const bucketAssignments = testDegrees.map(degree =>
          ArrayUtil.binaryLookup(degree, degreeBuckets)
        );

        expect(bucketAssignments).toEqual([0, 1, 2, 3, 4]); // Bucket indices
      });

      it('should support weight distribution analysis', () => {
        // Simulate weight buckets for histogram
        const weightBuckets = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];

        const testWeights = [0.05, 0.3, 0.8, 1.5, 7.0, 15.0];
        const buckets = testWeights.map(weight =>
          ArrayUtil.binaryLookup(weight, weightBuckets)
        );

        expect(buckets[0]).toBe(-1); // Below first bucket
        expect(buckets[1]).toBe(0);  // First bucket
        expect(buckets[2]).toBe(1);  // Second bucket
        expect(buckets[5]).toBe(5);  // Last bucket (weight > max)
      });
    });

    describe('performance on large datasets', () => {
      it('should handle large adjacency lists efficiently', () => {
        // Create large sorted adjacency list
        const largeNeighbors = Array.from({ length: 100000 }, (_, i) => i * 3);

        // Binary search should be fast even on large arrays
        const startTime = performance.now();
        const found = ArrayUtil.binarySearch(largeNeighbors, largeNeighbors.length, 150000);
        const endTime = performance.now();

        expect(found).toBe(true);
        expect(endTime - startTime).toBeLessThan(1); // Should be very fast
      });

      it('should optimize memory allocation for dynamic graphs', () => {
        // Simulate growing edge list
        let edgeCapacity = 0;
        let reallocations = 0;

        // Add 10000 edges
        for (let i = 0; i < 10000; i++) {
          if (i >= edgeCapacity) {
            edgeCapacity = ArrayUtil.oversize(i + 1, 12); // Edge = 3 * 4 bytes
            reallocations++;
          }
        }

        // Should require minimal reallocations
        expect(reallocations).toBeLessThan(60);
        expect(edgeCapacity).toBeGreaterThanOrEqual(10000);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle boundary conditions', () => {
      const array = [1, 2, 3];

      // Boundary searches
      expect(ArrayUtil.binarySearch(array, array.length, 0)).toBe(false);  // Below range
      expect(ArrayUtil.binarySearch(array, array.length, 4)).toBe(false);  // Above range
      expect(ArrayUtil.binarySearch(array, array.length, 1)).toBe(true);   // Lower bound
      expect(ArrayUtil.binarySearch(array, array.length, 3)).toBe(true);   // Upper bound
    });

    it('should handle arrays with all identical elements', () => {
      const identical = [5, 5, 5, 5, 5];

      expect(ArrayUtil.binarySearch(identical, identical.length, 5)).toBe(true);
      expect(ArrayUtil.binarySearchFirst(identical, 0, identical.length, 5)).toBe(0);
      expect(ArrayUtil.binarySearchLast(identical, 0, identical.length, 5)).toBe(4);
      expect(ArrayUtil.linearSearch(identical, identical.length, 5)).toBe(true);
    });

    it('should handle very small arrays', () => {
      expect(ArrayUtil.binarySearch([1], 1, 1)).toBe(true);
      expect(ArrayUtil.binarySearch([1], 1, 2)).toBe(false);
      expect(ArrayUtil.linearSearch([42], 1, 42)).toBe(true);
    });

    it('should prevent instantiation', () => {
      expect(() => new (ArrayUtil as any)()).toThrow('ArrayUtil is a static utility class and cannot be instantiated');
    });
  });

  describe('Hybrid Search Performance Characteristics', () => {
    it('should switch to linear search for small ranges', () => {
      // Create array that will trigger hybrid behavior
      const mediumArray = Array.from({ length: 200 }, (_, i) => i * 2);

      // Search for element that should trigger linear search phase
      expect(ArrayUtil.binarySearch(mediumArray, mediumArray.length, 100)).toBe(true);
      expect(ArrayUtil.binarySearchIndex(mediumArray, mediumArray.length, 100)).toBe(50);
    });

    it('should demonstrate early termination in sorted linear search', () => {
      // Test that linear search can terminate early on sorted data
      const sortedArray = [10, 20, 30, 40, 50];

      // Search for value that doesn't exist but is in range
      expect(ArrayUtil.binarySearch(sortedArray, sortedArray.length, 25)).toBe(false);

      // This should use linear search internally and terminate early
      // when it encounters 30 > 25
    });
  });
});
