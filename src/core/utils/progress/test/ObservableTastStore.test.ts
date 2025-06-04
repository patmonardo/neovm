import { ObservableTaskStore } from '@/core/utils/progress/ObservableTaskStore';
import { TaskStoreListener } from '@/core/utils/progress/TaskStoreListener';
import { JobId } from '@/core/utils/progress/JobId';
import { Task } from '@/core/utils/progress/tasks/Task';
import { UserTask } from '@/core/utils/progress/UserTask';

// Concrete implementation for testing the abstract class
class TestableObservableTaskStore extends ObservableTaskStore {
  private readonly storage = new Map<string, UserTask>();

  constructor() {
    super();
  }

  public taskCount(): number {
    return this.storage.size;
  }

  protected storeUserTask(username: string, jobId: JobId, task: Task): UserTask {
    const userTask = new UserTask(username, jobId, task);
    const key = this.createKey(username, jobId);
    this.storage.set(key, userTask);
    return userTask;
  }

  protected removeUserTask(username: string, jobId: JobId): UserTask | null {
    const key = this.createKey(username, jobId);
    const userTask = this.storage.get(key) || null;
    if (userTask) {
      this.storage.delete(key);
    }
    return userTask;
  }

  protected queryAll(): UserTask[] {
    return Array.from(this.storage.values());
  }

  protected queryByUsername(username: string): UserTask[] {
    return this.queryAll().filter(task => task.username === username);
  }

  protected queryByJobId(jobId: JobId): UserTask[] {
    return this.queryAll().filter(task => task.jobId.equals(jobId));
  }

  protected queryByUsernameAndJobId(username: string, jobId: JobId): UserTask | null {
    const key = this.createKey(username, jobId);
    return this.storage.get(key) || null;
  }

  private createKey(username: string, jobId: JobId): string {
    return `${username}:${jobId.value}`;
  }

  // Expose protected method for testing
  public clearListenersForTesting(): void {
    this.clearListeners();
  }
}

