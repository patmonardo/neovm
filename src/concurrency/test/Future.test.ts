import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Future } from "@/concurrency/Future";

describe("Future", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Basic Construction and Promise Interface", () => {
    it("can be constructed with executor function", () => {
      const future = new Future<number>((resolve) => {
        resolve(42);
      });

      expect(future).toBeInstanceOf(Future);
      expect(future[Symbol.toStringTag]).toBe("Future");
    });

    it("implements Promise interface", async () => {
      const future = new Future<string>((resolve) => {
        setTimeout(() => resolve("hello"), 100);
      });

      // Should work with Promise methods
      expect(typeof future.then).toBe("function");
      expect(typeof future.catch).toBe("function");
      expect(typeof future.finally).toBe("function");

      vi.advanceTimersByTime(100);
      const result = await future;
      expect(result).toBe("hello");
    });

    it("can be awaited like a regular Promise", async () => {
      const future = new Future<number>((resolve) => {
        resolve(123);
      });

      const result = await future;
      expect(result).toBe(123);
    });
  });

  describe("Cancellation Functionality", () => {
    it("starts as not cancelled", () => {
      const future = new Future<number>((resolve) => {
        setTimeout(() => resolve(42), 1000);
      });

      expect(future.isCancelled()).toBe(false);
    });

    it("can be cancelled", () => {
      const future = new Future<number>((resolve) => {
        setTimeout(() => resolve(42), 1000);
      });

      const cancelled = future.cancel();

      expect(cancelled).toBe(true);
      expect(future.isCancelled()).toBe(true);
    });

    it("cancelling twice returns false on second attempt", () => {
      const future = new Future<number>((resolve) => {
        setTimeout(() => resolve(42), 1000);
      });

      const firstCancel = future.cancel();
      const secondCancel = future.cancel();

      expect(firstCancel).toBe(true);
      expect(secondCancel).toBe(false);
      expect(future.isCancelled()).toBe(true);
    });

    it("get() throws error when cancelled", async () => {
      const future = new Future<number>((resolve) => {
        setTimeout(() => resolve(42), 1000);
      });

      future.cancel();

      await expect(future.get()).rejects.toThrow("Task was cancelled");
    });

    it("cancellation does not affect underlying Promise resolution", async () => {
      let resolveValue: number | null = null;

      const future = new Future<number>((resolve) => {
        setTimeout(() => {
          resolveValue = 42;
          resolve(42);
        }, 100);
      });

      future.cancel();

      // Even though cancelled, the underlying executor still runs
      vi.advanceTimersByTime(100);
      expect(resolveValue).toBe(42);

      // But get() should throw
      await expect(future.get()).rejects.toThrow("Task was cancelled");
    });
  });

  describe("get() Method vs Promise Interface", () => {
    it("get() returns the same result as await when not cancelled", async () => {
      const future = new Future<string>((resolve) => {
        resolve("test-value");
      });

      const [getResult, awaitResult] = await Promise.all([
        future.get(),
        future,
      ]);

      expect(getResult).toBe("test-value");
      expect(awaitResult).toBe("test-value");
      expect(getResult).toBe(awaitResult);
    });

    it("get() throws on cancellation while Promise methods may still work", async () => {
      const future = new Future<number>((resolve) => {
        resolve(42);
      });

      future.cancel();

      // get() should throw
      await expect(future.get()).rejects.toThrow("Task was cancelled");

      // But Promise interface might still work (interesting behavior!)
      // This tests the semantic difference between Java Future and Promise
    });
  });

  describe("Static Factory Methods", () => {
    describe("Future.resolved()", () => {
      it("creates already resolved Future", async () => {
        const future = Future.resolved(42);

        expect(future.isCancelled()).toBe(false);

        const result = await future.get();
        expect(result).toBe(42);
      });

      it("works with different types", async () => {
        const stringFuture = Future.resolved("hello");
        const objectFuture = Future.resolved({ value: 123 });
        const arrayFuture = Future.resolved([1, 2, 3]);

        expect(await stringFuture.get()).toBe("hello");
        expect(await objectFuture.get()).toEqual({ value: 123 });
        expect(await arrayFuture.get()).toEqual([1, 2, 3]);
      });
    });

    describe("Future.rejected()", () => {
      it("creates already rejected Future", async () => {
        const error = new Error("Test error");
        const future = Future.rejected<number>(error);

        await expect(future.get()).rejects.toThrow("Test error");
      });

      it("can be cancelled even when rejected", () => {
        const future = Future.rejected<number>(new Error("Test"));

        const cancelled = future.cancel();
        expect(cancelled).toBe(true);
        expect(future.isCancelled()).toBe(true);
      });
    });

    describe("Future.fromPromise()", () => {
      it("wraps existing Promise", async () => {
        const promise = Promise.resolve(100);
        const future = Future.fromPromise(promise);

        expect(future).toBeInstanceOf(Future);
        expect(await future.get()).toBe(100);
      });

      it("preserves Promise rejection", async () => {
        const promise = Promise.reject(new Error("Promise error"));
        const future = Future.fromPromise(promise);

        await expect(future.get()).rejects.toThrow("Promise error");
      });

      it("can be cancelled independently of original Promise", async () => {
        const promise = new Promise<number>((resolve) => {
          setTimeout(() => resolve(42), 1000);
        });

        const future = Future.fromPromise(promise);
        future.cancel();

        expect(future.isCancelled()).toBe(true);
        await expect(future.get()).rejects.toThrow("Task was cancelled");
      });
    });

    describe("Future.delay()", () => {
      it("creates Future that resolves after delay", async () => {
        const future = Future.delay("delayed-value", 500);

        expect(future.isCancelled()).toBe(false);

        // Advance time and check result
        vi.advanceTimersByTime(500);
        const result = await future.get();
        expect(result).toBe("delayed-value");
      });

      it("can be cancelled before delay completes", async () => {
        const future = Future.delay(42, 1000);

        // Cancel before delay completes
        vi.advanceTimersByTime(500);
        future.cancel();

        expect(future.isCancelled()).toBe(true);
        await expect(future.get()).rejects.toThrow("Task was cancelled");
      });
    });
  });

  describe("Future.all() - Parallel Composition", () => {
    it("resolves when all futures resolve", async () => {
      const futures = [
        Future.resolved(1),
        Future.resolved(2),
        Future.resolved(3),
      ];

      const allFuture = Future.all(futures);
      const results = await allFuture.get();

      expect(results).toEqual([1, 2, 3]);
    });

    it("handles empty array", async () => {
      const allFuture = Future.all([]);
      const results = await allFuture.get();

      expect(results).toEqual([]);
    });

    it("rejects if any future rejects", async () => {
      const futures = [
        Future.resolved(1),
        Future.rejected(new Error("Second failed")),
        Future.resolved(3),
      ];

      const allFuture = Future.all(futures);

      await expect(allFuture.get()).rejects.toThrow("Second failed");
    });

    it("preserves order of results", async () => {
      const futures = [
        Future.delay("first", 300),
        Future.delay("second", 100),
        Future.delay("third", 200),
      ];

      const allFuture = Future.all(futures);

      vi.advanceTimersByTime(300);
      const results = await allFuture.get();

      expect(results).toEqual(["first", "second", "third"]);
    });

    it("can be cancelled independently", async () => {
      const futures = [
        Future.delay(1, 100),
        Future.delay(2, 200),
        Future.delay(3, 300),
      ];

      const allFuture = Future.all(futures);
      allFuture.cancel();

      expect(allFuture.isCancelled()).toBe(true);
      await expect(allFuture.get()).rejects.toThrow("Task was cancelled");
    });
  });

  describe("Future.race() - Competitive Composition", () => {
    it("resolves with first completing future", async () => {
      const futures = [
        Future.delay("slow", 300),
        Future.delay("fast", 100),
        Future.delay("medium", 200),
      ];

      const raceFuture = Future.race(futures);

      vi.advanceTimersByTime(100);
      const result = await raceFuture.get();

      expect(result).toBe("fast");
    });

    it("rejects with first rejecting future", async () => {
      const futures = [
        Future.delay("slow", 300),
        new Future<string>((_, reject) => {
          setTimeout(() => reject(new Error("Fast failure")), 100);
        }),
        Future.delay("medium", 200),
      ];

      const raceFuture = Future.race(futures);

      vi.advanceTimersByTime(100);
      await expect(raceFuture.get()).rejects.toThrow("Fast failure");
    });

    it("handles empty array", async () => {
      const raceFuture = Future.race([]);

      await expect(raceFuture.get()).rejects.toThrow(
        "Cannot race empty array of futures"
      );
    });

    it("can be cancelled", async () => {
      const futures = [Future.delay("first", 100), Future.delay("second", 200)];

      const raceFuture = Future.race(futures);
      raceFuture.cancel();

      expect(raceFuture.isCancelled()).toBe(true);
      await expect(raceFuture.get()).rejects.toThrow("Task was cancelled");
    });
  });

  describe("Promise Compatibility", () => {
    it("works with Promise.all()", async () => {
      const futures = [
        Future.resolved(1),
        Future.resolved(2),
        Future.resolved(3),
      ];

      // Should work as Promises
      const results = await Promise.all(futures);
      expect(results).toEqual([1, 2, 3]);
    });

    it("works with Promise.race()", async () => {
      const futures = [Future.delay("slow", 200), Future.delay("fast", 100)];

      vi.advanceTimersByTime(100);
      const result = await Promise.race(futures);
      expect(result).toBe("fast");
    });

    it("supports chaining with then/catch", async () => {
      const future = Future.resolved(10);

      const result = await future
        .then((x) => x * 2)
        .then((x) => x + 5)
        .catch(() => 0);

      expect(result).toBe(25);
    });

    it("supports finally clause", async () => {
      let finallyCalled = false;

      const future = Future.resolved(42);

      const result = await future.finally(() => {
        finallyCalled = true;
      });

      expect(result).toBe(42);
      expect(finallyCalled).toBe(true);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles executor function throwing synchronously", async () => {
      const future = new Future<number>(() => {
        throw new Error("Executor failed");
      });

      await expect(future.get()).rejects.toThrow("Executor failed");
    });

    it("handles multiple concurrent get() calls", async () => {
      const future = Future.delay(42, 100);

      const promises = [future.get(), future.get(), future.get()];

      vi.advanceTimersByTime(100);
      const results = await Promise.all(promises);

      expect(results).toEqual([42, 42, 42]);
    });
  });
});
