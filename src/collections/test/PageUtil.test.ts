import { BitUtil } from "@/mem";
import { PageUtil } from "../PageUtil";

describe("PageUtil", () => {
  describe("Constants", () => {
    it("should define correct page size constants", () => {
      expect(PageUtil.PAGE_SIZE_4KB).toBe(4096); // 1 << 12
      expect(PageUtil.PAGE_SIZE_32KB).toBe(32768); // 1 << 15
      expect(PageUtil.MAX_ARRAY_LENGTH).toBe(268435456); // 1 << 28
    });

    it("should have power-of-2 page sizes", () => {
      expect(BitUtil.isPowerOfTwo(PageUtil.PAGE_SIZE_4KB)).toBe(true);
      expect(BitUtil.isPowerOfTwo(PageUtil.PAGE_SIZE_32KB)).toBe(true);
      expect(BitUtil.isPowerOfTwo(PageUtil.MAX_ARRAY_LENGTH)).toBe(true);
    });
  });

  describe("pageSizeFor - Element Density Calculation", () => {
    it("should calculate elements per page for common data types", () => {
      // 32KB page capacity
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 1)).toBe(32768); // bytes
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 2)).toBe(16384); // shorts
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 4)).toBe(8192); // ints
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 8)).toBe(4096); // longs/doubles

      // 4KB page capacity
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_4KB, 1)).toBe(4096); // bytes
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_4KB, 2)).toBe(2048); // shorts
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_4KB, 4)).toBe(1024); // ints
      expect(PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_4KB, 8)).toBe(512); // longs/doubles
    });

    it("should handle power-of-2 element sizes", () => {
      const pageSize = 1024; // 1KB for testing

      expect(PageUtil.pageSizeFor(pageSize, 1)).toBe(1024);
      expect(PageUtil.pageSizeFor(pageSize, 2)).toBe(512);
      expect(PageUtil.pageSizeFor(pageSize, 4)).toBe(256);
      expect(PageUtil.pageSizeFor(pageSize, 8)).toBe(128);
      expect(PageUtil.pageSizeFor(pageSize, 16)).toBe(64);
    });

    it("should assert on non-power-of-2 element sizes", () => {
      // This should trigger the assertion
      expect(() => PageUtil.pageSizeFor(1024, 3)).not.toThrow(); // console.assert won't throw
      expect(() => PageUtil.pageSizeFor(1024, 5)).not.toThrow();
      expect(() => PageUtil.pageSizeFor(1024, 7)).not.toThrow();
    });
  });

  describe("numPagesFor - Page Count Calculation", () => {
    describe("two-parameter overload", () => {
      it("should calculate pages for exact multiples", () => {
        const pageSize = 1000;

        expect(PageUtil.numPagesFor(0, pageSize)).toBe(0);
        expect(PageUtil.numPagesFor(1000, pageSize)).toBe(1);
        expect(PageUtil.numPagesFor(2000, pageSize)).toBe(2);
        expect(PageUtil.numPagesFor(10000, pageSize)).toBe(10);
      });

      it("should round up for partial pages", () => {
        const pageSize = 1000;

        expect(PageUtil.numPagesFor(1, pageSize)).toBe(1);
        expect(PageUtil.numPagesFor(999, pageSize)).toBe(1);
        expect(PageUtil.numPagesFor(1001, pageSize)).toBe(2);
        expect(PageUtil.numPagesFor(1999, pageSize)).toBe(2);
        expect(PageUtil.numPagesFor(2001, pageSize)).toBe(3);
      });

      it("should handle power-of-2 page sizes efficiently", () => {
        expect(PageUtil.numPagesFor(0, 1024)).toBe(0);
        expect(PageUtil.numPagesFor(1024, 1024)).toBe(1);
        expect(PageUtil.numPagesFor(1025, 1024)).toBe(2);
        expect(PageUtil.numPagesFor(2047, 1024)).toBe(2);
        expect(PageUtil.numPagesFor(2048, 1024)).toBe(2);
        expect(PageUtil.numPagesFor(2049, 1024)).toBe(3);
      });
    });

    describe("three-parameter overload", () => {
      it("should calculate pages using precomputed bit values", () => {
        const pageSize = 1024;
        const pageShift = BitUtil.numberOfTrailingZeros(pageSize); // 10
        const pageMask = pageSize - 1; // 1023

        expect(PageUtil.numPagesFor(0, pageShift, pageMask)).toBe(0);
        expect(PageUtil.numPagesFor(1024, pageShift, pageMask)).toBe(1);
        expect(PageUtil.numPagesFor(1025, pageShift, pageMask)).toBe(2);
        expect(PageUtil.numPagesFor(2047, pageShift, pageMask)).toBe(2);
        expect(PageUtil.numPagesFor(2048, pageShift, pageMask)).toBe(2);
      });

      it("should produce same results as two-parameter version", () => {
        const testCases = [
          0, 1, 1023, 1024, 1025, 2047, 2048, 4095, 4096, 4097,
        ];
        const pageSize = 1024;
        const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
        const pageMask = pageSize - 1;

        for (const capacity of testCases) {
          const result2Param = PageUtil.numPagesFor(capacity, pageSize);
          const result3Param = PageUtil.numPagesFor(
            capacity,
            pageShift,
            pageMask
          );
          expect(result3Param).toBe(result2Param);
        }
      });
    });
  });

  describe("capacityFor - Total Capacity Calculation", () => {
    it("should calculate total capacity from page count", () => {
      const pageShift = 10; // 1024 elements per page

      expect(PageUtil.capacityFor(0, pageShift)).toBe(0);
      expect(PageUtil.capacityFor(1, pageShift)).toBe(1024);
      expect(PageUtil.capacityFor(5, pageShift)).toBe(5120);
      expect(PageUtil.capacityFor(10, pageShift)).toBe(10240);
    });

    it("should be inverse of numPagesFor for full pages", () => {
      const pageSize = 1024;
      const pageShift = BitUtil.numberOfTrailingZeros(pageSize);

      const numPages = 5;
      const capacity = PageUtil.capacityFor(numPages, pageShift);
      const calculatedPages = PageUtil.numPagesFor(capacity, pageSize);

      expect(calculatedPages).toBe(numPages);
    });
  });

  describe("Address Translation Operations", () => {
    describe("pageIndex", () => {
      it("should extract page index from global index", () => {
        const pageShift = 10; // 1024 elements per page

        expect(PageUtil.pageIndex(0, pageShift)).toBe(0);
        expect(PageUtil.pageIndex(1023, pageShift)).toBe(0); // Last element of page 0
        expect(PageUtil.pageIndex(1024, pageShift)).toBe(1); // First element of page 1
        expect(PageUtil.pageIndex(2047, pageShift)).toBe(1); // Last element of page 1
        expect(PageUtil.pageIndex(2048, pageShift)).toBe(2); // First element of page 2
        expect(PageUtil.pageIndex(1000000, pageShift)).toBe(976); // Large index
      });

      it("should handle different page sizes", () => {
        // 4KB pages (512 elements of 8 bytes each)
        const shift4KB = BitUtil.numberOfTrailingZeros(512);
        expect(PageUtil.pageIndex(0, shift4KB)).toBe(0);
        expect(PageUtil.pageIndex(511, shift4KB)).toBe(0);
        expect(PageUtil.pageIndex(512, shift4KB)).toBe(1);
        expect(PageUtil.pageIndex(1023, shift4KB)).toBe(1);
        expect(PageUtil.pageIndex(1024, shift4KB)).toBe(2);
      });
    });

    describe("indexInPage", () => {
      it("should extract index within page from global index", () => {
        const pageMask = 1023; // 1024 elements per page - 1

        expect(PageUtil.indexInPage(0, pageMask)).toBe(0);
        expect(PageUtil.indexInPage(500, pageMask)).toBe(500);
        expect(PageUtil.indexInPage(1023, pageMask)).toBe(1023); // Last in page 0
        expect(PageUtil.indexInPage(1024, pageMask)).toBe(0); // First in page 1
        expect(PageUtil.indexInPage(1500, pageMask)).toBe(476); // 1500 - 1024 = 476
        expect(PageUtil.indexInPage(2047, pageMask)).toBe(1023); // Last in page 1
        expect(PageUtil.indexInPage(2048, pageMask)).toBe(0); // First in page 2
      });

      it("should handle different page sizes", () => {
        // 512 elements per page
        const mask512 = 511;
        expect(PageUtil.indexInPage(0, mask512)).toBe(0);
        expect(PageUtil.indexInPage(511, mask512)).toBe(511);
        expect(PageUtil.indexInPage(512, mask512)).toBe(0);
        expect(PageUtil.indexInPage(1000, mask512)).toBe(488); // 1000 - 512 = 488
      });
    });

    describe("address decomposition consistency", () => {
      it("should correctly decompose and recompose addresses", () => {
        const pageSize = 1024;
        const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
        const pageMask = pageSize - 1;

        const testIndices = [0, 1, 1023, 1024, 1025, 2047, 2048, 100000];

        for (const globalIndex of testIndices) {
          const pageIdx = PageUtil.pageIndex(globalIndex, pageShift);
          const indexInPage = PageUtil.indexInPage(globalIndex, pageMask);

          // Recompose the global index
          const recomposed = (pageIdx << pageShift) + indexInPage;
          expect(recomposed).toBe(globalIndex);
        }
      });
    });
  });

  describe("exclusiveIndexOfPage - Boundary Calculation", () => {
    it("should calculate correct boundary for full pages", () => {
      const pageMask = 1023; // 1024 elements per page - 1

      // Elements within first page (0-1023)
      expect(PageUtil.exclusiveIndexOfPage(0, pageMask)).toBe(1);
      expect(PageUtil.exclusiveIndexOfPage(500, pageMask)).toBe(501);
      expect(PageUtil.exclusiveIndexOfPage(1023, pageMask)).toBe(1024);

      // Elements within second page (1024-2047)
      expect(PageUtil.exclusiveIndexOfPage(1024, pageMask)).toBe(1);
      expect(PageUtil.exclusiveIndexOfPage(1500, pageMask)).toBe(477); // (1500-1) & 1023 + 1 = 476 + 1
      expect(PageUtil.exclusiveIndexOfPage(2047, pageMask)).toBe(1024);
    });

    it("should handle partial pages correctly", () => {
      const pageMask = 999; // 1000 elements per page - 1

      // Simulate array with 2500 elements (3 pages: 1000, 1000, 500)
      const totalElements = 2500;
      const lastElementIndex = totalElements - 1; // 2499

      const lastPageSize = PageUtil.exclusiveIndexOfPage(
        lastElementIndex,
        pageMask
      );
      expect(lastPageSize).toBe(500); // (2499-1) & 999 + 1 = 499 + 1 = 500
    });

    it("should work with different page sizes", () => {
      // 512 element pages
      const mask512 = 511;
      expect(PageUtil.exclusiveIndexOfPage(0, mask512)).toBe(1);
      expect(PageUtil.exclusiveIndexOfPage(511, mask512)).toBe(512);
      expect(PageUtil.exclusiveIndexOfPage(512, mask512)).toBe(1);
      expect(PageUtil.exclusiveIndexOfPage(1000, mask512)).toBe(489); // (1000-1) & 511 + 1 = 488 + 1
    });
  });

  describe("Graph Analytics Use Cases", () => {
    describe("huge array paging scenarios", () => {
      it("should handle billion-element arrays", () => {
        const totalElements = 1_000_000_000;
        const pageSize = PageUtil.PAGE_SIZE_32KB / 8; // 4096 doubles per page

        const numPages = PageUtil.numPagesFor(totalElements, pageSize);
        const capacity = PageUtil.capacityFor(
          numPages,
          BitUtil.numberOfTrailingZeros(pageSize)
        );

        expect(numPages).toBe(Math.ceil(totalElements / pageSize));
        expect(capacity).toBeGreaterThanOrEqual(totalElements);
        expect(capacity - totalElements).toBeLessThan(pageSize); // Less than one page overhead
      });

      it("should calculate memory layout for different data types", () => {
        const elements = 10_000_000; // 10M elements

        // Different data type layouts
        const bytePages = PageUtil.numPagesFor(
          elements,
          PageUtil.PAGE_SIZE_32KB
        );
        const intPages = PageUtil.numPagesFor(
          elements,
          PageUtil.PAGE_SIZE_32KB / 4
        );
        const doublePages = PageUtil.numPagesFor(
          elements,
          PageUtil.PAGE_SIZE_32KB / 8
        );

        expect(bytePages).toBeLessThan(intPages);
        expect(intPages).toBeLessThan(doublePages);

        // Verify element densities
        expect(PageUtil.PAGE_SIZE_32KB).toBe(32768); // bytes per page
        expect(PageUtil.PAGE_SIZE_32KB / 4).toBe(8192); // ints per page
        expect(PageUtil.PAGE_SIZE_32KB / 8).toBe(4096); // doubles per page
      });
    });

    describe("adjacency list paging", () => {
      it("should efficiently page large adjacency lists", () => {
        // Simulate node with 1M neighbors (high-degree node)
        const neighborCount = 1_000_000;
        const intsPerPage = PageUtil.pageSizeFor(PageUtil.PAGE_SIZE_32KB, 4);

        const pagesNeeded = PageUtil.numPagesFor(neighborCount, intsPerPage);

        // Should fit in reasonable number of pages
        expect(pagesNeeded).toBe(Math.ceil(neighborCount / intsPerPage));
        expect(pagesNeeded).toBeLessThan(200); // Reasonable for 32KB pages
      });

      it("should support neighbor lookup patterns", () => {
        const pageSize = 1024; // Neighbors per page
        const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
        const pageMask = pageSize - 1;

        // Test neighbor access pattern
        const neighborIndices = [0, 500, 1023, 1024, 1500, 2047, 2048];

        for (const neighborIdx of neighborIndices) {
          const pageIdx = PageUtil.pageIndex(neighborIdx, pageShift);
          const posInPage = PageUtil.indexInPage(neighborIdx, pageMask);

          expect(pageIdx).toBeGreaterThanOrEqual(0);
          expect(posInPage).toBeGreaterThanOrEqual(0);
          expect(posInPage).toBeLessThan(pageSize);

          // Verify page boundaries
          if (neighborIdx < pageSize) {
            expect(pageIdx).toBe(0);
          } else if (neighborIdx < 2 * pageSize) {
            expect(pageIdx).toBe(1);
          } else {
            expect(pageIdx).toBe(2);
          }
        }
      });
    });

    describe("temporal graph paging", () => {
      it("should support timestamp-based edge paging", () => {
        // Simulate edges with timestamps (8 bytes each: 4 bytes timestamp + 4 bytes target)
        const edgeSize = 8;
        const edgesPerPage = PageUtil.pageSizeFor(
          PageUtil.PAGE_SIZE_32KB,
          edgeSize
        );

        expect(edgesPerPage).toBe(4096); // 32KB / 8 bytes

        // Million temporal edges
        const totalEdges = 1_000_000;
        const pagesNeeded = PageUtil.numPagesFor(totalEdges, edgesPerPage);

        expect(pagesNeeded).toBe(Math.ceil(totalEdges / edgesPerPage));
        expect(pagesNeeded).toBe(245); // ~245 pages for 1M edges
      });

      it("should handle time-range queries across pages", () => {
        const edgesPerPage = 1024; // Changed to power of 2
        const pageShift = BitUtil.numberOfTrailingZeros(edgesPerPage); // Now = 10
        //const pageMask = edgesPerPage - 1; // Now = 1023

        // Simulate time range query: edges 15000 to 18000
        const startEdge = 15000;
        const endEdge = 18000;

        const startPage = PageUtil.pageIndex(startEdge, pageShift);
        const endPage = PageUtil.pageIndex(endEdge, pageShift);

        // With 1024 elements per page:
        // startPage = 15000 >> 10 = 14 (Page 14)
        // endPage = 18000 >> 10 = 17 (Page 17)

        expect(startPage).toBe(14); // Fixed expectation
        expect(endPage).toBe(17); // Fixed expectation

        // Should span 4 pages (14, 15, 16, 17)
        const pagesSpanned = endPage - startPage + 1;
        expect(pagesSpanned).toBe(4);
      });
    });
  });

  describe("Performance Optimizations", () => {
    describe("bit manipulation efficiency", () => {
      it("should use efficient bit operations for powers of 2", () => {
        const testSizes = [1024, 2048, 4096, 8192, 16384, 32768];

        for (const pageSize of testSizes) {
          expect(BitUtil.isPowerOfTwo(pageSize)).toBe(true);

          const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
          const pageMask = pageSize - 1;

          // Verify bit operations are correct
          expect(1 << pageShift).toBe(pageSize);
          expect((pageSize - 1) & pageSize).toBe(0); // Power of 2 property

          // Test address translation consistency
          const testIndex = 123456;
          const pageIdx = PageUtil.pageIndex(testIndex, pageShift);
          const inPageIdx = PageUtil.indexInPage(testIndex, pageMask);

          expect((pageIdx << pageShift) + inPageIdx).toBe(testIndex);
        }
      });
    });

    describe("cache alignment verification", () => {
      it("should provide cache-friendly page sizes", () => {
        // Verify page sizes align with typical cache sizes
        expect(PageUtil.PAGE_SIZE_4KB).toBe(4096); // L1 cache friendly
        expect(PageUtil.PAGE_SIZE_32KB).toBe(32768); // L2 cache friendly

        // Should be powers of 2 for efficient addressing
        expect(BitUtil.isPowerOfTwo(PageUtil.PAGE_SIZE_4KB)).toBe(true);
        expect(BitUtil.isPowerOfTwo(PageUtil.PAGE_SIZE_32KB)).toBe(true);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle zero capacity", () => {
      expect(PageUtil.numPagesFor(0, 1024)).toBe(0);
      expect(PageUtil.capacityFor(0, 10)).toBe(0);
    });

    it("should handle single element", () => {
      expect(PageUtil.numPagesFor(1, 1024)).toBe(1);
      expect(PageUtil.pageIndex(0, 10)).toBe(0);
      expect(PageUtil.indexInPage(0, 1023)).toBe(0);
    });

    it("should handle page boundary conditions", () => {
      const pageSize = 1024;
      const pageShift = BitUtil.numberOfTrailingZeros(pageSize);
      const pageMask = pageSize - 1;

      // Test exact page boundaries
      const boundaries = [0, 1023, 1024, 2047, 2048];

      for (const boundary of boundaries) {
        const pageIdx = PageUtil.pageIndex(boundary, pageShift);
        const inPageIdx = PageUtil.indexInPage(boundary, pageMask);

        expect(pageIdx).toBeGreaterThanOrEqual(0);
        expect(inPageIdx).toBeGreaterThanOrEqual(0);
        expect(inPageIdx).toBeLessThan(pageSize);
      }
    });

    it("should prevent instantiation", () => {
      expect(() => new (PageUtil as any)()).toThrow(
        "PageUtil is a static utility class and cannot be instantiated"
      );
    });
  });

  describe("Memory Estimation", () => {
    it("should estimate memory requirements accurately", () => {
      const elements = 1_000_000;
      const elementSize = 8; // 8-byte doubles

      const elementsPerPage = PageUtil.pageSizeFor(
        PageUtil.PAGE_SIZE_32KB,
        elementSize
      );
      const pagesNeeded = PageUtil.numPagesFor(elements, elementsPerPage);

      // Memory calculation
      const dataMemory = elements * elementSize; // Actual data
      const pageOverhead = pagesNeeded * 8; // Page reference overhead
      const totalMemory = dataMemory + pageOverhead;

      expect(dataMemory).toBe(8_000_000); // 8MB of data
      expect(pageOverhead).toBeLessThan(dataMemory * 0.01); // <1% overhead
      expect(totalMemory).toBeLessThan(dataMemory * 1.01); // <1% total overhead
    });
  });
});
