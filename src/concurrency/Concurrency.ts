/**
 * Represents a concurrency level (number of threads/workers) for parallel processing.
 */
export class Concurrency {
  private readonly _value: number;

  /**
   * Creates a new Concurrency instance with the specified value.
   * 
   * @param value The concurrency level (must be at least 1)
   * @throws Error if the value is less than 1
   */
  constructor(value: number) {
    if (value < 1) {
      throw new Error(`Valid values for Concurrency are int[1..]. Value provided was '${value}'.`);
    }
    this._value = value;
  }

  /**
   * Returns the concurrency level.
   */
  public value(): number {
    return this._value;
  }

  /**
   * Returns the square of the concurrency level.
   */
  public squared(): number {
    return this._value * this._value;
  }

  /**
   * Creates a concurrency level based on the available CPU cores.
   * 
   * @param defaultValue Default value to use if the number of cores cannot be determined
   * @returns A new Concurrency instance
   */
  public static availableCores(defaultValue: number = 4): Concurrency {
    // Get the number of logical processors available
    // For Node.js we would use os.cpus().length
    // For browsers we use navigator.hardwareConcurrency
    const cpuCount = typeof navigator !== 'undefined' 
      ? navigator.hardwareConcurrency 
      : (typeof process !== 'undefined' 
        ? require('os').cpus().length 
        : defaultValue);
        
    return new Concurrency(cpuCount);
  }

  /**
   * Creates a single-threaded concurrency level.
   * 
   * @returns A new Concurrency instance with value 1
   */
  public static singleThreaded(): Concurrency {
    return new Concurrency(1);
  }

  /**
   * Ensures the given value is a valid Concurrency object.
   * If a number is provided, it will be converted to a Concurrency object.
   * 
   * @param concurrency A Concurrency object or numeric value
   * @returns A valid Concurrency object
   */
  public static of(concurrency: Concurrency | number): Concurrency {
    if (concurrency instanceof Concurrency) {
      return concurrency;
    }
    return new Concurrency(concurrency);
  }

  /**
   * Returns a string representation of this Concurrency.
   */
  public toString(): string {
    return `Concurrency(${this._value})`;
  }

  /**
   * Compares this Concurrency with another object for equality.
   * 
   * @param other The object to compare with
   * @returns true if the other object is a Concurrency with the same value
   */
  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof Concurrency)) return false;
    return this._value === other._value;
  }

  /**
   * Returns a hash code for this Concurrency.
   */
  public hashCode(): number {
    return this._value;
  }
}