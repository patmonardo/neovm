import { Configuration } from "@/annotations/Configuration";
import { SeedConfig } from "./SeedConfig";

@Configuration
export abstract class ConsecutiveIdsConfig {
  /**
   * Whether to use consecutive IDs
   */
  consecutiveIds(): boolean {
    return false;
  }

  /**
   * Validates that consecutive IDs and seeding are not used together
   */
  @Configuration.Check
  forbidSeedingAndConsecutiveIds(): void {
    // Check if this instance is also a SeedConfig
    if (
      "isIncremental" in this &&
      typeof (this as any).isIncremental === "function"
    ) {
      const seedConfig = this as unknown as SeedConfig;

      if (seedConfig.isIncremental() && this.consecutiveIds()) {
        throw new Error(
          "Seeding and the `consecutiveIds` option cannot be used at the same time."
        );
      }
    }
  }
}
