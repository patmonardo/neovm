/**
 * Utilities for string formatting
 */

/**
 * Format a string with arguments using English locale
 */
export function formatWithLocale(template: string, ...inputs: any[]): string {
  // Replace %s, %d, etc. with corresponding arguments
  let index = 0;
  return template.replace(/%[sdiouxXfegG]/g, () => {
    if (index >= inputs.length) return '';
    const value = inputs[index++];
    if (value === undefined || value === null) return 'null';
    return String(value);
  });
}

/**
 * Format a number with underscore as the thousands separator
 */
export function formatNumber(number: number): string {
  return number.toLocaleString('en-US')
    .replace(/,/g, '_');
}

/**
 * Convert a string to lowercase using English locale
 */
export function toLowerCaseWithLocale(str: string): string {
  return str.toLocaleLowerCase('en-US');
}

/**
 * Convert a string to uppercase using English locale
 */
export function toUpperCaseWithLocale(str: string): string {
  return str.toLocaleUpperCase('en-US');
}

/**
 * Check if a string is empty, null or undefined
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str === '';
}
/**
 * Utilities for validating string identifiers
 */

// Pattern to check for leading or trailing whitespace
const LEADING_OR_TRAILING_WHITESPACES_PATTERN = /^\s|\s$/;

/**
 * Validates that a string doesn't have leading or trailing whitespace
 * @param input The string to validate
 * @param parameterName The name of the parameter for error messages
 * @returns The validated string or null
 * @throws Error if the string has leading or trailing whitespace
 */
export function validateNoWhiteCharacter(
  input: string | null | undefined,
  parameterName: string
): string | null {
  if (input !== null && input !== undefined && LEADING_OR_TRAILING_WHITESPACES_PATTERN.test(input)) {
    throw new Error(`\`${parameterName}\` must not end or begin with whitespace characters, but got \`${input}\`.`);
  }

  return input as string | null;
}

/**
 * Converts empty strings to null
 * @param input The string to check
 * @returns The string, or null if empty
 */
export function emptyToNull(input: string | null | undefined): string | null {
  return input === null || input === undefined || input === '' ? null : input;
}
