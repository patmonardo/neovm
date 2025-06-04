import { describe, it, expect, beforeEach } from 'vitest';
import { Task } from '@/core/utils/progress/tasks/Task';
import { Status } from '@/core/utils/progress/tasks/Status';
import { Progress } from '@/core/utils/progress/tasks/Progress';
import { TaskVisitor } from '@/core/utils/progress/tasks/TaskVisitor';
import { MemoryRange } from '@/mem';
import { Concurrency } from '@/concurrency';

describe('Task - Core Implementation', () => {
  let task: Task;
  let subtask1: Task;
  let subtask2: Task;

  beforeEach(() => {
    subtask1 = new Task('Subtask 1');
    subtask2 = new Task('Subtask 2');
    task = new Task('Parent Task', [subtask1, subtask2]);
  });

  describe('Task Creation and Basic Properties', () => {
    it('creates task with description', () => {
      const simpleTask = new Task('Simple Task');

      expect(simpleTask.getDescription()).toBe('Simple Task');
      expect(simpleTask.getStatus()).toBe(Status.PENDING);
      expect(simpleTask.getSubTasks()).toEqual([]);
    });

    it('creates task with subtasks', () => {
      expect(task.getDescription()).toBe('Parent Task');
      expect(task.getSubTasks()).toHaveLength(2);
      expect(task.getSubTasks()).toContain(subtask1);
      expect(task.getSubTasks()).toContain(subtask2);
    });

    it('creates defensive copy of subtasks array', () => {
      const originalSubtasks = [subtask1, subtask2];
      const taskWithSubtasks = new Task('Test', originalSubtasks);

      // Modify original array
      originalSubtasks.push(new Task('Extra'));

      // Task should not be affected
      expect(taskWithSubtasks.getSubTasks()).toHaveLength(2);
    });

    it('initializes with default values', () => {
      const newTask = new Task('New Task');

      expect(newTask.getStatus()).toBe(Status.PENDING);
      expect(newTask.getStartTime()).toBe(Task.NOT_STARTED);
      expect(newTask.getFinishTime()).toBe(Task.NOT_FINISHED);
      expect(newTask.hasNotStarted()).toBe(true);
      expect(newTask.getMaxConcurrency()).toBe(Task.UNKNOWN_CONCURRENCY);
    });
  });

  describe('Status Management and Lifecycle', () => {
    it('transitions from PENDING to RUNNING', () => {
      expect(task.getStatus()).toBe(Status.PENDING);
      expect(task.isRunning()).toBe(false);

      task.start();

      expect(task.getStatus()).toBe(Status.RUNNING);
      expect(task.isRunning()).toBe(true);
      expect(task.getStartTime()).toBeGreaterThan(0);
      expect(task.hasNotStarted()).toBe(false);
    });

    it('transitions from RUNNING to FINISHED', () => {
      task.start();
      expect(task.isRunning()).toBe(true);

      task.finish();

      expect(task.getStatus()).toBe(Status.FINISHED);
      expect(task.isRunning()).toBe(false);
      expect(task.getFinishTime()).toBeGreaterThan(0);
    });

    it('handles task cancellation', () => {
      task.start();

      task.cancel();

      expect(task.getStatus()).toBe(Status.CANCELED);
    });

    it('handles task failure', () => {
      task.start();

      task.fail();

      expect(task.getStatus()).toBe(Status.FAILED);
    });

    it('prevents invalid status transitions', () => {
      // Cannot start already running task
      task.start();
      expect(() => task.start()).toThrow("cannot be started");

      // Cannot finish non-running task
      const pendingTask = new Task('Pending');
      expect(() => pendingTask.finish()).toThrow("cannot be finished");

      // Cannot cancel finished task
      task.finish();
      expect(() => task.cancel()).toThrow("cannot be canceled");
    });
  });

  describe('Subtask Navigation', () => {
    it('finds next pending subtask when running', () => {
      task.start();

      const nextTask = task.nextSubtask();

      expect(nextTask).toBe(subtask1); // First pending subtask
    });

    it('throws when getting next subtask if not running', () => {
      expect(() => task.nextSubtask()).toThrow("is not running");
    });

    it('throws when no more pending subtasks', () => {
      task.start();
      subtask1.start();
      subtask1.finish();
      subtask2.start();
      subtask2.finish();

      expect(() => task.nextSubtask()).toThrow("No more pending subtasks");
    });

    it('throws when subtask is still running', () => {
      task.start();
      subtask1.start(); // Start but don't finish

      expect(() => task.nextSubtask()).toThrow("some subtasks are still running");
    });

    it('handles subtask progression correctly', () => {
      task.start();

      // Get first subtask
      const first = task.nextSubtask();
      expect(first).toBe(subtask1);

      // Complete first subtask
      first.start();
      first.finish();

      // Get second subtask
      const second = task.nextSubtask();
      expect(second).toBe(subtask2);
    });
  });

  describe('Progress Aggregation', () => {
    it('aggregates progress from empty subtasks', () => {
      const emptyTask = new Task('Empty Task');
      const progress = emptyTask.getProgress();

      expect(progress).toBeInstanceOf(Progress);
      expect(progress.getVolume()).toBe(0);
      expect(progress.getCurrentProgress()).toBe(0);
    });

    it('aggregates progress from subtasks', () => {
      const progress = task.getProgress();

      expect(progress).toBeInstanceOf(Progress);
      // Parent task aggregates from children, but regular Tasks don't have volume
      expect(progress.getVolume()).toBe(0);
      expect(progress.getCurrentProgress()).toBe(0);
    });
  });

  describe('Leaf Task Identification', () => {
    it('identifies tasks with no subtasks as leaf tasks', () => {
      const taskWithoutSubtasks = new Task('No Subtasks');
      const taskWithSubtasks = new Task('Has Subtasks', [subtask1]);

      expect(taskWithoutSubtasks.isLeaf()).toBe(true);
      expect(taskWithSubtasks.isLeaf()).toBe(false);
    });

    it('throws when setting volume on intermediate task', () => {
      expect(() => task.setVolume(100)).toThrow("Should only be called on a leaf task");
    });

    it('throws when logging progress on intermediate task', () => {
      expect(() => task.logProgress(50)).toThrow("Should only be called on a leaf task");
    });

  });

  describe('Timing and Duration', () => {
    it('tracks start and finish times', () => {
      const beforeStart = Date.now();
      task.start();
      const afterStart = Date.now();

      expect(task.getStartTime()).toBeGreaterThanOrEqual(beforeStart);
      expect(task.getStartTime()).toBeLessThanOrEqual(afterStart);

      const beforeFinish = Date.now();
      task.finish();
      const afterFinish = Date.now();

      expect(task.getFinishTime()).toBeGreaterThanOrEqual(beforeFinish);
      expect(task.getFinishTime()).toBeLessThanOrEqual(afterFinish);
    });

    it('calculates duration correctly', () => {
      // Not started task has 0 duration
      expect(task.getDuration()).toBe(0);

      task.start();
      const runningDuration = task.getDuration();
      expect(runningDuration).toBeGreaterThanOrEqual(0);

      task.finish();
      const finalDuration = task.getDuration();
      expect(finalDuration).toBeGreaterThanOrEqual(runningDuration);
      expect(finalDuration).toBe(task.getFinishTime() - task.getStartTime());
    });
  });

  describe('Memory and Concurrency Management', () => {
    it('manages estimated memory range', () => {
      const memoryRange = MemoryRange.of(1024, 2048);

      task.setEstimatedMemoryRangeInBytes(memoryRange);

      expect(task.getEstimatedMemoryRangeInBytes()).toBe(memoryRange);
    });

    it('manages maximum concurrency', () => {
      const concurrency = Concurrency.of(4);

      task.setMaxConcurrency(concurrency);

      expect(task.getMaxConcurrency()).toBe(4);
    });

    it('propagates concurrency to subtasks', () => {
      const concurrency = Concurrency.of(8);

      task.setMaxConcurrency(concurrency);

      // Should propagate to subtasks that don't have concurrency set
      expect(subtask1.getMaxConcurrency()).toBe(8);
      expect(subtask2.getMaxConcurrency()).toBe(8);
    });

    it('does not override existing concurrency on subtasks', () => {
      const subtaskConcurrency = Concurrency.of(2);
      subtask1.setMaxConcurrency(subtaskConcurrency);

      const parentConcurrency = Concurrency.of(8);
      task.setMaxConcurrency(parentConcurrency);

      // Subtask1 should keep its original concurrency
      expect(subtask1.getMaxConcurrency()).toBe(2);
      // Subtask2 should get the parent's concurrency
      expect(subtask2.getMaxConcurrency()).toBe(8);
    });
  });

  describe('Visitor Pattern', () => {
    it('accepts visitor for traversal', () => {
      let visitedTask: Task | null = null;

      const visitor: TaskVisitor = {
        visitIntermediateTask: (visitedTaskParam: Task) => {
          visitedTask = visitedTaskParam;
        }
      };

      task.visit(visitor);

      expect(visitedTask).toBe(task);
    });

    it('handles visitor without visitIntermediateTask method', () => {
      const visitor: TaskVisitor = {};

      // Should not throw
      expect(() => task.visit(visitor)).not.toThrow();
    });
  });

  describe('Task Rendering', () => {
    it('renders task hierarchy as string', () => {
      const rendered = task.render();

      expect(rendered).toContain('Parent Task');
      expect(rendered).toContain('Subtask 1');
      expect(rendered).toContain('Subtask 2');
      expect(rendered).toContain('PENDING'); // Default status
    });

    it('renders with proper hierarchy indentation', () => {
      const rendered = task.render();

      // Should have tree structure with |-- for subtasks
      expect(rendered).toContain('|-- Subtask 1');
      expect(rendered).toContain('|-- Subtask 2');
    });

    it('shows current status in rendering', () => {
      task.start();
      const rendered = task.render();

      expect(rendered).toContain('RUNNING');
    });

    it('handles nested task hierarchies', () => {
      const grandchild = new Task('Grandchild');
      const child = new Task('Child', [grandchild]);
      const parent = new Task('Parent', [child]);

      const rendered = parent.render();

      expect(rendered).toContain('Parent');
      expect(rendered).toContain('Child');
      expect(rendered).toContain('Grandchild');
    });
  });

  describe('Real Usage Scenarios', () => {
    it('simulates complete task workflow', () => {
      // Start parent task
      task.start();
      expect(task.isRunning()).toBe(true);

      // Execute first subtask
      const first = task.nextSubtask();
      first.start();
      first.finish();

      // Execute second subtask
      const second = task.nextSubtask();
      second.start();
      second.finish();

      // Complete parent task
      task.finish();
      expect(task.getStatus()).toBe(Status.FINISHED);
    });

    it('handles task failure scenario', () => {
      task.start();

      const first = task.nextSubtask();
      first.start();
      first.fail();

      // Parent can still continue or be failed
      task.fail();
      expect(task.getStatus()).toBe(Status.FAILED);
      expect(first.getStatus()).toBe(Status.FAILED);
    });

    it('demonstrates memory and concurrency configuration', () => {
      const dataProcessingTask = new Task('Process Large Dataset');
      const memoryRange = MemoryRange.of(1024 * 1024 * 100, 1024 * 1024 * 500); // 100MB-500MB
      const concurrency = Concurrency.of(4);

      dataProcessingTask.setEstimatedMemoryRangeInBytes(memoryRange);
      dataProcessingTask.setMaxConcurrency(concurrency);

      expect(dataProcessingTask.getMaxConcurrency()).toBe(4);
    });
  });

  describe('Constants and Edge Cases', () => {
    it('has correct constant values', () => {
      expect(Task.UNKNOWN_VOLUME).toBe(-1);
      expect(Task.UNKNOWN_CONCURRENCY).toBe(-1);
      expect(Task.NOT_STARTED).toBe(-1);
      expect(Task.NOT_FINISHED).toBe(-1);
    });

    it('handles empty subtasks array correctly', () => {
      const emptyTask = new Task('Empty Task', []);

      expect(emptyTask.getSubTasks()).toEqual([]);
      expect(emptyTask.isLeaf()).toBe(true);
    });

    it('handles task with no subtasks provided', () => {
      const simpleTask = new Task('Simple');

      expect(simpleTask.getSubTasks()).toEqual([]);
      expect(simpleTask.isLeaf()).toBe(true);
    });
  });
});
