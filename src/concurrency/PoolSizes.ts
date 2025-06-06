/**
 * POOL SIZES INTERFACE - THREAD POOL CONFIGURATION
 *
 * Simple interface for configuring thread pool dimensions.
 * Defines core pool size and maximum pool size for thread pools.
 */

export interface PoolSizes {
  /**
   * The core number of threads to keep in the pool.
   */
  corePoolSize(): number;

  /**
   * The maximum number of threads allowed in the pool.
   */
  maxPoolSize(): number;
}

/**
 * PoolSizes namespace with factory methods and utilities.
 */
export namespace PoolSizes {
  /**
   * Returns the default PoolSizes implementation.
   * Uses DefaultPoolSizes with conservative defaults.
   */
  export function defaults(): PoolSizes {
    return new DefaultPoolSizes();
  }

  /**
   * Creates a fixed-size pool with the specified number of threads.
   * Core and max pool sizes are set to the same value.
   */
  export function fixed(size: number): PoolSizes {
    return new FixedPoolSizes(size);
  }

  /**
   * Creates a single-threaded pool for debugging and testing.
   */
  export function singleThreaded(): PoolSizes {
    return new FixedPoolSizes(1);
  }

  /**
   * Creates pool sizes based on available CPU cores.
   */
  export function fromCpuCores(factor: number = 1): PoolSizes {
    const cores = getCpuCoreCount();
    const poolSize = Math.max(1, Math.floor(cores * factor));
    return new FixedPoolSizes(poolSize);
  }

  /**
   * Creates a custom pool with different core and max sizes.
   */
  export function custom(coreSize: number, maxSize: number): PoolSizes {
    return new CustomPoolSizes(coreSize, maxSize);
  }
}

// =============================================================================
// IMPLEMENTATIONS - Now officially street legal!
// =============================================================================

/**
 * OPEN GDS POOL SIZES - DEFAULT IMPLEMENTATION
 *
 */
export class DefaultPoolSizes implements PoolSizes {
  corePoolSize(): number {
    return 4;
  }

  maxPoolSize(): number {
    return 4;
  }
}

/**
 * FIXED POOL SIZES - Same core and max size
 */
class FixedPoolSizes implements PoolSizes {
  constructor(private readonly size: number) {}

  corePoolSize(): number {
    return this.size;
  }

  maxPoolSize(): number {
    return this.size;
  }
}

/**
 * CUSTOM POOL SIZES - Different core and max sizes
 */
class CustomPoolSizes implements PoolSizes {
  constructor(
    private readonly core: number,
    private readonly max: number
  ) {}

  corePoolSize(): number {
    return this.core;
  }

  maxPoolSize(): number {
    return this.max;
  }
}

/**
 * Get CPU core count for pool sizing.
 */
function getCpuCoreCount(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency; // Browser
  }

  try {
    return require('os').cpus().length; // Node.js
  } catch {
    return 4; // Fallback default
  }
}
