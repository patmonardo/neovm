import { Configuration } from "@/annotations/Configuration";
import { Concurrency } from "../concurrency/Concurrency";
import { ConcurrencyValidatorService } from "../concurrency/ConcurrencyValidatorService";
import { formatWithLocale } from "@/utils/StringFormatting";

// Constants - define as static members in the class
export const CONCURRENCY_KEY = "concurrency";
export const DEFAULT_CONCURRENCY = 4;
export const TYPED_DEFAULT_CONCURRENCY = new Concurrency(DEFAULT_CONCURRENCY);
export const CONCURRENCY_LIMITATION = 4;

@Configuration
export abstract class ConcurrencyConfig {
  // Static constants accessible via ConcurrencyConfig.CONCURRENCY_KEY, etc.
  static readonly CONCURRENCY_KEY = CONCURRENCY_KEY;
  static readonly DEFAULT_CONCURRENCY = DEFAULT_CONCURRENCY;
  static readonly TYPED_DEFAULT_CONCURRENCY = TYPED_DEFAULT_CONCURRENCY;
  static readonly CONCURRENCY_LIMITATION = CONCURRENCY_LIMITATION;

  /**
   * Returns the concurrency configuration
   */
  @Configuration.Key(CONCURRENCY_KEY)
  @Configuration.ConvertWith("ConcurrencyConfig.parse")
  @Configuration.ToMapValue("ConcurrencyConfig.render")
  concurrency(): Concurrency {
    return TYPED_DEFAULT_CONCURRENCY;
  }

  /**
   * Validates the concurrency configuration
   */
  @Configuration.Check
  validateConcurrency(): void {
    ConcurrencyValidatorService.validator().validate(
      this.concurrency().value(),
      CONCURRENCY_KEY,
      CONCURRENCY_LIMITATION
    );
  }

  /**
   * Parse user input into a Concurrency object
   */
  static parse(userInput: any): Concurrency {
    if (userInput instanceof Concurrency) return userInput;
    if (typeof userInput === "number") return new Concurrency(userInput);
    if (typeof userInput === "string") {
      const num = parseInt(userInput, 10);
      if (!isNaN(num)) return new Concurrency(num);
    }

    const type = userInput === null ? "null" : typeof userInput;
    throw new Error(
      formatWithLocale("Unsupported Concurrency input of type %s", type)
    );
  }

  /**
   * Convert a Concurrency object to a number for serialization
   */
  static render(concurrency: Concurrency): number {
    return concurrency.value();
  }
}
