import {
  BytePageCreator,
  DoublePageCreator,
  LongPageCreator,
  IntPageCreator,
  PageCreators,
} from "../PageCreator";

describe("PageCreator - Core Interface and Implementations", () => {
  test("BytePageCreator interface works correctly", () => {
    console.log("\n🎯 BYTE PAGE CREATOR TEST: Interface Compliance");
    console.log("===============================================");

    console.log("Testing BytePageCreator interface...");

    // Create a custom BytePageCreator for testing
    const customByteCreator: BytePageCreator = {
      fill(pages: Int8Array[], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        console.log(
          `  Fill called: ${pages.length} pages, pageSize=${pageSize}, lastPageSize=${lastPageSize}`
        );

        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Int8Array(size);
          this.fillPage(pages[i], i * pageSize);
        }
      },

      fillPage(page: Int8Array, base: number): void {
        console.log(
          `  FillPage called: base=${base}, pageLength=${page.length}`
        );
        for (let i = 0; i < page.length; i++) {
          page[i] = (base + i) % 128; // Pattern based on global index
        }
      },
    };

    // Test fill method
    const pages: Int8Array[] = new Array(3);
    const pageShift = 4; // 16 elements per page
    const lastPageSize = 10;

    customByteCreator.fill(pages, lastPageSize, pageShift);

    console.log("\nVerifying page creation:");
    expect(pages.length).toBe(3);
    expect(pages[0].length).toBe(16);
    expect(pages[1].length).toBe(16);
    expect(pages[2].length).toBe(10);

    console.log("\nVerifying page contents:");
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const base = pageIdx * 16;
      console.log(`  Page ${pageIdx} (base=${base}):`);

      for (let i = 0; i < Math.min(page.length, 5); i++) {
        const expectedValue = (base + i) % 128;
        console.log(
          `    Element ${i}: ${page[i]} (expected: ${expectedValue})`
        );
        expect(page[i]).toBe(expectedValue);
      }
    }

    console.log("✅ BytePageCreator interface works!");
  });

  test("DoublePageCreator interface works correctly", () => {
    console.log("\n🎯 DOUBLE PAGE CREATOR TEST: Interface Compliance");
    console.log("=================================================");

    console.log("Testing DoublePageCreator interface...");

    // Create a custom DoublePageCreator for scientific data
    const scientificDoubleCreator: DoublePageCreator = {
      fill(
        pages: Float64Array[],
        lastPageSize: number,
        pageShift: number
      ): void {
        const pageSize = 1 << pageShift;
        console.log(
          `  Fill called: ${pages.length} pages, pageSize=${pageSize}, lastPageSize=${lastPageSize}`
        );

        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Float64Array(size);
          this.fillPage(pages[i], i * pageSize);
        }
      },

      fillPage(page: Float64Array, base: number): void {
        console.log(
          `  FillPage called: base=${base}, pageLength=${page.length}`
        );
        for (let i = 0; i < page.length; i++) {
          const globalIndex = base + i;
          page[i] = Math.sin((globalIndex * Math.PI) / 180); // Sine wave pattern
        }
      },
    };

    // Test with scientific data pattern
    const pages: Float64Array[] = new Array(2);
    const pageShift = 3; // 8 elements per page
    const lastPageSize = 5;

    scientificDoubleCreator.fill(pages, lastPageSize, pageShift);

    console.log("\nVerifying scientific data pattern:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(8);
    expect(pages[1].length).toBe(5);

    console.log("\nVerifying sine wave pattern:");
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const base = pageIdx * 8;
      console.log(`  Page ${pageIdx} sine values:`);

      for (let i = 0; i < Math.min(page.length, 3); i++) {
        const globalIndex = base + i;
        const expectedValue = Math.sin((globalIndex * Math.PI) / 180);
        console.log(
          `    sin(${globalIndex}°): ${page[i].toFixed(
            6
          )} (expected: ${expectedValue.toFixed(6)})`
        );
        expect(page[i]).toBeCloseTo(expectedValue, 10);
      }
    }

    console.log("✅ DoublePageCreator interface works!");
  });

  test("LongPageCreator interface works correctly", () => {
    console.log("\n🎯 LONG PAGE CREATOR TEST: Interface Compliance");
    console.log("===============================================");

    console.log("Testing LongPageCreator interface...");

    // Create a custom LongPageCreator for large identifiers
    const idGeneratorCreator: LongPageCreator = {
      fill(pages: number[][], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        console.log(
          `  Fill called: ${pages.length} pages, pageSize=${pageSize}, lastPageSize=${lastPageSize}`
        );

        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Array<number>(size);
          this.fillPage(pages[i], i * pageSize);
        }
      },

      fillPage(page: number[], base: number): void {
        console.log(
          `  FillPage called: base=${base}, pageLength=${page.length}`
        );
        for (let i = 0; i < page.length; i++) {
          const globalIndex = base + i;
          page[i] = globalIndex * 1000000 + 999; // Large ID pattern
        }
      },
    };

    // Test with large identifier pattern
    const pages: number[][] = new Array(2);
    const pageShift = 2; // 4 elements per page
    const lastPageSize = 3;

    idGeneratorCreator.fill(pages, lastPageSize, pageShift);

    console.log("\nVerifying large ID generation:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(4);
    expect(pages[1].length).toBe(3);

    console.log("\nVerifying ID pattern:");
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const base = pageIdx * 4;
      console.log(`  Page ${pageIdx} IDs:`);

      for (let i = 0; i < page.length; i++) {
        const globalIndex = base + i;
        const expectedValue = globalIndex * 1000000 + 999;
        console.log(
          `    ID[${globalIndex}]: ${page[i]} (expected: ${expectedValue})`
        );
        expect(page[i]).toBe(expectedValue);
      }
    }

    console.log("✅ LongPageCreator interface works!");
  });

  test("IntPageCreator interface works correctly", () => {
    console.log("\n🎯 INT PAGE CREATOR TEST: Interface Compliance");
    console.log("==============================================");

    console.log("Testing IntPageCreator interface...");

    // Create a custom IntPageCreator for graph node degrees
    const degreeSequenceCreator: IntPageCreator = {
      fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
        const pageSize = 1 << pageShift;
        console.log(
          `  Fill called: ${pages.length} pages, pageSize=${pageSize}, lastPageSize=${lastPageSize}`
        );

        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Int32Array(size);
          this.fillPage(pages[i], i * pageSize);
        }
      },

      fillPage(page: Int32Array, base: number): void {
        console.log(
          `  FillPage called: base=${base}, pageLength=${page.length}`
        );
        for (let i = 0; i < page.length; i++) {
          const nodeId = base + i;
          // Simulate power law degree distribution
          page[i] = Math.max(1, Math.floor(100 / (nodeId + 1)));
        }
      },
    };

    // Test with degree sequence pattern
    const pages: Int32Array[] = new Array(2);
    const pageShift = 3; // 8 elements per page
    const lastPageSize = 6;

    degreeSequenceCreator.fill(pages, lastPageSize, pageShift);

    console.log("\nVerifying degree sequence:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(8);
    expect(pages[1].length).toBe(6);

    console.log("\nVerifying power law distribution:");
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const base = pageIdx * 8;
      console.log(`  Page ${pageIdx} degrees:`);

      for (let i = 0; i < Math.min(page.length, 4); i++) {
        const nodeId = base + i;
        const expectedDegree = Math.max(1, Math.floor(100 / (nodeId + 1)));
        console.log(
          `    Node ${nodeId}: degree=${page[i]} (expected: ${expectedDegree})`
        );
        expect(page[i]).toBe(expectedDegree);
      }
    }

    console.log("✅ IntPageCreator interface works!");
  });

  test("PageCreators.zeroBytes() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Zero Bytes");
    console.log("=================================");

    console.log("Testing PageCreators.zeroBytes()...");

    const zeroCreator = PageCreators.zeroBytes();

    // Test bulk creation
    const pages: Int8Array[] = new Array(3);
    const pageShift = 4; // 16 elements per page
    const lastPageSize = 12;

    zeroCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying zero-filled pages:");
    expect(pages.length).toBe(3);
    expect(pages[0].length).toBe(16);
    expect(pages[1].length).toBe(16);
    expect(pages[2].length).toBe(12);

    // Verify all elements are zero
    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(`  Page ${pageIdx}: checking ${page.length} elements...`);

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(0);
      }
      console.log(`    All ${page.length} elements are zero ✓`);
    }

    // Test individual page creation
    const singlePage = new Int8Array(10);
    singlePage.fill(99); // Fill with non-zero first
    zeroCreator.fillPage(singlePage, 0);

    console.log("Testing individual page fillPage (should be no-op):");
    for (let i = 0; i < singlePage.length; i++) {
      console.log(`  singlePage[${i}] = ${singlePage[i]}`);
      expect(singlePage[i]).toBe(99); // Should remain unchanged (Int8Array already zeros)
    }

    console.log("✅ PageCreators.zeroBytes() works!");
  });

  test("PageCreators.zeroInts() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Zero Ints");
    console.log("================================");

    console.log("Testing PageCreators.zeroInts()...");

    const zeroCreator = PageCreators.zeroInts();

    const pages: Int32Array[] = new Array(2);
    const pageShift = 3; // 8 elements per page
    const lastPageSize = 5;

    zeroCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying zero-filled int pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(8);
    expect(pages[1].length).toBe(5);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(`  Page ${pageIdx}: checking ${page.length} int elements...`);

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(0);
      }
      console.log(`    All ${page.length} int elements are zero ✓`);
    }

    console.log("✅ PageCreators.zeroInts() works!");
  });

  test("PageCreators.zeroDoubles() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Zero Doubles");
    console.log("===================================");

    console.log("Testing PageCreators.zeroDoubles()...");

    const zeroCreator = PageCreators.zeroDoubles();

    const pages: Float64Array[] = new Array(2);
    const pageShift = 2; // 4 elements per page
    const lastPageSize = 3;

    zeroCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying zero-filled double pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(4);
    expect(pages[1].length).toBe(3);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(
        `  Page ${pageIdx}: checking ${page.length} double elements...`
      );

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(0.0);
      }
      console.log(`    All ${page.length} double elements are zero ✓`);
    }

    console.log("✅ PageCreators.zeroDoubles() works!");
  });

  test("PageCreators.zeroLongs() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Zero Longs");
    console.log("=================================");

    console.log("Testing PageCreators.zeroLongs()...");

    const zeroCreator = PageCreators.zeroLongs();

    const pages: number[][] = new Array(2);
    const pageShift = 2; // 4 elements per page
    const lastPageSize = 3;

    zeroCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying zero-filled long pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(4);
    expect(pages[1].length).toBe(3);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(
        `  Page ${pageIdx}: checking ${page.length} long elements...`
      );

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(0);
      }
      console.log(`    All ${page.length} long elements are zero ✓`);
    }

    // Test individual page filling
    const testPage = new Array<number>(5).fill(999);
    zeroCreator.fillPage(testPage, 0);

    console.log("Testing individual page filling:");
    for (let i = 0; i < testPage.length; i++) {
      console.log(`  testPage[${i}] = ${testPage[i]}`);
      expect(testPage[i]).toBe(0);
    }

    console.log("✅ PageCreators.zeroLongs() works!");
  });

  test("PageCreators.constantInts() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Constant Ints");
    console.log("====================================");

    const constantValue = 42;
    console.log(`Testing PageCreators.constantInts(${constantValue})...`);

    const constantCreator = PageCreators.constantInts(constantValue);

    const pages: Int32Array[] = new Array(2);
    const pageShift = 3; // 8 elements per page
    const lastPageSize = 6;

    constantCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying constant-filled int pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(8);
    expect(pages[1].length).toBe(6);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(
        `  Page ${pageIdx}: checking ${page.length} elements for value ${constantValue}...`
      );

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(constantValue);
      }
      console.log(`    All ${page.length} elements equal ${constantValue} ✓`);
    }

    // Test individual page filling
    const testPage = new Int32Array(5);
    constantCreator.fillPage(testPage, 0);

    console.log("Testing individual page filling:");
    for (let i = 0; i < testPage.length; i++) {
      console.log(`  testPage[${i}] = ${testPage[i]}`);
      expect(testPage[i]).toBe(constantValue);
    }

    console.log("✅ PageCreators.constantInts() works!");
  });

  test("PageCreators.constantDoubles() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Constant Doubles");
    console.log("=======================================");

    const constantValue = Math.PI;
    console.log(`Testing PageCreators.constantDoubles(${constantValue})...`);

    const constantCreator = PageCreators.constantDoubles(constantValue);

    const pages: Float64Array[] = new Array(2);
    const pageShift = 2; // 4 elements per page
    const lastPageSize = 3;

    constantCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying constant-filled double pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(4);
    expect(pages[1].length).toBe(3);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(
        `  Page ${pageIdx}: checking ${page.length} elements for value ${constantValue}...`
      );

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBeCloseTo(constantValue, 10);
      }
      console.log(`    All ${page.length} elements equal π ✓`);
    }

    console.log("✅ PageCreators.constantDoubles() works!");
  });

  test("PageCreators.constantLongs() works correctly", () => {
    console.log("\n🎯 PAGE CREATORS TEST: Constant Longs");
    console.log("=====================================");

    const constantValue = 9007199254740991; // Near MAX_SAFE_INTEGER
    console.log(`Testing PageCreators.constantLongs(${constantValue})...`);

    const constantCreator = PageCreators.constantLongs(constantValue);

    const pages: number[][] = new Array(2);
    const pageShift = 2; // 4 elements per page
    const lastPageSize = 3;

    constantCreator.fill(pages, lastPageSize, pageShift);

    console.log("Verifying constant-filled long pages:");
    expect(pages.length).toBe(2);
    expect(pages[0].length).toBe(4);
    expect(pages[1].length).toBe(3);

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      console.log(
        `  Page ${pageIdx}: checking ${page.length} elements for large value...`
      );

      for (let i = 0; i < page.length; i++) {
        expect(page[i]).toBe(constantValue);
      }
      console.log(`    All ${page.length} elements equal large constant ✓`);
    }

    console.log("✅ PageCreators.constantLongs() works!");
  });
  test("complex initialization patterns work correctly", () => {
    console.log("\n🎯 COMPLEX PATTERNS TEST: Custom Initialization");
    console.log("===============================================");

    console.log("Testing complex initialization patterns...");

    // Fibonacci-based initialization pattern (no external methods needed)
    const fibonacciInitializer: DoublePageCreator = {
      fill(
        pages: Float64Array[],
        lastPageSize: number,
        pageShift: number
      ): void {
        const pageSize = 1 << pageShift;
        for (let i = 0; i < pages.length; i++) {
          const size = i === pages.length - 1 ? lastPageSize : pageSize;
          pages[i] = new Float64Array(size);
          this.fillPage(pages[i], i * pageSize);
        }
      },

      fillPage(page: Float64Array, base: number): void {
        // Fill with fibonacci-like pattern: only certain indices get values
        for (let i = 0; i < page.length; i++) {
          const globalIndex = base + i;

          // Simple pattern: fill only indices that are fibonacci numbers
          // F(0)=0, F(1)=1, F(2)=1, F(3)=2, F(4)=3, F(5)=5, F(6)=8, F(7)=13, F(8)=21...
          const fibIndices = [0, 1, 2, 3, 5, 8, 13, 21, 34];

          if (fibIndices.includes(globalIndex)) {
            page[i] = globalIndex * 2.5; // Some computed value for fibonacci indices
          }
          // Others remain 0.0
        }
      },
    };

    const pages: Float64Array[] = new Array(2);
    fibonacciInitializer.fill(pages, 10, 4); // 16 elements per page, last page has 10

    console.log("Verifying fibonacci-based initialization:");
    let totalNonZero = 0;
    let totalElements = 0;
    const fibIndices = [0, 1, 2, 3, 5, 8, 13, 21, 34];

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const base = pageIdx * 16;
      console.log(`  Page ${pageIdx}:`);

      for (let i = 0; i < page.length; i++) {
        const globalIndex = base + i;
        const isFibIndex = fibIndices.includes(globalIndex);
        const expectedValue = isFibIndex ? globalIndex * 2.5 : 0.0;

        if (page[i] !== 0) {
          console.log(
            `    Element ${globalIndex} (fibonacci): ${page[i]} (expected: ${expectedValue})`
          );
          totalNonZero++;
        }

        expect(page[i]).toBeCloseTo(expectedValue, 10);
        totalElements++;
      }
    }

    console.log(
      `  Total elements: ${totalElements}, Non-zero (fibonacci indices): ${totalNonZero}`
    );
    expect(totalNonZero).toBeGreaterThan(0);
    expect(totalNonZero).toBeLessThan(totalElements);

    console.log("✅ Complex initialization patterns work!");
  });

  test("page boundary calculations work correctly", () => {
    console.log("\n🎯 BOUNDARY CALCULATIONS TEST: Page Math");
    console.log("========================================");

    console.log("Testing page boundary calculations...");

    // Test various page shifts
    const testCases = [
      { pageShift: 2, expectedPageSize: 4 }, // 2^2 = 4
      { pageShift: 4, expectedPageSize: 16 }, // 2^4 = 16
      { pageShift: 6, expectedPageSize: 64 }, // 2^6 = 64
      { pageShift: 10, expectedPageSize: 1024 }, // 2^10 = 1024
    ];

    for (const testCase of testCases) {
      console.log(
        `\nTesting pageShift=${testCase.pageShift} (pageSize=${testCase.expectedPageSize}):`
      );

      const boundaryTester: IntPageCreator = {
        fill(
          pages: Int32Array[],
          lastPageSize: number,
          pageShift: number
        ): void {
          const pageSize = 1 << pageShift;
          console.log(`    Calculated pageSize: ${pageSize}`);
          expect(pageSize).toBe(testCase.expectedPageSize);

          for (let i = 0; i < pages.length; i++) {
            const size = i === pages.length - 1 ? lastPageSize : pageSize;
            pages[i] = new Int32Array(size);
            this.fillPage(pages[i], i * pageSize);
          }
        },

        fillPage(page: Int32Array, base: number): void {
          // Store the base offset in each element for verification
          for (let i = 0; i < page.length; i++) {
            page[i] = base + i;
          }
        },
      };

      const pages: Int32Array[] = new Array(3);
      const lastPageSize = testCase.expectedPageSize - 2; // Partial last page

      boundaryTester.fill(pages, lastPageSize, testCase.pageShift);

      // Verify boundary calculations
      expect(pages[0].length).toBe(testCase.expectedPageSize);
      expect(pages[1].length).toBe(testCase.expectedPageSize);
      expect(pages[2].length).toBe(lastPageSize);

      // Verify global indexing
      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const expectedBase = pageIdx * testCase.expectedPageSize;

        for (let i = 0; i < Math.min(page.length, 3); i++) {
          const expectedGlobalIndex = expectedBase + i;
          console.log(
            `    Page ${pageIdx}[${i}]: ${page[i]} (expected: ${expectedGlobalIndex})`
          );
          expect(page[i]).toBe(expectedGlobalIndex);
        }
      }

      console.log(
        `    ✓ Page shift ${testCase.pageShift} calculations correct`
      );
    }

    console.log("✅ Page boundary calculations work!");
  });

  test("PageCreators constructor prevention works", () => {
    console.log("\n🎯 CONSTRUCTOR PREVENTION TEST: Utility Class");
    console.log("=============================================");

    console.log("Testing PageCreators constructor prevention...");

    expect(() => {
      // @ts-expect-error - Testing constructor prevention
      new PageCreators();
    }).toThrow(
      "PageCreators is a static utility class and cannot be instantiated"
    );

    console.log("✅ PageCreators constructor properly prevented!");
  });

  test("error handling and edge cases work correctly", () => {
    console.log("\n🎯 ERROR HANDLING TEST: Edge Cases");
    console.log("==================================");

    console.log("Testing error handling and edge cases...");

    // Test empty pages array
    const emptyPagesCreator: BytePageCreator = {
      fill(pages: Int8Array[], lastPageSize: number, pageShift: number): void {
        console.log(`  Empty pages array: length=${pages.length}`);
        expect(pages.length).toBe(0);
        // Should handle gracefully
      },

      fillPage(page: Int8Array, base: number): void {
        page.fill(42);
      },
    };

    const emptyPages: Int8Array[] = [];
    emptyPagesCreator.fill(emptyPages, 0, 4);
    expect(emptyPages.length).toBe(0);

    // Test single page
    const singlePageCreator: IntPageCreator = {
      fill(pages: Int32Array[], lastPageSize: number, pageShift: number): void {
        console.log(
          `  Single page: length=${pages.length}, lastPageSize=${lastPageSize}`
        );
        expect(pages.length).toBe(1);

        pages[0] = new Int32Array(lastPageSize);
        this.fillPage(pages[0], 0);
      },

      fillPage(page: Int32Array, base: number): void {
        for (let i = 0; i < page.length; i++) {
          page[i] = base + i + 100;
        }
      },
    };

    const singlePageArray: Int32Array[] = new Array(1);
    singlePageCreator.fill(singlePageArray, 7, 4);

    expect(singlePageArray[0].length).toBe(7);
    for (let i = 0; i < 7; i++) {
      expect(singlePageArray[0][i]).toBe(i + 100);
    }

    console.log("✅ Error handling and edge cases work!");
  });
});
