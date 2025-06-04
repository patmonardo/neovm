import { describe, it, expect } from "vitest";
import { BatchingTaskProgressTracker } from "@/core/utils/progress/BatchingTaskProgressTracker";
import { NULL_TRACKER } from "@/core/utils/progress/tasks/ProgressTracker";
import { Task } from "@/core/utils/progress/tasks/Task";
import { Concurrency } from "@/concurrency";
import { LogLevel } from "@/core/utils/progress/tasks/LogLevel";

describe("BatchingTaskProgressTracker", () => {
  describe("Factory create() method", () => {
    it("creates WithLogging for known volume", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        1000,
        Concurrency.of(2)
      );

      expect(tracker).toBeDefined();
      expect(tracker).not.toBe(NULL_TRACKER);

      // WithLogging has getBatchSize method
      const withLogging = tracker as any;
      expect(typeof withLogging.getBatchSize).toBe("function");
    });

    it("creates WithoutLogging for unknown volume", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        Task.UNKNOWN_VOLUME,
        Concurrency.of(2)
      );

      expect(tracker).toBeDefined();
      expect(tracker).not.toBe(NULL_TRACKER);

      // WithoutLogging does NOT have getBatchSize method
      const withoutLogging = tracker as any;
      expect(withoutLogging.getBatchSize).toBeUndefined();
    });

    it("handles various volume and concurrency combinations", () => {
      const testCases = [
        { volume: 1, concurrency: 1 },
        { volume: 100, concurrency: 2 },
        { volume: 10000, concurrency: 4 },
        { volume: 1000000, concurrency: 8 },
        { volume: 0, concurrency: 1 }
      ];

      testCases.forEach(({ volume, concurrency }) => {
        const tracker = BatchingTaskProgressTracker.create(
          NULL_TRACKER,
          volume,
          Concurrency.of(concurrency)
        );

        expect(tracker).toBeDefined();

        if (volume === Task.UNKNOWN_VOLUME) {
          expect((tracker as any).getBatchSize).toBeUndefined();
        } else {
          expect((tracker as any).getBatchSize()).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("WithLogging behavior", () => {
    it("has batch size and row counter", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        100,
        Concurrency.of(1)
      );
      const withLogging = tracker as any;

      expect(withLogging.getBatchSize()).toBeGreaterThan(0);
      expect(withLogging.getRowCounter()).toBe(0);
    });

    it("increments row counter until batch size reached", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        100,
        Concurrency.of(1)
      );
      const withLogging = tracker as any;
      const batchSize = withLogging.getBatchSize();

      // Fill batch minus one
      for (let i = 0; i < batchSize - 1; i++) {
        tracker.logProgress();
        expect(withLogging.getRowCounter()).toBe(i + 1);
      }

      // Last call resets counter
      tracker.logProgress();
      expect(withLogging.getRowCounter()).toBe(0);
    });

    it("handles multiple batch cycles correctly", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        1000,
        Concurrency.of(2)
      );
      const withLogging = tracker as any;
      const batchSize = withLogging.getBatchSize();

      // Complete 3 full batches
      for (let batch = 0; batch < 3; batch++) {
        for (let i = 0; i < batchSize; i++) {
          tracker.logProgress();
        }
        expect(withLogging.getRowCounter()).toBe(0);
      }

      // Partial batch
      tracker.logProgress();
      tracker.logProgress();
      expect(withLogging.getRowCounter()).toBe(2);
    });

    it("calculates power-of-2 batch sizes", () => {
      const volumes = [50, 500, 5000, 50000];
      const concurrencies = [1, 2, 4, 8];

      volumes.forEach(volume => {
        concurrencies.forEach(concurrency => {
          const tracker = BatchingTaskProgressTracker.create(
            NULL_TRACKER,
            volume,
            Concurrency.of(concurrency)
          );
          const withLogging = tracker as any;
          const batchSize = withLogging.getBatchSize();

          // Should be power of 2
          expect(Math.log2(batchSize) % 1).toBe(0);
          console.log(`Volume: ${volume}, Concurrency: ${concurrency}, Batch: ${batchSize}`);
        });
      });
    });

    it("delegates real ProgressTracker methods", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        1000,
        Concurrency.of(1)
      );

      // ONLY REAL METHODS FROM PROGRESSTRACKER INTERFACE
      expect(() => {
        tracker.logInfo("Test info");
        tracker.logWarning("Test warning");
        tracker.logDebug("Test debug");
        tracker.logMessage(LogLevel.INFO, "Test message");
        tracker.beginSubTask("Test subtask");
        tracker.endSubTask();
        tracker.setVolume(500);
        tracker.setSteps(10);
        tracker.release();
      }).not.toThrow();
    });
  });

  describe("WithoutLogging behavior", () => {
    it("ignores logProgress calls", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        Task.UNKNOWN_VOLUME,
        Concurrency.of(1)
      );

      tracker.logProgress();
      tracker.logProgress();

      expect(tracker).toBeDefined();
    });

    it("ignores high-frequency progress calls efficiently", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        Task.UNKNOWN_VOLUME,
        Concurrency.of(1)
      );

      // Should handle many calls without issues
      for (let i = 0; i < 10000; i++) {
        tracker.logProgress();
      }

      expect(tracker).toBeDefined();
    });

    it("delegates real ProgressTracker methods", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        Task.UNKNOWN_VOLUME,
        Concurrency.of(1)
      );

      // ONLY REAL METHODS FROM PROGRESSTRACKER INTERFACE
      expect(() => {
        tracker.logInfo("Unknown volume info");
        tracker.logWarning("Unknown volume warning");
        tracker.logDebug("Unknown volume debug");
        tracker.logMessage(LogLevel.WARNING, "Unknown message");
        tracker.beginSubTask();
        tracker.endSubTask();
        tracker.release();
      }).not.toThrow();
    });
  });

  describe("Performance and Real-World Scenarios", () => {
    it("demonstrates batching efficiency", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        100000,
        Concurrency.of(8)
      );
      const withLogging = tracker as any;
      const batchSize = withLogging.getBatchSize();

      let batchTriggers = 0;
      const totalCalls = 5000;

      // Count batch resets
      for (let i = 0; i < totalCalls; i++) {
        const before = withLogging.getRowCounter();
        tracker.logProgress();
        const after = withLogging.getRowCounter();

        if (after === 0 && before > 0) {
          batchTriggers++;
        }
      }

      const expectedBatches = Math.floor(totalCalls / batchSize);
      expect(batchTriggers).toBe(expectedBatches);

      console.log(`${totalCalls} calls → ${batchTriggers} batches (${Math.round((1-batchTriggers/totalCalls)*100)}% reduction)`);
    });

    it("simulates graph algorithm progress patterns", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        50000,
        Concurrency.of(4)
      );

      tracker.logInfo("Starting graph traversal");
      tracker.beginSubTask("Node processing");

      // Simulate processing nodes with status updates
      for (let i = 0; i < 1000; i++) {
        tracker.logProgress();

        if (i % 250 === 0) {
          tracker.logMessage(LogLevel.INFO, `Processed ${i} nodes`);
        }
      }

      tracker.endSubTask();
      tracker.logInfo("Graph traversal complete");

      expect(tracker).toBeDefined();
    });

    it("explores ProgressTracker API methods", () => {
      const tracker = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        1000,
        Concurrency.of(2)
      );

      // Test all available log levels
      tracker.logMessage(LogLevel.INFO, "Info message");
      tracker.logMessage(LogLevel.WARNING, "Warning message");
      tracker.logMessage(LogLevel.DEBUG, "Debug message");

      // Test task structure
      tracker.beginSubTask("Main task");
      tracker.beginSubTask("Sub task 1");
      tracker.logProgress();
      tracker.endSubTask();

      tracker.beginSubTask("Sub task 2");
      tracker.setVolume(2000);
      tracker.setSteps(100);
      tracker.logProgress();
      tracker.endSubTask();

      tracker.endSubTask();

      // Test concurrency info
      const concurrency = tracker.requestedConcurrency(Concurrency.of(2));
      expect(concurrency).toBeUndefined();

      tracker.release();
    });

    it("compares WithLogging vs WithoutLogging behavior", () => {
      const withLogging = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        10000,
        Concurrency.of(4)
      );

      const withoutLogging = BatchingTaskProgressTracker.create(
        NULL_TRACKER,
        Task.UNKNOWN_VOLUME,
        Concurrency.of(4)
      );

      // WithLogging should have internal state
      expect((withLogging as any).getBatchSize).toBeDefined();
      expect((withLogging as any).getRowCounter).toBeDefined();

      // WithoutLogging should not
      expect((withoutLogging as any).getBatchSize).toBeUndefined();
      expect((withoutLogging as any).getRowCounter).toBeUndefined();

      // Both should handle other methods
      withLogging.logInfo("With logging info");
      withoutLogging.logInfo("Without logging info");

      expect(withLogging).toBeDefined();
      expect(withoutLogging).toBeDefined();
    });

    it("tests edge cases and boundary conditions", () => {
      const edgeCases = [
        { volume: 1, concurrency: 1, description: "minimal volume" },
        { volume: 1000000, concurrency: 16, description: "large volume" },
        { volume: 0, concurrency: 1, description: "zero volume" },
        { volume: Task.UNKNOWN_VOLUME, concurrency: 1, description: "unknown volume" }
      ];

      edgeCases.forEach(({ volume, concurrency, description }) => {
        expect(() => {
          const tracker = BatchingTaskProgressTracker.create(
            NULL_TRACKER,
            volume,
            Concurrency.of(concurrency)
          );

          // Should handle basic operations
          tracker.logProgress();
          tracker.logInfo(`Testing ${description}`);
          tracker.release();

        }).not.toThrow();
      });
    });
  });
});
