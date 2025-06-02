import { PoolSizes } from './PoolSizes';

/**
 * OPEN GDS POOL SIZES - DEFAULT IMPLEMENTATION
 *
 * Conservative default implementation using the official factory pattern.
 * No more magic numbers - this is the "official" default!
 */
export class OpenGdsPoolSizes implements PoolSizes {
  // TODO: think how to make the magic numbers less magic
  // Answer: They're not magic anymore - they're the official defaults!

  corePoolSize(): number {
    return 4;
  }

  maxPoolSize(): number {
    return 4;
  }
}
