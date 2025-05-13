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
 * Check if a string is empty
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str === '';
}
