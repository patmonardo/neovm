/**
 * Utilities for comparing string similarity using Jaro-Winkler distance
 */
export class StringSimilarity {
  // Constants
  private static readonly REQUIRED_SIMILARITY = 0.8;
  private static readonly MAX_SCORE = 1.0;
  private static readonly MIN_SCORE = 0.0;
  private static readonly WINKLER_SCALING = 0.1;
  private static readonly MAX_PREFIX_LENGTH_BOOST = 4;

  /**
   * Format suggestions with a prefix message and similar candidates
   */
  public static prettySuggestions(prefix: string, value: string, candidates: string[]): string {
    const result = new StringBuilder(prefix);
    const similarCandidates = StringSimilarity.similarStrings(value, candidates);

    let suffix: string | null = null;
    if (similarCandidates.length === 0) {
      suffix = null;
    } else if (similarCandidates.length === 1) {
      suffix = `Did you mean \`${similarCandidates[0]}\`?`;
    } else {
      suffix = `Did you mean one of [\`${similarCandidates.join('\`, \`')}\`]?`;
    }

    if (suffix !== null) {
      result.append(' ').append(suffix);
    }

    return result.toString();
  }

  /**
   * Find strings in candidates that are similar to the given value
   */
  public static similarStrings(value: string, candidates: string[]): string[] {
    return StringSimilarity.similarStringsWithConverter(value, candidates, StringSimilarity.CASE_SENSITIVE);
  }

  /**
   * Find strings in candidates that are similar to the given value (case insensitive)
   */
  public static similarStringsIgnoreCase(value: string, candidates: string[]): string[] {
    return StringSimilarity.similarStringsWithConverter(value, candidates, StringSimilarity.CASE_INSENSITIVE);
  }

  /**
   * Calculate Jaro similarity between two strings
   */
  public static jaro(s1: string, s2: string): number {
    return StringSimilarity.jaroWithConverter(s1, s2, StringSimilarity.CASE_SENSITIVE);
  }

  /**
   * Calculate Jaro-Winkler similarity between two strings
   */
  public static jaroWinkler(s1: string, s2: string): number {
    return StringSimilarity.jaroWinklerWithConverter(s1, s2, StringSimilarity.CASE_SENSITIVE);
  }

  // Private implementation methods
  private static similarStringsWithConverter(
    value: string,
    candidates: string[],
    converter: CharConverter
  ): string[] {
    return candidates
      .map(candidate => ({
        string: candidate,
        value: StringSimilarity.jaroWinklerWithConverter(value, candidate, converter)
      }))
      .filter(candidate => candidate.value > StringSimilarity.REQUIRED_SIMILARITY)
      .sort((a, b) => b.value - a.value) // Sort descending by similarity
      .map(candidate => candidate.string);
  }

  private static jaroWithConverter(s1: string, s2: string, converter: CharConverter): number {
    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 && len2 === 0) {
      return StringSimilarity.MAX_SCORE;
    }
    if (len1 === 0 || len2 === 0) {
      return StringSimilarity.MIN_SCORE;
    }
    if (len1 === 1 && len2 === 1) {
      return converter(s1.charAt(0)) === converter(s2.charAt(0))
        ? StringSimilarity.MAX_SCORE
        : StringSimilarity.MIN_SCORE;
    }

    const searchRange = Math.floor(Math.max(len1, len2) / 2) - 1;
    const consumed2 = new Array(len2).fill(false);

    let numberOfMatches = 0;
    let numberOfTranspositions = 0;
    let matchIndex2 = 0;

    for (let i = 0; i < len1; i++) {
      const ch1 = converter(s1.charAt(i));

      const minBound = i > searchRange ? Math.max(0, i - searchRange) : 0;
      const maxBound = Math.min(len2 - 1, i + searchRange);

      if (minBound > maxBound) {
        continue;
      }

      for (let j = minBound; j <= maxBound; j++) {
        const ch2 = converter(s2.charAt(j));

        if (ch1 === ch2 && !consumed2[j]) {
          consumed2[j] = true;
          numberOfMatches += 1;

          if (j < matchIndex2) {
            numberOfTranspositions += 1;
          }
          matchIndex2 = j;
          break;
        }
      }
    }

    if (numberOfMatches === 0) {
      return StringSimilarity.MIN_SCORE;
    }

    const matches = numberOfMatches;
    return ((matches / len1) + (matches / len2) + ((matches - numberOfTranspositions) / matches)) / 3.0;
  }

  private static jaroWinklerWithConverter(s1: string, s2: string, converter: CharConverter): number {
    const jaro = StringSimilarity.jaroWithConverter(s1, s2, converter);

    let commonLength = Math.min(s1.length, s2.length);
    commonLength = Math.min(StringSimilarity.MAX_PREFIX_LENGTH_BOOST + 1, commonLength);

    let prefixLength;
    for (prefixLength = 0; prefixLength < commonLength; prefixLength++) {
      const ch1 = converter(s1.charAt(prefixLength));
      const ch2 = converter(s2.charAt(prefixLength));
      if (ch1 !== ch2) {
        break;
      }
    }

    const jaroWinkler = jaro + (StringSimilarity.WINKLER_SCALING * prefixLength * (1.0 - jaro));
    return Math.min(jaroWinkler, StringSimilarity.MAX_SCORE);
  }

  // Character converters
  private static readonly CASE_SENSITIVE: CharConverter = (c) => c;
  private static readonly CASE_INSENSITIVE: CharConverter = (c) => {
    return String.fromCharCode(c.charCodeAt(0)).toLowerCase();
  }

  // Private constructor to prevent instantiation
  private constructor() {
    throw new Error("No instances");
  }
}

// Helper types and classes
type CharConverter = (c: string) => string;

/**
 * Simple StringBuilder for string concatenation
 */
class StringBuilder {
  private parts: string[] = [];

  constructor(initial?: string) {
    if (initial) {
      this.parts.push(initial);
    }
  }

  append(text: string): StringBuilder {
    this.parts.push(text);
    return this;
  }

  toString(): string {
    return this.parts.join('');
  }
}
