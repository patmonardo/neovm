import { StringSimilarity } from "./StringSimilarity"; // Assuming this utility will be translated

/**
 * Custom error class for illegal arguments, similar to Java's IllegalArgumentException.
 */
export class IllegalArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalArgumentError";
    // Set the prototype explicitly if targeting ES5 or older
    // Object.setPrototypeOf(this, IllegalArgumentError.prototype);
  }
}

/**
 * Utility class for creating exceptions related to missing parameters.
 * It provides helpful messages, including suggestions for similar parameter names.
 */
export class MissingParameterExceptions {
  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private constructor() {}

  /**
   * Creates an IllegalArgumentError for a missing parameter value.
   * @param key The name of the missing parameter.
   * @param candidates A collection of available parameter names to check for suggestions.
   * @returns An IllegalArgumentError instance.
   */
  public static missingValueFor(key: string, candidates: string[] | Set<string>): IllegalArgumentError {
    return new IllegalArgumentError(MissingParameterExceptions.missingValueForMessage(key, candidates));
  }

  /**
   * Generates a message for a missing parameter value, including suggestions.
   * @param key The name of the missing parameter.
   * @param candidates A collection of available parameter names to check for suggestions.
   * @returns The formatted error message string.
   */
  public static missingValueForMessage(key: string, candidates: string[] | Set<string>): string {
    // Ensure candidates is an array for StringSimilarity
    const candidateArray = Array.isArray(candidates) ? candidates : Array.from(candidates);
    const suggestions = StringSimilarity.similarStringsIgnoreCase(key, candidateArray);
    return MissingParameterExceptions.missingValueMessage(key, suggestions);
  }

  /**
   * Formats the error message based on the key and any suggestions.
   * This method is kept package-private (simulated by not exporting if it were in a larger module system
   * where only specific parts are exported, or by convention if all are exported).
   * For a direct class translation, it's a static method.
   * @param key The name of the missing parameter.
   * @param suggestions A list of similar parameter names.
   * @returns The formatted error message string.
   */
  static missingValueMessage(key: string, suggestions: string[]): string {
    if (suggestions.length === 0) {
      return `No value specified for the mandatory configuration parameter \`${key}\``;
    }
    if (suggestions.length === 1) {
      return `No value specified for the mandatory configuration parameter \`${key}\` (a similar parameter exists: [${suggestions[0]}])`;
    }
    return `No value specified for the mandatory configuration parameter \`${key}\` (similar parameters exist: [${suggestions.join(", ")}])`;
  }
}

// Example Usage:
// try {
//   const availableParams = ["configValue", "anotherConfig", "testParam"];
//   const userInput = "configValu"; // User made a typo
//
//   if (!availableParams.includes(userInput)) { // Simplified check
//     // throw MissingParameterExceptions.missingValueFor(userInput, availableParams);
//   }
// } catch (e) {
//   if (e instanceof IllegalArgumentError) {
//     console.error(e.message);
//     // Expected output might be:
//     // "No value specified for the mandatory configuration parameter `configValu` (a similar parameter exists: [configValue])"
//   }
// }
