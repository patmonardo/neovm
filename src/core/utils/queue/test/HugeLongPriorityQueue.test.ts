import { HugeLongPriorityQueue } from '../HugeLongPriorityQueue';

describe('HugeLongPriorityQueue - Basic Heap Tests', () => {

  test('min queue basic heap operations work correctly', () => {
    console.log('\n🎯 MIN HEAP TEST: Basic Operations');
    console.log('==================================');

    const queue = HugeLongPriorityQueue.min(10);

    console.log('🔬 Testing min heap (smallest element at top)...');

    // Test empty queue
    console.log('\n1. Empty queue:');
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Is empty: ${queue.isEmpty()}`);

    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);

    // Test top() on empty queue (should throw)
    expect(() => queue.top()).toThrow('Priority Queue is empty');
    expect(queue.pop()).toBe(-1); // Returns -1 for empty

    // Add first element
    console.log('\n2. Adding first element:');
    queue.add(5, 50.0);
    console.log(`  add(5, 50.0)`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Top: ${queue.top()}`);
    console.log(`  Cost of 5: ${queue.cost(5)}`);
    console.log(`  Contains 5: ${queue.containsElement(5)}`);

    expect(queue.size()).toBe(1);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.top()).toBe(5);
    expect(queue.cost(5)).toBeCloseTo(50.0);
    expect(queue.containsElement(5)).toBe(true);

    // Add smaller element (should become new top)
    console.log('\n3. Adding smaller priority element:');
    queue.add(3, 30.0);
    console.log(`  add(3, 30.0)`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Top: ${queue.top()} (should be 3 with cost 30.0)`);
    console.log(`  Cost of 3: ${queue.cost(3)}`);

    expect(queue.size()).toBe(2);
    expect(queue.top()).toBe(3); // 30.0 < 50.0, so element 3 is at top
    expect(queue.cost(3)).toBeCloseTo(30.0);

    // Add larger element (should not become top)
    console.log('\n4. Adding larger priority element:');
    queue.add(7, 70.0);
    console.log(`  add(7, 70.0)`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Top: ${queue.top()} (should still be 3)`);

    expect(queue.size()).toBe(3);
    expect(queue.top()).toBe(3); // Still element 3 with smallest cost

    console.log('\n✅ Min heap basic operations work!');
  });

  test('min queue pop operations work correctly', () => {
    console.log('\n🎯 MIN HEAP TEST: Pop Operations');
    console.log('================================');

    const queue = HugeLongPriorityQueue.min(10);

    console.log('🔬 Testing pop operations (should return elements in cost order)...');

    // Add elements in random order
    console.log('\n1. Adding elements in random order:');
    const elements = [
      { element: 1, cost: 15.0 },
      { element: 2, cost: 5.0 },   // Should be first out
      { element: 3, cost: 25.0 },
      { element: 4, cost: 10.0 },  // Should be second out
      { element: 5, cost: 20.0 }
    ];

    for (const {element, cost} of elements) {
      queue.add(element, cost);
      console.log(`  add(${element}, ${cost})`);
    }

    console.log(`  Final size: ${queue.size()}`);
    console.log(`  Top element: ${queue.top()} (should be 2 with cost 5.0)`);

    expect(queue.size()).toBe(5);
    expect(queue.top()).toBe(2); // Element 2 has smallest cost (5.0)

    // Pop elements - should come out in cost order
    console.log('\n2. Popping elements (should be in cost order):');
    const poppedElements: Array<{element: number, cost: number}> = [];

    while (!queue.isEmpty()) {
      const element = queue.pop();
      // Note: cost might not be available after popping, but we know the expected order
      console.log(`  pop() → ${element}`);
      poppedElements.push({element, cost: 0}); // We'll verify order instead
    }

    // Should be popped in order: 2 (5.0), 4 (10.0), 1 (15.0), 5 (20.0), 3 (25.0)
    expect(poppedElements[0].element).toBe(2);
    expect(poppedElements[1].element).toBe(4);
    expect(poppedElements[2].element).toBe(1);
    expect(poppedElements[3].element).toBe(5);
    expect(poppedElements[4].element).toBe(3);

    console.log(`  Final size: ${queue.size()}`);
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);

    console.log('\n✅ Min heap pop operations work!');
  });

  test('max queue basic operations work correctly', () => {
    console.log('\n🎯 MAX HEAP TEST: Basic Operations');
    console.log('==================================');

    const queue = HugeLongPriorityQueue.max(10);

    console.log('🔬 Testing max heap (largest element at top)...');

    // Add elements
    console.log('\n1. Adding elements:');
    queue.add(1, 10.0);
    queue.add(2, 30.0);  // Should become top
    queue.add(3, 20.0);

    console.log(`  add(1, 10.0)`);
    console.log(`  add(2, 30.0)`);
    console.log(`  add(3, 20.0)`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Top: ${queue.top()} (should be 2 with cost 30.0)`);

    expect(queue.size()).toBe(3);
    expect(queue.top()).toBe(2); // Element 2 has largest cost (30.0)
    expect(queue.cost(2)).toBeCloseTo(30.0);

    // Pop should return largest first
    console.log('\n2. Popping elements:');
    const first = queue.pop();
    const second = queue.pop();
    const third = queue.pop();

    console.log(`  First pop: ${first} (should be 2)`);
    console.log(`  Second pop: ${second} (should be 3)`);
    console.log(`  Third pop: ${third} (should be 1)`);

    expect(first).toBe(2);  // 30.0 (largest)
    expect(second).toBe(3); // 20.0 (middle)
    expect(third).toBe(1);  // 10.0 (smallest)

    console.log('\n✅ Max heap operations work!');
  });

  test('set operation works correctly', () => {
    console.log('\n🎯 HEAP TEST: Set Operation (Priority Updates)');
    console.log('==============================================');

    const queue = HugeLongPriorityQueue.min(10);

    console.log('🔬 Testing set operation for priority updates...');

    // Add initial elements
    console.log('\n1. Adding initial elements:');
    queue.add(1, 50.0);
    queue.add(2, 30.0);
    queue.add(3, 40.0);

    console.log(`  Initial top: ${queue.top()} (should be 2 with cost 30.0)`);
    expect(queue.top()).toBe(2);

    // Update element 1 to have better priority
    console.log('\n2. Updating element 1 to better priority:');
    queue.set(1, 10.0); // Should make element 1 the new top

    console.log(`  set(1, 10.0)`);
    console.log(`  New top: ${queue.top()} (should be 1 with cost 10.0)`);
    console.log(`  Cost of 1: ${queue.cost(1)}`);
    console.log(`  Contains 1: ${queue.containsElement(1)}`);

    expect(queue.top()).toBe(1);
    expect(queue.cost(1)).toBeCloseTo(10.0);
    expect(queue.containsElement(1)).toBe(true);

    // Add new element using set
    console.log('\n3. Adding new element using set:');
    expect(queue.containsElement(4)).toBe(false);
    queue.set(4, 35.0);

    console.log(`  set(4, 35.0)`);
    console.log(`  Size: ${queue.size()}`);
    console.log(`  Contains 4: ${queue.containsElement(4)}`);
    console.log(`  Cost of 4: ${queue.cost(4)}`);

    expect(queue.size()).toBe(4);
    expect(queue.containsElement(4)).toBe(true);
    expect(queue.cost(4)).toBeCloseTo(35.0);

    console.log('\n✅ Set operation works correctly!');
  });

  test('clear and reuse operations work correctly', () => {
    console.log('\n🎯 HEAP TEST: Clear and Reuse');
    console.log('=============================');

    const queue = HugeLongPriorityQueue.min(10);

    console.log('🔬 Testing clear and reuse...');

    // Fill queue
    console.log('\n1. Filling queue:');
    for (let i = 0; i < 5; i++) {
      queue.add(i, i * 10.0);
    }
    console.log(`  Added 5 elements, size: ${queue.size()}`);
    expect(queue.size()).toBe(5);
    expect(queue.isEmpty()).toBe(false);

    // Clear queue
    console.log('\n2. Clearing queue:');
    queue.clear();
    console.log(`  After clear - Size: ${queue.size()}, Empty: ${queue.isEmpty()}`);

    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);

    // Verify elements are no longer contained
    for (let i = 0; i < 5; i++) {
      expect(queue.containsElement(i)).toBe(false);
    }

    // Reuse queue
    console.log('\n3. Reusing cleared queue:');
    queue.add(9, 99.0); // ✅ Fixed: Use element 9 (valid for capacity 10)
    console.log(`  add(9, 99.0)`);
    console.log(`  Size: ${queue.size()}, Top: ${queue.top()}`);

    expect(queue.size()).toBe(1);
    expect(queue.top()).toBe(9); // ✅ Fixed: Expect element 9
    expect(queue.cost(9)).toBeCloseTo(99.0); // ✅ Fixed: Check cost of element 9

    console.log('\n✅ Clear and reuse work correctly!');
  });

  test('iterator and memory estimation work correctly', () => {
    console.log('\n🎯 HEAP TEST: Iterator and Memory');
    console.log('=================================');

    console.log('🔬 Testing iterator and memory estimation...');

    // Test memory estimation
    console.log('\n1. Memory estimation:');
    const capacities = [10, 100, 1000];

    console.log('Capacity\tMemory (KB)');
    console.log('--------\t-----------');

    for (const capacity of capacities) {
      const memoryEstimator = HugeLongPriorityQueue.memoryEstimation();
      const memory = memoryEstimator(capacity);
      console.log(`${capacity}\t\t${(memory / 1024).toFixed(1)}`);

      // Memory should be > 0 and grow with capacity
      expect(memory).toBeGreaterThan(0);
    }

    // Test iterator
    console.log('\n2. Iterator test:');
    const queue = HugeLongPriorityQueue.min(10);

    // Add some elements
    const elements = [1, 3, 5, 7, 9];
    for (const element of elements) {
      queue.add(element, element * 10);
    }

    console.log(`  Added elements: [${elements.join(', ')}]`);

    // Iterate (order not guaranteed!)
    const iteratedElements: number[] = [];
    for (const element of queue) {
      iteratedElements.push(element);
    }

    console.log(`  Iterated elements: [${iteratedElements.join(', ')}]`);
    console.log('  Note: Order not guaranteed - this is heap storage order');

    expect(iteratedElements).toHaveLength(elements.length);

    // All original elements should be present (in some order)
    for (const originalElement of elements) {
      expect(iteratedElements).toContain(originalElement);
    }

    console.log('\n✅ Iterator and memory estimation work!');
  });

  test('edge cases work correctly', () => {
    console.log('\n🎯 HEAP TEST: Edge Cases');
    console.log('========================');

    console.log('🔬 Testing edge cases...');

    // Test capacity 1
    console.log('\n1. Testing capacity 1:');
    const tiny = HugeLongPriorityQueue.min(1);

    tiny.add(0, 100.0); // ✅ Fixed: Use element 0 (valid for capacity 1)
    expect(tiny.size()).toBe(1);
    expect(tiny.top()).toBe(0); // ✅ Fixed: Expect element 0

    // Update the same element
    tiny.set(0, 50.0); // ✅ Fixed: Use element 0
    expect(tiny.size()).toBe(1);
    expect(tiny.top()).toBe(0); // ✅ Fixed: Expect element 0
    expect(tiny.cost(0)).toBeCloseTo(50.0); // ✅ Fixed: Check cost of element 0

    console.log('  ✅ Capacity 1 works');

    // Test identical costs
    console.log('\n2. Testing identical costs:');
    const queue = HugeLongPriorityQueue.min(5);

    queue.add(0, 10.0); // ✅ Fixed: Use elements 0, 1, 2 (valid for capacity 5)
    queue.add(1, 10.0);
    queue.add(2, 10.0);

    expect(queue.size()).toBe(3);
    // All have same cost, so any could be top
    const top = queue.top();
    expect([0, 1, 2]).toContain(top); // ✅ Fixed: Check for elements 0, 1, 2

    console.log('  ✅ Identical costs handled');

    // Test extreme values
    console.log('\n3. Testing extreme values:');
    const extreme = HugeLongPriorityQueue.max(5);

    extreme.add(0, Number.MAX_VALUE); // ✅ Fixed: Use elements 0, 1, 2, 3 (valid for capacity 5)
    extreme.add(1, Number.MIN_VALUE);
    extreme.add(2, 0);
    extreme.add(3, Infinity);

    expect(extreme.top()).toBe(3); // ✅ Fixed: Element 3 should be top (Infinity)

    console.log('  ✅ Extreme values handled');

    console.log('\n✅ All edge cases work correctly!');
  });
});
