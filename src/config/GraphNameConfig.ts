/**
 * Interface for configurations that require a graph name
 */
export interface GraphNameConfig {
  /**
   * Returns the name of the graph
   */
  graphName(): string;
}
