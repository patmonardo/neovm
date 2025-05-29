import { HugeLongArrayStack } from '../HugeLongArrayStack';

describe('HugeLongArrayStack - DFS Powerhouse for Graph Algorithms', () => {

  /**
   * Test 1: Basic Stack Creation and Properties
   */
  test('stack creation and basic properties work correctly', () => {
    console.log('\n📚 STACK TEST 1: Basic Creation and Properties');
    console.log('==============================================');

    const testCapacities = [0, 1, 100, 10000, 1000000];

    console.log('Capacity\tMemory Est.\tActual Creation\tOverhead');
    console.log('--------\t-----------\t---------------\t--------');

    for (const capacity of testCapacities) {
      console.log(`\n🔬 Testing stack with capacity: ${capacity.toLocaleString()}`);

      const memoryEst = HugeLongArrayStack.memoryEstimation(capacity);

      const stack = HugeLongArrayStack.newStack(capacity);

      console.log(`${capacity.toLocaleString()}\t\t${(memoryEst/1024).toFixed(1)}KB\t\t✅ Created\t\t~48 bytes`);

      expect(stack.size()).toBe(0);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.isFull()).toBe(capacity === 0);
      expect(stack.remainingCapacity()).toBe(capacity);

      console.log(`  Size: ${stack.size()}, Empty: ${stack.isEmpty()}, Full: ${stack.isFull()}`);
      console.log(`  Remaining capacity: ${stack.remainingCapacity().toLocaleString()}`);
    }

    console.log('\n🎯 Stack creation works perfectly!');
  });

  /**
   * Test 2: Basic Push/Pop Operations - The Core LIFO Behavior
   */
  test('push and pop operations maintain LIFO order', () => {
    console.log('\n📚 STACK TEST 2: LIFO Push/Pop Operations');
    console.log('=========================================');

    const stack = HugeLongArrayStack.newStack(100);

    console.log('🔬 Testing LIFO (Last In, First Out) behavior...');

    // Test single push/pop
    console.log('\n1. Single push/pop:');
    stack.push(42);
    console.log(`  Pushed: 42, Size: ${stack.size()}, Empty: ${stack.isEmpty()}`);
    expect(stack.size()).toBe(1);
    expect(stack.isEmpty()).toBe(false);

    const popped = stack.pop();
    console.log(`  Popped: ${popped}, Size: ${stack.size()}, Empty: ${stack.isEmpty()}`);
    expect(popped).toBe(42);
    expect(stack.size()).toBe(0);
    expect(stack.isEmpty()).toBe(true);

    // Test multiple push/pop sequence
    console.log('\n2. Multiple push sequence:');
    const values = [10, 20, 30, 40, 50];
    for (const value of values) {
      stack.push(value);
      console.log(`  Pushed: ${value}, Stack size: ${stack.size()}`);
    }

    console.log('\n3. LIFO pop sequence:');
    const expectedOrder = [50, 40, 30, 20, 10]; // Reverse order
    for (let i = 0; i < expectedOrder.length; i++) {
      const popped = stack.pop();
      const expected = expectedOrder[i];
      console.log(`  Popped: ${popped}, Expected: ${expected} ${popped === expected ? '✅' : '❌'}`);
      expect(popped).toBe(expected);
    }

    expect(stack.isEmpty()).toBe(true);
    console.log('\n📚 LIFO behavior verified perfectly!');
  });

  /**
   * Test 3: Peek Operations - Non-Destructive Access
   */
  test('peek operations work correctly without modifying stack', () => {
    console.log('\n📚 STACK TEST 3: Peek Operations');
    console.log('================================');

    const stack = HugeLongArrayStack.newStack(50);

    console.log('🔬 Testing peek operations...');

    // Test peek on empty stack
    console.log('\n1. Testing peek on empty stack:');
    expect(() => stack.peek()).toThrow('Stack is empty');
    console.log('  ✅ Peek on empty stack throws error correctly');

    // Test peek with values
    console.log('\n2. Testing peek with values:');
    stack.push(100);
    stack.push(200);
    stack.push(300);

    const sizeBefore = stack.size();
    const peeked = stack.peek();
    const sizeAfter = stack.size();

    console.log(`  Stack contents: [100, 200, 300]`);
    console.log(`  Peeked value: ${peeked} (should be 300)`);
    console.log(`  Size before peek: ${sizeBefore}, after peek: ${sizeAfter}`);
    console.log(`  Stack unchanged: ${sizeBefore === sizeAfter ? '✅' : '❌'}`);

    expect(peeked).toBe(300);
    expect(sizeBefore).toBe(sizeAfter);
    expect(stack.size()).toBe(3);

    // Verify stack is still intact
    console.log('\n3. Verifying stack integrity after peek:');
    expect(stack.pop()).toBe(300);
    expect(stack.pop()).toBe(200);
    expect(stack.pop()).toBe(100);
    console.log('  ✅ All values popped in correct LIFO order');

    console.log('\n👁️ Peek operations work perfectly!');
  });

  /**
   * Test 4: Capacity Management and Bounds Checking
   */
  test('capacity management and bounds checking work correctly', () => {
    console.log('\n📚 STACK TEST 4: Capacity Management');
    console.log('====================================');

    const capacity = 5;
    const stack = HugeLongArrayStack.newStack(capacity);

    console.log(`🔬 Testing capacity management (capacity: ${capacity})...`);

    // Fill to capacity
    console.log('\n1. Filling to capacity:');
    for (let i = 1; i <= capacity; i++) {
      stack.push(i * 10);
      console.log(`  Pushed: ${i * 10}, Size: ${stack.size()}/${capacity}, Full: ${stack.isFull()}`);
      expect(stack.size()).toBe(i);
      expect(stack.remainingCapacity()).toBe(capacity - i);
    }

    expect(stack.isFull()).toBe(true);
    expect(stack.remainingCapacity()).toBe(0);

    // Test overflow protection
    console.log('\n2. Testing overflow protection:');
    expect(() => stack.push(999)).toThrow('Stack is full');
    console.log('  ✅ Push to full stack throws error correctly');

    // Test underflow protection
    console.log('\n3. Testing underflow protection:');
    // Empty the stack
    while (!stack.isEmpty()) {
      stack.pop();
    }
    expect(() => stack.pop()).toThrow('Stack is empty');
    console.log('  ✅ Pop from empty stack throws error correctly');

    console.log('\n🛡️ Capacity management works perfectly!');
  });

  /**
   * Test 5: Clear Operation for Algorithm Reuse
   */
  test('clear operation works correctly for algorithm reuse', () => {
    console.log('\n📚 STACK TEST 5: Clear Operation');
    console.log('================================');

    const stack = HugeLongArrayStack.newStack(100);

    console.log('🔬 Testing clear operation for algorithm reuse...');

    // Fill with data
    console.log('\n1. Filling stack with test data:');
    for (let i = 1; i <= 10; i++) {
      stack.push(i * 7);
    }
    console.log(`  Filled with 10 elements, size: ${stack.size()}`);
    expect(stack.size()).toBe(10);
    expect(stack.isEmpty()).toBe(false);

    // Clear the stack
    console.log('\n2. Clearing stack:');
    stack.clear();
    console.log(`  After clear - Size: ${stack.size()}, Empty: ${stack.isEmpty()}`);
    expect(stack.size()).toBe(0);
    expect(stack.isEmpty()).toBe(true);
    expect(stack.remainingCapacity()).toBe(100);

    // Verify stack is reusable
    console.log('\n3. Verifying stack reusability:');
    stack.push(777);
    expect(stack.size()).toBe(1);
    expect(stack.peek()).toBe(777);
    console.log('  ✅ Stack reusable after clear');

    console.log('\n🧹 Clear operation works perfectly!');
  });

  /**
   * Test 6: Batch Operations for High Performance
   */
  test('batch operations work correctly for high performance', () => {
    console.log('\n📚 STACK TEST 6: Batch Operations');
    console.log('=================================');

    const stack = HugeLongArrayStack.newStack(1000);

    console.log('🔬 Testing batch operations for performance...');

    // Test pushAll
    console.log('\n1. Testing pushAll:');
    const values = [10, 20, 30, 40, 50];
    stack.pushAll(values);
    console.log(`  Pushed batch: [${values.join(', ')}]`);
    console.log(`  Stack size after pushAll: ${stack.size()}`);
    expect(stack.size()).toBe(5);

    // Test pushAll capacity checking
    console.log('\n2. Testing pushAll capacity validation:');
    const largeStack = HugeLongArrayStack.newStack(3);
    expect(() => largeStack.pushAll([1, 2, 3, 4])).toThrow('exceed capacity');
    console.log('  ✅ pushAll capacity validation works');

    // Test popAll
    console.log('\n3. Testing popAll:');
    const popped = stack.popAll(3);
    console.log(`  Popped batch: [${popped.join(', ')}] (should be [50, 40, 30] in LIFO order)`);
    console.log(`  Stack size after popAll: ${stack.size()}`);
    expect(popped).toEqual([50, 40, 30]); // LIFO order
    expect(stack.size()).toBe(2);

    // Test popAll validation
    console.log('\n4. Testing popAll validation:');
    expect(() => stack.popAll(5)).toThrow('Cannot pop 5 elements: only 2 available');
    console.log('  ✅ popAll validation works');

    console.log('\n⚡ Batch operations work perfectly!');
  });

  /**
   * Test 7: Advanced Peek Operations
   */
  test('advanced peek operations work correctly', () => {
    console.log('\n📚 STACK TEST 7: Advanced Peek Operations');
    console.log('=========================================');

    const stack = HugeLongArrayStack.newStack(100);

    console.log('🔬 Testing advanced peek operations...');

    // Set up test data
    const testValues = [100, 200, 300, 400, 500];
    stack.pushAll(testValues);
    console.log(`Setup: pushed [${testValues.join(', ')}]`);

    // Test peekMultiple
    console.log('\n1. Testing peekMultiple:');
    const peeked = stack.peekMultiple(3);
    console.log(`  Peeked top 3: [${peeked.join(', ')}] (should be [500, 400, 300] in LIFO order)`);
    console.log(`  Stack size unchanged: ${stack.size()} (should be 5)`);
    expect(peeked).toEqual([500, 400, 300]); // Top 3 in LIFO order
    expect(stack.size()).toBe(5); // Unchanged

    // Test peekMultiple validation
    console.log('\n2. Testing peekMultiple validation:');
    expect(() => stack.peekMultiple(10)).toThrow('Cannot peek 10 elements: only 5 available');
    console.log('  ✅ peekMultiple validation works');

    // Test edge cases
    console.log('\n3. Testing edge cases:');
    const peekZero = stack.peekMultiple(0);
    console.log(`  Peek 0 elements: [${peekZero.join(', ')}] (should be empty)`);
    expect(peekZero).toEqual([]);

    const peekOne = stack.peekMultiple(1);
    console.log(`  Peek 1 element: [${peekOne.join(', ')}] (should be [500])`);
    expect(peekOne).toEqual([500]);

    console.log('\n👁️ Advanced peek operations work perfectly!');
  });

  /**
   * Test 8: Drain Operation
   */
  test('drain operation works correctly', () => {
    console.log('\n📚 STACK TEST 8: Drain Operation');
    console.log('================================');

    const stack = HugeLongArrayStack.newStack(100);

    console.log('🔬 Testing drain operation...');

    // Set up test data
    const testValues = [111, 222, 333, 444, 555];
    stack.pushAll(testValues);
    console.log(`Setup: pushed [${testValues.join(', ')}]`);
    console.log(`Stack size before drain: ${stack.size()}`);

    // Test drain
    console.log('\n1. Testing drain:');
    const drained = stack.drain();
    console.log(`  Drained all: [${drained.join(', ')}] (should be [555, 444, 333, 222, 111] in LIFO order)`);
    console.log(`  Stack size after drain: ${stack.size()} (should be 0)`);
    console.log(`  Stack is empty: ${stack.isEmpty()} (should be true)`);

    expect(drained).toEqual([555, 444, 333, 222, 111]); // LIFO order
    expect(stack.size()).toBe(0);
    expect(stack.isEmpty()).toBe(true);

    // Test drain on empty stack
    console.log('\n2. Testing drain on empty stack:');
    const emptyDrain = stack.drain();
    console.log(`  Drain empty stack: [${emptyDrain.join(', ')}] (should be empty)`);
    expect(emptyDrain).toEqual([]);
    expect(stack.isEmpty()).toBe(true);

    console.log('\n🚰 Drain operation works perfectly!');
  });

  /**
   * Test 9: Iterator and Array Conversion
   */
  test('iterator and array conversion work correctly', () => {
    console.log('\n📚 STACK TEST 9: Iterator and Array Conversion');
    console.log('==============================================');

    const stack = HugeLongArrayStack.newStack(100);

    console.log('🔬 Testing iteration and array conversion...');

    // Set up test data
    const testValues = [10, 20, 30, 40, 50];
    stack.pushAll(testValues);
    console.log(`Setup: pushed [${testValues.join(', ')}]`);

    // Test iterator (bottom to top order)
    console.log('\n1. Testing iterator (bottom to top):');
    const iteratedValues = Array.from(stack);
    console.log(`  Iterated: [${iteratedValues.join(', ')}] (should be [10, 20, 30, 40, 50] - insertion order)`);
    expect(iteratedValues).toEqual([10, 20, 30, 40, 50]); // Bottom to top (insertion order)

    // Test toArray
    console.log('\n2. Testing toArray:');
    const arrayValues = stack.toArray();
    console.log(`  Array: [${arrayValues.join(', ')}] (should match iterator)`);
    expect(arrayValues).toEqual([10, 20, 30, 40, 50]); // Same as iterator
    expect(arrayValues).toEqual(iteratedValues);

    // Verify stack is unchanged
    console.log('\n3. Verifying stack integrity:');
    console.log(`  Stack size: ${stack.size()} (should be 5)`);
    console.log(`  Top element: ${stack.peek()} (should be 50)`);
    expect(stack.size()).toBe(5);
    expect(stack.peek()).toBe(50);

    // Test iterator on empty stack
    console.log('\n4. Testing iterator on empty stack:');
    stack.clear();
    const emptyIterated = Array.from(stack);
    const emptyArray = stack.toArray();
    console.log(`  Empty iterator: [${emptyIterated.join(', ')}] (should be empty)`);
    console.log(`  Empty array: [${emptyArray.join(', ')}] (should be empty)`);
    expect(emptyIterated).toEqual([]);
    expect(emptyArray).toEqual([]);

    console.log('\n🔄 Iterator and array conversion work perfectly!');
  });

  /**
   * Test 10: DFS Algorithm Simulation - Real-World Application
   */
  test('DFS algorithm simulation works correctly', () => {
    console.log('\n📚 STACK TEST 10: DFS Algorithm Simulation');
    console.log('==========================================');

    console.log('🔬 Simulating Depth-First Search on a graph...');

    // Create a simple graph representation
    const graph = {
      0: [1, 2],      // Node 0 connects to 1, 2
      1: [0, 3, 4],   // Node 1 connects to 0, 3, 4
      2: [0, 5],      // Node 2 connects to 0, 5
      3: [1],         // Node 3 connects to 1
      4: [1],         // Node 4 connects to 1
      5: [2]          // Node 5 connects to 2
    };

    console.log('\nGraph structure:');
    console.log('    0');
    console.log('   / \\');
    console.log('  1   2');
    console.log(' /|   |\\');
    console.log('3 4   5');

    // DFS implementation using our stack
    const dfsStack = HugeLongArrayStack.newStack(100);
    const visited = new Set<number>();
    const visitOrder: number[] = [];

    console.log('\n1. Starting DFS from node 0:');
    dfsStack.push(0);

    while (!dfsStack.isEmpty()) {
      const currentNode = dfsStack.pop();

      if (!visited.has(currentNode)) {
        visited.add(currentNode);
        visitOrder.push(currentNode);
        console.log(`  Visited node: ${currentNode}, Stack size: ${dfsStack.size()}`);

        // Push neighbors in reverse order for predictable DFS
        const neighbors = graph[currentNode as keyof typeof graph] || [];
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const neighbor = neighbors[i];
          if (!visited.has(neighbor)) {
            dfsStack.push(neighbor);
            console.log(`    Pushed neighbor: ${neighbor}`);
          }
        }

        console.log(`    Stack contents: [${dfsStack.toArray().join(', ')}]`);
      }
    }

    console.log(`\n2. DFS traversal complete:`);
    console.log(`  Visit order: [${visitOrder.join(', ')}]`);
    console.log(`  All nodes visited: ${visited.size === 6 ? '✅' : '❌'}`);
    console.log(`  Stack is empty: ${dfsStack.isEmpty() ? '✅' : '❌'}`);

    // Verify all nodes were visited
    expect(visited.size).toBe(6);
    expect(visitOrder).toHaveLength(6);
    expect(dfsStack.isEmpty()).toBe(true);

    // Verify DFS properties
    expect(visitOrder[0]).toBe(0); // Started from node 0
    expect(visited.has(0)).toBe(true);
    expect(visited.has(1)).toBe(true);
    expect(visited.has(2)).toBe(true);
    expect(visited.has(3)).toBe(true);
    expect(visited.has(4)).toBe(true);
    expect(visited.has(5)).toBe(true);

    console.log('\n🕸️ DFS algorithm simulation works perfectly!');
  });

  /**
   * Test 11: Performance Characteristics
   */
  test('performance characteristics are excellent', () => {
    console.log('\n📚 STACK TEST 11: Performance Characteristics');
    console.log('==============================================');

    const capacity = 1000000; // 1 million elements
    const stack = HugeLongArrayStack.newStack(capacity);
    const operations = 500000; // 500K operations

    console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on ${capacity.toLocaleString()} capacity stack`);

    // Test push performance
    console.log('\n1. Testing push performance:');
    const pushStart = performance.now();
    for (let i = 0; i < operations; i++) {
      stack.push(i);
    }
    const pushEnd = performance.now();
    const pushTime = pushEnd - pushStart;
    const pushOpsPerSec = Math.round(operations / (pushTime / 1000));

    console.log(`  Push time: ${pushTime.toFixed(2)}ms`);
    console.log(`  Push ops/sec: ${pushOpsPerSec.toLocaleString()}`);
    console.log(`  Final stack size: ${stack.size().toLocaleString()}`);

    // Test pop performance
    console.log('\n2. Testing pop performance:');
    const popStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < operations; i++) {
      checksum += stack.pop();
    }
    const popEnd = performance.now();
    const popTime = popEnd - popStart;
    const popOpsPerSec = Math.round(operations / (popTime / 1000));

    console.log(`  Pop time: ${popTime.toFixed(2)}ms`);
    console.log(`  Pop ops/sec: ${popOpsPerSec.toLocaleString()}`);
    console.log(`  Checksum: ${checksum.toLocaleString()} (prevents optimization)`);
    console.log(`  Final stack size: ${stack.size()}`);

    // Test mixed operations
    console.log('\n3. Testing mixed push/pop performance:');
    const mixedStart = performance.now();
    for (let i = 0; i < operations / 10; i++) {
      // Push 10, pop 5 pattern
      for (let j = 0; j < 10; j++) {
        stack.push(i * 10 + j);
      }
      for (let j = 0; j < 5; j++) {
        stack.pop();
      }
    }
    const mixedEnd = performance.now();
    const mixedTime = mixedEnd - mixedStart;
    const mixedOpsPerSec = Math.round((operations * 1.5) / (mixedTime / 1000)); // 15 ops per iteration

    console.log(`  Mixed operations time: ${mixedTime.toFixed(2)}ms`);
    console.log(`  Mixed ops/sec: ${mixedOpsPerSec.toLocaleString()}`);

    // Performance expectations
    expect(pushOpsPerSec).toBeGreaterThan(1000000); // At least 1M pushes/sec
    expect(popOpsPerSec).toBeGreaterThan(1000000);  // At least 1M pops/sec
    expect(mixedOpsPerSec).toBeGreaterThan(500000); // At least 500K mixed ops/sec

    console.log('\n⚡ Performance characteristics are excellent!');
  });

  /**
   * Test 12: Memory Efficiency and Large Capacity
   */
  test('memory efficiency and large capacity work correctly', () => {
    console.log('\n📚 STACK TEST 12: Memory Efficiency and Large Capacity');
    console.log('======================================================');

    console.log('🔬 Testing memory efficiency for various capacities...');

    const testCapacities = [1000, 10000, 100000, 1000000];

    console.log('\nCapacity\t\tEstimated Memory\tActual Test\tEfficiency');
    console.log('--------\t\t----------------\t-----------\t----------');

    for (const capacity of testCapacities) {
      const memoryEst = HugeLongArrayStack.memoryEstimation(capacity);

      console.log(`\n🔬 Testing capacity: ${capacity.toLocaleString()}`);

      const stack = HugeLongArrayStack.newStack(capacity);

      // Fill to 50% capacity and test
      const halfCapacity = Math.floor(capacity / 2);
      for (let i = 0; i < halfCapacity; i++) {
        stack.push(i);
      }

      const memoryMB = (memoryEst / (1024 * 1024)).toFixed(2);
      const bytesPerElement = capacity > 0 ? (memoryEst / capacity).toFixed(1) : 'N/A';

      console.log(`${capacity.toLocaleString()}\t\t\t${memoryMB}MB\t\t\t✅ Created\t\t${bytesPerElement} bytes/elem`);

      expect(stack.size()).toBe(halfCapacity);
      expect(stack.remainingCapacity()).toBe(capacity - halfCapacity);

      // Test that we can actually use the full capacity
      for (let i = halfCapacity; i < capacity; i++) {
        stack.push(i);
      }

      expect(stack.size()).toBe(capacity);
      expect(stack.isFull()).toBe(true);

      console.log(`  ✅ Successfully filled to full capacity: ${capacity.toLocaleString()}`);
    }

    console.log('\n💾 Memory efficiency and large capacity work perfectly!');
  });
});
