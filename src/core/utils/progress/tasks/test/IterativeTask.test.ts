import { IterativeTask, IterativeTaskMode } from '@/core/utils/progress/tasks/IterativeTask';
import { Task } from '@/core/utils/progress/tasks/Task';
import { LeafTask } from '@/core/utils/progress/tasks/LeafTask';
import { Status } from '@/core/utils/progress/tasks/Status';
import { TaskVisitor } from '@/core/utils/progress/tasks/TaskVisitor';

describe('IterativeTask - Complex Iteration Patterns', () => {
  let taskSupplier: () => Task[];
  let initialTasks: Task[];

  beforeEach(() => {
    // Supplier that creates 2 tasks per iteration
    taskSupplier = () => [
      new LeafTask('Process Batch', 100),
      new LeafTask('Validate Results', 50)
    ];

    // Pre-create tasks for 3 iterations (6 tasks total)
    initialTasks = [
      ...taskSupplier(), // Iteration 0
      ...taskSupplier(), // Iteration 1
      ...taskSupplier()  // Iteration 2
    ];
  });

  describe('IterativeTask Creation and Basic Properties', () => {
    it('creates FIXED mode iterative task', () => {
      const fixedTask = new IterativeTask(
        'Fixed Processing Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      expect(fixedTask.getDescription()).toBe('Fixed Processing Task');
      expect(fixedTask.getMode()).toBe(IterativeTaskMode.FIXED);
      expect(fixedTask.getSubTasks()).toHaveLength(6);
      expect(fixedTask.getMaxIterations()).toBe(3);
      expect(fixedTask.getTasksPerIteration()).toBe(2);
    });

    it('creates DYNAMIC mode iterative task', () => {
      const dynamicTask = new IterativeTask(
        'Dynamic Processing Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.DYNAMIC
      );

      expect(dynamicTask.getMode()).toBe(IterativeTaskMode.DYNAMIC);
      expect(dynamicTask.getMaxIterations()).toBe(3);
      expect(dynamicTask.canAddMoreIterations()).toBe(false); // Not OPEN mode
    });

    it('creates OPEN mode iterative task', () => {
      const openTask = new IterativeTask(
        'Open Processing Task',
        initialTasks.slice(0, 2), // Start with just one iteration
        taskSupplier,
        IterativeTaskMode.OPEN
      );

      expect(openTask.getMode()).toBe(IterativeTaskMode.OPEN);
      expect(openTask.getMaxIterations()).toBe(1);
      expect(openTask.canAddMoreIterations()).toBe(true); // Can add more
    });

    it('calculates iterations correctly', () => {
      const task = new IterativeTask(
        'Test Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      expect(task.getCurrentIteration()).toBe(0); // No completed iterations yet
      expect(task.getIterationSummary()).toEqual({
        currentIteration: 0,
        maxIterations: 3,
        mode: IterativeTaskMode.FIXED,
        tasksPerIteration: 2,
        totalTasks: 6,
        completedTasks: 0
      });
    });
  });

  describe('FIXED Mode Behavior', () => {
    let fixedTask: IterativeTask;

    beforeEach(() => {
      fixedTask = new IterativeTask(
        'Fixed Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );
    });

    it('executes all subtasks in order', () => {
      fixedTask.start();

      // Execute first iteration (2 tasks)
      const task1 = fixedTask.nextSubtask();
      task1.start();
      task1.finish();

      const task2 = fixedTask.nextSubtask();
      task2.start();
      task2.finish();

      expect(fixedTask.getCurrentIteration()).toBe(1);

      // Execute second iteration
      const task3 = fixedTask.nextSubtask();
      task3.start();
      task3.finish();

      const task4 = fixedTask.nextSubtask();
      task4.start();
      task4.finish();

      expect(fixedTask.getCurrentIteration()).toBe(2);
    });

    it('prevents adding more iterations in FIXED mode', () => {
      expect(fixedTask.canAddMoreIterations()).toBe(false);
      expect(() => fixedTask.addIteration()).toThrow('Cannot add more iterations');
    });

    it('finishes after all iterations complete', () => {
      fixedTask.start();

      // Complete all 6 tasks
      fixedTask.getSubTasks().forEach(task => {
        task.start();
        task.finish();
      });

      expect(fixedTask.getCurrentIteration()).toBe(3);

      // Finishing should not affect completed tasks
      fixedTask.finish();
      expect(fixedTask.getStatus()).toBe(Status.FINISHED);
    });

    it('cancels pending tasks when finished early', () => {
      fixedTask.start();

      // Complete only first 2 tasks
      const task1 = fixedTask.nextSubtask();
      task1.start();
      task1.finish();

      const task2 = fixedTask.nextSubtask();
      task2.start();
      task2.finish();

      // Finish early
      fixedTask.finish();

      // Remaining tasks should be canceled
      const remainingTasks = fixedTask.getSubTasks().slice(2);
      remainingTasks.forEach(task => {
        expect(task.getStatus()).toBe(Status.CANCELED);
      });
    });
  });

  describe('DYNAMIC Mode Behavior', () => {
    let dynamicTask: IterativeTask;

    beforeEach(() => {
      dynamicTask = new IterativeTask(
        'Dynamic Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.DYNAMIC
      );
    });

    it('can terminate early before all iterations', () => {
      dynamicTask.start();

      // Complete only first iteration
      const task1 = dynamicTask.nextSubtask();
      task1.start();
      task1.finish();

      const task2 = dynamicTask.nextSubtask();
      task2.start();
      task2.finish();

      expect(dynamicTask.getCurrentIteration()).toBe(1);

      // Can finish early in DYNAMIC mode
      dynamicTask.finish();
      expect(dynamicTask.getStatus()).toBe(Status.FINISHED);

      // Check that remaining tasks are canceled
      const remainingTasks = dynamicTask.getSubTasks().slice(2);
      remainingTasks.forEach(task => {
        expect(task.getStatus()).toBe(Status.CANCELED);
      });
    });

    it('can complete all iterations like FIXED mode', () => {
      dynamicTask.start();

      // Complete all iterations
      dynamicTask.getSubTasks().forEach(task => {
        task.start();
        task.finish();
      });

      expect(dynamicTask.getCurrentIteration()).toBe(3);
      dynamicTask.finish();
      expect(dynamicTask.getStatus()).toBe(Status.FINISHED);
    });

    it('prevents adding iterations in DYNAMIC mode', () => {
      expect(dynamicTask.canAddMoreIterations()).toBe(false);
      expect(() => dynamicTask.addIteration()).toThrow('Cannot add more iterations');
    });
  });

  describe('OPEN Mode Behavior', () => {
    let openTask: IterativeTask;

    beforeEach(() => {
      // Start with just one iteration
      openTask = new IterativeTask(
        'Open Task',
        taskSupplier(), // Only first iteration
        taskSupplier,
        IterativeTaskMode.OPEN
      );
    });

    it('allows adding new iterations dynamically', () => {
      openTask.start();

      expect(openTask.getSubTasks()).toHaveLength(2);
      expect(openTask.canAddMoreIterations()).toBe(true);

      // Add another iteration
      const newTasks = openTask.addIteration();
      expect(newTasks).toHaveLength(2);
      expect(openTask.getSubTasks()).toHaveLength(4);
    });

    it('creates new tasks when no pending subtasks remain', () => {
      openTask.start();

      // Complete first iteration
      const task1 = openTask.nextSubtask();
      task1.start();
      task1.finish();

      const task2 = openTask.nextSubtask();
      task2.start();
      task2.finish();

      expect(openTask.getCurrentIteration()).toBe(1);

      // Should create new iteration automatically
      const nextTask = openTask.nextSubtask();
      expect(nextTask).toBeDefined();
      expect(openTask.getSubTasks()).toHaveLength(4); // New iteration added
    });

    it('shows unknown volume for progress when not finished', () => {
      openTask.start();

      const progress = openTask.getProgress();
      expect(progress.getVolume()).toBe(Task.UNKNOWN_VOLUME);
    });

    it('shows actual volume when finished', () => {
      openTask.start();

      // Complete first iteration
      openTask.getSubTasks().forEach(task => {
        task.start();
        task.finish();
      });

      openTask.finish();

      const progress = openTask.getProgress();
      expect(progress.getVolume()).not.toBe(Task.UNKNOWN_VOLUME);
    });

    it('prevents adding iterations after finished', () => {
      openTask.start();
      openTask.finish();

      expect(openTask.canAddMoreIterations()).toBe(false);
      expect(() => openTask.addIteration()).toThrow('Cannot add more iterations');
    });
  });

  describe('Progress Tracking Across Iterations', () => {
    it('aggregates progress from all subtasks', () => {
      const task = new IterativeTask(
        'Progress Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      task.start();

      // Complete first iteration
      const task1 = task.nextSubtask() as LeafTask;
      task1.start();
      task1.setVolume(100);
      task1.logProgress(100);
      task1.finish();

      const task2 = task.nextSubtask() as LeafTask;
      task2.start();
      task2.setVolume(50);
      task2.logProgress(50);
      task2.finish();

      expect(task.getCurrentIteration()).toBe(1);

      const summary = task.getIterationSummary();
      expect(summary.completedTasks).toBe(2);
      expect(summary.currentIteration).toBe(1);
    });

    it('tracks progress in OPEN mode with unknown volume', () => {
      const openTask = new IterativeTask(
        'Open Progress Task',
        taskSupplier(),
        taskSupplier,
        IterativeTaskMode.OPEN
      );

      openTask.start();

      // Complete first iteration
      openTask.getSubTasks().forEach(task => {
        task.start();
        task.finish();
      });

      // Add and complete second iteration
      openTask.addIteration();
      const newTasks = openTask.getSubTasks().slice(2);
      newTasks.forEach(task => {
        task.start();
        task.finish();
      });

      expect(openTask.getCurrentIteration()).toBe(2);

      const summary = openTask.getIterationSummary();
      expect(summary.completedTasks).toBe(4);
      expect(summary.totalTasks).toBe(4);
    });
  });

  describe('Error Handling and Validation', () => {
    let task: IterativeTask;

    beforeEach(() => {
      task = new IterativeTask(
        'Test Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );
    });

    it('prevents getting next subtask when one is still running', () => {
      task.start();

      const task1 = task.nextSubtask();
      task1.start(); // Start but don't finish

      expect(() => task.nextSubtask()).toThrow('still running');
    });

    it('throws when no more pending subtasks in FIXED/DYNAMIC mode', () => {
      task.start();

      // Complete all tasks
      task.getSubTasks().forEach(subtask => {
        subtask.start();
        subtask.finish();
      });

      expect(() => task.nextSubtask()).toThrow('No more pending subtasks');
    });

    it('handles task failure within iterations', () => {
      task.start();

      const task1 = task.nextSubtask();
      task1.start();
      task1.fail();

      expect(task1.getStatus()).toBe(Status.FAILED);

      // Should still be able to get next task
      const task2 = task.nextSubtask();
      expect(task2).toBeDefined();
    });
  });

  describe('Visitor Pattern Integration', () => {
    it('accepts visitor with visitIterativeTask method', () => {
      let visitedTask: IterativeTask | null = null;

      const visitor: TaskVisitor = {
        visitIterativeTask: (task: IterativeTask) => {
          visitedTask = task;
        }
      };

      const task = new IterativeTask(
        'Test Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      task.visit(visitor);

      expect(visitedTask).toBe(task);
    });

    it('handles visitor without visitIterativeTask method', () => {
      const visitor: TaskVisitor = {};

      const task = new IterativeTask(
        'Test Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      expect(() => task.visit(visitor)).not.toThrow();
    });
  });

  describe('Real World Scenarios', () => {
    it('simulates batch processing with FIXED iterations', () => {
      const batchProcessor = new IterativeTask(
        'Process 3 Data Batches',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      batchProcessor.start();

      // Process each batch (iteration)
      for (let iteration = 0; iteration < 3; iteration++) {
        // Process batch
        const processTask = batchProcessor.nextSubtask() as LeafTask;
        processTask.start();
        processTask.setVolume(1000);
        processTask.logProgress(1000);
        processTask.finish();

        // Validate batch
        const validateTask = batchProcessor.nextSubtask() as LeafTask;
        validateTask.start();
        validateTask.setVolume(100);
        validateTask.logProgress(100);
        validateTask.finish();

        expect(batchProcessor.getCurrentIteration()).toBe(iteration + 1);
      }

      batchProcessor.finish();
      expect(batchProcessor.getStatus()).toBe(Status.FINISHED);

      const summary = batchProcessor.getIterationSummary();
      expect(summary.currentIteration).toBe(3);
      expect(summary.completedTasks).toBe(6);
    });

    it('simulates stream processing with OPEN iterations', () => {
      const streamProcessor = new IterativeTask(
        'Process Data Stream',
        taskSupplier(),
        taskSupplier,
        IterativeTaskMode.OPEN
      );

      streamProcessor.start();

      // Process unknown number of chunks
      let processedChunks = 0;
      const maxChunks = 5;

      while (processedChunks < maxChunks) {
        // Process chunk
        const processTask = streamProcessor.nextSubtask() as LeafTask;
        processTask.start();
        processTask.finish();

        // Validate chunk
        const validateTask = streamProcessor.nextSubtask() as LeafTask;
        validateTask.start();
        validateTask.finish();

        processedChunks++;

        // More data might arrive, so we might add more iterations
        if (processedChunks < maxChunks && Math.random() > 0.3) {
          streamProcessor.addIteration();
        }
      }

      streamProcessor.finish();

      const summary = streamProcessor.getIterationSummary();
      expect(summary.currentIteration).toBeGreaterThanOrEqual(maxChunks);
      expect(summary.mode).toBe(IterativeTaskMode.OPEN);
    });

    it('simulates early termination with DYNAMIC mode', () => {
      const dynamicProcessor = new IterativeTask(
        'Process Until Condition Met',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.DYNAMIC
      );

      dynamicProcessor.start();

      // Process first iteration
      const task1 = dynamicProcessor.nextSubtask();
      task1.start();
      task1.finish();

      const task2 = dynamicProcessor.nextSubtask();
      task2.start();
      task2.finish();

      // Simulate condition met - terminate early
      expect(dynamicProcessor.getCurrentIteration()).toBe(1);

      dynamicProcessor.finish();
      expect(dynamicProcessor.getStatus()).toBe(Status.FINISHED);

      // Remaining tasks should be canceled
      const summary = dynamicProcessor.getIterationSummary();
      expect(summary.completedTasks).toBe(2);
      expect(summary.totalTasks).toBe(6); // Still had all original tasks
    });

    it('handles mixed success and failure across iterations', () => {
      const resilientProcessor = new IterativeTask(
        'Resilient Processing',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.DYNAMIC
      );

      resilientProcessor.start();

      // First iteration - success
      let task = resilientProcessor.nextSubtask();
      task.start();
      task.finish();

      task = resilientProcessor.nextSubtask();
      task.start();
      task.finish();

      // Second iteration - partial failure
      task = resilientProcessor.nextSubtask();
      task.start();
      task.fail();

      task = resilientProcessor.nextSubtask();
      task.start();
      task.finish();

      const summary = resilientProcessor.getIterationSummary();
      expect(summary.completedTasks).toBe(3); // 3 finished, 1 failed
      expect(summary.currentIteration).toBe(2);

      // Can still continue or terminate
      resilientProcessor.finish();
    });
  });

  describe('Iteration Summary and Monitoring', () => {
    it('provides comprehensive iteration summary', () => {
      const task = new IterativeTask(
        'Monitored Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      task.start();

      // Complete first iteration
      task.getSubTasks().slice(0, 2).forEach(subtask => {
        subtask.start();
        subtask.finish();
      });

      const summary = task.getIterationSummary();

      expect(summary).toEqual({
        currentIteration: 1,
        maxIterations: 3,
        mode: IterativeTaskMode.FIXED,
        tasksPerIteration: 2,
        totalTasks: 6,
        completedTasks: 2
      });
    });

    it('tracks progress percentage across iterations', () => {
      const task = new IterativeTask(
        'Progress Tracking Task',
        initialTasks,
        taskSupplier,
        IterativeTaskMode.FIXED
      );

      task.start();

      // Complete 1/3 of iterations
      task.getSubTasks().slice(0, 2).forEach(subtask => {
        subtask.start();
        subtask.finish();
      });

      const progress = task.getProgress();
      // Should reflect completion of 2 out of 6 tasks (33%)
      expect(progress.getPercentage()).toBeCloseTo(33.33, 1);
    });
  });
});
