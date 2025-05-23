import { ValueType } from '@/api/ValueType';
import { NodePropertyValues } from '../NodePropertyValues';
/**
 * Represents node property values that are arrays of longs (64-bit integers).
 * Extends the base NodePropertyValues interface.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.LongArrayNodePropertyValues.
 */
export interface LongArrayNodePropertyValues extends NodePropertyValues {
  /**
   * Returns the long array value for the given node ID.
   * This is the primary method for accessing the raw long array data.
   *
   * @param nodeId The ID of the node.
   * @returns A BigInt64Array if a value exists for the node, otherwise undefined.
   *          (Corresponds to Java's `long[] longArrayValue(long nodeId)`)
   *          Note: If not strictly using BigInt for longs, this could be `number[]`.
   */
  longArrayValue(nodeId: number): number[];

  /**
   * Returns the long array value as an object for the given node ID.
   * The original Java interface provides a default implementation that simply returns the result of `longArrayValue()`.
   * This typically overrides a more generic `getObject` from `NodePropertyValues` to be more specific.
   *
   * @param nodeId The ID of the node.
   * @returns The BigInt64Array value if it exists, otherwise undefined.
   *          (Corresponds to Java's `default Object getObject(long nodeId)`)
   */
  getObject(nodeId: number): number[];

  /**
   * Returns the specific type of values stored.
   * The original Java interface provides a default implementation returning `ValueType.LONG_ARRAY`.
   * This typically overrides a more generic `valueType` from `NodePropertyValues`.
   *
   * @returns `ValueType.LONG_ARRAY`
   *          (Corresponds to Java's `default ValueType valueType()`)
   */
  valueType(): ValueType;

  /**
   * Returns the dimension (length) of the long arrays.
   * The original Java interface provides a default implementation that typically checks the length
   * of the array returned by `longArrayValue(0)` (or a similar representative node).
   *
   * @returns The dimension of the long arrays, or undefined if it cannot be determined (e.g., no values).
   *          (Corresponds to Java's `default Optional<Integer> dimension()`)
   */
  dimension(): number | undefined;
}
