import { describe, it, expect } from 'vitest';
import { BatchSize } from '@/concurrency/BatchSize';

describe('BatchSize', () => {
  describe('Constructor and Basic Properties', () => {
    it('creates batch size with valid positive values', () => {
      const batch1 = new BatchSize(1);
      const batch10 = new BatchSize(10);
      const batch1000 = new BatchSize(1000);

      expect(batch1.value).toBe(1);
      expect(batch10.value).toBe(10);
      expect(batch1000.value).toBe(1000);
    });

    it('rejects invalid batch sizes', () => {
      expect(() => new BatchSize(0)).toThrow('Batch size must be at least 1');
      expect(() => new BatchSize(-1)).toThrow('Batch size must be at least 1');
      expect(() => new BatchSize(-10)).toThrow('Batch size must be at least 1');
    });

    it('handles edge case of minimum valid value', () => {
      const minBatch = new BatchSize(1);
      expect(minBatch.value).toBe(1);
    });

    it('handles large batch sizes', () => {
      const largeBatch = new BatchSize(1000000);
      expect(largeBatch.value).toBe(1000000);
    });
  });

  describe('BatchSize.ofTotal() - Load Distribution', () => {
    it('divides work evenly across threads', () => {
      // 100 items across 4 threads = 25 per batch
      const batch = BatchSize.ofTotal(100, 4);
      expect(batch.value).toBe(25);

      // 1000 items across 8 threads = 125 per batch
      const largeBatch = BatchSize.ofTotal(1000, 8);
      expect(largeBatch.value).toBe(125);
    });

    it('uses ceiling division to handle remainders', () => {
      // 10 items across 3 threads = ceil(10/3) = 4 per batch
      const batch1 = BatchSize.ofTotal(10, 3);
      expect(batch1.value).toBe(4);

      // 100 items across 7 threads = ceil(100/7) = 15 per batch
      const batch2 = BatchSize.ofTotal(100, 7);
      expect(batch2.value).toBe(15);

      // 50 items across 6 threads = ceil(50/6) = 9 per batch
      const batch3 = BatchSize.ofTotal(50, 6);
      expect(batch3.value).toBe(9);
    });

    it('handles edge cases for total size', () => {
      // Zero or negative total should return batch size of 1
      expect(BatchSize.ofTotal(0, 4).value).toBe(1);
      expect(BatchSize.ofTotal(-5, 4).value).toBe(1);

      // Single item should create batch of 1 regardless of concurrency
      expect(BatchSize.ofTotal(1, 10).value).toBe(1);
    });

    it('handles edge cases for concurrency', () => {
      // Zero or negative concurrency should return total size as batch
      expect(BatchSize.ofTotal(100, 0).value).toBe(100);
      expect(BatchSize.ofTotal(50, -2).value).toBe(50);

      // Single thread should get all items
      expect(BatchSize.ofTotal(1000, 1).value).toBe(1000);
    });

    it('demonstrates typical parallel processing scenarios', () => {
      // Typical scenarios
      const scenarios = [
        { total: 1000, threads: 4, expected: 250 },  // Perfect division
        { total: 1000, threads: 3, expected: 334 },  // With remainder: ceil(1000/3)
        { total: 100, threads: 8, expected: 13 },    // Small batches: ceil(100/8)
        { total: 1, threads: 10, expected: 1 },      // Single item
        { total: 10000, threads: 16, expected: 625 } // Large dataset
      ];

      scenarios.forEach(({ total, threads, expected }) => {
        const batch = BatchSize.ofTotal(total, threads);
        expect(batch.value).toBe(expected);
      });
    });
  });

  describe('BatchSize.withMax() - Size Limiting', () => {
    it('creates batch with specified maximum', () => {
      const batch64 = BatchSize.withMax(64);
      const batch256 = BatchSize.withMax(256);
      const batch1024 = BatchSize.withMax(1024);

      expect(batch64.value).toBe(64);
      expect(batch256.value).toBe(256);
      expect(batch1024.value).toBe(1024);
    });

    it('respects minimum batch size constraint', () => {
      expect(() => BatchSize.withMax(0)).toThrow('Batch size must be at least 1');
      expect(() => BatchSize.withMax(-10)).toThrow('Batch size must be at least 1');
    });

    it('handles typical maximum batch sizes', () => {
      // Common power-of-2 sizes
      const sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

      sizes.forEach(size => {
        const batch = BatchSize.withMax(size);
        expect(batch.value).toBe(size);
      });
    });
  });

  describe('BatchSize.optimal() - Performance Optimization', () => {
    it('returns cache-friendly batch size', () => {
      const optimal = BatchSize.optimal();

      // Should be 256 based on the implementation comment
      expect(optimal.value).toBe(256);
    });

    it('provides consistent optimal size', () => {
      const optimal1 = BatchSize.optimal();
      const optimal2 = BatchSize.optimal();

      expect(optimal1.value).toBe(optimal2.value);
    });

    it('optimal size is reasonable for cache performance', () => {
      const optimal = BatchSize.optimal();

      // Should be a reasonable size (not too small, not too large)
      expect(optimal.value).toBeGreaterThanOrEqual(64);   // Not too small
      expect(optimal.value).toBeLessThanOrEqual(1024);    // Not too large

      // Should be a power of 2 or close to it (cache-friendly)
      expect(optimal.value).toBe(256);
    });
  });

  describe('String Representation', () => {
    it('provides meaningful toString output', () => {
      expect(new BatchSize(1).toString()).toBe('BatchSize(1)');
      expect(new BatchSize(64).toString()).toBe('BatchSize(64)');
      expect(new BatchSize(1000).toString()).toBe('BatchSize(1000)');
    });

    it('toString is consistent with value', () => {
      const sizes = [1, 10, 100, 256, 1000];

      sizes.forEach(size => {
        const batch = new BatchSize(size);
        expect(batch.toString()).toBe(`BatchSize(${size})`);
      });
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('supports typical batch processing scenarios', () => {
      // Database batch inserts
      const dbBatch = BatchSize.withMax(1000);
      expect(dbBatch.value).toBe(1000);

      // Memory-constrained processing
      const memoryBatch = BatchSize.withMax(100);
      expect(memoryBatch.value).toBe(100);

      // High-throughput streaming
      const streamBatch = BatchSize.optimal();
      expect(streamBatch.value).toBe(256);
    });

    it('handles work distribution calculations', () => {
      // Large dataset processing
      const totalRecords = 1000000;
      const availableWorkers = 8;

      const batch = BatchSize.ofTotal(totalRecords, availableWorkers);

      // Should distribute work evenly
      expect(batch.value).toBe(125000); // ceil(1000000/8)

      // Verify all work gets covered
      const totalBatches = Math.ceil(totalRecords / batch.value);
      expect(totalBatches).toBe(availableWorkers);
    });

    it('supports dynamic batch sizing strategies', () => {
      const dataSize = 5000;
      const workerCount = 6;

      // Strategy 1: Distribute evenly
      const distributedBatch = BatchSize.ofTotal(dataSize, workerCount);
      expect(distributedBatch.value).toBe(834); // ceil(5000/6)

      // Strategy 2: Limit maximum batch size
      const limitedBatch = BatchSize.withMax(500);
      expect(limitedBatch.value).toBe(500);

      // Strategy 3: Use optimal cache size
      const optimalBatch = BatchSize.optimal();
      expect(optimalBatch.value).toBe(256);
    });
  });

  describe('Mathematical Properties', () => {
    it('maintains work coverage with ofTotal', () => {
      const testCases = [
        { total: 100, workers: 3 },
        { total: 1000, workers: 7 },
        { total: 47, workers: 5 }
      ];

      testCases.forEach(({ total, workers }) => {
        const batch = BatchSize.ofTotal(total, workers);
        const batchesNeeded = Math.ceil(total / batch.value);

        // Should need at most 'workers' number of batches
        expect(batchesNeeded).toBeLessThanOrEqual(workers);

        // Should cover all items
        expect(batchesNeeded * batch.value).toBeGreaterThanOrEqual(total);
      });
    });

    it('handles boundary conditions', () => {
      // When total equals concurrency
      expect(BatchSize.ofTotal(5, 5).value).toBe(1);

      // When total is less than concurrency
      expect(BatchSize.ofTotal(3, 10).value).toBe(1);

      // When total is much larger than concurrency
      expect(BatchSize.ofTotal(10000, 2).value).toBe(5000);
    });
  });
});
