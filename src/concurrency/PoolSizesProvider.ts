/**
 * POOL SIZES PROVIDER - SERVICE PROVIDER INTERFACE
 *
 * Service interface for providing PoolSizes based on license state.
 * Allows different implementations based on licensing tiers.
 */

import { LicenseState } from '@/core/LicenseState';
import { PoolSizes } from './PoolSizes';

export interface PoolSizesProvider {
  /**
   * Get pool sizes based on the current license state.
   */
  get(licenseState: LicenseState): PoolSizes;

  /**
   * Priority for this provider. Higher priority providers are preferred.
   * Used when multiple providers are available.
   */
  priority(): number;
}
