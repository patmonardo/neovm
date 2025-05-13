import { Configuration } from "@/annotations/Configuration";

@Configuration
export abstract class CommunitySizeConfig {
  /**
   * Returns the minimum community size, if configured
   */
  @Configuration.LongRange({ min: 1 })
  minCommunitySize(): number | undefined {
    return undefined;
  }
}
