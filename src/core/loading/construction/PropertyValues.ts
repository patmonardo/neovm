import { GdsValue } from '@/values';
import { GdsNeo4jValueConverter } from '@/core/loading';

/**
 * Abstract interface for property values from different sources.
 * Provides unified access to properties whether they come from Cypher or native Maps.
 */
export abstract class PropertyValues {

  /**
   * Iterate over all property key-value pairs.
   */
  abstract forEach(consumer: (key: string, value: GdsValue) => void): void;

  /**
   * Check if no properties are present.
   */
  abstract isEmpty(): boolean;

  /**
   * Get the number of properties.
   */
  abstract size(): number;

  /**
   * Get all property keys.
   */
  abstract propertyKeys(): Iterable<string>;

  /**
   * Get the value for a specific property key.
   */
  abstract get(key: string): GdsValue | undefined;

  /**
   * Create PropertyValues from a Neo4j MapValue (Cypher context).
   */
  static ofMapValue(mapValue: MapValue): PropertyValues {
    return new CypherPropertyValues(mapValue);
  }

  /**
   * Create PropertyValues from a native Map.
   */
  static of(map: Map<string, GdsValue>): PropertyValues {
    return new NativePropertyValues(map);
  }

  /**
   * Create PropertyValues from a plain JavaScript object.
   */
  static ofObject(obj: Record<string, any>): PropertyValues {
    const map = new Map<string, GdsValue>();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, GdsValue.of(value));
    }
    return new NativePropertyValues(map);
  }

  /**
   * Create empty PropertyValues.
   */
  static empty(): PropertyValues {
    return new NativePropertyValues(new Map());
  }

  /**
   * Check if a property key exists.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Convert to a plain Map for easier manipulation.
   */
  toMap(): Map<string, GdsValue> {
    const result = new Map<string, GdsValue>();
    this.forEach((key, value) => result.set(key, value));
    return result;
  }

  /**
   * Convert to a plain JavaScript object.
   */
  toObject(): Record<string, any> {
    const result: Record<string, any> = {};
    this.forEach((key, value) => {
      result[key] = value.asObject();
    });
    return result;
  }

  /**
   * Get all property keys as an array.
   */
  keyArray(): string[] {
    return Array.from(this.propertyKeys());
  }

  /**
   * Filter properties by a predicate.
   */
  filter(predicate: (key: string, value: GdsValue) => boolean): PropertyValues {
    const filtered = new Map<string, GdsValue>();
    this.forEach((key, value) => {
      if (predicate(key, value)) {
        filtered.set(key, value);
      }
    });
    return new NativePropertyValues(filtered);
  }

  /**
   * Transform property values.
   */
  map(transformer: (key: string, value: GdsValue) => GdsValue): PropertyValues {
    const transformed = new Map<string, GdsValue>();
    this.forEach((key, value) => {
      transformed.set(key, transformer(key, value));
    });
    return new NativePropertyValues(transformed);
  }

  /**
   * Merge with another PropertyValues instance.
   */
  merge(other: PropertyValues): PropertyValues {
    const merged = this.toMap();
    other.forEach((key, value) => merged.set(key, value));
    return new NativePropertyValues(merged);
  }

  /**
   * Create a subset containing only the specified keys.
   */
  subset(keys: string[]): PropertyValues {
    const subset = new Map<string, GdsValue>();
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        subset.set(key, value);
      }
    }
    return new NativePropertyValues(subset);
  }
}

/**
 * PropertyValues implementation for native Maps.
 */
class NativePropertyValues extends PropertyValues {
  private readonly properties: Map<string, GdsValue>;

  constructor(properties: Map<string, GdsValue>) {
    super();
    this.properties = properties;
  }

  forEach(consumer: (key: string, value: GdsValue) => void): void {
    this.properties.forEach((value, key) => consumer(key, value));
  }

  isEmpty(): boolean {
    return this.properties.size === 0;
  }

  size(): number {
    return this.properties.size;
  }

  propertyKeys(): Iterable<string> {
    return this.properties.keys();
  }

  get(key: string): GdsValue | undefined {
    return this.properties.get(key);
  }

  toString(): string {
    const entries = Array.from(this.properties.entries())
      .map(([key, value]) => `${key}: ${value.toString()}`)
      .join(', ');
    return `NativePropertyValues{${entries}}`;
  }
}

/**
 * PropertyValues implementation for Neo4j MapValues (Cypher context).
 */
class CypherPropertyValues extends PropertyValues {
  private readonly properties: MapValue;

  constructor(properties: MapValue) {
    super();
    this.properties = properties;
  }

  forEach(consumer: (key: string, value: GdsValue) => void): void {
    this.properties.foreach((key, value) => {
      consumer(key, GdsNeo4jValueConverter.toValue(value));
    });
  }

  isEmpty(): boolean {
    return this.properties.isEmpty();
  }

  size(): number {
    return this.properties.size();
  }

  propertyKeys(): Iterable<string> {
    return this.properties.keySet();
  }

  get(key: string): GdsValue | undefined {
    const neoValue = this.properties.get(key);
    return neoValue ? GdsNeo4jValueConverter.toValue(neoValue) : undefined;
  }

