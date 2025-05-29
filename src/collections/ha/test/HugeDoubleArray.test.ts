import { HugeDoubleArray } from '../HugeDoubleArray';
import { HugeArrays } from '@/mem/HugeArrays';

describe('HugeDoubleArray', () => {
  let array: HugeDoubleArray;

  afterEach(() => {
    // Clean up memory after each test
    if (array) {
      array.release();
    }
  });

  describe('Factory Methods', () => {
    it('should create small arrays as SingleHugeDoubleArray', () => {
      const size = 1000;
      array = HugeDoubleArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('SingleHugeDoubleArray');
    });

    it('should create large arrays as PagedHugeDoubleArray', () => {
      const size = HugeArrays.MAX_ARRAY_LENGTH + 1000;
      array = HugeDoubleArray.newArray(size);

      expect(array.size()).toBe(size);
      expect(array.constructor.name).toBe('PagedHugeDoubleArray');
    });

    it('should create array from values', () => {
      array = HugeDoubleArray.of(1.5, 2.7, 3.14159, 4.0, 5.5);

      expect(array.size()).toBe(5);
      expect(array.get(0)).toBe(1.5);
      expect(array.get(2)).toBeCloseTo(3.14159, 5);
      expect(array.get(4)).toBe(5.5);
    });

    it('should estimate memory correctly', () => {
      const size = 10000;
      const estimation = HugeDoubleArray.memoryEstimation(size);

      expect(estimation).toBeGreaterThan(0);
      expect(typeof estimation).toBe('number');
    });

    it('should use test factory methods', () => {
      const singleArray = HugeDoubleArray.newSingleArray(100);
      expect(singleArray.constructor.name).toBe('SingleHugeDoubleArray');
      singleArray.release();

      const pagedArray = HugeDoubleArray.newPagedArray(HugeArrays.PAGE_SIZE + 100);
      expect(pagedArray.constructor.name).toBe('PagedHugeDoubleArray');
      pagedArray.release();
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      array = HugeDoubleArray.newArray(100);
    });

    it('should get and set values correctly', () => {
      array.set(0, 3.14159);
      array.set(50, 2.71828);
      array.set(99, 1.41421);

      expect(array.get(0)).toBeCloseTo(3.14159, 5);
      expect(array.get(50)).toBeCloseTo(2.71828, 5);
      expect(array.get(99)).toBeCloseTo(1.41421, 5);
    });

    it('should initialize with zeros', () => {
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBe(0.0);
      }
    });

    it('should handle negative values', () => {
      array.set(0, -3.14159);
      array.set(1, -0.0);
      array.set(2, -1e-10);

      expect(array.get(0)).toBeCloseTo(-3.14159, 5);
      expect(array.get(1)).toBe(-0.0);
      expect(array.get(2)).toBeCloseTo(-1e-10, 15);
    });

    it('should handle special floating-point values', () => {
      array.set(0, Number.POSITIVE_INFINITY);
      array.set(1, Number.NEGATIVE_INFINITY);
      array.set(2, Number.NaN);
      array.set(3, Number.MAX_VALUE);
      array.set(4, Number.MIN_VALUE);

      expect(array.get(0)).toBe(Number.POSITIVE_INFINITY);
      expect(array.get(1)).toBe(Number.NEGATIVE_INFINITY);
      expect(Number.isNaN(array.get(2))).toBe(true);
      expect(array.get(3)).toBe(Number.MAX_VALUE);
      expect(array.get(4)).toBe(Number.MIN_VALUE);
    });

    it('should throw on invalid indices', () => {
      expect(() => array.get(-1)).toThrow();
      expect(() => array.get(array.size())).toThrow();
      expect(() => array.set(-1, 3.14)).toThrow();
      expect(() => array.set(array.size(), 3.14)).toThrow();
    });
  });

  describe('Floating-Point Arithmetic Operations', () => {
    beforeEach(() => {
      array = HugeDoubleArray.newArray(10);
    });

    it('should add values correctly', () => {
      array.set(0, 10.5);
      array.addTo(0, 5.3);

      expect(array.get(0)).toBeCloseTo(15.8, 10);
    });

    it('should accumulate floating-point values', () => {
      // Simulate weight accumulation
      array.addTo(0, 0.1); // First weight
      array.addTo(0, 0.2); // Second weight
      array.addTo(0, 0.3); // Third weight

      expect(array.get(0)).toBeCloseTo(0.6, 10);
    });

    it('should handle negative additions', () => {
      array.set(0, 10.7);
      array.addTo(0, -3.2);

      expect(array.get(0)).toBeCloseTo(7.5, 10);
    });

    it('should handle very small value accumulation', () => {
      array.set(0, 0.0);
      for (let i = 0; i < 1000; i++) {
        array.addTo(0, 1e-6); // Add very small values
      }

      expect(array.get(0)).toBeCloseTo(0.001, 6);
    });

    it('should handle special value arithmetic', () => {
      // Test infinity arithmetic
      array.set(0, Number.POSITIVE_INFINITY);
      array.addTo(0, 1000.0);
      expect(array.get(0)).toBe(Number.POSITIVE_INFINITY);

      // Test NaN propagation
      array.set(1, Number.NaN);
      array.addTo(1, 5.0);
      expect(Number.isNaN(array.get(1))).toBe(true);

      // Test infinity + (-infinity) = NaN
      array.set(2, Number.POSITIVE_INFINITY);
      array.addTo(2, Number.NEGATIVE_INFINITY);
      expect(Number.isNaN(array.get(2))).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      array = HugeDoubleArray.newArray(100);
    });

    it('should fill with constant value', () => {
      array.fill(3.14159);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBeCloseTo(3.14159, 5);
      }
    });

    it('should set all with generator function', () => {
      array.setAll(index => index * 0.5);

      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBeCloseTo(i * 0.5, 10);
      }
    });

    it('should generate mathematical sequences', () => {
      // Generate reciprocals: 1/1, 1/2, 1/3, ...
      array.setAll(index => 1.0 / (index + 1));

      expect(array.get(0)).toBe(1.0);
      expect(array.get(1)).toBe(0.5);
      expect(array.get(2)).toBeCloseTo(1.0/3.0, 10);
      expect(array.get(9)).toBeCloseTo(0.1, 10);
    });

    it('should generate trigonometric sequences', () => {
      // Generate sine wave
      array.setAll(index => Math.sin(index * Math.PI / 50));

      expect(array.get(0)).toBe(0.0);
      expect(array.get(25)).toBeCloseTo(1.0, 10); // sin(π/2)
      expect(array.get(50)).toBeCloseTo(0.0, 10); // sin(π)
      expect(array.get(75)).toBeCloseTo(-1.0, 10); // sin(3π/2)
    });

    it('should generate exponential sequences', () => {
      // Generate exponential decay
      array.setAll(index => Math.exp(-index * 0.1));

      expect(array.get(0)).toBe(1.0);
      expect(array.get(10)).toBeCloseTo(Math.exp(-1), 10);
      expect(array.get(23)).toBeCloseTo(Math.exp(-2.3), 10);
    });

    it('should generate probability distributions', () => {
      // Generate normal distribution approximation
      const mean = 50;
      const stdDev = 15;

      array.setAll(index => {
        const x = index;
        const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      });

      // Check peak at mean
      const peakValue = array.get(mean);
      expect(peakValue).toBeGreaterThan(array.get(mean - 10));
      expect(peakValue).toBeGreaterThan(array.get(mean + 10));
    });
  });

  describe('Array Conversion and Copying', () => {
    beforeEach(() => {
      array = HugeDoubleArray.of(1.1, 2.2, 3.3, 4.4, 5.5);
    });

    it('should convert to regular array', () => {
      const regularArray = array.toArray();

      expect(regularArray).toHaveLength(5);
      expect(regularArray[0]).toBeCloseTo(1.1, 10);
      expect(regularArray[2]).toBeCloseTo(3.3, 10);
      expect(regularArray[4]).toBeCloseTo(5.5, 10);
      expect(Array.isArray(regularArray)).toBe(true);
    });

    it('should create copy with different length', () => {
      const copy = array.copyOf(3);

      expect(copy.size()).toBe(3);
      expect(copy.get(0)).toBeCloseTo(1.1, 10);
      expect(copy.get(1)).toBeCloseTo(2.2, 10);
      expect(copy.get(2)).toBeCloseTo(3.3, 10);

      copy.release();
    });

    it('should create copy with larger length', () => {
      const copy = array.copyOf(8);

      expect(copy.size()).toBe(8);
      expect(copy.get(0)).toBeCloseTo(1.1, 10);
      expect(copy.get(4)).toBeCloseTo(5.5, 10);
      expect(copy.get(5)).toBe(0.0); // Should be zero-filled
      expect(copy.get(7)).toBe(0.0);

      copy.release();
    });

    it('should handle boxed operations', () => {
      expect(array.boxedGet(0)).toBeCloseTo(1.1, 10);

      array.boxedSet(0, 9.9);
      expect(array.get(0)).toBeCloseTo(9.9, 10);

      array.boxedFill(7.7);
      for (let i = 0; i < array.size(); i++) {
        expect(array.get(i)).toBeCloseTo(7.7, 10);
      }
    });
  });

  describe('Copy Operations Between Arrays', () => {
    let source: HugeDoubleArray;
    let dest: HugeDoubleArray;

    beforeEach(() => {
      source = HugeDoubleArray.of(1.1, 2.2, 3.3, 4.4, 5.5);
      dest = HugeDoubleArray.newArray(10);
    });

    afterEach(() => {
      source.release();
      dest.release();
    });

    it('should copy to another array', () => {
      source.copyTo(dest, 5);

      expect(dest.get(0)).toBeCloseTo(1.1, 10);
      expect(dest.get(4)).toBeCloseTo(5.5, 10);
      expect(dest.get(5)).toBe(0.0); // Should remain zero
    });

    it('should copy partial data', () => {
      source.copyTo(dest, 3);

      expect(dest.get(0)).toBeCloseTo(1.1, 10);
      expect(dest.get(2)).toBeCloseTo(3.3, 10);
      expect(dest.get(3)).toBe(0.0); // Should remain zero
    });

    it('should copy between single and paged arrays', () => {
      const largeDest = HugeDoubleArray.newPagedArray(HugeArrays.PAGE_SIZE + 100);

      source.copyTo(largeDest, 5);

      expect(largeDest.get(0)).toBeCloseTo(1.1, 10);
      expect(largeDest.get(4)).toBeCloseTo(5.5, 10);
      expect(largeDest.get(5)).toBe(0.0);

      largeDest.release();
    });
  });

  describe('Streaming Operations', () => {
    beforeEach(() => {
      array = HugeDoubleArray.newArray(100);
      array.setAll(index => index * 0.1); // Generate decimal sequence
    });

    it('should stream values correctly', () => {
      const streamedValues: number[] = [];

      for (const value of array.stream()) {
        streamedValues.push(value);
      }

      expect(streamedValues).toHaveLength(100);
      expect(streamedValues[0]).toBe(0.0);
      expect(streamedValues[50]).toBeCloseTo(5.0, 10);
      expect(streamedValues[99]).toBeCloseTo(9.9, 10);
    });

    it('should support functional operations on stream', () => {
      // Sum all values using stream
      let sum = 0;
      for (const value of array.stream()) {
        sum += value;
      }

      // Expected sum: 0.0 + 0.1 + 0.2 + ... + 9.9 = 49.5
      expect(sum).toBeCloseTo(495, 10);
    });

    it('should handle empty array streaming', () => {
      const emptyArray = HugeDoubleArray.newArray(0);
      const streamedValues: number[] = [];

      for (const value of emptyArray.stream()) {
        streamedValues.push(value);
      }

      expect(streamedValues).toHaveLength(0);
      emptyArray.release();
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      array = HugeDoubleArray.newArray(1000);
      const memoryUsed = array.sizeOf();

      expect(memoryUsed).toBeGreaterThan(0);
      expect(typeof memoryUsed).toBe('number');
    });

    it('should release memory', () => {
      array = HugeDoubleArray.newArray(1000);
      const memoryUsed = array.sizeOf();
      const freedMemory = array.release();

      expect(freedMemory).toBe(memoryUsed);

      // Second release should return 0
      const secondRelease = array.release();
      expect(secondRelease).toBe(0);
    });

    it('should estimate memory before allocation', () => {
      const size = 50000;
      const estimation = HugeDoubleArray.memoryEstimation(size);

      array = HugeDoubleArray.newArray(size);
      const actualMemory = array.sizeOf();

      // Estimation should be reasonably close to actual
      expect(Math.abs(estimation - actualMemory)).toBeLessThan(actualMemory * 0.1);
    });
  });

  describe('Large Array Scenarios', () => {
    it('should handle page boundaries correctly', () => {
      const size = HugeArrays.PAGE_SIZE + 100; // Cross page boundary
      array = HugeDoubleArray.newPagedArray(size);

      // Set values around page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.set(boundaryIndex, Math.PI);
      array.set(boundaryIndex + 1, Math.E);

      expect(array.get(boundaryIndex)).toBeCloseTo(Math.PI, 10);
      expect(array.get(boundaryIndex + 1)).toBeCloseTo(Math.E, 10);
    });

    it('should perform operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE * 2 + 100;
      array = HugeDoubleArray.newPagedArray(size);

      // Fill array with fractional index values
      array.setAll(index => index / 1000.0);

      // Check values across different pages
      expect(array.get(0)).toBe(0.0);
      expect(array.get(HugeArrays.PAGE_SIZE)).toBeCloseTo(HugeArrays.PAGE_SIZE / 1000.0, 10);
      expect(array.get(size - 1)).toBeCloseTo((size - 1) / 1000.0, 10);
    });

    it('should handle floating-point operations across pages', () => {
      const size = HugeArrays.PAGE_SIZE + 100;
      array = HugeDoubleArray.newPagedArray(size);

      // Set values across page boundary
      const boundaryIndex = HugeArrays.PAGE_SIZE - 1;
      array.set(boundaryIndex, 100.0);
      array.set(boundaryIndex + 1, 200.0);

      // Perform arithmetic across boundary
      array.addTo(boundaryIndex, 0.5);
      array.addTo(boundaryIndex + 1, 0.7);

      expect(array.get(boundaryIndex)).toBeCloseTo(100.5, 10);
      expect(array.get(boundaryIndex + 1)).toBeCloseTo(200.7, 10);
    });
  });

  describe('Graph Algorithm Simulation', () => {
    it('should simulate PageRank scores', () => {
      const nodeCount = 1000;
      const pageRankScores = HugeDoubleArray.newArray(nodeCount);

      // Initialize with uniform distribution
      const initialScore = 1.0 / nodeCount;
      pageRankScores.fill(initialScore);

      // Simulate one PageRank iteration
      const dampingFactor = 0.85;
      const contributions = [
        { nodeId: 0, value: 0.1 },
        { nodeId: 1, value: 0.05 },
        { nodeId: 2, value: 0.15 },
        { nodeId: 10, value: 0.08 }
      ];

      for (const contrib of contributions) {
        const newScore = (1 - dampingFactor) / nodeCount + dampingFactor * contrib.value;
        pageRankScores.set(contrib.nodeId, newScore);
      }

      // Check updated scores
      expect(pageRankScores.get(0)).toBeGreaterThan(initialScore);
      expect(pageRankScores.get(2)).toBeGreaterThan(pageRankScores.get(1));
      expect(pageRankScores.get(500)).toBeCloseTo(initialScore, 10); // Unchanged node

      pageRankScores.release();
    });

    it('should simulate edge weights in weighted graphs', () => {
      const edgeCount = 5000;
      const edgeWeights = HugeDoubleArray.newArray(edgeCount);

      // Generate random edge weights (0.1 to 10.0)
      edgeWeights.setAll(edgeIndex => 0.1 + (edgeIndex % 100) / 10.0);

      // Compute total weight
      let totalWeight = 0.0;
      for (const weight of edgeWeights.stream()) {
        totalWeight += weight;
      }

      // Verify reasonable weight distribution
      expect(totalWeight).toBeGreaterThan(0);
      expect(edgeWeights.get(0)).toBeCloseTo(0.1, 10);
      expect(edgeWeights.get(99)).toBeCloseTo(10.0, 10);

      edgeWeights.release();
    });

    it('should simulate centrality measures', () => {
      const nodeCount = 100;
      const betweennessCentrality = HugeDoubleArray.newArray(nodeCount);

      // Initialize all centralities to 0
      betweennessCentrality.fill(0.0);

      // Simulate centrality accumulation for specific nodes
      const centralNodes = [10, 25, 50, 75];
      for (const nodeId of centralNodes) {
        // Each node gets different centrality based on position
        const centrality = (nodeId + 1) / 100.0;
        betweennessCentrality.addTo(nodeId, centrality);
        betweennessCentrality.addTo(nodeId, centrality * 0.5); // Second contribution
      }

      // Verify centrality values
      expect(betweennessCentrality.get(10)).toBeCloseTo(0.165, 10); // 0.11 + 0.055
      expect(betweennessCentrality.get(25)).toBeCloseTo(0.39, 10);  // 0.26 + 0.13
      expect(betweennessCentrality.get(0)).toBe(0.0); // Non-central node

      betweennessCentrality.release();
    });

    it('should simulate distance calculations', () => {
      const nodeCount = 1000;
      const distances = HugeDoubleArray.newArray(nodeCount);

      // Initialize distances for Dijkstra-like algorithm
      distances.fill(Number.POSITIVE_INFINITY);
      distances.set(0, 0.0); // Source node

      // Simulate relaxation steps
      const edges = [
        { target: 1, weight: 2.5 },
        { target: 2, weight: 4.1 },
        { target: 5, weight: 1.8 },
        { target: 10, weight: 3.7 }
      ];

      for (const edge of edges) {
        const newDistance = distances.get(0) + edge.weight;
        if (newDistance < distances.get(edge.target)) {
          distances.set(edge.target, newDistance);
        }
      }

      // Verify distance updates
      expect(distances.get(0)).toBe(0.0);
      expect(distances.get(1)).toBeCloseTo(2.5, 10);
      expect(distances.get(5)).toBeCloseTo(1.8, 10);
      expect(distances.get(100)).toBe(Number.POSITIVE_INFINITY); // Unreached

      distances.release();
    });

    it('should simulate probability distributions', () => {
      const nodeCount = 1000;
      const probabilities = HugeDoubleArray.newArray(nodeCount);

      // Generate exponential distribution for node selection probabilities
      const lambda = 0.01;
      probabilities.setAll(nodeId => lambda * Math.exp(-lambda * nodeId));

      // Normalize to sum to 1.0
      let totalProb = 0.0;
      for (const prob of probabilities.stream()) {
        totalProb += prob;
      }

      // Apply normalization
      for (let i = 0; i < nodeCount; i++) {
        const normalizedProb = probabilities.get(i) / totalProb;
        probabilities.set(i, normalizedProb);
      }

      // Verify normalization
      let verifySum = 0.0;
      for (const prob of probabilities.stream()) {
        verifySum += prob;
      }

      expect(verifySum).toBeCloseTo(1.0, 5);
      expect(probabilities.get(0)).toBeGreaterThan(probabilities.get(100));

      probabilities.release();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero-sized arrays', () => {
      array = HugeDoubleArray.newArray(0);

      expect(array.size()).toBe(0);
      expect(array.toArray()).toEqual([]);
    });

    it('should handle single element arrays', () => {
      array = HugeDoubleArray.newArray(1);
      array.set(0, Math.PI);

      expect(array.size()).toBe(1);
      expect(array.get(0)).toBeCloseTo(Math.PI, 10);
      expect(array.toArray()).toHaveLength(1);
      expect(array.toArray()[0]).toBeCloseTo(Math.PI, 10);
    });

    it('should handle exact page size arrays', () => {
      array = HugeDoubleArray.newArray(HugeArrays.PAGE_SIZE);
      array.fill(1.23456);

      expect(array.size()).toBe(HugeArrays.PAGE_SIZE);
      expect(array.get(0)).toBeCloseTo(1.23456, 5);
      expect(array.get(HugeArrays.PAGE_SIZE - 1)).toBeCloseTo(1.23456, 5);
    });

    it('should handle extreme floating-point values', () => {
      array = HugeDoubleArray.newArray(10);

      array.set(0, Number.MAX_VALUE);
      array.set(1, Number.MIN_VALUE);
      array.set(2, Number.EPSILON);
      array.set(3, 1e-100);
      array.set(4, 1e100);

      expect(array.get(0)).toBe(Number.MAX_VALUE);
      expect(array.get(1)).toBe(Number.MIN_VALUE);
      expect(array.get(2)).toBe(Number.EPSILON);
      expect(array.get(3)).toBeCloseTo(1e-100, 110);
      expect(array.get(4)).toBeCloseTo(1e100, -90);
    });
  });

  describe('Numerical Precision', () => {
    beforeEach(() => {
      array = HugeDoubleArray.newArray(10);
    });

    it('should maintain precision in repeated operations', () => {
      array.set(0, 0.1);

      // Add 0.1 ten times
      for (let i = 0; i < 10; i++) {
        array.addTo(0, 0.1);
      }

      // Should be close to 1.1, but floating-point may have small errors
      expect(array.get(0)).toBeCloseTo(1.1, 10);
    });

    it('should handle very small differences', () => {
      const value1 = 1.0;
      const value2 = 1.0 + Number.EPSILON;

      array.set(0, value1);
      array.set(1, value2);

      expect(array.get(0)).not.toBe(array.get(1));
      expect(array.get(1) - array.get(0)).toBe(Number.EPSILON);
    });

    it('should preserve precision in large numbers', () => {
      const largeNumber = 1.23456789012345e15;

      array.set(0, largeNumber);
      expect(array.get(0)).toBe(largeNumber);

      // Adding small values to large numbers tests precision
      array.addTo(0, 1.0);
      expect(array.get(0)).toBe(largeNumber + 1.0);
    });
  });

  describe('String Representation', () => {
    it('should provide string representation for small arrays', () => {
      array = HugeDoubleArray.of(1.5, 2.7, 3.14159);
      const str = array.toString();

      expect(str).toContain('1.5');
      expect(str).toContain('2.7');
      expect(str).toContain('3.14159');
    });

    it('should handle toString for single element', () => {
      array = HugeDoubleArray.of(Math.E);
      const str = array.toString();

      expect(str).toContain(Math.E.toString());
    });

    it('should handle toString for special values', () => {
      array = HugeDoubleArray.of(Number.POSITIVE_INFINITY, Number.NaN);
      const str = array.toString();

      expect(str).toContain('Infinity');
      expect(str).toContain('NaN');
    });
  });
});
