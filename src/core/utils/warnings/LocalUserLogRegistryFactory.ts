import { UserLogRegistryFactory } from './UserLogRegistryFactory';
import { UserLogRegistry } from './UserLogRegistry';
import { UserLogStore } from './UserLogStore';

/**
 * A factory that creates UserLogRegistry instances for a specific user,
 * using a provided UserLogStore.
 */
export class LocalUserLogRegistryFactory implements UserLogRegistryFactory {
  private readonly username: string;
  private readonly userLogStore: UserLogStore;

  /**
   * Creates a new LocalUserLogRegistryFactory.
   * @param username The username for which logs will be registered.
   * @param userLogStore The store to be used by the created UserLogRegistry.
   */
  constructor(username: string, userLogStore: UserLogStore) {
    this.username = username;
    this.userLogStore = userLogStore;
  }

  /**
   * Creates a new UserLogRegistry instance.
   * @returns A UserLogRegistry configured with the username and UserLogStore
   *          provided to this factory.
   */
  public newInstance(): UserLogRegistry {
    return new UserLogRegistry(this.username, this.userLogStore);
  }
}
