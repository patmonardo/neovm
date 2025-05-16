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
  UNDIRECTED,
}

/**
 * Extension methods and utilities for the Orientation enum.
 */
export namespace Orientation {
  /**
   * List of all valid orientation values as strings.
   */
  const VALID_STRING_KEYS: string[] = Object.keys(Orientation)
    .filter((key) => isNaN(Number(key)))
    .map((key) => key.toUpperCase());

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
   * Parses a value into an Orientation enum member.
   * Accepts an Orientation enum member directly or a string representation (case-insensitive).
   *
   * @param value The value to parse (Orientation enum member or string)
   * @returns The corresponding Orientation enum member
   * @throws TypeError if the input is not a valid Orientation or a parsable string.
   * @throws Error if the string is not a recognized Orientation name.
   */
  export function parse(value: any): Orientation {
    // 1. Check if it's already an Orientation enum member (by checking its numeric value)
    if (typeof value === "number" && Orientation[value] !== undefined) {
      return value as Orientation;
    }

    // 2. Check if it's a string
    if (typeof value === "string") {
      const upperValue = value.toUpperCase();
      const matchedKey = VALID_STRING_KEYS.find((key) => key === upperValue);

      if (matchedKey) {
        // Convert string key to enum member
        return Orientation[
          matchedKey as keyof typeof Orientation
        ] as unknown as Orientation;
      }
      // Invalid string
      throw new Error(
        `Orientation \`${value.toUpperCase()}\` is not supported. Must be one of: ${VALID_STRING_KEYS.join(
          ", "
        )}.`
      );
    }

    // 3. For any other type, throw a TypeError
    const typeReceived = value === null ? "null" : typeof value;
    throw new TypeError(
      `Invalid input for Orientation.parse. Expected a string or an Orientation enum value. Got ${typeReceived}.`
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

  export function name(orientation: Orientation): string {
    return Orientation[orientation];
  }
}
