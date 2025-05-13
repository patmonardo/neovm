import { randomUUID } from 'crypto';

/**
 * Represents a unique identifier for a job.
 */
export class JobId {
  /**
   * An empty job ID.
   */
  public static readonly EMPTY: JobId = new JobId("");

  /**
   * Creates a new JobId with a random UUID.
   */
  constructor();

  /**
   * Creates a new JobId with the specified string value.
   * 
   * @param value The string value for this job ID
   */
  constructor(value: string);

  /**
   * Implementation that handles both constructors.
   */
  constructor(private readonly value: string = randomUUID()) {}

  /**
   * Returns the string value of this JobId.
   * 
   * @returns The string value
   */
  public asString(): string {
    return this.value;
  }

  /**
   * Parses an input object into a JobId.
   * 
   * @param input The object to parse (string or JobId)
   * @returns A JobId instance
   * @throws Error if the input is not a string or JobId
   */
  public static parse(input: any): JobId {
    if (typeof input === 'string') {
      return new JobId(input);
    } else if (input instanceof JobId) {
      return input;
    }

    throw new Error(
      `Expected JobId or String. Got ${input?.constructor?.name || typeof input}.`
    );
  }

  /**
   * Returns the string value of a JobId.
   * 
   * @param jobId The job ID
   * @returns The string value
   */
  public static asString(jobId: JobId): string {
    return jobId.asString();
  }

  /**
   * Returns the string representation of this JobId.
   * 
   * @returns The string representation
   */
  public toString(): string {
    return this.value;
  }

  /**
   * Checks if this JobId equals another object.
   * 
   * @param other The object to compare with
   * @returns True if the objects are equal
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof JobId)) return false;
    return this.value === other.value;
  }

  /**
   * Computes a hash code for this JobId.
   * 
   * @returns The hash code
   */
  public hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this.value.length; i++) {
      hash = ((hash << 5) - hash) + this.value.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
}