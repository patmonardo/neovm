import { HugeLongLongMap } from "../HugeLongLongMap";

describe("HugeLongLongMap - Graph Algorithm Powerhouse", () => {
  /**
   * Test 1: Basic Map Creation and Memory Estimation
   */
  test("map creation and memory estimation work correctly", () => {
    console.log("\n🗺️ MAP TEST 1: Creation and Memory Estimation");
    console.log("==============================================");

    const testCapacities = [0, 1, 4, 100, 10000, 1000000];

    console.log("Expected\tMemory Est.\tActual Creation\tLoad Factor");
    console.log("--------\t-----------\t---------------\t-----------");

    for (const capacity of testCapacities) {
      console.log(
        `\n🔬 Testing map with expected elements: ${capacity.toLocaleString()}`
      );

      const memoryEst = HugeLongLongMap.memoryEstimationForSize(capacity);

      const map = new HugeLongLongMap(capacity);

      const memoryKB = (memoryEst / 1024).toFixed(1);
      const loadFactor = "0.75 (optimal)";

      console.log(
        `${capacity.toLocaleString()}\t\t${memoryKB}KB\t\t✅ Created\t\t${loadFactor}`
      );

      expect(map.size()).toBe(0);
      expect(map.isEmpty()).toBe(true);

      console.log(`  Size: ${map.size()}, Empty: ${map.isEmpty()}`);
      console.log(`  Memory usage: ${(map.sizeOf() / 1024).toFixed(1)}KB`);

      map.release();
    }

    console.log("\n🎯 Map creation and memory estimation work perfectly!");
  });

  /**
   * Test 2: Basic Put/Get Operations - Core Hash Table Functionality
   */
  test("put and get operations work correctly", () => {
    console.log("\n🗺️ MAP TEST 2: Basic Put/Get Operations");
    console.log("=======================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing basic key-value operations...");

    // Test single put/get
    console.log("\n1. Single put/get:");
    map.put(42, 777);
    console.log(
      `  Put: 42 → 777, Size: ${map.size()}, Empty: ${map.isEmpty()}`
    );
    expect(map.size()).toBe(1);
    expect(map.isEmpty()).toBe(false);

    const retrieved = map.getOrDefault(42, -1);
    console.log(`  Get: 42 → ${retrieved} ${retrieved === 777 ? "✅" : "❌"}`);
    expect(retrieved).toBe(777);

    // Test overwrite
    console.log("\n2. Testing overwrite:");
    map.put(42, 888);
    const overwritten = map.getOrDefault(42, -1);
    console.log(
      `  Overwrite: 42 → ${overwritten} (was 777, now 888) ${
        overwritten === 888 ? "✅" : "❌"
      }`
    );
    console.log(
      `  Size unchanged: ${map.size()} ${map.size() === 1 ? "✅" : "❌"}`
    );
    expect(overwritten).toBe(888);
    expect(map.size()).toBe(1);

    // Test multiple entries
    console.log("\n3. Testing multiple entries:");
    const testEntries = [
      { key: 100, value: 1001 },
      { key: 200, value: 2002 },
      { key: 300, value: 3003 },
      { key: 400, value: 4004 },
    ];

    for (const { key, value } of testEntries) {
      map.put(key, value);
      console.log(`  Put: ${key} → ${value}`);
    }

    console.log(`  Map size after additions: ${map.size()}`);
    expect(map.size()).toBe(5); // 1 original + 4 new

    // Verify all entries
    console.log("\n4. Verifying all entries:");
    expect(map.getOrDefault(42, -1)).toBe(888);
    for (const { key, value } of testEntries) {
      const retrieved = map.getOrDefault(key, -1);
      console.log(
        `  Verify: ${key} → ${retrieved} ${retrieved === value ? "✅" : "❌"}`
      );
      expect(retrieved).toBe(value);
    }

    map.release();
    console.log("\n🗺️ Put/Get operations work perfectly!");
  });

  /**
   * Test 3: ContainsKey and Default Values
   */
  test("containsKey and default values work correctly", () => {
    console.log("\n🗺️ MAP TEST 3: ContainsKey and Default Values");
    console.log("==============================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing key existence checking and defaults...");

    // Test containsKey on empty map
    console.log("\n1. Testing containsKey on empty map:");
    expect(map.containsKey(123)).toBe(false);
    console.log("  ✅ Empty map correctly reports no keys");

    // Test getOrDefault on empty map
    console.log("\n2. Testing getOrDefault on empty map:");
    const defaultValue = map.getOrDefault(123, 999);
    console.log(
      `  getOrDefault(123, 999) = ${defaultValue} ${
        defaultValue === 999 ? "✅" : "❌"
      }`
    );
    expect(defaultValue).toBe(999);

    // Add some entries
    console.log("\n3. Adding test entries:");
    map.put(10, 100);
    map.put(20, 200);
    map.put(30, 300);
    console.log("  Added: 10→100, 20→200, 30→300");

    // Test containsKey with existing keys
    console.log("\n4. Testing containsKey with existing keys:");
    expect(map.containsKey(10)).toBe(true);
    expect(map.containsKey(20)).toBe(true);
    expect(map.containsKey(30)).toBe(true);
    console.log("  ✅ All existing keys found");

    // Test containsKey with non-existing keys
    console.log("\n5. Testing containsKey with non-existing keys:");
    expect(map.containsKey(40)).toBe(false);
    expect(map.containsKey(999)).toBe(false);
    console.log("  ✅ Non-existing keys correctly reported as absent");

    // Test getOrDefault with existing keys
    console.log("\n6. Testing getOrDefault with existing keys:");
    expect(map.getOrDefault(10, -1)).toBe(100);
    expect(map.getOrDefault(20, -1)).toBe(200);
    expect(map.getOrDefault(30, -1)).toBe(300);
    console.log("  ✅ Existing keys return actual values, not defaults");

    // Test getOrDefault with non-existing keys
    console.log("\n7. Testing getOrDefault with non-existing keys:");
    expect(map.getOrDefault(40, -1)).toBe(-1);
    expect(map.getOrDefault(999, 777)).toBe(777);
    console.log("  ✅ Non-existing keys return default values");

    map.release();
    console.log("\n🗺️ ContainsKey and default values work perfectly!");
  });

  /**
   * Test 4: AddTo Operation - Critical for Graph Algorithms
   */
  test("addTo operation works correctly for accumulation", () => {
    console.log("\n🗺️ MAP TEST 4: AddTo Operation for Accumulation");
    console.log("===============================================");

    const map = new HugeLongLongMap();

    console.log(
      "🔬 Testing addTo for graph algorithm accumulation patterns..."
    );

    // Test addTo on non-existing key
    console.log("\n1. Testing addTo on non-existing key:");
    map.addTo(100, 50);
    console.log(`  addTo(100, 50) on empty map`);
    console.log(
      `  Result: 100 → ${map.getOrDefault(100, -1)} ${
        map.getOrDefault(100, -1) === 50 ? "✅" : "❌"
      }`
    );
    expect(map.getOrDefault(100, -1)).toBe(50);
    expect(map.size()).toBe(1);

    // Test addTo on existing key
    console.log("\n2. Testing addTo on existing key:");
    map.addTo(100, 25);
    console.log(`  addTo(100, 25) to existing value 50`);
    console.log(
      `  Result: 100 → ${map.getOrDefault(100, -1)} (50 + 25 = 75) ${
        map.getOrDefault(100, -1) === 75 ? "✅" : "❌"
      }`
    );
    expect(map.getOrDefault(100, -1)).toBe(75);
    expect(map.size()).toBe(1); // Size unchanged

    // Test degree counting simulation
    console.log("\n3. Simulating node degree counting:");
    const edges = [
      { source: 1, target: 2 },
      { source: 1, target: 3 },
      { source: 2, target: 3 },
      { source: 2, target: 4 },
      { source: 3, target: 4 },
      { source: 3, target: 5 },
    ];

    map.clear();
    console.log("  Processing edges to count node degrees:");
    for (const edge of edges) {
      map.addTo(edge.source, 1);
      map.addTo(edge.target, 1);
      console.log(`    Edge ${edge.source}→${edge.target}: degrees updated`);
    }

    console.log("\n  Node degrees:");
    for (let node = 1; node <= 5; node++) {
      const degree = map.getOrDefault(node, 0);
      console.log(`    Node ${node}: degree ${degree}`);
    }

    // Verify expected degrees
    expect(map.getOrDefault(1, 0)).toBe(2); // Connected to 2, 3
    expect(map.getOrDefault(2, 0)).toBe(3); // Connected to 1, 3, 4
    expect(map.getOrDefault(3, 0)).toBe(4); // Connected to 1, 2, 4, 5
    expect(map.getOrDefault(4, 0)).toBe(2); // Connected to 2, 3
    expect(map.getOrDefault(5, 0)).toBe(1); // Connected to 3
    // Test negative values
    console.log("\n4. Testing addTo with negative values:");
    map.put(100, 75); // ✅ RE-ESTABLISH the value first!
    map.addTo(100, -10);
    console.log(`  addTo(100, -10): subtracting from accumulated value`);
    const negativeResult = map.getOrDefault(100, -1);
    console.log(
      `  Result: 100 → ${negativeResult} (75 - 10 = 65) ${
        negativeResult === 65 ? "✅" : "❌"
      }`
    );
    expect(negativeResult).toBe(65); // ✅ Now this is correct!
    map.release();
    console.log("\n➕ AddTo operation works perfectly!");
  });

  /**
   * Test 5: Clear and Reuse Operations
   */
  test("clear and reuse operations work correctly", () => {
    console.log("\n🗺️ MAP TEST 5: Clear and Reuse Operations");
    console.log("=========================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing clear operation for algorithm reuse...");

    // Fill with data
    console.log("\n1. Filling map with test data:");
    for (let i = 1; i <= 10; i++) {
      map.put(i * 100, i * 1000);
    }
    console.log(`  Filled with 10 entries, size: ${map.size()}`);
    expect(map.size()).toBe(10);
    expect(map.isEmpty()).toBe(false);

    // Clear the map
    console.log("\n2. Clearing map:");
    map.clear();
    console.log(`  After clear - Size: ${map.size()}, Empty: ${map.isEmpty()}`);
    expect(map.size()).toBe(0);
    expect(map.isEmpty()).toBe(true);

    // Verify all keys are gone
    console.log("\n3. Verifying all keys are cleared:");
    for (let i = 1; i <= 10; i++) {
      const exists = map.containsKey(i * 100);
      console.log(
        `  Key ${i * 100} exists: ${exists} ${!exists ? "✅" : "❌"}`
      );
      expect(exists).toBe(false);
    }

    // Verify map is reusable
    console.log("\n4. Verifying map reusability:");
    map.put(555, 777);
    expect(map.size()).toBe(1);
    expect(map.getOrDefault(555, -1)).toBe(777);
    console.log("  ✅ Map reusable after clear");

    map.release();
    console.log("\n🧹 Clear and reuse operations work perfectly!");
  });

  /**
   * Test 6: Hash Distribution and Collision Handling
   */
  test("hash distribution and collision handling work correctly", () => {
    console.log("\n🗺️ MAP TEST 6: Hash Distribution and Collision Handling");
    console.log("======================================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing hash distribution and linear probing...");

    // Test with keys that might cause collisions
    console.log("\n1. Testing potential collision patterns:");
    const testKeys = [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9, // Sequential
      16,
      32,
      64,
      128,
      256,
      512,
      1024, // Powers of 2
      15,
      31,
      63,
      127,
      255,
      511,
      1023, // Powers of 2 - 1
      1000000,
      2000000,
      3000000,
      4000000, // Large numbers
    ];

    console.log("  Adding keys that might collide:");
    for (let i = 0; i < testKeys.length; i++) {
      const key = testKeys[i];
      const value = key * 10;
      map.put(key, value);
      console.log(`    Put: ${key} → ${value} (size: ${map.size()})`);
    }

    expect(map.size()).toBe(testKeys.length);

    // Verify all keys can be retrieved
    console.log("\n2. Verifying all keys can be retrieved:");
    for (const key of testKeys) {
      const expectedValue = key * 10;
      const actualValue = map.getOrDefault(key, -1);
      console.log(
        `    Get: ${key} → ${actualValue} ${
          actualValue === expectedValue ? "✅" : "❌"
        }`
      );
      expect(actualValue).toBe(expectedValue);
      expect(map.containsKey(key)).toBe(true);
    }

    // Test edge case: key 0
    console.log("\n3. Testing edge case - key 0:");
    map.clear();
    map.put(0, 999);
    const zeroValue = map.getOrDefault(0, -1);
    console.log(
      `  Key 0 → ${zeroValue} (should be 999) ${
        zeroValue === 999 ? "✅" : "❌"
      }`
    );
    console.log(
      `  Contains key 0: ${map.containsKey(0)} ${
        map.containsKey(0) ? "✅" : "❌"
      }`
    );
    expect(zeroValue).toBe(999);
    expect(map.containsKey(0)).toBe(true);

    map.release();
    console.log(
      "\n🎯 Hash distribution and collision handling work perfectly!"
    );
  });

  /**
   * Test 7: Iterator Operations
   */
  test("iterator operations work correctly", () => {
    console.log("\n🗺️ MAP TEST 7: Iterator Operations");
    console.log("==================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing map iteration...");

    // Test iterator on empty map
    console.log("\n1. Testing iterator on empty map:");
    const emptyEntries = Array.from(map);
    console.log(
      `  Empty map entries: [${emptyEntries.length}] ${
        emptyEntries.length === 0 ? "✅" : "❌"
      }`
    );
    expect(emptyEntries).toHaveLength(0);

    // Add test data
    console.log("\n2. Adding test data:");
    const testData = [
      { key: 10, value: 100 },
      { key: 20, value: 200 },
      { key: 30, value: 300 },
      { key: 40, value: 400 },
      { key: 50, value: 500 },
    ];

    for (const { key, value } of testData) {
      map.put(key, value);
      console.log(`  Added: ${key} → ${value}`);
    }

    // Test iterator
    console.log("\n3. Testing iterator:");
    const entries = Array.from(map);
    console.log(`  Iterator returned ${entries.length} entries`);
    expect(entries).toHaveLength(testData.length);

    // Verify all entries are present (order may vary due to hashing)
    console.log("\n4. Verifying all entries are present:");
    const foundKeys = new Set<number>();
    const foundValues = new Set<number>();

    for (const cursor of entries) {
      console.log(
        `    Entry: ${cursor.key} → ${cursor.value} (index: ${cursor.index})`
      );
      foundKeys.add(cursor.key);
      foundValues.add(cursor.value);

      // Verify cursor values match map contents
      expect(map.getOrDefault(cursor.key, -1)).toBe(cursor.value);
    }

    // Verify all original keys and values were found
    for (const { key, value } of testData) {
      expect(foundKeys.has(key)).toBe(true);
      expect(foundValues.has(value)).toBe(true);
    }

    console.log("  ✅ All entries found with correct values");

    // Test multiple iterations
    console.log("\n5. Testing multiple iterations:");
    const firstIteration = Array.from(map);
    const secondIteration = Array.from(map);
    console.log(`  First iteration: ${firstIteration.length} entries`);
    console.log(`  Second iteration: ${secondIteration.length} entries`);
    expect(firstIteration).toHaveLength(secondIteration.length);

    map.release();
    console.log("\n🔄 Iterator operations work perfectly!");
  });

  /**
   * Test 8: ToString Operation
   */
  test("toString operation works correctly", () => {
    console.log("\n🗺️ MAP TEST 8: ToString Operation");
    console.log("=================================");

    const map = new HugeLongLongMap();

    console.log("🔬 Testing string representation...");

    // Test empty map toString
    console.log("\n1. Testing empty map toString:");
    const emptyStr = map.toString();
    console.log(
      `  Empty map: "${emptyStr}" ${emptyStr === "[]" ? "✅" : "❌"}`
    );
    expect(emptyStr).toBe("[]");

    // Test single entry toString
    console.log("\n2. Testing single entry toString:");
    map.put(42, 777);
    const singleStr = map.toString();
    console.log(`  Single entry: "${singleStr}"`);
    expect(singleStr).toContain("42=>777");

    // Test multiple entries toString
    console.log("\n3. Testing multiple entries toString:");
    map.put(100, 1000);
    map.put(200, 2000);
    const multiStr = map.toString();
    console.log(`  Multiple entries: "${multiStr}"`);
    expect(multiStr).toContain("42=>777");
    expect(multiStr).toContain("100=>1000");
    expect(multiStr).toContain("200=>2000");

    map.release();
    console.log("\n📝 ToString operation works perfectly!");
  });

  /**
   * Test 9: Community Detection Simulation - Real Graph Algorithm
   */
  test("community detection simulation works correctly", () => {
    console.log("\n🗺️ MAP TEST 9: Community Detection Simulation");
    console.log("==============================================");

    const communities = new HugeLongLongMap();

    console.log("🔬 Simulating community detection algorithm...");

    // Create a graph with 3 communities
    const graph = {
      // Community 1: nodes 1-3
      1: [2, 3, 4], // Bridge node to community 2
      2: [1, 3],
      3: [1, 2],

      // Community 2: nodes 4-6
      4: [1, 5, 6, 7], // Bridge nodes
      5: [4, 6],
      6: [4, 5],

      // Community 3: nodes 7-9
      7: [4, 8, 9], // Bridge node
      8: [7, 9],
      9: [7, 8],
    };

    console.log("\nGraph structure (3 communities):");
    console.log("  Community 1: [1, 2, 3]");
    console.log("  Community 2: [4, 5, 6]");
    console.log("  Community 3: [7, 8, 9]");
    console.log("  Bridges: 1↔4, 4↔7");

    // Simulate community assignment
    console.log("\n1. Assigning nodes to communities:");
    const assignments = [
      { node: 1, community: 1 },
      { node: 2, community: 1 },
      { node: 3, community: 1 },
      { node: 4, community: 2 },
      { node: 5, community: 2 },
      { node: 6, community: 2 },
      { node: 7, community: 3 },
      { node: 8, community: 3 },
      { node: 9, community: 3 },
    ];

    for (const { node, community } of assignments) {
      communities.put(node, community);
      console.log(`  Node ${node} → Community ${community}`);
    }

    expect(communities.size()).toBe(9);

    // Verify community assignments
    console.log("\n2. Verifying community assignments:");
    for (const { node, community } of assignments) {
      const assignedCommunity = communities.getOrDefault(node, -1);
      console.log(
        `  Node ${node}: assigned to ${assignedCommunity} ${
          assignedCommunity === community ? "✅" : "❌"
        }`
      );
      expect(assignedCommunity).toBe(community);
    }

    // Count community sizes
    console.log("\n3. Counting community sizes:");
    const communitySizes = new HugeLongLongMap();
    for (const cursor of communities) {
      communitySizes.addTo(cursor.value, 1);
    }

    for (let communityId = 1; communityId <= 3; communityId++) {
      const size = communitySizes.getOrDefault(communityId, 0);
      console.log(
        `  Community ${communityId}: ${size} nodes ${size === 3 ? "✅" : "❌"}`
      );
      expect(size).toBe(3);
    }

    // Simulate community quality calculation
    console.log("\n4. Calculating intra-community edges:");
    const intraCommunityEdges = new HugeLongLongMap();

    for (const [node, neighbors] of Object.entries(graph)) {
      const nodeId = parseInt(node);
      const nodeCommunity = communities.getOrDefault(nodeId, -1);

      for (const neighbor of neighbors) {
        const neighborCommunity = communities.getOrDefault(neighbor, -1);
        if (nodeCommunity === neighborCommunity) {
          intraCommunityEdges.addTo(nodeCommunity, 1);
        }
      }
    }

    for (let communityId = 1; communityId <= 3; communityId++) {
      const intraEdges = intraCommunityEdges.getOrDefault(communityId, 0);
      console.log(
        `  Community ${communityId}: ${intraEdges} intra-community edges`
      );
    }

    communities.release();
    communitySizes.release();
    intraCommunityEdges.release();
    console.log("\n🌐 Community detection simulation works perfectly!");
  });

  /**
   * Test 10: Union-Find Parent Mapping Simulation
   */
  test("union-find parent mapping simulation works correctly", () => {
    console.log("\n🗺️ MAP TEST 10: Union-Find Parent Mapping");
    console.log("==========================================");

    const parentMap = new HugeLongLongMap();
    const rankMap = new HugeLongLongMap();

    console.log("🔬 Simulating Union-Find data structure...");

    // Initialize: each node is its own parent
    console.log("\n1. Initializing Union-Find structure:");
    const nodes = [1, 2, 3, 4, 5, 6, 7, 8];
    for (const node of nodes) {
      parentMap.put(node, node); // Self-parent initially
      rankMap.put(node, 0); // Rank 0 initially
      console.log(`  Node ${node}: parent=${node}, rank=0`);
    }

    // Find operation with path compression
    function find(x: number): number {
      const parent = parentMap.getOrDefault(x, x);
      if (parent !== x) {
        const root = find(parent);
        parentMap.put(x, root); // Path compression
        return root;
      }
      return x;
    }

    // Union operation by rank
    function union(x: number, y: number): void {
      const rootX = find(x);
      const rootY = find(y);

      if (rootX !== rootY) {
        const rankX = rankMap.getOrDefault(rootX, 0);
        const rankY = rankMap.getOrDefault(rootY, 0);

        if (rankX < rankY) {
          parentMap.put(rootX, rootY);
        } else if (rankX > rankY) {
          parentMap.put(rootY, rootX);
        } else {
          parentMap.put(rootY, rootX);
          rankMap.put(rootX, rankX + 1);
        }
      }
    }

    // Perform union operations
    console.log("\n2. Performing union operations:");
    const unions = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
      { x: 1, y: 3 }, // Connects {1,2} with {3,4}
      { x: 5, y: 7 }, // Adds 7 to {5,6}
    ];

    for (const { x, y } of unions) {
      console.log(`  Union(${x}, ${y})`);
      union(x, y);
    }

    // Verify connected components
    console.log("\n3. Verifying connected components:");
    const components = new Map<number, number[]>();

    for (const node of nodes) {
      const root = find(node);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(node);
    }

    console.log("  Connected components:");
    for (const [root, members] of components) {
      console.log(`    Component ${root}: [${members.join(", ")}]`);
    }

    // Verify specific connections
    console.log("\n4. Verifying specific connections:");
    expect(find(1)).toBe(find(2)); // 1 and 2 connected
    expect(find(1)).toBe(find(3)); // 1 and 3 connected
    expect(find(1)).toBe(find(4)); // 1 and 4 connected (through 3)
    expect(find(5)).toBe(find(6)); // 5 and 6 connected
    expect(find(5)).toBe(find(7)); // 5 and 7 connected
    expect(find(1)).not.toBe(find(5)); // Components 1-4 and 5-7 separate
    expect(find(1)).not.toBe(find(8)); // Node 8 isolated

    console.log("  ✅ All connections verified correctly");

    parentMap.release();
    rankMap.release();
    console.log("\n🔗 Union-Find simulation works perfectly!");
  });

  /**
   * Test 11: Performance Characteristics
   */
  test("performance characteristics are excellent", () => {
    console.log("\n🗺️ MAP TEST 11: Performance Characteristics");
    console.log("============================================");

    const capacity = 1000000;
    const map = new HugeLongLongMap(capacity);
    const operations = 500000;

    console.log(
      `🚀 Performance test: ${operations.toLocaleString()} operations on ${capacity.toLocaleString()} capacity map`
    );

    // Test put performance
    console.log("\n1. Testing put performance:");
    const putStart = performance.now();
    for (let i = 0; i < operations; i++) {
      map.put(i, i * 2);
    }
    const putEnd = performance.now();
    const putTime = putEnd - putStart;
    const putOpsPerSec = Math.round(operations / (putTime / 1000));

    console.log(`  Put time: ${putTime.toFixed(2)}ms`);
    console.log(`  Put ops/sec: ${putOpsPerSec.toLocaleString()}`);
    console.log(`  Final map size: ${map.size().toLocaleString()}`);

    // Test get performance
    console.log("\n2. Testing get performance:");
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
    console.log(
      `  Checksum: ${checksum.toLocaleString()} (prevents optimization)`
    );

    // Test addTo performance
    console.log("\n3. Testing addTo performance:");
    const addToStart = performance.now();
    for (let i = 0; i < operations / 10; i++) {
      map.addTo(i, 1); // Accumulate values
    }
    const addToEnd = performance.now();
    const addToTime = addToEnd - addToStart;
    const addToOpsPerSec = Math.round(operations / 10 / (addToTime / 1000));

    console.log(`  AddTo time: ${addToTime.toFixed(2)}ms`);
    console.log(`  AddTo ops/sec: ${addToOpsPerSec.toLocaleString()}`);

    // Performance expectations
    expect(putOpsPerSec).toBeGreaterThan(500000); // At least 500K puts/sec
    expect(getOpsPerSec).toBeGreaterThan(1000000); // At least 1M gets/sec
    expect(addToOpsPerSec).toBeGreaterThan(500000); // At least 500K addTo/sec

    map.release();
    console.log("\n⚡ Performance characteristics are excellent!");
  });

  /**
   * Test 12: Memory Efficiency and Large Scale
   */
  test("memory efficiency and large scale work correctly", () => {
    console.log("\n🗺️ MAP TEST 12: Memory Efficiency and Large Scale");
    console.log("==================================================");

    console.log("🔬 Testing memory efficiency for various scales...");

    const testScales = [1000, 10000, 100000, 1000000];

    console.log("\nElements\t\tEstimated Memory\tActual Test\tLoad Factor");
    console.log("--------\t\t----------------\t-----------\t-----------");

    for (const elements of testScales) {
      const memoryEst = HugeLongLongMap.memoryEstimationForSize(elements);

      console.log(`\n🔬 Testing scale: ${elements.toLocaleString()} elements`);

      const map = new HugeLongLongMap(elements);

      // Fill to 75% capacity (load factor)
      const fillCount = Math.floor(elements * 0.75);
      for (let i = 0; i < fillCount; i++) {
        map.put(i, i * 3);
      }

      const memoryMB = (memoryEst / (1024 * 1024)).toFixed(2);
      const actualLoadFactor = (map.size() / elements).toFixed(2);

      console.log(
        `${elements.toLocaleString()}\t\t\t${memoryMB}MB\t\t\t✅ Pass\t\t${actualLoadFactor}`
      );

      expect(map.size()).toBe(fillCount);

      // Verify some random entries
      for (let i = 0; i < 100; i++) {
        const key = Math.floor(Math.random() * fillCount);
        expect(map.getOrDefault(key, -1)).toBe(key * 3);
      }

      console.log(
        `  ✅ Successfully handled ${elements.toLocaleString()} element capacity`
      );

      map.release();
    }

    console.log("\n💾 Memory efficiency and large scale work perfectly!");
  });

  /**
   * Test 13: Edge Cases and Error Conditions
   */
  test("edge cases and error conditions work correctly", () => {
    console.log("\n🗺️ MAP TEST 13: Edge Cases and Error Conditions");
    console.log("================================================");

    console.log("🔬 Testing edge cases and error conditions...");

    // Test negative expected elements
    console.log("\n1. Testing negative expected elements:");
    expect(() => new HugeLongLongMap(-1)).toThrow(
      "Number of elements must be >= 0"
    );
    console.log("  ✅ Negative capacity rejected correctly");

    // Test very large keys and values
    console.log("\n2. Testing very large keys and values:");
    const map = new HugeLongLongMap();
    const largeKey = 9007199254740991; // Max safe integer
    const largeValue = 9007199254740990;

    map.put(largeKey, largeValue);
    expect(map.getOrDefault(largeKey, -1)).toBe(largeValue);
    expect(map.containsKey(largeKey)).toBe(true);
    console.log("  ✅ Large numbers handled correctly");

    // Test zero and negative numbers
    console.log("\n3. Testing zero and negative numbers:");
    map.clear();

    map.put(0, -1000);
    map.put(-100, 0);
    map.put(-999, -888);

    expect(map.getOrDefault(0, 999)).toBe(-1000);
    expect(map.getOrDefault(-100, 999)).toBe(0);
    expect(map.getOrDefault(-999, 999)).toBe(-888);
    console.log("  ✅ Zero and negative numbers work correctly");

    // Test operations after release
    console.log("\n4. Testing operations after release:");
    map.release();
    // Note: Operations after release may throw or behave unpredictably
    // This is expected behavior - just verify release doesn't crash
    console.log("  ✅ Release operation completed successfully");

    console.log("\n🎯 Edge cases and error conditions handled perfectly!");
  });
});
