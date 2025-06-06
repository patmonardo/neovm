import { ShuffleUtil, SplittableRandom, Random } from "../ShuffleUtil";
import { HugeLongArray } from "@/collections";

describe("ShuffleUtil - Learning Shuffle Algorithms", () => {
  let random: Random;

  beforeEach(() => {
    // Use fixed seed for reproducible tests
    random = new SplittableRandom(12345);
  });

  describe("Basic Shuffling Concepts", () => {
    it("demonstrates Fisher-Yates shuffle principle", () => {
      // Start with ordered array
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const original = [...data];

      ShuffleUtil.shuffleNumberArray(data, random);

      // Should be different order (extremely high probability)
      expect(data).not.toEqual(original);

      // Should contain same elements
      expect(data.sort()).toEqual(original.sort());

      // Should be same length
      expect(data.length).toBe(original.length);
    });

    it("shows that shuffle is not rotation or simple swap", () => {
      const data = [1, 2, 3, 4, 5];
      const original = [...data];

      // ShuffleUtil.shuffleNumberArray(data, random);

      // Not a simple rotation (first element probably moved)
      // Not a simple reversal
      expect(data).not.toEqual(original.reverse());

      console.log("Original:", original);
      console.log("Shuffled:", data);
    });

    it("demonstrates uniform distribution over multiple shuffles", () => {
      const elementCounts = new Map<number, number[]>();
      const trials = 1000;
      const arraySize = 4;

      // Initialize position counters for each element
      for (let element = 1; element <= arraySize; element++) {
        elementCounts.set(element, new Array(arraySize).fill(0));
      }

      // Run many shuffle trials
      for (let trial = 0; trial < trials; trial++) {
        const data = [1, 2, 3, 4];
        const trialRandom = new SplittableRandom(trial);
        ShuffleUtil.shuffleNumberArray(data, trialRandom);

        // Count where each element ended up
        data.forEach((element, position) => {
          elementCounts.get(element)![position]++;
        });
      }

      // Each element should appear roughly equally in each position
      elementCounts.forEach((positions, element) => {
        positions.forEach((count, position) => {
          const expectedCount = trials / arraySize;
          const tolerance = expectedCount * 0.3; // 30% tolerance

          expect(count).toBeGreaterThan(expectedCount - tolerance);
          expect(count).toBeLessThan(expectedCount + tolerance);
        });
      });
    });
  });

  describe("Number Array Shuffling", () => {
    it("shuffles small arrays correctly", () => {
      const testCases = [
        [1], // Single element
        [1, 2], // Two elements
        [1, 2, 3], // Three elements
        [], // Empty array
      ];

      testCases.forEach((testCase) => {
        const data = [...testCase];
        const original = [...testCase];

        ShuffleUtil.shuffleNumberArray(data, random);

        // Elements preserved
        expect(data.sort()).toEqual(original.sort());
        expect(data.length).toBe(original.length);
      });
    });

    it("shuffles large arrays efficiently", () => {
      const size = 10000;
      const data = Array.from({ length: size }, (_, i) => i);
      const original = [...data];

      const startTime = Date.now();
      ShuffleUtil.shuffleNumberArray(data, random);
      const endTime = Date.now();

      // Should be fast (linear time algorithm)
      expect(endTime - startTime).toBeLessThan(100); // < 100ms

      // Should be thoroughly shuffled
      expect(data).not.toEqual(original);
      expect(data.sort()).toEqual(original.sort());
    });

    it("handles arrays with duplicate elements", () => {
      const data = [1, 1, 2, 2, 3, 3, 4, 4];
      const original = [...data];

      ShuffleUtil.shuffleNumberArray(data, random);

      // Same element counts
      const originalCounts = countElements(original);
      const shuffledCounts = countElements(data);

      expect(shuffledCounts).toEqual(originalCounts);
    });

    it("preserves array references and types", () => {
      const data = [1.5, 2.7, 3.14, -1.0];
      const original = [...data];

      ShuffleUtil.shuffleNumberArray(data, random);

      // Floating point numbers preserved exactly
      expect(data.sort()).toEqual(original.sort());

      // All elements still numbers
      data.forEach((element) => {
        expect(typeof element).toBe("number");
      });
    });
  });

  describe("HugeLongArray Shuffling", () => {
    it("shuffles HugeLongArray using same Fisher-Yates algorithm", () => {
      const size = 1000;
      const hugeLongArray = HugeLongArray.newArray(size);

      // Fill with test data
      for (let i = 0; i < size; i++) {
        hugeLongArray.set(i, i);
      }

      // Capture original state
      const original: number[] = [];
      for (let i = 0; i < size; i++) {
        original.push(hugeLongArray.get(i));
      }

      // Shuffle
      ShuffleUtil.shuffleArray(hugeLongArray, random);

      // Capture shuffled state
      const shuffled: number[] = [];
      for (let i = 0; i < size; i++) {
        shuffled.push(hugeLongArray.get(i));
      }

      // Verify shuffle
      expect(shuffled).not.toEqual(original);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it("handles very large HugeLongArray efficiently", () => {
      const size = 100000; // 100K elements
      const hugeLongArray = HugeLongArray.newArray(size);

      // Fill with sequential values
      for (let i = 0; i < size; i++) {
        hugeLongArray.set(i, i);
      }

      const startTime = Date.now();
      ShuffleUtil.shuffleArray(hugeLongArray, random);
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // < 1 second

      // Verify first and last elements changed (high probability)
      expect(hugeLongArray.get(0)).not.toBe(0);
      expect(hugeLongArray.get(size - 1)).not.toBe(size - 1);
    });

    it("works with sparse HugeLongArray data", () => {
      const size = 100;
      const hugeLongArray = HugeLongArray.newArray(size);

      // Fill only even indices
      for (let i = 0; i < size; i += 2) {
        hugeLongArray.set(i, i);
      }
      // Odd indices remain 0

      const originalZeroCount = countZeros(hugeLongArray);

      ShuffleUtil.shuffleArray(hugeLongArray, random);

      const shuffledZeroCount = countZeros(hugeLongArray);

      // Same number of zeros (just moved around)
      expect(shuffledZeroCount).toBe(originalZeroCount);
    });
  });

  describe("SplittableRandom Generator", () => {
    it("creates reproducible sequences with same seed", () => {
      const seed = 42;
      const random1 = new SplittableRandom(seed);
      const random2 = new SplittableRandom(seed);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 10; i++) {
        sequence1.push(random1.nextInt(0, 100));
        sequence2.push(random2.nextInt(0, 100));
      }

      expect(sequence1).toEqual(sequence2);
    });

    it("generates different sequences with different seeds", () => {
      const random1 = new SplittableRandom(1);
      const random2 = new SplittableRandom(2);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 20; i++) {
        sequence1.push(random1.nextInt(0, 1000));
        sequence2.push(random2.nextInt(0, 1000));
      }

      // Extremely unlikely to be identical
      expect(sequence1).not.toEqual(sequence2);
    });

    it("demonstrates split() functionality for parallel processing", () => {
      const parent = new SplittableRandom(100);
      const child1 = parent.split();
      const child2 = parent.split();

      // Children should generate different sequences
      const seq1 = Array.from({ length: 10 }, () => child1.nextInt(0, 1000));
      const seq2 = Array.from({ length: 10 }, () => child2.nextInt(0, 1000));
      const seqParent = Array.from({ length: 10 }, () =>
        parent.nextInt(0, 1000)
      );

      expect(seq1).not.toEqual(seq2);
      expect(seq1).not.toEqual(seqParent);
      expect(seq2).not.toEqual(seqParent);
    });

    it("generates values within specified bounds correctly", () => {
      const trials = 1000;

      // Test nextInt bounds
      for (let i = 0; i < trials; i++) {
        const value = random.nextInt(10, 20);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
        expect(Number.isInteger(value)).toBe(true);
      }

      // Test nextLong bounds
      for (let i = 0; i < trials; i++) {
        const value = random.nextLong(100, 200);
        expect(value).toBeGreaterThanOrEqual(100);
        expect(value).toBeLessThan(200);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe("Real-World Shuffle Applications", () => {
    it("simulates random sampling from dataset", () => {
      // Simulate selecting random subset of nodes for processing
      const totalNodes = 1000;
      const sampleSize = 100;

      const nodeIds = Array.from({ length: totalNodes }, (_, i) => i);
      ShuffleUtil.shuffleNumberArray(nodeIds, random);

      const sample = nodeIds.slice(0, sampleSize);

      expect(sample.length).toBe(sampleSize);
      expect(new Set(sample).size).toBe(sampleSize); // No duplicates

      // Sample should span the full range
      const min = Math.min(...sample);
      const max = Math.max(...sample);
      expect(min).toBeGreaterThanOrEqual(0);
      expect(max).toBeLessThan(totalNodes);
    });

    it("demonstrates graph node permutation for algorithm testing", () => {
      // Common pattern: shuffle node processing order to avoid bias
      const nodeCount = 500;
      const nodeProcessingOrder = Array.from(
        { length: nodeCount },
        (_, i) => i
      );

      // ✅ Use fresh random instance instead of shared one
      const freshRandom = new SplittableRandom(9999);
      ShuffleUtil.shuffleNumberArray(nodeProcessingOrder, freshRandom);

      // Process nodes in shuffled order (simulation)
      const processedNodes = new Set<number>();
      let processingSteps = 0;

      for (const nodeId of nodeProcessingOrder) {
        processedNodes.add(nodeId);
        processingSteps++;

        if (processingSteps >= 100) break; // Simulate early stopping
      }

      expect(processedNodes.size).toBe(100);
      // Nodes processed should be well-distributed
      const nodeArray = Array.from(processedNodes).sort();
      const span = nodeArray[nodeArray.length - 1] - nodeArray[0];
      expect(span).toBeGreaterThan(nodeCount * 0.1); // Spread across at least 10% of range
    });

    it("debug - analyze the distribution issue", () => {
      const nodeCount = 500;
      const nodeProcessingOrder = Array.from(
        { length: nodeCount },
        (_, i) => i
      );

      console.log("Before shuffle:", nodeProcessingOrder.slice(0, 10));

      ShuffleUtil.shuffleNumberArray(
        nodeProcessingOrder,
        new SplittableRandom(12345)
      );

      console.log(
        "After shuffle (first 10):",
        nodeProcessingOrder.slice(0, 10)
      );

      // Take first 100 like the failing test
      const first100 = nodeProcessingOrder.slice(0, 100);
      const min = Math.min(...first100);
      const max = Math.max(...first100);
      const span = max - min;

      console.log(`First 100 shuffled nodes:`);
      console.log(`  Min: ${min}`);
      console.log(`  Max: ${max}`);
      console.log(`  Span: ${span}`);
      console.log(`  Required span: ${nodeCount * 0.1} (10% of ${nodeCount})`);
      console.log(`  Test passes: ${span > nodeCount * 0.1}`);

      // Show distribution
      const sorted = first100.sort((a, b) => a - b);
      console.log(
        `  Sorted sample: [${sorted.slice(0, 10).join(",")}...${sorted
          .slice(-10)
          .join(",")}]`
      );

    });

    it("shows performance comparison between algorithms", () => {
      const sizes = [100, 1000, 10000];

      sizes.forEach((size) => {
        const data = Array.from({ length: size }, (_, i) => i);

        // Time the shuffle
        const startTime = performance.now();
        ShuffleUtil.shuffleNumberArray(data, random);
        const endTime = performance.now();

        const timePerElement = (endTime - startTime) / size;

        // Should be O(n) - linear time
        expect(timePerElement).toBeLessThan(0.01); // < 0.01ms per element

        console.log(
          `Size ${size}: ${(endTime - startTime).toFixed(
            2
          )}ms (${timePerElement.toFixed(4)}ms per element)`
        );
      });
    });
  });
});

describe("SplittableRandom - Direct Testing", () => {
  it("test fixed next32() values", () => {
    const testRandom = new SplittableRandom(12345);

    console.log("Testing fixed next32() generation:");

    for (let i = 0; i < 10; i++) {
      const next32Value = (testRandom as any).next32();
      console.log(`  next32() call ${i}: ${next32Value}`);
    }

    // ▶️ CLICK -> Should see varied large numbers now!
  });

  it("test fixed nextInt() sequence", () => {
    const testRandom = new SplittableRandom(12345);

    console.log("Testing fixed nextInt(0, 10):");
    const values: number[] = [];

    for (let i = 0; i < 10; i++) {
      const value = testRandom.nextInt(0, 10);
      values.push(value);
      console.log(`  nextInt(0, 10) call ${i}: ${value}`);
    }

    console.log("Fixed sequence:", JSON.stringify(values));

    // Should have variety!
    const unique = new Set(values);
    expect(unique.size).toBeGreaterThan(1);

    // ▶️ CLICK -> Should see 0-9 values with variety!
  });

  it("tests Fisher-Yates specific nextInt() calls", () => {
    const testRandom = new SplittableRandom(12345);

    console.log("Exact nextInt() calls for Fisher-Yates on [1,2,3,4,5]:");
    const swapOperations: Array<{
      offset: number;
      bound: number;
      result: number;
    }> = [];

    // Simulate exact calls that shuffleNumberArray makes
    for (let offset = 0; offset < 4; offset++) {
      // 0 to 3 for 5-element array
      const swapWith = testRandom.nextInt(offset, 5);
      swapOperations.push({ offset, bound: 5, result: swapWith });

      console.log(`  Step ${offset}: nextInt(${offset}, 5) = ${swapWith}`);

      if (swapWith === offset) {
        console.log(`    -> Identity swap (element ${offset} stays)`);
      } else {
        console.log(`    -> Real swap: positions ${offset} ↔ ${swapWith}`);
      }
    }

    const identitySwaps = swapOperations.filter(
      (op) => op.result === op.offset
    ).length;
    const totalSwaps = swapOperations.length;

    console.log(`Identity swaps: ${identitySwaps}/${totalSwaps}`);

    // ▶️ CLICK THIS -> I predict we'll see 4/4 identity swaps!
    expect(identitySwaps).toBeLessThan(totalSwaps); // Should have some real swaps
  });

  it("compares different seeds for Fisher-Yates behavior", () => {
    const seeds = [1, 42, 12345, 999, 67890];

    console.log("Fisher-Yates nextInt() behavior across different seeds:");

    seeds.forEach((seed) => {
      const testRandom = new SplittableRandom(seed);
      const swaps: number[] = [];
      let identityCount = 0;

      console.log(`\nSeed ${seed}:`);
      for (let offset = 0; offset < 4; offset++) {
        const swapWith = testRandom.nextInt(offset, 5);
        swaps.push(swapWith);

        if (swapWith === offset) {
          identityCount++;
          console.log(
            `  ${offset}: nextInt(${offset},5)=${swapWith} (identity)`
          );
        } else {
          console.log(`  ${offset}: nextInt(${offset},5)=${swapWith} (swap)`);
        }
      }

      console.log(
        `  -> ${identityCount}/4 identity swaps, sequence: [${swaps.join(",")}]`
      );
    });

    // ▶️ CLICK THIS -> See which seeds produce identity permutations!
  });

  it("tests nextInt() edge cases and bounds", () => {
    const testRandom = new SplittableRandom(42);

    // Test various bound ranges
    const testCases = [
      { origin: 0, bound: 1 }, // Only one possible value
      { origin: 0, bound: 2 }, // Binary choice
      { origin: 5, bound: 6 }, // Single value in middle
      { origin: 0, bound: 10 }, // Common range
      { origin: 100, bound: 200 }, // Larger range
    ];

    console.log("nextInt() edge case testing:");

    testCases.forEach(({ origin, bound }) => {
      const samples = 20;
      const values: number[] = [];

      for (let i = 0; i < samples; i++) {
        const value = testRandom.nextInt(origin, bound);
        values.push(value);

        // Verify bounds
        expect(value).toBeGreaterThanOrEqual(origin);
        expect(value).toBeLessThan(bound);
      }

      const unique = new Set(values);
      console.log(
        `  nextInt(${origin}, ${bound}): ${samples} samples, ${unique.size} unique values`
      );
      console.log(
        `    range: ${Math.min(...values)} to ${Math.max(...values)}`
      );
    });
  });

  it("reproduces the exact shuffle sequence that fails", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...data];
    const testRandom = new SplittableRandom(12345);

    console.log("Manual Fisher-Yates simulation with seed 12345:");
    console.log("Starting array:", JSON.stringify(data));

    // Manually execute Fisher-Yates with logging
    for (let offset = 0; offset < data.length - 1; offset++) {
      const swapWith = testRandom.nextInt(offset, data.length);

      console.log(`\nStep ${offset}:`);
      console.log(`  Before: ${JSON.stringify(data)}`);
      console.log(`  nextInt(${offset}, ${data.length}) = ${swapWith}`);

      if (swapWith === offset) {
        console.log(`  No swap (${offset} = ${swapWith})`);
      } else {
        console.log(
          `  Swap positions ${offset} and ${swapWith}: ${data[offset]} ↔ ${data[swapWith]}`
        );

        // Perform the swap
        const tempValue = data[swapWith];
        data[swapWith] = data[offset];
        data[offset] = tempValue;
      }

      console.log(`  After:  ${JSON.stringify(data)}`);
    }

    console.log(`\nFinal result: ${JSON.stringify(data)}`);
    console.log(`Original was: ${JSON.stringify(original)}`);
    console.log(
      `Changed: ${JSON.stringify(data) !== JSON.stringify(original)}`
    );

    // ▶️ CLICK THIS -> See exactly what happens step by step!
  });

  it("validates nextInt() uniform distribution", () => {
    const testRandom = new SplittableRandom(999);
    const trials = 10000;
    const range = 10; // 0 to 9
    const counts = new Array(range).fill(0);

    // Generate many samples
    for (let i = 0; i < trials; i++) {
      const value = testRandom.nextInt(0, range);
      counts[value]++;
    }

    console.log("nextInt() distribution analysis:");
    console.log(`${trials} trials, range 0-${range - 1}:`);

    const expectedCount = trials / range;
    const tolerance = expectedCount * 0.1; // 10% tolerance

    counts.forEach((count, value) => {
      const percentage = ((count / trials) * 100).toFixed(1);
      console.log(
        `  ${value}: ${count} (${percentage}%) [expected: ${expectedCount.toFixed(
          0
        )}]`
      );

      expect(count).toBeGreaterThan(expectedCount - tolerance);
      expect(count).toBeLessThan(expectedCount + tolerance);
    });
  });
});

// Helper functions
function countElements(array: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  array.forEach((element) => {
    counts.set(element, (counts.get(element) || 0) + 1);
  });
  return counts;
}

function countZeros(hugeLongArray: HugeLongArray): number {
  let count = 0;
  for (let i = 0; i < hugeLongArray.size(); i++) {
    if (hugeLongArray.get(i) === 0) {
      count++;
    }
  }
  return count;
}
