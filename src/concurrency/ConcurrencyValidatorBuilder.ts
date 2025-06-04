import { LicenseState } from '@/core/LicenseState';
import { ConcurrencyValidator } from './ConcurrencyValidator';

/**
 * CONCURRENCY VALIDATOR BUILDER - SERVICE PROVIDER INTERFACE
 */
export interface ConcurrencyValidatorBuilder {
  /**
   * Build a concurrency validator for the given license state.
   */
  build(licenseState: LicenseState): ConcurrencyValidator;

  /**
   * Priority for this builder. Higher priority builders are preferred.
   */
  priority(): number;
}
