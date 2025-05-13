import { NodePropertyValues } from './NodePropertyValues';
import { ValueType } from '../../ValueType'; // Assuming ValueType is in @/api or similar path

/**
 * Represents node property values that are scalar longs (64-bit integers).
 * Extends the base NodePropertyValues interface.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.LongNodePropertyValues.
 */
export interface LongNodePropertyValues extends NodePropertyValues {
  /**
   * Returns the long value for the given node ID.
   *
   * @param nodeId The ID of the node.
   * @returns The long value as a bigint.
   *          (Corresponds to Java's `long longValue(long nodeId)`)
   */
  longValue(nodeId: number): number;

  /**
   * Returns the long value as an object (still a bigint in this context) for the given node ID.
   * The original Java interface provides a default implementation that simply returns the result of `longValue()`.
   *
   * @param nodeId The ID of the node.
   * @returns The bigint value.
   *          (Corresponds to Java's `default Object getObject(long nodeId)`)
   */
  getObject(nodeId: number): number;

  /**
   * Returns the specific type of values stored.
   * The original Java interface provides a default implementation returning `ValueType.LONG`.
   *
   * @returns `ValueType.LONG`
   *          (Corresponds to Java's `default ValueType valueType()`)
   */
  valueType(): ValueType.LONG;

  /**
   * Returns the dimension of this property. For scalar longs, this is always 1.
   * The original Java interface provides a default implementation returning `Optional.of(1)`.
   *
   * @returns The dimension (always 1 for scalar longs).
   *          (Corresponds to Java's `default Optional<Integer> dimension()`)
   */
  dimension(): number; // In TS, if it's always 1, we can make it non-optional. Or number | undefined if it could be unknown. Java default is always 1.

  /**
   * Returns the long value for the given node ID, converted to a double.
   * The original Java interface provides a default implementation for this conversion,
   * handling a specific default fallback value.
   *
   * @param nodeId The ID of the node.
   * @returns The value as a number (double).
   *          (Corresponds to Java's `default double doubleValue(long nodeId)`)
   */
  doubleValue(nodeId: number): number;

  /**
   * Returns the maximum long property value across all nodes.
   * The original Java interface provides a default implementation that iterates through all nodes.
   *
   * @returns The maximum value as a bigint, or undefined if no values exist or cannot be determined.
   *          (Corresponds to Java's `default OptionalLong getMaxLongPropertyValue()`)
   */
  getMaxLongPropertyValue(): number | undefined;
}
