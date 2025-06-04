import { Concurrency } from "@/concurrency";
import { WorkerPool } from "@/concurrency";
import { ExecutorServiceUtil } from "@/concurrency";

describe("ExecutorServiceUtil", () => {
  let createdPools: WorkerPool[] = [];

  afterEach(async () => {
    for (const pool of createdPools) {
      await pool.shutdown();
    }
    createdPools = [];
  });

  describe("createSingleThreadPool()", () => {
    it("creates a functional worker pool", () => {
      const pool = ExecutorServiceUtil.createSingleThreadPool("test-single");
      createdPools.push(pool);

      expect(pool).toBeInstanceOf(WorkerPool);
      expect(pool.isShutdown()).toBe(false);
    });

    it("pool can accept runnable submissions", async () => {
      const pool = ExecutorServiceUtil.createSingleThreadPool("test-submit");
      createdPools.push(pool);

      // Create proper Runnable
      const runnable = {
        run(): number {
          return 42;
        },
      };

      const result = await pool.submit(runnable);
      expect(result).toBe(42);
    });

    it("handles different return types", async () => {
      const pool = ExecutorServiceUtil.createSingleThreadPool("test-types");
      createdPools.push(pool);

      // String result
      const stringRunnable = {
        run(): string {
          return "hello world";
        },
      };

      // Number calculation
      const numberRunnable = {
        run(): number {
          return 1 + 1;
        },
      };

      // Object result
      const objectRunnable = {
        run(): { value: number } {
          return { value: 123 };
        },
      };

      const [stringResult, numberResult, objectResult] = await Promise.all([
        pool.submit(stringRunnable),
        pool.submit(numberRunnable),
        pool.submit(objectRunnable),
      ]);

      expect(stringResult).toBe("hello world");
      expect(numberResult).toBe(2);
      expect(objectResult).toEqual({ value: 123 });
    });
  });

  describe("createThreadPool()", () => {
    it("can execute multiple runnables concurrently", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(2, 4);
      createdPools.push(pool);

      // Create multiple runnables
      const runnables = [
        { run: () => 1 + 1 },
        { run: () => 2 + 2 },
        { run: () => 3 + 3 },
        { run: () => 4 + 4 },
      ];

      const tasks = runnables.map((runnable) => pool.submit(runnable));
      const results = await Promise.all(tasks);

      expect(results).toEqual([2, 4, 6, 8]);
    });

    it("handles computational runnables correctly", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(2, 4);
      createdPools.push(pool);

      const computationRunnable = {
        run(): number {
          let sum = 0;
          for (let i = 1; i <= 100; i++) {
            sum += i;
          }
          return sum;
        },
      };

      const result = await pool.submit(computationRunnable);
      expect(result).toBe(5050); // Sum of 1 to 100
    });

    it("handles async runnables", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(2, 4);
      createdPools.push(pool);

      const asyncRunnable = {
        async run(): Promise<string> {
          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 10));
          return "async-result";
        },
      };

      const result = await pool.submit(asyncRunnable);
      expect(result).toBe("async-result");
    });
  });

  describe("createForkJoinPool()", () => {
    it("creates a concurrency-based functional pool", () => {
      const concurrency = Concurrency.of(4);
      const pool = ExecutorServiceUtil.createForkJoinPool(concurrency);
      createdPools.push(pool);

      expect(pool).toBeInstanceOf(WorkerPool);
      expect(pool.isShutdown()).toBe(false);
    });

    it("executes runnables with specified concurrency", async () => {
      const concurrency = Concurrency.of(2);
      const pool = ExecutorServiceUtil.createForkJoinPool(concurrency);
      createdPools.push(pool);

      const runnables = Array.from({ length: 4 }, (_, i) => ({
        run: () => i * 2,
      }));

      const tasks = runnables.map((runnable) => pool.submit(runnable));
      const results = await Promise.all(tasks);

      expect(results).toEqual([0, 2, 4, 6]);
    });

    it("adapts to different concurrency levels", async () => {
      const lowConcurrency = Concurrency.of(1);
      const highConcurrency = Concurrency.of(4);

      const lowPool = ExecutorServiceUtil.createForkJoinPool(lowConcurrency);
      const highPool = ExecutorServiceUtil.createForkJoinPool(highConcurrency);
      createdPools.push(lowPool, highPool);

      // Both should be functional regardless of concurrency level
      const lowResult = await lowPool.submit({ run: () => "low-concurrency" });
      const highResult = await highPool.submit({
        run: () => "high-concurrency",
      });

      expect(lowResult).toBe("low-concurrency");
      expect(highResult).toBe("high-concurrency");
    });
  });

  it("all pools support core WorkerPool operations", async () => {
    const pools = [
      ExecutorServiceUtil.createSingleThreadPool("test"),
      ExecutorServiceUtil.createThreadPool(2, 4),
      ExecutorServiceUtil.createForkJoinPool(Concurrency.of(3)),
    ];

    createdPools.push(...pools);

    // Test functional interface - all pools should execute tasks
    for (const pool of pools) {
      expect(typeof pool.submit).toBe("function");
      expect(typeof pool.shutdown).toBe("function");
      expect(typeof pool.isShutdown).toBe("function");

      // Verify functional capability
      const result = await pool.submit({ run: () => "working" });
      expect(result).toBe("working");
      expect(pool.isShutdown()).toBe(false);
    }
  });

  describe("Runnable Interface Validation", () => {
    it("accepts class-based runnables", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(1, 1);
      createdPools.push(pool);

      class CalculatorRunnable {
        constructor(private a: number, private b: number) {}

        run(): number {
          return this.a + this.b;
        }
      }

      const calculator = new CalculatorRunnable(10, 20);
      const result = await pool.submit(calculator);

      expect(result).toBe(30);
    });

    it("accepts function-based runnables with context", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(1, 1);
      createdPools.push(pool);

      const context = { multiplier: 5 };

      const contextRunnable = {
        run() {
          return context.multiplier * 8;
        },
      };

      const result = await pool.submit(contextRunnable);
      expect(result).toBe(40);
    });

    it("handles runnables with void return type", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(1, 1);
      createdPools.push(pool);

      let sideEffect = "";

      const voidRunnable = {
        run(): void {
          sideEffect = "executed";
        },
      };

      const result = await pool.submit(voidRunnable);
      expect(result).toBeUndefined();
      expect(sideEffect).toBe("executed");
    });
  });

  describe("Error Handling with Runnables", () => {
    it("propagates errors from runnables", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(1, 1);
      createdPools.push(pool);

      const errorRunnable = {
        run(): never {
          throw new Error("Runnable failed");
        },
      };

      await expect(pool.submit(errorRunnable)).rejects.toThrow(
        "Runnable failed"
      );
    });

    it("handles runnables that return rejected promises", async () => {
      const pool = ExecutorServiceUtil.createThreadPool(1, 1);
      createdPools.push(pool);

      const rejectedRunnable = {
        async run(): Promise<string> {
          throw new Error("Async runnable failed");
        },
      };

      await expect(pool.submit(rejectedRunnable)).rejects.toThrow(
        "Async runnable failed"
      );
    });
  });
});
