//import { describe, it, expect, beforeEach } from 'vitest';
import { ArrayLayout } from '../ArrayLayout';

describe('ArrayLayout - Cache-Efficient Binary Search Trees', () => {
  let sortedData: number[];
  let smallData: number[];
  let largeData: number[];

  beforeEach(() => {
    // Standard test data
    sortedData = [10, 20, 30, 40, 50, 60, 70];

    // Small dataset for edge cases
    smallData = [100, 200, 300];

    // Larger dataset for performance testing
    largeData = Array.from({ length: 1000 }, (_, i) => (i + 1) * 10);
  });

  describe('Constructor Prevention', () => {
    it('should prevent instantiation of static utility class', () => {
      expect(() => new ArrayLayout()).toThrow('ArrayLayout is a static utility class and cannot be instantiated');
    });
  });

  describe('Basic Eytzinger Construction', () => {
    describe('constructEytzinger()', () => {
      it('should construct correct Eytzinger layout for standard dataset', () => {
        const layout = ArrayLayout.constructEytzinger(sortedData);

        // Verify structure: [-1, root, level2_left, level2_right, level3...]
        expect(layout).toHaveLength(8); // 7 elements + sentinel
        expect(layout[0]).toBe(-1); // Sentinel value

        // Root should be middle element (40)
        expect(layout[1]).toBe(40);

        // Level 2: left subtree root (20), right subtree root (60)
        expect(layout[2]).toBe(20);
        expect(layout[3]).toBe(60);

        // Level 3: leaves in breadth-first order
        expect(layout[4]).toBe(10); // Leftmost leaf
        expect(layout[5]).toBe(30);
        expect(layout[6]).toBe(50);
        expect(layout[7]).toBe(70); // Rightmost leaf
      });

      it('should handle single element array', () => {
        const singleElement = [42];
        const layout = ArrayLayout.constructEytzinger(singleElement);

        expect(layout).toHaveLength(2);
        expect(layout[0]).toBe(-1); // Sentinel
        expect(layout[1]).toBe(42); // Single element at root
      });

      it('should handle two element array', () => {
        const twoElements = [10, 20];
        const layout = ArrayLayout.constructEytzinger(twoElements);

        expect(layout).toHaveLength(3);
        expect(layout[0]).toBe(-1); // Sentinel
        expect(layout[1]).toBe(20); // Larger element at root
        expect(layout[2]).toBe(10); // Smaller element at left child
      });

      it('should handle power-of-2 minus 1 sizes efficiently', () => {
        // Perfect binary tree: 7 elements (2^3 - 1)
        const perfectTree = [1, 2, 3, 4, 5, 6, 7];
        const layout = ArrayLayout.constructEytzinger(perfectTree);

        expect(layout).toHaveLength(8);
        expect(layout[0]).toBe(-1);
        expect(layout[1]).toBe(4); // Root: middle element

        // Verify perfect binary tree structure
        expect(layout[2]).toBe(2); // Left subtree root
        expect(layout[3]).toBe(6); // Right subtree root
        expect(layout[4]).toBe(1); // Leaves
        expect(layout[5]).toBe(3);
        expect(layout[6]).toBe(5);
        expect(layout[7]).toBe(7);
      });

      it('should preserve all original elements', () => {
        const layout = ArrayLayout.constructEytzinger(sortedData);

        // Extract all non-sentinel elements
        const layoutElements = layout.slice(1).sort((a, b) => a - b);
        const originalElements = [...sortedData].sort((a, b) => a - b);

        expect(layoutElements).toEqual(originalElements);
      });

      it('should handle empty array', () => {
        const emptyArray: number[] = [];
        const layout = ArrayLayout.constructEytzinger(emptyArray);

        expect(layout).toHaveLength(1);
        expect(layout[0]).toBe(-1); // Only sentinel
      });
    });
  });

  describe('Range-Based Construction', () => {
    describe('constructEytzingerRange()', () => {
      it('should construct layout from middle range', () => {
        // Use middle 3 elements: [30, 40, 50]
        const layout = ArrayLayout.constructEytzingerRange(sortedData, 2, 3);

        expect(layout).toHaveLength(4); // 3 elements + sentinel
        expect(layout[0]).toBe(-1);
        expect(layout[1]).toBe(40); // Root: middle of range
        expect(layout[2]).toBe(30); // Left child
        expect(layout[3]).toBe(50); // Right child
      });

      it('should handle range at beginning of array', () => {
        const layout = ArrayLayout.constructEytzingerRange(sortedData, 0, 2);

        expect(layout).toHaveLength(3);
        expect(layout[0]).toBe(-1);
        expect(layout[1]).toBe(20); // Root
        expect(layout[2]).toBe(10); // Left child
      });

      it('should handle range at end of array', () => {
        const layout = ArrayLayout.constructEytzingerRange(sortedData, 5, 2);

        expect(layout).toHaveLength(3);
        expect(layout[0]).toBe(-1);
        expect(layout[1]).toBe(70); // Root
        expect(layout[2]).toBe(60); // Left child
      });

      it('should handle single element range', () => {
        const layout = ArrayLayout.constructEytzingerRange(sortedData, 3, 1);

        expect(layout).toHaveLength(2);
        expect(layout[0]).toBe(-1);
        expect(layout[1]).toBe(40); // Single element
      });

      it('should handle zero-length range', () => {
        const layout = ArrayLayout.constructEytzingerRange(sortedData, 2, 0);

        expect(layout).toHaveLength(1);
        expect(layout[0]).toBe(-1); // Only sentinel
      });

      it('should validate range bounds', () => {
        expect(() => ArrayLayout.constructEytzingerRange(sortedData, -1, 3))
          .toThrow('Offset must be non-negative, got: -1');

        expect(() => ArrayLayout.constructEytzingerRange(sortedData, 0, -1))
          .toThrow('Length must be non-negative, got: -1');

        expect(() => ArrayLayout.constructEytzingerRange(sortedData, 5, 5))
          .toThrow('Range [5, 10) exceeds array bounds [0, 7)');

        expect(() => ArrayLayout.constructEytzingerRange(sortedData, 10, 1))
          .toThrow('Range [10, 11) exceeds array bounds [0, 7)');
      });
    });
  });

  describe('Synchronized Secondary Arrays', () => {
    describe('constructEytzingerWithSecondary()', () => {
      it('should synchronize string secondary array', () => {
        const nodeIds = [100, 200, 300, 400];
        const nodeNames = ['Alice', 'Bob', 'Carol', 'Dave'];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(nodeIds, nodeNames);

        expect(layout).toHaveLength(5); // 4 elements + sentinel
        expect(secondary).toHaveLength(4); // No sentinel in secondary

        expect(layout[0]).toBe(-1); // Sentinel
        expect(layout[1]).toBe(300); // Root: middle element

        // Verify synchronization: layout[i] corresponds to secondary[i-1]
        expect(secondary[0]).toBe('Bob');   // Corresponds to layout[1] = 300 -> originally index 1
        expect(secondary[1]).toBe('Alice'); // Corresponds to layout[2] = 200 -> originally index 0
        expect(secondary[2]).toBe('Dave');  // Corresponds to layout[3] = 400 -> originally index 3
        expect(secondary[3]).toBe('Carol'); // Corresponds to layout[4] = 100 -> originally index 2
      });

      it('should synchronize numeric secondary array (PageRank scores)', () => {
        const nodeIds = [10, 20, 30, 40, 50];
        const pageRankScores = [0.1, 0.3, 0.2, 0.4, 0.15];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(nodeIds, pageRankScores);

        expect(layout[1]).toBe(30); // Root
        expect(secondary[0]).toBe(0.2); // PageRank score for node 30

        // Find where node 40 ended up
        const node40Index = layout.findIndex(id => id === 40);
        expect(secondary[node40Index - 1]).toBe(0.4); // Its PageRank score
      });

      it('should handle complex object secondary arrays', () => {
        const timestamps = [1000, 2000, 3000];
        const edgeData = [
          { source: 1, target: 2, weight: 0.5 },
          { source: 2, target: 3, weight: 0.8 },
          { source: 1, target: 3, weight: 0.3 }
        ];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(timestamps, edgeData);

        expect(layout[1]).toBe(2000); // Root timestamp
        expect(secondary[0]).toEqual({ source: 2, target: 3, weight: 0.8 }); // Corresponding edge
      });

      it('should validate array length matching', () => {
        const nodeIds = [10, 20];
        const scores = [0.1, 0.2, 0.3]; // Different length!

        expect(() => ArrayLayout.constructEytzingerWithSecondary(nodeIds, scores))
          .toThrow('Input arrays must have the same length. Primary: 2, Secondary: 3');
      });

      it('should handle empty synchronized arrays', () => {
        const emptyIds: number[] = [];
        const emptyScores: number[] = [];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(emptyIds, emptyScores);

        expect(layout).toHaveLength(1);
        expect(layout[0]).toBe(-1); // Only sentinel
        expect(secondary).toHaveLength(0);
      });
    });
  });

  describe('Cache-Efficient Search Algorithm', () => {
    describe('searchEytzinger()', () => {
      let layout: number[];

      beforeEach(() => {
        // Layout for [10, 20, 30, 40, 50, 60, 70]
        layout = ArrayLayout.constructEytzinger(sortedData);
      });

      it('should find exact matches', () => {
        expect(ArrayLayout.searchEytzinger(layout, 10)).toBe(4);
        expect(ArrayLayout.searchEytzinger(layout, 20)).toBe(2);
        expect(ArrayLayout.searchEytzinger(layout, 30)).toBe(5);
        expect(ArrayLayout.searchEytzinger(layout, 40)).toBe(1);
        expect(ArrayLayout.searchEytzinger(layout, 50)).toBe(6);
        expect(ArrayLayout.searchEytzinger(layout, 60)).toBe(3);
        expect(ArrayLayout.searchEytzinger(layout, 70)).toBe(7);
      });

      it('should return lower bound for missing values', () => {
        // Search for values between existing elements
        const pos15 = ArrayLayout.searchEytzinger(layout, 15);
        expect(layout[pos15]).toBe(10); // Closest smaller value

        const pos25 = ArrayLayout.searchEytzinger(layout, 25);
        expect(layout[pos25]).toBe(20); // Closest smaller value

        const pos45 = ArrayLayout.searchEytzinger(layout, 45);
        expect(layout[pos45]).toBe(40); // Closest smaller value
      });

      it('should handle values smaller than minimum', () => {
        const pos = ArrayLayout.searchEytzinger(layout, 5);
        expect(pos).toBe(0); // Should return sentinel position
        expect(layout[pos]).toBe(-1); // Sentinel value
      });

      it('should handle values larger than maximum', () => {
        const pos = ArrayLayout.searchEytzinger(layout, 100);
        expect(layout[pos]).toBe(70); // Largest existing value
      });

      it('should validate input array', () => {
        expect(() => ArrayLayout.searchEytzinger([], 10))
          .toThrow('Haystack array cannot be null or empty');

        expect(() => ArrayLayout.searchEytzinger(null as any, 10))
          .toThrow('Haystack array cannot be null or empty');
      });

      it('should handle single-element layout', () => {
        const singleLayout = ArrayLayout.constructEytzinger([42]);

        expect(ArrayLayout.searchEytzinger(singleLayout, 42)).toBe(1);
        expect(ArrayLayout.searchEytzinger(singleLayout, 30)).toBe(0); // Smaller
        expect(ArrayLayout.searchEytzinger(singleLayout, 50)).toBe(1); // Larger
      });

      it('should maintain search correctness for large datasets', () => {
        const largeLayout = ArrayLayout.constructEytzinger(largeData);

        // Test various search scenarios
        for (let i = 0; i < 100; i++) {
          const needle = i * 50 + 5; // Search for values like 5, 55, 105, etc.
          const position = ArrayLayout.searchEytzinger(largeLayout, needle);
          const foundValue = largeLayout[position];

          // Verify lower bound property: foundValue <= needle
          expect(foundValue <= needle).toBe(true);

          // If not at the end, verify upper bound: layout[position+1] > needle
          if (position < largeLayout.length - 1) {
            expect(largeLayout[position + 1] > needle).toBe(true);
          }
        }
      });
    });
  });

  describe('Graph Analytics Use Cases', () => {
    describe('Node ID Lookups with Properties', () => {
      it('should support fast node lookup with PageRank scores', () => {
        const nodeIds = [100, 200, 300, 400, 500];
        const pageRankScores = [0.1, 0.3, 0.2, 0.4, 0.15];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(nodeIds, pageRankScores);

        // Find node 350 (should get closest smaller: 300)
        const position = ArrayLayout.searchEytzinger(layout, 350);
        const foundNodeId = layout[position];
        const pageRankScore = secondary[position - 1]; // Remember: 0-based secondary

        expect(foundNodeId).toBe(300);
        expect(pageRankScore).toBe(0.2);
      });

      it('should handle exact node matches', () => {
        const nodeIds = [10, 20, 30, 40];
        const communities = [1, 1, 2, 2];

        const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(nodeIds, communities);

        // Find exact node 30
        const position = ArrayLayout.searchEytzinger(layout, 30);
        const foundNode = layout[position];
        const community = secondary[position - 1];

        expect(foundNode).toBe(30);
        expect(community).toBe(2);
      });
    });

    describe('Temporal Graph Processing', () => {
      it('should support timestamp-based edge queries', () => {
        const timestamps = [1000, 1100, 1200, 1300, 1400];
        const edgeWeights = [0.5, 0.8, 0.3, 0.9, 0.2];

        const { layout: timeLayout, secondary: weights } =
          ArrayLayout.constructEytzingerWithSecondary(timestamps, edgeWeights);

        // Find edges around timestamp 1150 (should get 1100)
        const position = ArrayLayout.searchEytzinger(timeLayout, 1150);
        const nearestTime = timeLayout[position];
        const edgeWeight = weights[position - 1];

        expect(nearestTime).toBe(1100);
        expect(edgeWeight).toBe(0.8);
      });

      it('should support time-window range queries', () => {
        const timestamps = [1000, 1100, 1200, 1300, 1400];
        const timeLayout = ArrayLayout.constructEytzinger(timestamps);

        // Find edges in window [1050, 1250]
        const startPos = ArrayLayout.searchEytzinger(timeLayout, 1050);
        const endPos = ArrayLayout.searchEytzinger(timeLayout, 1250);

        const edgesInWindow: number[] = [];
        for (let i = startPos; i <= endPos && i < timeLayout.length; i++) {
          const timestamp = timeLayout[i];
          if (timestamp >= 1050 && timestamp <= 1250) {
            edgesInWindow.push(timestamp);
          }
        }

        expect(edgesInWindow).toContain(1100);
        expect(edgesInWindow).toContain(1200);
        expect(edgesInWindow).not.toContain(1000);
        expect(edgesInWindow).not.toContain(1300);
      });
    });

    describe('Community Detection Support', () => {
      it('should enable community-aware node filtering', () => {
        const sortedNodeIds = [10, 20, 30, 40];
        const communityIds = [1, 1, 2, 2];

        const { layout: nodeLayout, secondary: communities } =
          ArrayLayout.constructEytzingerWithSecondary(sortedNodeIds, communityIds);

        function findNodeInCommunity(nodeId: number, targetCommunity: number): number | null {
          const position = ArrayLayout.searchEytzinger(nodeLayout, nodeId);
          const foundNode = nodeLayout[position];
          const community = communities[position - 1];

          return foundNode === nodeId && community === targetCommunity ? foundNode : null;
        }

        expect(findNodeInCommunity(20, 1)).toBe(20); // Node 20 in community 1
        expect(findNodeInCommunity(30, 2)).toBe(30); // Node 30 in community 2
        expect(findNodeInCommunity(20, 2)).toBeNull(); // Node 20 not in community 2
      });
    });

    describe('Batch Processing Performance', () => {
      it('should handle high-throughput batch lookups', () => {
        const sortedProperties = Array.from({ length: 1000 }, (_, i) => i * 10);
        const propertyLayout = ArrayLayout.constructEytzinger(sortedProperties);

        function batchLookup(queries: number[]): Array<{ query: number; result: number }> {
          return queries.map(query => ({
            query,
            result: propertyLayout[ArrayLayout.searchEytzinger(propertyLayout, query)]
          }));
        }

        const queries = [155, 255, 355, 455];
        const results = batchLookup(queries);

        expect(results).toHaveLength(4);
        expect(results[0].result).toBe(150); // Closest to 155
        expect(results[1].result).toBe(250); // Closest to 255
        expect(results[2].result).toBe(350); // Closest to 355
        expect(results[3].result).toBe(450); // Closest to 455
      });

      it('should maintain performance characteristics with large datasets', () => {
        const hugeDataset = Array.from({ length: 10000 }, (_, i) => i);
        const hugeLayout = ArrayLayout.constructEytzinger(hugeDataset);

        const startTime = performance.now();

        // Perform 1000 searches
        for (let i = 0; i < 1000; i++) {
          const needle = Math.floor(Math.random() * 10000);
          ArrayLayout.searchEytzinger(hugeLayout, needle);
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // Should complete 1000 searches in reasonable time (cache efficiency)
        expect(totalTime).toBeLessThan(100); // Less than 100ms for 1000 searches
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle arrays with duplicate values', () => {
      // Eytzinger layout assumes sorted input, duplicates should be preserved
      const withDuplicates = [10, 20, 20, 30, 30, 30];
      const layout = ArrayLayout.constructEytzinger(withDuplicates);

      expect(layout).toHaveLength(7); // 6 elements + sentinel

      // Search for duplicate value should find one occurrence
      const position = ArrayLayout.searchEytzinger(layout, 20);
      expect(layout[position]).toBe(20);
    });

    it('should handle very large numbers', () => {
      const bigNumbers = [
        9007199254740990, // Near max safe integer
        9007199254740991, // Max safe integer
        9007199254740992  // Should still work (may lose precision)
      ];

      const layout = ArrayLayout.constructEytzinger(bigNumbers);

      expect(layout).toHaveLength(4);
      expect(layout[1]).toBe(9007199254740991); // Root

      const position = ArrayLayout.searchEytzinger(layout, 9007199254740991);
      expect(layout[position]).toBe(9007199254740991);
    });

    it('should handle negative values', () => {
      const negativeValues = [-30, -20, -10, 0, 10];
      const layout = ArrayLayout.constructEytzinger(negativeValues);

      expect(layout).toHaveLength(6);
      expect(layout[1]).toBe(-10); // Root: middle element

      const position = ArrayLayout.searchEytzinger(layout, -15);
      expect(layout[position]).toBe(-20); // Closest smaller value
    });

    it('should validate proper Eytzinger structure invariants', () => {
      const layout = ArrayLayout.constructEytzinger(sortedData);

      // Verify binary tree property: for each node at index i,
      // left child is at 2*i, right child is at 2*i+1
      for (let i = 1; i < layout.length; i++) {
        const leftChild = 2 * i;
        const rightChild = 2 * i + 1;

        if (leftChild < layout.length) {
          // Left child should be defined
          expect(layout[leftChild]).toBeDefined();
        }

        if (rightChild < layout.length) {
          expect(layout[rightChild]).toBeDefined();
        }
      }
    });
  });

  describe('Memory Layout Verification', () => {
    it('should demonstrate cache-friendly memory access patterns', () => {
      const layout = ArrayLayout.constructEytzinger(sortedData);

      // Verify breadth-first ordering: level 1, then level 2, then level 3
      expect(layout[1]).toBe(40); // Level 1 (root)
      expect(layout[2]).toBe(20); // Level 2 left
      expect(layout[3]).toBe(60); // Level 2 right

      // Level 3 should contain the remaining elements
      const level3 = [layout[4], layout[5], layout[6], layout[7]];
      const expectedLevel3 = [10, 30, 50, 70];
      expect(level3).toEqual(expectedLevel3);
    });

    it('should maintain compact memory representation', () => {
      const layout = ArrayLayout.constructEytzinger(sortedData);

      // Should have exactly input.length + 1 elements (no gaps)
      expect(layout).toHaveLength(sortedData.length + 1);

      // Every position should be filled (no undefined values)
      for (let i = 0; i < layout.length; i++) {
        expect(layout[i]).toBeDefined();
      }
    });
  });

  describe('Integration with TypeScript Type System', () => {
    it('should work with readonly arrays', () => {
      const readonlyData: readonly number[] = [1, 2, 3];

      // Should accept readonly arrays
      expect(() => {
        const layout = ArrayLayout.constructEytzinger([...readonlyData]);
        ArrayLayout.searchEytzinger(layout, 2);
      }).not.toThrow();
    });

    it('should maintain type safety with generic secondary arrays', () => {
      interface GraphNode {
        id: number;
        label: string;
        degree: number;
      }

      const nodeIds = [1, 2, 3];
      const nodeObjects: GraphNode[] = [
        { id: 1, label: 'A', degree: 5 },
        { id: 2, label: 'B', degree: 3 },
        { id: 3, label: 'C', degree: 7 }
      ];

      const { layout, secondary } = ArrayLayout.constructEytzingerWithSecondary(nodeIds, nodeObjects);

      // TypeScript should enforce correct types
      const position = ArrayLayout.searchEytzinger(layout, 2);
      const node: GraphNode = secondary[position - 1];

      expect(node.id).toBe(2);
      expect(node.label).toBe('B');
      expect(node.degree).toBe(3);
    });
  });
});
