import { PagedDataStructure } from '../PagedDataStructure';
import { PageAllocator } from '../PageAllocator';

describe('PagedDataStructure - Constructor and Core Functionality', () => {

  /**
   * Test 1: Constructor Basic Initialization
   * Test the fundamental constructor behavior
   */
  test('constructor initializes correctly with valid parameters', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 1: Basic Initialization');
    console.log('============================================');

    // Create a simple allocator
    const pageSize = 1024;
    const bytesPerPage = pageSize * 4; // Int32Array
    const factory = PageAllocator.of(
      pageSize,
      bytesPerPage,
      () => new Int32Array(pageSize),
      []
    );
    const allocator = factory.newAllocator();

    console.log(`📏 Page size: ${pageSize} elements`);
    console.log(`💾 Bytes per page: ${bytesPerPage} bytes`);

    // Test constructor with different sizes
    const testSizes = [0, 1, 100, 1000, 1024, 1025, 2048];

    for (const size of testSizes) {
      console.log(`\n🔬 Testing size: ${size}`);

      const structure = new PagedDataStructure(size, allocator);

      // Verify basic properties
      expect(structure.size()).toBe(size);
      expect(structure.capacity()).toBeGreaterThanOrEqual(size);

      const expectedPages = Math.ceil(size / pageSize);
      const expectedCapacity = expectedPages * pageSize;

      console.log(`  Size: ${structure.size()}`);
      console.log(`  Capacity: ${structure.capacity()}`);
      console.log(`  Expected pages: ${expectedPages}`);
      console.log(`  Expected capacity: ${expectedCapacity}`);

      // Clean up
      structure.release();
    }

    console.log('\n✅ Constructor handles all valid sizes correctly');
  });

  /**
   * Test 2: Constructor with Different Page Sizes
   * Test how constructor behaves with various page configurations
   */
  test('constructor works with different page sizes', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 2: Different Page Sizes');
    console.log('===========================================');

    const pageSizes = [64, 128, 256, 512, 1024, 2048];
    const targetSize = 1000;

    console.log(`🎯 Target size: ${targetSize} elements`);
    console.log('\nPage Size\tPages Needed\tCapacity\tWaste\tEfficiency');
    console.log('---------\t------------\t--------\t-----\t----------');

    for (const pageSize of pageSizes) {
      const factory = PageAllocator.of(
        pageSize,
        pageSize * 8, // 8 bytes per element
        () => new Float64Array(pageSize),
        []
      );
      const allocator = factory.newAllocator();

      const structure = new PagedDataStructure(targetSize, allocator);

      const pagesNeeded = Math.ceil(targetSize / pageSize);
      const capacity = structure.capacity();
      const waste = capacity - targetSize;
      const efficiency = ((targetSize / capacity) * 100).toFixed(1);

      console.log(`${pageSize}\t\t${pagesNeeded}\t\t${capacity}\t\t${waste}\t${efficiency}%`);

      expect(structure.size()).toBe(targetSize);
      expect(structure.capacity()).toBe(pagesNeeded * pageSize);
      expect(capacity).toBeGreaterThanOrEqual(targetSize);

      structure.release();
    }

    console.log('\n✅ Constructor optimizes page allocation for different page sizes');
  });

  /**
   * Test 3: Constructor Size Limits
   * Test the maximum supported size assertion
   */
  test('constructor enforces size limits correctly', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 3: Size Limit Enforcement');
    console.log('=============================================');

    const pageSize = 256;
    const factory = PageAllocator.of(
      pageSize,
      pageSize * 4,
      () => new Int32Array(pageSize),
      []
    );
    const allocator = factory.newAllocator();

    // Calculate the maximum supported size
    const pageShift = Math.floor(Math.log2(pageSize));
    const maxIndexShift = 31 + pageShift;
    const maxSupportedSize = Number(1n << BigInt(maxIndexShift));

    console.log(`📏 Page size: ${pageSize} (shift: ${pageShift})`);
    console.log(`🔢 Max index shift: ${maxIndexShift}`);
    console.log(`📊 Max supported size: ${maxSupportedSize.toLocaleString()}`);

    // Test valid sizes (should work)
    const validSizes = [
      0,
      1,
      pageSize,
      pageSize * 2,
      Number(Math.floor(Number(maxSupportedSize) / 2)),
      Number(maxSupportedSize)
    ];

    for (const size of validSizes) {
      console.log(`\n✅ Testing valid size: ${size.toLocaleString()}`);

      // This should NOT throw
      expect(() => {
        const structure = new PagedDataStructure(size, allocator);
        structure.release();
      }).not.toThrow();
    }

    // Test invalid sizes (should throw or log assertion)
    const invalidSizes = [
      maxSupportedSize + 1,
      maxSupportedSize * 2,
      Number.MAX_SAFE_INTEGER
    ];

    for (const size of invalidSizes) {
      console.log(`\n❌ Testing invalid size: ${size.toLocaleString()}`);

      // Capture console.assert calls
      const originalAssert = console.assert;
      let assertionFailed = false;

      console.assert = (condition: boolean, message?: string) => {
        if (!condition) {
          assertionFailed = true;
          console.log(`🚨 Assertion failed: ${message}`);
        }
      };

      try {
        const structure = new PagedDataStructure(size, allocator);
        structure.release();

        // Should have triggered assertion
        expect(assertionFailed).toBe(true);
      } finally {
        console.assert = originalAssert;
      }
    }

    console.log('\n✅ Constructor properly enforces size limits');
  });

  /**
   * Test 4: Constructor Page Allocation
   * Test that constructor actually allocates the right number of pages
   */
  test('constructor allocates correct number of pages', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 4: Page Allocation Verification');
    console.log('===================================================');

    const pageSize = 512;
    let pagesAllocated = 0;

    // Create allocator that counts page allocations
    const factory = PageAllocator.of(
      pageSize,
      pageSize * 4,
      () => {
        pagesAllocated++;
        console.log(`  📄 Allocating page ${pagesAllocated}`);
        return new Int32Array(pageSize);
      },
      []
    );
    const allocator = factory.newAllocator();

    const testCases = [
      { size: 0, expectedPages: 0 },
      { size: 1, expectedPages: 1 },
      { size: 512, expectedPages: 1 },
      { size: 513, expectedPages: 2 },
      { size: 1024, expectedPages: 2 },
      { size: 1536, expectedPages: 3 },
      { size: 1537, expectedPages: 4 }
    ];

    for (const { size, expectedPages } of testCases) {
      console.log(`\n🔬 Testing size ${size} (expecting ${expectedPages} pages)`);

      pagesAllocated = 0;
      const structure = new PagedDataStructure(size, allocator);

      console.log(`  Actual pages allocated: ${pagesAllocated}`);
      console.log(`  Structure capacity: ${structure.capacity()}`);
      console.log(`  Structure size: ${structure.size()}`);

      expect(pagesAllocated).toBe(expectedPages);
      expect(structure.size()).toBe(size);
      expect(structure.capacity()).toBe(expectedPages * pageSize);

      structure.release();
    }

    console.log('\n✅ Constructor allocates exactly the right number of pages');
  });

  /**
   * Test 5: Constructor Bit Manipulation Setup
   * Test that bit manipulation fields are calculated correctly
   */
  test('constructor calculates bit manipulation fields correctly', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 5: Bit Manipulation Setup');
    console.log('==============================================');

    const testCases = [
      { pageSize: 64, expectedShift: 6, expectedMask: 63 },
      { pageSize: 128, expectedShift: 7, expectedMask: 127 },
      { pageSize: 256, expectedShift: 8, expectedMask: 255 },
      { pageSize: 512, expectedShift: 9, expectedMask: 511 },
      { pageSize: 1024, expectedShift: 10, expectedMask: 1023 },
      { pageSize: 2048, expectedShift: 11, expectedMask: 2047 }
    ];

    for (const { pageSize, expectedShift, expectedMask } of testCases) {
      console.log(`\n🔬 Testing page size: ${pageSize}`);

      const factory = PageAllocator.of(
        pageSize,
        pageSize * 4,
        () => new Int32Array(pageSize),
        []
      );
      const allocator = factory.newAllocator();

      // Create a test class that exposes the protected fields
      class TestablePagedDataStructure extends PagedDataStructure<Int32Array> {
        public getPageShift(): number {
          return this.pageShift;
        }

        public getPageMask(): number {
          return this.pageMask;
        }

        public testPageIndex(index: number): number {
          return this.pageIndex(index);
        }

        public testIndexInPage(index: number): number {
          return this.indexInPage(index);
        }
      }

      const structure = new TestablePagedDataStructure(1000, allocator);

      console.log(`  Expected shift: ${expectedShift}, actual: ${structure.getPageShift()}`);
      console.log(`  Expected mask: ${expectedMask}, actual: ${structure.getPageMask()}`);

      expect(structure.getPageShift()).toBe(expectedShift);
      expect(structure.getPageMask()).toBe(expectedMask);

      // Test bit manipulation calculations
      const testIndices = [0, 1, pageSize - 1, pageSize, pageSize + 1, pageSize * 2];

      console.log('\n  Index → Page Index, Index in Page');
      for (const index of testIndices) {
        const pageIndex = structure.testPageIndex(index);
        const indexInPage = structure.testIndexInPage(index);
        const expectedPageIndex = Math.floor(index / pageSize);
        const expectedIndexInPage = index % pageSize;

        console.log(`  ${index} → ${pageIndex}, ${indexInPage}`);

        expect(pageIndex).toBe(expectedPageIndex);
        expect(indexInPage).toBe(expectedIndexInPage);
      }

      structure.release();
    }

    console.log('\n✅ Constructor sets up bit manipulation correctly');
  });

  /**
   * Test 6: Constructor Memory and Resource Management
   * Test that constructor properly initializes memory tracking
   */
  test('constructor initializes memory tracking correctly', () => {
    console.log('\n🎓 CONSTRUCTOR TEST 6: Memory Tracking Initialization');
    console.log('=====================================================');

    const pageSize = 1024;
    const bytesPerElement = 8; // Float64Array
    const factory = PageAllocator.of(
      pageSize,
      pageSize * bytesPerElement,
      () => new Float64Array(pageSize),
      []
    );
    const allocator = factory.newAllocator();

    const testSizes = [0, 100, 1024, 2000, 5000];

    console.log('Size\t\tMemory (KB)\tCapacity\tEfficiency');
    console.log('----\t\t-----------\t--------\t----------');

    for (const size of testSizes) {
      const structure = new PagedDataStructure(size, allocator);

      const memoryUsage = structure.sizeOf();
      const memoryKB = (memoryUsage / 1024).toFixed(2);
      const capacity = structure.capacity();
      const efficiency = size > 0 ? ((size / capacity) * 100).toFixed(1) : 'N/A';

      console.log(`${size}\t\t${memoryKB}\t\t${capacity}\t\t${efficiency}%`);

      expect(memoryUsage).toBeGreaterThanOrEqual(0);
      expect(capacity).toBeGreaterThanOrEqual(size);

      // Test release functionality
      const freedMemory = structure.release();
      expect(freedMemory).toBe(memoryUsage);
      expect(structure.size()).toBe(0);
      expect(structure.capacity()).toBe(0);
    }

    console.log('\n✅ Constructor initializes memory tracking correctly');
  });
});
