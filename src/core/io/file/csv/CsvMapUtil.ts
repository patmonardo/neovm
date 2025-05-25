import { ElementIdentifier, RelationshipType } from '@/projection';

/**
 * Utility functions for serializing/deserializing maps to CSV format.
 * Maps are serialized as: "key1;value1;key2;value2;key3;value3;"
 */
export class CsvMapUtil {
  private static readonly LIST_DELIMITER = ';';

  private constructor() {
    // Utility class - no instantiation
  }

  /**
   * Convert relationship type counts to CSV string.
   * Format: "TYPE1;count1;TYPE2;count2;"
   */
  static relationshipCountsToString(map: Map<RelationshipType, number>): string {
    return CsvMapUtil.toString(
      map,
      (relType: RelationshipType) => relType.name,
      (count: number) => count.toString()
    );
  }

  /**
   * Parse map from CSV string format.
   * Input: "key1;value1;key2;value2;"
   * Output: Map<KEY, VALUE>
   */
  static fromString<KEY, VALUE>(
    mapString: string,
    keyParser: (str: string) => KEY,
    valueParser: (str: string) => VALUE
  ): Map<KEY, VALUE> {
    if (!mapString || mapString.trim() === '') {
      return new Map<KEY, VALUE>();
    }

    const listElements = mapString.split(CsvMapUtil.LIST_DELIMITER);
    const map = new Map<KEY, VALUE>();

    // Process pairs: [key, value, key, value, ...]
    for (let i = 0; i < listElements.length; i += 2) {
      if (i + 1 < listElements.length) {
        const key = keyParser(listElements[i]);
        const value = valueParser(listElements[i + 1]);
        map.set(key, value);
      }
    }

    return map;
  }

  /**
   * Convert relationship counts from CSV string.
   * Input: "KNOWS;500;LIKES;300;"
   * Output: Map<RelationshipType, number>
   */
  static relationshipCountsFromString(mapString: string): Map<RelationshipType, number> {
    return CsvMapUtil.fromString(
      mapString,
      (typeName: string) => RelationshipType.of(typeName),
      (countStr: string) => parseInt(countStr, 10)
    );
  }

  /**
   * Generic map to string conversion.
   * @param map The map to convert
   * @param keySerializer Function to convert key to string
   * @param valueSerializer Function to convert value to string
   * @returns CSV string format: "key1;value1;key2;value2;"
   */
  private static toString<KEY, VALUE>(
    map: Map<KEY, VALUE>,
    keySerializer: (key: KEY) => string,
    valueSerializer: (value: VALUE) => string
  ): string {
    // Sort keys for deterministic output (equivalent to Java sorted stream)
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const keyA = keySerializer(a);
      const keyB = keySerializer(b);
      return keyA.localeCompare(keyB);
    });

    const stringBuilder: string[] = [];

    for (const key of sortedKeys) {
      const value = map.get(key);
      if (value !== undefined) {
        stringBuilder.push(keySerializer(key));
        stringBuilder.push(CsvMapUtil.LIST_DELIMITER);
        stringBuilder.push(valueSerializer(value));
        stringBuilder.push(CsvMapUtil.LIST_DELIMITER);
      }
    }

    return stringBuilder.join('');
  }

  /**
   * Parse generic map from string with custom delimiters.
   */
  static fromStringWithDelimiter<KEY, VALUE>(
    mapString: string,
    keyParser: (str: string) => KEY,
    valueParser: (str: string) => VALUE,
    delimiter: string = CsvMapUtil.LIST_DELIMITER
  ): Map<KEY, VALUE> {
    if (!mapString || mapString.trim() === '') {
      return new Map<KEY, VALUE>();
    }

    const listElements = mapString.split(delimiter);
    const map = new Map<KEY, VALUE>();

    for (let i = 0; i < listElements.length; i += 2) {
      if (i + 1 < listElements.length && listElements[i].trim() && listElements[i + 1].trim()) {
        try {
          const key = keyParser(listElements[i].trim());
          const value = valueParser(listElements[i + 1].trim());
          map.set(key, value);
        } catch (error) {
          // Skip invalid entries (similar to Java's robust parsing)
          console.warn(`Failed to parse map entry: ${listElements[i]} -> ${listElements[i + 1]}`, error);
        }
      }
    }

    return map;
  }

  /**
   * Convert any map with ElementIdentifier keys to string.
   */
  static elementIdentifierMapToString<T extends ElementIdentifier, VALUE>(
    map: Map<T, VALUE>,
    valueSerializer: (value: VALUE) => string
  ): string {
    return CsvMapUtil.toString(
      map,
      (element: T) => element.name,
      valueSerializer
    );
  }

  /**
   * Convert node label counts to string.
   * Similar to relationshipCountsToString but for node labels.
   */
  static nodeLabelCountsToString(map: Map<ElementIdentifier, number>): string {
    return CsvMapUtil.elementIdentifierMapToString(map, (count: number) => count.toString());
  }

  /**
   * Parse node label counts from string.
   */
  static nodeLabelCountsFromString(mapString: string): Map<ElementIdentifier, number> {
    return CsvMapUtil.fromString(
      mapString,
      (labelName: string) => ({ name: labelName } as ElementIdentifier),
      (countStr: string) => parseInt(countStr, 10)
    );
  }
}
