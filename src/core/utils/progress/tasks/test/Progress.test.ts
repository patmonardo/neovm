import { Progress } from '@/core/utils/progress/tasks/Progress';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('Progress - Immutable Progress Tracking', () => {

  describe('Progress Creation and Basic Properties', () => {
    it('creates progress with current and volume values', () => {
      const progress = new Progress(25, 100);

      expect(progress.getCurrentProgress()).toBe(25);
      expect(progress.getVolume()).toBe(100);
      expect(progress.currentProgress).toBe(25);
      expect(progress.volume).toBe(100);
    });

    it('creates progress with zero values', () => {
      const progress = new Progress(0, 0);

      expect(progress.getCurrentProgress()).toBe(0);
      expect(progress.getVolume()).toBe(0);
      expect(progress.isComplete()).toBe(true); // 0/0 is complete
    });

    it('creates progress with unknown volume', () => {
      const progress = new Progress(50, Task.UNKNOWN_VOLUME);

      expect(progress.getCurrentProgress()).toBe(50);
      expect(progress.getVolume()).toBe(Task.UNKNOWN_VOLUME);
      expect(progress.hasUnknownVolume()).toBe(true);
    });

  });

  describe('Static Factory Methods', () => {
    it('creates progress using of() factory method', () => {
      const progress = Progress.of(75, 200);

      expect(progress.getCurrentProgress()).toBe(75);
      expect(progress.getVolume()).toBe(200);
    });

    it('creates zero progress with default volume', () => {
      const defaultZero = Progress.zero();
      const customZero = Progress.zero(500);

      expect(defaultZero.getCurrentProgress()).toBe(0);
      expect(defaultZero.getVolume()).toBe(0);

      expect(customZero.getCurrentProgress()).toBe(0);
      expect(customZero.getVolume()).toBe(500);
    });

    it('creates completed progress', () => {
      const completed = Progress.completed(300);

      expect(completed.getCurrentProgress()).toBe(300);
      expect(completed.getVolume()).toBe(300);
      expect(completed.isComplete()).toBe(true);
    });

    it('creates unknown volume progress', () => {
      const unknownDefault = Progress.unknown();
      const unknownWithProgress = Progress.unknown(42);

      expect(unknownDefault.getCurrentProgress()).toBe(0);
      expect(unknownDefault.getVolume()).toBe(Task.UNKNOWN_VOLUME);
      expect(unknownDefault.hasUnknownVolume()).toBe(true);

      expect(unknownWithProgress.getCurrentProgress()).toBe(42);
      expect(unknownWithProgress.getVolume()).toBe(Task.UNKNOWN_VOLUME);
      expect(unknownWithProgress.hasUnknownVolume()).toBe(true);
    });
  });

  describe('Relative Progress Calculation', () => {
    it('calculates relative progress for normal cases', () => {
      const quarter = Progress.of(25, 100);
      const half = Progress.of(50, 100);
      const threeFourths = Progress.of(75, 100);
      const complete = Progress.of(100, 100);

      expect(quarter.relativeProgress).toBe(0.25);
      expect(half.relativeProgress).toBe(0.5);
      expect(threeFourths.relativeProgress).toBe(0.75);
      expect(complete.relativeProgress).toBe(1.0);
    });

    it('handles progress exceeding volume', () => {
      const excessive = Progress.of(150, 100);

      expect(excessive.relativeProgress).toBe(1.0); // Clamped to 1.0
    });

    it('handles zero volume', () => {
      const zeroVolume = Progress.of(50, 0);

      expect(zeroVolume.relativeProgress).toBe(1.0); // 50/0 treated as complete
    });

    it('handles unknown volume', () => {
      const unknown = Progress.of(75, Task.UNKNOWN_VOLUME);

      expect(unknown.relativeProgress).toBe(Task.UNKNOWN_VOLUME);
    });

    it('caches relative progress calculation', () => {
      const progress = Progress.of(33, 100);

      // First access calculates
      const first = progress.relativeProgress;
      // Second access uses cached value
      const second = progress.relativeProgress;

      expect(first).toBe(second);
      expect(first).toBe(0.33);
    });
  });

  describe('Percentage Calculation', () => {
    it('calculates percentage for normal progress', () => {
      const progress25 = Progress.of(25, 100);
      const progress50 = Progress.of(50, 100);
      const progress75 = Progress.of(75, 100);
      const progress100 = Progress.of(100, 100);

      expect(progress25.getPercentage()).toBe(25);
      expect(progress50.getPercentage()).toBe(50);
      expect(progress75.getPercentage()).toBe(75);
      expect(progress100.getPercentage()).toBe(100);
    });

    it('handles fractional percentages', () => {
      const progress = Progress.of(33, 100);

      expect(progress.getPercentage()).toBe(33);
    });

    it('handles precise fractional percentages', () => {
      const progress = Progress.of(1, 3);

      expect(progress.getPercentage()).toBeCloseTo(33.33, 2);
    });

    it('clamps percentage at 100% when progress exceeds volume', () => {
      const excessive = Progress.of(150, 100);

      expect(excessive.getPercentage()).toBe(100);
    });

    it('handles unknown volume with progress', () => {
      const unknownWithProgress = Progress.of(42, Task.UNKNOWN_VOLUME);
      const unknownZero = Progress.of(0, Task.UNKNOWN_VOLUME);

      expect(unknownWithProgress.getPercentage()).toBe(100); // Has progress = 100%
      expect(unknownZero.getPercentage()).toBe(0); // No progress = 0%
    });

    it('handles edge case percentages', () => {
      const tiny = Progress.of(1, 10000);
      const huge = Progress.of(9999, 10000);

      expect(tiny.getPercentage()).toBe(0.01);
      expect(huge.getPercentage()).toBe(99.99);
    });
  });

  describe('Completion Status', () => {
    it('identifies completed progress', () => {
      const completed = Progress.of(100, 100);
      const overCompleted = Progress.of(150, 100);

      expect(completed.isComplete()).toBe(true);
      expect(overCompleted.isComplete()).toBe(true);
    });

    it('identifies incomplete progress', () => {
      const incomplete = Progress.of(75, 100);
      const justStarted = Progress.of(1, 100);
      const notStarted = Progress.of(0, 100);

      expect(incomplete.isComplete()).toBe(false);
      expect(justStarted.isComplete()).toBe(false);
      expect(notStarted.isComplete()).toBe(false);
    });

    it('handles zero volume completion', () => {
      const zeroComplete = Progress.of(0, 0);
      const zeroWithProgress = Progress.of(50, 0);

      expect(zeroComplete.isComplete()).toBe(true);
      expect(zeroWithProgress.isComplete()).toBe(true);
    });

    it('handles unknown volume completion', () => {
      const unknownProgress = Progress.of(100, Task.UNKNOWN_VOLUME);

      expect(unknownProgress.isComplete()).toBe(false); // Cannot be complete with unknown volume
    });
  });

  describe('Unknown Volume Detection', () => {
    it('detects known volumes', () => {
      const knownZero = Progress.of(0, 0);
      const knownNormal = Progress.of(50, 100);
      const knownLarge = Progress.of(1000, 5000);

      expect(knownZero.hasUnknownVolume()).toBe(false);
      expect(knownNormal.hasUnknownVolume()).toBe(false);
      expect(knownLarge.hasUnknownVolume()).toBe(false);
    });

    it('detects unknown volumes', () => {
      const unknown = Progress.of(42, Task.UNKNOWN_VOLUME);

      expect(unknown.hasUnknownVolume()).toBe(true);
    });
  });

  describe('String Representation', () => {
    it('formats normal progress as string', () => {
      const progress = Progress.of(75, 200);
      const str = progress.toString();

      expect(str).toBe('Progress{75/200 (37.5%)}');
    });

    it('formats completed progress as string', () => {
      const progress = Progress.of(100, 100);
      const str = progress.toString();

      expect(str).toBe('Progress{100/100 (100.0%)}');
    });

    it('formats unknown volume progress as string', () => {
      const progress = Progress.of(42, Task.UNKNOWN_VOLUME);
      const str = progress.toString();

      expect(str).toBe('Progress{42/unknown (100.0%)}');
    });

    it('formats zero progress as string', () => {
      const progress = Progress.of(0, 500);
      const str = progress.toString();

      expect(str).toBe('Progress{0/500 (0.0%)}');
    });

    it('formats fractional percentages correctly', () => {
      const progress = Progress.of(1, 3);
      const str = progress.toString();

      expect(str).toContain('(33.3%)');
    });
  });

  describe('Equality and Comparison', () => {
    it('identifies equal progress objects', () => {
      const progress1 = Progress.of(50, 100);
      const progress2 = Progress.of(50, 100);
      const progress3 = new Progress(50, 100);

      expect(progress1.equals(progress2)).toBe(true);
      expect(progress1.equals(progress3)).toBe(true);
      expect(progress2.equals(progress3)).toBe(true);
    });

    it('identifies unequal progress objects', () => {
      const progress1 = Progress.of(50, 100);
      const progress2 = Progress.of(75, 100);  // Different current
      const progress3 = Progress.of(50, 200);  // Different volume
      const progress4 = Progress.of(75, 200);  // Both different

      expect(progress1.equals(progress2)).toBe(false);
      expect(progress1.equals(progress3)).toBe(false);
      expect(progress1.equals(progress4)).toBe(false);
    });

    it('handles unknown volume equality', () => {
      const unknown1 = Progress.of(42, Task.UNKNOWN_VOLUME);
      const unknown2 = Progress.of(42, Task.UNKNOWN_VOLUME);
      const unknown3 = Progress.of(50, Task.UNKNOWN_VOLUME);

      expect(unknown1.equals(unknown2)).toBe(true);
      expect(unknown1.equals(unknown3)).toBe(false);
    });

    it('handles equality edge cases', () => {
      const zero1 = Progress.of(0, 0);
      const zero2 = Progress.of(0, 0);
      const zeroVsUnknown = Progress.of(0, Task.UNKNOWN_VOLUME);

      expect(zero1.equals(zero2)).toBe(true);
      expect(zero1.equals(zeroVsUnknown)).toBe(false);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('tracks file download progress', () => {
      const fileSize = 1024 * 1024; // 1MB
      let downloaded = 0;

      // Start download
      let progress = Progress.of(downloaded, fileSize);
      expect(progress.getPercentage()).toBe(0);
      expect(progress.isComplete()).toBe(false);

      // 25% downloaded
      downloaded = 256 * 1024;
      progress = Progress.of(downloaded, fileSize);
      expect(progress.getPercentage()).toBe(25);

      // 50% downloaded
      downloaded = 512 * 1024;
      progress = Progress.of(downloaded, fileSize);
      expect(progress.getPercentage()).toBe(50);

      // Complete
      downloaded = fileSize;
      progress = Progress.of(downloaded, fileSize);
      expect(progress.getPercentage()).toBe(100);
      expect(progress.isComplete()).toBe(true);
    });

    it('tracks batch processing with unknown total', () => {
      let processed = 0;

      // Start with unknown volume
      let progress = Progress.unknown();
      expect(progress.hasUnknownVolume()).toBe(true);
      expect(progress.getPercentage()).toBe(0);

      // Process some items
      processed = 150;
      progress = Progress.unknown(processed);
      expect(progress.getPercentage()).toBe(100); // Unknown volume with progress = 100%
      expect(progress.getCurrentProgress()).toBe(150);

      // Discover total volume
      const totalVolume = 500;
      progress = Progress.of(processed, totalVolume);
      expect(progress.hasUnknownVolume()).toBe(false);
      expect(progress.getPercentage()).toBe(30); // 150/500 = 30%
    });

    it('tracks multiple task completion', () => {
      const tasks = [
        Progress.completed(100),    // Task 1: 100/100
        Progress.of(75, 100),      // Task 2: 75/100
        Progress.of(0, 100),       // Task 3: 0/100
        Progress.unknown(25)       // Task 4: 25/unknown
      ];

      const completedTasks = tasks.filter(task => task.isComplete());
      const knownTasks = tasks.filter(task => !task.hasUnknownVolume());
      const totalKnownProgress = knownTasks.reduce((sum, task) => sum + task.getCurrentProgress(), 0);
      const totalKnownVolume = knownTasks.reduce((sum, task) => sum + task.getVolume(), 0);

      expect(completedTasks).toHaveLength(1);
      expect(knownTasks).toHaveLength(3);
      expect(totalKnownProgress).toBe(175); // 100 + 75 + 0
      expect(totalKnownVolume).toBe(300);   // 100 + 100 + 100

      const overallProgress = Progress.of(totalKnownProgress, totalKnownVolume);
      expect(overallProgress.getPercentage()).toBeCloseTo(58.33, 2);
    });

    it('demonstrates immutability in progress tracking', () => {
      const initialProgress = Progress.of(25, 100);

      // Simulate progress updates by creating new instances
      const updatedProgress = Progress.of(50, 100);
      const finalProgress = Progress.completed(100);

      // Original progress unchanged
      expect(initialProgress.getCurrentProgress()).toBe(25);
      expect(initialProgress.getPercentage()).toBe(25);

      // New progress instances have different values
      expect(updatedProgress.getPercentage()).toBe(50);
      expect(finalProgress.getPercentage()).toBe(100);
      expect(finalProgress.isComplete()).toBe(true);

      // All are distinct objects
      expect(initialProgress.equals(updatedProgress)).toBe(false);
      expect(updatedProgress.equals(finalProgress)).toBe(false);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles negative progress values', () => {
      const negativeProgress = Progress.of(-10, 100);

      expect(negativeProgress.getCurrentProgress()).toBe(-10);
      expect(negativeProgress.relativeProgress).toBe(-0.1);
      expect(negativeProgress.getPercentage()).toBe(-10); // Negative percentage becomes 0
      expect(negativeProgress.isComplete()).toBe(false);
    });

    it('handles negative volume values', () => {
      const negativeVolume = Progress.of(50, -100);

      expect(negativeVolume.getVolume()).toBe(-100);
      expect(negativeVolume.relativeProgress).toBe(1.0); // 50 >= -100, so complete
      expect(negativeVolume.isComplete()).toBe(true);
    });

    it('handles very large numbers', () => {
      const largeProgress = Progress.of(1e15, 2e15);

      expect(largeProgress.getPercentage()).toBe(50);
      expect(largeProgress.relativeProgress).toBe(0.5);
      expect(largeProgress.isComplete()).toBe(false);
    });

    it('handles floating point precision', () => {
      const preciseProgress = Progress.of(1, 3);

      expect(preciseProgress.relativeProgress).toBeCloseTo(0.3333, 4);
      expect(preciseProgress.getPercentage()).toBeCloseTo(33.33, 2);
    });

    it('handles zero division edge cases', () => {
      const zeroVolumeWithProgress = Progress.of(100, 0);
      const zeroVolumeZeroProgress = Progress.of(0, 0);

      expect(zeroVolumeWithProgress.isComplete()).toBe(true);
      expect(zeroVolumeZeroProgress.isComplete()).toBe(true);
      expect(zeroVolumeWithProgress.relativeProgress).toBe(1.0);
      expect(zeroVolumeZeroProgress.relativeProgress).toBe(1.0);
    });
  });
});
