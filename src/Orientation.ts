/**
 * Enum representing different relationship orientations in a graph.
 */
export enum Orientation {
  /**
   * Use the natural direction of the relationship.
   */
  NATURAL,
  
  /**
   * Use the reverse direction of the relationship.
   */
  REVERSE,
  
  /**
   * Treat the relationship as undirected (both directions).
   */
  UNDIRECTED
}

/**
 * Extension methods and utilities for the Orientation enum.
 */
export namespace Orientation {
  /**
   * List of all valid orientation values as strings.
   */
  const VALUES: string[] = Object.keys(Orientation)
    .filter(key => isNaN(Number(key)))
    .map(key => key.toUpperCase());
  
  /**
   * Returns the inverse orientation.
   * 
   * @param orientation The orientation to invert
   * @returns The inverse orientation
   */
  export function inverse(orientation: Orientation): Orientation {
    switch (orientation) {
      case Orientation.NATURAL:
        return Orientation.REVERSE;
      case Orientation.REVERSE:
        return Orientation.NATURAL;
      case Orientation.UNDIRECTED:
        return Orientation.UNDIRECTED;
      default:
        throw new Error(`Unknown orientation: ${orientation}`);
    }
  }

  /**
   * Parses an orientation from a string or returns the input if it's already an Orientation.
   * 
   * @param input The input to parse
   * @returns The parsed Orientation
   * @throws Error if the input is not a valid Orientation or string
   */
  export function parse(input: any): Orientation {
    if (typeof input === 'string') {
      const inputString = input.toUpperCase();
      
      // Check if the string is a valid enum value
      if (VALUES.includes(inputString)) {
        return Orientation[inputString as keyof typeof Orientation] as Orientation;
      }
      
      throw new Error(
        `Orientation \`${inputString}\` is not supported. Must be one of: ${VALUES.join(', ')}.`
      );
    } else if (typeof input === 'number' && Object.values(Orientation).includes(input)) {
      return input;
    } else if (input instanceof Object && 'valueOf' in input && typeof input.valueOf() === 'number') {
      // Handle cases where the orientation might be wrapped in an object
      const value = input.valueOf();
      if (Object.values(Orientation).includes(value)) {
        return value as Orientation;
      }
    }
    
    throw new Error(
      `Expected Orientation or String. Got ${input?.constructor?.name || typeof input}.`
    );
  }

  /**
   * Converts an orientation to its string representation.
   * 
   * @param orientation The orientation to convert
   * @returns The string representation
   */
  export function toString(orientation: Orientation): string {
    return Orientation[orientation];
  }
}