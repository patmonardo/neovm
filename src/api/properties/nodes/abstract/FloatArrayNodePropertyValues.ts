import { ValueType } from "@/api/ValueType"; // Assuming ValueType is in @/api or similar path
import { NodePropertyValues } from "./NodePropertyValues";

/**
 * Represents node property values that are arrays of floats (32-bit).
 * Extends the base NodePropertyValues interface.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.FloatArrayNodePropertyValues.
 */
export interface FloatArrayNodePropertyValues
  extends NodePropertyValues {
  /**
   * Returns the float array value for the given node ID.
   * This is the primary method for accessing the raw float array data.
   *
   * @param nodeId The ID of the node.
   * @returns A Float32Array if a value exists for the node, otherwise undefined.
   *          (Corresponds to Java's `float[] floatArrayValue(long nodeId)`)
   */
  floatArrayValue(nodeId: number): Float32Array;

  /**
   * Returns the float array value for the given node ID, converted to a double array.
   * The original Java interface provides a default implementation for this conversion.
   *
   * @param nodeId The ID of the node.
   * @returns A Float64Array if a float array value exists and can be converted, otherwise undefined.
   *          (Corresponds to Java's `default double[] doubleArrayValue(long nodeId)`)
   */
  doubleArrayValue(nodeId: number): Float64Array;

  /**
   * Returns the float array value as an object for the given node ID.
   * The original Java interface provides a default implementation that simply returns the result of `floatArrayValue()`.
   * This typically overrides a more generic `getObject` from `NodePropertyValues` to be more specific.
   *
   * @param nodeId The ID of the node.
   * @returns The Float32Array value if it exists, otherwise undefined.
   *          (Corresponds to Java's `default Object getObject(long nodeId)`)
   */
  getObject(nodeId: number): Float32Array | undefined;

  /**
   * Returns the specific type of values stored.
   * The original Java interface provides a default implementation returning `ValueType.FLOAT_ARRAY`.
   * This typically overrides a more generic `valueType` from `NodePropertyValues`.
   *
   * @returns `ValueType.FLOAT_ARRAY`
   *          (Corresponds to Java's `default ValueType valueType()`)
   */
  valueType(): ValueType;

  /**
   * Returns the dimension (length) of the float arrays.
   * The original Java interface provides a default implementation that typically checks the length
   * of the array returned by `floatArrayValue(0)` (or a similar representative node).
   *
   * @returns The dimension of the float arrays, or undefined if it cannot be determined (e.g., no values).
   *          (Corresponds to Java's `default Optional<Integer> dimension()`)
   */
  dimension(): number | undefined;
}
