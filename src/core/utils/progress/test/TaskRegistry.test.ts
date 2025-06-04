import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRegistry } from '@/core/utils/progress/TaskRegistry';
import { TaskStore } from '@/core/utils/progress/TaskStore';
import { EmptyTaskStore } from '@/core/utils/progress/EmptyTaskStore';
import { PerDatabaseTaskStore } from '@/core/utils/progress/PerDatabaseTaskStore';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('TaskRegistry - Core Registry Pattern', () => {
  let taskStore: TaskStore;

  beforeEach(() => {
    taskStore = new PerDatabaseTaskStore();
  });

  describe('Construction Patterns', () => {
    it('creates registry with auto-generated JobId', () => {
      const registry = new TaskRegistry('user1', taskStore);

      expect(registry.getUsername()).toBe('user1');
      expect(registry.getTaskStore()).toBe(taskStore);
      expect(registry.getJobId()).toBeDefined();
      expect(registry.hasTask()).toBe(false);
    });

    it('creates registry with specific JobId', () => {
      const jobId = new JobId('specific-job');
      const registry = new TaskRegistry('user2', taskStore, jobId);

      expect(registry.getUsername()).toBe('user2');
      expect(registry.getJobId()).toBe(jobId);
    });

    it('copy constructor for testing', () => {
      const original = new TaskRegistry('original-user', taskStore, new JobId('original-job'));
      const copy = new TaskRegistry(original);

      expect(copy.getUsername()).toBe(original.getUsername());
      expect(copy.getJobId()).toBe(original.getJobId());
      expect(copy.getTaskStore()).toBe(original.getTaskStore());
    });
  });

  describe('Task Lifecycle Management', () => {
    it('registers and unregisters tasks', () => {
      const registry = new TaskRegistry('lifecycle-user', taskStore);
      const task = new Task('lifecycle-task');

      expect(registry.hasTask()).toBe(false);
      expect(registry.getCurrentTask()).toBeNull();

      registry.registerTask(task);
      expect(registry.hasTask()).toBe(true);
      expect(registry.getCurrentTask()).toBe(task);

      registry.unregisterTask();
      expect(registry.hasTask()).toBe(false);
      expect(registry.getCurrentTask()).toBeNull();
    });

    it('task replacement overwrites previous task', () => {
      const registry = new TaskRegistry('replace-user', taskStore);
      const task1 = new Task('first-task');
      const task2 = new Task('second-task');

      registry.registerTask(task1);
      expect(registry.getCurrentTask()).toBe(task1);

      registry.registerTask(task2);
      expect(registry.getCurrentTask()).toBe(task2);
      expect(registry.containsTask(task1)).toBe(false);
      expect(registry.containsTask(task2)).toBe(true);
    });

    it('containsTask uses object identity', () => {
      const registry = new TaskRegistry('identity-user', taskStore);
      const task = new Task('identity-task');
      const differentTask = new Task('identity-task'); // Same name, different object

      registry.registerTask(task);

      expect(registry.containsTask(task)).toBe(true);
      expect(registry.containsTask(differentTask)).toBe(false); // Different object
    });
  });

  describe('Registry as Convenient Wrapper', () => {
    it('wraps TaskStore operations with bound parameters', () => {
      const registry = new TaskRegistry('wrapper-user', taskStore, new JobId('wrapper-job'));
      const task = new Task('wrapper-task');

      // Registry provides convenience
      registry.registerTask(task);

      // Equivalent to direct TaskStore usage
      const directQuery = taskStore.query('wrapper-user', new JobId('wrapper-job'));
      expect(directQuery?.task).toBe(task);

      // Registry convenience methods
      expect(registry.hasTask()).toBe(true);
      expect(registry.getCurrentTask()).toBe(task);
    });

    it('isolates different registries with same TaskStore', () => {
      const registry1 = new TaskRegistry('user1', taskStore, new JobId('job1'));
      const registry2 = new TaskRegistry('user2', taskStore, new JobId('job2'));
      const task1 = new Task('task1');
      const task2 = new Task('task2');

      registry1.registerTask(task1);
      registry2.registerTask(task2);

      expect(registry1.getCurrentTask()).toBe(task1);
      expect(registry2.getCurrentTask()).toBe(task2);
      expect(registry1.containsTask(task2)).toBe(false);
      expect(registry2.containsTask(task1)).toBe(false);
    });
  });

  describe('EmptyTaskStore Integration', () => {
    it('works with EmptyTaskStore for no-op behavior', () => {
      const emptyRegistry = new TaskRegistry('empty-user', EmptyTaskStore.INSTANCE);
      const task = new Task('no-op-task');

      emptyRegistry.registerTask(task);

      // EmptyTaskStore ignores operations
      expect(emptyRegistry.hasTask()).toBe(false);
      expect(emptyRegistry.getCurrentTask()).toBeNull();
      expect(emptyRegistry.containsTask(task)).toBe(false);
    });
  });

  describe('Multiple User Scenarios', () => {
    it('same user with different JobIds', () => {
      const user = 'multi-job-user';
      const registry1 = new TaskRegistry(user, taskStore, new JobId('job1'));
      const registry2 = new TaskRegistry(user, taskStore, new JobId('job2'));

      registry1.registerTask(new Task('task1'));
      registry2.registerTask(new Task('task2'));

      expect(registry1.hasTask()).toBe(true);
      expect(registry2.hasTask()).toBe(true);
      expect(registry1.getCurrentTask()?.toString()).toContain('task1');
      expect(registry2.getCurrentTask()?.toString()).toContain('task2');
    });

    it('different users with same JobId', () => {
      const jobId = new JobId('shared-job');
      const registry1 = new TaskRegistry('user1', taskStore, jobId);
      const registry2 = new TaskRegistry('user2', taskStore, jobId);

      registry1.registerTask(new Task('user1-task'));
      registry2.registerTask(new Task('user2-task'));

      expect(registry1.hasTask()).toBe(true);
      expect(registry2.hasTask()).toBe(true);
      expect(registry1.getCurrentTask()?.toString()).toContain('user1-task');
      expect(registry2.getCurrentTask()?.toString()).toContain('user2-task');
    });
  });
});
