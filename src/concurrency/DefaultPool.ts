import { WorkerPool } from './WorkerPool';
import { PoolSizes } from './PoolSizes';
import { PoolSizesService } from './PoolSizesService';

/**
 * Provides a default worker pool for parallel task execution.
 */
export class DefaultPool {
  /**
   * The singleton instance of the default worker pool
   */
  public static readonly INSTANCE: WorkerPool = DefaultPool.createDefaultPool(
    PoolSizesService.poolSizes()
  );

  /**
   * Creates a worker pool with the specified pool sizes
   * 
   * @param poolSizes Configuration for pool sizes
   * @returns A new worker pool instance
   */
  private static createDefaultPool(poolSizes: PoolSizes): WorkerPool {
    return new WorkerPool(poolSizes.corePoolSize(), poolSizes.maxPoolSize());
  }

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("DefaultPool cannot be instantiated");
  }
}
