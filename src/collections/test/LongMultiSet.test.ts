import { describe, it, expect, beforeEach } from 'vitest';
import { LongMultiSet } from '../LongMultiSet';

describe('LongMultiSet', () => {
  let multiset: LongMultiSet;

  beforeEach(() => {
    multiset = new LongMultiSet();
  });

  describe('Basic Operations', () => {
    it('should start empty', () => {
      expect(multiset.size()).toBe(0);
      expect(multiset.sum()).toBe(0);
      expect(multiset.keys()).toEqual([]);
    });

    it('should add single occurrences correctly', () => {
      const count1 = multiset.add(42);
      const count2 = multiset.add(42);
      const count3 = multiset.add(100);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(1);

      expect(multiset.count(42)).toBe(2);
      expect(multiset.count(100)).toBe(1);
      expect(multiset.count(999)).toBe(0); // Non-existent value
    });

    it('should add multiple occurrences at once', () => {
      const count1 = multiset.add(42, 5);
      const count2 = multiset.add(42, 3);
      const count3 = multiset.add(100, 10);

      expect(count1).toBe(5);
      expect(count2).toBe(8); // 5 + 3
      expect(count3).toBe(10);

      expect(multiset.count(42)).toBe(8);
      expect(multiset.count(100)).toBe(10);
    });

    it('should handle negative counts for decrementing', () => {
      multiset.add(42, 10);
      const newCount = multiset.add(42, -3);

      expect(newCount).toBe(7);
      expect(multiset.count(42)).toBe(7);
    });

    it('should handle zero counts', () => {
      multiset.add(42, 5);
      const newCount = multiset.add(42, -5);

      expect(newCount).toBe(0);
      expect(multiset.count(42)).toBe(0);
      expect(multiset.keys()).toContain(42); // Key remains in map
    });

    it('should return correct counts for queries', () => {
      multiset.add(1, 10);
      multiset.add(2, 20);
      multiset.add(3, 30);

      expect(multiset.count(1)).toBe(10);
      expect(multiset.count(2)).toBe(20);
      expect(multiset.count(3)).toBe(30);
      expect(multiset.count(999)).toBe(0);
    });
  });

  describe('Collection Properties', () => {
    beforeEach(() => {
      multiset.add(10, 3);
      multiset.add(20, 1);
      multiset.add(30, 2);
    });

    it('should return correct size (unique values)', () => {
      expect(multiset.size()).toBe(3);
    });

    it('should return correct sum (total occurrences)', () => {
      expect(multiset.sum()).toBe(6); // 3 + 1 + 2
    });

    it('should return all unique keys', () => {
      const keys = multiset.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain(10);
      expect(keys).toContain(20);
      expect(keys).toContain(30);
    });

    it('should maintain insertion order for keys', () => {
      const freshMultiset = new LongMultiSet();
      freshMultiset.add(100);
      freshMultiset.add(50);
      freshMultiset.add(75);

      const keys = freshMultiset.keys();
      expect(keys).toEqual([100, 50, 75]); // Insertion order
    });
  });

  describe('Iteration and Entries', () => {
    beforeEach(() => {
      multiset.add(1, 10);
      multiset.add(2, 20);
      multiset.add(3, 30);
    });

    it('should iterate over all entries', () => {
      const entries = Array.from(multiset.entries());

      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual([1, 10]);
      expect(entries).toContainEqual([2, 20]);
      expect(entries).toContainEqual([3, 30]);
    });

    it('should support for-of iteration', () => {
      const collected: [number, number][] = [];

      for (const entry of multiset.entries()) {
        collected.push(entry);
      }

      expect(collected).toHaveLength(3);
      expect(collected).toContainEqual([1, 10]);
      expect(collected).toContainEqual([2, 20]);
      expect(collected).toContainEqual([3, 30]);
    });
  });

  describe('Utility Operations', () => {
    it('should clear all contents', () => {
      multiset.add(1, 10);
      multiset.add(2, 20);

      expect(multiset.size()).toBe(2);
      expect(multiset.sum()).toBe(30);

      multiset.clear();

      expect(multiset.size()).toBe(0);
      expect(multiset.sum()).toBe(0);
      expect(multiset.keys()).toEqual([]);
    });

    it('should provide string representation', () => {
      multiset.add(42, 3);
      multiset.add(100, 1);

      const str = multiset.toString();
      expect(str).toContain('42:3');
      expect(str).toContain('100:1');
      expect(str).toMatch(/LongMultiSet\{.*\}/);
    });

    it('should handle empty multiset string representation', () => {
      const str = multiset.toString();
      expect(str).toBe('LongMultiSet{}');
    });
  });

  describe('Graph Analytics Use Cases', () => {
    describe('Degree Distribution Analysis', () => {
      it('should analyze node degree distribution', () => {
        // Simulate degree distribution: degree -> count of nodes with that degree
        const degreeDistribution = new LongMultiSet();

        // Add degrees for various nodes
        degreeDistribution.add(1, 100);  // 100 nodes with degree 1
        degreeDistribution.add(2, 50);   // 50 nodes with degree 2
        degreeDistribution.add(3, 25);   // 25 nodes with degree 3
        degreeDistribution.add(4, 12);   // 12 nodes with degree 4
        degreeDistribution.add(5, 6);    // 6 nodes with degree 5

        const totalNodes = degreeDistribution.sum();
        expect(totalNodes).toBe(193);

        const uniqueDegrees = degreeDistribution.keys().sort((a, b) => a - b);
        expect(uniqueDegrees).toEqual([1, 2, 3, 4, 5]);

        // Calculate percentages
        const degree1Percentage = (degreeDistribution.count(1) / totalNodes) * 100;
        expect(degree1Percentage).toBeCloseTo(51.81, 2);

        // Find most common degree
        const mostCommonDegree = uniqueDegrees
          .reduce((max, degree) =>
            degreeDistribution.count(degree) > degreeDistribution.count(max) ? degree : max
          );
        expect(mostCommonDegree).toBe(1);
      });
    });

    describe('Community Size Counting', () => {
      it('should count community sizes', () => {
        const communitySizes = new LongMultiSet();

        // Simulate nodes assigned to communities
        // Community 0: 50 members, Community 1: 30 members, etc.
        communitySizes.add(0, 50);
        communitySizes.add(1, 30);
        communitySizes.add(2, 20);
        communitySizes.add(3, 15);
        communitySizes.add(4, 10);

        const communities = communitySizes.keys()
          .map(id => ({ id, size: communitySizes.count(id) }))
          .sort((a, b) => b.size - a.size);

        expect(communities[0]).toEqual({ id: 0, size: 50 }); // Largest
        expect(communities[4]).toEqual({ id: 4, size: 10 }); // Smallest

        const totalMembers = communitySizes.sum();
        expect(totalMembers).toBe(125);
      });
    });

    describe('Edge Weight Frequency Analysis', () => {
      it('should analyze edge weight distribution', () => {
        const weightDistribution = new LongMultiSet();

        // Convert edge weights to integer buckets (2 decimal places)
        const weights = [0.1, 0.1, 0.2, 0.2, 0.2, 0.5, 0.5, 1.0, 1.0, 1.0, 1.0];

        for (const weight of weights) {
          const bucket = Math.floor(weight * 100); // Convert to integer bucket
          weightDistribution.add(bucket);
        }

        expect(weightDistribution.count(10)).toBe(2);  // 0.1 weight
        expect(weightDistribution.count(20)).toBe(3);  // 0.2 weight
        expect(weightDistribution.count(50)).toBe(2);  // 0.5 weight
        expect(weightDistribution.count(100)).toBe(4); // 1.0 weight

        const totalEdges = weightDistribution.sum();
        expect(totalEdges).toBe(11);

        // Calculate mean weight
        const weights_buckets = weightDistribution.keys();
        const meanWeight = weights_buckets
          .reduce((sum, bucket) => sum + bucket * weightDistribution.count(bucket), 0)
          / totalEdges / 100;

        expect(meanWeight).toBeCloseTo(0.527, 3);
      });
    });

    it("debug mean weight calculation", () => {
      const weights = [0.1, 0.1, 0.2, 0.2, 0.2, 0.5, 0.5, 1.0, 1.0, 1.0, 1.0];

      // Manual calculation
      const manualMean =
        weights.reduce((sum, w) => sum + w, 0) / weights.length;
      console.log("Manual mean:", manualMean);

      // Using multiset
      const weightDistribution = new LongMultiSet();
      for (const weight of weights) {
        const bucket = Math.floor(weight * 100);
        weightDistribution.add(bucket);
      }

      const buckets = weightDistribution.keys();
      const bucketMean =
        buckets.reduce(
          (sum, bucket) => sum + bucket * weightDistribution.count(bucket),
          0
        ) /
        weightDistribution.sum() /
        100;

      console.log("Bucket mean:", bucketMean);
      console.log("Expected:", 5.8 / 11);

      expect(bucketMean).toBeCloseTo(manualMean, 10);
    });

    describe('Algorithm Convergence Tracking', () => {
      it('should track convergence in iterative algorithms', () => {
        const convergenceBuckets = new LongMultiSet();

        // Simulate PageRank score differences in log scale buckets
        const scoreDiffs = [1e-6, 1e-6, 1e-5, 1e-5, 1e-5, 1e-4, 1e-3, 1e-3, 1e-2];

        for (const diff of scoreDiffs) {
          const bucket = Math.floor(Math.log10(diff + 1e-10) * 10);
          convergenceBuckets.add(bucket);
        }

        const totalNodes = convergenceBuckets.sum();
        expect(totalNodes).toBe(9);

        // Count nodes with high differences (> 1e-3)
        const highDiffCount = convergenceBuckets.keys()
          .filter(bucket => bucket > -30) // Log scale: differences > 1e-3
          .reduce((sum, bucket) => sum + convergenceBuckets.count(bucket), 0);

        const convergenceRatio = 1 - (highDiffCount / totalNodes);
        expect(convergenceRatio).toBeGreaterThan(0.5);
      });
    });

    describe('Memory-Efficient Histogram Generation', () => {
      it('should generate histograms for large datasets', () => {
        const histogram = new LongMultiSet();
        const bucketSize = 10;

        // Simulate streaming data values
        const values = [5, 15, 25, 35, 15, 25, 25, 45, 55, 15];

        for (const value of values) {
          const bucket = Math.floor(value / bucketSize);
          histogram.add(bucket);
        }

        // Generate histogram data
        const histogramData = histogram.keys().map(bucket => ({
          bucketStart: bucket * bucketSize,
          bucketEnd: (bucket + 1) * bucketSize,
          count: histogram.count(bucket),
          frequency: histogram.count(bucket) / histogram.sum()
        }));

        expect(histogramData).toHaveLength(histogram.size());

        // Check specific buckets
        const bucket1 = histogramData.find(h => h.bucketStart === 10);
        expect(bucket1?.count).toBe(3); // Values 15, 15, 15

        const bucket2 = histogramData.find(h => h.bucketStart === 20);
        expect(bucket2?.count).toBe(3); // Values 25, 25, 25

        // Verify frequencies sum to 1
        const totalFrequency = histogramData
          .reduce((sum, h) => sum + h.frequency, 0);
        expect(totalFrequency).toBeCloseTo(1.0, 10);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large integer values', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const count = multiset.add(largeValue, 5);

      expect(count).toBe(5);
      expect(multiset.count(largeValue)).toBe(5);
    });

    it('should handle zero as a valid value', () => {
      multiset.add(0, 10);

      expect(multiset.count(0)).toBe(10);
      expect(multiset.keys()).toContain(0);
    });

    it('should handle negative values', () => {
      multiset.add(-42, 5);
      multiset.add(-100, 3);

      expect(multiset.count(-42)).toBe(5);
      expect(multiset.count(-100)).toBe(3);
      expect(multiset.size()).toBe(2);
    });

    it('should handle repeated additions efficiently', () => {
      // Add same value many times
      for (let i = 0; i < 1000; i++) {
        multiset.add(42);
      }

      expect(multiset.count(42)).toBe(1000);
      expect(multiset.size()).toBe(1); // Still only one unique value
      expect(multiset.sum()).toBe(1000);
    });

    it('should handle many unique values', () => {
      // Add many unique values
      for (let i = 0; i < 1000; i++) {
        multiset.add(i);
      }

      expect(multiset.size()).toBe(1000);
      expect(multiset.sum()).toBe(1000);

      // Check a few specific values
      expect(multiset.count(0)).toBe(1);
      expect(multiset.count(500)).toBe(1);
      expect(multiset.count(999)).toBe(1);
    });

    it('should handle mixed operations', () => {
      // Complex sequence of operations
      multiset.add(1, 10);
      multiset.add(2);
      multiset.add(1, -5);
      multiset.add(3, 3);
      multiset.add(2, 4);

      expect(multiset.count(1)).toBe(5);  // 10 - 5
      expect(multiset.count(2)).toBe(5);  // 1 + 4
      expect(multiset.count(3)).toBe(3);

      expect(multiset.size()).toBe(3);
      expect(multiset.sum()).toBe(13); // 5 + 5 + 3
    });
  });

  describe('Batch Processing Patterns', () => {
    it('should support efficient batch counting', () => {
      // Simulate preprocessing counts
      const precomputedCounts = new Map([
        [100, 50],
        [200, 30],
        [300, 20]
      ]);

      for (const [value, count] of precomputedCounts) {
        multiset.add(value, count);
      }

      expect(multiset.count(100)).toBe(50);
      expect(multiset.count(200)).toBe(30);
      expect(multiset.count(300)).toBe(20);
      expect(multiset.sum()).toBe(100);
    });

    it('should support sliding window operations', () => {
      // Simulate sliding window
      const window = [1, 2, 3];

      // Add initial window
      for (const value of window) {
        multiset.add(value);
      }

      expect(multiset.sum()).toBe(3);

      // Slide window: remove 1, add 4
      multiset.add(1, -1);  // Remove old value
      multiset.add(4);      // Add new value

      expect(multiset.count(1)).toBe(0);
      expect(multiset.count(4)).toBe(1);
      expect(multiset.sum()).toBe(3); // Still 3 total elements
    });
  });

  describe('Statistical Analysis Support', () => {
    beforeEach(() => {
      // Set up data for statistical tests
      multiset.add(1, 10);  // Value 1 appears 10 times
      multiset.add(2, 20);  // Value 2 appears 20 times
      multiset.add(3, 30);  // Value 3 appears 30 times
      multiset.add(4, 40);  // Value 4 appears 40 times
    });

    it('should support mean calculation', () => {
      const values = multiset.keys();
      const totalCount = multiset.sum();

      const mean = values
        .reduce((sum, value) => sum + value * multiset.count(value), 0) / totalCount;

      expect(mean).toBeCloseTo(3.0, 10); // Weighted mean
    });

    it('should support mode detection', () => {
      const mode = multiset.keys()
        .reduce((max, value) =>
          multiset.count(value) > multiset.count(max) ? value : max
        );

      expect(mode).toBe(4); // Value with highest count (40)
    });

    it('should support frequency calculation', () => {
      const totalCount = multiset.sum();
      const frequencies = multiset.keys().map(value => ({
        value,
        frequency: multiset.count(value) / totalCount
      }));

      expect(frequencies).toHaveLength(4);

      const freq1 = frequencies.find(f => f.value === 1);
      expect(freq1?.frequency).toBeCloseTo(0.1, 10); // 10/100

      const freq4 = frequencies.find(f => f.value === 4);
      expect(freq4?.frequency).toBeCloseTo(0.4, 10); // 40/100

      // Frequencies should sum to 1
      const totalFreq = frequencies.reduce((sum, f) => sum + f.frequency, 0);
      expect(totalFreq).toBeCloseTo(1.0, 10);
    });
  });
});
