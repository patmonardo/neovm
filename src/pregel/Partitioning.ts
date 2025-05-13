/**
 * Defines strategies for partitioning the graph during computation
 */
export enum Partitioning {
  /**
   * Partition nodes by range (sequential chunks)
   */
  RANGE = 'RANGE',
  
  /**
   * Partition nodes by degree (balancing computational load)
   */
  DEGREE = 'DEGREE',
  
  /**
   * Automatically select the best partitioning strategy
   */
  AUTO = 'AUTO'
}

/**
 * Utility functions for working with Partitioning enum
 */
export class PartitioningUtils {
  private static readonly VALUES: string[] = Object.values(Partitioning);
  
  /**
   * Parse a string or object into a Partitioning enum value
   * 
   * @param input The input to parse
   * @returns The corresponding Partitioning enum value, or undefined if input is invalid
   * @throws Error if the input string doesn't match any Partitioning value
   */
  static parse(input: any): Partitioning | undefined {
    if (typeof input === 'string') {
      const inputString = input.toUpperCase();
      
      if (!this.VALUES.includes(inputString)) {
        throw new Error(
          `Partitioning with name \`${inputString}\` does not exist. ` +
          `Available options are ${this.VALUES.join(', ')}.`
        );
      }
      
      return inputString as Partitioning;
    }
    
    return input as Partitioning;
  }
  
  /**
   * Convert a Partitioning enum value to string
   * 
   * @param partitioning The Partitioning enum value
   * @returns String representation of the enum
   */
  static toString(partitioning: Partitioning): string {
    return partitioning.toString();
  }
}