import { MemoryEstimation } from '../mem/MemoryEstimation';
import { GraphMemoryEstimationService } from './GraphMemoryEstimationService';
import { MemoryEstimateDefinition } from '../mem/MemoryEstimateDefinition';
import { AlgorithmConfiguration } from '../config/AlgorithmConfiguration';

/**
 * Container for multiple algorithm memory estimations that can be combined.
 */
export class MultiAlgorithmMemoryEstimation {
  /**
   * List of algorithm definitions with their configurations.
   */
  private readonly definitions: Array<{
    definition: MemoryEstimateDefinition;
    config: AlgorithmConfiguration<any>;
  }> = [];

  /**
   * Adds an algorithm to the memory estimation.
   * 
   * @param definition The algorithm definition
   * @param config The algorithm configuration
   * @returns This object for method chaining
   */
  public add(
    definition: MemoryEstimateDefinition,
    config: AlgorithmConfiguration<any>
  ): MultiAlgorithmMemoryEstimation {
    this.definitions.push({ definition, config });
    return this;
  }

  /**
   * Creates a combined memory estimation for all algorithms.
   * 
   * @returns A memory estimation representing the maximum of all algorithm estimations
   */
  public estimate(): MemoryEstimation {
    const estimations: MemoryEstimation[] = this.definitions
      .map(({ definition }) => definition.memoryEstimation());
      
    return GraphMemoryEstimationService.combinedEstimation(estimations);
  }

  /**
   * Returns the list of algorithm definitions with configurations.
   * 
   * @returns The list of algorithm definitions
   */
  public getDefinitions(): Array<{
    definition: MemoryEstimateDefinition;
    config: AlgorithmConfiguration<any>;
  }> {
    return [...this.definitions];
  }
}