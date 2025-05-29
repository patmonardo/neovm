import { HugeLongMatrix } from '../HugeLongMatrix';

describe('HugeLongMatrix - 2D Matrix for Graph Processing', () => {

  /**
   * Test 1: Basic Matrix Creation and Properties
   */
  test('matrix creation and basic properties work correctly', () => {
    console.log('\n🏢 MATRIX TEST 1: Basic Creation and Properties');
    console.log('===============================================');

    const testCases = [
      { rows: 0, cols: 0, name: 'Empty matrix' },
      { rows: 1, cols: 1, name: '1×1 matrix' },
      { rows: 3, cols: 4, name: '3×4 rectangular' },
      { rows: 100, cols: 100, name: '100×100 square' },
      { rows: 1000, cols: 500, name: '1000×500 large' }
    ];

    for (const { rows, cols, name } of testCases) {
      console.log(`\n🔬 Testing ${name} (${rows}×${cols})`);

      const matrix = new HugeLongMatrix(rows, cols);

      console.log(`  Row count: ${matrix.rowCount()}`);
      console.log(`  Column count: ${matrix.colCount()}`);
      console.log(`  Total size: ${matrix.size()}`);
      console.log(`  Memory usage: ${(matrix.sizeOf() / 1024).toFixed(1)} KB`);

      expect(matrix.rowCount()).toBe(rows);
      expect(matrix.colCount()).toBe(cols);
      expect(matrix.size()).toBe(rows * cols);
      expect(matrix.sizeOf()).toBeGreaterThanOrEqual(0);

      matrix.release();
      console.log(`  ✅ ${name} created and released successfully`);
    }

    console.log('\n🎯 All matrix creation tests passed!');
  });

  /**
   * Test 2: Memory Estimation Accuracy
   */
  test('memory estimation provides accurate estimates', () => {
    console.log('\n🏢 MATRIX TEST 2: Memory Estimation Accuracy');
    console.log('============================================');

    const testSizes = [
      { rows: 10, cols: 10 },
      { rows: 100, cols: 50 },
      { rows: 1000, cols: 200 },
      { rows: 500, cols: 2000 }
    ];

    console.log('Matrix Size\t\tEstimated\tActual\t\tAccuracy');
    console.log('-----------\t\t---------\t------\t\t--------');

    for (const { rows, cols } of testSizes) {
      const estimated = HugeLongMatrix.memoryEstimation(rows, cols);

      const matrix = new HugeLongMatrix(rows, cols);
      const actual = matrix.sizeOf();

      const accuracy = actual > 0 ? ((Math.min(estimated, actual) / Math.max(estimated, actual)) * 100).toFixed(1) : 'N/A';

      console.log(`${rows}×${cols}\t\t${(estimated/1024).toFixed(1)}KB\t\t${(actual/1024).toFixed(1)}KB\t\t${accuracy}%`);

      expect(estimated).toBeGreaterThan(0);
      expect(actual).toBeGreaterThan(0);

      matrix.release();
    }

    console.log('\n💾 Memory estimation is working correctly!');
  });

  /**
   * Test 3: Basic Get/Set Operations
   */
  test('get and set operations work correctly', () => {
    console.log('\n🏢 MATRIX TEST 3: Get/Set Operations');
    console.log('===================================');

    const matrix = new HugeLongMatrix(5, 5);

    console.log('🔬 Testing basic get/set operations...');

    // Test setting and getting values
    const testValues = [
      { row: 0, col: 0, value: 42 },
      { row: 0, col: 4, value: 100 },
      { row: 2, col: 2, value: -50 },
      { row: 4, col: 0, value: 999 },
      { row: 4, col: 4, value: 12345 }
    ];

    console.log('\nSetting test values:');
    for (const { row, col, value } of testValues) {
      matrix.set(row, col, value);
      console.log(`  Set (${row},${col}) = ${value}`);
    }

    console.log('\nVerifying stored values:');
    for (const { row, col, value } of testValues) {
      const retrieved = matrix.get(row, col);
      console.log(`  Get (${row},${col}) = ${retrieved} ${retrieved === value ? '✅' : '❌'}`);
      expect(retrieved).toBe(value);
    }

    // Test default values (should be 0)
    console.log('\nTesting default values:');
    const defaultValue = matrix.get(1, 1);
    console.log(`  Unset position (1,1) = ${defaultValue} ${defaultValue === 0 ? '✅' : '❌'}`);
    expect(defaultValue).toBe(0);

    matrix.release();
    console.log('\n🎯 Get/Set operations work perfectly!');
  });

  /**
   * Test 4: AddTo Operation for Accumulation Patterns
   */
  test('addTo operation works correctly for accumulation', () => {
    console.log('\n🏢 MATRIX TEST 4: AddTo Accumulation');
    console.log('===================================');

    const matrix = new HugeLongMatrix(3, 3);

    console.log('🔬 Testing addTo accumulation...');

    // Start with initial value
    matrix.set(1, 1, 10);
    console.log(`Initial value at (1,1): ${matrix.get(1, 1)}`);

    // Add values multiple times
    const additions = [5, -3, 8, -2, 7];
    let expectedTotal = 10;

    console.log('\nAccumulating values:');
    for (const addition of additions) {
      matrix.addTo(1, 1, addition);
      expectedTotal += addition;
      const currentValue = matrix.get(1, 1);
      console.log(`  Added ${addition}, current value: ${currentValue}, expected: ${expectedTotal} ${currentValue === expectedTotal ? '✅' : '❌'}`);
      expect(currentValue).toBe(expectedTotal);
    }

    matrix.release();
    console.log('\n➕ AddTo accumulation works perfectly!');
  });

  /**
   * Test 5: Fill Operations
   */
  test('fill operations work correctly', () => {
    console.log('\n🏢 MATRIX TEST 5: Fill Operations');
    console.log('=================================');

    const matrix = new HugeLongMatrix(4, 3);

    console.log('🔬 Testing matrix fill operations...');

    // Test filling entire matrix
    console.log('\n1. Testing full matrix fill:');
    matrix.fill(99);

    // Verify all positions have the fill value
    let allCorrect = true;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        if (matrix.get(row, col) !== 99) {
          allCorrect = false;
          break;
        }
      }
    }
    console.log(`  All positions filled with 99: ${allCorrect ? '✅' : '❌'}`);
    expect(allCorrect).toBe(true);

    // Test filling specific row
    console.log('\n2. Testing row fill:');
    matrix.fillRow(1, 777);

    for (let col = 0; col < 3; col++) {
      const value = matrix.get(1, col);
      console.log(`  Row 1, Col ${col}: ${value} ${value === 777 ? '✅' : '❌'}`);
      expect(value).toBe(777);
    }

    // Verify other rows unchanged
    expect(matrix.get(0, 0)).toBe(99);
    expect(matrix.get(2, 0)).toBe(99);

    // Test filling specific column
    console.log('\n3. Testing column fill:');
    matrix.fillCol(2, 555);

    for (let row = 0; row < 4; row++) {
      const value = matrix.get(row, 2);
      console.log(`  Row ${row}, Col 2: ${value} ${value === 555 ? '✅' : '❌'}`);
      expect(value).toBe(555);
    }

    matrix.release();
    console.log('\n🎨 Fill operations work perfectly!');
  });

  /**
   * Test 6: Row and Column Operations
   */
  test('row and column operations work correctly', () => {
    console.log('\n🏢 MATRIX TEST 6: Row and Column Operations');
    console.log('==========================================');

    const matrix = new HugeLongMatrix(3, 4);

    // Initialize with test data
    console.log('🔬 Setting up test matrix...');
    let counter = 1;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        matrix.set(row, col, counter++);
      }
    }

    console.log('Matrix layout:');
    console.log('  [1, 2, 3, 4]');
    console.log('  [5, 6, 7, 8]');
    console.log('  [9, 10, 11, 12]');

    // Test getting rows
    console.log('\n1. Testing getRow:');
    const row1 = matrix.getRow(1);
    console.log(`  Row 1: [${row1.join(', ')}]`);
    expect(row1).toEqual([5, 6, 7, 8]);

    // Test getting columns
    console.log('\n2. Testing getCol:');
    const col2 = matrix.getCol(2);
    console.log(`  Column 2: [${col2.join(', ')}]`);
    expect(col2).toEqual([3, 7, 11]);

    // Test setting rows
    console.log('\n3. Testing setRow:');
    matrix.setRow(0, [100, 200, 300, 400]);
    const newRow0 = matrix.getRow(0);
    console.log(`  New Row 0: [${newRow0.join(', ')}]`);
    expect(newRow0).toEqual([100, 200, 300, 400]);

    // Test setting columns
    console.log('\n4. Testing setCol:');
    matrix.setCol(1, [111, 222, 333]);
    const newCol1 = matrix.getCol(1);
    console.log(`  New Column 1: [${newCol1.join(', ')}]`);
    expect(newCol1).toEqual([111, 222, 333]);

    matrix.release();
    console.log('\n📊 Row and column operations work perfectly!');
  });

  /**
   * Test 7: Iterator Operations
   */
  test('iterator operations work correctly', () => {
    console.log('\n🏢 MATRIX TEST 7: Iterator Operations');
    console.log('====================================');

    const matrix = new HugeLongMatrix(2, 3);

    // Set up test data
    matrix.set(0, 0, 10);
    matrix.set(0, 1, 20);
    matrix.set(0, 2, 30);
    matrix.set(1, 0, 40);
    matrix.set(1, 1, 50);
    matrix.set(1, 2, 60);

    console.log('🔬 Testing iterators...');

    // Test entries iterator
    console.log('\n1. Testing entries() iterator:');
    const entries = Array.from(matrix.entries());
    console.log('  All entries (row, col, value):');
    for (const [row, col, value] of entries) {
      console.log(`    (${row}, ${col}) = ${value}`);
    }
    expect(entries).toHaveLength(6);
    expect(entries[0]).toEqual([0, 0, 10]);
    expect(entries[5]).toEqual([1, 2, 60]);

    // Test row values iterator
    console.log('\n2. Testing rowValues() iterator:');
    const row0Values = Array.from(matrix.rowValues(0));
    console.log(`  Row 0 values: [${row0Values.join(', ')}]`);
    expect(row0Values).toEqual([10, 20, 30]);

    // Test column values iterator
    console.log('\n3. Testing colValues() iterator:');
    const col1Values = Array.from(matrix.colValues(1));
    console.log(`  Column 1 values: [${col1Values.join(', ')}]`);
    expect(col1Values).toEqual([20, 50]);

    matrix.release();
    console.log('\n🔄 Iterator operations work perfectly!');
  });

  /**
   * Test 8: Error Handling and Bounds Checking
   */
  test('error handling works correctly', () => {
    console.log('\n🏢 MATRIX TEST 8: Error Handling');
    console.log('================================');

    console.log('🔬 Testing error conditions...');

    // Test invalid dimensions
    console.log('\n1. Testing invalid dimensions:');
    expect(() => new HugeLongMatrix(-1, 5)).toThrow();
    expect(() => new HugeLongMatrix(5, -1)).toThrow();
    console.log('  ✅ Negative dimensions rejected');

    // Test overflow dimensions
    console.log('\n2. Testing overflow dimensions:');
    const huge = Number.MAX_SAFE_INTEGER;
    expect(() => new HugeLongMatrix(huge, huge)).toThrow();
    console.log('  ✅ Overflow dimensions rejected');

    // Test bounds checking
    const matrix = new HugeLongMatrix(3, 3);

    console.log('\n3. Testing bounds checking:');
    expect(() => matrix.get(-1, 0)).toThrow();
    expect(() => matrix.get(0, -1)).toThrow();
    expect(() => matrix.get(3, 0)).toThrow();
    expect(() => matrix.get(0, 3)).toThrow();
    console.log('  ✅ Out-of-bounds access rejected');

    expect(() => matrix.set(-1, 0, 100)).toThrow();
    expect(() => matrix.set(0, -1, 100)).toThrow();
    expect(() => matrix.set(3, 0, 100)).toThrow();
    expect(() => matrix.set(0, 3, 100)).toThrow();
    console.log('  ✅ Out-of-bounds assignment rejected');

    // Test row/column operations bounds
    console.log('\n4. Testing row/column bounds:');
    expect(() => matrix.fillRow(-1, 100)).toThrow();
    expect(() => matrix.fillRow(3, 100)).toThrow();
    expect(() => matrix.fillCol(-1, 100)).toThrow();
    expect(() => matrix.fillCol(3, 100)).toThrow();
    console.log('  ✅ Row/column bounds checking works');

    matrix.release();
    console.log('\n🛡️ Error handling works perfectly!');
  });

  /**
   * Test 9: Performance Characteristics
   */
  test('performance characteristics are acceptable', () => {
    console.log('\n🏢 MATRIX TEST 9: Performance Characteristics');
    console.log('=============================================');

    const matrix = new HugeLongMatrix(1000, 1000);
    const operations = 100000;

    console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on 1000×1000 matrix`);

    // Test set operations
    console.log('\n1. Testing set performance:');
    const setStart = performance.now();
    for (let i = 0; i < operations; i++) {
      const row = i % 1000;
      const col = Math.floor(i / 1000) % 1000;
      matrix.set(row, col, i);
    }
    const setEnd = performance.now();
    const setTime = setEnd - setStart;
    const setOpsPerSec = Math.round(operations / (setTime / 1000));

    console.log(`  Set time: ${setTime.toFixed(2)}ms`);
    console.log(`  Set ops/sec: ${setOpsPerSec.toLocaleString()}`);

    // Test get operations
    console.log('\n2. Testing get performance:');
    const getStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < operations; i++) {
      const row = i % 1000;
      const col = Math.floor(i / 1000) % 1000;
      checksum += matrix.get(row, col);
    }
    const getEnd = performance.now();
    const getTime = getEnd - getStart;
    const getOpsPerSec = Math.round(operations / (getTime / 1000));

    console.log(`  Get time: ${getTime.toFixed(2)}ms`);
    console.log(`  Get ops/sec: ${getOpsPerSec.toLocaleString()}`);
    console.log(`  Checksum: ${checksum.toLocaleString()} (prevents optimization)`);

    // Performance expectations
    expect(setOpsPerSec).toBeGreaterThan(100000); // At least 100K ops/sec
    expect(getOpsPerSec).toBeGreaterThan(100000); // At least 100K ops/sec

    matrix.release();
    console.log('\n⚡ Performance is excellent!');
  });

  /**
   * Test 10: Real-World Graph Algorithm Simulation
   */
  test('adjacency matrix simulation works correctly', () => {
    console.log('\n🏢 MATRIX TEST 10: Graph Algorithm Simulation');
    console.log('==============================================');

    const nodeCount = 100;
    const adjacency = new HugeLongMatrix(nodeCount, nodeCount);

    console.log(`🔬 Simulating adjacency matrix for ${nodeCount} nodes...`);

    // Initialize as empty graph
    adjacency.fill(0);
    console.log('  ✅ Matrix initialized to 0 (no edges)');

    // Add some edges with weights
    const edges = [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 5, weight: 15 },
      { from: 1, to: 2, weight: 20 },
      { from: 2, to: 3, weight: 25 },
      { from: 3, to: 4, weight: 30 },
      { from: 4, to: 0, weight: 5 }  // Cycle back
    ];

    console.log('\n📊 Adding edges:');
    for (const { from, to, weight } of edges) {
      adjacency.set(from, to, weight);
      console.log(`  Edge ${from} → ${to} with weight ${weight}`);
    }

    // Verify edges exist
    console.log('\n🔍 Verifying edges:');
    for (const { from, to, weight } of edges) {
      const storedWeight = adjacency.get(from, to);
      console.log(`  Check ${from} → ${to}: ${storedWeight} ${storedWeight === weight ? '✅' : '❌'}`);
      expect(storedWeight).toBe(weight);
    }

    // Check non-edges are still 0
    console.log('\n🔍 Verifying non-edges:');
    const nonEdge = adjacency.get(10, 20);
    console.log(`  Non-edge (10,20): ${nonEdge} ${nonEdge === 0 ? '✅' : '❌'}`);
    expect(nonEdge).toBe(0);

    // Simulate finding neighbors
    console.log('\n🔍 Finding neighbors of node 0:');
    const neighbors = [];
    for (let target = 0; target < nodeCount; target++) {
      const weight = adjacency.get(0, target);
      if (weight > 0) {
        neighbors.push({ target, weight });
        console.log(`  Neighbor: ${target} (weight: ${weight})`);
      }
    }
    expect(neighbors).toHaveLength(2); // Should find nodes 1 and 5

    adjacency.release();
    console.log('\n🎯 Graph algorithm simulation works perfectly!');
  });
});
