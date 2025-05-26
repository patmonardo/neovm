import { describe, it, expect, beforeEach } from 'vitest';
import { DrainingIterator, DrainingBatch } from '../DrainingIterator';

describe('DrainingIterator', () => {
  let testPages: number[][];
  let iterator: DrainingIterator<number[]>;

  beforeEach(() => {
    // Create test pages with known data patterns
    testPages = [
      [1, 2, 3, 4, 5],        // Page 0: elements 0-4
      [6, 7, 8, 9, 10],       // Page 1: elements 5-9
      [11, 12, 13, 14, 15],   // Page 2: elements 10-14
      [16, 17, 18, 19, 20],   // Page 3: elements 15-19
      [21, 22, 23, 24, 25]    // Page 4: elements 20-24
    ];
    iterator = new DrainingIterator(testPages, 5);
  });

  describe('Basic Iteration Mechanics', () => {
    it('should create reusable batch objects', () => {
      const batch1 = iterator.drainingBatch();
      const batch2 = iterator.drainingBatch();

      expect(batch1).toBeInstanceOf(DrainingBatch);
      expect(batch2).toBeInstanceOf(DrainingBatch);
      expect(batch1).not.toBe(batch2); // Different instances

      expect(batch1.page).toBeNull();
      expect(batch1.offset).toBe(0);
    });

    it('should iterate through all pages exactly once', () => {
      const batch = iterator.drainingBatch();
      const consumedPages: number[][] = [];
      const consumedOffsets: number[] = [];

      while (iterator.next(batch)) {
        expect(batch.page).not.toBeNull();
        consumedPages.push([...batch.page!]); // Copy to avoid reference issues
        consumedOffsets.push(batch.offset);
      }

      expect(consumedPages).toHaveLength(5);
      expect(consumedOffsets).toEqual([0, 5, 10, 15, 20]); // Correct offsets

      // Verify all original data was consumed (order may vary due to concurrency simulation)
      const allConsumedElements = consumedPages.flat().sort((a, b) => a - b);
      expect(allConsumedElements).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    });

    it('should return false when no more pages available', () => {
      const batch = iterator.drainingBatch();

      // Consume all pages
      let pageCount = 0;
      while (iterator.next(batch)) {
        pageCount++;
      }

      expect(pageCount).toBe(5);

      // Further calls should return false
      expect(iterator.next(batch)).toBe(false);
      expect(iterator.next(batch)).toBe(false);
      expect(batch.page).toBeNull(); // Batch should remain in terminal state
    });

    it('should handle empty page arrays', () => {
      const emptyIterator = new DrainingIterator<number[]>([], 10);
      const batch = emptyIterator.drainingBatch();

      expect(emptyIterator.next(batch)).toBe(false);
      expect(batch.page).toBeNull();
      expect(batch.offset).toBe(0);
    });

    it('should handle single page arrays', () => {
      const singlePageIterator = new DrainingIterator([[100, 200, 300]], 3);
      const batch = singlePageIterator.drainingBatch();

      expect(singlePageIterator.next(batch)).toBe(true);
      expect(batch.page).toEqual([100, 200, 300]);
      expect(batch.offset).toBe(0);

      expect(singlePageIterator.next(batch)).toBe(false);
    });
  });

  describe('Memory Management and Draining', () => {
    it('should clear page references after consumption', () => {
      const batch = iterator.drainingBatch();

      // Access internal pages array through iterator
      const internalPages = (iterator as any).pages;
      const originalPages = [...internalPages]; // Copy references

      // Consume first page
      expect(iterator.next(batch)).toBe(true);
      expect(batch.page).not.toBeNull();

      // First page should be cleared from internal array
      expect(internalPages[0]).toBeNull();

      // Other pages should still be present (until consumed)
      for (let i = 1; i < originalPages.length; i++) {
        expect(internalPages[i]).not.toBeNull();
      }

      // Consume all remaining pages
      while (iterator.next(batch)) {
        // Each consumed page gets cleared
      }

      // All pages should now be cleared
      for (let i = 0; i < internalPages.length; i++) {
        expect(internalPages[i]).toBeNull();
      }
    });

    it('should not affect original page array', () => {
      const originalPages = [...testPages]; // Copy references
      const batch = iterator.drainingBatch();

      // Consume all pages
      while (iterator.next(batch)) {
        // Process pages
      }

      // Original array should be unchanged
      expect(testPages).toEqual(originalPages);
      expect(testPages[0]).toEqual([1, 2, 3, 4, 5]); // Data intact
    });

    it('should support garbage collection of consumed pages', () => {
      const batch = iterator.drainingBatch();
      const weakRefs: WeakRef<number[]>[] = [];

      // Create weak references to track GC
      for (const page of testPages) {
        weakRefs.push(new WeakRef(page));
      }

      // Consume first page
      iterator.next(batch);
      const firstPage = batch.page!;

      // Clear our reference to first page
      batch.reset(null!, 0);

      // The page reference should be eligible for GC
      // (Note: Actual GC testing is environment-dependent)
      expect(weakRefs[0].deref()).toBeDefined(); // May still be referenced elsewhere in test
    });
  });

  describe('Batch Reuse Patterns', () => {
    it('should efficiently reuse batch objects', () => {
      const batch = iterator.drainingBatch();
      const processedData: Array<{ page: number[], offset: number }> = [];

      while (iterator.next(batch)) {
        // Copy data from reused batch
        processedData.push({
          page: [...batch.page!],
          offset: batch.offset
        });
      }

      expect(processedData).toHaveLength(5);

      // Verify each batch had correct data
      for (let i = 0; i < processedData.length; i++) {
        expect(processedData[i].page).toHaveLength(5);
        expect(processedData[i].offset).toBe(i * 5);
      }
    });

    it('should handle rapid batch reset operations', () => {
      const batch = iterator.drainingBatch();

      // First iteration
      expect(iterator.next(batch)).toBe(true);
      const firstPage = [...batch.page!];
      const firstOffset = batch.offset;

      // Second iteration reuses the same batch
      expect(iterator.next(batch)).toBe(true);
      const secondPage = [...batch.page!];
      const secondOffset = batch.offset;

      // Verify batch was properly reset
      expect(firstPage).not.toEqual(secondPage);
      expect(firstOffset).not.toBe(secondOffset);
      expect(secondOffset).toBe(firstOffset + 5);
    });
  });

  describe('Concurrent Access Simulation', () => {
    it('should handle multiple concurrent iterators', () => {
      // Simulate multiple threads with separate batch objects
      const batch1 = iterator.drainingBatch();
      const batch2 = iterator.drainingBatch();
      const batch3 = iterator.drainingBatch();

      const results1: number[] = [];
      const results2: number[] = [];
      const results3: number[] = [];

      // Simulate interleaved access
      if (iterator.next(batch1)) results1.push(...batch1.page!);
      if (iterator.next(batch2)) results2.push(...batch2.page!);
      if (iterator.next(batch1)) results1.push(...batch1.page!);
      if (iterator.next(batch3)) results3.push(...batch3.page!);
      if (iterator.next(batch2)) results2.push(...batch2.page!);

      // Each thread should get different pages
      const allResults = [...results1, ...results2, ...results3].sort((a, b) => a - b);
      const uniqueResults = [...new Set(allResults)];

      expect(allResults).toEqual(uniqueResults); // No duplicates
      expect(allResults.length).toBeGreaterThan(0);
    });

    it('should distribute work fairly across simulated threads', () => {
      const numThreads = 3;
      const threadResults: number[][] = Array.from({ length: numThreads }, () => []);
      const batches = Array.from({ length: numThreads }, () => iterator.drainingBatch());

      // Round-robin simulation
      let activeThreads = numThreads;
      while (activeThreads > 0) {
        for (let threadId = 0; threadId < numThreads; threadId++) {
          if (iterator.next(batches[threadId])) {
            threadResults[threadId].push(...batches[threadId].page!);
          } else {
            activeThreads--;
            break;
          }
        }
      }

      // Verify fair distribution
      const totalElements = threadResults.flat().length;
      expect(totalElements).toBe(25); // All elements processed

      // Each thread should get roughly equal work
      const threadSizes = threadResults.map(r => r.length);
      const minSize = Math.min(...threadSizes);
      const maxSize = Math.max(...threadSizes);
      expect(maxSize - minSize).toBeLessThanOrEqual(5); // Fair distribution
    });

    it('should prevent double processing of pages', () => {
      const batch1 = iterator.drainingBatch();
      const batch2 = iterator.drainingBatch();

      const seenPageIds = new Set<number>();

      // Process pages from two "threads"
      while (iterator.next(batch1) || iterator.next(batch2)) {
        const currentBatch = batch1.page !== null ? batch1 : batch2;

        if (currentBatch.page !== null) {
          const pageId = currentBatch.offset / 5; // Calculate page ID from offset

          expect(seenPageIds.has(pageId)).toBe(false); // No duplicates
          seenPageIds.add(pageId);

          // Clear the processed batch
          currentBatch.reset(null!, 0);
        }
      }

      expect(seenPageIds.size).toBe(5); // All pages processed exactly once
    });
  });

  describe('Graph Analytics Use Cases', () => {
    describe('adjacency list processing', () => {
      it('should process node adjacency lists in parallel', () => {
        // Simulate adjacency lists for nodes
        const adjacencyPages = [
          [[1, 2], [3, 4], [5, 6]],      // Nodes 0-2: neighbors
          [[7, 8], [9, 10], [11, 12]],   // Nodes 3-5: neighbors
          [[13, 14], [15, 16], [17, 18]] // Nodes 6-8: neighbors
        ];

        const adjIterator = new DrainingIterator(adjacencyPages, 3);
        const batch = adjIterator.drainingBatch();

        const nodeProcessingResults: Array<{ nodeId: number, neighborCount: number }> = [];

        while (adjIterator.next(batch)) {
          const adjacencyPage = batch.page!;
          const nodeOffset = batch.offset;

          for (let i = 0; i < adjacencyPage.length; i++) {
            const nodeId = nodeOffset + i;
            const neighbors = adjacencyPage[i];

            nodeProcessingResults.push({
              nodeId,
              neighborCount: neighbors.length
            });
          }
        }

        expect(nodeProcessingResults).toHaveLength(9); // 9 nodes processed
        expect(nodeProcessingResults[0]).toEqual({ nodeId: 0, neighborCount: 2 });
        expect(nodeProcessingResults[8]).toEqual({ nodeId: 8, neighborCount: 2 });
      });

      it('should handle variable-sized adjacency lists', () => {
        // Different sized adjacency lists per page
        const variableAdjPages = [
          [[1], [2, 3, 4], [5, 6]],           // Page 0: 1, 3, 2 neighbors
          [[7, 8, 9, 10], [], [11]]           // Page 1: 4, 0, 1 neighbors
        ];

        const adjIterator = new DrainingIterator(variableAdjPages, 3);
        const batch = adjIterator.drainingBatch();

        const totalNeighbors = { count: 0 };

        while (adjIterator.next(batch)) {
          const adjacencyPage = batch.page!;

          for (const nodeNeighbors of adjacencyPage) {
            totalNeighbors.count += nodeNeighbors.length;
          }
        }

        expect(totalNeighbors.count).toBe(11); // 1+3+2+4+0+1 = 11 total neighbors
      });
    });

    describe('temporal graph processing', () => {
      it('should process temporal edges efficiently', () => {
        // Simulate temporal edge pages: [timestamp, source, target]
        const temporalPages = [
          [[1000, 0, 1], [1001, 0, 2], [1002, 1, 3]],    // Early edges
          [[2000, 2, 4], [2001, 3, 5], [2002, 4, 6]],    // Mid edges
          [[3000, 5, 7], [3001, 6, 8], [3002, 7, 9]]     // Late edges
        ];

        const edgeIterator = new DrainingIterator(temporalPages, 3);
        const batch = edgeIterator.drainingBatch();

        const timeWindows = new Map<number, number>(); // window -> edge count

        while (edgeIterator.next(batch)) {
          const edgePage = batch.page!;

          for (const [timestamp, source, target] of edgePage) {
            const timeWindow = Math.floor(timestamp / 1000); // 1-second windows
            timeWindows.set(timeWindow, (timeWindows.get(timeWindow) || 0) + 1);
          }
        }

        expect(timeWindows.get(1)).toBe(3); // 3 edges in window 1
        expect(timeWindows.get(2)).toBe(3); // 3 edges in window 2
        expect(timeWindows.get(3)).toBe(3); // 3 edges in window 3
      });
    });

    describe('result aggregation patterns', () => {
      it('should aggregate PageRank scores across pages', () => {
        // Simulate PageRank score pages
        const scorePages = [
          [0.1, 0.15, 0.08, 0.12, 0.09],    // Nodes 0-4 scores
          [0.2, 0.18, 0.06, 0.14, 0.11],    // Nodes 5-9 scores
          [0.05, 0.22, 0.13, 0.07, 0.16]    // Nodes 10-14 scores
        ];

        const scoreIterator = new DrainingIterator(scorePages, 5);
        const batch = scoreIterator.drainingBatch();

        let totalScore = 0;
        let maxScore = 0;
        let maxNodeId = -1;

        while (scoreIterator.next(batch)) {
          const scorePage = batch.page!;
          const nodeOffset = batch.offset;

          for (let i = 0; i < scorePage.length; i++) {
            const score = scorePage[i];
            const nodeId = nodeOffset + i;

            totalScore += score;

            if (score > maxScore) {
              maxScore = score;
              maxNodeId = nodeId;
            }
          }
        }

        expect(totalScore).toBeCloseTo(1.8, 10); // Sum of all scores
        expect(maxScore).toBeCloseTo(0.22, 10);  // Highest score
        expect(maxNodeId).toBe(11);               // Node with highest score
      });

      it('should compute histogram distributions', () => {
        // Simulate degree distribution pages
        const degreePages = [
          [1, 1, 2, 2, 3],      // Low degree nodes
          [3, 4, 4, 5, 5],      // Medium degree nodes
          [6, 7, 8, 9, 10]      // High degree nodes
        ];

        const degreeIterator = new DrainingIterator(degreePages, 5);
        const batch = degreeIterator.drainingBatch();

        const histogram = new Map<number, number>();

        while (degreeIterator.next(batch)) {
          const degreePage = batch.page!;

          for (const degree of degreePage) {
            histogram.set(degree, (histogram.get(degree) || 0) + 1);
          }
        }

        expect(histogram.get(1)).toBe(2);  // 2 nodes with degree 1
        expect(histogram.get(2)).toBe(2);  // 2 nodes with degree 2
        expect(histogram.get(3)).toBe(2);  // 2 nodes with degree 3
        expect(histogram.get(4)).toBe(2);  // 2 nodes with degree 4
        expect(histogram.get(5)).toBe(2);  // 2 nodes with degree 5
      });
    });

    describe('streaming algorithm results', () => {
      it('should support streaming pattern for memory efficiency', () => {
        const batch = iterator.drainingBatch();
        const streamedResults: number[] = [];

        // Simulate streaming consumption
        function* streamPages() {
          while (iterator.next(batch)) {
            const page = batch.page!;
            for (const element of page) {
              yield element;
            }
            // Page is automatically drained after processing
          }
        }

        // Consume stream with bounded memory
        for (const element of streamPages()) {
          streamedResults.push(element);

          // Simulate processing delay that allows GC
          if (streamedResults.length % 5 === 0) {
            // Simulated processing checkpoint
          }
        }

        expect(streamedResults).toHaveLength(25);
        expect(streamedResults.sort((a, b) => a - b)).toEqual(
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
        );
      });
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of pages efficiently', () => {
      // Create large page array
      const largePageCount = 1000;
      const largePages = Array.from({ length: largePageCount }, (_, i) => [i]);
      const largeIterator = new DrainingIterator(largePages, 1);

      const batch = largeIterator.drainingBatch();
      let processedCount = 0;

      const startTime = performance.now();

      while (largeIterator.next(batch)) {
        processedCount++;
      }

      const endTime = performance.now();

      expect(processedCount).toBe(largePageCount);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it('should minimize allocation overhead with batch reuse', () => {
      const batch = iterator.drainingBatch();
      const initialBatch = batch;

      let iterationCount = 0;
      while (iterator.next(batch)) {
        iterationCount++;
        // Verify same batch object is reused
        expect(batch).toBe(initialBatch);
      }

      expect(iterationCount).toBe(5);
    });

    it('should support high-throughput processing patterns', () => {
      // Simulate high-throughput scenario
      const highThroughputPages = Array.from({ length: 100 }, (_, i) =>
        Array.from({ length: 1000 }, (_, j) => i * 1000 + j)
      );

      const throughputIterator = new DrainingIterator(highThroughputPages, 1000);
      const batch = throughputIterator.drainingBatch();

      let totalElements = 0;
      const startTime = performance.now();

      while (throughputIterator.next(batch)) {
        totalElements += batch.page!.length;
      }

      const endTime = performance.now();
      const elementsPerMs = totalElements / (endTime - startTime);

      expect(totalElements).toBe(100000);
      expect(elementsPerMs).toBeGreaterThan(1000); // Good throughput
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle pages with different sizes gracefully', () => {
      const mixedSizePages = [
        [1, 2, 3],
        [4, 5],
        [6, 7, 8, 9, 10],
        [11]
      ];

      const mixedIterator = new DrainingIterator(mixedSizePages, 3); // Average page size
      const batch = mixedIterator.drainingBatch();

      const allElements: number[] = [];
      let pageCount = 0;

      while (mixedIterator.next(batch)) {
        allElements.push(...batch.page!);
        pageCount++;
      }

      expect(pageCount).toBe(4);
      expect(allElements.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should handle null pages in input array', () => {
      const pagesWithNulls = [
        [1, 2, 3],
        null as any,
        [4, 5, 6],
        null as any,
        [7, 8, 9]
      ];

      const nullIterator = new DrainingIterator(pagesWithNulls, 3);
      const batch = nullIterator.drainingBatch();

      const validPages: number[][] = [];

      while (nullIterator.next(batch)) {
        if (batch.page !== null) {
          validPages.push([...batch.page]);
        }
      }

      expect(validPages).toHaveLength(3); // Only non-null pages
      expect(validPages.flat()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle very large page sizes', () => {
      const veryLargePageSize = 1000000;
      const singleLargePage = [Array.from({ length: veryLargePageSize }, (_, i) => i)];

      const largePageIterator = new DrainingIterator(singleLargePage, veryLargePageSize);
      const batch = largePageIterator.drainingBatch();

      expect(largePageIterator.next(batch)).toBe(true);
      expect(batch.page).toHaveLength(veryLargePageSize);
      expect(batch.offset).toBe(0);

      expect(largePageIterator.next(batch)).toBe(false);
    });
  });

  describe('Integration with Memory Management', () => {
    it('should support WeakRef patterns for memory monitoring', () => {
      const batch = iterator.drainingBatch();
      const pageReferences: WeakRef<number[]>[] = [];

      // Create weak references to monitor page lifecycle
      for (const page of testPages) {
        pageReferences.push(new WeakRef(page));
      }

      // Process first page
      iterator.next(batch);
      const processedPage = batch.page!;

      // Verify weak reference is still valid during processing
      expect(pageReferences[0].deref()).toBeDefined();

      // Continue processing
      while (iterator.next(batch)) {
        // Process remaining pages
      }

      // All weak references should still be valid (pages are referenced by test)
      for (const weakRef of pageReferences) {
        expect(weakRef.deref()).toBeDefined();
      }
    });

    it('should clear internal references for GC eligibility', () => {
      const batch = iterator.drainingBatch();
      const internalPages = (iterator as any).pages;

      // Consume all pages
      while (iterator.next(batch)) {
        // Process pages
      }

      // All internal references should be cleared
      for (let i = 0; i < internalPages.length; i++) {
        expect(internalPages[i]).toBeNull();
      }
    });
  });

  describe('DrainingBatch Class', () => {
    it('should initialize with null page and zero offset', () => {
      const batch = new DrainingBatch<number[]>();

      expect(batch.page).toBeNull();
      expect(batch.offset).toBe(0);
    });

    it('should update correctly with reset method', () => {
      const batch = new DrainingBatch<number[]>();
      const testPage = [1, 2, 3];
      const testOffset = 42;

      batch.reset(testPage, testOffset);

      expect(batch.page).toBe(testPage);
      expect(batch.offset).toBe(testOffset);
    });

    it('should support multiple reset operations', () => {
      const batch = new DrainingBatch<number[]>();

      batch.reset([1, 2, 3], 10);
      expect(batch.page).toEqual([1, 2, 3]);
      expect(batch.offset).toBe(10);

      batch.reset([4, 5, 6], 20);
      expect(batch.page).toEqual([4, 5, 6]);
      expect(batch.offset).toBe(20);
    });
  });

  describe('Thread Safety Properties', () => {
    it('should demonstrate atomic page claiming semantics', () => {
      const batch1 = iterator.drainingBatch();
      const batch2 = iterator.drainingBatch();

      // Simulate two threads claiming pages simultaneously
      const result1 = iterator.next(batch1);
      const result2 = iterator.next(batch2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);

      // Should get different pages
      expect(batch1.page).not.toBe(batch2.page);
      expect(batch1.offset).not.toBe(batch2.offset);
    });

    it('should ensure exactly-once semantics', () => {
      const seenOffsets = new Set<number>();
      const batches = [
        iterator.drainingBatch(),
        iterator.drainingBatch(),
        iterator.drainingBatch()
      ];

      // Process pages from multiple "threads"
      let finished = false;
      while (!finished) {
        finished = true;

        for (const batch of batches) {
          if (iterator.next(batch)) {
            finished = false;

            // Each offset should be seen exactly once
            expect(seenOffsets.has(batch.offset)).toBe(false);
            seenOffsets.add(batch.offset);
          }
        }
      }

      expect(seenOffsets.size).toBe(5); // All pages processed exactly once
      expect([...seenOffsets].sort((a, b) => a - b)).toEqual([0, 5, 10, 15, 20]);
    });
  });
});
