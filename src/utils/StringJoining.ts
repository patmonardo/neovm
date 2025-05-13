/**
 * Utilities for joining string collections
 */

/**
 * Join a collection of items with commas
 * @param items The items to join
 * @returns A comma-separated string
 */
export function join(items: any[]): string {
  return items.join(', ');
}

/**
 * Join a collection of items with the specified delimiter
 * @param items The items to join
 * @param delimiter The delimiter to use
 * @returns A delimited string
 */
export function joinWithDelimiter(items: any[], delimiter: string): string {
  return items.join(delimiter);
}
