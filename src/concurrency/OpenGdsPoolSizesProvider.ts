import { LicenseState } from '@/core/LicenseState';
import { PoolSizes } from './PoolSizes';
import { PoolSizesProvider } from './PoolSizesProvider';
import { OpenGdsPoolSizes } from './OpenGdsPoolSizes';

/**
 * OPEN GDS POOL SIZES PROVIDER - DEFAULT IMPLEMENTATION
 *
 * Default provider that always returns OpenGdsPoolSizes regardless of license.
 * Has minimum priority so it's used as fallback when no other providers available.
 */

export class OpenGdsPoolSizesProvider implements PoolSizesProvider {
  get(licenseState: LicenseState): PoolSizes {
    return new OpenGdsPoolSizes();
  }

  priority(): number {
    return Number.MIN_SAFE_INTEGER;
  }
}
