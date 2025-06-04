import { TaskStoreService } from '@/core/utils/progress/TaskStoreService';
import { TaskStoreHolder } from '@/core/utils/progress/TaskStoreHolder';
import { EmptyTaskStore } from '@/core/utils/progress/EmptyTaskStore';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';

describe('TaskStoreService Integration', () => {
  afterEach(() => {
    // Clean up global state after each test
    TaskStoreHolder.clear();
  });

  describe('Service Configuration Modes', () => {
    it('disabled mode always returns EmptyTaskStore', () => {
      const service = new TaskStoreService(false);

      expect(service.isProgressTrackingEnabled()).toBe(false);

      const store1 = service.getTaskStore('database1');
      const store2 = service.getTaskStore('database2');
      const store3 = service.getTaskStore('');

      expect(store1).toBe(EmptyTaskStore.INSTANCE);
      expect(store2).toBe(EmptyTaskStore.INSTANCE);
      expect(store3).toBe(EmptyTaskStore.INSTANCE);
    });

    it('enabled mode returns real TaskStores from TaskStoreHolder', () => {
      const service = new TaskStoreService(true);

      expect(service.isProgressTrackingEnabled()).toBe(true);

      const store1 = service.getTaskStore('database1');
      const store2 = service.getTaskStore('database2');

      expect(store1).not.toBe(EmptyTaskStore.INSTANCE);
      expect(store2).not.toBe(EmptyTaskStore.INSTANCE);
      expect(store1).not.toBe(store2); // Different databases
      expect(store1.constructor.name).toBe('PerDatabaseTaskStore');
      expect(store2.constructor.name).toBe('PerDatabaseTaskStore');
    });

    it('enabled mode maintains consistency with TaskStoreHolder', () => {
      const service = new TaskStoreService(true);

      const serviceStore = service.getTaskStore('consistency-test');
      const holderStore = TaskStoreHolder.getTaskStore('consistency-test');

      expect(serviceStore).toBe(holderStore); // Same instance
    });
  });

  describe('Database Management - Disabled Mode', () => {
    let service: TaskStoreService;

    beforeEach(() => {
      service = new TaskStoreService(false);
    });

    it('reports no databases when disabled', () => {
      expect(service.getDatabaseNames()).toEqual([]);
      expect(service.getDatabaseCount()).toBe(0);
    });

    it('database operations are no-ops when disabled', () => {
      // These should not affect global state
      service.purgeDatabase('test-db');
      service.purgeAll();

      // TaskStoreHolder should still be empty
      expect(TaskStoreHolder.size()).toBe(0);
      expect(TaskStoreHolder.getDatabaseNames()).toEqual([]);
    });

    it('getting stores does not register databases when disabled', () => {
      service.getTaskStore('db1');
      service.getTaskStore('db2');
      service.getTaskStore('db3');

      // Service reports no databases
      expect(service.getDatabaseNames()).toEqual([]);
      expect(service.getDatabaseCount()).toBe(0);

      // TaskStoreHolder should also be unaffected
      expect(TaskStoreHolder.size()).toBe(0);
    });
  });

  describe('Database Management - Enabled Mode', () => {
    let service: TaskStoreService;

    beforeEach(() => {
      service = new TaskStoreService(true);
    });

    it('tracks databases as they are accessed', () => {
      expect(service.getDatabaseCount()).toBe(0);
      expect(service.getDatabaseNames()).toEqual([]);

      service.getTaskStore('production');
      expect(service.getDatabaseCount()).toBe(1);
      expect(service.getDatabaseNames()).toEqual(['production']);

      service.getTaskStore('staging');
      expect(service.getDatabaseCount()).toBe(2);
      expect(service.getDatabaseNames()).toContain('production');
      expect(service.getDatabaseNames()).toContain('staging');

      service.getTaskStore('production'); // Same database again
      expect(service.getDatabaseCount()).toBe(2); // No change
    });

    it('purges specific databases', () => {
      // Set up multiple databases with tasks
      const prodStore = service.getTaskStore('production');
      const stagingStore = service.getTaskStore('staging');
      const testStore = service.getTaskStore('test');

      prodStore.store('user1', new JobId('job1'), new Task('prod-task'));
      stagingStore.store('user2', new JobId('job2'), new Task('staging-task'));
      testStore.store('user3', new JobId('job3'), new Task('test-task'));

      expect(service.getDatabaseCount()).toBe(3);
      expect(prodStore.taskCount()).toBe(1);
      expect(stagingStore.taskCount()).toBe(1);
      expect(testStore.taskCount()).toBe(1);

      // Purge staging
      service.purgeDatabase('staging');

      expect(service.getDatabaseCount()).toBe(2);
      expect(service.getDatabaseNames()).not.toContain('staging');
      expect(service.getDatabaseNames()).toContain('production');
      expect(service.getDatabaseNames()).toContain('test');

      // Existing stores should still have their data
      expect(prodStore.taskCount()).toBe(1);
      expect(testStore.taskCount()).toBe(1);

      // New staging store should be empty
      const newStagingStore = service.getTaskStore('staging');
      expect(newStagingStore.taskCount()).toBe(0);
    });

    it('purges all databases', () => {
      // Set up multiple databases
      const stores = ['db1', 'db2', 'db3'].map(name => {
        const store = service.getTaskStore(name);
        store.store('user', new JobId(`job-${name}`), new Task(`task-${name}`));
        return store;
      });

      expect(service.getDatabaseCount()).toBe(3);
      stores.forEach(store => expect(store.taskCount()).toBe(1));

      // Purge all
      service.purgeAll();

      expect(service.getDatabaseCount()).toBe(0);
      expect(service.getDatabaseNames()).toEqual([]);

      // Getting stores again should return new empty instances
      const newStores = ['db1', 'db2', 'db3'].map(name => service.getTaskStore(name));
      newStores.forEach((newStore, index) => {
        expect(newStore).not.toBe(stores[index]); // Different instances
        expect(newStore.taskCount()).toBe(0); // Empty
      });
    });
  });

  describe('Real Task Workflow Integration', () => {
    let service: TaskStoreService;

    beforeEach(() => {
      service = new TaskStoreService(true);
    });

    it('supports complete task lifecycle across databases', () => {
      // Simulate multi-database application
      const userDbStore = service.getTaskStore('user-database');
      const analyticsStore = service.getTaskStore('analytics-database');
      const cacheStore = service.getTaskStore('cache-database');

      // Start tasks in different databases
      const userTask = new Task('Update user profiles');
      const analyticsTask = new Task('Generate daily reports');
      const cacheTask = new Task('Rebuild recommendation cache');

      const userJobId = new JobId('user-update-job');
      const analyticsJobId = new JobId('daily-reports-job');
      const cacheJobId = new JobId('cache-rebuild-job');

      userDbStore.store('admin', userJobId, userTask);
      analyticsStore.store('analyst', analyticsJobId, analyticsTask);
      cacheStore.store('system', cacheJobId, cacheTask);

      // Verify all databases are tracked
      expect(service.getDatabaseCount()).toBe(3);
      expect(service.getDatabaseNames()).toContain('user-database');
      expect(service.getDatabaseNames()).toContain('analytics-database');
      expect(service.getDatabaseNames()).toContain('cache-database');

      // Verify tasks are isolated by database
      expect(userDbStore.taskCount()).toBe(1);
      expect(analyticsStore.taskCount()).toBe(1);
      expect(cacheStore.taskCount()).toBe(1);

      // Query tasks from service
      const retrievedUserTask = service.getTaskStore('user-database').query('admin', userJobId);
      const retrievedAnalyticsTask = service.getTaskStore('analytics-database').query('analyst', analyticsJobId);

      expect(retrievedUserTask?.task).toBe(userTask);
      expect(retrievedAnalyticsTask?.task).toBe(analyticsTask);

      // Complete some tasks
      analyticsStore.remove('analyst', analyticsJobId);
      expect(analyticsStore.taskCount()).toBe(0);

      // Clean up specific database
      service.purgeDatabase('cache-database');
      expect(service.getDatabaseCount()).toBe(2);

      // Remaining databases should be unaffected
      expect(userDbStore.taskCount()).toBe(1);
      expect(service.getTaskStore('analytics-database').taskCount()).toBe(0);
    });

    it('handles database name normalization consistently', () => {
      const variations = ['TestDB', 'testdb', 'TESTDB', 'TestDb'];
      const task = new Task('normalized-task');
      const jobId = new JobId('normalized-job');

      // Store task using first variation
      const firstStore = service.getTaskStore(variations[0]);
      firstStore.store('user', jobId, task);

      // All variations should return the same store with same data
      variations.forEach(variation => {
        const store = service.getTaskStore(variation);
        expect(store).toBe(firstStore); // Same instance
        expect(store.taskCount()).toBe(1);
        expect(store.query('user', jobId)).toBeDefined();
      });

      // Only one database should be registered
      expect(service.getDatabaseCount()).toBe(1);
      expect(service.getDatabaseNames()).toEqual(['testdb']); // Normalized
    });

    it('demonstrates service as application-wide singleton pattern', () => {
      const username = 'singleton-user';
      const jobId = new JobId('singleton-job');
      const task = new Task('singleton-task');

      // Store task through service
      const store1 = service.getTaskStore('singleton-db');
      store1.store(username, jobId, task);

      // Access same store through different service calls
      const store2 = service.getTaskStore('singleton-db');
      expect(store2).toBe(store1); // Same instance

      // Task should be accessible
      const retrieved = store2.query(username, jobId);
      expect(retrieved?.task).toBe(task);

      // Service state is consistent
      expect(service.getDatabaseCount()).toBe(1);
      expect(service.getDatabaseNames()).toEqual(['singleton-db']);
    });
  });

  describe('Service vs EmptyTaskStore Behavior Comparison', () => {
    it('disabled service behaves like EmptyTaskStore', () => {
      const disabledService = new TaskStoreService(false);
      const emptyStore = EmptyTaskStore.INSTANCE;

      // Both should return empty results
      expect(disabledService.getDatabaseCount()).toBe(0);
      expect(disabledService.getDatabaseNames()).toEqual([]);

      const serviceStore = disabledService.getTaskStore('test');
      expect(serviceStore).toBe(emptyStore);

      // Operations should be no-ops
      serviceStore.store('user', new JobId('job'), new Task('task'));
      expect(serviceStore.isEmpty()).toBe(true);
      expect(serviceStore.taskCount()).toBe(0);

      // Service operations should also be no-ops
      disabledService.purgeDatabase('test');
      disabledService.purgeAll();
      expect(disabledService.getDatabaseCount()).toBe(0);
    });

    it('enabled service provides real functionality', () => {
      const enabledService = new TaskStoreService(true);

      const store = enabledService.getTaskStore('real-test');
      expect(store).not.toBe(EmptyTaskStore.INSTANCE);

      // Should support real operations
      store.store('user', new JobId('job'), new Task('task'));
      expect(store.isEmpty()).toBe(false);
      expect(store.taskCount()).toBe(1);

      // Service should track this
      expect(enabledService.getDatabaseCount()).toBe(1);
      expect(enabledService.getDatabaseNames()).toEqual(['real-test']);
    });
  });
});
