import { PerDatabaseTaskStore } from '@/core/utils/progress/PerDatabaseTaskStore';
import { TaskStore } from '@/core/utils/progress/TaskStore';
import { TaskStoreListener } from '@/core/utils/progress/TaskStoreListener';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';
import { UserTask } from '@/core/utils/progress/UserTask';

describe('PerDatabaseTaskStore', () => {
  let store: PerDatabaseTaskStore;

  beforeEach(() => {
    store = new PerDatabaseTaskStore();
  });

  describe('Basic Storage Operations', () => {
    it('implements TaskStore interface', () => {
      const taskStore: TaskStore = store;

      expect(typeof taskStore.store).toBe('function');
      expect(typeof taskStore.remove).toBe('function');
      expect(typeof taskStore.query).toBe('function');
      expect(typeof taskStore.isEmpty).toBe('function');
      expect(typeof taskStore.taskCount).toBe('function');
      expect(typeof taskStore.addListener).toBe('function');
    });

    it('starts empty', () => {
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
      expect(store.query()).toEqual([]);
    });

    it('stores and retrieves tasks', () => {
      const username = 'alice';
      const jobId = new JobId('test-job');
      const task = new Task('test-task');

      store.store(username, jobId, task);

      expect(store.isEmpty()).toBe(false);
      expect(store.taskCount()).toBe(1);

      const retrieved = store.query(username, jobId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.username).toBe(username);
      expect(retrieved?.jobId).toBe(jobId);
      expect(retrieved?.task).toBe(task);
    });

    it('removes tasks', () => {
      const username = 'bob';
      const jobId = new JobId('remove-test');
      const task = new Task('removable-task');

      store.store(username, jobId, task);
      expect(store.taskCount()).toBe(1);

      store.remove(username, jobId);
      expect(store.taskCount()).toBe(0);
      expect(store.isEmpty()).toBe(true);
      expect(store.query(username, jobId)).toBeNull();
    });

    it('handles multiple tasks', () => {
      const tasks = [
        { user: 'alice', job: new JobId('job1'), task: new Task('task1') },
        { user: 'bob', job: new JobId('job2'), task: new Task('task2') },
        { user: 'charlie', job: new JobId('job3'), task: new Task('task3') }
      ];

      tasks.forEach(({ user, job, task }) => {
        store.store(user, job, task);
      });

      expect(store.taskCount()).toBe(3);
      expect(store.query()).toHaveLength(3);

      tasks.forEach(({ user, job }) => {
        expect(store.query(user, job)).toBeDefined();
      });
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Set up test data
      store.store('alice', new JobId('alice-job1'), new Task('alice-task1'));
      store.store('alice', new JobId('alice-job2'), new Task('alice-task2'));
      store.store('bob', new JobId('bob-job1'), new Task('bob-task1'));
      store.store('charlie', new JobId('shared-job'), new Task('charlie-task'));
    });

    it('query() returns all tasks', () => {
      const allTasks = store.query();

      expect(allTasks).toHaveLength(4);
      expect(allTasks.every(task => task instanceof UserTask)).toBe(true);
    });

    it('query(username) returns tasks by username', () => {
      const aliceTasks = store.query('alice');

      expect(aliceTasks).toHaveLength(2);
      expect(aliceTasks.every(task => task.username === 'alice')).toBe(true);

      const bobTasks = store.query('bob');
      expect(bobTasks).toHaveLength(1);
      expect(bobTasks[0].username).toBe('bob');

      const nonExistentTasks = store.query('nobody');
      expect(nonExistentTasks).toEqual([]);
    });

    it('query(jobId) returns tasks by job ID', () => {
      const sharedJobId = new JobId('shared-job');
      const sharedTasks = store.query(sharedJobId);

      expect(sharedTasks).toHaveLength(1);
      expect(sharedTasks[0].username).toBe('charlie');

      const aliceJob1 = new JobId('alice-job1');
      const aliceJob1Tasks = store.query(aliceJob1);
      expect(aliceJob1Tasks).toHaveLength(1);
      expect(aliceJob1Tasks[0].username).toBe('alice');

      const nonExistentJobId = new JobId('non-existent');
      const nonExistentTasks = store.query(nonExistentJobId);
      expect(nonExistentTasks).toEqual([]);
    });

    it('query(username, jobId) returns specific task or null', () => {
      const aliceJob1 = new JobId('alice-job1');
      const specificTask = store.query('alice', aliceJob1);

      expect(specificTask).toBeDefined();
      expect(specificTask?.username).toBe('alice');
      expect(specificTask?.jobId.equals(aliceJob1)).toBe(true);

      const nonExistentTask = store.query('alice', new JobId('non-existent'));
      expect(nonExistentTask).toBeNull();

      const wrongUserTask = store.query('bob', aliceJob1);
      expect(wrongUserTask).toBeNull();
    });
  });

  describe('Key Generation and Uniqueness', () => {
    it('different users can have same job ID', () => {
      const sharedJobId = new JobId('shared-job-id');
      const task1 = new Task('user1-task');
      const task2 = new Task('user2-task');

      store.store('user1', sharedJobId, task1);
      store.store('user2', sharedJobId, task2);

      expect(store.taskCount()).toBe(2);

      const user1Task = store.query('user1', sharedJobId);
      const user2Task = store.query('user2', sharedJobId);

      expect(user1Task?.task).toBe(task1);
      expect(user2Task?.task).toBe(task2);
    });

    it('same user cannot have duplicate job IDs', () => {
      const jobId = new JobId('duplicate-job');
      const task1 = new Task('first-task');
      const task2 = new Task('second-task');

      store.store('user', jobId, task1);
      expect(store.taskCount()).toBe(1);

      // Store same user + jobId should replace
      store.store('user', jobId, task2);
      expect(store.taskCount()).toBe(1);

      const retrieved = store.query('user', jobId);
      expect(retrieved?.task).toBe(task2); // Should be the second task
    });

    it('handles special characters in usernames', () => {
      const specialUsernames = ['user@domain.com', 'user:with:colons', 'user with spaces'];
      const jobId = new JobId('test-job');

      specialUsernames.forEach((username, index) => {
        store.store(username, jobId, new Task(`task-${index}`));
      });

      expect(store.taskCount()).toBe(specialUsernames.length);

      specialUsernames.forEach(username => {
        expect(store.query(username, jobId)).toBeDefined();
      });
    });
  });

  describe('Listener Integration', () => {
    let mockListener: TaskStoreListener;
    let addedTasks: UserTask[];
    let removedTasks: Array<{ username: string; jobId: JobId }>;
    let clearedCount: number;

    beforeEach(() => {
      addedTasks = [];
      removedTasks = [];
      clearedCount = 0;

      mockListener = {
        onTaskAdded: (userTask: UserTask) => {
          addedTasks.push(userTask);
        },
        onTaskRemoved: (username: string, jobId: JobId) => {
          removedTasks.push({ username, jobId });
        },
        onStoreCleared: () => {
          clearedCount++;
        }
      };

      store.addListener(mockListener);
    });

    it('notifies listeners on task addition', () => {
      const username = 'listener-test';
      const jobId = new JobId('listener-job');
      const task = new Task('listener-task');

      store.store(username, jobId, task);

      expect(addedTasks).toHaveLength(1);
      expect(addedTasks[0].username).toBe(username);
      expect(addedTasks[0].jobId).toBe(jobId);
      expect(addedTasks[0].task).toBe(task);
    });

    it('notifies listeners on task removal', () => {
      const username = 'remove-listener-test';
      const jobId = new JobId('remove-job');
      const task = new Task('remove-task');

      store.store(username, jobId, task);
      expect(addedTasks).toHaveLength(1);

      store.remove(username, jobId);

      expect(removedTasks).toHaveLength(1);
      expect(removedTasks[0].username).toBe(username);
      expect(removedTasks[0].jobId).toBe(jobId);
    });

    it('does not notify on removal of non-existent task', () => {
      store.remove('nobody', new JobId('nothing'));

      expect(removedTasks).toHaveLength(0);
    });

    it('notifies listeners on clear', () => {
      store.store('user1', new JobId('job1'), new Task('task1'));
      store.store('user2', new JobId('job2'), new Task('task2'));

      store.clear();

      expect(clearedCount).toBe(1);
      expect(store.isEmpty()).toBe(true);
    });

    it('supports multiple listeners', () => {
      const addedTasks2: UserTask[] = [];
      const mockListener2: TaskStoreListener = {
        onTaskAdded: (userTask: UserTask) => {
          addedTasks2.push(userTask);
        },
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(mockListener2);

      store.store('multi-listener', new JobId('test'), new Task('test'));

      expect(addedTasks).toHaveLength(1);
      expect(addedTasks2).toHaveLength(1);
    });

    it('handles listener errors gracefully', () => {
      const errorListener: TaskStoreListener = {
        onTaskAdded: () => {
          throw new Error('Listener error');
        },
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(errorListener);

      // Should not throw despite listener error
      expect(() => {
        store.store('error-test', new JobId('error-job'), new Task('error-task'));
      }).not.toThrow();

      // Store operation should still succeed
      expect(store.taskCount()).toBe(1);
      expect(addedTasks).toHaveLength(1); // Original listener still works
    });
  });

  describe('Clear Operations', () => {
    it('clear() removes all tasks', () => {
      store.store('user1', new JobId('job1'), new Task('task1'));
      store.store('user2', new JobId('job2'), new Task('task2'));
      store.store('user3', new JobId('job3'), new Task('task3'));

      expect(store.taskCount()).toBe(3);

      store.clear();

      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
      expect(store.query()).toEqual([]);
    });
  });

  describe('Listener Management', () => {
    it('removeListener() stops notifications', () => {
      const addedTasks: UserTask[] = [];
      const listener: TaskStoreListener = {
        onTaskAdded: (userTask: UserTask) => {
          addedTasks.push(userTask);
        },
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener);
      store.store('test1', new JobId('job1'), new Task('task1'));
      expect(addedTasks).toHaveLength(1);

      store.removeListener(listener);
      store.store('test2', new JobId('job2'), new Task('task2'));
      expect(addedTasks).toHaveLength(1); // No new notifications
    });

    it('removeListener() handles non-existent listener', () => {
      const listener: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      expect(() => {
        store.removeListener(listener);
      }).not.toThrow();
    });
  });
});