describe('ObservableTaskStore', () => {
  let store: TestableObservableTaskStore;

  beforeEach(() => {
    store = new TestableObservableTaskStore();
  });

  describe('Abstract Template Method Pattern', () => {
    it('implements TaskStore interface', () => {
      expect(typeof store.store).toBe('function');
      expect(typeof store.remove).toBe('function');
      expect(typeof store.query).toBe('function');
      expect(typeof store.isEmpty).toBe('function');
      expect(typeof store.taskCount).toBe('function');
      expect(typeof store.addListener).toBe('function');
      expect(typeof store.removeListener).toBe('function');
    });

    it('starts empty', () => {
      expect(store.isEmpty()).toBe(true);
      expect(store.taskCount()).toBe(0);
      expect(store.query()).toEqual([]);
    });

    it('delegates storage to concrete implementation', () => {
      const username = 'test-user';
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
  });

  describe('Observer Pattern Implementation', () => {
    let capturedAddedTasks: UserTask[];
    let capturedRemovedTasks: Array<{ username: string; jobId: JobId }>;
    let listener: TaskStoreListener;

    beforeEach(() => {
      capturedAddedTasks = [];
      capturedRemovedTasks = [];

      listener = {
        onTaskAdded: (userTask: UserTask) => {
          capturedAddedTasks.push(userTask);
        },
        onTaskRemoved: (username: string, jobId: JobId) => {
          capturedRemovedTasks.push({ username, jobId });
        },
        onStoreCleared: () => {
          // Not used in this abstract class
        }
      };

      store.addListener(listener);
    });

    it('notifies listeners on task addition', () => {
      const username = 'observer-user';
      const jobId = new JobId('observer-job');
      const task = new Task('observer-task');

      store.store(username, jobId, task);

      expect(capturedAddedTasks).toHaveLength(1);
      expect(capturedAddedTasks[0].username).toBe(username);
      expect(capturedAddedTasks[0].jobId).toBe(jobId);
      expect(capturedAddedTasks[0].task).toBe(task);
    });

    it('notifies listeners on task removal', () => {
      const username = 'removal-user';
      const jobId = new JobId('removal-job');
      const task = new Task('removal-task');

      // Store first
      store.store(username, jobId, task);
      expect(capturedAddedTasks).toHaveLength(1);

      // Then remove
      store.remove(username, jobId);

      expect(capturedRemovedTasks).toHaveLength(1);
      expect(capturedRemovedTasks[0].username).toBe(username);
      expect(capturedRemovedTasks[0].jobId).toBe(jobId);
    });

    it('does not notify on removal of non-existent task', () => {
      store.remove('nobody', new JobId('nothing'));

      expect(capturedRemovedTasks).toHaveLength(0);
    });

    it('handles multiple listeners', () => {
      const capturedAddedTasks2: UserTask[] = [];
      const listener2: TaskStoreListener = {
        onTaskAdded: (userTask: UserTask) => {
          capturedAddedTasks2.push(userTask);
        },
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener2);
      expect(store.getListenerCount()).toBe(2);

      store.store('multi-user', new JobId('multi-job'), new Task('multi-task'));

      expect(capturedAddedTasks).toHaveLength(1);
      expect(capturedAddedTasks2).toHaveLength(1);
    });

    it('handles listener errors gracefully', () => {
      const errorListener: TaskStoreListener = {
        onTaskAdded: () => {
          throw new Error('Listener error during onTaskAdded');
        },
        onTaskRemoved: () => {
          throw new Error('Listener error during onTaskRemoved');
        },
        onStoreCleared: () => {}
      };

      store.addListener(errorListener);

      // Should not throw despite listener errors
      expect(() => {
        store.store('error-user', new JobId('error-job'), new Task('error-task'));
      }).not.toThrow();

      expect(() => {
        store.remove('error-user', new JobId('error-job'));
      }).not.toThrow();

      // Original listener should still work
      expect(capturedAddedTasks).toHaveLength(1);
      expect(capturedRemovedTasks).toHaveLength(1);
    });
  });

  describe('Listener Management', () => {
    it('tracks listener count correctly', () => {
      expect(store.getListenerCount()).toBe(0);

      const listener1: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener1);
      expect(store.getListenerCount()).toBe(1);

      const listener2: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener2);
      expect(store.getListenerCount()).toBe(2);

      store.removeListener(listener1);
      expect(store.getListenerCount()).toBe(1);

      store.removeListener(listener2);
      expect(store.getListenerCount()).toBe(0);
    });

    it('prevents duplicate listener registration', () => {
      const listener: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener);
      store.addListener(listener); // Same listener again

      expect(store.getListenerCount()).toBe(1); // Set prevents duplicates
    });

    it('handles removal of non-existent listener', () => {
      const listener: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      expect(() => {
        store.removeListener(listener);
      }).not.toThrow();

      expect(store.getListenerCount()).toBe(0);
    });

    it('can clear all listeners', () => {
      const listeners = Array.from({ length: 3 }, () => ({
        onTaskAdded: () => {},
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      }));

      listeners.forEach(listener => store.addListener(listener));
      expect(store.getListenerCount()).toBe(3);

      store.clearListenersForTesting();
      expect(store.getListenerCount()).toBe(0);
    });
  });

  describe('Query Method Overloads', () => {
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

  describe('Integration with Concrete Implementation', () => {
    it('store and remove operations integrate correctly', () => {
      const username = 'integration-user';
      const jobId = new JobId('integration-job');
      const task = new Task('integration-task');

      // Store
      store.store(username, jobId, task);
      expect(store.taskCount()).toBe(1);
      expect(store.isEmpty()).toBe(false);

      // Query
      const retrieved = store.query(username, jobId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.task).toBe(task);

      // Remove
      store.remove(username, jobId);
      expect(store.taskCount()).toBe(0);
      expect(store.isEmpty()).toBe(true);
      expect(store.query(username, jobId)).toBeNull();
    });

    it('handles task replacement correctly', () => {
      const username = 'replace-user';
      const jobId = new JobId('replace-job');
      const task1 = new Task('first-task');
      const task2 = new Task('second-task');

      // Store first task
      store.store(username, jobId, task1);
      expect(store.taskCount()).toBe(1);

      const retrieved1 = store.query(username, jobId);
      expect(retrieved1?.task).toBe(task1);

      // Store second task with same key
      store.store(username, jobId, task2);
      expect(store.taskCount()).toBe(1); // Still one task

      const retrieved2 = store.query(username, jobId);
      expect(retrieved2?.task).toBe(task2); // Should be the new task
    });

    it('maintains task isolation by user and job ID', () => {
      const users = ['user1', 'user2', 'user3'];
      const jobs = ['job1', 'job2'];

      // Store tasks for each user-job combination
      users.forEach(user => {
        jobs.forEach(job => {
          store.store(user, new JobId(job), new Task(`${user}-${job}-task`));
        });
      });

      expect(store.taskCount()).toBe(users.length * jobs.length);

      // Verify isolation
      users.forEach(user => {
        const userTasks = store.query(user);
        expect(userTasks).toHaveLength(jobs.length);
        expect(userTasks.every(task => task.username === user)).toBe(true);
      });

      jobs.forEach(job => {
        const jobTasks = store.query(new JobId(job));
        expect(jobTasks).toHaveLength(users.length);
        expect(jobTasks.every(task => task.jobId.equals(new JobId(job)))).toBe(true);
      });
    });
  });

  describe('Template Method Pattern Verification', () => {
    it('store() method coordinates storage and notification', () => {
      const addedTasks: UserTask[] = [];
      const listener: TaskStoreListener = {
        onTaskAdded: (userTask: UserTask) => {
          // Verify the task is already stored when listener is called
          expect(store.taskCount()).toBeGreaterThan(0);
          addedTasks.push(userTask);
        },
        onTaskRemoved: () => {},
        onStoreCleared: () => {}
      };

      store.addListener(listener);

      const username = 'template-user';
      const jobId = new JobId('template-job');
      const task = new Task('template-task');

      store.store(username, jobId, task);

      expect(addedTasks).toHaveLength(1);
      expect(store.query(username, jobId)).toBeDefined();
    });

    it('remove() method coordinates removal and notification', () => {
      const removedTasks: Array<{ username: string; jobId: JobId }> = [];
      const listener: TaskStoreListener = {
        onTaskAdded: () => {},
        onTaskRemoved: (username: string, jobId: JobId) => {
          // Verify the task is already removed when listener is called
          expect(store.query(username, jobId)).toBeNull();
          removedTasks.push({ username, jobId });
        },
        onStoreCleared: () => {}
      };

      const username = 'removal-template-user';
      const jobId = new JobId('removal-template-job');
      const task = new Task('removal-template-task');

      store.store(username, jobId, task);
      store.addListener(listener);
      store.remove(username, jobId);

      expect(removedTasks).toHaveLength(1);
      expect(store.query(username, jobId)).toBeNull();
    });
  });
});
