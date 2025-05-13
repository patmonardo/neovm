import { formatWithLocale } from "@/utils/StringFormatting";

/**
 * Interface representing a Neo4j graph database node
 */
export interface Node {
  getId(): number;
}

/**
 * Utility class for parsing node IDs from various input formats
 */
export class NodeIdParser {
  // Private constructor to prevent instantiation
  private constructor() {}

  /**
   * User input is one of
   *     * number
   *     * Node
   *     * Iterable with one or more elements, where each element is one of the above
   *
   * @param input The input to parse
   * @param parameterName The name of the parameter (for error messages)
   * @returns An array of node IDs
   */
  public static parseToListOfNodeIds(
    input: any,
    parameterName: string
  ): number[] {
    const nodeIds: number[] = [];

    if (this.isIterable(input)) {
      for (const item of input) {
        nodeIds.push(this.parseNodeId(item, parameterName));
      }
    } else {
      nodeIds.push(this.parseNodeId(input, parameterName));
    }

    return nodeIds;
  }

  /**
   * User input is one of
   *     * number
   *     * Node
   *     * Collection with a single element, where that element is one of the above
   *
   * @param input The input to parse
   * @param parameterName The name of the parameter (for error messages)
   * @returns A single node ID
   */
  public static parseToSingleNodeId(input: any, parameterName: string): number {
    if (Array.isArray(input) || this.isIterable(input)) {
      const collection = Array.isArray(input) ? input : Array.from(input);

      if (collection.length !== 1) {
        throw new Error(
          formatWithLocale(
            "Failed to parse `%s` as a single node ID. A collection can be parsed if it contains a single element, but this `%s` contains `%s` elements.",
            parameterName,
            this.getConstructorName(collection),
            collection.length
          )
        );
      }
      input = collection[0];
    }

    if (typeof input === "number") {
      return BigInt(input);
    }

    if (this.isNode(input)) {
      return input.getId();
    }

    throw new Error(
      formatWithLocale(
        "Failed to parse `%s` as a single node ID. A Node, a Number or a collection containing a single Node or Number can be parsed, but this `%s` cannot.",
        parameterName,
        this.getConstructorName(input)
      )
    );
  }

  /**
   * Helper method to parse a single node ID
   */
  private static parseNodeId(input: any, parameterName: string): number {
    if (this.isNode(input)) {
      return input.getId();
    }

    if (typeof input === "number") {
      return BigInt(input);
    }

    throw new Error(
      formatWithLocale(
        "Failed to parse `%s` as a List of node IDs. A Node, Number or collection of the same can be parsed, but this `%s` cannot.",
        parameterName,
        this.getConstructorName(input)
      )
    );
  }

  /**
   * Type guard to check if an object is a Node
   */
  private static isNode(obj: any): obj is Node {
    return (
      obj !== null && typeof obj === "object" && typeof obj.getId === "function"
    );
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
   * Get the constructor name of an object (for error messages)
   */
  private static getConstructorName(obj: any): string {
    return obj?.constructor?.name || typeof obj;
  }
}
