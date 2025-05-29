import { BoundedLongPriorityQueue } from '../BoundedLongPriorityQueue';

describe('BoundedLongPriorityQueue - Basic Tests', () => {

  test('min queue basic operations work correctly', () => {
    console.log('\n🎯 MIN QUEUE TEST: Basic Operations');
    console.log('===================================');

    const queue = BoundedLongPriorityQueue.min(3);

    console.log('🔬 Testing min queue (keep lowest priorities)...');

    // Test empty queue
    console.log('\n1. Empty queue:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(queue.size()).toBe(0);
    expect(queue.elements()).toEqual([]);
    expect(queue.priorities()).toEqual([]);

    // Add first element
    console.log('\n2. Adding first element:');
    const result1 = queue.offer(100, 15.5);
    console.log(`  offer(100, 15.5) → ${result1}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result1).toBe(true);
    expect(queue.size()).toBe(1);
    expect(queue.elements()[0]).toBe(100);
    expect(queue.priorities()[0]).toBeCloseTo(15.5);

    // Add second element (lower priority - should go first)
    console.log('\n3. Adding lower priority element:');
    const result2 = queue.offer(200, 12.3);
    console.log(`  offer(200, 12.3) → ${result2}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result2).toBe(true);
    expect(queue.size()).toBe(2);
    // Should be sorted: 12.3, 15.5
    expect(queue.priorities()[0]).toBeCloseTo(12.3);
    expect(queue.priorities()[1]).toBeCloseTo(15.5);

    // Add third element (higher priority - should go last)
    console.log('\n4. Adding higher priority element:');
    const result3 = queue.offer(300, 18.7);
    console.log(`  offer(300, 18.7) → ${result3}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result3).toBe(true);
    expect(queue.size()).toBe(3);
    // Should be sorted: 12.3, 15.5, 18.7
    expect(queue.priorities()[0]).toBeCloseTo(12.3);
    expect(queue.priorities()[1]).toBeCloseTo(15.5);
    expect(queue.priorities()[2]).toBeCloseTo(18.7);

    console.log('\n✅ Min queue basic operations work!');
  });

  test('min queue rejection works correctly', () => {
    console.log('\n🎯 MIN QUEUE TEST: Rejection Logic');
    console.log('==================================');

    const queue = BoundedLongPriorityQueue.min(2);

    console.log('🔬 Testing rejection when queue is full...');

    // Fill queue
    queue.offer(100, 10.0);
    queue.offer(200, 20.0);

    console.log('\n1. Queue after filling:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    // Try to add element with worse priority (should be rejected)
    console.log('\n2. Adding worse priority element:');
    const result1 = queue.offer(300, 30.0);
    console.log(`  offer(300, 30.0) → ${result1}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result1).toBe(false);
    expect(queue.size()).toBe(2);

    // Try to add element with better priority (should replace worst)
    console.log('\n3. Adding better priority element:');
    const result2 = queue.offer(400, 5.0);
    console.log(`  offer(400, 5.0) → ${result2}`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Elements: [${queue.elements().join(', ')}]`);
    console.log(`  Priorities: [${queue.priorities().join(', ')}]`);

    expect(result2).toBe(true);
    expect(queue.size()).toBe(2);
    // Should now contain: 5.0, 10.0 (20.0 was replaced)
    expect(queue.priorities()[0]).toBeCloseTo(5.0);
    expect(queue.priorities()[1]).toBeCloseTo(10.0);

    console.log('\n✅ Min queue rejection works!');
  });
});
