import { describe, it, expect } from 'vitest';
import { TaskRegistryFactory } from '@/core/utils/progress/TaskRegistryFactory';
import { LocalTaskRegistryFactory } from '@/core/utils/progress/LocalTaskRegistryFactory';
import { EmptyTaskRegistryFactory } from '@/core/utils/progress/EmptyTaskRegistryFactory';
import { PerDatabaseTaskStore } from '@/core/utils/progress/PerDatabaseTaskStore';
import { JobId } from '@/core/utils/progress/JobId';

describe('TaskRegistryFactory - Factory Interface and Static Methods', () => {
  describe('Static Factory Methods', () => {
    it('TaskRegistryFactory.local() creates LocalTaskRegistryFactory', () => {
      const taskStore = new PerDatabaseTaskStore();
      const factory = TaskRegistryFactory.local('test-user', taskStore);

      expect(factory).toBeInstanceOf(LocalTaskRegistryFactory);

      const localFactory = factory as LocalTaskRegistryFactory;
      expect(localFactory.getUsername()).toBe('test-user');
      expect(localFactory.getTaskStore()).toBe(taskStore);
    });

    it('TaskRegistryFactory.empty() creates EmptyTaskRegistryFactory singleton', () => {
      const factory = TaskRegistryFactory.empty();

      expect(factory).toBe(EmptyTaskRegistryFactory.INSTANCE);
    });

    it('static methods provide consistent interface', () => {
      const taskStore = new PerDatabaseTaskStore();

      // Both methods return TaskRegistryFactory interface
      const localFactory: TaskRegistryFactory = TaskRegistryFactory.local('user', taskStore);
      const emptyFactory: TaskRegistryFactory = TaskRegistryFactory.empty();

      // Both can create registries
      const localRegistry = localFactory.newInstance(new JobId('local-job'));
      const emptyRegistry = emptyFactory.newInstance(new JobId('empty-job'));

      expect(localRegistry).toBeDefined();
      expect(emptyRegistry).toBeDefined();
    });
  });

  describe('Factory Interface Polymorphism', () => {
    it('factories are interchangeable through interface', () => {
      const taskStore = new PerDatabaseTaskStore();
      const factories: TaskRegistryFactory[] = [
        TaskRegistryFactory.local('poly-user', taskStore),
        TaskRegistryFactory.empty()
      ];

      // All factories can create registries
      factories.forEach((factory, index) => {
        const registry = factory.newInstance(new JobId(`poly-job-${index}`));
        expect(registry).toBeDefined();
      });
    });

    it('supports factory selection patterns', () => {
      function createFactory(useReal: boolean): TaskRegistryFactory {
        if (useReal) {
          return TaskRegistryFactory.local('pattern-user', new PerDatabaseTaskStore());
        } else {
          return TaskRegistryFactory.empty();
        }
      }

      const realFactory = createFactory(true);
      const emptyFactory = createFactory(false);

      expect(realFactory).toBeInstanceOf(LocalTaskRegistryFactory);
      expect(emptyFactory).toBe(EmptyTaskRegistryFactory.INSTANCE);
    });

    it('factories create registries with different behaviors', () => {
      const taskStore = new PerDatabaseTaskStore();
      const localFactory = TaskRegistryFactory.local('behavior-user', taskStore);
      const emptyFactory = TaskRegistryFactory.empty();

      const localRegistry = localFactory.newInstance(new JobId('behavior-job'));
      const emptyRegistry = emptyFactory.newInstance(new JobId('behavior-job'));

      // Local registry works normally
      localRegistry.registerTask(new (class extends Object { toString() { return 'real-task'; } })());
      expect(localRegistry.hasTask()).toBe(true);

      // Empty registry is no-op
      emptyRegistry.registerTask(new (class extends Object { toString() { return 'no-op-task'; } })());
      expect(emptyRegistry.hasTask()).toBe(false);
    });
  });

  describe('Factory Pattern Benefits', () => {
    it('encapsulates registry creation complexity', () => {
      const taskStore = new PerDatabaseTaskStore();

      // Simple interface hides construction details
      const factory = TaskRegistryFactory.local('simple-user', taskStore);
      const registry = factory.newInstance(new JobId('simple-job'));

      // User doesn't need to know about TaskStore, username binding, etc.
      expect(registry.getUsername()).toBe('simple-user');
      expect(registry.getTaskStore()).toBe(taskStore);
    });

    it('enables consistent registry creation across application', () => {
      const taskStore = new PerDatabaseTaskStore();
      const factory = TaskRegistryFactory.local('consistent-user', taskStore);

      // Multiple registries from same factory have consistent properties
      const registries = [
        factory.newInstance(new JobId('job1')),
        factory.newInstance(new JobId('job2')),
        factory.newInstance(new JobId('job3'))
      ];

      registries.forEach(registry => {
        expect(registry.getUsername()).toBe('consistent-user');
        expect(registry.getTaskStore()).toBe(taskStore);
      });
    });

    it('supports testing with different factory implementations', () => {
      function testWithFactory(factory: TaskRegistryFactory) {
        const registry = factory.newInstance(new JobId('test-job'));
        registry.registerTask(new (class extends Object { toString() { return 'test-task'; } })());
        return registry.hasTask();
      }

      const taskStore = new PerDatabaseTaskStore();
      const realResult = testWithFactory(TaskRegistryFactory.local('test-user', taskStore));
      const emptyResult = testWithFactory(TaskRegistryFactory.empty());

      expect(realResult).toBe(true);  // Real factory enables functionality
      expect(emptyResult).toBe(false); // Empty factory disables functionality
    });
  });
});
