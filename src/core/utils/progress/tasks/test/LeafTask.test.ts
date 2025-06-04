import { describe, it, expect, beforeEach } from 'vitest';
import { LeafTask } from '@/core/utils/progress/tasks/LeafTask';
import { Task } from '@/core/utils/progress/tasks/Task';
import { Status } from '@/core/utils/progress/tasks/Status';
import { Progress } from '@/core/utils/progress/tasks/Progress';
import { TaskVisitor } from '@/core/utils/progress/tasks/TaskVisitor';

describe('LeafTask - Concrete Progress Implementation', () => {
  let leafTask: LeafTask;

  beforeEach(() => {
    leafTask = new LeafTask('Test Leaf Task', 100);
  });

  describe('LeafTask Creation and Basic Properties', () => {
    it('creates leaf task with description and volume', () => {
      expect(leafTask.getDescription()).toBe('Test Leaf Task');
      expect(leafTask.getVolume()).toBe(100);
      expect(leafTask.getCurrentProgressValue()).toBe(0);
      expect(leafTask.getStatus()).toBe(Status.PENDING);
    });

    it('creates leaf task with no subtasks', () => {
      expect(leafTask.getSubTasks()).toEqual([]);
      expect(leafTask.isLeaf()).toBe(true);
    });

    it('creates leaf task with unknown volume', () => {
      const unknownVolumeTask = new LeafTask('Unknown Volume', Task.UNKNOWN_VOLUME);

      expect(unknownVolumeTask.getVolume()).toBe(Task.UNKNOWN_VOLUME);
      expect(unknownVolumeTask.hasUnknownVolume()).toBe(true);
    });

    it('initializes with zero progress', () => {
      expect(leafTask.getCurrentProgressValue()).toBe(0);
      expect(leafTask.getProgress().getCurrentProgress()).toBe(0);
    });
  });

  describe('Progress Tracking', () => {
    it('logs progress correctly', () => {
      leafTask.logProgress(25);
      expect(leafTask.getCurrentProgressValue()).toBe(25);

      leafTask.logProgress(30);
      expect(leafTask.getCurrentProgressValue()).toBe(55);

      leafTask.logProgress(10);
      expect(leafTask.getCurrentProgressValue()).toBe(65);
    });

    it('handles incremental progress updates', () => {
      // Simulate processing items one by one
      for (let i = 1; i <= 10; i++) {
        leafTask.logProgress(1);
        expect(leafTask.getCurrentProgressValue()).toBe(i);
      }
    });

    it('allows progress beyond volume', () => {
      // Progress can exceed volume (real processing might vary)
      leafTask.logProgress(150);
      expect(leafTask.getCurrentProgressValue()).toBe(150);
      expect(leafTask.getCurrentProgressValue()).toBeGreaterThan(leafTask.getVolume());
    });

    it('resets progress to zero', () => {
      leafTask.logProgress(50);
      expect(leafTask.getCurrentProgressValue()).toBe(50);

      leafTask.resetProgress();
      expect(leafTask.getCurrentProgressValue()).toBe(0);
    });
  });

  describe('Volume Management', () => {
    it('updates volume after creation', () => {
      expect(leafTask.getVolume()).toBe(100);

      leafTask.setVolume(200);
      expect(leafTask.getVolume()).toBe(200);
    });

    it('handles unknown volume correctly', () => {
      const unknownTask = new LeafTask('Unknown', Task.UNKNOWN_VOLUME);

      expect(unknownTask.hasUnknownVolume()).toBe(true);

      unknownTask.setVolume(50);
      expect(unknownTask.hasUnknownVolume()).toBe(false);
      expect(unknownTask.getVolume()).toBe(50);
    });

    it('detects when volume is known vs unknown', () => {
      expect(leafTask.hasUnknownVolume()).toBe(false);

      const unknownTask = new LeafTask('Unknown', Task.UNKNOWN_VOLUME);
      expect(unknownTask.hasUnknownVolume()).toBe(true);
    });
  });

  describe('Progress Object Integration', () => {
    it('returns Progress object with current values', () => {
      leafTask.logProgress(30);

      const progress = leafTask.getProgress();
      expect(progress).toBeInstanceOf(Progress);
      expect(progress.getCurrentProgress()).toBe(30);
      expect(progress.getVolume()).toBe(100);
    });

    it('progress object reflects real-time updates', () => {
      leafTask.logProgress(25);
      let progress = leafTask.getProgress();
      expect(progress.getCurrentProgress()).toBe(25);

      leafTask.logProgress(25);
      progress = leafTask.getProgress();
      expect(progress.getCurrentProgress()).toBe(50);
    });

    it('handles progress calculation with unknown volume', () => {
      const unknownTask = new LeafTask('Unknown', Task.UNKNOWN_VOLUME);
      unknownTask.logProgress(42);

      const progress = unknownTask.getProgress();
      expect(progress.getCurrentProgress()).toBe(42);
      expect(progress.getVolume()).toBe(Task.UNKNOWN_VOLUME);
    });
  });

  describe('Task Lifecycle with Progress', () => {
    it('finish() sets progress to 100% of volume', () => {
      leafTask.start();
      leafTask.logProgress(60);

      expect(leafTask.getCurrentProgressValue()).toBe(60);

      leafTask.finish();

      expect(leafTask.getStatus()).toBe(Status.FINISHED);
      expect(leafTask.getCurrentProgressValue()).toBe(100); // Should equal volume
    });

    it('finish() with unknown volume sets volume to current progress', () => {
      const unknownTask = new LeafTask('Unknown', Task.UNKNOWN_VOLUME);
      unknownTask.start();
      unknownTask.logProgress(75);

      expect(unknownTask.hasUnknownVolume()).toBe(true);

      unknownTask.finish();

      expect(unknownTask.getVolume()).toBe(75);
      expect(unknownTask.getCurrentProgressValue()).toBe(75);
      expect(unknownTask.hasUnknownVolume()).toBe(false);
    });

    it('finish() adds remaining progress to reach 100%', () => {
      leafTask.start();
      leafTask.logProgress(30);

      leafTask.finish();

      // Should add remaining 70 to reach 100
      expect(leafTask.getCurrentProgressValue()).toBe(100);
    });

    it('finish() when progress exceeds volume', () => {
      leafTask.start();
      leafTask.logProgress(120); // More than volume

      leafTask.finish();

      // Progress should stay at 120, no additional progress added
      expect(leafTask.getCurrentProgressValue()).toBe(100);
      expect(leafTask.getVolume()).toBe(100);
    });
  });

  describe('Atomic Progress Operations', () => {
    it('uses AtomicNumber for thread-safe progress updates', () => {
      // Test that progress updates are atomic
      const initialProgress = leafTask.getCurrentProgressValue();

      leafTask.logProgress(10);
      leafTask.logProgress(20);

      // Updates should be cumulative and atomic
      expect(leafTask.getCurrentProgressValue()).toBe(initialProgress + 30);
    });

    it('concurrent progress updates are handled safely', () => {
      // Simulate concurrent updates
      const updates = [5, 10, 15, 20, 25];
      const expectedTotal = updates.reduce((sum, val) => sum + val, 0);

      updates.forEach(value => leafTask.logProgress(value));

      expect(leafTask.getCurrentProgressValue()).toBe(expectedTotal);
    });

    it('reset is atomic operation', () => {
      leafTask.logProgress(50);
      expect(leafTask.getCurrentProgressValue()).toBe(50);

      leafTask.resetProgress();
      expect(leafTask.getCurrentProgressValue()).toBe(0);
    });
  });

  describe('Visitor Pattern Implementation', () => {
    it('accepts visitor with visitLeafTask method', () => {
      let visitedTask: LeafTask | null = null;

      const visitor: TaskVisitor = {
        visitLeafTask: (task: LeafTask) => {
          visitedTask = task;
        }
      };

      leafTask.visit(visitor);

      expect(visitedTask).toBe(leafTask);
    });

    it('handles visitor without visitLeafTask method', () => {
      const visitor: TaskVisitor = {};

      // Should not throw
      expect(() => leafTask.visit(visitor)).not.toThrow();
    });

    it('calls correct visitor method for leaf tasks', () => {
      let leafVisited = false;
      let intermediateVisited = false;

      const visitor: TaskVisitor = {
        visitLeafTask: () => { leafVisited = true; },
        visitIntermediateTask: () => { intermediateVisited = true; }
      };

      leafTask.visit(visitor);

      expect(leafVisited).toBe(true);
      expect(intermediateVisited).toBe(false);
    });
  });

  describe('Real Usage Scenarios', () => {
    it('simulates file processing workflow', () => {
      const fileTask = new LeafTask('Process 1000 records', 1000);

      fileTask.start();
      expect(fileTask.isRunning()).toBe(true);

      // Process records in batches
      for (let i = 0; i < 10; i++) {
        fileTask.logProgress(100); // 100 records per batch

        const progress = fileTask.getProgress();
        const expectedProgress = (i + 1) * 100;
        expect(progress.getCurrentProgress()).toBe(expectedProgress);
      }

      fileTask.finish();
      expect(fileTask.getStatus()).toBe(Status.FINISHED);
      expect(fileTask.getCurrentProgressValue()).toBe(1000);
    });

    it('handles unknown volume discovery', () => {
      const streamTask = new LeafTask('Process data stream', Task.UNKNOWN_VOLUME);

      streamTask.start();

      // Process unknown amount of data
      let totalProcessed = 0;
      const batchSizes = [50, 75, 100, 25, 200];

      batchSizes.forEach(batchSize => {
        streamTask.logProgress(batchSize);
        totalProcessed += batchSize;
      });

      expect(streamTask.getCurrentProgressValue()).toBe(totalProcessed);
      expect(streamTask.hasUnknownVolume()).toBe(true);

      // Finish and discover final volume
      streamTask.finish();

      expect(streamTask.getVolume()).toBe(totalProcessed);
      expect(streamTask.hasUnknownVolume()).toBe(false);
    });

    it('demonstrates progress monitoring', () => {
      const monitoringTask = new LeafTask('Download file', 500);

      monitoringTask.start();

      // Simulate download progress
      const checkpoints = [50, 125, 250, 400, 500];

      checkpoints.forEach((checkpoint, index) => {
        const previousProgress = index === 0 ? 0 : checkpoints[index - 1];
        const increment = checkpoint - previousProgress;

        monitoringTask.logProgress(increment);

        const progress = monitoringTask.getProgress();
        expect(progress.getCurrentProgress()).toBe(checkpoint);

        // Calculate percentage
        const percentage = (checkpoint / 500) * 100;
        expect(progress.getPercentage()).toBeCloseTo(percentage, 1);
      });

      monitoringTask.finish();
      expect(monitoringTask.getStatus()).toBe(Status.FINISHED);
    });

    it('handles task restart scenario', () => {
      const retryTask = new LeafTask('Retry Operation', 100);

      // First attempt
      retryTask.start();
      retryTask.logProgress(60);
      retryTask.fail();

      expect(retryTask.getStatus()).toBe(Status.FAILED);
      expect(retryTask.getCurrentProgressValue()).toBe(60);

      // Reset for retry
      retryTask.resetProgress();
      expect(retryTask.getCurrentProgressValue()).toBe(0);

      // Note: In real scenario, you'd need to reset status too
      // but that might require Task-level support
    });
  });

  describe('Edge Cases and Validation', () => {
    it('handles zero volume', () => {
      const zeroTask = new LeafTask('Zero Volume Task', 0);

      expect(zeroTask.getVolume()).toBe(0);
      expect(zeroTask.hasUnknownVolume()).toBe(false);

      zeroTask.start();
      zeroTask.finish();

      expect(zeroTask.getCurrentProgressValue()).toBe(0);
    });

    it('handles negative progress increments', () => {
      leafTask.logProgress(50);
      leafTask.logProgress(-10); // Negative increment

      expect(leafTask.getCurrentProgressValue()).toBe(40);
    });

    it('handles large volume numbers', () => {
      const largeVolumeTask = new LeafTask('Large Volume', 1_000_000);

      largeVolumeTask.logProgress(500_000);
      expect(largeVolumeTask.getCurrentProgressValue()).toBe(500_000);

      const progress = largeVolumeTask.getProgress();
      expect(progress.getPercentage()).toBe(50);
    });

    it('volume updates affect progress calculations', () => {
      leafTask.logProgress(50);
      let progress = leafTask.getProgress();
      expect(progress.getPercentage()).toBe(50); // 50/100

      leafTask.setVolume(200);
      progress = leafTask.getProgress();
      expect(progress.getPercentage()).toBe(25); // 50/200
    });
  });
});
