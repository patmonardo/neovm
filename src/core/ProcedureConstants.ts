/**
 * Contains constant values used throughout GDS procedures and core logic.
 * This module replaces the Java class `ProcedureConstants`.
 */
export namespace ProcedureConstants {
  // algos specific
  /**
   * Default tolerance value for algorithms that involve iterative convergence.
   */
  export const TOLERANCE_DEFAULT: number = 0.0001;

  // graph type params
  /**
   * Key used for specifying graph direction in configurations.
   */
  export const DIRECTION_KEY: string = "direction";

  /**
   * Default precision for histogram calculations.
   */
  export const HISTOGRAM_PRECISION_DEFAULT: number = 5;

  // The private constructor in Java `private ProcedureConstants() {}`
  // is implicitly handled by using a namespace, as namespaces cannot be instantiated.
  // If this were a class, we'd add `private constructor() {}`
}

// Example of accessing a constant:
// import { ProcedureConstants } from './ProcedureConstants';
// const tolerance = ProcedureConstants.TOLERANCE_DEFAULT;
