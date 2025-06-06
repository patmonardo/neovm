import { ValueType } from '@/api';

/**
 * Represents a property definition in a file header.
 * Contains the position, key, and value type of a property as stored in the file.
 */
export class HeaderProperty {
  /**
   * Creates a new HeaderProperty.
   *
   * @param position The column position of this property in the file
   * @param propertyKey The name/key of the property
   * @param valueType The type of values this property contains
   */
  constructor(
    public readonly position: number,
    public readonly propertyKey: string,
    public readonly valueType: ValueType
  ) {}

  /**
   * Parses a property string from a file header into a HeaderProperty.
   * Expected format: "propertyName:valueType" (e.g., "name:string", "age:long")
   *
   * @param position The column position of this property
   * @param propertyString The property string to parse
   * @returns A new HeaderProperty instance
   * @throws Error if the property string format is invalid
   */
  static parse(position: number, propertyString: string): HeaderProperty {
    const propertyArgs = propertyString.split(':');

    if (propertyArgs.length !== 2 || propertyArgs[0].length === 0 || propertyArgs[1].length === 0) {
      throw HeaderProperty.wrongHeaderFormatException(propertyString);
    }

    return new HeaderProperty(
      position,
      propertyArgs[0],
      ValueType.fromCsvName(propertyArgs[1])
    );
  }

  /**
   * Creates an error for invalid header format.
   *
   * @param propertyString The invalid property string
   * @returns Error with descriptive message
   */
  private static wrongHeaderFormatException(propertyString: string): Error {
    return new Error(
      `Header property column does not have expected format <string>:<string>, got ${propertyString}`
    );
  }

  /**
   * Returns a string representation of this HeaderProperty.
   */
  toString(): string {
    return `HeaderProperty(position=${this.position}, propertyKey="${this.propertyKey}", valueType=${this.valueType})`;
  }

  /**
   * Checks equality with another HeaderProperty.
   */
  equals(other: HeaderProperty): boolean {
    return this.position === other.position &&
           this.propertyKey === other.propertyKey &&
           this.valueType === other.valueType;
  }

  /**
   * Returns a hash code for this HeaderProperty.
   */
  hashCode(): number {
    return this.position * 31 +
           this.propertyKey.length * 17 +
           this.valueType.valueOf();
  }
}
