/**
 * CSV MAP UTILITY - SIMPLE MAP SERIALIZATION
 *
 * Focused utility for serializing/deserializing maps to CSV-friendly strings.
 * Used for relationship counts in graph info CSV.
 */

import { RelationshipType } from '@/projection/RelationshipType';

export class CsvMapUtil {
  private static readonly LIST_DELIMITER = ';';

  private constructor() {} // Static utility class

  static relationshipCountsToString(map: Map<RelationshipType, number>): string {
    return this.toString(
      map,
      (key) => key.name(),
      (value) => value.toString()
    );
  }

  static fromString<K, V>(
    mapString: string,
    keyParser: (str: string) => K,
    valueParser: (str: string) => V
  ): Map<K, V> {
    if (mapString === '') {
      return new Map<K, V>();
    }

    const listElements = mapString.split(CsvMapUtil.LIST_DELIMITER);
    const map = new Map<K, V>();

    for (let i = 0; i < listElements.length; i += 2) {
      const key = keyParser(listElements[i]);
      const value = valueParser(listElements[i + 1]);
      map.set(key, value);
    }

    return map;
  }

  private static toString<K, V>(
    map: Map<K, V>,
    keySerializer: (key: K) => string,
    valueSerializer: (value: V) => string
  ): string {
    const parts: string[] = [];

    // Sort keys for consistent output
    const sortedKeys = Array.from(map.keys()).sort((a, b) =>
      keySerializer(a).localeCompare(keySerializer(b))
    );

    for (const key of sortedKeys) {
      const value = map.get(key)!;
      parts.push(keySerializer(key));
      parts.push(valueSerializer(value));
    }

    return parts.join(CsvMapUtil.LIST_DELIMITER);
  }
}
