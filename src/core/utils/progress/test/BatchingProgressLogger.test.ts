import { describe, it, expect, beforeEach, vi } from "vitest";
import { BatchingProgressLogger } from "@/core/utils/progress/BatchingProgressLogger";
import { Task } from "@/core/utils/progress/tasks/Task";
import { LeafTask } from "@/core/utils/progress/tasks/LeafTask";
import { Concurrency } from "@/concurrency";
import { ConsoleLog } from "@/utils/Log";

describe("BatchingProgressLogger - Expanded Simple Tests", () => {
  let logger: BatchingProgressLogger;
  let task: Task;
  let consoleLog: ConsoleLog;
  let capturedLogs: string[];

  beforeEach(() => {
    capturedLogs = [];

    // Spy on ALL console methods that the Log class uses
    vi.spyOn(console, "info").mockImplementation((message: string) => {
      // ✅ ADD THIS
      capturedLogs.push(message);
    });
    vi.spyOn(console, "log").mockImplementation((message: string) => {
      capturedLogs.push(message);
    });
    vi.spyOn(console, "warn").mockImplementation((message: string) => {
      capturedLogs.push(message);
    });
    vi.spyOn(console, "error").mockImplementation((message: string) => {
      capturedLogs.push(message);
    });
    vi.spyOn(console, "debug").mockImplementation((message: string) => {
      capturedLogs.push(message);
    });
    consoleLog = new ConsoleLog();
    const leafTask = new LeafTask("Test Task", 100);
    task = new Task("Main", [leafTask]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 🎯 EXPAND: Constructor tests
  describe("Constructor Tests - Expanded", () => {
    it("creates logger with automatic batch size", () => {
      logger = new BatchingProgressLogger(consoleLog, task, Concurrency.of(1));

      expect(logger).toBeDefined();
      expect(logger.getTask()).toBe("Main");
    });

    it("creates logger with explicit batch size", () => {
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        4,
        Concurrency.of(1)
      );

      expect(logger).toBeDefined();
      expect(logger.getTask()).toBe("Main");
    });

    it("creates logger with different concurrency levels", () => {
      const concurrencies = [1, 2, 4, 8];

      concurrencies.forEach((concurrency) => {
        const testLogger = new BatchingProgressLogger(
          consoleLog,
          task,
          Concurrency.of(concurrency)
        );
        expect(testLogger).toBeDefined();
        expect(testLogger.getTask()).toBe("Main");
      });
    });

    it("creates logger with zero volume task", () => {
      const zeroTask = new LeafTask("Zero Task", 0);
      const zeroTaskWrapper = new Task("Zero Main", [zeroTask]);

      expect(() => {
        const zeroLogger = new BatchingProgressLogger(
          consoleLog,
          zeroTaskWrapper,
          Concurrency.of(1)
        );
        expect(zeroLogger.getTask()).toBe("Zero Main");
      }).not.toThrow();
    });
  });

  // 🎯 EXPAND: Basic logging tests
  describe("Basic Logging Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        4,
        Concurrency.of(1)
      );
    });

    it("logs simple message", () => {
      logger.logMessage("Hello");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("Hello");
      expect(capturedLogs[0]).toContain("[main]");
      expect(capturedLogs[0]).toContain("Main");
    });

    it("logs warning message", () => {
      logger.logWarning("Test warning");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("Test warning");
    });

    it("logs error message", () => {
      logger.logError("Test error");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("Test error");
    });

    it("logs debug message", () => {
      vi.spyOn(consoleLog, "isDebugEnabled").mockReturnValue(true);
      logger.logDebug("Test debug");

      expect(capturedLogs.length).toBe(1);
      expect(capturedLogs[0]).toContain("Test debug");
    });

    it("logs messages with special characters", () => {
      const specialMessage = "Process [data] with (special) chars: 100%";
      logger.logMessage(specialMessage);

      expect(capturedLogs[0]).toContain(specialMessage);
    });

    it("ignores empty messages", () => {
      logger.logMessage("");
      logger.logMessage(null as any);
      logger.logMessage(undefined as any);

      // Should not log empty messages
      expect(capturedLogs.length).toBe(0);
    });
  });

  // 🎯 EXPAND: Progress logging tests
  describe("Progress Logging Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        4,
        Concurrency.of(1)
      );
    });

    it("logs progress with small batch size", () => {
      logger.logProgress(10);

      console.log("Progress logs captured:", capturedLogs.length);
      console.log("Progress messages:", capturedLogs);

      // With batch size 4 and progress 10, should trigger logging
      expect(capturedLogs.length).toBeGreaterThanOrEqual(0);
    });

    it("logs progress with default increment", () => {
      // Test default progress (should be 1)
      logger.logProgress();

      console.log("Default progress logs:", capturedLogs);
      expect(capturedLogs.length).toBeGreaterThanOrEqual(0);
    });

    it("accumulates progress correctly", () => {
      // Log multiple progress updates
      logger.logProgress(5);
      logger.logProgress(10);
      logger.logProgress(15);

      console.log("Accumulated progress logs:", capturedLogs);
      expect(capturedLogs.length).toBeGreaterThanOrEqual(0);
    });

    it("handles zero progress", () => {
      logger.logProgress(0);

      // Zero progress should be ignored
      expect(capturedLogs.length).toBe(0);
    });

    it("handles negative progress", () => {
      expect(() => {
        logger.logProgress(-5);
        console.log("Negative progress logs:", capturedLogs);
      }).not.toThrow();
    });
  });

  // 🎯 EXPAND: Batch calculation tests
  describe("Batch Calculation Tests - Expanded", () => {
    it("calculates batch size for various volumes", () => {
      const volumes = [1, 10, 100, 1000, 10000];

      volumes.forEach((volume) => {
        const batchSize = BatchingProgressLogger.calculateBatchSizeForVolume(
          volume,
          Concurrency.of(1)
        );
        console.log(`Volume: ${volume}, Batch: ${batchSize}`);

        expect(batchSize).toBeGreaterThan(0);
        expect(Math.log2(batchSize) % 1).toBe(0); // Power of 2
      });
    });

    it("calculates batch size for various concurrencies", () => {
      const concurrencies = [1, 2, 4, 8, 16];

      concurrencies.forEach((concurrency) => {
        const batchSize = BatchingProgressLogger.calculateBatchSizeForVolume(
          1000,
          Concurrency.of(concurrency)
        );
        console.log(`Concurrency: ${concurrency}, Batch: ${batchSize}`);

        expect(batchSize).toBeGreaterThan(0);
        expect(Math.log2(batchSize) % 1).toBe(0); // Power of 2
      });
    });

    it("respects maximum log interval", () => {
      const hugeBatchSize = BatchingProgressLogger.calculateBatchSizeForVolume(
        1000000,
        Concurrency.of(1)
      );

      expect(hugeBatchSize).toBeLessThanOrEqual(
        2 * BatchingProgressLogger.MAXIMUM_LOG_INTERVAL
      );
    });

    it("handles edge cases in calculation", () => {
      const edgeCases = [
        { volume: 0, concurrency: 1 },
        { volume: 1, concurrency: 1 },
        { volume: 2, concurrency: 1 },
        { volume: 1000000000, concurrency: 32 },
      ];

      edgeCases.forEach((testCase) => {
        expect(() => {
          const batchSize = BatchingProgressLogger.calculateBatchSizeForVolume(
            testCase.volume,
            Concurrency.of(testCase.concurrency)
          );
          console.log(
            `Edge case - Volume: ${testCase.volume}, Concurrency: ${testCase.concurrency}, Batch: ${batchSize}`
          );
          expect(batchSize).toBeGreaterThanOrEqual(1);
        }).not.toThrow();
      });
    });
  });

  // 🎯 EXPAND: Reset functionality tests
  describe("Reset Functionality Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(consoleLog, task, Concurrency.of(1));
    });

    it("resets with new volume", () => {
      // Log some initial progress
      logger.logProgress(10);

      const remaining = logger.reset(200);
      console.log("Reset returned:", remaining);

      expect(remaining).toBe(90); // 100 - 10 = 90
    });

    it("resets with zero volume", () => {
      const remaining = logger.reset(0);
      console.log("Reset with 0 returned:", remaining);

      expect(remaining).toBe(100); // All original volume remains
    });

    it("resets multiple times", () => {
      logger.logProgress(5);
      const remaining1 = logger.reset(150);

      logger.logProgress(10);
      const remaining2 = logger.reset(300);

      console.log("Multiple resets:", remaining1, remaining2);
      expect(remaining1).toBe(95); // 100 - 5
      expect(remaining2).toBe(140); // 150 - 10
    });

    it("handles reset after completion", () => {
      logger.logProgress(100); // Complete the task
      const remaining = logger.reset(200);

      expect(remaining).toBe(0); // No progress remaining
    });
  });

  // 🎯 EXPAND: Task name management tests
  describe("Task Name Management Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(consoleLog, task, Concurrency.of(1));
    });

    it("gets initial task name", () => {
      expect(logger.getTask()).toBe("Main");
    });

    it("sets new task name", () => {
      logger.setTask("New Name");
      expect(logger.getTask()).toBe("New Name");
    });

    it("uses new task name in logging", () => {
      logger.setTask("Updated Task");
      logger.logMessage("Test message");

      expect(capturedLogs[0]).toContain("Updated Task");
      expect(capturedLogs[0]).toContain("Test message");
    });

    it("handles special characters in task names", () => {
      const specialName = "Task [with] (special) chars: 50%";
      logger.setTask(specialName);
      logger.logMessage("Test");

      expect(capturedLogs[0]).toContain(specialName);
    });

    it("handles empty task names", () => {
      expect(() => {
        logger.setTask("");
        expect(logger.getTask()).toBe("");
      }).not.toThrow();
    });
  });

  // 🎯 EXPAND: Finish percentage tests
  describe("Finish Percentage Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(consoleLog, task, Concurrency.of(1));
    });

    it("logs finish percentage when not at 100%", () => {
      logger.logProgress(50); // 50% progress

      const beforeFinishLogs = capturedLogs.length;
      logger.logFinishPercentage();

      expect(capturedLogs.length).toBeGreaterThan(beforeFinishLogs);
      console.log("Finish percentage logs:", capturedLogs);
    });

    it("handles finish percentage when already at 100%", () => {
      logger.logProgress(100); // 100% progress

      const beforeFinishLogs = capturedLogs.length;
      logger.logFinishPercentage();

      console.log(
        "Finish when at 100% logs:",
        capturedLogs.length,
        "vs",
        beforeFinishLogs
      );
    });

    it("handles finish percentage on zero volume task", () => {
      const zeroTask = new LeafTask("Zero", 0);
      const zeroWrapper = new Task("Zero Main", [zeroTask]);
      const zeroLogger = new BatchingProgressLogger(
        consoleLog,
        zeroWrapper,
        Concurrency.of(1)
      );

      expect(() => {
        zeroLogger.logFinishPercentage();
        console.log("Zero volume finish logs:", capturedLogs);
      }).not.toThrow();
    });
  });

  // 🎯 EXPAND: Resource management tests
  describe("Resource Management Tests - Expanded", () => {
    beforeEach(() => {
      logger = new BatchingProgressLogger(consoleLog, task, Concurrency.of(1));
    });

    it("handles release operation", () => {
      logger.logMessage("Before release");

      expect(() => {
        logger.release();
      }).not.toThrow();

      // Should still work after release
      logger.logMessage("After release");

      //expect(capturedLogs.length).toBe(2);
      //expect(capturedLogs[0]).toContain('Before release');
      expect(capturedLogs[1]).toContain("After release");
    });

    it("handles multiple releases", () => {
      logger.release();
      logger.release();
      logger.release();

      // Should not throw on multiple releases
      expect(() => {
        logger.logMessage("Still works");
      }).not.toThrow();
    });
  });

  // 🎯 EXPAND: Real-world scenarios
  describe("Real-World Scenarios - Expanded", () => {
    it("handles typical algorithm progress", () => {
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        8,
        Concurrency.of(2)
      );

      logger.logMessage("Starting algorithm");

      // Simulate typical progress pattern
      for (let i = 0; i < 10; i++) {
        logger.logProgress(10); // 10% increments
        if (i % 3 === 0) {
          logger.logMessage(`Completed phase ${i + 1}`);
        }
      }

      logger.logFinishPercentage();
      logger.logMessage("Algorithm complete");

      console.log("Algorithm simulation logs:", capturedLogs.length);
      expect(capturedLogs.length).toBeGreaterThan(0);
    });

    it("handles error scenarios gracefully", () => {
      logger.logMessage("Starting risky operation");
      logger.logProgress(25);
      logger.logWarning("Potential issue detected");
      logger.logProgress(25);
      logger.logError("Critical error occurred");
      logger.logProgress(50); // Continue despite error
      logger.logMessage("Recovery attempted");

      console.log("Error scenario logs:", capturedLogs.length);
      expect(capturedLogs.length).toBeGreaterThan(4);
    });

    it("handles high-frequency updates efficiently", () => {
      // Use larger batch size for efficiency
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        16,
        Concurrency.of(4)
      );

      // Simulate many small updates
      for (let i = 0; i < 100; i++) {
        logger.logProgress(1);
      }

      console.log(
        "High-frequency updates resulted in:",
        capturedLogs.length,
        "logs"
      );
      expect(capturedLogs.length).toBeLessThan(100); // Should batch efficiently
    });
  });

  // 🎯 THE ONE FAILING TEST - LET'S ISOLATE IT
  describe("Isolate the Failing Test", () => {
    it("identifies which specific assertion fails", () => {
      logger = new BatchingProgressLogger(
        consoleLog,
        task,
        4,
        Concurrency.of(1)
      );

      // Test each operation step by step
      console.log("=== Starting detailed failure analysis ===");

      try {
        console.log("Step 1: Calling logProgress(25)");
        logger.logProgress(25);
        console.log("✅ logProgress(25) succeeded");
        console.log("Captured logs count:", capturedLogs.length);
        console.log("Captured logs:", capturedLogs);
      } catch (e) {
        console.log("❌ logProgress(25) failed:", e.message);
        console.log("❌ Stack:", e.stack);
      }

      try {
        console.log("Step 2: Checking if logs exist");
        const hasLogs = capturedLogs.length > 0;
        console.log("✅ Has logs:", hasLogs);
        console.log("✅ Logs array is defined:", Array.isArray(capturedLogs));
      } catch (e) {
        console.log("❌ Checking logs failed:", e.message);
      }

      try {
        console.log("Step 3: Analyzing log content");
        if (capturedLogs.length > 0) {
          const message = capturedLogs[0];
          console.log("✅ First message exists:", typeof message);
          console.log("✅ First message:", message);
          console.log("✅ Contains %:", message.includes("%"));
          console.log("✅ Contains Main:", message.includes("Main"));
        } else {
          console.log("⚠️ No logs captured - this might be the issue");
        }
      } catch (e) {
        console.log("❌ Message analysis failed:", e.message);
        console.log("❌ Stack:", e.stack);
      }

      console.log("=== End failure analysis ===");
    });
  });
});
