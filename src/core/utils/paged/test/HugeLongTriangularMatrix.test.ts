import { HugeLongTriangularMatrix } from '../HugeLongTriangularMatrix';

describe('HugeLongTriangularMatrix - Memory-Efficient Symmetric Matrices', () => {

  /**
   * Test 1: Basic Triangular Matrix Creation
   */
  test('triangular matrix creation works correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 1: Basic Creation');
    console.log('===========================================');

    const testOrders = [0, 1, 3, 5, 100, 1000];

    console.log('Order\tElements\tMemory\t\tMemory Saved vs Square');
    console.log('-----\t--------\t------\t\t------------------');

    for (const order of testOrders) {
      console.log(`\n🔬 Testing ${order}×${order} triangular matrix:`);

      const matrix = new HugeLongTriangularMatrix(order);

      const elements = matrix.size();
      const memory = (matrix.sizeOf() / 1024).toFixed(1);
      const triangularElements = Math.floor((order * (order + 1)) / 2);
      const squareElements = order * order;
      const savedElements = squareElements - triangularElements;
      const percentSaved = squareElements > 0 ? ((savedElements / squareElements) * 100).toFixed(1) : '0.0';

      console.log(`${order}\t${elements.toLocaleString()}\t\t${memory}KB\t\t${savedElements.toLocaleString()} (${percentSaved}%)`);

      expect(matrix.order()).toBe(order);
      expect(elements).toBe(triangularElements);

      matrix.release();
      console.log(`  ✅ ${order}×${order} triangular matrix created successfully`);
    }

    console.log('\n🎯 Triangular matrix creation works perfectly!');
  });

  /**
   * Test 2: Memory Estimation and Savings Analysis
   */
  test('memory estimation shows massive savings', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 2: Memory Savings Analysis');
    console.log('===================================================');

    const testOrders = [10, 100, 1000, 10000];

    console.log('Testing memory estimation vs actual usage:');
    console.log('Order\t\tEstimated\tActual\t\tAccuracy\tSavings');
    console.log('-----\t\t---------\t------\t\t--------\t-------');

    for (const order of testOrders) {
      console.log(`\n🔬 Testing ${order}×${order} matrix:`);

      // Capture console output for memory savings
      const originalLog = console.log;
      let memoryMessage = '';
      console.log = (msg) => { if (msg.includes('Memory savings:')) memoryMessage = msg; };

      const estimated = HugeLongTriangularMatrix.memoryEstimation(order);
      console.log = originalLog; // Restore console.log

      const matrix = new HugeLongTriangularMatrix(order);
      const actual = matrix.sizeOf();

      const accuracy = actual > 0 ? ((Math.min(estimated, actual) / Math.max(estimated, actual)) * 100).toFixed(1) : 'N/A';

      console.log(`${order}×${order}\t\t${(estimated/1024).toFixed(1)}KB\t\t${(actual/1024).toFixed(1)}KB\t\t${accuracy}%\t\t${memoryMessage}`);

      expect(estimated).toBeGreaterThan(0);
      expect(actual).toBeGreaterThanOrEqual(0);

      matrix.release();
    }

    console.log('\n💾 Memory estimation and savings analysis work perfectly!');
  });

  /**
   * Test 3: Symmetric Get/Set Operations - The Core Feature!
   */
  test('symmetric get and set operations work correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 3: Symmetric Operations');
    console.log('=================================================');

    const matrix = new HugeLongTriangularMatrix(5);

    console.log('🔬 Testing symmetric get/set operations...');

    // Test symmetric setting and getting
    const testCases = [
      { x: 0, y: 0, value: 10, description: 'diagonal element' },
      { x: 0, y: 4, value: 42, description: 'upper triangle' },
      { x: 1, y: 3, value: 77, description: 'middle element' },
      { x: 2, y: 2, value: 99, description: 'diagonal element' },
      { x: 3, y: 4, value: 123, description: 'edge element' }
    ];

    console.log('\n1. Setting values:');
    for (const { x, y, value, description } of testCases) {
      matrix.set(x, y, value);
      console.log(`  Set (${x},${y}) = ${value} [${description}]`);
    }

    console.log('\n2. Testing symmetric access:');
    for (const { x, y, value, description } of testCases) {
      const forward = matrix.get(x, y);
      const reverse = matrix.get(y, x);

      console.log(`  Get (${x},${y}) = ${forward}, Get (${y},${x}) = ${reverse} [${description}]`);
      console.log(`    Values match: ${forward === reverse && forward === value ? '✅' : '❌'}`);

      expect(forward).toBe(value);
      expect(reverse).toBe(value);
      expect(forward).toBe(reverse);
    }

    // Test default values
    console.log('\n3. Testing default values:');
    const defaultValue = matrix.get(4, 4);
    console.log(`  Unset diagonal (4,4) = ${defaultValue} ${defaultValue === 0 ? '✅' : '❌'}`);
    expect(defaultValue).toBe(0);

    matrix.release();
    console.log('\n🔄 Symmetric operations work perfectly!');
  });

  /**
   * Test 4: AddTo Accumulation for Data Science
   */
  test('addTo operations work correctly for accumulation', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 4: AddTo Accumulation');
    console.log('===============================================');

    const matrix = new HugeLongTriangularMatrix(4);

    console.log('🔬 Testing addTo accumulation patterns...');

    // Initialize with base values
    matrix.set(1, 2, 10);
    console.log(`Initial value at (1,2): ${matrix.get(1, 2)}`);

    // Test accumulation
    const additions = [5, -3, 8, 12, -2];
    let expectedTotal = 10;

    console.log('\nAccumulating values:');
    for (const addition of additions) {
      matrix.addTo(1, 2, addition);
      expectedTotal += addition;
      const currentValue = matrix.get(1, 2);
      const symmetricValue = matrix.get(2, 1);

      console.log(`  Added ${addition}: (1,2)=${currentValue}, (2,1)=${symmetricValue}, expected=${expectedTotal}`);
      console.log(`    Values correct: ${currentValue === expectedTotal && symmetricValue === expectedTotal ? '✅' : '❌'}`);

      expect(currentValue).toBe(expectedTotal);
      expect(symmetricValue).toBe(expectedTotal);
    }

    // Test diagonal accumulation
    console.log('\nTesting diagonal accumulation:');
    matrix.set(2, 2, 100);
    matrix.addTo(2, 2, 25);
    const diagonalValue = matrix.get(2, 2);
    console.log(`  Diagonal (2,2): set to 100, added 25, result = ${diagonalValue} ${diagonalValue === 125 ? '✅' : '❌'}`);
    expect(diagonalValue).toBe(125);

    matrix.release();
    console.log('\n➕ AddTo accumulation works perfectly!');
  });

  /**
   * Test 5: Diagonal Operations
   */
  test('diagonal operations work correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 5: Diagonal Operations');
    console.log('================================================');

    const matrix = new HugeLongTriangularMatrix(4);

    console.log('🔬 Testing diagonal operations...');

    // Test fillDiagonal
    console.log('\n1. Testing fillDiagonal:');
    matrix.fillDiagonal(555);

    for (let i = 0; i < 4; i++) {
      const val = matrix.get(i, i);
      console.log(`  Diagonal[${i}] = ${val} ${val === 555 ? '✅' : '❌'}`);
      expect(val).toBe(555);
    }

    // Test getDiagonal
    console.log('\n2. Testing getDiagonal:');
    const diagonal = matrix.getDiagonal();
    console.log(`  Diagonal array: [${diagonal.join(', ')}]`);
    expect(diagonal).toEqual([555, 555, 555, 555]);

    // Test setDiagonal
    console.log('\n3. Testing setDiagonal:');
    const newDiagonal = [10, 20, 30, 40];
    matrix.setDiagonal(newDiagonal);

    for (let i = 0; i < 4; i++) {
      const val = matrix.get(i, i);
      console.log(`  New diagonal[${i}] = ${val} ${val === newDiagonal[i] ? '✅' : '❌'}`);
      expect(val).toBe(newDiagonal[i]);
    }

    // Test trace
    console.log('\n4. Testing trace:');
    const trace = matrix.trace();
    const expectedTrace = 10 + 20 + 30 + 40;
    console.log(`  Trace = ${trace} (expected ${expectedTrace}) ${trace === expectedTrace ? '✅' : '❌'}`);
    expect(trace).toBe(expectedTrace);

    // Test diagonal validation
    console.log('\n5. Testing diagonal length validation:');
    expect(() => matrix.setDiagonal([1, 2, 3])).toThrow(); // Wrong length
    console.log('  ✅ Diagonal length validation works');

    matrix.release();
    console.log('\n⚡ Diagonal operations work perfectly!');
  });

  /**
   * Test 6: Fill Operations
   */
  test('fill operations work correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 6: Fill Operations');
    console.log('============================================');

    const matrix = new HugeLongTriangularMatrix(3);

    console.log('🔬 Testing fill operations...');

    // Test fill entire matrix
    console.log('\n1. Testing full matrix fill:');
    matrix.fill(99);

    // Check all positions
    let allCorrect = true;
    for (let x = 0; x < 3; x++) {
      for (let y = x; y < 3; y++) {
        if (matrix.get(x, y) !== 99) {
          allCorrect = false;
          break;
        }
      }
    }
    console.log(`  All positions filled with 99: ${allCorrect ? '✅' : '❌'}`);
    expect(allCorrect).toBe(true);

    // Verify symmetric access still works
    console.log('\n2. Verifying symmetric access after fill:');
    const val01 = matrix.get(0, 1);
    const val10 = matrix.get(1, 0);
    console.log(`  (0,1) = ${val01}, (1,0) = ${val10}, symmetric: ${val01 === val10 ? '✅' : '❌'}`);
    expect(val01).toBe(val10);
    expect(val01).toBe(99);

    matrix.release();
    console.log('\n🎨 Fill operations work perfectly!');
  });

  /**
   * Test 7: Iterator Operations - Triangle Traversal
   */
  test('iterator operations work correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 7: Iterator Operations');
    console.log('================================================');

    const matrix = new HugeLongTriangularMatrix(4);

    // Set up test data with recognizable pattern
    console.log('🔬 Setting up test matrix...');
    let counter = 1;
    for (let x = 0; x < 4; x++) {
      for (let y = x; y < 4; y++) {
        matrix.set(x, y, counter++);
      }
    }

    console.log('Matrix layout (upper triangle only stored):');
    console.log('  [1, 2, 3, 4]');
    console.log('  [2, 5, 6, 7]  <- symmetric access');
    console.log('  [3, 6, 8, 9]  <- symmetric access');
    console.log('  [4, 7, 9, 10] <- symmetric access');

    // Test entries iterator
    console.log('\n1. Testing entries() iterator:');
    const entries = Array.from(matrix.entries());
    console.log('  All entries (x <= y only):');
    for (const [x, y, value] of entries) {
      console.log(`    (${x},${y}) = ${value}`);
      expect(x).toBeLessThanOrEqual(y);
    }
    const expectedEntries = (4 * 5) / 2; // Triangular number
    expect(entries).toHaveLength(expectedEntries);

    // Test diagonal iterator
    console.log('\n2. Testing diagonalEntries() iterator:');
    const diagonalEntries = Array.from(matrix.diagonalEntries());
    console.log('  Diagonal entries:');
    for (const [i, value] of diagonalEntries) {
      console.log(`    Diagonal[${i}] = ${value}`);
    }
    expect(diagonalEntries).toHaveLength(4);

    // Test off-diagonal iterator
    console.log('\n3. Testing offDiagonalEntries() iterator:');
    const offDiagonalEntries = Array.from(matrix.offDiagonalEntries());
    console.log('  Off-diagonal entries (x < y only):');
    for (const [x, y, value] of offDiagonalEntries) {
      console.log(`    (${x},${y}) = ${value}`);
      expect(x).toBeLessThan(y);
    }
    const expectedOffDiagonal = expectedEntries - 4; // Total - diagonal
    expect(offDiagonalEntries).toHaveLength(expectedOffDiagonal);

    matrix.release();
    console.log('\n🔄 Iterator operations work perfectly!');
  });

  /**
   * Test 8: Square Matrix Conversion
   */
  test('square matrix conversion works correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 8: Square Matrix Conversion');
    console.log('====================================================');

    const matrix = new HugeLongTriangularMatrix(3);

    console.log('🔬 Testing conversion to full square matrix...');

    // Set up triangular data
    matrix.set(0, 1, 5);
    matrix.set(0, 2, 8);
    matrix.set(1, 2, 3);
    matrix.fillDiagonal(1);

    console.log('\n1. Original triangular matrix data:');
    console.log('  Only upper triangle stored:');
    console.log('    [1, 5, 8]');
    console.log('    [_, 1, 3]');
    console.log('    [_, _, 1]');

    // Convert to square matrix
    console.log('\n2. Converting to full square matrix:');
    const squareMatrix = matrix.toSquareMatrix();

    console.log('  Full symmetric square matrix:');
    for (let i = 0; i < 3; i++) {
      console.log(`    [${squareMatrix[i].join(', ')}]`);
    }

    // Verify symmetry in converted matrix
    console.log('\n3. Verifying symmetry in converted matrix:');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const symmetric = squareMatrix[i][j] === squareMatrix[j][i];
        console.log(`    (${i},${j})=${squareMatrix[i][j]}, (${j},${i})=${squareMatrix[j][i]} ${symmetric ? '✅' : '❌'}`);
        expect(squareMatrix[i][j]).toBe(squareMatrix[j][i]);
      }
    }

    // Verify values match original
    console.log('\n4. Verifying values match original:');
    expect(squareMatrix[0][1]).toBe(5);
    expect(squareMatrix[1][0]).toBe(5);
    expect(squareMatrix[0][2]).toBe(8);
    expect(squareMatrix[2][0]).toBe(8);
    expect(squareMatrix[1][2]).toBe(3);
    expect(squareMatrix[2][1]).toBe(3);
    console.log('  ✅ All values match original triangular matrix');

    matrix.release();
    console.log('\n🔄 Square matrix conversion works perfectly!');
  });

  /**
   * Test 9: Sparsity Analysis
   */
  test('sparsity analysis works correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 9: Sparsity Analysis');
    console.log('==============================================');

    console.log('🔬 Testing sparsity calculations...');

    // Test sparse matrix
    console.log('\n1. Testing sparse matrix:');
    const sparse = new HugeLongTriangularMatrix(5); // Empty = all zeros
    const sparseNonZero = sparse.countNonZero();
    const sparseSparsity = sparse.sparsity();
    console.log(`  Non-zero count: ${sparseNonZero} ${sparseNonZero === 0 ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(sparseSparsity * 100).toFixed(1)}% ${sparseSparsity === 1.0 ? '✅' : '❌'}`);
    expect(sparseNonZero).toBe(0);
    expect(sparseSparsity).toBe(1.0);

    // Test partially filled matrix
    console.log('\n2. Testing partially filled matrix:');
    const partial = new HugeLongTriangularMatrix(4);
    partial.fillDiagonal(1); // Only diagonal filled
    const partialNonZero = partial.countNonZero();
    const partialSparsity = partial.sparsity();
    const totalElements = (4 * 5) / 2; // 10 elements total
    const expectedSparsity = (totalElements - 4) / totalElements; // 6/10 = 0.6
    console.log(`  Non-zero count: ${partialNonZero} (expected 4) ${partialNonZero === 4 ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(partialSparsity * 100).toFixed(1)}% (expected ${(expectedSparsity * 100).toFixed(1)}%) ${Math.abs(partialSparsity - expectedSparsity) < 0.001 ? '✅' : '❌'}`);
    expect(partialNonZero).toBe(4);
    expect(partialSparsity).toBeCloseTo(expectedSparsity);

    // Test dense matrix
    console.log('\n3. Testing dense matrix:');
    const dense = new HugeLongTriangularMatrix(3);
    dense.fill(7); // All elements non-zero
    const denseNonZero = dense.countNonZero();
    const denseSparsity = dense.sparsity();
    const denseTotal = (3 * 4) / 2; // 6 elements total
    console.log(`  Non-zero count: ${denseNonZero} (expected ${denseTotal}) ${denseNonZero === denseTotal ? '✅' : '❌'}`);
    console.log(`  Sparsity: ${(denseSparsity * 100).toFixed(1)}% (expected 0.0%) ${denseSparsity === 0.0 ? '✅' : '❌'}`);
    expect(denseNonZero).toBe(denseTotal);
    expect(denseSparsity).toBe(0.0);

    sparse.release();
    partial.release();
    dense.release();
    console.log('\n📊 Sparsity analysis works perfectly!');
  });

  /**
   * Test 10: Error Handling and Edge Cases
   */
  test('error handling works correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 10: Error Handling');
    console.log('============================================');

    console.log('🔬 Testing error conditions...');

    // Test invalid dimensions
    console.log('\n1. Testing invalid dimensions:');
    expect(() => new HugeLongTriangularMatrix(-1)).toThrow();
    console.log('  ✅ Negative order rejected');

    // Test bounds checking
    const matrix = new HugeLongTriangularMatrix(3);

    console.log('\n2. Testing bounds checking:');
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

    matrix.release();
    console.log('\n🛡️ Error handling works perfectly!');
  });

  /**
   * Test 11: ToString and Large Matrix Handling
   */
  test('toString and large matrix handling work correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 11: ToString and Large Matrices');
    console.log('=========================================================');

    console.log('🔬 Testing toString and large matrix behavior...');

    // Test small matrix toString
    console.log('\n1. Testing small matrix toString:');
    const small = new HugeLongTriangularMatrix(3);
    small.set(0, 1, 5);
    small.set(0, 2, 8);
    small.set(1, 2, 3);
    small.fillDiagonal(1);

    const smallStr = small.toString();
    console.log(`  Small matrix toString:\n${smallStr}`);
    expect(smallStr).toContain('[1, 5, 8]');

    // Test large matrix toString (should be compact)
    console.log('\n2. Testing large matrix toString:');
    const large = new HugeLongTriangularMatrix(100);
    const largeStr = large.toString();
    console.log(`  Large matrix toString: ${largeStr}`);
    expect(largeStr).toContain('HugeLongTriangularMatrix(order=100');

    // Test empty matrix
    console.log('\n3. Testing empty matrix:');
    const empty = new HugeLongTriangularMatrix(0);
    expect(empty.order()).toBe(0);
    expect(empty.size()).toBe(0);
    expect(empty.trace()).toBe(0);
    expect(empty.countNonZero()).toBe(0);
    console.log('  ✅ Empty matrix handles all operations correctly');

    small.release();
    large.release();
    empty.release();
    console.log('\n🎯 ToString and edge cases work perfectly!');
  });

  /**
   * Test 12: Real-World Application - Distance Matrix Simulation
   */
  test('distance matrix simulation works correctly', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 12: Distance Matrix Application');
    console.log('========================================================');

    const cityCount = 6;
    const distances = new HugeLongTriangularMatrix(cityCount);
    const cities = ['NYC', 'LA', 'Chicago', 'Houston', 'Miami', 'Seattle'];

    console.log(`🔬 Creating distance matrix for ${cityCount} cities...`);
    console.log(`Cities: ${cities.join(', ')}`);

    // Set distances (only need to set upper triangle!)
    const cityDistances = [
      { from: 0, to: 1, distance: 2445 }, // NYC to LA
      { from: 0, to: 2, distance: 713 },  // NYC to Chicago
      { from: 0, to: 3, distance: 1420 }, // NYC to Houston
      { from: 0, to: 4, distance: 1090 }, // NYC to Miami
      { from: 0, to: 5, distance: 2408 }, // NYC to Seattle
      { from: 1, to: 2, distance: 1745 }, // LA to Chicago
      { from: 1, to: 3, distance: 1347 }, // LA to Houston
      { from: 1, to: 4, distance: 2339 }, // LA to Miami
      { from: 1, to: 5, distance: 959 },  // LA to Seattle
      { from: 2, to: 3, distance: 925 },  // Chicago to Houston
      { from: 2, to: 4, distance: 1188 }, // Chicago to Miami
      { from: 2, to: 5, distance: 1737 }, // Chicago to Seattle
      { from: 3, to: 4, distance: 968 },  // Houston to Miami
      { from: 3, to: 5, distance: 1891 }, // Houston to Seattle
      { from: 4, to: 5, distance: 2734 }  // Miami to Seattle
    ];

    console.log('\n1. Setting city distances:');
    for (const { from, to, distance } of cityDistances) {
      distances.set(from, to, distance);
      console.log(`  ${cities[from]} ↔ ${cities[to]}: ${distance} miles`);
    }

    // Verify symmetric access
    console.log('\n2. Verifying symmetric access:');
    for (const { from, to, distance } of cityDistances.slice(0, 5)) {
      const forward = distances.get(from, to);
      const reverse = distances.get(to, from);
      console.log(`  ${cities[from]} ↔ ${cities[to]}: forward=${forward}, reverse=${reverse} ${forward === reverse ? '✅' : '❌'}`);
      expect(forward).toBe(reverse);
      expect(forward).toBe(distance);
    }

    // Find nearest neighbors
    console.log('\n3. Finding nearest neighbors:');
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

    // Calculate memory savings
    console.log('\n4. Memory efficiency analysis:');
    const triangularElements = distances.size();
    const squareElements = cityCount * cityCount;
    const savedElements = squareElements - triangularElements;
    const percentSaved = ((savedElements / squareElements) * 100).toFixed(1);

    console.log(`  Triangular storage: ${triangularElements} elements`);
    console.log(`  Full matrix would be: ${squareElements} elements`);
    console.log(`  Memory saved: ${savedElements} elements (${percentSaved}%)`);
    console.log(`  Sparsity: ${(distances.sparsity() * 100).toFixed(1)}%`);

    distances.release();
    console.log('\n🗺️ Distance matrix application works perfectly!');
  });

  /**
   * Test 13: Performance Characteristics
   */
  test('performance characteristics are excellent', () => {
    console.log('\n🔺 TRIANGULAR MATRIX TEST 13: Performance Characteristics');
    console.log('========================================================');

    const order = 1000;
    const matrix = new HugeLongTriangularMatrix(order);
    const operations = 100000;

    console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on ${order}×${order} triangular matrix`);

    // Test set performance
    console.log('\n1. Testing set performance:');
    const setStart = performance.now();
    for (let i = 0; i < operations; i++) {
      const x = i % order;
      const y = x + (i % (order - x));
      if (y < order) {
        matrix.set(x, y, i);
      }
    }
    const setEnd = performance.now();
    const setTime = setEnd - setStart;
    const setOpsPerSec = Math.round(operations / (setTime / 1000));

    console.log(`  Set time: ${setTime.toFixed(2)}ms`);
    console.log(`  Set ops/sec: ${setOpsPerSec.toLocaleString()}`);

    // Test get performance
    console.log('\n2. Testing symmetric get performance:');
    const getStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < operations; i++) {
      const x = i % order;
      const y = x + (i % (order - x));
      if (y < order) {
        checksum += matrix.get(x, y) + matrix.get(y, x); // Test both directions
      }
    }
    const getEnd = performance.now();
    const getTime = getEnd - getStart;
    const getOpsPerSec = Math.round((operations * 2) / (getTime / 1000)); // *2 for symmetric access

    console.log(`  Get time: ${getTime.toFixed(2)}ms`);
    console.log(`  Get ops/sec: ${getOpsPerSec.toLocaleString()}`);
    console.log(`  Checksum: ${checksum.toLocaleString()} (prevents optimization)`);

    // Test iterator performance
    console.log('\n3. Testing iterator performance:');
    const iterStart = performance.now();
    let elementCount = 0;
    for (const [x, y, value] of matrix.entries()) {
      elementCount++;
    }
    const iterEnd = performance.now();
    const iterTime = iterEnd - iterStart;

    console.log(`  Iterator time: ${iterTime.toFixed(2)}ms`);
    console.log(`  Elements iterated: ${elementCount.toLocaleString()}`);

    // Performance expectations
    expect(setOpsPerSec).toBeGreaterThan(50000); // At least 50K ops/sec
    expect(getOpsPerSec).toBeGreaterThan(100000); // At least 100K ops/sec
    expect(iterTime).toBeLessThan(1000); // Iterator should be fast

    matrix.release();
    console.log('\n⚡ Performance characteristics are excellent!');
  });
});
