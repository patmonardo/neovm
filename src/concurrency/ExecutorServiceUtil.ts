import { Concurrency } from './Concurrency';
import { WorkerPool } from './WorkerPool';
import { WorkerFactory } from './WorkerFactory';
import { PoolSizes } from './PoolSizes';

/**
 * Simple utility for creating worker pools.
 * Scaled back to essentials only.
 */
export class ExecutorServiceUtil {
  private static readonly THREAD_NAME_PREFIX = "gds";

  public static readonly DEFAULT_THREAD_FACTORY: WorkerFactory =
    WorkerFactory.daemon(ExecutorServiceUtil.THREAD_NAME_PREFIX);

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    throw new Error("This utility class cannot be instantiated");
  }

  /**
   * Creates a single-threaded worker pool
   */
  public static createSingleThreadPool(threadPrefix: string): WorkerPool {
    const poolSizes = PoolSizes.fixed(1);
    return new WorkerPool(poolSizes, WorkerFactory.daemon(threadPrefix));
  }

  /**
   * Creates a thread pool with specified pool sizes
   */
  public static createThreadPool(corePoolSize: number, maxPoolSize: number): WorkerPool {
    const poolSizes = PoolSizes.custom(corePoolSize, maxPoolSize);
    return new WorkerPool(poolSizes, ExecutorServiceUtil.DEFAULT_THREAD_FACTORY);
  }

  /**
   * Creates a fork-join style worker pool (simplified)
   */
  public static createForkJoinPool(concurrency: Concurrency): WorkerPool {
    const poolSizes = PoolSizes.fixed(concurrency.value());
    return new WorkerPool(poolSizes, ExecutorServiceUtil.DEFAULT_THREAD_FACTORY);
  }
}
