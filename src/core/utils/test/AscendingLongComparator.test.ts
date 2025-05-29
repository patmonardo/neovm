//import { describe, it, expect, beforeEach } from 'vitest';
import { AscendingLongComparator } from '../AscendingLongComparator';

describe('AscendingLongComparator - Indirect Sorting for Graph Analytics', () => {
  let simpleData: number[];
  let pageRankScores: number[];
  let timestamps: number[];
  let edgeWeights: number[];

  beforeEach(() => {
    // Simple test data
    simpleData = [30, 10, 40, 20, 50];

    // Graph analytics: PageRank scores
    pageRankScores = [0.15, 0.35, 0.08, 0.42, 0.25];

    // Temporal graph: Unix timestamps
    timestamps = [1640995200, 1641081600, 1640908800, 1641168000];

    // Edge weights for MST algorithms
    edgeWeights = [0.8, 0.2, 0.9, 0.1, 0.5, 0.7];
  });

  describe('Constructor', () => {
    it('should accept valid numeric array', () => {
      expect(() => new AscendingLongComparator(simpleData)).not.toThrow();
    });

    it('should accept empty array', () => {
      expect(() => new AscendingLongComparator([])).not.toThrow();
    });

    it('should reject null array', () => {
      expect(() => new AscendingLongComparator(null as any))
        .toThrow('Array cannot be null or undefined');
    });

    it('should reject undefined array', () => {
      expect(() => new AscendingLongComparator(undefined as any))
        .toThrow('Array cannot be null or undefined');
    });

    it('should store reference to original array', () => {
      const comparator = new AscendingLongComparator(simpleData);
      expect(comparator.getArray()).toBe(simpleData); // Same reference
    });
  });

  describe('Basic Comparison Operations', () => {
    let comparator: AscendingLongComparator;

    beforeEach(() => {
      // Using [30, 10, 40, 20, 50] for predictable comparisons
      comparator = new AscendingLongComparator(simpleData);
    });

    describe('compare() method', () => {
      it('should return -1 when first element is smaller', () => {
        // Index 1 (value 10) < Index 0 (value 30)
        expect(comparator.compare(1, 0)).toBe(-1);

        // Index 3 (value 20) < Index 2 (value 40)
        expect(comparator.compare(3, 2)).toBe(-1);
      });

      it('should return 1 when first element is larger', () => {
        // Index 0 (value 30) > Index 1 (value 10)
        expect(comparator.compare(0, 1)).toBe(1);

        // Index 4 (value 50) > Index 3 (value 20)
        expect(comparator.compare(4, 3)).toBe(1);
      });

      it('should return 0 when elements are equal', () => {
        // Same index should always equal itself
        expect(comparator.compare(0, 0)).toBe(0);
        expect(comparator.compare(2, 2)).toBe(0);
        expect(comparator.compare(4, 4)).toBe(0);
      });

      it('should handle equal values at different indices', () => {
        const duplicateData = [10, 20, 10, 30];
        const dupComparator = new AscendingLongComparator(duplicateData);

        // Indices 0 and 2 both have value 10
        expect(dupComparator.compare(0, 2)).toBe(0);
        expect(dupComparator.compare(2, 0)).toBe(0);
      });
    });

    describe('Mathematical Properties', () => {
      it('should satisfy reflexivity property', () => {
        // compare(i, i) === 0 for all valid indices
        for (let i = 0; i < simpleData.length; i++) {
          expect(comparator.compare(i, i)).toBe(0);
        }
      });

      it('should satisfy antisymmetry property', () => {
        // If compare(i, j) < 0, then compare(j, i) > 0
        // If compare(i, j) > 0, then compare(j, i) < 0
        // If compare(i, j) === 0, then compare(j, i) === 0

        for (let i = 0; i < simpleData.length; i++) {
          for (let j = 0; j < simpleData.length; j++) {
            const result_ij = comparator.compare(i, j);
            const result_ji = comparator.compare(j, i);

            if (result_ij < 0) {
              expect(result_ji).toBeGreaterThan(0);
            } else if (result_ij > 0) {
              expect(result_ji).toBeLessThan(0);
            } else {
              expect(result_ji).toBe(0);
            }
          }
        }
      });

      it('should satisfy transitivity property', () => {
        // If compare(i, j) < 0 && compare(j, k) < 0, then compare(i, k) < 0
        for (let i = 0; i < simpleData.length; i++) {
          for (let j = 0; j < simpleData.length; j++) {
            for (let k = 0; k < simpleData.length; k++) {
              const ij = comparator.compare(i, j);
              const jk = comparator.compare(j, k);
              const ik = comparator.compare(i, k);

              if (ij < 0 && jk < 0) {
                expect(ik).toBeLessThan(0);
              }
              if (ij > 0 && jk > 0) {
                expect(ik).toBeGreaterThan(0);
              }
            }
          }
        }
      });
    });
  });

  describe('Index Validation', () => {
    let comparator: AscendingLongComparator;

    beforeEach(() => {
      comparator = new AscendingLongComparator(simpleData); // Length 5
    });

    it('should throw RangeError for negative index A', () => {
      expect(() => comparator.compare(-1, 0))
        .toThrow(RangeError);
      expect(() => comparator.compare(-1, 0))
        .toThrow('Index A (-1) is out of bounds [0, 5)');
    });

    it('should throw RangeError for negative index B', () => {
      expect(() => comparator.compare(0, -1))
        .toThrow(RangeError);
      expect(() => comparator.compare(0, -1))
        .toThrow('Index B (-1) is out of bounds [0, 5)');
    });

    it('should throw RangeError for index A >= array length', () => {
      expect(() => comparator.compare(5, 0))
        .toThrow(RangeError);
      expect(() => comparator.compare(5, 0))
        .toThrow('Index A (5) is out of bounds [0, 5)');
    });

    it('should throw RangeError for index B >= array length', () => {
      expect(() => comparator.compare(0, 5))
        .toThrow(RangeError);
      expect(() => comparator.compare(0, 5))
        .toThrow('Index B (5) is out of bounds [0, 5)');
    });

    it('should accept boundary indices 0 and length-1', () => {
      expect(() => comparator.compare(0, 4)).not.toThrow();
      expect(() => comparator.compare(4, 0)).not.toThrow();
    });

    it('should handle empty array edge case', () => {
      const emptyComparator = new AscendingLongComparator([]);

      expect(() => emptyComparator.compare(0, 0))
        .toThrow('Index A (0) is out of bounds [0, 0)');
    });
  });

  describe('Special Numeric Values', () => {
    describe('NaN handling', () => {
      it('should handle NaN values correctly', () => {
        const nanData = [10, NaN, 20, NaN, 30];
        const nanComparator = new AscendingLongComparator(nanData);

        // NaN compared to number
        const nanVsNumber = nanComparator.compare(1, 0); // NaN vs 10
        const numberVsNan = nanComparator.compare(0, 1); // 10 vs NaN

        // JavaScript NaN semantics: NaN is not less than, greater than, or equal to anything
        expect(nanVsNumber).not.toBe(-1); // NaN is not < 10
        expect(numberVsNan).not.toBe(-1); // 10 is not < NaN

        // NaN compared to NaN
        expect(nanComparator.compare(1, 3)).toBe(0); // NaN === NaN in this context
      });
    });

    describe('Infinity handling', () => {
      it('should handle positive infinity', () => {
        const infData = [10, Infinity, 20, 30];
        const infComparator = new AscendingLongComparator(infData);

        expect(infComparator.compare(0, 1)).toBe(-1); // 10 < Infinity
        expect(infComparator.compare(1, 0)).toBe(1);  // Infinity > 10
        expect(infComparator.compare(1, 2)).toBe(1);  // Infinity > 20
      });

      it('should handle negative infinity', () => {
        const negInfData = [-Infinity, 10, 20, 30];
        const negInfComparator = new AscendingLongComparator(negInfData);

        expect(negInfComparator.compare(0, 1)).toBe(-1); // -Infinity < 10
        expect(negInfComparator.compare(1, 0)).toBe(1);  // 10 > -Infinity
      });

      it('should handle both infinities', () => {
        const bothInfData = [-Infinity, 0, Infinity];
        const bothInfComparator = new AscendingLongComparator(bothInfData);

        expect(bothInfComparator.compare(0, 1)).toBe(-1); // -Infinity < 0
        expect(bothInfComparator.compare(1, 2)).toBe(-1); // 0 < Infinity
        expect(bothInfComparator.compare(0, 2)).toBe(-1); // -Infinity < Infinity
      });
    });

    describe('Zero variants', () => {
      it('should treat +0 and -0 as equal', () => {
        const zeroData = [+0, -0, 1];
        const zeroComparator = new AscendingLongComparator(zeroData);

        expect(zeroComparator.compare(0, 1)).toBe(0); // +0 === -0
      });
    });
  });

  describe('Graph Analytics Use Cases', () => {
    describe('PageRank Node Ranking', () => {
      it('should enable PageRank-based node sorting', () => {
        const nodeIds = [100, 200, 300, 400, 500];
        const pageRankComparator = new AscendingLongComparator(pageRankScores);

        // Create indices array
        const nodeIndices = Array.from({ length: nodeIds.length }, (_, i) => i);

        // Sort by PageRank scores (ascending)
        nodeIndices.sort((a, b) => pageRankComparator.compare(a, b));

        // Verify ascending PageRank order
        expect(nodeIndices).toEqual([2, 0, 4, 1, 3]); // [0.08, 0.15, 0.25, 0.35, 0.42]

        // Verify we can access sorted PageRank scores
        const sortedScores = nodeIndices.map(i => pageRankScores[i]);
        expect(sortedScores).toEqual([0.08, 0.15, 0.25, 0.35, 0.42]);

        // Verify corresponding node IDs stay synchronized
        const sortedNodeIds = nodeIndices.map(i => nodeIds[i]);
        expect(sortedNodeIds).toEqual([300, 100, 500, 200, 400]);
      });

      it('should identify highest and lowest PageRank nodes', () => {
        const pageRankComparator = new AscendingLongComparator(pageRankScores);

        // Find node with lowest PageRank
        let lowestIndex = 0;
        for (let i = 1; i < pageRankScores.length; i++) {
          if (pageRankComparator.compare(i, lowestIndex) < 0) {
            lowestIndex = i;
          }
        }
        expect(lowestIndex).toBe(2); // Index 2 has PageRank 0.08

        // Find node with highest PageRank
        let highestIndex = 0;
        for (let i = 1; i < pageRankScores.length; i++) {
          if (pageRankComparator.compare(i, highestIndex) > 0) {
            highestIndex = i;
          }
        }
        expect(highestIndex).toBe(3); // Index 3 has PageRank 0.42
      });
    });

    describe('Temporal Graph Processing', () => {
      it('should enable chronological edge sorting', () => {
        const edgeSources = [10, 20, 30, 40];
        const edgeTargets = [15, 25, 35, 45];
        const timeComparator = new AscendingLongComparator(timestamps);

        // Create edge indices
        const edgeIndices = Array.from({ length: timestamps.length }, (_, i) => i);

        // Sort edges chronologically
        edgeIndices.sort((a, b) => timeComparator.compare(a, b));

        // Verify chronological order
        const sortedTimestamps = edgeIndices.map(i => timestamps[i]);
        expect(sortedTimestamps).toEqual([1640908800, 1640995200, 1641081600, 1641168000]);

        // Verify edge data stays synchronized
        const chronologicalEdges = edgeIndices.map(i => ({
          source: edgeSources[i],
          target: edgeTargets[i],
          timestamp: timestamps[i]
        }));

        expect(chronologicalEdges[0]).toEqual({ source: 30, target: 35, timestamp: 1640908800 });
        expect(chronologicalEdges[3]).toEqual({ source: 40, target: 45, timestamp: 1641168000 });
      });

      it('should support time window queries', () => {
        const timeComparator = new AscendingLongComparator(timestamps);
        const edgeIndices = Array.from({ length: timestamps.length }, (_, i) => i);

        // Sort chronologically
        edgeIndices.sort((a, b) => timeComparator.compare(a, b));

        // Define time window: between timestamps[1] and timestamps[2]
        const windowStart = 1640995200;
        const windowEnd = 1641081600;

        const edgesInWindow = edgeIndices.filter(i => {
          const timestamp = timestamps[i];
          return timestamp >= windowStart && timestamp <= windowEnd;
        });

        expect(edgesInWindow).toHaveLength(2);
        expect(edgesInWindow.map(i => timestamps[i])).toEqual([1640995200, 1641081600]);
      });
    });

    describe('Edge Weight Processing for MST', () => {
      it('should enable Kruskal MST algorithm edge sorting', () => {
        const edgeSources = [0, 1, 2, 0, 1, 2];
        const edgeTargets = [1, 2, 0, 2, 0, 1];
        const weightComparator = new AscendingLongComparator(edgeWeights);

        // Sort edges by weight (Kruskal's algorithm requirement)
        const edgeIndices = Array.from({ length: edgeWeights.length }, (_, i) => i);
        edgeIndices.sort((a, b) => weightComparator.compare(a, b));

        // Verify ascending weight order
        const sortedWeights = edgeIndices.map(i => edgeWeights[i]);
        expect(sortedWeights).toEqual([0.1, 0.2, 0.5, 0.7, 0.8, 0.9]);

        // Verify edge data integrity
        const sortedEdges = edgeIndices.map(i => ({
          source: edgeSources[i],
          target: edgeTargets[i],
          weight: edgeWeights[i]
        }));

        expect(sortedEdges[0].weight).toBe(0.1); // Lightest edge first
        expect(sortedEdges[5].weight).toBe(0.9); // Heaviest edge last
      });
    });

    describe('Community Detection', () => {
      it('should support community size sorting', () => {
        const communitySizes = [45, 12, 78, 23, 56];
        const communityLabels = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
        const sizeComparator = new AscendingLongComparator(communitySizes);

        // Sort communities by size (smallest first for merging algorithms)
        const communityIndices = Array.from({ length: communitySizes.length }, (_, i) => i);
        communityIndices.sort((a, b) => sizeComparator.compare(a, b));

        // Verify ascending size order
        const sortedSizes = communityIndices.map(i => communitySizes[i]);
        expect(sortedSizes).toEqual([12, 23, 45, 56, 78]);

        // Verify community labels stay synchronized
        const sortedLabels = communityIndices.map(i => communityLabels[i]);
        expect(sortedLabels).toEqual(['Beta', 'Delta', 'Alpha', 'Epsilon', 'Gamma']);
      });
    });
  });

  describe('Integration with Array.sort()', () => {
    it('should work seamlessly with JavaScript Array.sort()', () => {
      const comparator = new AscendingLongComparator(simpleData);
      const indices = [0, 1, 2, 3, 4];

      // Use comparator with Array.sort()
      indices.sort((a, b) => comparator.compare(a, b));

      // Verify correct sorting
      const sortedValues = indices.map(i => simpleData[i]);
      expect(sortedValues).toEqual([10, 20, 30, 40, 50]);
    });

    it('should maintain stability with equal elements', () => {
      const dataWithDuplicates = [30, 10, 30, 20, 10];
      const comparator = new AscendingLongComparator(dataWithDuplicates);
      const indices = [0, 1, 2, 3, 4];

      indices.sort((a, b) => comparator.compare(a, b));

      // JavaScript sort is not guaranteed to be stable, but our comparator should handle it
      const sortedValues = indices.map(i => dataWithDuplicates[i]);
      expect(sortedValues).toEqual([10, 10, 20, 30, 30]);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeData = Array.from({ length: 10000 }, (_, i) => Math.random() * 1000);
      const comparator = new AscendingLongComparator(largeData);
      const indices = Array.from({ length: largeData.length }, (_, i) => i);

      const startTime = performance.now();
      indices.sort((a, b) => comparator.compare(a, b));
      const endTime = performance.now();

      // Should complete sorting in reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

      // Verify sorting correctness
      const sortedValues = indices.map(i => largeData[i]);
      for (let i = 1; i < sortedValues.length; i++) {
        expect(sortedValues[i]).toBeGreaterThanOrEqual(sortedValues[i - 1]);
      }
    });

    it('should have O(1) comparison time', () => {
      const comparator = new AscendingLongComparator(simpleData);

      // Multiple comparisons should have consistent timing
      const times: number[] = [];

      for (let iteration = 0; iteration < 1000; iteration++) {
        const start = performance.now();
        comparator.compare(0, 1);
        const end = performance.now();
        times.push(end - start);
      }

      // All comparison times should be very small and consistent
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(0.01); // Less than 0.01ms average
    });
  });

  describe('getArray() accessor', () => {
    it('should return reference to original array', () => {
      const comparator = new AscendingLongComparator(simpleData);
      const retrievedArray = comparator.getArray();

      expect(retrievedArray).toBe(simpleData); // Same reference
      expect(retrievedArray).toEqual(simpleData); // Same content
    });

    it('should provide read-only access semantics', () => {
      const comparator = new AscendingLongComparator(simpleData);
      const retrievedArray = comparator.getArray();

      // Array should be marked as readonly in TypeScript
      expect(Array.isArray(retrievedArray)).toBe(true);
      expect(retrievedArray.length).toBe(simpleData.length);
    });

    it('should reflect changes to original array', () => {
      const mutableData = [10, 20, 30];
      const comparator = new AscendingLongComparator(mutableData);

      // Modify original array
      mutableData[1] = 99;

      // Retrieved array should reflect changes
      const retrievedArray = comparator.getArray();
      expect(retrievedArray[1]).toBe(99);

      // Comparisons should use updated values
      expect(comparator.compare(1, 2)).toBe(1); // 99 > 30
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle single element array', () => {
      const singleElement = [42];
      const comparator = new AscendingLongComparator(singleElement);

      expect(comparator.compare(0, 0)).toBe(0);
      expect(() => comparator.compare(0, 1)).toThrow(RangeError);
    });

    it('should handle two element array', () => {
      const twoElements = [20, 10];
      const comparator = new AscendingLongComparator(twoElements);

      expect(comparator.compare(0, 1)).toBe(1);  // 20 > 10
      expect(comparator.compare(1, 0)).toBe(-1); // 10 < 20
      expect(comparator.compare(0, 0)).toBe(0);  // 20 === 20
      expect(comparator.compare(1, 1)).toBe(0);  // 10 === 10
    });

    it('should handle very large numbers', () => {
      const largeNumbers = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0];
      const comparator = new AscendingLongComparator(largeNumbers);

      expect(comparator.compare(1, 2)).toBe(-1); // MIN_SAFE_INTEGER < 0
      expect(comparator.compare(2, 0)).toBe(-1); // 0 < MAX_SAFE_INTEGER
      expect(comparator.compare(1, 0)).toBe(-1); // MIN_SAFE_INTEGER < MAX_SAFE_INTEGER
    });

    it('should handle fractional numbers', () => {
      const fractions = [0.1, 0.2, 0.15, 0.25];
      const comparator = new AscendingLongComparator(fractions);

      expect(comparator.compare(0, 1)).toBe(-1); // 0.1 < 0.2
      expect(comparator.compare(2, 0)).toBe(1);  // 0.15 > 0.1
      expect(comparator.compare(3, 1)).toBe(1);  // 0.25 > 0.2
    });
  });
});
