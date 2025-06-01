/**
 * Class that holds node property dimensions.
 * It is null-safe and will never return a null value.
 */
export class DimensionsMap {
  /**
   * Map of property keys to their optional dimensions
   */
  private readonly actualDimensions: Map<string, number | undefined>;

  /**
   * Creates a new DimensionsMap.
   *
   * @param actualDimensions Map of property keys to their dimensions
   */
  constructor(actualDimensions: Map<string, number | undefined>) {
    this.actualDimensions = actualDimensions;
  }

  /**
   * Returns the dimension for the specified property, or undefined if no information exists.
   * <p>
   * There are two cases when undefined will be returned:
   *     1) The property doesn't exist.
   *     2) The property exists, but dimension information is not known.
   *
   * @param propertyKey The property key to look up
   * @returns The dimension value, or undefined if not available
   */
  public get(propertyKey: string): number | undefined {
    return this.actualDimensions.get(propertyKey) ?? undefined;
  }

  /**
   * Checks if this map equals another object.
   *
   * @param other The object to compare with
   * @returns True if the objects are equal
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof DimensionsMap)) return false;

    const thisEntries = Array.from(this.actualDimensions.entries());
    const otherEntries = Array.from(other.actualDimensions.entries());

    if (thisEntries.length !== otherEntries.length) return false;

    for (const [key, value] of thisEntries) {
      if (!other.actualDimensions.has(key)) return false;
      if (other.actualDimensions.get(key) !== value) return false;
    }

    return true;
  }

  /**
   * Computes a hash code for this map.
   *
   * @returns The hash code
   */
  public hashCode(): number {
    let result = 0;
    for (const [key, value] of this.actualDimensions.entries()) {
      // Simple string hash for keys
      let keyHash = 0;
      for (let i = 0; i < key.length; i++) {
        keyHash = (keyHash << 5) - keyHash + key.charCodeAt(i);
        keyHash |= 0; // Convert to 32bit integer
      }

      result += keyHash ^ (value !== undefined ? value : 0);
    }
    return result;
  }

  /**
   * Returns a string representation of this map.
   *
   * @returns A string representation
   */
  public toString(): string {
    return `DimensionsMap{actualDimensions=${JSON.stringify(
      Object.fromEntries(this.actualDimensions)
    )}}`;
  }
}
