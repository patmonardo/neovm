import { NodeLabel, RelationshipType } from '@/projection';
import { ValueType } from '@/api';

/**
 * Jackson-style converters for CSV parsing.
 * Simple utility converters that transform strings to domain types.
 */
export class JacksonConverters {
  /**
   * Converter for NodeLabel from string.
   */
  static class NodeLabelConverter {
    static convert(value: string): NodeLabel {
      return NodeLabel.of(value);
    }
  }

  /**
   * Converter for RelationshipType from string.
   */
  static class RelationshipTypeConverter {
    static convert(value: string): RelationshipType {
      return RelationshipType.of(value);
    }
  }

  /**
   * Converter for ValueType from string.
   * Uses the CSV name format for parsing.
   */
  static class ValueTypeConverter {
    static convert(value: string): ValueType {
      return ValueType.fromCsvName(value);
    }
  }
}
