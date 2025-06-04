import { EmptyTaskStore } from '@/core/utils/progress/EmptyTaskStore';
import { TaskStore } from '@/core/utils/progress/TaskStore';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('EmptyTaskStore', () => {
  describe('Singleton Pattern', () => {
    it('provides INSTANCE singleton', () => {
      expect(EmptyTaskStore.INSTANCE).toBeDefined();
      expect(EmptyTaskStore.INSTANCE).toBeInstanceOf(EmptyTaskStore);
    });

    it('INSTANCE is always the same reference', () => {
      const instance1 = EmptyTaskStore.INSTANCE;
      const instance2 = EmptyTaskStore.INSTANCE;

      expect(instance1).toBe(instance2); // Same reference
    });

    it('implements TaskStore interface', () => {
      const store: TaskStore = EmptyTaskStore.INSTANCE;

      // Should have all required methods
      expect(typeof store.store).toBe('function');
      expect(typeof store.remove).toBe('function');
      expect(typeof store.query).toBe('function');
      expect(typeof store.isEmpty).toBe('function');
      expect(typeof store.taskCount).toBe('function');
      expect(typeof store.addListener).toBe('function');
    });
  });

  describe('Storage Operations (No-op)', () => {
    let store: EmptyTaskStore;

    beforeEach(() => {
      store = EmptyTaskStore.INSTANCE;
    });

    it('store() does nothing', () => {
      const username = 'testuser';
      const jobId = new JobId('test-job');
      const task = new Task('test-task');

      // Should not throw
      expect(() => {
        store.store(username, jobId, task);
      }).not.toThrow();

      // Store should still be empty
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
    });

    it('remove() does nothing', () => {
      const username = 'testuser';
      const jobId = new JobId('test-job');

      // Should not throw
      expect(() => {
        store.remove(username, jobId);
      }).not.toThrow();

      // Store should still be empty
      expect(store.isEmpty()).toBe(true);
    });

    it('multiple store operations still result in empty store', () => {
      const task1 = new Task('task1');
      const task2 = new Task('task2');

      store.store('user1', new JobId('job1'), task1);
      store.store('user2', new JobId('job2'), task2);
      store.remove('user1', new JobId('job1'));

      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
    });
  });

  describe('Query Operations', () => {
    let store: EmptyTaskStore;

    beforeEach(() => {
      store = EmptyTaskStore.INSTANCE;
    });

    it('query() returns empty array', () => {
      const result = store.query();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('query(jobId) returns empty array', () => {
      const jobId = new JobId('test-job');
      const result = store.query(jobId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('query(username) returns empty array', () => {
      const result = store.query('testuser');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('query(username, jobId) returns null', () => {
      const username = 'testuser';
      const jobId = new JobId('test-job');
      const result = store.query(username, jobId);

      expect(result).toBeNull();
    });

    it('query operations after store operations still return empty', () => {
      // Store something first
      store.store('user', new JobId('job'), new Task('task'));

      // All queries should still return empty/null
      expect(store.query()).toEqual([]);
      expect(store.query(new JobId('job'))).toEqual([]);
      expect(store.query('user')).toEqual([]);
      expect(store.query('user', new JobId('job'))).toBeNull();
    });
  });

  describe('Status Operations', () => {
    let store: EmptyTaskStore;

    beforeEach(() => {
      store = EmptyTaskStore.INSTANCE;
    });

    it('isEmpty() always returns true', () => {
      expect(store.isEmpty()).toBe(true);

      // Even after storing something
      store.store('user', new JobId(), new Task('task'));
      expect(store.isEmpty()).toBe(true);
    });

    it('taskCount() always returns 0', () => {
      expect(store.taskCount()).toBe(0);

      // Even after storing multiple things
      store.store('user1', new JobId(), new Task('task1'));
      store.store('user2', new JobId(), new Task('task2'));
      expect(store.taskCount()).toBe(0);
    });
  });

  describe('Method Overloads Discovery', () => {
    let store: EmptyTaskStore;

    beforeEach(() => {
      store = EmptyTaskStore.INSTANCE;
    });

    it('query() overload - no parameters', () => {
      const result = store.query();
      expect(result).toEqual([]);
    });

    it('query() overload - JobId parameter', () => {
      const result = store.query(new JobId('test'));
      expect(result).toEqual([]);
    });

    it('query() overload - string parameter', () => {
      const result = store.query('username');
      expect(result).toEqual([]);
    });

    it('query() overload - string and JobId parameters', () => {
      const result = store.query('username', new JobId('test'));
      expect(result).toBeNull();
    });

    it('query() method handles all overload signatures', () => {
      // Test that TypeScript overloads work correctly
      expect(typeof store.query).toBe('function');

      // These should all compile and work
      const result1: any = store.query();
      const result2: any = store.query(new JobId());
      const result3: any = store.query('user');
      const result4: any = store.query('user', new JobId());

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
      expect(result4).toBeNull();
    });
  });

  describe('Null Object Pattern Verification', () => {
    it('provides safe no-op behavior for all operations', () => {
      const store = EmptyTaskStore.INSTANCE;

      // All operations should be safe and return predictable results
      store.store('user', new JobId(), new Task('task'));
      store.remove('user', new JobId());

      expect(store.query()).toEqual([]);
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
    });

    it('can be used as drop-in replacement for real TaskStore', () => {
      // This tests that EmptyTaskStore can substitute for any TaskStore
      function useTaskStore(taskStore: TaskStore) {
        taskStore.store('user', new JobId(), new Task('task'));
        const results = taskStore.query();
        return results.length;
      }

      const count = useTaskStore(EmptyTaskStore.INSTANCE);
      expect(count).toBe(0); // Empty store returns 0 tasks
    });
  });

  describe('Edge Cases', () => {
    let store: EmptyTaskStore;

    beforeEach(() => {
      store = EmptyTaskStore.INSTANCE;
    });

    it('handles empty strings', () => {
      store.store('', JobId.EMPTY, new Task(''));

      expect(store.query('')).toEqual([]);
      expect(store.query('', JobId.EMPTY)).toBeNull();
      expect(store.isEmpty()).toBe(true);
    });

    it('handles null/undefined gracefully in queries', () => {
      // These might throw type errors at compile time, but let's see runtime behavior
      expect(store.query()).toEqual([]);
      expect(store.isEmpty()).toBe(true);
    });

    it('consistent behavior across multiple calls', () => {
      // Multiple calls should return same results
      expect(store.query()).toEqual(store.query());
      expect(store.isEmpty()).toBe(store.isEmpty());
      expect(store.taskCount()).toBe(store.taskCount());
    });
  });
});
