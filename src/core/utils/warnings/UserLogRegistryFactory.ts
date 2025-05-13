import { UserLogRegistry } from './UserLogRegistry';

/**
 * Factory interface for creating UserLogRegistry instances.
 */
export interface UserLogRegistryFactory {
  newInstance(): UserLogRegistry;
}
