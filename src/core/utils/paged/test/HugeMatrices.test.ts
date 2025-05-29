import {
  triangularIndex,
  normalizeTriangularCoordinates,
  triangularSize,
  triangularMemorySavings,
  triangularCoordinates,
  validateMatrixOrder,
  generateTriangularIndexTestCases,
  visualizeTriangularIndexing,
} from "../HugeMatrices";

describe("HugeMatrices - The Queen of Data Structures", () => {
  test("triangular indexing formula works perfectly", () => {
    console.log("\n👑 QUEEN TEST 1: The Sacred Mathematical Formula");

    const order = 4;
    const expectedMappings = [
      { x: 0, y: 0, expected: 0 },
      { x: 0, y: 1, expected: 1 },
      { x: 0, y: 2, expected: 2 },
      { x: 0, y: 3, expected: 3 },
      { x: 1, y: 1, expected: 4 },
      { x: 1, y: 2, expected: 5 },
      { x: 1, y: 3, expected: 6 },
      { x: 2, y: 2, expected: 7 },
      { x: 2, y: 3, expected: 8 },
      { x: 3, y: 3, expected: 9 },
    ];

    for (const { x, y, expected } of expectedMappings) {
      const actual = triangularIndex(order, x, y);
      console.log(
        `  (${x},${y}) → ${actual} ${actual === expected ? "✅" : "❌"}`
      );
      expect(actual).toBe(expected);
    }

    console.log("🏆 The mathematical formula is PERFECT!");
  });
  /**
   * Test 2: Memory Savings Analysis - The Queen's Efficiency
   */
  test("memory savings scale beautifully", () => {
    console.log("\n👑 QUEEN TEST 2: Royal Memory Efficiency");
    console.log("========================================");

    const testSizes = [10, 100, 1000, 10000];

    console.log("Matrix Size\tFull Memory\tTriangular\tSaved\tEfficiency");
    console.log("-----------\t-----------\t----------\t-----\t----------");

    for (const size of testSizes) {
      const savings = triangularMemorySavings(size);
      const fullMB = ((savings.fullSize * 8) / (1024 * 1024)).toFixed(1);
      const triMB = ((savings.triangularSize * 8) / (1024 * 1024)).toFixed(1);
      const savedMB = ((savings.elementsSaved * 8) / (1024 * 1024)).toFixed(1);

      console.log(
        `${size}×${size}\t\t${fullMB}MB\t\t${triMB}MB\t\t${savedMB}MB\t${savings.percentSaved.toFixed(
          1
        )}%`
      );

      expect(savings.percentSaved).toBeCloseTo(50, 0); // Should be ~50%
      expect(savings.triangularSize).toBe((size * (size + 1)) / 2);
    }

    console.log("\n💎 Consistently saves ~50% memory across all scales!");
  });

  /**
   * Test 3: Coordinate Normalization - Symmetric Matrix Magic
   */
  test("coordinate normalization enables symmetry", () => {
    console.log("\n👑 QUEEN TEST 3: Symmetric Matrix Elegance");
    console.log("==========================================");

    const order = 5;
    console.log(`Testing ${order}×${order} matrix coordinate normalization:\n`);

    // Test symmetric access patterns
    const testCoords = [
      { x: 0, y: 3 }, // Upper triangle - no swap needed
      { x: 3, y: 0 }, // Lower triangle - should swap to (0, 3)
      { x: 1, y: 4 }, // Upper triangle - no swap needed
      { x: 4, y: 1 }, // Lower triangle - should swap to (1, 4)
      { x: 2, y: 2 }, // Diagonal - no swap needed
    ];

    console.log("Original → Normalized → Index");
    for (const { x, y } of testCoords) {
      const [normX, normY] = normalizeTriangularCoordinates(order, x, y);
      const index = triangularIndex(order, normX, normY);

      console.log(`(${x},${y})\t  → (${normX},${normY})\t    → ${index}`);

      expect(normX).toBeLessThanOrEqual(normY);
      expect(index).toBeGreaterThanOrEqual(0);
    }

    // Verify symmetry - (x,y) and (y,x) map to same index
    console.log("\n🔄 Symmetry verification:");
    for (let x = 0; x < order; x++) {
      for (let y = x + 1; y < order; y++) {
        const [norm1X, norm1Y] = normalizeTriangularCoordinates(order, x, y);
        const [norm2X, norm2Y] = normalizeTriangularCoordinates(order, y, x);
        const index1 = triangularIndex(order, norm1X, norm1Y);
        const index2 = triangularIndex(order, norm2X, norm2Y);

        expect(index1).toBe(index2);
      }
    }

    console.log("✅ Perfect symmetry - matrix[i][j] === matrix[j][i]");
  });

  /**
   * Test 4: Coordinate Inversion - The Round Trip Test
   */
  test("coordinate inversion works perfectly", () => {
    console.log("\n👑 QUEEN TEST 4: Mathematical Inversion Magic");
    console.log("=============================================");

    const order = 6;
    const totalElements = triangularSize(order);

    console.log(`Testing coordinate inversion for ${order}×${order} matrix`);
    console.log(`Total triangular elements: ${totalElements}\n`);

    console.log("Index → Coordinates → Back to Index");

    // Test every single index in the triangular matrix
    for (let index = 0; index < Math.min(totalElements, 15); index++) {
      const [x, y] = triangularCoordinates(order, index);
      const backToIndex = triangularIndex(order, x, y);

      console.log(
        `${index}\t→ (${x},${y})\t  → ${backToIndex} ${
          index === backToIndex ? "✅" : "❌"
        }`
      );

      expect(backToIndex).toBe(index);
      expect(x).toBeLessThanOrEqual(y);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(order);
    }

    // Test the full round trip for every element
    let successCount = 0;
    for (let index = 0; index < totalElements; index++) {
      const [x, y] = triangularCoordinates(order, index);
      const backToIndex = triangularIndex(order, x, y);
      if (backToIndex === index) successCount++;
    }

    console.log(
      `\n🎯 Round trip success: ${successCount}/${totalElements} (${(
        (successCount / totalElements) *
        100
      ).toFixed(1)}%)`
    );
    expect(successCount).toBe(totalElements);
  });

  /**
   * Test 5: Matrix Order Validation - Safety First!
   */
  test("matrix order validation prevents disasters", () => {
    console.log("\n👑 QUEEN TEST 5: Royal Safety Protocols");
    console.log("=======================================");

    console.log("🛡️ Testing matrix order validation...\n");

    // Valid orders should pass
    const validOrders = [0, 1, 10, 100, 1000, 10000];
    console.log("Valid orders:");
    for (const order of validOrders) {
      console.log(`  Order ${order.toLocaleString()}: `);
      expect(() => validateMatrixOrder(order)).not.toThrow();
      console.log("✅ PASS");
    }

    // Invalid orders should fail
    const invalidOrders = [-1, 1.5, NaN, Infinity];
    console.log("\nInvalid orders:");
    for (const order of invalidOrders) {
      console.log(`  Order ${order}: `);
      expect(() => validateMatrixOrder(order)).toThrow();
      console.log("❌ REJECTED (as expected)");
    }

    // Test size limits
    console.log("\n📏 Size limit testing:");
    const maxSafeOrder = Math.floor(Math.sqrt(Number.MAX_SAFE_INTEGER));
    console.log(`  Max safe order: ${maxSafeOrder.toLocaleString()}`);
    expect(() => validateMatrixOrder(maxSafeOrder)).not.toThrow();

    console.log("\n🏰 All safety protocols working perfectly!");
  });

  /**
   * Test 6: Performance Analysis - Queen's Speed
   */
  test("triangular indexing performance is blazing fast", () => {
    console.log("\n👑 QUEEN TEST 6: Royal Performance Benchmarks");
    console.log("=============================================");

    const order = 1000;
    const iterations = 100000;

    console.log(
      `🚀 Performance test: ${iterations.toLocaleString()} triangular index calculations`
    );
    console.log(`Matrix size: ${order}×${order}\n`);

    // Benchmark triangular indexing
    const start = performance.now();

    let checksum = 0;
    for (let i = 0; i < iterations; i++) {
      const x = i % order;
      const y = x + (i % (order - x));
      if (y < order) {
        checksum += triangularIndex(order, x, y);
      }
    }

    const end = performance.now();
    const timeMs = end - start;
    const opsPerSec = Math.round(iterations / (timeMs / 1000));

    console.log(`Time: ${timeMs.toFixed(2)}ms`);
    console.log(`Operations/sec: ${opsPerSec.toLocaleString()}`);
    console.log(
      `Checksum: ${checksum.toLocaleString()} (prevents optimization)`
    );

    // Should be very fast - millions of operations per second
    expect(opsPerSec).toBeGreaterThan(1000000); // At least 1M ops/sec

    console.log("\n⚡ Matrix indexing is LIGHTNING FAST!");
  });

  /**
   * Test 7: Visual Matrix Layout - The Queen's Beauty
   */
  test("matrix visualization reveals the pattern", () => {
    console.log("\n👑 QUEEN TEST 7: Royal Matrix Visualization");
    console.log("==========================================");

    // Test small matrices for visualization
    for (const size of [3, 4, 5]) {
      console.log(`\n${visualizeTriangularIndexing(size)}`);
      console.log(""); // Extra spacing
    }

    // Verify the visualization makes sense
    const testCases = generateTriangularIndexTestCases(4);
    console.log("Generated test cases for validation:");
    for (const { x, y, expectedIndex } of testCases.slice(0, 10)) {
      const actualIndex = triangularIndex(4, x, y);
      console.log(
        `  (${x},${y}) → ${actualIndex} ${
          actualIndex === expectedIndex ? "✅" : "❌"
        }`
      );
      expect(actualIndex).toBe(expectedIndex);
    }

    console.log("\n🎨 Matrix patterns are beautiful and correct!");
  });

  /**
   * Test 8: Real-World Applications - Distance Matrix Example
   */
  test("distance matrix simulation works perfectly", () => {
    console.log("\n👑 QUEEN TEST 8: Real-World Distance Matrix");
    console.log("===========================================");

    // Simulate a distance matrix for cities
    const cities = ["NYC", "LA", "Chicago", "Houston", "Phoenix"];
    const numCities = cities.length;

    console.log(`🏙️ Distance matrix for ${numCities} cities:`);
    console.log("Cities:", cities.join(", "));

    // Create mock distance data
    const distances = new Map<number, number>();

    console.log("\n📏 Computing distances:");
    for (let i = 0; i < numCities; i++) {
      for (let j = i; j < numCities; j++) {
        const index = triangularIndex(numCities, i, j);

        if (i === j) {
          distances.set(index, 0); // Distance to self is 0
        } else {
          // Mock distance calculation
          const distance = Math.floor(Math.random() * 2000) + 100;
          distances.set(index, distance);
        }

        console.log(
          `  ${cities[i]} ↔ ${cities[j]}: ${distances.get(
            index
          )} miles (index: ${index})`
        );
      }
    }

    // Test symmetric access
    console.log("\n🔄 Testing symmetric access:");
    for (let i = 0; i < numCities; i++) {
      for (let j = i + 1; j < numCities; j++) {
        const [norm1X, norm1Y] = normalizeTriangularCoordinates(
          numCities,
          i,
          j
        );
        const [norm2X, norm2Y] = normalizeTriangularCoordinates(
          numCities,
          j,
          i
        );

        const index1 = triangularIndex(numCities, norm1X, norm1Y);
        const index2 = triangularIndex(numCities, norm2X, norm2Y);

        expect(index1).toBe(index2);

        console.log(`  ${cities[i]} ↔ ${cities[j]}: same index ${index1} ✅`);
      }
    }

    const memSavings = triangularMemorySavings(numCities);
    console.log(
      `\n💰 Memory savings: ${
        memSavings.elementsSaved
      } elements (${memSavings.percentSaved.toFixed(1)}%)`
    );
    console.log("🎯 Perfect for billion-city distance matrices!");
  });

  /**
   * Test 9: Stress Test - Can We Handle Massive Matrices?
   */
  test("massive matrix calculations work correctly", () => {
    console.log("\n👑 QUEEN TEST 9: Massive Matrix Stress Test");
    console.log("===========================================");

    // Test increasingly large matrices
    const massiveSizes = [1000, 5000, 10000, 50000];

    console.log("Matrix Size\tTriangular Elements\tMemory (GB)\tValidation");
    console.log("-----------\t-------------------\t-----------\t----------");

    for (const size of massiveSizes) {
      const triangularElements = triangularSize(size);
      const memoryGB = (
        (triangularElements * 8) /
        (1024 * 1024 * 1024)
      ).toFixed(2);

      // Validate a few random coordinates
      let validationPassed = true;
      for (let test = 0; test < 10; test++) {
        const x = Math.floor(Math.random() * size);
        const y = x + Math.floor(Math.random() * (size - x));

        try {
          const index = triangularIndex(size, x, y);
          const [backX, backY] = triangularCoordinates(size, index);

          if (backX !== x || backY !== y) {
            validationPassed = false;
            break;
          }
        } catch (error) {
          validationPassed = false;
          break;
        }
      }

      console.log(
        `${size.toLocaleString()}×${size.toLocaleString()}\t${triangularElements.toLocaleString()}\t\t${memoryGB}\t\t${
          validationPassed ? "✅ PASS" : "❌ FAIL"
        }`
      );

      expect(validationPassed).toBe(true);
      expect(triangularElements).toBe((size * (size + 1)) / 2);
    }

    console.log("\n🚀 Can handle matrices with BILLIONS of elements!");
  });
});
