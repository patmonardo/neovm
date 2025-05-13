import { UserLogRegistryFactory } from './UserLogRegistryFactory';
import { UserLogRegistry } from './UserLogRegistry';
import { EmptyUserLogStore } from './EmptyUserLogStore';

/**
 * A factory that creates UserLogRegistry instances which do not log anything.
 * This is equivalent to the Java enum `EmptyUserLogRegistryFactory.INSTANCE`.
 */
const EmptyUserLogRegistryFactoryInstance: UserLogRegistryFactory = {
  newInstance(): UserLogRegistry {
    return new UserLogRegistry("", EmptyUserLogStore.INSTANCE);
  }
};

// Export the instance directly, mimicking the Java enum singleton.
export { EmptyUserLogRegistryFactoryInstance as EmptyUserLogRegistryFactory };
