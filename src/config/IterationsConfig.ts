import { Configuration } from "@/annotations/Configuration";

/**
 * Configuration for algorithms that run for multiple iterations
 */
@Configuration
export abstract class IterationsConfig {
  /**
   * Returns the maximum number of iterations to run
   */
  @Configuration.IntegerRange({ min: 0 })
  public maxIterations(): number {
    return 100;
  }
}
