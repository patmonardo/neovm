import { LongNodePropertyValues } from '../abstract/LongNodePropertyValues';
import { DoubleNodePropertyValues } from '../abstract/DoubleNodePropertyValues';
import { NodePropertyValues } from '../NodePropertyValues'; // The general base type
import { LongNodePropertyValuesAdapter } from '../abstract/LongNodePropertyValuesAdapter';
import { DoubleNodePropertyValuesAdapter } from './DoubleNodePropertyValuesAdapter';
import { HugeLongArray } from '@/collections/ha/HugeLongArray';
import { HugeIntArray } from '@/collections/ha/HugeIntArray';
import { HugeByteArray } from '@/collections/ha/HugeByteArray';
import { HugeDoubleArray } from '@/collections/ha/HugeDoubleArray';
import { HugeObjectArray } from '@/collections/ha/HugeObjectArray'; // Generic type
import { HugeAtomicLongArray } from '@/collections/haa/HugeAtomicLongArray';
import { HugeAtomicDoubleArray } from '@/collections/haa/HugeAtomicDoubleArray';

/**
 * A facade adapter class that provides static methods to adapt various "Huge" array types
 * to their corresponding NodePropertyValues interfaces.
 * It delegates to more specific adapter classes.
 * This is a direct translation of GDS's org.neo4j.gds.api.properties.nodes.NodePropertyValuesAdapter.
 */
export class NodePropertyValuesAdapter {
  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private constructor() {}

  /**
   * Adapts a HugeLongArray to LongNodePropertyValues.
   * @param hugeLongArray The array to adapt.
   * @returns A LongNodePropertyValues instance.
   */
  public static adapt(hugeLongArray: HugeLongArray): LongNodePropertyValues;
  /**
   * Adapts a HugeIntArray to LongNodePropertyValues.
   * @param hugeIntArray The array to adapt.
   * @returns A LongNodePropertyValues instance.
   */
  public static adapt(hugeIntArray: HugeIntArray): LongNodePropertyValues;
  /**
   * Adapts a HugeByteArray to LongNodePropertyValues.
   * @param hugeByteArray The array to adapt.
   * @returns A LongNodePropertyValues instance.
   */
  public static adapt(hugeByteArray: HugeByteArray): LongNodePropertyValues;
  /**
   * Adapts a HugeDoubleArray to DoubleNodePropertyValues.
   * @param hugeDoubleArray The array to adapt.
   * @returns A DoubleNodePropertyValues instance.
   */
  public static adapt(hugeDoubleArray: HugeDoubleArray): DoubleNodePropertyValues;
  /**
   * Adapts a HugeAtomicLongArray to LongNodePropertyValues.
   * @param hugeAtomicLongArray The array to adapt.
   * @returns A LongNodePropertyValues instance.
   */
  public static adapt(hugeAtomicLongArray: HugeAtomicLongArray): LongNodePropertyValues;
  /**
   * Adapts a HugeAtomicDoubleArray to DoubleNodePropertyValues.
   * @param hugeAtomicDoubleArray The array to adapt.
   * @returns A DoubleNodePropertyValues instance.
   */
  public static adapt(hugeAtomicDoubleArray: HugeAtomicDoubleArray): DoubleNodePropertyValues;
  /**
   * Adapts a HugeObjectArray to NodePropertyValues.
   * The specific type of NodePropertyValues will depend on the ObjectNodePropertyValuesAdapter.
   * @param hugeObjectArray The array to adapt.
   * @returns A NodePropertyValues instance.
   */
  public static adapt(hugeObjectArray: HugeObjectArray<any>): NodePropertyValues; // Using 'any' for the generic type for now

  // Implementation of the overloaded adapt method
  public static adapt(
    array:
      | HugeLongArray
      | HugeIntArray
      | HugeByteArray
      | HugeDoubleArray
      | HugeAtomicLongArray
      | HugeAtomicDoubleArray
      | HugeObjectArray<any> // Using 'any' for the generic type for now
  ): NodePropertyValues { // Return type is the most general NodePropertyValues
    if (array instanceof HugeLongArray) {
      return LongNodePropertyValuesAdapter.adaptFromHugeLongArray(array);
    }
    if (array instanceof HugeIntArray) {
      return LongNodePropertyValuesAdapter.adaptFromHugeIntArray(array);
    }
    if (array instanceof HugeByteArray) {
      return LongNodePropertyValuesAdapter.adaptFromHugeByteArray(array);
    }
    if (array instanceof HugeDoubleArray) {
      // Assuming DoubleNodePropertyValuesAdapter has a method like 'adapt' or 'adaptFromHugeDoubleArray'
      return DoubleNodePropertyValuesAdapter.adapt(array);
    }
    if (array instanceof HugeAtomicLongArray) {
      return LongNodePropertyValuesAdapter.adaptFromHugeAtomicLongArray(array);
    }
    if (array instanceof HugeAtomicDoubleArray) {
      // Assuming DoubleNodePropertyValuesAdapter has a method like 'adaptAtomic' or 'adaptFromHugeAtomicDoubleArray'
      return DoubleNodePropertyValuesAdapter.adaptAtomic(array);
    }
    if (array instanceof HugeObjectArray) {
      // This will delegate to an ObjectNodePropertyValuesAdapter which needs to be defined.
      // For now, let's assume it exists and has a static adapt method.
      // return ObjectNodePropertyValuesAdapter.adapt(array);
      // Placeholder if ObjectNodePropertyValuesAdapter is not yet translated:
      throw new Error(`ObjectNodePropertyValuesAdapter not yet implemented or HugeObjectArray type not fully handled: ${array}`);
    }
    // Fallback or error for unhandled array types
    throw new Error(`Unsupported array type for adaptation: ${array}`);
  }
}
