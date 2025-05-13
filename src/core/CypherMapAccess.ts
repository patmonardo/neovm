
import { StringSimilarity } from '../core/StringSimilarity';
import { ConfigKeyValidation, ImmutableStringAndScore } from '../utils/ConfigKeyValidation';
import { MissingParameterExceptions } from '../utils/MissingParameterExceptions';

/**
 * Interface for accessing a Cypher map configuration
 */
export interface CypherMapAccess {
  /**
   * Checks if the given key exists in the configuration
   */
  containsKey(key: string): boolean;

  /**
   * Returns all keys in the configuration
   */
  keySet(): string[];

  /**
   * Returns a long value as an integer
   */
  getLongAsInt(key: string): number;

  /**
   * Returns a typed value from the configuration
   */
  typedValue<V>(key: string, expectedType: new (...args: any[]) => V): V;

  /**
   * Returns a copy of the internal map
   */
  toMap(): Record<string, any>;
}

/**
 * Result of comparing mutually exclusive pairs
 */
export enum PairResult {
  FIRST_PAIR,
  SECOND_PAIR
}

/**
 * Static helper methods for CypherMapAccess
 */
export namespace CypherMapAccess {
  /**
   * Validates that a value is not null
   */
  export function failOnNull<T>(key: string, value: T | null): T {
    if (value === null || value === undefined) {
      throw MissingParameterExceptions.missingValueFor(key, new Set<string>());
    }
    return value;
  }

  /**
   * Validates that a string is not blank
   */
  export function failOnBlank(key: string, value: string | null | undefined): string {
    if (value === null || value === undefined || value.trim() === '') {
      throw blankValueFor(key, value);
    }
    return value;
  }

  /**
   * Creates an error for blank value
   */
  function blankValueFor(key: string, value: string | null | undefined): Error {
    return new Error(
      `\`${key}\` can not be null or blank, but it was \`${value}\``
    );
  }

  /**
   * Creates an error for out of range value
   */
  function outOfRangeError(
    key: string,
    value: number,
    min: string,
    max: string,
    minInclusive: boolean,
    maxInclusive: boolean
  ): Error {
    return new Error(
      `Value for \`${key}\` was \`${value}\`, but must be within the range ${minInclusive ? '[' : '('}${min}, ${max}${maxInclusive ? ']' : ')'}.`
    );
  }

  /**
   * Validates integer range
   */
  export function validateIntegerRange(
    key: string,
    value: number,
    min: number,
    max: number,
    minInclusive = true,
    maxInclusive = true
  ): number {
    const meetsLowerBound = minInclusive ? value >= min : value > min;
    const meetsUpperBound = maxInclusive ? value <= max : value < max;

    if (!meetsLowerBound || !meetsUpperBound) {
      throw outOfRangeError(
        key,
        value,
        min.toString(),
        max.toString(),
        minInclusive,
        maxInclusive
      );
    }

    return value;
  }

  /**
   * Validates long range
   */
  export function validateLongRange(
    key: string,
    value: number, // Using number in TypeScript instead of long
    min: number,
    max: number,
    minInclusive = true,
    maxInclusive = true
  ): number {
    return validateIntegerRange(key, value, min, max, minInclusive, maxInclusive);
  }

  /**
   * Validates double range
   */
  export function validateDoubleRange(
    key: string,
    value: number,
    min: number,
    max: number,
    minInclusive = true,
    maxInclusive = true
  ): number {
    const meetsLowerBound = minInclusive ? value >= min : value > min;
    const meetsUpperBound = maxInclusive ? value <= max : value < max;

    if (!meetsLowerBound || !meetsUpperBound) {
      throw outOfRangeError(
        key,
        value,
        min.toFixed(2),
        max.toFixed(2),
        minInclusive,
        maxInclusive
      );
    }

    return value;
  }
}
