import { AlgoBaseConfig } from "./AlgoBaseConfig";
import { Configuration } from "@/annotations/Configuration";

/**
 * Base configuration for algorithm configurations that support graph mutation operations
 */
@Configuration
export abstract class MutateConfig extends AlgoBaseConfig {
  // This is a marker class that extends AlgoBaseConfig without adding any additional methods
}
