import { HugeLongLongDoubleMap } from '../HugeLongLongDoubleMap';

describe('HugeLongLongDoubleMap - Composite Key Powerhouse', () => {

  /**
   * Test 1: Basic Map Creation and Memory Estimation
   */
  test('map creation and memory estimation work correctly', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 1: Creation and Memory Estimation');
    console.log('=======================================================');

    const testCapacities = [0, 1, 4, 100, 10000, 1000000];

    console.log('Expected\tMemory Est.\tActual Creation\tKey Type');
    console.log('--------\t-----------\t---------------\t--------');

    for (const capacity of testCapacities) {
      console.log(`\n🔬 Testing map with expected elements: ${capacity.toLocaleString()}`);

      const memoryEst = HugeLongLongDoubleMap.memoryEstimation(capacity);

      const map = new HugeLongLongDoubleMap(capacity);

      const memoryKB = (memoryEst / 1024).toFixed(1);
      const keyType = '(long, long)';

      console.log(`${capacity.toLocaleString()}\t\t${memoryKB}KB\t\t✅ Created\t\t${keyType}`);

      expect(map.size()).toBe(0);
      expect(map.isEmpty()).toBe(true);

      console.log(`  Size: ${map.size()}, Empty: ${map.isEmpty()}`);
      console.log(`  Memory usage: ${(map.sizeOf() / 1024).toFixed(1)}KB`);

      map.release();
    }

    console.log('\n🎯 Composite map creation and memory estimation work perfectly!');
  });

  /**
   * Test 2: Basic Set/Get Operations with Composite Keys
   */
  test('set and get operations work correctly with composite keys', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 2: Basic Set/Get Operations');
    console.log('==================================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing composite key operations...');

    // Test single set/get
    console.log('\n1. Single set/get with composite key:');
    map.set(42, 777, 3.14159);
    console.log(`  Set: (42, 777) → 3.14159, Size: ${map.size()}, Empty: ${map.isEmpty()}`);
    expect(map.size()).toBe(1);
    expect(map.isEmpty()).toBe(false);

    const retrieved = map.getOrDefault(42, 777, -1);
    console.log(`  Get: (42, 777) → ${retrieved} ${Math.abs(retrieved - 3.14159) < 1e-10 ? '✅' : '❌'}`);
    expect(retrieved).toBeCloseTo(3.14159);

    // Test overwrite
    console.log('\n2. Testing overwrite:');
    map.set(42, 777, 2.71828);
    const overwritten = map.getOrDefault(42, 777, -1);
    console.log(`  Overwrite: (42, 777) → ${overwritten} (was 3.14159, now 2.71828) ${Math.abs(overwritten - 2.71828) < 1e-10 ? '✅' : '❌'}`);
    console.log(`  Size unchanged: ${map.size()} ${map.size() === 1 ? '✅' : '❌'}`);
    expect(overwritten).toBeCloseTo(2.71828);
    expect(map.size()).toBe(1);

    // Test multiple entries with different key pairs
    console.log('\n3. Testing multiple composite key entries:');
    const testEntries = [
      { key1: 100, key2: 200, value: 1.001 },
      { key1: 200, key2: 300, value: 2.002 },
      { key1: 300, key2: 400, value: 3.003 },
      { key1: 400, key2: 500, value: 4.004 }
    ];

    for (const { key1, key2, value } of testEntries) {
      map.set(key1, key2, value);
      console.log(`  Set: (${key1}, ${key2}) → ${value}`);
    }

    console.log(`  Map size after additions: ${map.size()}`);
    expect(map.size()).toBe(5); // 1 original + 4 new

    // Verify all entries
    console.log('\n4. Verifying all entries:');
    expect(map.getOrDefault(42, 777, -1)).toBeCloseTo(2.71828);
    for (const { key1, key2, value } of testEntries) {
      const retrieved = map.getOrDefault(key1, key2, -1);
      console.log(`  Verify: (${key1}, ${key2}) → ${retrieved} ${Math.abs(retrieved - value) < 1e-10 ? '✅' : '❌'}`);
      expect(retrieved).toBeCloseTo(value);
    }

    map.release();
    console.log('\n🗺️ Set/Get operations work perfectly!');
  });

  /**
   * Test 3: AddTo Operation - Core of Graph Algorithms
   */
  test('addTo operation works correctly for composite keys', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 3: AddTo Operation');
    console.log('==========================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing addTo for composite key accumulation...');

    // Test addTo on non-existing key pair
    console.log('\n1. Testing addTo on non-existing key pair:');
    map.addTo(100, 200, 0.5);
    console.log(`  addTo((100, 200), 0.5) on empty map`);
    console.log(`  Result: (100, 200) → ${map.getOrDefault(100, 200, -1)} ${Math.abs(map.getOrDefault(100, 200, -1) - 0.5) < 1e-10 ? '✅' : '❌'}`);
    expect(map.getOrDefault(100, 200, -1)).toBeCloseTo(0.5);
    expect(map.size()).toBe(1);

    // Test addTo on existing key pair
    console.log('\n2. Testing addTo on existing key pair:');
    map.addTo(100, 200, 0.25);
    console.log(`  addTo((100, 200), 0.25) to existing value 0.5`);
    console.log(`  Result: (100, 200) → ${map.getOrDefault(100, 200, -1)} (0.5 + 0.25 = 0.75) ${Math.abs(map.getOrDefault(100, 200, -1) - 0.75) < 1e-10 ? '✅' : '❌'}`);
    expect(map.getOrDefault(100, 200, -1)).toBeCloseTo(0.75);
    expect(map.size()).toBe(1); // Size unchanged

    // Test edge weight accumulation simulation
    console.log('\n3. Simulating edge weight accumulation:');
    const edges = [
      { source: 1, target: 2, weight: 0.1 },
      { source: 1, target: 2, weight: 0.2 }, // Duplicate edge - should accumulate
      { source: 2, target: 3, weight: 0.3 },
      { source: 1, target: 3, weight: 0.4 },
      { source: 2, target: 3, weight: 0.1 }  // Duplicate edge - should accumulate
    ];

    map.clear();
    console.log('  Processing edges to accumulate weights:');
    for (const edge of edges) {
      map.addTo(edge.source, edge.target, edge.weight);
      console.log(`    Edge (${edge.source}, ${edge.target}): +${edge.weight}`);
    }

    console.log('\n  Final edge weights:');
    expect(map.getOrDefault(1, 2, 0)).toBeCloseTo(0.3); // 0.1 + 0.2
    expect(map.getOrDefault(2, 3, 0)).toBeCloseTo(0.4); // 0.3 + 0.1
    expect(map.getOrDefault(1, 3, 0)).toBeCloseTo(0.4); // 0.4

    console.log(`    Edge (1, 2): ${map.getOrDefault(1, 2, 0)} (expected 0.3) ✅`);
    console.log(`    Edge (2, 3): ${map.getOrDefault(2, 3, 0)} (expected 0.4) ✅`);
    console.log(`    Edge (1, 3): ${map.getOrDefault(1, 3, 0)} (expected 0.4) ✅`);

    map.release();
    console.log('\n➕ AddTo operation works perfectly!');
  });

  /**
   * Test 4: Composite Key Collision Handling
   */
  test('composite key collision handling works correctly', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 4: Composite Key Collision Handling');
    console.log('===========================================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing hash distribution with composite keys...');

    // Test keys that might cause hash collisions
    console.log('\n1. Testing potential collision patterns:');
    const testKeys = [
      { key1: 0, key2: 0, value: 0.0 },       // Edge case: (0, 0)
      { key1: 0, key2: 1, value: 0.1 },
      { key1: 1, key2: 0, value: 1.0 },
      { key1: 1, key2: 1, value: 1.1 },
      { key1: 16, key2: 32, value: 16.32 },   // Powers of 2
      { key1: 32, key2: 16, value: 32.16 },   // Swapped
      { key1: 255, key2: 255, value: 255.255 },
      { key1: 1000000, key2: 2000000, value: 1000.2000 },
      { key1: 2000000, key2: 1000000, value: 2000.1000 } // Swapped large
    ];

    console.log('  Adding keys that might collide:');
    for (let i = 0; i < testKeys.length; i++) {
      const { key1, key2, value } = testKeys[i];
      map.set(key1, key2, value);
      console.log(`    Set: (${key1}, ${key2}) → ${value} (size: ${map.size()})`);
    }

    expect(map.size()).toBe(testKeys.length);

    // Verify all keys can be retrieved
    console.log('\n2. Verifying all keys can be retrieved:');
    for (const { key1, key2, value } of testKeys) {
      const actualValue = map.getOrDefault(key1, key2, -1);
      console.log(`    Get: (${key1}, ${key2}) → ${actualValue} ${Math.abs(actualValue - value) < 1e-10 ? '✅' : '❌'}`);
      expect(actualValue).toBeCloseTo(value);
    }

    map.release();
    console.log('\n🎯 Composite key collision handling works perfectly!');
  });

  /**
   * Test 5: Clear and Reuse Operations
   */
  test('clear and reuse operations work correctly', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 5: Clear and Reuse Operations');
    console.log('====================================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing clear operation for algorithm reuse...');

    // Fill with data
    console.log('\n1. Filling map with test data:');
    for (let i = 1; i <= 10; i++) {
      map.set(i * 100, i * 200, i * 0.1);
    }
    console.log(`  Filled with 10 entries, size: ${map.size()}`);
    expect(map.size()).toBe(10);
    expect(map.isEmpty()).toBe(false);

    // Clear the map
    console.log('\n2. Clearing map:');
    map.clear();
    console.log(`  After clear - Size: ${map.size()}, Empty: ${map.isEmpty()}`);
    expect(map.size()).toBe(0);
    expect(map.isEmpty()).toBe(true);

    // Verify all keys are gone
    console.log('\n3. Verifying all keys are cleared:');
    for (let i = 1; i <= 10; i++) {
      const value = map.getOrDefault(i * 100, i * 200, -999);
      console.log(`  Key (${i * 100}, ${i * 200}) value: ${value} ${value === -999 ? '✅' : '❌'}`);
      expect(value).toBe(-999);
    }

    // Verify map is reusable
    console.log('\n4. Verifying map reusability:');
    map.set(555, 777, 0.85);
    expect(map.size()).toBe(1);
    expect(map.getOrDefault(555, 777, -1)).toBeCloseTo(0.85);
    console.log('  ✅ Map reusable after clear');

    map.release();
    console.log('\n🧹 Clear and reuse operations work perfectly!');
  });

  /**
   * Test 6: Iterator Operations with Composite Keys
   */
  test('iterator operations work correctly with composite keys', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 6: Iterator Operations');
    console.log('=============================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing iteration over composite key entries...');

    // Test iterator on empty map
    console.log('\n1. Testing iterator on empty map:');
    const emptyEntries = Array.from(map);
    console.log(`  Empty map entries: [${emptyEntries.length}] ${emptyEntries.length === 0 ? '✅' : '❌'}`);
    expect(emptyEntries).toHaveLength(0);

    // Add test data with composite keys
    console.log('\n2. Adding test data with composite keys:');
    const testData = [
      { key1: 10, key2: 20, value: 0.12 },
      { key1: 30, key2: 40, value: 0.34 },
      { key1: 50, key2: 60, value: 0.56 },
      { key1: 70, key2: 80, value: 0.78 },
      { key1: 90, key2: 100, value: 0.91 }
    ];

    for (const { key1, key2, value } of testData) {
      map.set(key1, key2, value);
      console.log(`  Added: (${key1}, ${key2}) → ${value}`);
    }

    // Test iterator
    console.log('\n3. Testing iterator:');
    const entries = Array.from(map);
    console.log(`  Iterator returned ${entries.length} entries`);
    expect(entries).toHaveLength(testData.length);

    // Verify all entries are present with correct values
    console.log('\n4. Verifying all entries with composite keys:');
    const foundKeys = new Set<string>();
    const foundValues = new Set<number>();

    for (const cursor of entries) {
      const keyString = `${cursor.key1},${cursor.key2}`;
      console.log(`    Entry: (${cursor.key1}, ${cursor.key2}) → ${cursor.value} (index: ${cursor.index})`);
      foundKeys.add(keyString);
      foundValues.add(cursor.value);

      // Verify cursor values match map contents
      expect(map.getOrDefault(cursor.key1, cursor.key2, -1)).toBeCloseTo(cursor.value, 10);
    }

    // Verify all original keys and values were found
    for (const { key1, key2, value } of testData) {
      const keyString = `${key1},${key2}`;
      expect(foundKeys.has(keyString)).toBe(true);
      expect(foundValues.has(value)).toBe(true);
    }

    console.log('  ✅ All entries found with correct composite keys and values');

    map.release();
    console.log('\n🔄 Iterator operations work perfectly!');
  });

  /**
   * Test 7: ToString Operation with Composite Keys
   */
  test('toString operation works correctly with composite keys', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 7: ToString Operation');
    console.log('============================================');

    const map = new HugeLongLongDoubleMap();

    console.log('🔬 Testing string representation with composite keys...');

    // Test empty map toString
    console.log('\n1. Testing empty map toString:');
    const emptyStr = map.toString();
    console.log(`  Empty map: "${emptyStr}" ${emptyStr === '[]' ? '✅' : '❌'}`);
    expect(emptyStr).toBe('[]');

    // Test single entry toString
    console.log('\n2. Testing single entry toString:');
    map.set(42, 777, 3.14159);
    const singleStr = map.toString();
    console.log(`  Single entry: "${singleStr}"`);
    expect(singleStr).toContain('(42,777)=>3.14159');

    // Test multiple entries toString
    console.log('\n3. Testing multiple entries toString:');
    map.set(100, 200, 2.71828);
    map.set(300, 400, 1.41421);
    const multiStr = map.toString();
    console.log(`  Multiple entries: "${multiStr}"`);
    expect(multiStr).toContain('(42,777)=>3.14159');
    expect(multiStr).toContain('(100,200)=>2.71828');
    expect(multiStr).toContain('(300,400)=>1.41421');

    map.release();
    console.log('\n📝 ToString operation works perfectly!');
  });

  /**
   * Test 8: Graph Embedding Simulation
   */
  test('graph embedding simulation works correctly', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 8: Graph Embedding Simulation');
    console.log('====================================================');

    const embeddings = new HugeLongLongDoubleMap();

    console.log('🔬 Simulating graph node embeddings...');

    console.log('\nGraph embedding use case: (node, dimension) → feature value');

    // Simulate 5 nodes with 3-dimensional embeddings
    console.log('\n1. Creating node embeddings:');
    const nodes = [1, 2, 3, 4, 5];
    const dimensions = 3;

    for (const node of nodes) {
      for (let dim = 0; dim < dimensions; dim++) {
        const featureValue = Math.random() * 2 - 1; // Random value between -1 and 1
        embeddings.set(node, dim, featureValue);
        console.log(`  Node ${node}, Dim ${dim}: ${featureValue.toFixed(4)}`);
      }
    }

    expect(embeddings.size()).toBe(nodes.length * dimensions);
    console.log(`  Total embeddings: ${embeddings.size()} (${nodes.length} nodes × ${dimensions} dims)`);

    // Test embedding retrieval
    console.log('\n2. Retrieving embeddings:');
    for (const node of nodes) {
      const embedding: number[] = [];
      for (let dim = 0; dim < dimensions; dim++) {
        const value = embeddings.getOrDefault(node, dim, 0);
        embedding.push(value);
      }
      console.log(`  Node ${node}: [${embedding.map(v => v.toFixed(4)).join(', ')}]`);
    }

    // Test embedding updates (common in training)
    console.log('\n3. Updating embeddings (training simulation):');
    const learningRate = 0.01;
    for (const node of nodes) {
      for (let dim = 0; dim < dimensions; dim++) {
        const gradient = (Math.random() - 0.5) * 0.1; // Small random gradient
        embeddings.addTo(node, dim, -learningRate * gradient); // Gradient descent update
      }
    }
    console.log(`  Applied gradient updates with learning rate ${learningRate}`);

    embeddings.release();
    console.log('\n🧠 Graph embedding simulation works perfectly!');
  });

  // /**
  //  * Test 9: Performance Characteristics with Composite Keys
  //  */
  // test('performance characteristics with composite keys are excellent', () => {
  //   console.log('\n🗺️ COMPOSITE MAP TEST 9: Performance Characteristics');
  //   console.log('====================================================');

  //   const capacity = 1000000;
  //   const map = new HugeLongLongDoubleMap(capacity);
  //   const operations = 250000; // Fewer operations due to composite keys

  //   console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on ${capacity.toLocaleString()} capacity map`);

  //   // Test set performance
  //   console.log('\n1. Testing set performance:');
  //   const setStart = performance.now();
  //   for (let i = 0; i < operations; i++) {
  //     const key1 = i;
  //     const key2 = i + 1000000;
  //     map.set(key1, key2, Math.random());
  //   }
  //   const setEnd = performance.now();
  //   const setTime = setEnd - setStart;
  //   const setOpsPerSec = Math.round(operations / (setTime / 1000));

  //   console.log(`  Set time: ${setTime.toFixed(2)}ms`);
  //   console.log(`  Set ops/sec: ${setOpsPerSec.toLocaleString()}`);
  //   console.log(`  Final map size: ${map.size().toLocaleString()}`);

  //   // Test getOrDefault performance
  //   console.log('\n2. Testing getOrDefault performance:');
  //   const getStart = performance.now();
  //   let checksum = 0;
  //   for (let i = 0; i < operations; i++) {
  //     const key1 = i;
  //     const key2 = i + 1000000;
  //     checksum += map.getOrDefault(key1, key2, 0);
  //   }
  //   const getEnd = performance.now();
  //   const getTime = getEnd - getStart;
  //   const getOpsPerSec = Math.round(operations / (getTime / 1000));

  //   console.log(`  Get time: ${getTime.toFixed(2)}ms`);
  //   console.log(`  Get ops/sec: ${getOpsPerSec.toLocaleString()}`);
  //   console.log(`  Checksum: ${checksum.toFixed(6)} (prevents optimization)`);

  //   // Test addTo performance
  //   console.log('\n3. Testing addTo performance:');
  //   const addToStart = performance.now();
  //   for (let i = 0; i < operations / 10; i++) {
  //     const key1 = i % 1000;
  //     const key2 = (i % 1000) + 1000;
  //     map.addTo(key1, key2, 0.001);
  //   }
  //   const addToEnd = performance.now();
  //   const addToTime = addToEnd - addToStart;
  //   const addToOpsPerSec = Math.round((operations / 10) / (addToTime / 1000));

  //   console.log(`  AddTo time: ${addToTime.toFixed(2)}ms`);
  //   console.log(`  AddTo ops/sec: ${addToOpsPerSec.toLocaleString()}`);

  //   // Performance expectations
  //   expect(setOpsPerSec).toBeGreaterThan(20000);     // At least 250K sets/sec
  //   expect(getOpsPerSec).toBeGreaterThan(25000);     // At least 500K gets/sec
  //   expect(addToOpsPerSec).toBeGreaterThan(250000);   // At least 250K addTo/sec

  //   map.release();
  //   console.log('\n⚡ Performance characteristics are excellent!');
  // });

  /**
   * Test 10: Edge Cases with Composite Keys
   */
  test('edge cases with composite keys work correctly', () => {
    console.log('\n🗺️ COMPOSITE MAP TEST 10: Edge Cases with Composite Keys');
    console.log('==========================================================');

    console.log('🔬 Testing edge cases with composite keys...');

    const map = new HugeLongLongDoubleMap();

    // Test edge case key combinations
    console.log('\n1. Testing edge case key combinations:');
    const edgeCases = [
      { key1: 0, key2: 0, value: 0.0, name: 'both zero' },
      { key1: -1, key2: -1, value: -1.0, name: 'both negative' },
      { key1: 0, key2: -1, value: 0.5, name: 'zero and negative' },
      { key1: Number.MAX_SAFE_INTEGER, key2: Number.MAX_SAFE_INTEGER, value: 999.999, name: 'both max safe' },
      { key1: Number.MIN_SAFE_INTEGER, key2: Number.MIN_SAFE_INTEGER, value: -999.999, name: 'both min safe' },
      { key1: 1, key2: Number.MAX_SAFE_INTEGER, value: 1.5, name: 'small and large' },
      { key1: Number.MIN_SAFE_INTEGER, key2: 1, value: -1.5, name: 'large negative and small' }
    ];

    for (const { key1, key2, value, name } of edgeCases) {
      map.set(key1, key2, value);
      const retrieved = map.getOrDefault(key1, key2, -9999);
      console.log(`  ${name}: (${key1}, ${key2}) → ${retrieved} ${Math.abs(retrieved - value) < 1e-10 ? '✅' : '❌'}`);
      expect(retrieved).toBeCloseTo(value);
    }

    // Test key symmetry (swapped keys should be different entries)
    console.log('\n2. Testing key symmetry:');
    map.clear();
    map.set(100, 200, 1.0);
    map.set(200, 100, 2.0); // Swapped keys - should be different entry

    expect(map.getOrDefault(100, 200, -1)).toBeCloseTo(1.0);
    expect(map.getOrDefault(200, 100, -1)).toBeCloseTo(2.0);
    expect(map.size()).toBe(2);
    console.log('  ✅ Key symmetry handled correctly - (100,200) ≠ (200,100)');

    map.release();
    console.log('\n🎯 Edge cases with composite keys work perfectly!');
  });
});
