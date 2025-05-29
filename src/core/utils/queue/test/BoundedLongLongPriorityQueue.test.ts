import { BoundedLongLongPriorityQueue } from '../BoundedLongLongPriorityQueue';

describe('BoundedLongLongPriorityQueue - Basic Tests', () => {

  test('min pair queue basic operations work correctly', () => {
    console.log('\n🎯 PAIR MIN QUEUE TEST: Basic Operations');
    console.log('=======================================');

    const queue = BoundedLongLongPriorityQueue.min(3);

    console.log('🔬 Testing min pair queue (keep lowest priorities)...');

    // Test empty queue
    console.log('\n1. Empty queue:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements1: [${queue.elements1().join(', ')}]`);
    console.log(`  Elements2: [${queue.elements2().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(queue.size()).toBe(0);
    expect(queue.elements1()).toEqual([]);
    expect(queue.elements2()).toEqual([]);
    expect(queue.priorities()).toEqual([]);

    // Add first pair
    console.log('\n2. Adding first pair:');
    const result1 = queue.offer(100, 200, 15.5);
    console.log(`  offer(100, 200, 15.5) → ${result1}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements1: [${queue.elements1().join(', ')}]`);
    console.log(`  Elements2: [${queue.elements2().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result1).toBe(true);
    expect(queue.size()).toBe(1);
    expect(queue.elements1()[0]).toBe(100);
    expect(queue.elements2()[0]).toBe(200);
    expect(queue.priorities()[0]).toBeCloseTo(15.5);

    // Add second pair (lower priority - should go first)
    console.log('\n3. Adding lower priority pair:');
    const result2 = queue.offer(300, 400, 12.3);
    console.log(`  offer(300, 400, 12.3) → ${result2}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements1: [${queue.elements1().join(', ')}]`);
    console.log(`  Elements2: [${queue.elements2().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result2).toBe(true);
    expect(queue.size()).toBe(2);
    // Should be sorted: 12.3, 15.5
    expect(queue.priorities()[0]).toBeCloseTo(12.3);
    expect(queue.priorities()[1]).toBeCloseTo(15.5);
    expect(queue.elements1()[0]).toBe(300); // Pair with priority 12.3
    expect(queue.elements2()[0]).toBe(400);

    // Add third pair (higher priority - should go last)
    console.log('\n4. Adding higher priority pair:');
    const result3 = queue.offer(500, 600, 18.7);
    console.log(`  offer(500, 600, 18.7) → ${result3}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements1: [${queue.elements1().join(', ')}]`);
    console.log(`  Elements2: [${queue.elements2().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result3).toBe(true);
    expect(queue.size()).toBe(3);
    // Should be sorted: 12.3, 15.5, 18.7
    expect(queue.priorities()[0]).toBeCloseTo(12.3);
    expect(queue.priorities()[1]).toBeCloseTo(15.5);
    expect(queue.priorities()[2]).toBeCloseTo(18.7);

    console.log('\n✅ Min pair queue basic operations work!');
  });

  test('min pair queue rejection works correctly', () => {
    console.log('\n🎯 PAIR MIN QUEUE TEST: Rejection Logic');
    console.log('=======================================');

    const queue = BoundedLongLongPriorityQueue.min(2);

    console.log('🔬 Testing rejection when pair queue is full...');

    // Fill queue
    queue.offer(100, 200, 10.0);
    queue.offer(300, 400, 20.0);

    console.log('\n1. Queue after filling:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Pairs: [(${queue.elements1()[0]}, ${queue.elements2()[0]}), (${queue.elements1()[1]}, ${queue.elements2()[1]})]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    // Try to add pair with worse priority (should be rejected)
    console.log('\n2. Adding worse priority pair:');
    const result1 = queue.offer(500, 600, 30.0);
    console.log(`  offer(500, 600, 30.0) → ${result1}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result1).toBe(false);
    expect(queue.size()).toBe(2);

    // Try to add pair with better priority (should replace worst)
    console.log('\n3. Adding better priority pair:');
    const result2 = queue.offer(700, 800, 5.0);
    console.log(`  offer(700, 800, 5.0) → ${result2}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Pairs: [(${queue.elements1()[0]}, ${queue.elements2()[0]}), (${queue.elements1()[1]}, ${queue.elements2()[1]})]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result2).toBe(true);
    expect(queue.size()).toBe(2);
    // Should now contain: 5.0, 10.0 (20.0 was replaced)
    expect(queue.priorities()[0]).toBeCloseTo(5.0);
    expect(queue.priorities()[1]).toBeCloseTo(10.0);
    expect(queue.elements1()[0]).toBe(700); // New best pair
    expect(queue.elements2()[0]).toBe(800);

    console.log('\n✅ Min pair queue rejection works!');
  });

  test('max pair queue basic operations work correctly', () => {
    console.log('\n🎯 PAIR MAX QUEUE TEST: Basic Operations');
    console.log('=======================================');

    const queue = BoundedLongLongPriorityQueue.max(3);

    console.log('🔬 Testing max pair queue (keep highest priorities)...');

    // Add pairs in random order
    console.log('\n1. Adding pairs:');

    const result1 = queue.offer(100, 200, 0.75);
    console.log(`  offer(100, 200, 0.75) → ${result1}`);
    console.log(`  Pairs: [(${queue.elements1()[0]}, ${queue.elements2()[0]})]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    const result2 = queue.offer(300, 400, 0.92);
    console.log(`  offer(300, 400, 0.92) → ${result2}`);
    console.log(`  Pairs: [(${queue.elements1()[0]}, ${queue.elements2()[0]}), (${queue.elements1()[1]}, ${queue.elements2()[1]})]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    const result3 = queue.offer(500, 600, 0.68);
    console.log(`  offer(500, 600, 0.68) → ${result3}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(queue.size()).toBe(3);
    // Should be sorted descending: 0.92, 0.75, 0.68
    expect(queue.priorities()[0]).toBeCloseTo(0.92);
    expect(queue.priorities()[1]).toBeCloseTo(0.75);
    expect(queue.priorities()[2]).toBeCloseTo(0.68);

    // Check that pairs are in correct order
    expect(queue.elements1()[0]).toBe(300); // Pair with highest priority 0.92
    expect(queue.elements2()[0]).toBe(400);

    console.log('\n✅ Max pair queue basic operations work!');
  });

  test('forEach iteration works correctly', () => {
    console.log('\n🎯 PAIR QUEUE TEST: forEach Iteration');
    console.log('====================================');

    const queue = BoundedLongLongPriorityQueue.min(3);

    // Add some pairs
    queue.offer(10, 20, 5.0);
    queue.offer(30, 40, 2.0);
    queue.offer(50, 60, 8.0);

    console.log('🔬 Testing forEach iteration...');
    console.log('\n1. Queue contents:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    console.log('\n2. forEach iteration:');
    const collected: Array<{e1: number, e2: number, p: number}> = [];

    queue.forEach((element1, element2, priority) => {
      console.log(`    Pair: (${element1}, ${element2}) → priority ${priority}`);
      collected.push({e1: element1, e2: element2, p: priority});
    });

    expect(collected).toHaveLength(3);
    // Should be in priority order: 2.0, 5.0, 8.0
    expect(collected[0].p).toBeCloseTo(2.0);
    expect(collected[1].p).toBeCloseTo(5.0);
    expect(collected[2].p).toBeCloseTo(8.0);

    expect(collected[0].e1).toBe(30); // Pair with priority 2.0
    expect(collected[0].e2).toBe(40);

    console.log('\n✅ forEach iteration works!');
  });

  test('memory estimation works correctly', () => {
    console.log('\n🎯 PAIR QUEUE TEST: Memory Estimation');
    console.log('====================================');

    console.log('🔬 Testing memory estimation...');

    const capacities = [10, 100, 1000];

    console.log('\n1. Memory estimation for different capacities:');
    console.log('Capacity\tMemory (KB)\tPer Element (bytes)');
    console.log('--------\t-----------\t------------------');

    for (const capacity of capacities) {
      const memory = BoundedLongLongPriorityQueue.memoryEstimation(capacity);
      const perElement = memory / capacity;

      console.log(`${capacity}\t\t${(memory / 1024).toFixed(1)}\t\t${perElement}`);

      // Should be 3 * 8 = 24 bytes per element (2 longs + 1 double)
      expect(perElement).toBe(24);
    }

    console.log('\n✅ Memory estimation works correctly!');
  });
});
