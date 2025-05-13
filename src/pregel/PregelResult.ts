import { NodeValue } from './NodeValue';

/**
 * Represents the result of a Pregel computation.
 * This is an immutable value class containing the computed node values
 * and metadata about the computation.
 */
export interface PregelResult {
  /**
   * The computed node values after the Pregel computation completed
   */
  readonly nodeValues: NodeValue;
  
  /**
   * The number of iterations that were executed
   */
  readonly ranIterations: number;
  
  /**
   * Whether the algorithm converged before reaching max iterations
   * true = converged naturally, false = stopped after max iterations
   */
  readonly didConverge: boolean;
}

/**
 * Factory for creating immutable PregelResult instances
 */
export class PregelResults {
  /**
   * Create a new PregelResult instance
   */
  static of(nodeValues: NodeValue, ranIterations: number, didConverge: boolean): PregelResult {
    return {
      nodeValues,
      ranIterations,
      didConverge
    };
  }
}