import { ValueType } from '@/api/ValueType';

/**
 * Functional interface for consuming property key-value pairs with type information.
 * Used throughout the GDS file I/O system for processing properties when type
 * information is needed for serialization or validation.
 *
 * @example
 * ```typescript
 * const consumer: PropertyWithTypeConsumer = (key, value, type) => {
 *   console.log(`Property ${key} = ${value} (type: ${type})`);
 * };
 *
 * consumer("name", "Alice", ValueType.STRING);
 * consumer("age", 30, ValueType.LONG);
 * consumer("scores", [95.5, 87.2], ValueType.DOUBLE_ARRAY);
 * ```
 */
export interface PropertyWithTypeConsumer {
  /**
   * Accepts a property key-value pair with type information for processing.
   *
   * @param key The property key/name
   * @param value The property value (can be any type)
   * @param type The ValueType indicating the expected type of the value
   */
  accept(key: string, value: any, type: ValueType): void;
}
