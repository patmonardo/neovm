/**
 * OPEN GDS CONCURRENCY VALIDATOR BUILDER - DEFAULT VALIDATOR BUILDER
 *
 * Default builder for concurrency validators. Uses minimum priority so it serves
 * as the fallback when no other validator builders are available.
 */

import { LicenseState } from "@/core/LicenseState";
import { ConcurrencyValidator } from "./ConcurrencyValidator";
import { ConcurrencyValidatorBuilder } from "./ConcurrencyValidatorBuilder";
import { OpenGdsConcurrencyValidator } from "./OpenGdsConcurrencyValidator";

export class OpenGdsConcurrencyValidatorBuilder
  implements ConcurrencyValidatorBuilder
{
  build(licenseState: LicenseState): ConcurrencyValidator {
    return new OpenGdsConcurrencyValidator();
  }

  priority(): number {
    return Number.MIN_SAFE_INTEGER;
  }
}
