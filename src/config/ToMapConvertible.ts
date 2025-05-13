/**
 * Interface for objects that can be converted to a map representation
 */
export interface ToMapConvertible {
  /**
   * Converts this object to a map representation
   * @returns A map with string keys and any values
   */
  toMap(): Record<string, any>;
}

/**
 * Converts a list of ToMapConvertible objects to a list of maps
 * @param data The list of objects to convert
 * @returns A list of maps
 */
export function toMap<T extends ToMapConvertible>(
  data: readonly T[]
): Record<string, any>[] {
  return data.map((item) => item.toMap());
}

/**
 * Type-safe version for when you know the value types
 */
export function toTypedMap<T extends ToMapConvertible, V>(
  data: readonly T[],
  valueTypeCheck?: (val: any) => val is V
): Record<string, V>[] {
  return data.map((item) => item.toMap() as Record<string, V>);
}
