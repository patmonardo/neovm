import { GdsValue, PrimitiveValues } from '@/values';

/**
 * Property values container for graph construction.
 * Provides unified access to node/edge properties.
 */
export class PropertyValues {
  private readonly properties: Map<string, GdsValue>;

  constructor(properties: Map<string, GdsValue> = new Map()) {
    this.properties = new Map(properties);
  }

  /**
   * Iterate over all property key-value pairs.
   */
  forEach(consumer: (key: string, value: GdsValue) => void): void {
    this.properties.forEach((value, key) => consumer(key, value));
  }

  /**
   * Check if no properties are present.
   */
  isEmpty(): boolean {
    return this.properties.size === 0;
  }

  /**
   * Get the number of properties.
   */
  size(): number {
    return this.properties.size;
  }

  /**
   * Get all property keys.
   */
  propertyKeys(): Iterable<string> {
    return this.properties.keys();
  }

  /**
   * Get the value for a specific property key.
   */
  get(key: string): GdsValue | undefined {
    return this.properties.get(key);
  }

  /**
   * Check if a property key exists.
   */
  has(key: string): boolean {
    return this.properties.has(key);
  }

  /**
   * Create PropertyValues from a native Map.
   */
  static of(map: Map<string, GdsValue>): PropertyValues {
    return new PropertyValues(map);
  }

  /**
   * Create PropertyValues from a plain JavaScript object.
   */
  static ofObject(obj: Record<string, any>): PropertyValues {
    const map = new Map<string, GdsValue>();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, PrimitiveValues.create(value));
    }
    return new PropertyValues(map);
  }

  /**
   * Create empty PropertyValues.
   */
  static empty(): PropertyValues {
    return new PropertyValues();
  }

  /**
   * Convert to a plain Map.
   */
  toMap(): Map<string, GdsValue> {
    return new Map(this.properties);
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
}
