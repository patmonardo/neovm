import { EmptyTaskStore } from '@/core/utils/progress/EmptyTaskStore';
import { TaskStoreHolder } from '@/core/utils/progress/TaskStoreHolder';

describe('TaskStoreHolder', () => {
  // Clean up after each test
  afterEach(() => {
    TaskStoreHolder.clear();
  });

  describe('Basic Operations', () => {
    it('getTaskStore() returns a TaskStore', () => {
      const taskStore = TaskStoreHolder.getTaskStore('test-db');

      expect(taskStore).toBeDefined();
      expect(typeof taskStore.store).toBe('function');
      expect(typeof taskStore.remove).toBe('function');
      expect(typeof taskStore.query).toBe('function');
      expect(typeof taskStore.isEmpty).toBe('function');
      expect(typeof taskStore.taskCount).toBe('function');
    });

    it('getTaskStore() returns same instance for same database', () => {
      const taskStore1 = TaskStoreHolder.getTaskStore('same-db');
      const taskStore2 = TaskStoreHolder.getTaskStore('same-db');

      expect(taskStore1).toBe(taskStore2); // Same reference
    });

    it('getTaskStore() returns different instances for different databases', () => {
      const taskStore1 = TaskStoreHolder.getTaskStore('db1');
      const taskStore2 = TaskStoreHolder.getTaskStore('db2');

      expect(taskStore1).not.toBe(taskStore2); // Different references
    });
  });

  describe('Database Name Normalization', () => {
    it('normalizes database names to lowercase', () => {
      const taskStore1 = TaskStoreHolder.getTaskStore('TestDB');
      const taskStore2 = TaskStoreHolder.getTaskStore('testdb');
      const taskStore3 = TaskStoreHolder.getTaskStore('TESTDB');

      expect(taskStore1).toBe(taskStore2);
      expect(taskStore2).toBe(taskStore3);
      expect(taskStore1).toBe(taskStore3);
    });

    it('handles mixed case consistently', () => {
      const variations = ['MyDatabase', 'mydatabase', 'MYDATABASE', 'MyDATABASE'];
      const taskStores = variations.map(name => TaskStoreHolder.getTaskStore(name));

      // All should be the same reference
      taskStores.forEach((store, index) => {
        if (index > 0) {
          expect(store).toBe(taskStores[0]);
        }
      });
    });
  });

  describe('Registry Operations', () => {
    it('getDatabaseNames() returns empty array initially', () => {
      const names = TaskStoreHolder.getDatabaseNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names).toHaveLength(0);
    });

    it('getDatabaseNames() includes registered databases', () => {
      TaskStoreHolder.getTaskStore('db1');
      TaskStoreHolder.getTaskStore('db2');
      TaskStoreHolder.getTaskStore('db3');

      const names = TaskStoreHolder.getDatabaseNames();

      expect(names).toHaveLength(3);
      expect(names).toContain('db1');
      expect(names).toContain('db2');
      expect(names).toContain('db3');
    });

    it('size() returns 0 initially', () => {
      expect(TaskStoreHolder.size()).toBe(0);
    });

    it('size() tracks number of registered databases', () => {
      expect(TaskStoreHolder.size()).toBe(0);

      TaskStoreHolder.getTaskStore('db1');
      expect(TaskStoreHolder.size()).toBe(1);

      TaskStoreHolder.getTaskStore('db2');
      expect(TaskStoreHolder.size()).toBe(2);

      TaskStoreHolder.getTaskStore('db1'); // Same db, shouldn't increase
      expect(TaskStoreHolder.size()).toBe(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('purge() removes specific database', () => {
      TaskStoreHolder.getTaskStore('db1');
      TaskStoreHolder.getTaskStore('db2');

      expect(TaskStoreHolder.size()).toBe(2);

      TaskStoreHolder.purge('db1');
      expect(TaskStoreHolder.size()).toBe(1);

      const names = TaskStoreHolder.getDatabaseNames();
      expect(names).not.toContain('db1');
      expect(names).toContain('db2');
    });

    it('purge() handles case normalization', () => {
      TaskStoreHolder.getTaskStore('TestDB');
      expect(TaskStoreHolder.size()).toBe(1);

      TaskStoreHolder.purge('testdb'); // Different case
      expect(TaskStoreHolder.size()).toBe(0);
    });

    it('purge() is safe for non-existent databases', () => {
      expect(() => {
        TaskStoreHolder.purge('nonexistent');
      }).not.toThrow();

      expect(TaskStoreHolder.size()).toBe(0);
    });

    it('clear() removes all databases', () => {
      TaskStoreHolder.getTaskStore('db1');
      TaskStoreHolder.getTaskStore('db2');
      TaskStoreHolder.getTaskStore('db3');

      expect(TaskStoreHolder.size()).toBe(3);

      TaskStoreHolder.clear();
      expect(TaskStoreHolder.size()).toBe(0);
      expect(TaskStoreHolder.getDatabaseNames()).toEqual([]);
    });

    it('clear() allows fresh registration after cleanup', () => {
      TaskStoreHolder.getTaskStore('db1');
      const originalStore = TaskStoreHolder.getTaskStore('db1');

      TaskStoreHolder.clear();

      const newStore = TaskStoreHolder.getTaskStore('db1');
      expect(newStore).not.toBe(originalStore); // New instance
      expect(TaskStoreHolder.size()).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty database name', () => {
      const taskStore = TaskStoreHolder.getTaskStore('');

      expect(taskStore).toBeDefined();
      expect(TaskStoreHolder.size()).toBe(1);
      expect(TaskStoreHolder.getDatabaseNames()).toContain('');
    });

    it('handles special characters in database names', () => {
      const specialNames = ['db-test', 'db_test', 'db.test', 'db@test', 'db123'];

      specialNames.forEach(name => {
        const taskStore = TaskStoreHolder.getTaskStore(name);
        expect(taskStore).toBeDefined();
      });

      expect(TaskStoreHolder.size()).toBe(specialNames.length);
    });

    it('handles unicode database names', () => {
      const unicodeNames = ['数据库', 'データベース', 'база данных'];

      unicodeNames.forEach(name => {
        const taskStore = TaskStoreHolder.getTaskStore(name);
        expect(taskStore).toBeDefined();
      });

      expect(TaskStoreHolder.size()).toBe(unicodeNames.length);
    });
  });

  describe('Concurrent Access Simulation', () => {
    it('handles multiple getTaskStore calls for same database', () => {
      const taskStores: Array<EmptyTaskStore> = [];

      // Simulate multiple "concurrent" calls
      for (let i = 0; i < 10; i++) {
        taskStores.push(TaskStoreHolder.getTaskStore('concurrent-db'));
      }

      // All should be the same reference
      taskStores.forEach(store => {
        expect(store).toBe(taskStores[0]);
      });

      expect(TaskStoreHolder.size()).toBe(1);
    });
  });

  describe('State Isolation', () => {
    it('different databases have isolated TaskStores', () => {
      const store1 = TaskStoreHolder.getTaskStore('isolated1');
      const store2 = TaskStoreHolder.getTaskStore('isolated2');

      // They should be different instances
      expect(store1).not.toBe(store2);

      // And should maintain separate state (if we had state to test)
      expect(store1.isEmpty()).toBe(true);
      expect(store2.isEmpty()).toBe(true);
    });
  });
});
