/**
 * Configuration validation utilities.
 */
export class ConfigValidation {
  static validateRequired<T>(value: T | undefined | null, name: string): T {
    if (value === undefined || value === null) {
      throw new Error(`Configuration parameter '${name}' is required`);
    }
    return value;
  }

  static validatePositive(value: number, name: string): void {
    if (value <= 0) {
      throw new Error(
        `Configuration parameter '${name}' must be positive, got: ${value}`
      );
    }
  }

  static validateRange(
    value: number,
    min: number,
    max: number,
    name: string
  ): void {
    if (value < min || value > max) {
      throw new Error(
        `Configuration parameter '${name}' must be between ${min} and ${max}, got: ${value}`
      );
    }
  }

  static validatePath(path: string): void {
    if (!path || path.trim().length === 0) {
      throw new Error("Export path cannot be empty");
    }
  }

  static validateDatabaseName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Database name cannot be empty");
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(
        "Database name must start with letter and contain only alphanumeric characters and underscores"
      );
    }
  }

  static validateNodeProperties(properties: string[]): void {
    if (properties.length === 0) {
      throw new Error("featureProperties must contain at least one property");
    }
  }
}
