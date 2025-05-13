/**
 * Configuration for worker pool sizes.
 */
export class PoolSizes {
  private readonly _corePoolSize: number;
  private readonly _maxPoolSize: number;

  /**
   * Creates a new PoolSizes configuration
   * 
   * @param corePoolSize The core number of workers to keep alive
   * @param maxPoolSize The maximum number of workers
   */
  constructor(corePoolSize: number, maxPoolSize: number) {
    if (corePoolSize < 1) {
      throw new Error(`Core pool size must be at least 1, but was ${corePoolSize}`);
    }
    if (maxPoolSize < corePoolSize) {
      throw new Error(`Max pool size (${maxPoolSize}) must be greater than or equal to core pool size (${corePoolSize})`);
    }
    
    this._corePoolSize = corePoolSize;
    this._maxPoolSize = maxPoolSize;
  }

  /**
   * Returns the core pool size
   */
  public corePoolSize(): number {
    return this._corePoolSize;
  }

  /**
   * Returns the maximum pool size
   */
  public maxPoolSize(): number {
    return this._maxPoolSize;
  }

  /**
   * Creates a new PoolSizes with the same core and max size
   * 
   * @param size The size for both core and max
   * @returns A new PoolSizes instance
   */
  public static fixed(size: number): PoolSizes {
    return new PoolSizes(size, size);
  }

  /**
   * Creates a PoolSizes configuration with default values based on available processors
   * 
   * @returns A new PoolSizes instance
   */
  public static defaults(): PoolSizes {
    // Get available processors
    const availableProcessors = typeof navigator !== 'undefined' 
      ? navigator.hardwareConcurrency || 4
      : (typeof process !== 'undefined' 
        ? require('os').cpus().length 
        : 4);

    // Core pool size is typically processor count
    const corePoolSize = availableProcessors;
    
    // Max pool size is typically 2x processor count
    const maxPoolSize = availableProcessors * 2;
    
    return new PoolSizes(corePoolSize, maxPoolSize);
  }
}