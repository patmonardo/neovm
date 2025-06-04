import { TaskStoreHolder } from '@/core/utils/progress/TaskStoreHolder';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('TaskStoreHolder Integration', () => {
  afterEach(() => {
    TaskStoreHolder.clear();
  });

  describe('Real TaskStore Creation', () => {
    it('creates PerDatabaseTaskStore instances', () => {
      const store = TaskStoreHolder.getTaskStore('test-db');

      // Should be a real TaskStore, not EmptyTaskStore
      expect(store.constructor.name).toBe('PerDatabaseTaskStore');
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
    });

    it('TaskStore instances can store and retrieve tasks', () => {
      const store = TaskStoreHolder.getTaskStore('functional-test');
      const username = 'testuser';
      const jobId = new JobId('test-job');
      const task = new Task('test-task');

      // Initially empty
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);

      // Store a task
      store.store(username, jobId, task);

      // Should no longer be empty
      expect(store.isEmpty()).toBe(false);
      expect(store.taskCount()).toBe(1);

      // Should be able to query it back
      const result = store.query(username, jobId);
      expect(result).toBeDefined();
    });

    it('different databases have isolated task storage', () => {
      const store1 = TaskStoreHolder.getTaskStore('db1');
      const store2 = TaskStoreHolder.getTaskStore('db2');

      const task1 = new Task('task-for-db1');
      const task2 = new Task('task-for-db2');
      const jobId1 = new JobId('job1');
      const jobId2 = new JobId('job2');

      // Store different tasks in different databases
      store1.store('user1', jobId1, task1);
      store2.store('user2', jobId2, task2);

      // Each store should only have its own task
      expect(store1.taskCount()).toBe(1);
      expect(store2.taskCount()).toBe(1);

      // Query should return correct tasks
      expect(store1.query('user1', jobId1)).toBeDefined();
      expect(store1.query('user2', jobId2)).toBeNull();

      expect(store2.query('user2', jobId2)).toBeDefined();
      expect(store2.query('user1', jobId1)).toBeNull();
    });
  });

  describe('Registry Lifecycle', () => {
    it('persists task data across getTaskStore calls', () => {
      const dbName = 'persistent-db';
      const username = 'user';
      const jobId = new JobId('persistent-job');
      const task = new Task('persistent-task');

      // Get store and add task
      const store1 = TaskStoreHolder.getTaskStore(dbName);
      store1.store(username, jobId, task);
      expect(store1.taskCount()).toBe(1);

      // Get store again - should be same instance with same data
      const store2 = TaskStoreHolder.getTaskStore(dbName);
      expect(store2).toBe(store1); // Same reference
      expect(store2.taskCount()).toBe(1); // Same data
      expect(store2.query(username, jobId)).toBeDefined();
    });

    it('purge clears specific database tasks', () => {
      const store1 = TaskStoreHolder.getTaskStore('to-purge');
      const store2 = TaskStoreHolder.getTaskStore('to-keep');

      // Add tasks to both
      store1.store('user1', new JobId('job1'), new Task('task1'));
      store2.store('user2', new JobId('job2'), new Task('task2'));

      expect(store1.taskCount()).toBe(1);
      expect(store2.taskCount()).toBe(1);
      expect(TaskStoreHolder.size()).toBe(2);

      // Purge one database
      TaskStoreHolder.purge('to-purge');

      // Registry should be smaller
      expect(TaskStoreHolder.size()).toBe(1);
      expect(TaskStoreHolder.getDatabaseNames()).toEqual(['to-keep']);

      // Kept store should still have its data
      expect(store2.taskCount()).toBe(1);

      // New store for purged database should be empty
      const newStore1 = TaskStoreHolder.getTaskStore('to-purge');
      expect(newStore1).not.toBe(store1); // Different instance
      expect(newStore1.taskCount()).toBe(0); // Empty
    });

    it('clear removes all task data from all databases', () => {
      // Create multiple databases with tasks
      const stores = ['db1', 'db2', 'db3'].map(name => {
        const store = TaskStoreHolder.getTaskStore(name);
        store.store('user', new JobId(`job-${name}`), new Task(`task-${name}`));
        return store;
      });

      stores.forEach(store => expect(store.taskCount()).toBe(1));
      expect(TaskStoreHolder.size()).toBe(3);

      // Clear everything
      TaskStoreHolder.clear();

      // Registry should be empty
      expect(TaskStoreHolder.size()).toBe(0);
      expect(TaskStoreHolder.getDatabaseNames()).toEqual([]);

      // Getting stores again should give new empty instances
      const newStores = ['db1', 'db2', 'db3'].map(name =>
        TaskStoreHolder.getTaskStore(name)
      );

      newStores.forEach((newStore, index) => {
        expect(newStore).not.toBe(stores[index]); // Different instances
        expect(newStore.taskCount()).toBe(0); // Empty
      });
    });
  });

  describe('Case Normalization Impact', () => {
    it('case variations share the same task data', () => {
      const variations = ['TestDB', 'testdb', 'TESTDB', 'TestDb'];

      // Store task using first variation
      const store1 = TaskStoreHolder.getTaskStore(variations[0]);
      const task = new Task('shared-task');
      const jobId = new JobId('shared-job');
      store1.store('user', jobId, task);

      // All variations should access the same data
      variations.forEach(variation => {
        const store = TaskStoreHolder.getTaskStore(variation);
        expect(store).toBe(store1); // Same instance
        expect(store.taskCount()).toBe(1); // Same data
        expect(store.query('user', jobId)).toBeDefined();
      });

      // Only one database should be registered
      expect(TaskStoreHolder.size()).toBe(1);
      expect(TaskStoreHolder.getDatabaseNames()).toEqual(['testdb']); // Normalized
    });

    it('purge works with case variations', () => {
      const store = TaskStoreHolder.getTaskStore('CaseSensitive');
      store.store('user', new JobId('job'), new Task('task'));

      expect(TaskStoreHolder.size()).toBe(1);
      expect(store.taskCount()).toBe(1);

      // Purge using different case
      TaskStoreHolder.purge('casesensitive');

      expect(TaskStoreHolder.size()).toBe(0);

      // New store should be empty
      const newStore = TaskStoreHolder.getTaskStore('CASESENSITIVE');
      expect(newStore.taskCount()).toBe(0);
    });
  });

  describe('Task Query Operations', () => {
    let store: any;

    beforeEach(() => {
      store = TaskStoreHolder.getTaskStore('query-test');
    });

    it('supports all query overloads', () => {
      const user1 = 'alice';
      const user2 = 'bob';
      const job1 = new JobId('job1');
      const job2 = new JobId('job2');
      const task1 = new Task('task1');
      const task2 = new Task('task2');

      store.store(user1, job1, task1);
      store.store(user2, job2, task2);

      // Query all tasks
      const allTasks = store.query();
      expect(allTasks).toHaveLength(2);

      // Query by JobId
      const job1Tasks = store.query(job1);
      expect(job1Tasks).toHaveLength(1);

      // Query by username
      const user1Tasks = store.query(user1);
      expect(user1Tasks).toHaveLength(1);

      // Query specific task
      const specificTask = store.query(user1, job1);
      expect(specificTask).toBeDefined();

      // Query non-existent
      const nonExistent = store.query('nobody', new JobId('nothing'));
      expect(nonExistent).toBeNull();
    });

    it('demonstrates real task workflow', () => {
      const username = 'data-scientist';
      const jobId = new JobId('pagerank-algorithm');
      const task = new Task('PageRank computation on social graph');

      // Store task (job started)
      store.store(username, jobId, task);
      expect(store.taskCount()).toBe(1);

      // Query task (check progress)
      const retrievedTask = store.query(username, jobId);
      expect(retrievedTask).toBeDefined();

      // Remove task (job completed)
      store.remove(username, jobId);
      expect(store.taskCount()).toBe(0);
      expect(store.isEmpty()).toBe(true);

      // Query after removal
      const removedTask = store.query(username, jobId);
      expect(removedTask).toBeNull();
    });
  });
});
