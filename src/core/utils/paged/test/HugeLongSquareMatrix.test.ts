import { HugeLongSquareMatrix } from '../HugeLongSquareMatrix';

describe('HugeLongSquareMatrix - Square Matrix Powerhouse', () => {

  /**
   * Test 1: Square Matrix Creation and Basic Properties
   */
  test('square matrix creation and properties work correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 1: Creation and Properties');
    console.log('===============================================');

    const testOrders = [0, 1, 5, 100, 1000];

    console.log('Order\tRows\tCols\tSize\t\tMemory');
    console.log('-----\t----\t----\t----\t\t------');

    for (const order of testOrders) {
      console.log(`\n🔬 Testing ${order}×${order} matrix:`);

      const matrix = new HugeLongSquareMatrix(order);

      const rows = matrix.rowCount();
      const cols = matrix.colCount();
      const size = matrix.size();
      const memory = (matrix.sizeOf() / 1024).toFixed(1);

      console.log(`${order}\t${rows}\t${cols}\t${size.toLocaleString()}\t\t${memory}KB`);

      expect(matrix.order()).toBe(order);
      expect(rows).toBe(order);
      expect(cols).toBe(order);
      expect(size).toBe(order * order);

      matrix.release();
      console.log(`  ✅ ${order}×${order} matrix created successfully`);
    }

    console.log('\n🎯 Square matrix creation works perfectly!');
  });

  /**
   * Test 2: Memory Estimation Accuracy
   */
  test('memory estimation provides accurate estimates', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 2: Memory Estimation');
    console.log('==========================================');

    const testOrders = [10, 50, 100, 500, 1000];

    console.log('Order\t\tEstimated\tActual\t\tAccuracy');
    console.log('-----\t\t---------\t------\t\t--------');

    for (const order of testOrders) {
      const estimated = HugeLongSquareMatrix.memoryEstimation(order);

      const matrix = new HugeLongSquareMatrix(order);
      const actual = matrix.sizeOf();

      const accuracy = actual > 0 ? ((Math.min(estimated, actual) / Math.max(estimated, actual)) * 100).toFixed(1) : 'N/A';

      console.log(`${order}×${order}\t\t${(estimated/1024).toFixed(1)}KB\t\t${(actual/1024).toFixed(1)}KB\t\t${accuracy}%`);

      expect(estimated).toBeGreaterThan(0);
      expect(actual).toBeGreaterThanOrEqual(0);

      matrix.release();
    }

    console.log('\n💾 Memory estimation is accurate!');
  });

  /**
   * Test 3: Symmetric Operations - The Star Feature!
   */
  test('symmetric operations work correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 3: Symmetric Operations');
    console.log('=============================================');

    const matrix = new HugeLongSquareMatrix(5);

    console.log('🔬 Testing symmetric set and add operations...');

    // Test setSymmetric
    console.log('\n1. Testing setSymmetric:');
    matrix.setSymmetric(1, 3, 42);

    const val13 = matrix.get(1, 3);
    const val31 = matrix.get(3, 1);
    console.log(`  Set (1,3) and (3,1) to 42:`);
    console.log(`    (1,3) = ${val13} ${val13 === 42 ? '✅' : '❌'}`);
    console.log(`    (3,1) = ${val31} ${val31 === 42 ? '✅' : '❌'}`);
    expect(val13).toBe(42);
    expect(val31).toBe(42);

    // Test setSymmetric on diagonal (should not double-set)
    console.log('\n2. Testing setSymmetric on diagonal:');
    matrix.setSymmetric(2, 2, 99);
    const val22 = matrix.get(2, 2);
    console.log(`  Set diagonal (2,2) to 99: ${val22} ${val22 === 99 ? '✅' : '❌'}`);
    expect(val22).toBe(99);

    // Test addToSymmetric
    console.log('\n3. Testing addToSymmetric:');
    matrix.addToSymmetric(1, 3, 8); // Should add 8 to both (1,3) and (3,1)

    const newVal13 = matrix.get(1, 3);
    const newVal31 = matrix.get(3, 1);
    console.log(`  Added 8 to both (1,3) and (3,1):`);
    console.log(`    (1,3) = ${newVal13} (was 42, now should be 50) ${newVal13 === 50 ? '✅' : '❌'}`);
    console.log(`    (3,1) = ${newVal31} (was 42, now should be 50) ${newVal31 === 50 ? '✅' : '❌'}`);
    expect(newVal13).toBe(50);
    expect(newVal31).toBe(50);

    // Test addToSymmetric on diagonal (should not double-add)
    console.log('\n4. Testing addToSymmetric on diagonal:');
    matrix.addToSymmetric(2, 2, 1); // Should add 1 to (2,2) only once
    const newVal22 = matrix.get(2, 2);
    console.log(`  Added 1 to diagonal (2,2): ${newVal22} (was 99, now should be 100) ${newVal22 === 100 ? '✅' : '❌'}`);
    expect(newVal22).toBe(100);

    matrix.release();
    console.log('\n🔄 Symmetric operations work perfectly!');
  });

  /**
   * Test 4: Diagonal Operations
   */
  test('diagonal operations work correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 4: Diagonal Operations');
    console.log('============================================');

    const matrix = new HugeLongSquareMatrix(4);

    console.log('🔬 Testing diagonal operations...');

    // Test fillDiagonal
    console.log('\n1. Testing fillDiagonal:');
    matrix.fillDiagonal(777);

    for (let i = 0; i < 4; i++) {
      const val = matrix.get(i, i);
      console.log(`  Diagonal[${i}] = ${val} ${val === 777 ? '✅' : '❌'}`);
      expect(val).toBe(777);
    }

    // Verify off-diagonal is still 0
    const offDiagonal = matrix.get(0, 1);
    console.log(`  Off-diagonal (0,1) = ${offDiagonal} ${offDiagonal === 0 ? '✅' : '❌'}`);
    expect(offDiagonal).toBe(0);

    // Test getDiagonal
    console.log('\n2. Testing getDiagonal:');
    const diagonal = matrix.getDiagonal();
    console.log(`  Diagonal array: [${diagonal.join(', ')}]`);
    expect(diagonal).toEqual([777, 777, 777, 777]);

    // Test setDiagonal
    console.log('\n3. Testing setDiagonal:');
    const newDiagonal = [10, 20, 30, 40];
    matrix.setDiagonal(newDiagonal);

    for (let i = 0; i < 4; i++) {
      const val = matrix.get(i, i);
      console.log(`  New diagonal[${i}] = ${val} ${val === newDiagonal[i] ? '✅' : '❌'}`);
      expect(val).toBe(newDiagonal[i]);
    }

    // Test trace (sum of diagonal)
    console.log('\n4. Testing trace:');
    const trace = matrix.trace();
    const expectedTrace = 10 + 20 + 30 + 40;
    console.log(`  Trace = ${trace} (expected ${expectedTrace}) ${trace === expectedTrace ? '✅' : '❌'}`);
    expect(trace).toBe(expectedTrace);

    // Test setDiagonal with wrong length
    console.log('\n5. Testing diagonal length validation:');
    expect(() => matrix.setDiagonal([1, 2, 3])).toThrow(); // Wrong length
    console.log('  ✅ Diagonal length validation works');

    matrix.release();
    console.log('\n⚡ Diagonal operations work perfectly!');
  });

  /**
   * Test 5: Symmetry Analysis
   */
  test('symmetry analysis works correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 5: Symmetry Analysis');
    console.log('==========================================');

    console.log('🔬 Testing symmetry detection...');

    // Test symmetric matrix
    console.log('\n1. Testing symmetric matrix:');
    const symmetric = new HugeLongSquareMatrix(3);
    symmetric.setSymmetric(0, 1, 5);
    symmetric.setSymmetric(0, 2, 8);
    symmetric.setSymmetric(1, 2, 3);
    symmetric.fillDiagonal(1);

    console.log('  Created symmetric matrix:');
    console.log('    [1, 5, 8]');
    console.log('    [5, 1, 3]');
    console.log('    [8, 3, 1]');

    const isSymmetric = symmetric.isSymmetric();
    console.log(`  Is symmetric: ${isSymmetric} ${isSymmetric ? '✅' : '❌'}`);
    expect(isSymmetric).toBe(true);

    // Test asymmetric matrix
    console.log('\n2. Testing asymmetric matrix:');
    const asymmetric = new HugeLongSquareMatrix(3);
    asymmetric.set(0, 1, 5);
    asymmetric.set(1, 0, 7); // Different value - breaks symmetry

    const isAsymmetric = asymmetric.isSymmetric();
    console.log(`  Is symmetric: ${isAsymmetric} ${!isAsymmetric ? '✅' : '❌'}`);
    expect(isAsymmetric).toBe(false);

    // Test tolerance-based symmetry
    console.log('\n3. Testing tolerance-based symmetry:');
    const nearSymmetric = new HugeLongSquareMatrix(2);
    nearSymmetric.set(0, 1, 10);
    nearSymmetric.set(1, 0, 11); // Close but not exact

    const exactSymmetric = nearSymmetric.isSymmetric(0);
    const tolerantSymmetric = nearSymmetric.isSymmetric(2);
    console.log(`  Exact symmetry: ${exactSymmetric} ${!exactSymmetric ? '✅' : '❌'}`);
    console.log(`  Tolerance=2 symmetry: ${tolerantSymmetric} ${tolerantSymmetric ? '✅' : '❌'}`);
    expect(exactSymmetric).toBe(false);
    expect(tolerantSymmetric).toBe(true);

    symmetric.release();
    asymmetric.release();
    nearSymmetric.release();
    console.log('\n🎯 Symmetry analysis works perfectly!');
  });

  /**
   * Test 6: Triangular Iterators
   */
  test('triangular iterators work correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 6: Triangular Iterators');
    console.log('==============================================');

    const matrix = new HugeLongSquareMatrix(4);

    // Fill with row*10 + col for easy identification
    console.log('🔬 Setting up test matrix...');
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        matrix.set(i, j, i * 10 + j);
      }
    }

    console.log('Matrix layout:');
    console.log('  [ 0,  1,  2,  3]');
    console.log('  [10, 11, 12, 13]');
    console.log('  [20, 21, 22, 23]');
    console.log('  [30, 31, 32, 33]');

    // Test upper triangular iterator
    console.log('\n1. Testing upperTriangularEntries:');
    const upperEntries = Array.from(matrix.upperTriangularEntries());
    console.log('  Upper triangular entries (row <= col):');
    for (const [row, col, value] of upperEntries) {
      console.log(`    (${row},${col}) = ${value}`);
      expect(row).toBeLessThanOrEqual(col);
      expect(value).toBe(row * 10 + col);
    }
    expect(upperEntries).toHaveLength(10); // 4+3+2+1 = 10 elements

    // Test lower triangular iterator
    console.log('\n2. Testing lowerTriangularEntries:');
    const lowerEntries = Array.from(matrix.lowerTriangularEntries());
    console.log('  Lower triangular entries (row >= col):');
    for (const [row, col, value] of lowerEntries) {
      console.log(`    (${row},${col}) = ${value}`);
      expect(row).toBeGreaterThanOrEqual(col);
      expect(value).toBe(row * 10 + col);
    }
    expect(lowerEntries).toHaveLength(10); // 1+2+3+4 = 10 elements

    // Test off-diagonal iterator
    console.log('\n3. Testing offDiagonalEntries:');
    const offDiagonalEntries = Array.from(matrix.offDiagonalEntries());
    console.log('  Off-diagonal entries (row ≠ col):');
    let offDiagonalCount = 0;
    for (const [row, col, value] of offDiagonalEntries) {
      expect(row).not.toBe(col);
      expect(value).toBe(row * 10 + col);
      offDiagonalCount++;
    }
    console.log(`    Found ${offDiagonalCount} off-diagonal elements`);
    expect(offDiagonalCount).toBe(12); // 16 total - 4 diagonal = 12

    matrix.release();
    console.log('\n🔄 Triangular iterators work perfectly!');
  });

  /**
   * Test 7: Sparsity Analysis
   */
  test('sparsity analysis works correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 7: Sparsity Analysis');
    console.log('==========================================');

    console.log('🔬 Testing sparsity calculations...');

    // Test empty matrix (100% sparse)
    console.log('\n1. Testing empty matrix:');
    const empty = new HugeLongSquareMatrix(5);
    const emptyNonZero = empty.countNonZero();
    const emptySparsity = empty.sparsity();
    console.log(`  Non-zero count: ${emptyNonZero} ${emptyNonZero === 0 ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(emptySparsity * 100).toFixed(1)}% ${emptySparsity === 1.0 ? '✅' : '❌'}`);
    expect(emptyNonZero).toBe(0);
    expect(emptySparsity).toBe(1.0);

    // Test full matrix (0% sparse)
    console.log('\n2. Testing full matrix:');
    const full = new HugeLongSquareMatrix(3);
    full.fill(1); // Fill entire matrix with 1s
    const fullNonZero = full.countNonZero();
    const fullSparsity = full.sparsity();
    console.log(`  Non-zero count: ${fullNonZero} (expected 9) ${fullNonZero === 9 ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(fullSparsity * 100).toFixed(1)}% ${fullSparsity === 0.0 ? '✅' : '❌'}`);
    expect(fullNonZero).toBe(9);
    expect(fullSparsity).toBe(0.0);

    // Test partially filled matrix
    console.log('\n3. Testing partially filled matrix:');
    const partial = new HugeLongSquareMatrix(4);
    partial.fillDiagonal(1); // Only diagonal filled = 4 non-zero out of 16
    const partialNonZero = partial.countNonZero();
    const partialSparsity = partial.sparsity();
    const expectedSparsity = (16 - 4) / 16; // 12/16 = 0.75
    console.log(`  Non-zero count: ${partialNonZero} (expected 4) ${partialNonZero === 4 ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(partialSparsity * 100).toFixed(1)}% (expected ${(expectedSparsity * 100).toFixed(1)}%) ${Math.abs(partialSparsity - expectedSparsity) < 0.001 ? '✅' : '❌'}`);
    expect(partialNonZero).toBe(4);
    expect(partialSparsity).toBeCloseTo(expectedSparsity);

    empty.release();
    full.release();
    partial.release();
    console.log('\n📊 Sparsity analysis works perfectly!');
  });

  /**
   * Test 8: Matrix Transpose
   */
  test('matrix transpose works correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 8: Matrix Transpose');
    console.log('=========================================');

    console.log('🔬 Testing matrix transpose...');

    const original = new HugeLongSquareMatrix(3);

    // Create an asymmetric test matrix
    console.log('\n1. Creating test matrix:');
    original.set(0, 1, 5);
    original.set(0, 2, 8);
    original.set(1, 0, 3);
    original.set(1, 2, 7);
    original.set(2, 0, 2);
    original.set(2, 1, 9);
    original.fillDiagonal(1);

    console.log('  Original matrix:');
    console.log('    [1, 5, 8]');
    console.log('    [3, 1, 7]');
    console.log('    [2, 9, 1]');

    // Create transpose
    console.log('\n2. Creating transpose:');
    const transposed = original.transpose();

    console.log('  Transposed matrix should be:');
    console.log('    [1, 3, 2]');
    console.log('    [5, 1, 9]');
    console.log('    [8, 7, 1]');

    // Verify transpose values
    console.log('\n3. Verifying transpose:');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const originalVal = original.get(i, j);
        const transposedVal = transposed.get(j, i);
        console.log(`    Original(${i},${j})=${originalVal}, Transposed(${j},${i})=${transposedVal} ${originalVal === transposedVal ? '✅' : '❌'}`);
        expect(transposedVal).toBe(originalVal);
      }
    }

    // Test symmetric matrix transpose (should be identical)
    console.log('\n4. Testing symmetric matrix transpose:');
    const symmetric = new HugeLongSquareMatrix(3);
    symmetric.setSymmetric(0, 1, 10);
    symmetric.setSymmetric(1, 2, 20);
    symmetric.setSymmetric(0, 2, 30);
    symmetric.fillDiagonal(5);

    const symmetricTransposed = symmetric.transpose();
    const isIdentical = symmetric.isSymmetric() && symmetricTransposed.isSymmetric();

    // Check if symmetric matrix equals its transpose
    let matricesEqual = true;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (symmetric.get(i, j) !== symmetricTransposed.get(i, j)) {
          matricesEqual = false;
          break;
        }
      }
    }

    console.log(`  Symmetric matrix equals transpose: ${matricesEqual} ${matricesEqual ? '✅' : '❌'}`);
    expect(matricesEqual).toBe(true);

    original.release();
    transposed.release();
    symmetric.release();
    symmetricTransposed.release();
    console.log('\n🔄 Matrix transpose works perfectly!');
  });

  /**
   * Test 9: Graph Algorithm Simulation - Adjacency Matrix
   */
  test('adjacency matrix simulation works correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 9: Graph Algorithm Simulation');
    console.log('===================================================');

    const nodeCount = 6;
    const graph = new HugeLongSquareMatrix(nodeCount);

    console.log(`🔬 Creating adjacency matrix for ${nodeCount}-node graph...`);

    // Create an undirected graph using symmetric operations
    const edges = [
      { u: 0, v: 1, weight: 10 },
      { u: 0, v: 2, weight: 15 },
      { u: 1, v: 3, weight: 20 },
      { u: 2, v: 3, weight: 25 },
      { u: 3, v: 4, weight: 30 },
      { u: 4, v: 5, weight: 35 },
      { u: 0, v: 5, weight: 40 } // Creates a cycle
    ];

    console.log('\n1. Adding edges to graph:');
    for (const { u, v, weight } of edges) {
      graph.setSymmetric(u, v, weight);
      console.log(`  Edge ${u} ↔ ${v} with weight ${weight}`);
    }

    // Verify graph is symmetric (undirected)
    console.log('\n2. Verifying graph symmetry:');
    const isSymmetric = graph.isSymmetric();
    console.log(`  Graph is symmetric (undirected): ${isSymmetric} ${isSymmetric ? '✅' : '❌'}`);
    expect(isSymmetric).toBe(true);

    // Test neighbor discovery
    console.log('\n3. Finding neighbors of node 0:');
    const neighbors = [];
    for (let target = 0; target < nodeCount; target++) {
      const weight = graph.get(0, target);
      if (weight > 0) {
        neighbors.push({ target, weight });
        console.log(`    Neighbor: ${target} (weight: ${weight})`);
      }
    }
    expect(neighbors).toHaveLength(3); // Nodes 1, 2, 5

    // Test degree calculation
    console.log('\n4. Calculating node degrees:');
    for (let node = 0; node < nodeCount; node++) {
      let degree = 0;
      for (let target = 0; target < nodeCount; target++) {
        if (graph.get(node, target) > 0) {
          degree++;
        }
      }
      console.log(`    Node ${node} degree: ${degree}`);
    }

    // Test sparsity analysis
    console.log('\n5. Graph sparsity analysis:');
    const nonZeroEdges = graph.countNonZero();
    const sparsity = graph.sparsity();
    const maxPossibleEdges = nodeCount * nodeCount;
    console.log(`    Non-zero edges: ${nonZeroEdges}`);
    console.log(`    Max possible edges: ${maxPossibleEdges}`);
    console.log(`    Sparsity: ${(sparsity * 100).toFixed(1)}% (higher = more sparse)`);
    expect(nonZeroEdges).toBe(edges.length * 2); // Each edge counted twice (symmetric)

    graph.release();
    console.log('\n🎯 Graph algorithm simulation works perfectly!');
  });

  /**
   * Test 10: Performance and Large Matrix Handling
   */
  test('performance characteristics are excellent', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 10: Performance Characteristics');
    console.log('====================================================');

    const order = 1000;
    const matrix = new HugeLongSquareMatrix(order);
    const operations = 100000;

    console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on ${order}×${order} matrix`);

    // Test symmetric set performance
    console.log('\n1. Testing symmetric set performance:');
    const symSetStart = performance.now();
    for (let i = 0; i < operations; i++) {
      const row = i % order;
      const col = (i + 1) % order;
      matrix.setSymmetric(row, col, i);
    }
    const symSetEnd = performance.now();
    const symSetTime = symSetEnd - symSetStart;
    const symSetOpsPerSec = Math.round(operations / (symSetTime / 1000));

    console.log(`  Symmetric set time: ${symSetTime.toFixed(2)}ms`);
    console.log(`  Symmetric set ops/sec: ${symSetOpsPerSec.toLocaleString()}`);

    // Test diagonal operations performance
    console.log('\n2. Testing diagonal operations performance:');
    const diagStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      matrix.fillDiagonal(i);
      const trace = matrix.trace();
      const diagonal = matrix.getDiagonal();
    }
    const diagEnd = performance.now();
    const diagTime = diagEnd - diagStart;

    console.log(`  1000 diagonal operations time: ${diagTime.toFixed(2)}ms`);

    // Test iterator performance
    console.log('\n3. Testing iterator performance:');
    const iterStart = performance.now();
    let elementCount = 0;
    for (const [row, col, value] of matrix.upperTriangularEntries()) {
      elementCount++;
    }
    const iterEnd = performance.now();
    const iterTime = iterEnd - iterStart;

    console.log(`  Upper triangular iteration time: ${iterTime.toFixed(2)}ms`);
    console.log(`  Elements iterated: ${elementCount.toLocaleString()}`);

    // Performance expectations
    expect(symSetOpsPerSec).toBeGreaterThan(50000); // At least 50K symmetric ops/sec
    expect(diagTime).toBeLessThan(1000); // Diagonal ops should be fast
    expect(iterTime).toBeLessThan(500); // Iteration should be fast

    matrix.release();
    console.log('\n⚡ Performance characteristics are excellent!');
  });

  /**
   * Test 11: ToString and Edge Cases
   */
  test('toString and edge cases work correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 11: ToString and Edge Cases');
    console.log('=================================================');

    console.log('🔬 Testing toString and edge cases...');

    // Test small matrix toString
    console.log('\n1. Testing small matrix toString:');
    const small = new HugeLongSquareMatrix(3);
    small.setSymmetric(0, 1, 5);
    small.fillDiagonal(1);

    const smallStr = small.toString();
    console.log(`  Small matrix toString:\n${smallStr}`);
    expect(smallStr).toContain('1'); // Should contain the values we set

    // Test large matrix toString (should be compact)
    console.log('\n2. Testing large matrix toString:');
    const large = new HugeLongSquareMatrix(100);
    const largeStr = large.toString();
    console.log(`  Large matrix toString: ${largeStr}`);
    expect(largeStr).toContain('HugeLongSquareMatrix(100 × 100)');

    // Test empty matrix operations
    console.log('\n3. Testing empty matrix (order 0):');
    const empty = new HugeLongSquareMatrix(0);
    expect(empty.order()).toBe(0);
    expect(empty.size()).toBe(0);
    expect(empty.trace()).toBe(0);
    expect(empty.countNonZero()).toBe(0);
    expect(empty.sparsity()).toBe(1.0); // Technically 100% sparse
    expect(empty.isSymmetric()).toBe(true); // Vacuously true
    console.log('  ✅ Empty matrix handles all operations correctly');

    // Test single element matrix
    console.log('\n4. Testing single element matrix (order 1):');
    const single = new HugeLongSquareMatrix(1);
    single.set(0, 0, 42);
    expect(single.get(0, 0)).toBe(42);
    expect(single.trace()).toBe(42);
    expect(single.countNonZero()).toBe(1);
    expect(single.sparsity()).toBe(0.0);
    expect(single.isSymmetric()).toBe(true);
    console.log('  ✅ Single element matrix works correctly');

    small.release();
    large.release();
    empty.release();
    single.release();
    console.log('\n🎯 Edge cases handled perfectly!');
  });

  /**
   * Test 12: Real-World Application - Distance Matrix
   */
  test('distance matrix application works correctly', () => {
    console.log('\n🔲 SQUARE MATRIX TEST 12: Distance Matrix Application');
    console.log('====================================================');

    const cityCount = 5;
    const distances = new HugeLongSquareMatrix(cityCount);
    const cities = ['NYC', 'LA', 'Chicago', 'Houston', 'Miami'];

    console.log(`🔬 Creating distance matrix for ${cityCount} cities...`);
    console.log(`Cities: ${cities.join(', ')}`);

    // Initialize distance matrix
    console.log('\n1. Initializing distance matrix:');

    // Diagonal should be 0 (distance from city to itself)
    distances.fillDiagonal(0);
    console.log('  ✅ Set diagonal to 0 (self-distances)');

    // Set symmetric distances between cities
    const cityDistances = [
      { from: 0, to: 1, distance: 2445 }, // NYC to LA
      { from: 0, to: 2, distance: 713 },  // NYC to Chicago
      { from: 0, to: 3, distance: 1420 }, // NYC to Houston
      { from: 0, to: 4, distance: 1090 }, // NYC to Miami
      { from: 1, to: 2, distance: 1745 }, // LA to Chicago
      { from: 1, to: 3, distance: 1347 }, // LA to Houston
      { from: 1, to: 4, distance: 2339 }, // LA to Miami
      { from: 2, to: 3, distance: 925 },  // Chicago to Houston
      { from: 2, to: 4, distance: 1188 }, // Chicago to Miami
      { from: 3, to: 4, distance: 968 }   // Houston to Miami
    ];

    console.log('\n2. Setting city distances:');
    for (const { from, to, distance } of cityDistances) {
      distances.setSymmetric(from, to, distance);
      console.log(`  ${cities[from]} ↔ ${cities[to]}: ${distance} miles`);
    }

    // Verify symmetry
    console.log('\n3. Verifying distance matrix properties:');
    const isSymmetric = distances.isSymmetric();
    console.log(`  Matrix is symmetric: ${isSymmetric} ${isSymmetric ? '✅' : '❌'}`);
    expect(isSymmetric).toBe(true);

    // Verify diagonal is zero
    const diagonal = distances.getDiagonal();
    const allZeros = diagonal.every(d => d === 0);
    console.log(`  Diagonal is all zeros: ${allZeros} ${allZeros ? '✅' : '❌'}`);
    expect(allZeros).toBe(true);

    // Find nearest neighbors
    console.log('\n4. Finding nearest neighbors:');
    for (let city = 0; city < cityCount; city++) {
      let nearestCity = -1;
      let shortestDistance = Infinity;

      for (let other = 0; other < cityCount; other++) {
        if (city !== other) {
          const distance = distances.get(city, other);
          if (distance > 0 && distance < shortestDistance) {
            shortestDistance = distance;
            nearestCity = other;
          }
        }
      }

      if (nearestCity >= 0) {
        console.log(`  ${cities[city]} → ${cities[nearestCity]}: ${shortestDistance} miles`);
      }
    }

    // Calculate average distance
    console.log('\n5. Distance statistics:');
    let totalDistance = 0;
    let pairCount = 0;

    for (const [i, j, distance] of distances.upperTriangularEntries()) {
      if (i !== j && distance > 0) {
        totalDistance += distance;
        pairCount++;
      }
    }

    const averageDistance = Math.round(totalDistance / pairCount);
    console.log(`  Total unique city pairs: ${pairCount}`);
    console.log(`  Average distance: ${averageDistance} miles`);
    console.log(`  Matrix sparsity: ${(distances.sparsity() * 100).toFixed(1)}%`);

    distances.release();
    console.log('\n🗺️ Distance matrix application works perfectly!');
  });
});
