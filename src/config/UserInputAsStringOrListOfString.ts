import { formatWithLocale } from "@/utils/StringFormatting";

/**
 * Interface representing a Neo4j graph database node
 */
export interface Node {
  // Basic Node interface
}

/**
 * Interface representing a Neo4j graph database relationship
 */
export interface Relationship {
  // Basic Relationship interface
}

/**
 * Interface representing a Neo4j graph database path
 */
export interface Path {
  // Basic Path interface
}

/**
 * Utility class for parsing user input that can be either a string or a list of strings
 */
export class UserInputAsStringOrListOfString {
  // Private constructor to prevent instantiation
  private constructor() {}

  /**
   * Parse user input into a list of strings
   * @param userInput The input to parse
   * @param configurationKey The configuration key (for error messages)
   * @returns A list of strings
   */
  public static parse(userInput: any, configurationKey: string): string[] {
    if (this.isIterable(userInput)) {
      const result: string[] = [];

      // Handle iterable inputs
      for (const item of userInput) {
        result.push(this.parseOne(item, configurationKey));
      }

      return result;
    }

    // Handle single value
    return [this.parseOne(userInput, configurationKey)];
  }

  /**
   * Parse a single item into a string
   * @param userInput The input to parse
   * @param configurationKey The configuration key (for error messages)
   * @returns A string
   */
  private static parseOne(userInput: any, configurationKey: string): string {
    if (typeof userInput === "string") {
      return userInput;
    }

    throw this.illegalArgumentException(userInput, configurationKey);
  }

  /**
   * Create an error for type mismatch
   * @param userInput The input that caused the error
   * @param configurationKey The configuration key
   * @returns An Error
   */
  private static illegalArgumentException(
    userInput: any,
    configurationKey: string
  ): Error {
    const type = this.typeOf(userInput);
    const message = formatWithLocale(
      "Type mismatch for %s: expected List<String> or String, but found %s",
      configurationKey,
      type
    );

    return new Error(message);
  }

  /**
   * Get a string representation of the type of an object
   * @param userInput The object to check
   * @returns A string representation of the type
   */
  public static typeOf(userInput: any): string {
    if (typeof userInput === "number") return "number";
    if (typeof userInput === "boolean") return "boolean";
    if (this.isNode(userInput)) return "node";
    if (this.isRelationship(userInput)) return "relationship";
    if (this.isPath(userInput)) return "path";
    if (this.isPlainObject(userInput)) return "map";
    if (Array.isArray(userInput)) return "list";

    throw new Error("Developer error, this should not happen");
  }

  /**
   * Check if an object is iterable
   */
  private static isIterable(obj: any): boolean {
    return (
      obj !== null &&
      typeof obj === "object" &&
      Symbol.iterator in obj &&
      typeof obj[Symbol.iterator] === "function"
    );
  }

  /**
   * Check if an object is a Neo4j Node
   */
  private static isNode(obj: any): obj is Node {
    // This would need proper implementation specific to your Neo4j interface
    return (
      obj !== null &&
      typeof obj === "object" &&
      obj.constructor?.name === "Node"
    );
  }

  /**
   * Check if an object is a Neo4j Relationship
   */
  private static isRelationship(obj: any): obj is Relationship {
    // This would need proper implementation specific to your Neo4j interface
    return (
      obj !== null &&
      typeof obj === "object" &&
      obj.constructor?.name === "Relationship"
    );
  }

  /**
   * Check if an object is a Neo4j Path
   */
  private static isPath(obj: any): obj is Path {
    // This would need proper implementation specific to your Neo4j interface
    return (
      obj !== null &&
      typeof obj === "object" &&
      obj.constructor?.name === "Path"
    );
  }

  /**
   * Check if an object is a plain object (map/dictionary)
   */
  private static isPlainObject(obj: any): boolean {
    return (
      obj !== null &&
      typeof obj === "object" &&
      Object.getPrototypeOf(obj) === Object.prototype
    );
  }
}
