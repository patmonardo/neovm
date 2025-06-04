import { describe, it, expect, beforeEach } from 'vitest';
import { LocalTaskRegistryFactory } from '@/core/utils/progress/LocalTaskRegistryFactory';
import { PerDatabaseTaskStore } from '@/core/utils/progress/PerDatabaseTaskStore';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('LocalTaskRegistryFactory - Factory Pattern with Validation', () => {
  let taskStore: PerDatabaseTaskStore;
  let factory: LocalTaskRegistryFactory;

  beforeEach(() => {
    taskStore = new PerDatabaseTaskStore();
    factory = new LocalTaskRegistryFactory('factory-user', taskStore);
  });

  describe('Factory Creation and Properties', () => {
    it('creates factory with bound username and taskStore', () => {
      expect(factory.getUsername()).toBe('factory-user');
      expect(factory.getTaskStore()).toBe(taskStore);
    });

    it('creates registries with consistent properties', () => {
      const jobId = new JobId('test-job');
      const registry = factory.newInstance(jobId);

      expect(registry.getUsername()).toBe('factory-user');
      expect(registry.getTaskStore()).toBe(taskStore);
      expect(registry.getJobId()).toBe(jobId);
    });
  });

  describe('Duplicate Job Validation', () => {
    it('prevents duplicate job IDs for same user', () => {
      const jobId = new JobId('duplicate-job');

      // First registry creation succeeds
      const registry1 = factory.newInstance(jobId);
      registry1.registerTask(new Task('first-task'));

      // Second registry with same jobId should fail
      expect(() => {
        factory.newInstance(jobId);
      }).toThrow("There's already a job running with jobId 'duplicate-job'");
    });

    it('allows same job ID after task is unregistered', () => {
      const jobId = new JobId('reusable-job');

      // Create and register task
      const registry1 = factory.newInstance(jobId);
      registry1.registerTask(new Task('first-task'));

      // Unregister task
      registry1.unregisterTask();

      // Now can create new registry with same jobId
      const registry2 = factory.newInstance(jobId);
      expect(registry2.getJobId()).toBe(jobId);
    });

    it('validation checks current state of TaskStore', () => {
      const jobId = new JobId('state-check-job');

      // Directly store task in TaskStore (bypassing factory)
      taskStore.store('factory-user', jobId, new Task('direct-task'));

      // Factory should detect existing task
      expect(() => {
        factory.newInstance(jobId);
      }).toThrow();

      // Remove task directly
      taskStore.remove('factory-user', jobId);

      // Now factory should allow creation
      const registry = factory.newInstance(jobId);
      expect(registry.getJobId()).toBe(jobId);
    });
  });

  describe('Factory Isolation', () => {
    it('different factories for different users dont conflict', () => {
      const user2Factory = new LocalTaskRegistryFactory('user2', taskStore);
      const jobId = new JobId('shared-job-id');

      // Both factories can create registries with same jobId
      const registry1 = factory.newInstance(jobId);
      const registry2 = user2Factory.newInstance(jobId);

      registry1.registerTask(new Task('user1-task'));
      registry2.registerTask(new Task('user2-task'));

      expect(registry1.getCurrentTask()?.toString()).toContain('user1-task');
      expect(registry2.getCurrentTask()?.toString()).toContain('user2-task');
    });

    it('different factories with different TaskStores are independent', () => {
      const otherTaskStore = new PerDatabaseTaskStore();
      const otherFactory = new LocalTaskRegistryFactory('factory-user', otherTaskStore);
      const jobId = new JobId('isolation-job');

      // Register task in first factory
      const registry1 = factory.newInstance(jobId);
      registry1.registerTask(new Task('first-store-task'));

      // Second factory with different TaskStore should allow same jobId
      const registry2 = otherFactory.newInstance(jobId);
      expect(registry2.getJobId()).toBe(jobId);
    });
  });

  describe('Factory Equality and Hashing', () => {
    it('equal factories have same username and taskStore', () => {
      const sameFactory = new LocalTaskRegistryFactory('factory-user', taskStore);
      const differentUserFactory = new LocalTaskRegistryFactory('other-user', taskStore);
      const differentStoreFactory = new LocalTaskRegistryFactory('factory-user', new PerDatabaseTaskStore());

      expect(factory.equals(sameFactory)).toBe(true);
      expect(factory.equals(differentUserFactory)).toBe(false);
      expect(factory.equals(differentStoreFactory)).toBe(false);
    });

    it('hash codes are consistent with equality', () => {
      const sameFactory = new LocalTaskRegistryFactory('factory-user', taskStore);

      if (factory.equals(sameFactory)) {
        expect(factory.hashCode()).toBe(sameFactory.hashCode());
      }
    });
  });

  describe('Factory toString', () => {
    it('provides readable string representation', () => {
      const result = factory.toString();

      expect(result).toContain('LocalTaskRegistryFactory');
      expect(result).toContain('factory-user');
      expect(result).toContain('PerDatabaseTaskStore');
    });
  });
});
