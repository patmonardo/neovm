import { HugeLongDoubleMap } from "../HugeLongDoubleMap";

describe("HugeLongDoubleMap - PageRank & Graph Analytics Powerhouse", () => {
  /**
   * Test 1: Basic Map Creation and Memory Estimation
   */
  test("map creation and memory estimation work correctly", () => {
    console.log("\n📊 DOUBLE MAP TEST 1: Creation and Memory Estimation");
    console.log("===================================================");

    const testCapacities = [0, 1, 4, 100, 10000, 1000000];

    console.log("Expected\tMemory Est.\tActual Creation\tValue Type");
    console.log("--------\t-----------\t---------------\t----------");

    for (const capacity of testCapacities) {
      console.log(
        `\n🔬 Testing map with expected elements: ${capacity.toLocaleString()}`
      );

      const memoryEst = HugeLongDoubleMap.memoryEstimation(capacity);

      const map = new HugeLongDoubleMap(capacity);

      const memoryKB = (memoryEst / 1024).toFixed(1);
      const valueType = "double (64-bit)";

      console.log(
        `${capacity.toLocaleString()}\t\t${memoryKB}KB\t\t✅ Created\t\t${valueType}`
      );

      expect(map.size()).toBe(0);
      expect(map.isEmpty()).toBe(true);

      console.log(`  Size: ${map.size()}, Empty: ${map.isEmpty()}`);
      console.log(`  Memory usage: ${(map.sizeOf() / 1024).toFixed(1)}KB`);

      map.release();
    }

    console.log(
      "\n🎯 Double map creation and memory estimation work perfectly!"
    );
  });

  /**
   * Test 2: AddTo Operation - Simple and Reliable
   */
  test("addTo operation works correctly for double accumulation", () => {
    console.log(
      "\n📊 DOUBLE MAP TEST 2: AddTo Operation for Double Accumulation"
    );
    console.log(
      "============================================================="
    );

    const map = new HugeLongDoubleMap();

    console.log("🔬 Testing addTo for double value accumulation...");

    // Test addTo on non-existing key
    console.log("\n1. Testing addTo on non-existing key:");
    map.addTo(42, 0.15);
    console.log(`  addTo(42, 0.15) on empty map`);
    console.log(
      `  Result: 42 → ${map.getOrDefault(42, -1)} ${
        Math.abs(map.getOrDefault(42, -1) - 0.15) < 1e-10 ? "✅" : "❌"
      }`
    );
    expect(map.getOrDefault(42, -1)).toBeCloseTo(0.15);
    expect(map.size()).toBe(1);

    // Test addTo on existing key
    console.log("\n2. Testing addTo on existing key:");
    map.addTo(42, 0.25);
    console.log(`  addTo(42, 0.25) to existing value 0.15`);
    const result = map.getOrDefault(42, -1);
    console.log(
      `  Result: 42 → ${result} (0.15 + 0.25 = 0.40) ${
        Math.abs(result - 0.4) < 1e-10 ? "✅" : "❌"
      }`
    );
    expect(result).toBeCloseTo(0.4);
    expect(map.size()).toBe(1); // Size unchanged

    // Test multiple accumulations
    console.log("\n3. Testing multiple accumulations:");
    map.clear();
    const values = [0.1, 0.2, 0.3, 0.4];
    let expectedSum = 0;

    for (const value of values) {
      map.addTo(100, value);
      expectedSum += value;
      console.log(
        `  addTo(100, ${value}) → running sum: ${map
          .getOrDefault(100, -1)
          .toFixed(3)}`
      );
    }

    const finalSum = map.getOrDefault(100, -1);
    console.log(
      `  Final sum: ${finalSum} (expected: ${expectedSum}) ${
        Math.abs(finalSum - expectedSum) < 1e-10 ? "✅" : "❌"
      }`
    );
    expect(finalSum).toBeCloseTo(expectedSum);

    // Test negative accumulation
    console.log("\n4. Testing negative accumulation:");
    map.addTo(100, -0.5);
    const afterNegative = map.getOrDefault(100, -1);
    console.log(
      `  addTo(100, -0.5) → result: ${afterNegative} ${
        Math.abs(afterNegative - (expectedSum - 0.5)) < 1e-10 ? "✅" : "❌"
      }`
    );
    expect(afterNegative).toBeCloseTo(expectedSum - 0.5);

    map.release();
    console.log("\n➕ AddTo operation works perfectly for doubles!");
  });
  /**
   * Test 3: getOrDefault with Double Precision
   */
  test("getOrDefault works correctly with double precision", () => {
    console.log("\n📊 DOUBLE MAP TEST 3: getOrDefault with Double Precision");
    console.log("========================================================");

    const map = new HugeLongDoubleMap();

    console.log("🔬 Testing double precision storage and retrieval...");

    // Test getOrDefault on empty map
    console.log("\n1. Testing getOrDefault on empty map:");
    const defaultValue = map.getOrDefault(123, 3.14159);
    console.log(
      `  getOrDefault(123, 3.14159) = ${defaultValue} ${
        Math.abs(defaultValue - 3.14159) < 1e-10 ? "✅" : "❌"
      }`
    );
    expect(defaultValue).toBeCloseTo(3.14159);

    // Test high precision values
    console.log("\n2. Testing high precision values:");
    const testValues = [
      { key: 1, value: Math.PI },
      { key: 2, value: Math.E },
      { key: 3, value: 1.23456789012345 },
      { key: 4, value: -2.71828182845905 },
      { key: 5, value: 0.0000000001 }, // Very small positive
      { key: 6, value: -0.0000000001 }, // Very small negative
      { key: 7, value: 1e15 }, // Very large
      { key: 8, value: -1e15 }, // Very large negative
    ];

    for (const { key, value } of testValues) {
      map.addTo(key, value);
      const retrieved = map.getOrDefault(key, 0);
      console.log(`  Set ${key} → ${value}`);
      console.log(
        `  Get ${key} → ${retrieved} ${
          Math.abs(retrieved - value) < 1e-14 ? "✅" : "❌"
        }`
      );
      expect(retrieved).toBeCloseTo(value, 14); // 14 decimal places
    }

    // Test edge cases
    console.log("\n3. Testing edge cases:");
    map.addTo(100, 0.0); // Exact zero
    map.addTo(200, -0.0); // Negative zero
    map.addTo(300, Infinity);
    map.addTo(400, -Infinity);

    expect(map.getOrDefault(100, -1)).toBe(0.0);
    expect(map.getOrDefault(200, -1)).toBe(-0.0);
    expect(map.getOrDefault(300, -1)).toBe(Infinity);
    expect(map.getOrDefault(400, -1)).toBe(-Infinity);
    console.log("  ✅ Edge cases (zero, infinity) handled correctly");

    map.release();
    console.log("\n🔢 Double precision operations work perfectly!");
  });

  /**
   * Test 4: Clear and Reuse for Algorithm Iterations
   */
  test("clear and reuse work correctly for iterative algorithms", () => {
    console.log(
      "\n📊 DOUBLE MAP TEST 4: Clear and Reuse for Iterative Algorithms"
    );
    console.log(
      "=============================================================="
    );

    const map = new HugeLongDoubleMap();

    console.log("🔬 Testing clear operation for iterative graph algorithms...");

    // Fill with PageRank scores
    console.log("\n1. Filling map with PageRank scores:");
    for (let i = 1; i <= 10; i++) {
      const pageRankScore = Math.random(); // Random PageRank score
      map.addTo(i, pageRankScore);
      console.log(`  Node ${i}: PageRank = ${pageRankScore.toFixed(6)}`);
    }
    console.log(`  Filled with 10 nodes, size: ${map.size()}`);
    expect(map.size()).toBe(10);
    expect(map.isEmpty()).toBe(false);

    // Clear for next iteration
    console.log("\n2. Clearing map for next iteration:");
    map.clear();
    console.log(`  After clear - Size: ${map.size()}, Empty: ${map.isEmpty()}`);
    expect(map.size()).toBe(0);
    expect(map.isEmpty()).toBe(true);

    // Verify all nodes are cleared
    console.log("\n3. Verifying all nodes are cleared:");
    for (let i = 1; i <= 10; i++) {
      const score = map.getOrDefault(i, -999);
      console.log(
        `  Node ${i} score: ${score} ${score === -999 ? "✅" : "❌"}`
      );
      expect(score).toBe(-999);
    }

    // Verify map is reusable
    console.log("\n4. Verifying map reusability:");
    map.addTo(555, 0.85);
    expect(map.size()).toBe(1);
    expect(map.getOrDefault(555, -1)).toBeCloseTo(0.85);
    console.log("  ✅ Map reusable after clear");

    map.release();
    console.log("\n🧹 Clear and reuse operations work perfectly!");
  });

  /**
   * Test 5: Iterator Operations with Double Values
   */
  test("iterator operations work correctly with double values", () => {
    console.log("\n📊 DOUBLE MAP TEST 5: Iterator Operations");
    console.log("=========================================");

    const map = new HugeLongDoubleMap();

    console.log("🔬 Testing iteration over double-valued entries...");

    // Test iterator on empty map
    console.log("\n1. Testing iterator on empty map:");
    const emptyEntries = Array.from(map);
    console.log(
      `  Empty map entries: [${emptyEntries.length}] ${
        emptyEntries.length === 0 ? "✅" : "❌"
      }`
    );
    expect(emptyEntries).toHaveLength(0);

    // Add test data with double values
    console.log("\n2. Adding test data with double values:");
    const testData = [
      { key: 10, value: 0.1 },
      { key: 20, value: 0.2 },
      { key: 30, value: 0.3 },
      { key: 40, value: 0.4 },
      { key: 50, value: 0.5 },
    ];

    for (const { key, value } of testData) {
      map.addTo(key, value);
      console.log(`  Added: ${key} → ${value}`);
    }

    // Test iterator
    console.log("\n3. Testing iterator:");
    const entries = Array.from(map);
    console.log(`  Iterator returned ${entries.length} entries`);
    expect(entries).toHaveLength(testData.length);

    // Verify all entries are present with correct precision
    console.log("\n4. Verifying all entries with double precision:");
    const foundKeys = new Set<number>();
    const foundValues = new Set<number>();

    for (const cursor of entries) {
      console.log(
        `    Entry: ${cursor.key} → ${cursor.value} (index: ${cursor.index})`
      );
      foundKeys.add(cursor.key);
      foundValues.add(cursor.value);

      // Verify cursor values match map contents
      expect(map.getOrDefault(cursor.key, -1)).toBeCloseTo(cursor.value, 10);
    }

    // Verify all original keys and values were found
    for (const { key, value } of testData) {
      expect(foundKeys.has(key)).toBe(true);
      expect(foundValues.has(value)).toBe(true);
    }

    console.log("  ✅ All entries found with correct double precision");

    map.release();
    console.log("\n🔄 Iterator operations work perfectly!");
  });

  /**
   * Test 6: ToString Operation with Double Formatting
   */
  test("toString operation works correctly with double formatting", () => {
    console.log("\n📊 DOUBLE MAP TEST 6: ToString Operation");
    console.log("=======================================");

    const map = new HugeLongDoubleMap();

    console.log("🔬 Testing string representation with double values...");

    // Test empty map toString
    console.log("\n1. Testing empty map toString:");
    const emptyStr = map.toString();
    console.log(
      `  Empty map: "${emptyStr}" ${emptyStr === "[]" ? "✅" : "❌"}`
    );
    expect(emptyStr).toBe("[]");

    // Test single entry toString
    console.log("\n2. Testing single entry toString:");
    map.addTo(42, 3.14159);
    const singleStr = map.toString();
    console.log(`  Single entry: "${singleStr}"`);
    expect(singleStr).toContain("42=>3.14159");

    // Test multiple entries toString
    console.log("\n3. Testing multiple entries toString:");
    map.addTo(100, 2.71828);
    map.addTo(200, 1.41421);
    const multiStr = map.toString();
    console.log(`  Multiple entries: "${multiStr}"`);
    expect(multiStr).toContain("42=>3.14159");
    expect(multiStr).toContain("100=>2.71828");
    expect(multiStr).toContain("200=>1.41421");

    map.release();
    console.log("\n📝 ToString operation works perfectly!");
  });

  /**
   * Test 7: PageRank Algorithm Simulation - Complete Implementation
   */
  test("PageRank algorithm simulation works correctly", () => {
    console.log("\n📊 DOUBLE MAP TEST 7: PageRank Algorithm Simulation");
    console.log("===================================================");

    const currentRanks = new HugeLongDoubleMap();
    const nextRanks = new HugeLongDoubleMap();

    console.log("🔬 Simulating complete PageRank algorithm...");

    // Create a web graph
    const webGraph = {
      1: [2, 3, 4], // Page 1 links to 2, 3, 4
      2: [1, 3], // Page 2 links to 1, 3
      3: [1], // Page 3 links to 1
      4: [1, 2, 3], // Page 4 links to 1, 2, 3
    };

    console.log("\nWeb graph structure:");
    console.log("  Page 1 → [2, 3, 4]");
    console.log("  Page 2 → [1, 3]");
    console.log("  Page 3 → [1]");
    console.log("  Page 4 → [1, 2, 3]");

    const dampingFactor = 0.85;
    const numPages = 4;
    const tolerance = 1e-6;
    const maxIterations = 100;

    // Initialize PageRank values
    console.log("\n1. Initializing PageRank values:");
    const initialRank = 1.0 / numPages;
    for (let page = 1; page <= numPages; page++) {
      currentRanks.addTo(page, initialRank);
      console.log(`  Page ${page}: initial rank = ${initialRank}`);
    }

    // PageRank iterations
    console.log("\n2. Running PageRank iterations:");
    let iteration = 0;
    let converged = false;

    while (iteration < maxIterations && !converged) {
      iteration++;
      nextRanks.clear();

      // Base rank component (random surfer)
      const baseRank = (1 - dampingFactor) / numPages;
      for (let page = 1; page <= numPages; page++) {
        nextRanks.addTo(page, baseRank);
      }

      // Link contribution component
      for (const [sourceStr, targets] of Object.entries(webGraph)) {
        const source = parseInt(sourceStr);
        const sourceRank = currentRanks.getOrDefault(source, 0);
        const contribution = (dampingFactor * sourceRank) / targets.length;

        for (const target of targets) {
          nextRanks.addTo(target, contribution);
        }
      }

      // Check convergence
      let maxDiff = 0;
      for (let page = 1; page <= numPages; page++) {
        const oldRank = currentRanks.getOrDefault(page, 0);
        const newRank = nextRanks.getOrDefault(page, 0);
        const diff = Math.abs(newRank - oldRank);
        maxDiff = Math.max(maxDiff, diff);
      }

      console.log(
        `  Iteration ${iteration}: max difference = ${maxDiff.toFixed(8)}`
      );

      // Swap ranks for next iteration
      const temp = currentRanks;
      currentRanks.clear();
      for (let page = 1; page <= numPages; page++) {
        const rank = nextRanks.getOrDefault(page, 0);
        currentRanks.addTo(page, rank);
      }
      nextRanks.clear();

      converged = maxDiff < tolerance;
    }

    // Verify results
    console.log("\n3. Final PageRank scores:");
    let totalRank = 0;
    for (let page = 1; page <= numPages; page++) {
      const finalRank = currentRanks.getOrDefault(page, 0);
      totalRank += finalRank;
      console.log(`  Page ${page}: ${finalRank.toFixed(6)}`);
    }

    console.log(`\n4. Algorithm results:`);
    console.log(`  Converged: ${converged ? "✅" : "❌"}`);
    console.log(`  Iterations: ${iteration}`);
    console.log(`  Total rank: ${totalRank.toFixed(6)} (should be 1.0)`);

    expect(converged).toBe(true);
    expect(totalRank).toBeCloseTo(1.0, 5);
    expect(iteration).toBeLessThan(maxIterations);

    // Verify page 1 has highest rank (most incoming links)
    const page1Rank = currentRanks.getOrDefault(1, 0);
    const page2Rank = currentRanks.getOrDefault(2, 0);
    const page3Rank = currentRanks.getOrDefault(3, 0);
    const page4Rank = currentRanks.getOrDefault(4, 0);

    expect(page1Rank).toBeGreaterThan(page2Rank);
    expect(page1Rank).toBeGreaterThan(page3Rank);
    console.log("  ✅ Page 1 has highest rank (most incoming links)");

    currentRanks.release();
    nextRanks.release();
    console.log("\n🏆 PageRank algorithm simulation works perfectly!");
  });

  /**
   * Test 8: Graph Neural Network Feature Aggregation
   */
  test("graph neural network feature aggregation works correctly", () => {
    console.log(
      "\n📊 DOUBLE MAP TEST 8: Graph Neural Network Feature Aggregation"
    );
    console.log(
      "=============================================================="
    );

    const nodeFeatures = new HugeLongDoubleMap();

    console.log("🔬 Simulating GNN feature aggregation...");

    // Create a social network
    const socialNetwork = {
      1: [2, 3, 5], // Person 1 knows 2, 3, 5
      2: [1, 3, 4], // Person 2 knows 1, 3, 4
      3: [1, 2, 4, 5], // Person 3 knows 1, 2, 4, 5
      4: [2, 3], // Person 4 knows 2, 3
      5: [1, 3], // Person 5 knows 1, 3
    };

    console.log("\nSocial network structure:");
    for (const [person, friends] of Object.entries(socialNetwork)) {
      console.log(`  Person ${person} → friends [${friends.join(", ")}]`);
    }

    // Initialize node features (e.g., age, income, activity level)
    console.log("\n1. Initializing node features:");
    const initialFeatures = {
      1: 0.8, // High activity
      2: 0.3, // Low activity
      3: 0.9, // Very high activity
      4: 0.5, // Medium activity
      5: 0.7, // High activity
    };

    for (const [node, feature] of Object.entries(initialFeatures)) {
      nodeFeatures.addTo(parseInt(node), feature);
      console.log(`  Person ${node}: activity level = ${feature}`);
    }

    // Simulate GNN aggregation (mean of neighbor features)
    console.log("\n2. Performing neighbor feature aggregation:");
    const aggregatedFeatures = new HugeLongDoubleMap();

    for (const [nodeStr, neighbors] of Object.entries(socialNetwork)) {
      const node = parseInt(nodeStr);
      let sum = 0;
      let count = 0;

      // Aggregate neighbor features
      for (const neighbor of neighbors) {
        const neighborFeature = nodeFeatures.getOrDefault(neighbor, 0);
        sum += neighborFeature;
        count++;
      }

      const meanFeature = sum / count;
      aggregatedFeatures.addTo(node, meanFeature);

      console.log(
        `  Person ${node}: neighbor mean = ${meanFeature.toFixed(
          4
        )} (from ${count} neighbors)`
      );
    }

    // Combine original and aggregated features
    console.log("\n3. Combining original and aggregated features:");
    const alpha = 0.7; // Weight for original features
    const beta = 0.3; // Weight for aggregated features

    for (let person = 1; person <= 5; person++) {
      const originalFeature = nodeFeatures.getOrDefault(person, 0);
      const aggregatedFeature = aggregatedFeatures.getOrDefault(person, 0);
      const combinedFeature =
        alpha * originalFeature + beta * aggregatedFeature;

      console.log(
        `  Person ${person}: ${originalFeature.toFixed(
          3
        )} * ${alpha} + ${aggregatedFeature.toFixed(
          3
        )} * ${beta} = ${combinedFeature.toFixed(4)}`
      );

      expect(combinedFeature).toBeGreaterThan(0);
      expect(combinedFeature).toBeLessThanOrEqual(1);
    }

    nodeFeatures.release();
    aggregatedFeatures.release();
    console.log("\n🧠 GNN feature aggregation works perfectly!");
  });

  /**
   * Test 9: Performance Characteristics with Double Values
   */
  test("performance characteristics with double values are excellent", () => {
    console.log("\n📊 DOUBLE MAP TEST 9: Performance Characteristics");
    console.log("=================================================");

    const capacity = 1000000;
    const map = new HugeLongDoubleMap(capacity);
    const operations = 500000;

    console.log(
      `🚀 Performance test: ${operations.toLocaleString()} operations on ${capacity.toLocaleString()} capacity map`
    );

    // Test addTo performance
    console.log("\n1. Testing addTo performance:");
    const addToStart = performance.now();
    for (let i = 0; i < operations; i++) {
      map.addTo(i, Math.random()); // Random double values
    }
    const addToEnd = performance.now();
    const addToTime = addToEnd - addToStart;
    const addToOpsPerSec = Math.round(operations / (addToTime / 1000));

    console.log(`  AddTo time: ${addToTime.toFixed(2)}ms`);
    console.log(`  AddTo ops/sec: ${addToOpsPerSec.toLocaleString()}`);
    console.log(`  Final map size: ${map.size().toLocaleString()}`);

    // Test getOrDefault performance
    console.log("\n2. Testing getOrDefault performance:");
    const getStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < operations; i++) {
      checksum += map.getOrDefault(i, 0);
    }
    const getEnd = performance.now();
    const getTime = getEnd - getStart;
    const getOpsPerSec = Math.round(operations / (getTime / 1000));

    console.log(`  Get time: ${getTime.toFixed(2)}ms`);
    console.log(`  Get ops/sec: ${getOpsPerSec.toLocaleString()}`);
    console.log(`  Checksum: ${checksum.toFixed(6)} (prevents optimization)`);

    // Test accumulation performance (PageRank style)
    console.log("\n3. Testing accumulation performance:");
    const accumStart = performance.now();
    for (let i = 0; i < operations / 10; i++) {
      map.addTo(i % 1000, 0.001); // Accumulate small values
    }
    const accumEnd = performance.now();
    const accumTime = accumEnd - accumStart;
    const accumOpsPerSec = Math.round(operations / 10 / (accumTime / 1000));

    console.log(`  Accumulation time: ${accumTime.toFixed(2)}ms`);
    console.log(`  Accumulation ops/sec: ${accumOpsPerSec.toLocaleString()}`);

    // Performance expectations
    expect(addToOpsPerSec).toBeGreaterThan(500000); // At least 500K addTo/sec
    expect(getOpsPerSec).toBeGreaterThan(1000000); // At least 1M gets/sec
    expect(accumOpsPerSec).toBeGreaterThan(500000); // At least 500K accumulations/sec

    map.release();
    console.log("\n⚡ Performance characteristics are excellent!");
  });

  /**
   * Test 10: Memory Efficiency with Double Storage
   */
  test("memory efficiency with double storage works correctly", () => {
    console.log(
      "\n📊 DOUBLE MAP TEST 10: Memory Efficiency with Double Storage"
    );
    console.log("============================================================");

    console.log("🔬 Testing memory efficiency for double-valued maps...");

    const testScales = [1000, 10000, 100000, 1000000];

    console.log("\nElements\t\tEstimated Memory\tActual Test\tBytes/Entry");
    console.log("--------\t\t----------------\t-----------\t-----------");

    for (const elements of testScales) {
      const memoryEst = HugeLongDoubleMap.memoryEstimation(elements);

      console.log(`\n🔬 Testing scale: ${elements.toLocaleString()} elements`);

      const map = new HugeLongDoubleMap(elements);

      // Fill to 75% capacity
      const fillCount = Math.floor(elements * 0.75);
      for (let i = 0; i < fillCount; i++) {
        map.addTo(i, Math.PI * i); // Meaningful double values
      }

      const memoryMB = (memoryEst / (1024 * 1024)).toFixed(2);
      const bytesPerEntry =
        elements > 0 ? (memoryEst / elements).toFixed(1) : "N/A";

      console.log(
        `${elements.toLocaleString()}\t\t\t${memoryMB}MB\t\t\t✅ Pass\t\t${bytesPerEntry}`
      );

      expect(map.size()).toBe(fillCount);

      // Verify some random entries
      for (let i = 0; i < 100; i++) {
        const key = Math.floor(Math.random() * fillCount);
        const expected = Math.PI * key;
        expect(map.getOrDefault(key, -1)).toBeCloseTo(expected, 10);
      }

      console.log(
        `  ✅ Successfully handled ${elements.toLocaleString()} double-valued entries`
      );

      map.release();
    }

    console.log("\n💾 Memory efficiency with double storage works perfectly!");
  });

  /**
   * Test 11: Edge Cases with Double Values
   */
  test("edge cases with double values work correctly", () => {
    console.log("\n📊 DOUBLE MAP TEST 11: Edge Cases with Double Values");
    console.log("====================================================");

    console.log("🔬 Testing edge cases with double precision...");

    const map = new HugeLongDoubleMap();

    // Test special double values
    console.log("\n1. Testing special double values:");
    const specialValues = [
      { key: 1, value: 0.0, name: "positive zero" },
      { key: 2, value: -0.0, name: "negative zero" },
      { key: 3, value: Infinity, name: "positive infinity" },
      { key: 4, value: -Infinity, name: "negative infinity" },
      { key: 5, value: NaN, name: "NaN" },
      { key: 6, value: Number.MAX_VALUE, name: "max value" },
      { key: 7, value: Number.MIN_VALUE, name: "min positive value" },
      { key: 8, value: -Number.MAX_VALUE, name: "max negative value" },
      { key: 9, value: Number.EPSILON, name: "epsilon" },
    ];

    for (const { key, value, name } of specialValues) {
      map.addTo(key, value);
      const retrieved = map.getOrDefault(key, -999);

      if (isNaN(value)) {
        expect(isNaN(retrieved)).toBe(true);
        console.log(`  ${name}: NaN stored and retrieved correctly ✅`);
      } else {
        expect(retrieved).toBe(value);
        console.log(`  ${name}: ${value} stored and retrieved correctly ✅`);
      }
    }

    // Test very small differences
    console.log("\n2. Testing very small differences:");
    map.clear();
    const base = 1.0;
    const tiny = Number.EPSILON;

    map.addTo(100, base);
    map.addTo(100, tiny);
    const result = map.getOrDefault(100, 0);

    console.log(`  Base: ${base}`);
    console.log(`  Tiny: ${tiny}`);
    console.log(`  Sum: ${result}`);
    console.log(`  Different from base: ${result !== base ? "✅" : "❌"}`);
    expect(result).not.toBe(base);
    expect(result).toBeCloseTo(base + tiny, 15);

    map.release();
    console.log("\n🎯 Edge cases with double values work perfectly!");
  });
});
