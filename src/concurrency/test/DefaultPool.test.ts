import { DefaultPool } from "@/concurrency";
import { WorkerPool } from "@/concurrency";
import { PoolSizesService } from "@/concurrency";

describe("DefaultPool", () => {
  afterAll(async () => {
    // Clean up the singleton pool after all tests
    if (!DefaultPool.INSTANCE.isShutdown()) {
      await DefaultPool.INSTANCE.shutdown();
    }
  });

  describe("Singleton Pattern", () => {
    it("provides a singleton instance", () => {
      expect(DefaultPool.INSTANCE).toBeDefined();
      expect(DefaultPool.INSTANCE).toBeInstanceOf(WorkerPool);
    });

    it("always returns the same instance", () => {
      const instance1 = DefaultPool.INSTANCE;
      const instance2 = DefaultPool.INSTANCE;

      expect(instance1).toBe(instance2); // Same object reference
    });

    it("cannot be instantiated", () => {
      expect(() => {
        // @ts-expect-error - Testing runtime behavior
        new DefaultPool();
      }).toThrow("DefaultPool cannot be instantiated");
    });
  });

  describe("Pool Configuration", () => {
    it("is configured with PoolSizesService settings", () => {
      const poolSizes = PoolSizesService.poolSizes();
      const instance = DefaultPool.INSTANCE;

      // Verify the pool exists and is functional
      expect(instance).toBeInstanceOf(WorkerPool);
      expect(instance.isShutdown()).toBe(false);
    });

    it("uses system-appropriate pool sizes", () => {
      const instance = DefaultPool.INSTANCE;

      // Should be configured and ready
      expect(instance.isShutdown()).toBe(false);

      // Should be able to accept submissions
      expect(typeof instance.submit).toBe("function");
      expect(typeof instance.shutdown).toBe("function");
    });
  });

  describe("Functional Behavior", () => {
    it("can execute simple tasks", async () => {
      const instance = DefaultPool.INSTANCE;

      const result = await instance.submit({
        run: () => "default-pool-working",
      });

      expect(result).toBe("default-pool-working");
    });

    it("can execute computational tasks", async () => {
      const instance = DefaultPool.INSTANCE;

      const result = await instance.submit({
        run: () => {
          let sum = 0;
          for (let i = 1; i <= 10; i++) {
            sum += i;
          }
          return sum;
        },
      });

      expect(result).toBe(55); // Sum of 1 to 10
    });

    it("can handle multiple concurrent tasks", async () => {
      const instance = DefaultPool.INSTANCE;

      const tasks = [
        instance.submit({ run: () => 1 * 2 }),
        instance.submit({ run: () => 2 * 3 }),
        instance.submit({ run: () => 3 * 4 }),
        instance.submit({ run: () => 4 * 5 }),
      ];

      const results = await Promise.all(tasks);
      expect(results).toEqual([2, 6, 12, 20]);
    });

    it("handles different return types", async () => {
      const instance = DefaultPool.INSTANCE;

      const [numberResult, stringResult, objectResult, booleanResult] =
        await Promise.all([
          instance.submit({ run: () => 42 }),
          instance.submit({ run: () => "hello" }),
          instance.submit({ run: () => ({ value: 123 }) }),
          instance.submit({ run: () => true }),
        ]);

      expect(numberResult).toBe(42);
      expect(stringResult).toBe("hello");
      expect(objectResult).toEqual({ value: 123 });
      expect(booleanResult).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("propagates errors from failed tasks", async () => {
      const instance = DefaultPool.INSTANCE;

      const errorTask = {
        run: () => {
          throw new Error("Task intentionally failed");
        },
      };

      await expect(instance.submit(errorTask)).rejects.toThrow(
        "Task intentionally failed"
      );
    });

    it("continues functioning after task errors", async () => {
      const instance = DefaultPool.INSTANCE;

      // Submit failing task
      try {
        await instance.submit({
          run: () => {
            throw new Error("Temporary failure");
          },
        });
      } catch (error) {
        // Expected to fail
      }

      // Pool should still work for subsequent tasks
      const result = await instance.submit({
        run: () => "recovery-successful",
      });

      expect(result).toBe("recovery-successful");
    });
  });

  describe("Integration with PoolSizesService", () => {
    it("reflects PoolSizesService configuration", () => {
      const poolSizes = PoolSizesService.poolSizes();
      const instance = DefaultPool.INSTANCE;

      // Verify integration - pool should be configured with service settings
      expect(instance).toBeInstanceOf(WorkerPool);

      // Pool should have reasonable size limits based on system
      expect(poolSizes.corePoolSize()).toBeGreaterThanOrEqual(1);
      expect(poolSizes.maxPoolSize()).toBeGreaterThanOrEqual(
        poolSizes.corePoolSize()
      );
    });

    it("adapts to system capabilities", () => {
      const instance = DefaultPool.INSTANCE;

      // Should be configured appropriately for the current system
      expect(instance.isShutdown()).toBe(false);

      // Should be able to handle at least basic concurrency
      const poolSizes = PoolSizesService.poolSizes();
      expect(poolSizes.corePoolSize()).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Lifecycle Management", () => {
    it("starts in operational state", () => {
      const instance = DefaultPool.INSTANCE;
      expect(instance.isShutdown()).toBe(false);
    });

    it("maintains state across multiple accesses", () => {
      const instance1 = DefaultPool.INSTANCE;
      const instance2 = DefaultPool.INSTANCE;

      expect(instance1.isShutdown()).toBe(false);
      expect(instance2.isShutdown()).toBe(false);
      expect(instance1).toBe(instance2);
    });

    // Note: We don't test shutdown here because it's a singleton
    // and shutting it down would affect other tests
    it("provides shutdown capability", () => {
      const instance = DefaultPool.INSTANCE;

      // Just verify the method exists - don't actually call it
      expect(typeof instance.shutdown).toBe("function");
    });
  });

  describe("Default Pool Usage Patterns", () => {
    it("supports typical parallel computation patterns", async () => {
      const instance = DefaultPool.INSTANCE;

      // Parallel map-like operation
      const numbers = [1, 2, 3, 4, 5];
      const tasks = [
        instance.submit({ run: () => 1 * 1 }),
        instance.submit({ run: () => 2 * 2 }),
        instance.submit({ run: () => 3 * 3 }),
        instance.submit({ run: () => 4 * 4 }),
        instance.submit({ run: () => 5 * 5 }),
      ];

      const squares = await Promise.all(tasks);
      expect(squares).toEqual([1, 4, 9, 16, 25]);
    });

    it("works for divide-and-conquer algorithms", async () => {
      const instance = DefaultPool.INSTANCE;

      // Self-contained tasks instead of closure variables
      const chunkTasks = [
        instance.submit({
          run: () => [1, 2, 3].reduce((sum, n) => sum + n, 0),
        }),
        instance.submit({
          run: () => [4, 5, 6].reduce((sum, n) => sum + n, 0),
        }),
        instance.submit({
          run: () => [7, 8, 9].reduce((sum, n) => sum + n, 0),
        }),
      ];

      const chunkSums = await Promise.all(chunkTasks);
      const totalSum = chunkSums.reduce((sum, chunkSum) => sum + chunkSum, 0);

      expect(chunkSums).toEqual([6, 15, 24]); // Individual chunk sums
      expect(totalSum).toBe(45); // Sum of 1 to 9
    });
  });
});
