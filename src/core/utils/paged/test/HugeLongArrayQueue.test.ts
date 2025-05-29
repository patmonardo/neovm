import { HugeLongArrayQueue } from '../HugeLongArrayQueue';

describe('HugeLongArrayQueue - BFS Powerhouse for Graph Algorithms', () => {

  /**
   * Test 1: Basic Queue Creation and Properties
   */
  test('queue creation and basic properties work correctly', () => {
    console.log('\n🌊 QUEUE TEST 1: Basic Creation and Properties');
    console.log('==============================================');

    const testCapacities = [0, 1, 10, 1000, 100000, 1000000];

    console.log('Capacity\tMemory Est.\tActual Creation\tStorage Overhead');
    console.log('--------\t-----------\t---------------\t----------------');

    for (const capacity of testCapacities) {
      console.log(`\n🔬 Testing queue with capacity: ${capacity.toLocaleString()}`);

      const memoryEst = HugeLongArrayQueue.memoryEstimation(capacity);

      const queue = HugeLongArrayQueue.newQueue(capacity);

      const memoryKB = (memoryEst / 1024).toFixed(1);
      const storageOverhead = capacity > 0 ? '+1 for circular buffer' : 'N/A';

      console.log(`${capacity.toLocaleString()}\t\t${memoryKB}KB\t\t✅ Created\t\t${storageOverhead}`);

      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.isFull()).toBe(capacity === 0);
      expect(queue.remainingCapacity()).toBe(capacity);

      console.log(`  Size: ${queue.size()}, Empty: ${queue.isEmpty()}, Full: ${queue.isFull()}`);
      console.log(`  Remaining capacity: ${queue.remainingCapacity().toLocaleString()}`);
    }

    console.log('\n🎯 Queue creation works perfectly!');
  });

  /**
   * Test 2: FIFO Operations - The Heart of BFS
   */
  test('FIFO operations maintain correct order', () => {
    console.log('\n🌊 QUEUE TEST 2: FIFO (First In, First Out) Operations');
    console.log('======================================================');

    const queue = HugeLongArrayQueue.newQueue(100);

    console.log('🔬 Testing FIFO behavior for BFS algorithms...');

    // Test single add/remove
    console.log('\n1. Single add/remove:');
    queue.add(42);
    console.log(`  Added: 42, Size: ${queue.size()}, Empty: ${queue.isEmpty()}`);
    expect(queue.size()).toBe(1);
    expect(queue.isEmpty()).toBe(false);

    const removed = queue.remove();
    console.log(`  Removed: ${removed}, Size: ${queue.size()}, Empty: ${queue.isEmpty()}`);
    expect(removed).toBe(42);
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);

    // Test FIFO sequence - critical for BFS correctness
    console.log('\n2. FIFO sequence test:');
    const nodes = [100, 200, 300, 400, 500]; // Simulating graph nodes

    console.log('  Adding nodes in order (simulating BFS queue):');
    for (const node of nodes) {
      queue.add(node);
      console.log(`    Added node: ${node}, Queue size: ${queue.size()}`);
    }

    console.log('  Removing nodes in FIFO order:');
    for (let i = 0; i < nodes.length; i++) {
      const removed = queue.remove();
      const expected = nodes[i];
      console.log(`    Removed: ${removed}, Expected: ${expected} ${removed === expected ? '✅' : '❌'}`);
      expect(removed).toBe(expected);
    }

    expect(queue.isEmpty()).toBe(true);
    console.log('\n🌊 FIFO behavior verified perfectly!');
  });

  /**
   * Test 3: Peek Operations - Look Ahead Without Commitment
   */
  test('peek operations work without modifying queue', () => {
    console.log('\n🌊 QUEUE TEST 3: Peek Operations');
    console.log('================================');

    const queue = HugeLongArrayQueue.newQueue(50);

    console.log('🔬 Testing peek operations for BFS lookahead...');

    // Test peek on empty queue
    console.log('\n1. Testing peek on empty queue:');
    expect(() => queue.peek()).toThrow('Queue is empty');
    console.log('  ✅ Peek on empty queue throws error correctly');

    // Test peek with values
    console.log('\n2. Testing peek with queued values:');
    queue.add(777);  // Front of queue
    queue.add(888);  // Second in queue
    queue.add(999);  // Back of queue

    const sizeBefore = queue.size();
    const peeked = queue.peek();
    const sizeAfter = queue.size();

    console.log(`  Queue contents: [777, 888, 999] (front to back)`);
    console.log(`  Peeked value: ${peeked} (should be 777 - front of queue)`);
    console.log(`  Size before peek: ${sizeBefore}, after peek: ${sizeAfter}`);
    console.log(`  Queue unchanged: ${sizeBefore === sizeAfter ? '✅' : '❌'}`);

    expect(peeked).toBe(777);
    expect(sizeBefore).toBe(sizeAfter);
    expect(queue.size()).toBe(3);

    // Verify queue integrity
    console.log('\n3. Verifying queue integrity after peek:');
    expect(queue.remove()).toBe(777);
    expect(queue.remove()).toBe(888);
    expect(queue.remove()).toBe(999);
    console.log('  ✅ All values removed in correct FIFO order');

    console.log('\n👁️ Peek operations work perfectly!');
  });

  /**
   * Test 4: Circular Buffer Mechanics - The Magic of Efficiency
   */
  test('circular buffer mechanics work correctly', () => {
    console.log('\n🌊 QUEUE TEST 4: Circular Buffer Mechanics');
    console.log('==========================================');

    const capacity = 5;
    const queue = HugeLongArrayQueue.newQueue(capacity);

    console.log(`🔬 Testing circular buffer behavior (capacity: ${capacity})...`);

    // Fill to capacity
    console.log('\n1. Filling to capacity:');
    for (let i = 1; i <= capacity; i++) {
      queue.add(i * 10);
      console.log(`  Added: ${i * 10}, Size: ${queue.size()}/${capacity}, Full: ${queue.isFull()}`);
      expect(queue.size()).toBe(i);
      expect(queue.remainingCapacity()).toBe(capacity - i);
    }

    expect(queue.isFull()).toBe(true);
    expect(queue.remainingCapacity()).toBe(0);

    // Test wraparound behavior
    console.log('\n2. Testing circular wraparound:');

    // Remove some elements to make space
    const removed1 = queue.remove();
    const removed2 = queue.remove();
    console.log(`  Removed: ${removed1}, ${removed2}`);
    console.log(`  Size after removal: ${queue.size()}, Remaining capacity: ${queue.remainingCapacity()}`);

    // Add new elements (should wrap around internally)
    queue.add(777);
    queue.add(888);
    console.log(`  Added: 777, 888 (using wraparound space)`);
    console.log(`  Queue is full again: ${queue.isFull()}`);

    // Verify FIFO order is maintained through wraparound
    console.log('\n3. Verifying FIFO order through wraparound:');
    const expectedOrder = [30, 40, 50, 777, 888]; // What should remain
    const actualOrder = queue.toArray();
    console.log(`  Expected order: [${expectedOrder.join(', ')}]`);
    console.log(`  Actual order:   [${actualOrder.join(', ')}]`);
    console.log(`  Order correct: ${JSON.stringify(actualOrder) === JSON.stringify(expectedOrder) ? '✅' : '❌'}`);
    expect(actualOrder).toEqual(expectedOrder);

    console.log('\n🔄 Circular buffer mechanics work perfectly!');
  });

  /**
   * Test 5: Capacity Management and Bounds Checking
   */
  test('capacity management and bounds checking work correctly', () => {
    console.log('\n🌊 QUEUE TEST 5: Capacity Management');
    console.log('====================================');

    const capacity = 4;
    const queue = HugeLongArrayQueue.newQueue(capacity);

    console.log(`🔬 Testing capacity management (capacity: ${capacity})...`);

    // Test overflow protection
    console.log('\n1. Testing overflow protection:');

    // Fill to capacity
    for (let i = 1; i <= capacity; i++) {
      queue.add(i * 100);
    }
    console.log(`  Filled queue to capacity: ${queue.size()}/${capacity}`);
    expect(queue.isFull()).toBe(true);

    // Try to overflow
    expect(() => queue.add(999)).toThrow('Queue is full');
    console.log('  ✅ Add to full queue throws error correctly');

    // Test underflow protection
    console.log('\n2. Testing underflow protection:');

    // Empty the queue
    while (!queue.isEmpty()) {
      queue.remove();
    }
    console.log(`  Emptied queue: size = ${queue.size()}`);
    expect(queue.isEmpty()).toBe(true);

    // Try to underflow
    expect(() => queue.remove()).toThrow('Queue is empty');
    console.log('  ✅ Remove from empty queue throws error correctly');

    expect(() => queue.peek()).toThrow('Queue is empty');
    console.log('  ✅ Peek empty queue throws error correctly');

    console.log('\n🛡️ Capacity management works perfectly!');
  });

  /**
   * Test 6: Clear Operation for Algorithm Reuse
   */
  test('clear operation works correctly for algorithm reuse', () => {
    console.log('\n🌊 QUEUE TEST 6: Clear Operation');
    console.log('================================');

    const queue = HugeLongArrayQueue.newQueue(100);

    console.log('🔬 Testing clear operation for BFS algorithm reuse...');

    // Fill with data
    console.log('\n1. Filling queue with test data:');
    for (let i = 1; i <= 10; i++) {
      queue.add(i * 11);
    }
    console.log(`  Filled with 10 elements, size: ${queue.size()}`);
    expect(queue.size()).toBe(10);
    expect(queue.isEmpty()).toBe(false);

    // Clear the queue
    console.log('\n2. Clearing queue:');
    queue.clear();
    console.log(`  After clear - Size: ${queue.size()}, Empty: ${queue.isEmpty()}`);
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.remainingCapacity()).toBe(100);

    // Verify queue is reusable
    console.log('\n3. Verifying queue reusability:');
    queue.add(555);
    expect(queue.size()).toBe(1);
    expect(queue.peek()).toBe(555);
    console.log('  ✅ Queue reusable after clear');

    console.log('\n🧹 Clear operation works perfectly!');
  });

  /**
   * Test 7: Batch Operations for High Performance
   */
  test('batch operations work correctly for high performance', () => {
    console.log('\n🌊 QUEUE TEST 7: Batch Operations');
    console.log('=================================');

    const queue = HugeLongArrayQueue.newQueue(1000);

    console.log('🔬 Testing batch operations for performance...');

    // Test addAll
    console.log('\n1. Testing addAll:');
    const nodes = [111, 222, 333, 444, 555];
    queue.addAll(nodes);
    console.log(`  Added batch: [${nodes.join(', ')}]`);
    console.log(`  Queue size after addAll: ${queue.size()}`);
    expect(queue.size()).toBe(5);

    // Test addAll capacity checking
    console.log('\n2. Testing addAll capacity validation:');
    const smallQueue = HugeLongArrayQueue.newQueue(3);
    expect(() => smallQueue.addAll([1, 2, 3, 4])).toThrow('exceed capacity');
    console.log('  ✅ addAll capacity validation works');

    // Test removeAll
    console.log('\n3. Testing removeAll:');
    const removed = queue.removeAll(3);
    console.log(`  Removed batch: [${removed.join(', ')}] (should be [111, 222, 333] in FIFO order)`);
    console.log(`  Queue size after removeAll: ${queue.size()}`);
    expect(removed).toEqual([111, 222, 333]); // FIFO order
    expect(queue.size()).toBe(2);

    // Test removeAll validation
    console.log('\n4. Testing removeAll validation:');
    expect(() => queue.removeAll(5)).toThrow('Cannot remove 5 elements: only 2 available');
    console.log('  ✅ removeAll validation works');

    console.log('\n⚡ Batch operations work perfectly!');
  });

  /**
   * Test 8: Drain Operation for Complete Processing
   */
  test('drain operation works correctly', () => {
    console.log('\n🌊 QUEUE TEST 8: Drain Operation');
    console.log('================================');

    const queue = HugeLongArrayQueue.newQueue(100);

    console.log('🔬 Testing drain operation for complete queue processing...');

    // Set up test data
    const testNodes = [10, 20, 30, 40, 50];
    queue.addAll(testNodes);
    console.log(`Setup: added [${testNodes.join(', ')}]`);
    console.log(`Queue size before drain: ${queue.size()}`);

    // Test drain
    console.log('\n1. Testing drain:');
    const drained = queue.drain();
    console.log(`  Drained all: [${drained.join(', ')}] (should be [10, 20, 30, 40, 50] in FIFO order)`);
    console.log(`  Queue size after drain: ${queue.size()} (should be 0)`);
    console.log(`  Queue is empty: ${queue.isEmpty()} (should be true)`);

    expect(drained).toEqual([10, 20, 30, 40, 50]); // FIFO order
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);

    // Test drain on empty queue
    console.log('\n2. Testing drain on empty queue:');
    const emptyDrain = queue.drain();
    console.log(`  Drain empty queue: [${emptyDrain.join(', ')}] (should be empty)`);
    expect(emptyDrain).toEqual([]);
    expect(queue.isEmpty()).toBe(true);

    console.log('\n🚰 Drain operation works perfectly!');
  });

  /**
   * Test 9: Iterator and Array Conversion
   */
  test('iterator and array conversion work correctly', () => {
    console.log('\n🌊 QUEUE TEST 9: Iterator and Array Conversion');
    console.log('==============================================');

    const queue = HugeLongArrayQueue.newQueue(100);

    console.log('🔬 Testing iteration and array conversion...');

    // Set up test data
    const testNodes = [100, 200, 300, 400, 500];
    queue.addAll(testNodes);
    console.log(`Setup: added [${testNodes.join(', ')}]`);

    // Test iterator (front to back order)
    console.log('\n1. Testing iterator (front to back):');
    const iteratedValues = Array.from(queue);
    console.log(`  Iterated: [${iteratedValues.join(', ')}] (should be [100, 200, 300, 400, 500] - FIFO order)`);
    expect(iteratedValues).toEqual([100, 200, 300, 400, 500]); // Front to back (FIFO order)

    // Test toArray
    console.log('\n2. Testing toArray:');
    const arrayValues = queue.toArray();
    console.log(`  Array: [${arrayValues.join(', ')}] (should match iterator)`);
    expect(arrayValues).toEqual([100, 200, 300, 400, 500]); // Same as iterator
    expect(arrayValues).toEqual(iteratedValues);

    // Verify queue is unchanged
    console.log('\n3. Verifying queue integrity:');
    console.log(`  Queue size: ${queue.size()} (should be 5)`);
    console.log(`  Front element: ${queue.peek()} (should be 100)`);
    expect(queue.size()).toBe(5);
    expect(queue.peek()).toBe(100);

    // Test iterator on empty queue
    console.log('\n4. Testing iterator on empty queue:');
    queue.clear();
    const emptyIterated = Array.from(queue);
    const emptyArray = queue.toArray();
    console.log(`  Empty iterator: [${emptyIterated.join(', ')}] (should be empty)`);
    console.log(`  Empty array: [${emptyArray.join(', ')}] (should be empty)`);
    expect(emptyIterated).toEqual([]);
    expect(emptyArray).toEqual([]);

    console.log('\n🔄 Iterator and array conversion work perfectly!');
  });

  /**
   * Test 10: BFS Algorithm Simulation - The Real Deal!
   */
  test('BFS algorithm simulation works correctly', () => {
    console.log('\n🌊 QUEUE TEST 10: BFS Algorithm Simulation');
    console.log('==========================================');

    console.log('🔬 Simulating Breadth-First Search on a social network graph...');

    // Create a social network graph
    const graph = {
      0: [1, 2],        // Person 0 knows 1, 2
      1: [0, 3, 4],     // Person 1 knows 0, 3, 4
      2: [0, 5, 6],     // Person 2 knows 0, 5, 6
      3: [1, 7],        // Person 3 knows 1, 7
      4: [1, 8],        // Person 4 knows 1, 8
      5: [2],           // Person 5 knows 2
      6: [2, 9],        // Person 6 knows 2, 9
      7: [3],           // Person 7 knows 3
      8: [4],           // Person 8 knows 4
      9: [6]            // Person 9 knows 6
    };

    console.log('\nSocial network structure:');
    console.log('      0');
    console.log('     / \\');
    console.log('    1   2');
    console.log('   /|   |\\');
    console.log('  3 4   5 6');
    console.log('  | |     |');
    console.log('  7 8     9');

    // BFS implementation using our queue
    const bfsQueue = HugeLongArrayQueue.newQueue(100);
    const visited = new Set<number>();
    const visitOrder: number[] = [];
    const distances: { [key: number]: number } = {};

    console.log('\n1. Starting BFS from person 0:');
    bfsQueue.add(0);
    distances[0] = 0;

    while (!bfsQueue.isEmpty()) {
      const currentPerson = bfsQueue.remove();

      if (!visited.has(currentPerson)) {
        visited.add(currentPerson);
        visitOrder.push(currentPerson);
        const distance = distances[currentPerson];
        console.log(`  Visited person: ${currentPerson} at distance ${distance}, Queue size: ${bfsQueue.size()}`);

        // Add neighbors to queue
        const friends = graph[currentPerson as keyof typeof graph] || [];
        for (const friend of friends) {
          if (!visited.has(friend) && !(friend in distances)) {
            bfsQueue.add(friend);
            distances[friend] = distance + 1;
            console.log(`    Added friend: ${friend} at distance ${distance + 1}`);
          }
        }

        const queueContents = bfsQueue.toArray();
        console.log(`    Queue contents: [${queueContents.join(', ')}]`);
      }
    }

    console.log(`\n2. BFS traversal complete:`);
    console.log(`  Visit order: [${visitOrder.join(', ')}]`);
    console.log(`  All people visited: ${visited.size === 10 ? '✅' : '❌'}`);
    console.log(`  Queue is empty: ${bfsQueue.isEmpty() ? '✅' : '❌'}`);

    // Verify BFS properties
    console.log('\n3. Verifying BFS properties:');
    expect(visited.size).toBe(10);
    expect(visitOrder).toHaveLength(10);
    expect(bfsQueue.isEmpty()).toBe(true);

    // Verify distances (BFS finds shortest paths)
    console.log('  Distance from person 0:');
    for (let person = 0; person < 10; person++) {
      console.log(`    Person ${person}: ${distances[person]} steps`);
    }

    expect(visitOrder[0]).toBe(0); // Started from person 0
    expect(distances[0]).toBe(0);  // Distance to self is 0
    expect(distances[1]).toBe(1);  // Direct friend
    expect(distances[2]).toBe(1);  // Direct friend
    expect(distances[3]).toBe(2);  // Friend of friend
    expect(distances[9]).toBe(3);  // 3 steps away

    console.log('\n🌐 BFS algorithm simulation works perfectly!');
  });

  /**
   * Test 11: Producer-Consumer Pattern Simulation
   */
  test('producer-consumer pattern simulation works correctly', () => {
    console.log('\n🌊 QUEUE TEST 11: Producer-Consumer Pattern');
    console.log('===========================================');

    const queue = HugeLongArrayQueue.newQueue(10);

    console.log('🔬 Simulating producer-consumer pattern for graph processing...');

    // Simulate producer adding work items (graph nodes to process)
    console.log('\n1. Producer phase - adding work items:');
    const workItems = [1001, 1002, 1003, 1004, 1005];

    for (const item of workItems) {
      if (!queue.isFull()) {
        queue.add(item);
        console.log(`  Producer added: ${item}, Queue size: ${queue.size()}`);
      } else {
        console.log(`  Producer: Queue full, cannot add ${item}`);
      }
    }

    console.log(`  Producer finished. Queue contents: [${queue.toArray().join(', ')}]`);

    // Simulate consumer processing work items
    console.log('\n2. Consumer phase - processing work items:');
    const processedItems: number[] = [];

    while (!queue.isEmpty()) {
      const workItem = queue.remove();
      // Simulate processing
      const result = workItem * 2; // Simple processing
      processedItems.push(result);
      console.log(`  Consumer processed: ${workItem} → ${result}, Queue size: ${queue.size()}`);
    }

    console.log(`  Consumer finished. Processed results: [${processedItems.join(', ')}]`);

    // Verify correct processing order
    const expectedResults = workItems.map(item => item * 2);
    expect(processedItems).toEqual(expectedResults);
    expect(queue.isEmpty()).toBe(true);

    console.log('\n3. Interleaved producer-consumer:');
    // Simulate real-time processing where producer and consumer work together
    const producerData = [2001, 2002, 2003, 2004, 2005, 2006];
    const consumerResults: number[] = [];

    for (let i = 0; i < producerData.length; i++) {
      // Producer adds item
      queue.add(producerData[i]);
      console.log(`  Added: ${producerData[i]}, Queue size: ${queue.size()}`);

      // Consumer processes if queue has items (every other iteration)
      if (i % 2 === 1 && !queue.isEmpty()) {
        const processed = queue.remove();
        consumerResults.push(processed);
        console.log(`  Processed: ${processed}, Queue size: ${queue.size()}`);
      }
    }

    // Process remaining items
    while (!queue.isEmpty()) {
      const remaining = queue.remove();
      consumerResults.push(remaining);
      console.log(`  Final processing: ${remaining}`);
    }

    console.log(`  Final results: [${consumerResults.join(', ')}]`);
    expect(queue.isEmpty()).toBe(true);

    console.log('\n🏭 Producer-consumer pattern works perfectly!');
  });

  /**
   * Test 12: Performance Characteristics
   */
  test('performance characteristics are excellent', () => {
    console.log('\n🌊 QUEUE TEST 12: Performance Characteristics');
    console.log('==============================================');

    const capacity = 1000000; // 1 million elements
    const queue = HugeLongArrayQueue.newQueue(capacity);
    const operations = 500000; // 500K operations

    console.log(`🚀 Performance test: ${operations.toLocaleString()} operations on ${capacity.toLocaleString()} capacity queue`);

    // Test add performance
    console.log('\n1. Testing add performance:');
    const addStart = performance.now();
    for (let i = 0; i < operations; i++) {
      queue.add(i);
    }
    const addEnd = performance.now();
    const addTime = addEnd - addStart;
    const addOpsPerSec = Math.round(operations / (addTime / 1000));

    console.log(`  Add time: ${addTime.toFixed(2)}ms`);
    console.log(`  Add ops/sec: ${addOpsPerSec.toLocaleString()}`);
    console.log(`  Final queue size: ${queue.size().toLocaleString()}`);

    // Test remove performance
    console.log('\n2. Testing remove performance:');
    const removeStart = performance.now();
    let checksum = 0;
    for (let i = 0; i < operations; i++) {
      checksum += queue.remove();
    }
    const removeEnd = performance.now();
    const removeTime = removeEnd - removeStart;
    const removeOpsPerSec = Math.round(operations / (removeTime / 1000));

    console.log(`  Remove time: ${removeTime.toFixed(2)}ms`);
    console.log(`  Remove ops/sec: ${removeOpsPerSec.toLocaleString()}`);
    console.log(`  Checksum: ${checksum.toLocaleString()} (prevents optimization)`);
    console.log(`  Final queue size: ${queue.size()}`);

    // Test mixed operations (simulating real BFS)
    console.log('\n3. Testing mixed add/remove performance (BFS simulation):');
    const mixedStart = performance.now();
    for (let i = 0; i < operations / 10; i++) {
      // Add 3, remove 1 pattern (simulating BFS with branching factor 3)
      queue.add(i * 3);
      queue.add(i * 3 + 1);
      queue.add(i * 3 + 2);
      if (!queue.isEmpty()) {
        queue.remove();
      }
    }
    const mixedEnd = performance.now();
    const mixedTime = mixedEnd - mixedStart;
    const mixedOpsPerSec = Math.round((operations * 4 / 10) / (mixedTime / 1000)); // 4 ops per iteration

    console.log(`  Mixed operations time: ${mixedTime.toFixed(2)}ms`);
    console.log(`  Mixed ops/sec: ${mixedOpsPerSec.toLocaleString()}`);

    // Performance expectations
    expect(addOpsPerSec).toBeGreaterThan(1000000); // At least 1M adds/sec
    expect(removeOpsPerSec).toBeGreaterThan(1000000);  // At least 1M removes/sec
    expect(mixedOpsPerSec).toBeGreaterThan(500000); // At least 500K mixed ops/sec

    console.log('\n⚡ Performance characteristics are excellent!');
  });

  /**
   * Test 13: Memory Efficiency and Large Capacity
   */
  test('memory efficiency and large capacity work correctly', () => {
    console.log('\n🌊 QUEUE TEST 13: Memory Efficiency and Large Capacity');
    console.log('======================================================');

    console.log('🔬 Testing memory efficiency for various capacities...');

    const testCapacities = [1000, 10000, 100000, 1000000];

    console.log('\nCapacity\t\tEstimated Memory\tCircular Efficiency\tTest Result');
    console.log('--------\t\t----------------\t-------------------\t-----------');

    for (const capacity of testCapacities) {
      const memoryEst = HugeLongArrayQueue.memoryEstimation(capacity);

      console.log(`\n🔬 Testing capacity: ${capacity.toLocaleString()}`);

      const queue = HugeLongArrayQueue.newQueue(capacity);

      // Test circular buffer efficiency
      const fillCount = Math.min(capacity, 10000);

      // Fill partially
      for (let i = 0; i < fillCount; i++) {
        queue.add(i);
      }

      // Test wraparound by removing half and adding new elements
      const removeCount = Math.floor(fillCount / 2);
      for (let i = 0; i < removeCount; i++) {
        queue.remove();
      }

      // Add more elements to test wraparound
      for (let i = 0; i < removeCount; i++) {
        queue.add(fillCount + i);
      }

      const memoryMB = (memoryEst / (1024 * 1024)).toFixed(2);
      const efficiency = `+1 storage overhead (${((1/capacity)*100).toFixed(4)}%)`;

      console.log(`${capacity.toLocaleString()}\t\t\t${memoryMB}MB\t\t\t${efficiency}\t✅ Pass`);

      expect(queue.size()).toBe(fillCount);

      console.log(`  ✅ Successfully tested wraparound at capacity: ${capacity.toLocaleString()}`);
    }

    console.log('\n💾 Memory efficiency and large capacity work perfectly!');
  });

  /**
   * Test 14: Edge Cases and Error Conditions
   */
  test('edge cases and error conditions work correctly', () => {
    console.log('\n🌊 QUEUE TEST 14: Edge Cases and Error Conditions');
    console.log('=================================================');

    console.log('🔬 Testing edge cases and error conditions...');

    // Test zero capacity queue
    console.log('\n1. Testing zero capacity queue:');
    const zeroQueue = HugeLongArrayQueue.newQueue(0);
    expect(zeroQueue.size()).toBe(0);
    expect(zeroQueue.isEmpty()).toBe(true);
    expect(zeroQueue.isFull()).toBe(true);
    expect(zeroQueue.remainingCapacity()).toBe(0);
    expect(() => zeroQueue.add(1)).toThrow('Queue is full');
    console.log('  ✅ Zero capacity queue handles all operations correctly');

    // Test single element capacity
    console.log('\n2. Testing single element capacity:');
    const singleQueue = HugeLongArrayQueue.newQueue(1);
    expect(singleQueue.remainingCapacity()).toBe(1);

    singleQueue.add(42);
    expect(singleQueue.size()).toBe(1);
    expect(singleQueue.isFull()).toBe(true);
    expect(singleQueue.peek()).toBe(42);

    expect(singleQueue.remove()).toBe(42);
    expect(singleQueue.isEmpty()).toBe(true);
    console.log('  ✅ Single element queue works correctly');

    // Test batch operations edge cases
    console.log('\n3. Testing batch operations edge cases:');
    const batchQueue = HugeLongArrayQueue.newQueue(5);

    // Empty batch operations
    batchQueue.addAll([]);
    expect(batchQueue.size()).toBe(0);

    const emptyRemove = batchQueue.removeAll(0);
    expect(emptyRemove).toEqual([]);
    console.log('  ✅ Empty batch operations work correctly');

    // Large batch validation
    expect(() => batchQueue.addAll([1, 2, 3, 4, 5, 6])).toThrow('exceed capacity');
    console.log('  ✅ Batch capacity validation works');

    console.log('\n🎯 Edge cases and error conditions handled perfectly!');
  });
});
