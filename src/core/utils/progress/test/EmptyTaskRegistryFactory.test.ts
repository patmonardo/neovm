import { describe, it, expect } from 'vitest';
import { EmptyTaskRegistryFactory } from '@/core/utils/progress/EmptyTaskRegistryFactory';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('EmptyTaskRegistryFactory - Singleton Null Object Pattern', () => {
  describe('Singleton Pattern', () => {
    it('provides INSTANCE singleton', () => {
      expect(EmptyTaskRegistryFactory.INSTANCE).toBeDefined();
      expect(EmptyTaskRegistryFactory.INSTANCE).toBeInstanceOf(EmptyTaskRegistryFactory);
    });

    it('INSTANCE is always the same reference', () => {
      const instance1 = EmptyTaskRegistryFactory.INSTANCE;
      const instance2 = EmptyTaskRegistryFactory.INSTANCE;

      expect(instance1).toBe(instance2);
    });

    it('constructor is private (singleton enforcement)', () => {
      // Cannot test private constructor directly, but can verify singleton usage
      expect(EmptyTaskRegistryFactory.INSTANCE).toBeDefined();
    });
  });

  describe('Null Object Registry Creation', () => {
    it('creates registries that use EmptyTaskStore', () => {
      const factory = EmptyTaskRegistryFactory.INSTANCE;
      const jobId = new JobId('empty-job');

      const registry = factory.newInstance(jobId);

      expect(registry.getUsername()).toBe('');
      expect(registry.getJobId()).toBe(jobId);
      expect(registry.getTaskStore().constructor.name).toBe('EmptyTaskStore');
    });

    it('created registries have no-op behavior', () => {
      const factory = EmptyTaskRegistryFactory.INSTANCE;
      const registry = factory.newInstance(new JobId('no-op-job'));
      const task = new Task('no-op-task');

      // All operations should be no-ops
      registry.registerTask(task);
      expect(registry.hasTask()).toBe(false);
      expect(registry.getCurrentTask()).toBeNull();
      expect(registry.containsTask(task)).toBe(false);

      registry.unregisterTask(); // Should not throw
    });

    it('never prevents registry creation (no validation)', () => {
      const factory = EmptyTaskRegistryFactory.INSTANCE;
      const jobId = new JobId('always-allowed');

      // Should always succeed, no duplicate checking
      const registry1 = factory.newInstance(jobId);
      const registry2 = factory.newInstance(jobId);
      const registry3 = factory.newInstance(jobId);

      expect(registry1).toBeDefined();
      expect(registry2).toBeDefined();
      expect(registry3).toBeDefined();
    });
  });

  describe('Factory Equality', () => {
    it('all instances are equal (singleton)', () => {
      const instance1 = EmptyTaskRegistryFactory.INSTANCE;
      const instance2 = EmptyTaskRegistryFactory.INSTANCE;

      expect(instance1.equals(instance2)).toBe(true);
      expect(instance2.equals(instance1)).toBe(true);
    });

    it('consistent hash code', () => {
      const instance1 = EmptyTaskRegistryFactory.INSTANCE;
      const instance2 = EmptyTaskRegistryFactory.INSTANCE;

      expect(instance1.hashCode()).toBe(instance2.hashCode());
    });
  });

  describe('String Representation', () => {
    it('provides singleton toString', () => {
      const result = EmptyTaskRegistryFactory.INSTANCE.toString();

      expect(result).toBe('EmptyTaskRegistryFactory.INSTANCE');
    });
  });

  describe('Null Object Pattern Benefits', () => {
    it('safe substitute for real factory', () => {
      function useFactory(factory: any) {
        const registry = factory.newInstance(new JobId('test'));
        registry.registerTask(new Task('test'));
        return registry.hasTask();
      }

      // Empty factory provides safe no-op behavior
      const result = useFactory(EmptyTaskRegistryFactory.INSTANCE);
      expect(result).toBe(false); // No-op behavior
    });

    it('eliminates need for null checks', () => {
      // Code can always assume factory exists
      const factory = EmptyTaskRegistryFactory.INSTANCE;

      expect(() => {
        const registry = factory.newInstance(new JobId('safe'));
        registry.registerTask(new Task('safe'));
        registry.unregisterTask();
      }).not.toThrow();
    });
  });
});