  toString(): string {
    const entries: string[] = [];
    this.forEach((key, value) => {
      entries.push(`${key}: ${value.toString()}`);
    });
    return `CypherPropertyValues{${entries.join(', ')}}`;
  }
}

/**
 * Neo4j MapValue interface for interoperability.
 * This would typically come from Neo4j's internal types.
 */
export interface MapValue {
  foreach(consumer: (key: string, value: any) => void): void;
  isEmpty(): boolean;
  size(): number;
  keySet(): Iterable<string>;
  get(key: string): any;
}

/**
 * Builder for creating PropertyValues with validation.
 */
export class PropertyValuesBuilder {
  private readonly properties = new Map<string, GdsValue>();
  private readonly validators: PropertyValidator[] = [];

  /**
   * Add a property with automatic GdsValue conversion.
   */
  put(key: string, value: any): this {
    if (!key || key.trim().length === 0) {
      throw new Error('Property key cannot be empty');
    }

    const gdsValue = GdsValue.of(value);

    // Apply validators
    for (const validator of this.validators) {
      const result = validator.validate(key, gdsValue);
      if (!result.isValid) {
        throw new Error(`Property validation failed for '${key}': ${result.reason}`);
      }
    }

    this.properties.set(key.trim(), gdsValue);
    return this;
  }

  /**
   * Add a property with an already-converted GdsValue.
   */
  putGdsValue(key: string, value: GdsValue): this {
    if (!key || key.trim().length === 0) {
      throw new Error('Property key cannot be empty');
    }

    this.properties.set(key.trim(), value);
    return this;
  }

  /**
   * Add all properties from another PropertyValues instance.
   */
  putAll(other: PropertyValues): this {
    other.forEach((key, value) => this.putGdsValue(key, value));
    return this;
  }

  /**
   * Add all properties from a Map.
   */
  putAllMap(map: Map<string, any>): this {
    for (const [key, value] of map) {
      this.put(key, value);
    }
    return this;
  }

  /**
   * Add all properties from a plain object.
   */
  putAllObject(obj: Record<string, any>): this {
    for (const [key, value] of Object.entries(obj)) {
      this.put(key, value);
    }
    return this;
  }

  /**
   * Add a validator for property validation.
   */
  addValidator(validator: PropertyValidator): this {
    this.validators.push(validator);
    return this;
  }

  /**
   * Remove a property by key.
   */
  remove(key: string): this {
    this.properties.delete(key);
    return this;
  }

  /**
   * Clear all properties.
   */
  clear(): this {
    this.properties.clear();
    return this;
  }

  /**
   * Check if a property exists.
   */
  has(key: string): boolean {
    return this.properties.has(key);
  }

  /**
   * Get the current number of properties.
   */
  size(): number {
    return this.properties.size;
  }

  /**
   * Build the final PropertyValues instance.
   */
  build(): PropertyValues {
    return new NativePropertyValues(new Map(this.properties));
  }
}

/**
 * Interface for property validation.
 */
export interface PropertyValidator {
  validate(key: string, value: GdsValue): ValidationResult;
}

/**
 * Result of property validation.
 */
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Common property validators.
 */
export class PropertyValidators {
  /**
   * Validator that checks key naming conventions.
   */
  static keyNaming(): PropertyValidator {
    return {
      validate: (key, value) => {
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
          return {
            isValid: false,
            reason: 'Key must start with letter and contain only letters, digits, and underscores'
          };
        }
        return { isValid: true };
      }
    };
  }

  /**
   * Validator that checks value types.
   */
  static allowedTypes(...allowedTypes: string[]): PropertyValidator {
    return {
      validate: (key, value) => {
        const valueType = value.type();
        if (!allowedTypes.includes(valueType)) {
          return {
            isValid: false,
            reason: `Type '${valueType}' not allowed. Allowed types: ${allowedTypes.join(', ')}`
          };
        }
        return { isValid: true };
      }
    };
  }

  /**
   * Validator that checks numeric ranges.
   */
  static numericRange(min: number, max: number): PropertyValidator {
    return {
      validate: (key, value) => {
        if (value.type() === 'LONG' || value.type() === 'DOUBLE') {
          const numValue = value.asNumber();
          if (numValue < min || numValue > max) {
            return {
              isValid: false,
              reason: `Numeric value ${numValue} not in range [${min}, ${max}]`
            };
          }
        }
        return { isValid: true };
      }
    };
  }

  /**
   * Validator that checks string length.
   */
  static stringLength(maxLength: number): PropertyValidator {
    return {
      validate: (key, value) => {
        if (value.type() === 'STRING') {
          const strValue = value.asString();
          if (strValue.length > maxLength) {
            return {
              isValid: false,
              reason: `String length ${strValue.length} exceeds maximum ${maxLength}`
            };
          }
        }
        return { isValid: true };
      }
    };
  }

  /**
   * Validator that ensures values are not null.
   */
  static notNull(): PropertyValidator {
    return {
      validate: (key, value) => {
        if (value.isNull()) {
          return {
            isValid: false,
            reason: 'Null values are not allowed'
          };
        }
        return { isValid: true };
      }
    };
  }
}
