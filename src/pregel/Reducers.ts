import { Reducer, Reducers as ReducerImpl } from './Reducer';

/**
 * Utility class for working with Reducer instances
 */
export class Reducers {
  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {}
  
  /**
   * Parse a string or Reducer object into a Reducer instance
   * 
   * @param reducer The reducer specification as string or Reducer object
   * @returns A Reducer instance
   * @throws Error if the reducer cannot be parsed
   */
  static parse(reducer: unknown): Reducer {
    if (typeof reducer === 'string') {
      const upperReducer = reducer.toUpperCase();
      
      switch (upperReducer) {
        case 'SUM':
          return new ReducerImpl.Sum();
        case 'MIN':
          return new ReducerImpl.Min();
        case 'MAX':
          return new ReducerImpl.Max();
        case 'COUNT':
          return new ReducerImpl.Count();
        default:
          throw new Error(`Unknown reducer: \`${reducer}\``);
      }
    }
    
    if (this.isReducer(reducer)) {
      return reducer;
    }
    
    throw new Error(`Unknown reducer: \`${reducer}\``);
  }
  
  /**
   * Convert a Reducer to its string representation
   * 
   * @param reducer The reducer to convert
   * @returns The string representation of the reducer
   */
  static toString(reducer: Reducer): string {
    // Get the constructor name and convert to uppercase
    // This mimics the Java behavior of using the simple class name
    const constructorName = reducer.constructor.name;
    return constructorName.toUpperCase();
  }
  
  /**
   * Type guard to check if an object is a Reducer
   */
  private static isReducer(obj: any): obj is Reducer {
    return obj && 
      typeof obj.reduce === 'function' && 
      typeof obj.identity === 'function';
  }
}