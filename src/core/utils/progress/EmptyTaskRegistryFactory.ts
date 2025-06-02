import { TaskRegistryFactory } from './TaskRegistryFactory';
import { TaskRegistry } from './TaskRegistry';
import { EmptyTaskStore } from './EmptyTaskStore';
import { JobId } from './JobId';

/**
 * Empty TaskRegistryFactory that creates no-op TaskRegistry instances.
 * Singleton implementation - use EmptyTaskRegistryFactory.INSTANCE.
 */
export class EmptyTaskRegistryFactory implements TaskRegistryFactory {
  /**
   * Singleton instance - equivalent to Java enum INSTANCE.
   */
  public static readonly INSTANCE = new EmptyTaskRegistryFactory();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Singleton - use INSTANCE
  }

  public newInstance(jobId: JobId): TaskRegistry {
    // Create registry with empty username and EmptyTaskStore
    return new TaskRegistry("", EmptyTaskStore.INSTANCE, jobId);
  }

  /**
   * Equality check - all instances are the same singleton.
   */
  public equals(other: EmptyTaskRegistryFactory): boolean {
    return other instanceof EmptyTaskRegistryFactory;
  }

  /**
   * Hash code for singleton.
   */
  public hashCode(): number {
    return EmptyTaskRegistryFactory.name.length;
  }

  /**
   * String representation.
   */
  public toString(): string {
    return 'EmptyTaskRegistryFactory.INSTANCE';
  }
}
