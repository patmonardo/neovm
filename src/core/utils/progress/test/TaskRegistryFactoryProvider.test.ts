import { describe, it, expect, beforeEach } from 'vitest';
import { TaskRegistryFactoryProvider } from '@/core/utils/progress/TaskRegistryFactoryProvider';
import { TaskStoreService } from '@/core/utils/progress/TaskStoreService';
import { LocalTaskRegistryFactory } from '@/core/utils/progress/LocalTaskRegistryFactory';
import { EmptyTaskRegistryFactory } from '@/core/utils/progress/EmptyTaskRegistryFactory';
import { JobId } from '@/core/utils/progress/JobId';

describe('TaskRegistryFactoryProvider - Provider Pattern', () => {
  let enabledService: TaskStoreService;
  let disabledService: TaskStoreService;
  let enabledProvider: TaskRegistryFactoryProvider;
  let disabledProvider: TaskRegistryFactoryProvider;

  beforeEach(() => {
    enabledService = new TaskStoreService(true);
    disabledService = new TaskStoreService(false);
    enabledProvider = new TaskRegistryFactoryProvider(enabledService);
    disabledProvider = new TaskRegistryFactoryProvider(disabledService);
  });

  describe('Factory Creation Strategy', () => {
    it('creates LocalTaskRegistryFactory when service is enabled', () => {
      const factory = enabledProvider.createFactory('user1', 'database1');

      expect(factory).toBeInstanceOf(LocalTaskRegistryFactory);

      const localFactory = factory as LocalTaskRegistryFactory;
      expect(localFactory.getUsername()).toBe('user1');
      expect(localFactory.getTaskStore()).toBe(enabledService.getTaskStore('database1'));
    });

    it('creates EmptyTaskRegistryFactory when explicitly requested', () => {
      const factory = enabledProvider.createEmptyFactory();

      expect(factory).toBe(EmptyTaskRegistryFactory.INSTANCE);
    });

    it('creates different factories for different users/databases', () => {
      const factory1 = enabledProvider.createFactory('user1', 'db1');
      const factory2 = enabledProvider.createFactory('user2', 'db1');
      const factory3 = enabledProvider.createFactory('user1', 'db2');

      expect(factory1).toBeInstanceOf(LocalTaskRegistryFactory);
      expect(factory2).toBeInstanceOf(LocalTaskRegistryFactory);
      expect(factory3).toBeInstanceOf(LocalTaskRegistryFactory);

      // Different configurations should create different factories
      expect(factory1).not.toBe(factory2);
      expect(factory1).not.toBe(factory3);
      expect(factory2).not.toBe(factory3);
    });
  });

  describe('Context-Based Factory Selection', () => {
    it('creates LocalFactory when progress enabled', () => {
      const factory = enabledProvider.createFactoryForContext('user', 'db', true);

      expect(factory).toBeInstanceOf(LocalTaskRegistryFactory);
    });

    it('creates EmptyFactory when progress disabled', () => {
      const factory = enabledProvider.createFactoryForContext('user', 'db', false);

      expect(factory).toBe(EmptyTaskRegistryFactory.INSTANCE);
    });

    it('defaults to enabled when progressEnabled not specified', () => {
      const factory = enabledProvider.createFactoryForContext('user', 'db');

      expect(factory).toBeInstanceOf(LocalTaskRegistryFactory);
    });
  });

  describe('Service Integration', () => {
    it('provider with disabled service still creates proper factories', () => {
      // Even with disabled service, provider can create local factories
      const factory = disabledProvider.createFactory('user', 'db');

      expect(factory).toBeInstanceOf(LocalTaskRegistryFactory);

      // But the TaskStore will be EmptyTaskStore
      const localFactory = factory as LocalTaskRegistryFactory;
      expect(localFactory.getTaskStore().constructor.name).toBe('EmptyTaskStore');
    });

    it('provider respects service configuration', () => {
      const enabledFactory = enabledProvider.createFactory('user', 'db');
      const disabledProviderFactory = disabledProvider.createFactory('user', 'db');

      const enabledLocalFactory = enabledFactory as LocalTaskRegistryFactory;
      const disabledLocalFactory = disabledProviderFactory as LocalTaskRegistryFactory;

      // Different TaskStore types based on service configuration
      expect(enabledLocalFactory.getTaskStore().constructor.name).toBe('PerDatabaseTaskStore');
      expect(disabledLocalFactory.getTaskStore().constructor.name).toBe('EmptyTaskStore');
    });

    it('same provider creates consistent factories for same parameters', () => {
      const factory1 = enabledProvider.createFactory('same-user', 'same-db');
      const factory2 = enabledProvider.createFactory('same-user', 'same-db');

      // Should be equivalent (same configuration)
      const local1 = factory1 as LocalTaskRegistryFactory;
      const local2 = factory2 as LocalTaskRegistryFactory;

      expect(local1.getUsername()).toBe(local2.getUsername());
      expect(local1.getTaskStore()).toBe(local2.getTaskStore()); // Same TaskStore instance
    });
  });

  describe('Provider Usage Patterns', () => {
    it('supports application-wide factory management', () => {
      // Simulate application usage
      const userSessions = [
        { user: 'alice', db: 'production' },
        { user: 'bob', db: 'staging' },
        { user: 'charlie', db: 'production' }
      ];

      const factories = userSessions.map(session =>
        enabledProvider.createFactory(session.user, session.db)
      );

      // Each should create working registries
      factories.forEach((factory, index) => {
        const registry = factory.newInstance(new JobId(`job-${index}`));
        expect(registry.getUsername()).toBe(userSessions[index].user);
      });
    });

    it('enables easy switching between enabled/disabled modes', () => {
      const username = 'switch-user';
      const database = 'switch-db';

      // Function that uses factory (application code)
      function createRegistryForJob(provider: TaskRegistryFactoryProvider, enabled: boolean) {
        const factory = provider.createFactoryForContext(username, database, enabled);
        return factory.newInstance(new JobId('switch-job'));
      }

      const enabledRegistry = createRegistryForJob(enabledProvider, true);
      const disabledRegistry = createRegistryForJob(enabledProvider, false);

      expect(enabledRegistry.getTaskStore().constructor.name).toBe('PerDatabaseTaskStore');
      expect(disabledRegistry.getTaskStore().constructor.name).toBe('EmptyTaskStore');
    });
  });

  describe('Provider Configuration Independence', () => {
    it('multiple providers can coexist', () => {
      const service1 = new TaskStoreService(true);
      const service2 = new TaskStoreService(false);
      const provider1 = new TaskRegistryFactoryProvider(service1);
      const provider2 = new TaskRegistryFactoryProvider(service2);

      const factory1 = provider1.createFactory('user', 'db');
      const factory2 = provider2.createFactory('user', 'db');

      const local1 = factory1 as LocalTaskRegistryFactory;
      const local2 = factory2 as LocalTaskRegistryFactory;

      // Same user/db but different providers = different TaskStores
      expect(local1.getTaskStore()).not.toBe(local2.getTaskStore());
    });
  });
});
