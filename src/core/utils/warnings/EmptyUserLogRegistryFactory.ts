import { UserLogRegistryFactory } from './UserLogRegistryFactory';
import { UserLogRegistry } from './UserLogRegistry';

/**
 * A factory that creates UserLogRegistry instances which do not log anything.
 * This is equivalent to the Java enum `EmptyUserLogRegistryFactory.INSTANCE`.
 */
const EmptyUserLogRegistryFactoryInstance: UserLogRegistryFactory = {
  newInstance(): UserLogRegistry {
    return UserLogRegistry.empty();
  }
};

// Export the instance directly, mimicking the Java enum singleton.
export { EmptyUserLogRegistryFactoryInstance as EmptyUserLogRegistryFactory };
