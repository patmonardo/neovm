import { Configuration } from "@/annotations/Configuration";
import { ConcurrencyConfig } from "./ConcurrencyConfig";
import { RandomSeedConfig } from "./RandomSeedConfig";
import { formatWithLocale } from "@/utils/StringFormatting";

/**
 * Configuration for algorithms that use random seeds with single-threaded execution
 */
@Configuration
export abstract class SingleThreadedRandomSeedConfig extends ConcurrencyConfig {
  // RandomSeedConfig methods need to be included or re-declared
  abstract randomSeed(): number | undefined;

  /**
   * Validates that random seed is only used with single-threaded execution
   */
  @Configuration.Check
  validate(): void {
    const randomSeed = this.randomSeed();

    if (randomSeed !== undefined) {
      const concurrency = this.concurrency().value();

      if (concurrency > 1) {
        throw new Error(
          formatWithLocale(
            "Configuration parameter 'randomSeed' may only be set if parameter 'concurrency' is equal to 1, but got %d.",
            concurrency
          )
        );
      }
    }
  }
}
