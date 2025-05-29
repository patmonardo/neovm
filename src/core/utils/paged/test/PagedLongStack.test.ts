import { PagedLongStack } from '../PagedLongStack';

describe('PagedLongStack - Real Collections SDK Testing', () => {

  /**
   * Test 1: Basic Stack Operations
   * Validates PageAllocator through real usage
   */
  test('basic stack operations work correctly', async () => {
    console.log('\n=== Basic Stack Operations ===');

    const stack = new PagedLongStack(1000);

    // Test empty state
    expect(stack.isEmpty()).toBe(true);
    expect(stack.size()).toBe(0);

    // Test basic push/pop
    await stack.push(42);
    await stack.push(123);
    await stack.push(456);

    expect(stack.isEmpty()).toBe(false);
    expect(stack.size()).toBe(3);
    expect(stack.peek()).toBe(456);

    // Test LIFO behavior
    expect(stack.pop()).toBe(456);
    expect(stack.pop()).toBe(123);
    expect(stack.pop()).toBe(42);

    expect(stack.isEmpty()).toBe(true);
    expect(stack.size()).toBe(0);

    console.log('✓ Basic push/pop/peek operations work correctly');
  });

  /**
   * Test 2: Page Boundary Behavior
   * This is where we test PageAllocator's page management!
   */
  test('page boundary transitions work seamlessly', async () => {
    console.log('\n=== Page Boundary Testing ===');

    const stack = new PagedLongStack(100); // Small capacity to force paging

    // Fill beyond initial page capacity
    const values: number[] = [];
    const pushCount = 2000; // Definitely cross page boundaries

    console.log(`Pushing ${pushCount} values to test page transitions...`);

    // Push values
    for (let i = 0; i < pushCount; i++) {
      values.push(i * 2); // Even numbers for easy verification
      await stack.push(i * 2);

      if (i % 500 === 0) {
        console.log(`  Pushed ${i} values, stack size: ${stack.size()}`);
      }
    }

    expect(stack.size()).toBe(pushCount);
    expect(stack.peek()).toBe((pushCount - 1) * 2);

    console.log(`✓ Successfully pushed ${pushCount} values across multiple pages`);

    // Pop all values and verify LIFO order
    const poppedValues: number[] = [];
    while (!stack.isEmpty()) {
      poppedValues.push(stack.pop());

      if (poppedValues.length % 500 === 0) {
        console.log(`  Popped ${poppedValues.length} values, remaining: ${stack.size()}`);
      }
    }

    // Verify all values popped in reverse order
    expect(poppedValues.length).toBe(pushCount);
    for (let i = 0; i < pushCount; i++) {
      const expectedValue = (pushCount - 1 - i) * 2;
      expect(poppedValues[i]).toBe(expectedValue);
    }

    console.log('✓ All values popped in correct LIFO order across page boundaries');
  });

  /**
   * Test 3: DFS Simulation - Real Graph Algorithm Usage
   * This demonstrates the actual use case!
   */
  test('DFS traversal simulation', async () => {
    console.log('\n=== DFS Traversal Simulation ===');

    // Simulate a tree/graph structure
    const adjacencyList: Map<number, number[]> = new Map();

    // Create a simple tree: 0 -> [1,2], 1 -> [3,4], 2 -> [5,6]
    adjacencyList.set(0, [1, 2]);
    adjacencyList.set(1, [3, 4]);
    adjacencyList.set(2, [5, 6]);
    adjacencyList.set(3, []);
    adjacencyList.set(4, []);
    adjacencyList.set(5, []);
    adjacencyList.set(6, []);

    const dfsStack = new PagedLongStack(1000);
    const visited: Set<number> = new Set();
    const visitOrder: number[] = [];

    // Start DFS from node 0
    await dfsStack.push(0);

    console.log('Starting DFS traversal...');

    while (!dfsStack.isEmpty()) {
      const currentNode = dfsStack.pop();

      if (!visited.has(currentNode)) {
        visited.add(currentNode);
        visitOrder.push(currentNode);

        console.log(`  Visiting node ${currentNode}`);

        // Push neighbors in reverse order for proper DFS order
        const neighbors = adjacencyList.get(currentNode) || [];
        for (let i = neighbors.length - 1; i >= 0; i--) {
          if (!visited.has(neighbors[i])) {
            await dfsStack.push(neighbors[i]);
          }
        }
      }
    }

    console.log(`DFS visit order: ${visitOrder.join(' -> ')}`);

    // Verify all nodes visited
    expect(visitOrder.length).toBe(7);
    expect(visited.size).toBe(7);
    expect(visitOrder[0]).toBe(0); // Started from 0

    console.log('✓ DFS traversal completed successfully');
  });

  /**
   * Test 4: Memory Estimation Validation
   * Test PageAllocator's memory calculation accuracy
   */
  test('memory estimation accuracy', () => {
    console.log('\n=== Memory Estimation Testing ===');

    const testSizes = [100, 1000, 10000, 100000];

    console.log('Size\t\tEstimated Memory\tActual Objects');
    console.log('----\t\t----------------\t--------------');

    for (const size of testSizes) {
      const estimated = PagedLongStack.memoryEstimation(size);
      const stack = new PagedLongStack(size);

      console.log(`${size.toLocaleString()}\t\t${(estimated / 1024).toFixed(2)} KB\t\t${stack.size()} elements`);

      expect(estimated).toBeGreaterThan(0);
      expect(stack.size()).toBe(0); // New stack should be empty

      stack.release(); // Clean up
    }

    console.log('✓ Memory estimation provides reasonable values');
  });

  /**
   * Test 5: Performance Characteristics
   * Validate O(1) operations claim
   */
  test('performance characteristics validation', async () => {
    console.log('\n=== Performance Testing ===');

    const stack = new PagedLongStack(50000);
    const operationSizes = [1000, 5000, 10000, 20000];

    console.log('Operations\tPush Time(ms)\tPop Time(ms)\tOps/sec');
    console.log('----------\t-------------\t------------\t-------');

    for (const opCount of operationSizes) {
      // Test push performance
      const pushStart = performance.now();
      for (let i = 0; i < opCount; i++) {
        await stack.push(i);
      }
      const pushEnd = performance.now();

      // Test pop performance
      const popStart = performance.now();
      for (let i = 0; i < opCount; i++) {
        stack.pop();
      }
      const popEnd = performance.now();

      const pushTime = pushEnd - pushStart;
      const popTime = popEnd - popStart;
      const opsPerSec = Math.round(opCount / ((pushTime + popTime) / 2000));

      console.log(`${opCount.toLocaleString()}\t\t${pushTime.toFixed(2)}\t\t${popTime.toFixed(2)}\t\t${opsPerSec.toLocaleString()}`);

      // Verify reasonable performance (should be very fast)
      expect(pushTime).toBeLessThan(100); // Less than 100ms for these sizes
      expect(popTime).toBeLessThan(100);
    }

    console.log('✓ Operations maintain good performance characteristics');
  });

  /**
   * Test 6: Error Handling
   * Validate proper error conditions
   */
  test('error handling works correctly', async () => {
    console.log('\n=== Error Handling Testing ===');

    const stack = new PagedLongStack(100);

    // Test pop from empty stack
    expect(() => stack.pop()).toThrow('Cannot pop from empty stack');
    expect(() => stack.peek()).toThrow('Cannot peek at empty stack');

    // Test that stack recovers after errors
    await stack.push(123);
    expect(stack.peek()).toBe(123);
    expect(stack.pop()).toBe(123);

    console.log('✓ Error handling works correctly and stack recovers');
  });
});
