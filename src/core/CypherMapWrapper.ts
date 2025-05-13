import { CypherMapAccess } from "./CypherMapAccess";

/**
 * Wrapper around configuration options map
 */
export class CypherMapWrapper implements CypherMapAccess {
  private readonly config: Map<string, any>;

  /**
   * Creates a new CypherMapWrapper from a config object
   */
  static create(config?: Record<string, any>): CypherMapWrapper {
    if (config === null || config === undefined) {
      return CypherMapWrapper.empty();
    }

    // Create case-insensitive map
    const configMap = new Map<string, any>();
    Object.entries(config).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        configMap.set(key.toLowerCase(), value);
      }
    });

    return new CypherMapWrapper(configMap);
  }

  /**
   * Creates an empty CypherMapWrapper
   */
  static empty(): CypherMapWrapper {
    return new CypherMapWrapper(new Map());
  }

  private constructor(config: Map<string, any>) {
    this.config = config;
  }

  /**
   * Checks if the map contains a key
   */
  containsKey(key: string): boolean {
    return this.config.has(key.toLowerCase());
  }

  /**
   * Returns all keys in the map
   */
  keySet(): string[] {
    return Array.from(this.config.keys());
  }
  /**
   * Converts the wrapper to a plain object
   * Implementation of the CypherMapAccess interface method
   */
  toMap(): Record<string, any> {
    const result: Record<string, any> = {};
    this.config.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Gets a string value
   */
  getString(key: string): string {
    return this.typedValue(key, String) as string;
  }

  /**
   * Gets a number value
   */
  getNumber(key: string): number {
    return this.typedValue(key, Number) as number;
  }

  /**
   * Gets a boolean value
   */
  getBoolean(key: string): boolean {
    return this.typedValue(key, Boolean) as boolean;
  }

  /**
   * Gets a map value
   */
  getMap(key: string): Record<string, any> {
    const value = this.config.get(key.toLowerCase());
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(
        `The value of \`${key}\` must be of type \`object\` but was \`${typeof value}\`.`
      );
    }
    return value as Record<string, any>;
  }
  /**
   * Implementation of the CypherMapAccess interface method
   */
  typedValue<V>(key: string, expectedType: new (...args: any[]) => V): V {
    if (!this.containsKey(key)) {
      throw new Error(`No value found for key: ${key}`);
    }
    const value = this.config.get(key.toLowerCase());
    return CypherMapWrapper.typedValue(key, expectedType, value);
  }

  /**
   * Gets a long value as an integer
   */
  getLongAsInt(key: string): number {
    const value = this.config.get(key.toLowerCase());
    // Handle possible numeric conversion
    if (typeof value === "number") {
      return Math.floor(value); // Convert to integer
    }
    return CypherMapWrapper.typedValue(key, Number, value) as number;
  }

  /**
   * Helper method for type checking and conversion
   */
  private static typedValue<V>(
    key: string,
    expectedType: { new (...args: any[]): V } | Function,
    value: any
  ): V {
    // Handle null/undefined case
    if (value === null || value === undefined) {
      throw new Error(
        `The value of \`${key}\` must be of type \`${expectedType.name}\` but was \`null\`.`
      );
    }

    // Special handling for primitive wrapper types
    const typeName = expectedType.name;

    switch (typeName) {
      case "Number":
        // Convert to number if needed
        if (typeof value === "string") {
          const num = parseFloat(value);
          if (!isNaN(num)) return num as unknown as V;
        }
        if (typeof value === "number") return value as unknown as V;
        break;

      case "Boolean":
        if (typeof value === "boolean") return value as unknown as V;
        if (value === "true") return true as unknown as V;
        if (value === "false") return false as unknown as V;
        break;

      case "String":
        if (typeof value === "string") return value as unknown as V;
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value) as unknown as V;
        }
        break;

      default:
        // For custom objects, use instanceof check
        if (value instanceof expectedType) {
          return value as unknown as V;
        }
    }

    // If we get here, the type conversion failed
    throw new Error(
      `The value of \`${key}\` must be of type \`${typeName}\` but was \`${typeof value}\`.`
    );
  }
}
