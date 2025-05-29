import { PageReordering, PageOrdering } from '../PageReordering';
import { HugeLongArray } from '@/collections';
import { HugeIntArray } from '@/collections';

describe('PageReordering - Cache-Optimized Memory Layout', () => {
  describe('Constructor', () => {
    it('should prevent instantiation', () => {
      expect(() => new (PageReordering as any)())
        .toThrow('PageReordering is a static utility class and cannot be instantiated');
    });
  });

  describe('Page Ordering Detection', () => {
    describe('Basic page ordering analysis', () => {
      it('should detect simple page access pattern', () => {
        // Test data from Java example: page size = 8 (pageShift = 3)
        const offsets = new HugeLongArray([16, 18, 22, 0, 3, 6, 24, 28, 30, 8, 13, 15]);
        const nodeFilter = (nodeId: number) => nodeId >= 0; // All nodes connected

        const ordering = PageReordering.ordering(offsets, nodeFilter, 4, 3);

        // Pages accessed: 16>>3=2, 18>>3=2, 22>>3=2, 0>>3=0, 3>>3=0, 6>>3=0,
        //                24>>3=3, 28>>3=3, 30>>3=3, 8>>3=1, 13>>3=1, 15>>3=1
        // First occurrence order: [2, 0, 3, 1]
        expect(ordering.distinctOrdering).toEqual([2, 0, 3, 1]);

        // reverseOrdering maps page access sequence to new indices
        expect(ordering.reverseOrdering).toEqual([0, 1, 2, 3]); // [page2->0, page0->1, page3->2, page1->3]

        // pageOffsets mark boundaries where page changes occur
        expect(ordering.pageOffsets).toEqual([0, 3, 6, 9, 12]); // Boundaries + final

        expect(ordering.length).toBe(4);
      });

      it('should handle single page access', () => {
        const offsets = new HugeLongArray([0, 1, 2, 3, 4, 5, 6, 7]);
        const nodeFilter = () => true;

        const ordering = PageReordering.ordering(offsets, nodeFilter, 1, 3);

        expect(ordering.distinctOrdering).toEqual([0]); // Only page 0
        expect(ordering.reverseOrdering).toEqual([0]); // Single mapping
        expect(ordering.pageOffsets).toEqual([0, 8]); // Start and end
        expect(ordering.length).toBe(1);
      });

      it('should handle filtered nodes correctly', () => {
        const offsets = new HugeLongArray([16, 18, 22, 0, 3, 6, 24, 28]);
        const degrees = new HugeIntArray([1, 0, 1, 1, 0, 1, 1, 1]); // Node 1 and 4 have degree 0
        const nodeFilter = (nodeId: number) => degrees.get(nodeId) > 0;

        const ordering = PageReordering.ordering(offsets, nodeFilter, 4, 3);

        // Only nodes 0, 2, 3, 5, 6, 7 are processed (nodes 1, 4 filtered out)
        // Offsets: [16, 22, 0, 6, 24, 28]
        // Pages: [2, 2, 0, 0, 3, 3]
        expect(ordering.distinctOrdering).toEqual([2, 0, 3]); // Pages in order of first occurrence
      });

      it('should handle empty result when all nodes filtered', () => {
        const offsets = new HugeLongArray([16, 18, 22, 0]);
        const nodeFilter = () => false; // No nodes pass filter

        const ordering = PageReordering.ordering(offsets, nodeFilter, 4, 3);

        expect(ordering.distinctOrdering.length).toBe(4); // Array allocated but unused
        expect(ordering.reverseOrdering).toEqual([]);
        expect(ordering.pageOffsets).toEqual([4]); // Only final boundary
        expect(ordering.length).toBe(0);
      });
    });

    describe('Page shift calculations', () => {
      it('should handle different page sizes correctly', () => {
        // Test with page size 16 (pageShift = 4)
        const offsets = new HugeLongArray([0, 8, 15, 16, 24, 31, 32, 48]);
        const nodeFilter = () => true;

        const ordering = PageReordering.ordering(offsets, nodeFilter, 4, 4);

        // Pages: 0>>4=0, 8>>4=0, 15>>4=0, 16>>4=1, 24>>4=1, 31>>4=1, 32>>4=2, 48>>4=3
        expect(ordering.distinctOrdering).toEqual([0, 1, 2, 3]);
        expect(ordering.reverseOrdering).toEqual([0, 1, 2, 3]);
        expect(ordering.pageOffsets).toEqual([0, 3, 6, 7, 8]);
      });

      it('should handle large page shifts', () => {
        // Test with page size 1024 (pageShift = 10)
        const offsets = new HugeLongArray([0, 512, 1023, 1024, 2048, 3072]);
        const nodeFilter = () => true;

        const ordering = PageReordering.ordering(offsets, nodeFilter, 4, 10);

        // Pages: 0>>10=0, 512>>10=0, 1023>>10=0, 1024>>10=1, 2048>>10=2, 3072>>10=3
        expect(ordering.distinctOrdering).toEqual([0, 1, 2, 3]);
        expect(ordering.reverseOrdering).toEqual([0, 1, 2, 3]);
      });
    });
  });

  describe('Physical Page Reordering', () => {
    describe('Basic page swapping', () => {
      it('should reorder pages according to optimal sequence', () => {
        const pages = ['r', 'g', 'b', 's']; // Original pages
        const ordering = [2, 0, 3, 1]; // Target order: [b, r, s, g]

        const swaps = PageReordering.reorderPages(pages, ordering);

        expect(pages).toEqual(['b', 'r', 's', 'g']); // Reordered optimally
        expect(swaps).toEqual([2, 0, 3, 1]); // Swap tracking
      });

      it('should handle identity ordering', () => {
        const pages = ['a', 'b', 'c', 'd'];
        const ordering = [0, 1, 2, 3]; // No reordering needed

        const swaps = PageReordering.reorderPages(pages, ordering);

        expect(pages).toEqual(['a', 'b', 'c', 'd']); // Unchanged
        expect(swaps).toEqual([0, 1, 2, 3]);
      });

      it('should handle reverse ordering', () => {
        const pages = ['a', 'b', 'c', 'd'];
        const ordering = [3, 2, 1, 0]; // Complete reversal

        const swaps = PageReordering.reorderPages(pages, ordering);

        expect(pages).toEqual(['d', 'c', 'b', 'a']); // Reversed
        expect(swaps).toEqual([3, 2, 1, 0]);
      });

      it('should handle single page', () => {
        const pages = ['only'];
        const ordering = [0];

        const swaps = PageReordering.reorderPages(pages, ordering);

        expect(pages).toEqual(['only']); // Unchanged
        expect(swaps).toEqual([0]);
      });

      it('should handle complex cycles', () => {
        const pages = ['a', 'b', 'c', 'd', 'e'];
        const ordering = [1, 2, 4, 0, 3]; // Complex permutation

        const swaps = PageReordering.reorderPages(pages, ordering);

        expect(pages).toEqual(['b', 'c', 'e', 'a', 'd']); // Complex reordering
      });
    });
  });

  describe('Offset Rewriting', () => {
    describe('Basic offset transformation', () => {
      it('should rewrite offsets for new page layout', () => {
        const offsets = new HugeLongArray([16, 18, 22, 0, 3, 6, 24, 28, 30, 8, 13, 15]);
        const nodeFilter = () => true;
        const pageShift = 3; // page size = 8

        const ordering: PageOrdering = {
          distinctOrdering: [2, 0, 3, 1],
          reverseOrdering: [0, 1, 2, 3], // Page mappings
          pageOffsets: [0, 3, 6, 9, 12], // Range boundaries
          length: 4
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        // Expected transformation (from Java example):
        // Original: [16, 18, 22, 0, 3, 6, 24, 28, 30, 8, 13, 15]
        // New:      [0, 2, 6, 8, 11, 14, 16, 20, 22, 24, 29, 31]
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 2, 6, 8, 11, 14, 16, 20, 22, 24, 29, 31]);
      });

      it('should preserve within-page indices', () => {
        const offsets = new HugeLongArray([16, 17, 18, 19]); // Same page, different indices
        const nodeFilter = () => true;
        const pageShift = 3;

        const ordering: PageOrdering = {
          distinctOrdering: [2], // Page 2 becomes page 0
          reverseOrdering: [0],
          pageOffsets: [0, 4],
          length: 1
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        // Page 2 (16-23) becomes page 0 (0-7)
        // Within-page indices preserved: 0, 1, 2, 3
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 1, 2, 3]);
      });

      it('should handle zero-degree nodes', () => {
        const offsets = new HugeLongArray([16, 18, 22, 0]);
        const degrees = new HugeIntArray([1, 0, 1, 0]); // Nodes 1,3 have degree 0
        const nodeFilter = (nodeId: number) => degrees.get(nodeId) > 0;
        const pageShift = 3;

        const ordering: PageOrdering = {
          distinctOrdering: [2],
          reverseOrdering: [0],
          pageOffsets: [0, 2, 4], // Only connected nodes processed
          length: 1
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        // Connected nodes get rewritten, zero-degree nodes get offset 0
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 0, 6, 0]);
      });
    });

    describe('Bit manipulation correctness', () => {
      it('should handle different page sizes correctly', () => {
        const offsets = new HugeLongArray([48, 49, 50]); // Page 3 in 16-byte pages
        const nodeFilter = () => true;
        const pageShift = 4; // 16-byte pages

        const ordering: PageOrdering = {
          distinctOrdering: [3], // Page 3 becomes page 0
          reverseOrdering: [0],
          pageOffsets: [0, 3],
          length: 1
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        // 48 = 0b110000 = page 3, index 0 → page 0, index 0 = 0
        // 49 = 0b110001 = page 3, index 1 → page 0, index 1 = 1
        // 50 = 0b110010 = page 3, index 2 → page 0, index 2 = 2
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 1, 2]);
      });

      it('should handle large page shifts', () => {
        const offsets = new HugeLongArray([2048, 2049, 2050]); // Page 2 in 1024-byte pages
        const nodeFilter = () => true;
        const pageShift = 10; // 1024-byte pages

        const ordering: PageOrdering = {
          distinctOrdering: [2], // Page 2 becomes page 0
          reverseOrdering: [0],
          pageOffsets: [0, 3],
          length: 1
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        // Preserve lower 10 bits, set upper bits to 0
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 1, 2]);
      });

      it('should handle maximum within-page indices', () => {
        const pageShift = 3; // 8-byte pages
        const maxIndex = (1 << pageShift) - 1; // 7
        const offsets = new HugeLongArray([8 + maxIndex, 16 + maxIndex]); // Max indices in pages 1, 2
        const nodeFilter = () => true;

        const ordering: PageOrdering = {
          distinctOrdering: [1, 2], // Pages 1,2 become pages 0,1
          reverseOrdering: [0, 1],
          pageOffsets: [0, 1, 2],
          length: 2
        };

        PageReordering.rewriteOffsets(offsets, ordering, nodeFilter, pageShift);

        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([maxIndex, 8 + maxIndex]); // Indices preserved
      });
    });
  });

  describe('Full Integration Tests', () => {
    describe('Complete reordering workflow', () => {
      it('should perform full cache optimization correctly', () => {
        // Java example: page size = 8, complete workflow
        const pages = ['r', 'g', 'b', 's'];
        const offsets = new HugeLongArray([16, 18, 22, 0, 3, 6, 24, 28, 30, 8, 13, 15]);
        const degrees = new HugeIntArray(new Array(12).fill(1)); // All connected

        PageReordering.reorder(pages, offsets, degrees);

        // Verify pages reordered: [r, g, b, s] → [b, r, s, g]
        expect(pages).toEqual(['b', 'r', 's', 'g']);

        // Verify offsets rewritten to match new page layout
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 2, 6, 8, 11, 14, 16, 20, 22, 24, 29, 31]);
      });

      it('should handle mixed degree scenarios', () => {
        const pages = ['page0', 'page1', 'page2'];
        const offsets = new HugeLongArray([0, 4, 8, 12, 16, 20]); // 2 nodes per page
        const degrees = new HugeIntArray([1, 0, 1, 1, 0, 1]); // Nodes 1,4 disconnected

        PageReordering.reorder(pages, offsets, degrees);

        // Only connected nodes should influence reordering
        // Disconnected nodes should get offset 0
        expect(offsets.get(1)).toBe(0); // Node 1 (degree 0)
        expect(offsets.get(4)).toBe(0); // Node 4 (degree 0)

        // Connected nodes should have valid rewritten offsets
        expect(offsets.get(0)).toBeGreaterThanOrEqual(0);
        expect(offsets.get(2)).toBeGreaterThanOrEqual(0);
        expect(offsets.get(3)).toBeGreaterThanOrEqual(0);
        expect(offsets.get(5)).toBeGreaterThanOrEqual(0);
      });

      it('should handle single page optimization', () => {
        const pages = ['onlyPage'];
        const offsets = new HugeLongArray([0, 1, 2, 3, 4]);
        const degrees = new HugeIntArray([1, 1, 1, 1, 1]);

        PageReordering.reorder(pages, offsets, degrees);

        // Single page should remain unchanged
        expect(pages).toEqual(['onlyPage']);
        // Offsets should remain the same (all in page 0)
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 1, 2, 3, 4]);
      });

      it('should handle empty graph optimization', () => {
        const pages = ['page0', 'page1'];
        const offsets = new HugeLongArray([0, 8, 16, 24]);
        const degrees = new HugeIntArray([0, 0, 0, 0]); // All disconnected

        PageReordering.reorder(pages, offsets, degrees);

        // Pages might be reordered arbitrarily (no constraints)
        // All offsets should be 0 (zero degree)
        const actualData = Array.from({ length: offsets.size() }, (_, i) => offsets.get(i));
        expect(actualData).toEqual([0, 0, 0, 0]);
      });
    });

    describe('Performance characteristics', () => {
      it('should handle large datasets efficiently', () => {
        const pageCount = 100;
        const nodeCount = 10000;

        // Create large test dataset
        const pages = Array.from({ length: pageCount }, (_, i) => `page${i}`);
        const offsetData = Array.from({ length: nodeCount }, (_, i) => i % (pageCount * 8)); // Distribute across pages
        const offsets = new HugeLongArray(offsetData);
        const degrees = new HugeIntArray(new Array(nodeCount).fill(1));

        const startTime = performance.now();
        PageReordering.reorder(pages, offsets, degrees);
        const endTime = performance.now();

        // Should complete in reasonable time (< 5 seconds for 10K nodes)
        expect(endTime - startTime).toBeLessThan(5000);

        // Verify all offsets were processed
        expect(offsets.size()).toBe(nodeCount);

        // No offset should be negative (except zero degree marker)
        for (let i = 0; i < offsets.size(); i++) {
          expect(offsets.get(i)).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle zero page count', () => {
      const offsets = new HugeLongArray([]);
      const degrees = new HugeIntArray([]);

      const ordering = PageReordering.ordering(offsets, () => true, 0, 3);

      expect(ordering.distinctOrdering).toEqual([]);
      expect(ordering.reverseOrdering).toEqual([]);
      expect(ordering.pageOffsets).toEqual([0]);
      expect(ordering.length).toBe(0);
    });

    it('should handle very large page shifts', () => {
      const offsets = HugeLongArray.of([0, 1048576, 2097152]); // 1MB pages
      const nodeFilter = () => true;
      const pageShift = 20; // 1MB pages

      const ordering = PageReordering.ordering(offsets, nodeFilter, 3, pageShift);

      expect(ordering.distinctOrdering).toEqual([0, 1, 2]);
      expect(ordering.reverseOrdering).toEqual([0, 1, 2]);
    });

    it('should maintain data integrity through complex transformations', () => {
      const pages = ['data_A', 'data_B', 'data_C', 'data_D'];
      const originalPages = [...pages];
      const offsets = new HugeLongArray([24, 26, 30, 8, 10, 14, 16, 18, 22, 0, 2, 6]);
      const degrees = new HugeIntArray(new Array(12).fill(1));

      PageReordering.reorder(pages, offsets, degrees);

      // Verify no data was lost or corrupted
      expect(pages.length).toBe(originalPages.length);
      expect(new Set(pages)).toEqual(new Set(originalPages)); // Same elements, different order

      expect(offsets.size()).toBe(12);

      // All offsets should be valid (non-negative)
      for (let i = 0; i < offsets.size(); i++) {
        expect(offsets.get(i)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
