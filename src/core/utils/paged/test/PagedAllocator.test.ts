import { PageAllocator } from '../PageAllocator';

describe('PageAllocator - Simple Reality Check', () => {

  test('basic page creation works', () => {
    console.log('\n=== Simple Page Creation Test ===');

    // Skip the complex ofArray method entirely
    // Just test the core Factory functionality

    const pageSize = 1024; // Simple power of 2
    const bytesPerPage = pageSize * 4; // 4 bytes per int

    // Simple page creator function
    const createPage = () => new Int32Array(pageSize);
    const emptyPages: Int32Array[] = [];

    // Use the basic Factory.of method directly
    const factory = PageAllocator.of(pageSize, bytesPerPage, createPage, emptyPages);
    const allocator = factory.newAllocator();

    // Test basic functionality
    expect(allocator.pageSize()).toBe(pageSize);
    expect(allocator.bytesPerPage()).toBe(bytesPerPage);

    // Create some pages
    const page1 = allocator.newPage();
    const page2 = allocator.newPage();

    expect(page1).toBeInstanceOf(Int32Array);
    expect(page1.length).toBe(pageSize);
    expect(page2.length).toBe(pageSize);
    expect(page1).not.toBe(page2); // Different instances

    // Test page usage
    page1[0] = 123;
    page1[1023] = 456;

    expect(page1[0]).toBe(123);
    expect(page1[1023]).toBe(456);
    expect(page2[0]).toBe(0); // Fresh page

    console.log(`✓ Created ${pageSize}-element pages successfully`);
    console.log(`✓ Page memory: ${bytesPerPage} bytes each`);
  });

  test('memory estimation works', () => {
    console.log('\n=== Memory Estimation Test ===');

    const pageSize = 1000;
    const bytesPerPage = 8000; // 8 bytes per element

    const factory = PageAllocator.of(
      pageSize,
      bytesPerPage,
      () => new Float64Array(pageSize),
      []
    );

    // Test memory estimation for different sizes
    const testCases = [
      { elements: 500, expectedPages: 1 },
      { elements: 1000, expectedPages: 1 },
      { elements: 1500, expectedPages: 2 },
      { elements: 3000, expectedPages: 3 },
    ];

    for (const { elements, expectedPages } of testCases) {
      const estimatedMemory = factory.estimateMemoryUsage(elements);
      const expectedMemory = expectedPages * bytesPerPage;

      expect(estimatedMemory).toBe(expectedMemory);

      console.log(`${elements} elements → ${expectedPages} pages → ${estimatedMemory} bytes`);
    }
  });

  test('different data types work', () => {
    console.log('\n=== Different Data Types Test ===');

    // Test with different array types - keep it simple
    const factories = [
      {
        name: 'Int32Array',
        factory: PageAllocator.of(256, 1024, () => new Int32Array(256), [])
      },
      {
        name: 'Float64Array',
        factory: PageAllocator.of(128, 1024, () => new Float64Array(128), [])
      },
      {
        name: 'Regular Array',
        factory: PageAllocator.of(100, 800, () => new Array(100), [])
      }
    ];

    for (const { name, factory } of factories) {
      const allocator = factory.newAllocator();
      const page = allocator.newPage();

      console.log(`${name}: page size ${allocator.pageSize()}, bytes ${allocator.bytesPerPage()}`);

      expect(page.length).toBe(allocator.pageSize());
      expect(allocator.bytesPerPage()).toBeGreaterThan(0);
    }
  });
});
