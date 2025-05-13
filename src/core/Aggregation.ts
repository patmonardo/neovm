/**
 * Defines different methods for aggregating values in a graph.
 */
export enum Aggregation {
  /**
   * Placeholder for the default aggregation of a loader.
   */
  DEFAULT,

  /**
   * No aggregation, multiple relationships between same nodes are not expected.
   */
  NONE,

  /**
   * Keep the first value, ignore subsequent values.
   */
  SINGLE,

  /**
   * Sum all values together.
   */
  SUM,

  /**
   * Take the minimum value.
   */
  MIN,

  /**
   * Take the maximum value.
   */
  MAX,

  /**
   * Count occurrences (each value contributes 1).
   */
  COUNT,
}

/**
 * Extension methods and utilities for the Aggregation enum.
 */
export namespace Aggregation {
  /**
   * Merges values based on the specified aggregation method.
   *
   * @param aggregation The aggregation method
   * @param runningTotal The current running total
   * @param value The new value to merge
   * @returns The merged result
   */
  export function merge(
    aggregation: Aggregation,
    runningTotal: number,
    value: number
  ): number {
    switch (aggregation) {
      case Aggregation.DEFAULT:
        throw new Error(
          "This should never be used as a valid aggregation, " +
            "just as a placeholder for the default aggregation of a given loader."
        );
      case Aggregation.NONE:
        throw new Error(
          "Multiple relationships between the same pair of nodes are not expected. " +
            "Try using SINGLE or some other aggregation."
        );
      case Aggregation.SINGLE:
        return runningTotal;
      case Aggregation.SUM:
      case Aggregation.COUNT: // COUNT works the same as SUM for merge
        return runningTotal + value;
      case Aggregation.MIN:
        return Math.min(runningTotal, value);
      case Aggregation.MAX:
        return Math.max(runningTotal, value);
      default:
        throw new Error(`Unknown aggregation: ${aggregation}`);
    }
  }

  /**
   * Normalizes a property value for a specific aggregation method.
   *
   * @param aggregation The aggregation method
   * @param value The value to normalize
   * @returns The normalized value
   */
  export function normalizePropertyValue(
    aggregation: Aggregation,
    value: number
  ): number {
    if (aggregation === Aggregation.COUNT) {
      return 1.0;
    }
    return value;
  }

  /**
   * Returns the empty (initial) value for an aggregation method.
   *
   * @param aggregation The aggregation method
   * @param mappingDefaultValue The default value from mapping
   * @returns The appropriate empty value for the aggregation
   */
  export function emptyValue(
    aggregation: Aggregation,
    mappingDefaultValue: number
  ): number {
    switch (aggregation) {
      case Aggregation.SUM:
      case Aggregation.COUNT:
        return isNaN(mappingDefaultValue) ? 0 : mappingDefaultValue;
      case Aggregation.MIN:
        return isNaN(mappingDefaultValue)
          ? Number.POSITIVE_INFINITY
          : mappingDefaultValue;
      case Aggregation.MAX:
        return isNaN(mappingDefaultValue)
          ? Number.NEGATIVE_INFINITY
          : mappingDefaultValue;
      default:
        return mappingDefaultValue;
    }
  }
  /**
   * Parses an aggregation from a string or returns the input if it's already an Aggregation.
   *
   * @param input The input to parse
   * @returns The parsed Aggregation
   * @throws Error if the input is not a valid Aggregation or string
   */
  export function parse(input: any): Aggregation {
    // If it's already a valid enum value, return it
    if (
      typeof input === "number" &&
      input >= 0 &&
      input < Object.keys(Aggregation).length / 2
    ) {
      return input;
    }

    // If it's a string, try to parse it
    if (typeof input === "string") {
      const upperInput = input.toUpperCase();

      // Get only the string keys (filter out numeric keys)
      const validKeys = Object.keys(Aggregation).filter((k) =>
        isNaN(Number(k))
      );

      // Check if the string is a valid enum name
      if (validKeys.includes(upperInput)) {
        return Aggregation[
          upperInput as keyof typeof Aggregation
        ] as Aggregation;
      }

      // Not a valid enum value
      throw new Error(
        `Aggregation \`${input}\` is not supported. Must be one of: ${validKeys.join(
          ", "
        )}.`
      );
    }

    // Neither a valid number nor string
    throw new Error(
      `Expected Aggregation or String. Got ${
        input?.constructor?.name || typeof input
      }.`
    );
  }

  /**
   * Resolves DEFAULT to NONE, otherwise returns the input aggregation.
   *
   * @param aggregation The aggregation to resolve
   * @returns The resolved aggregation
   */
  export function resolve(aggregation: Aggregation): Aggregation {
    return aggregation === Aggregation.DEFAULT ? Aggregation.NONE : aggregation;
  }

  /**
   * Converts an aggregation to its string representation.
   *
   * @param aggregation The aggregation to convert
   * @returns The string representation
   */
  export function toString(aggregation: Aggregation): string {
    return Aggregation[aggregation];
  }

  /**
   * Checks if an aggregation is equivalent to NONE.
   *
   * @param aggregation The aggregation to check
   * @returns True if the aggregation is equivalent to NONE
   */
  export function equivalentToNone(aggregation: Aggregation): boolean {
    return resolve(aggregation) === Aggregation.NONE;
  }

  /**
   * Checks if this aggregation equals another object.
   * For enums, we can directly compare the values.
   *
   * @param aggregation The aggregation to compare
   * @param other The other object
   * @returns True if the aggregations are equal
   */
  export function equals(aggregation: Aggregation, other: any): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    if (typeof other === "number") {
      // Direct enum value comparison
      return aggregation === other;
    }

    // Otherwise, try to parse and compare
    try {
      const parsedOther = parse(other);
      return aggregation === parsedOther;
    } catch {
      return false;
    }
  }

  /**
   * Computes a hash code for this aggregation.
   * For enums, the numeric value itself serves as a good hash.
   *
   * @param aggregation The aggregation to hash
   * @returns The hash code
   */
  export function hashCode(aggregation: Aggregation): number {
    return aggregation;
  }
}
