import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue"; // Assuming this exists and LONG_DEFAULT_FALLBACK is bigint
import { ValueConversion } from "@/api/ValueConversion"; // Assuming this exists for exactLongToDouble
import { LongNodePropertyValues } from "./LongNodePropertyValues";

// Placeholder imports for Huge array types
import { HugeLongArray } from "@/collections/ha/HugeLongArray";
import { HugeAtomicLongArray } from "@/collections/haa/HugeAtomicLongArray";
import { HugeIntArray } from "@/collections/ha/HugeIntArray";
import { HugeByteArray } from "@/collections/ha/HugeByteArray";

import { MemoryEstimation } from "@/mem/MemoryEstimation"; // Placeholder
import { MemoryEstimations } from "@/mem/MemoryEstimations"; // Placeholder

/**
 * A generic interface for the underlying arrays that can be adapted.
 * The `get` method can return number (for int/byte arrays) or bigint (for long arrays).
 */
interface GenericAdaptableArray {
  get(nodeId: number): number;
  size(): number;
  // Optional methods for resource management or metadata
  // release?(): void;
  // memoryEstimation?(): MemoryEstimation;
}

/**
 * Helper class that implements LongNodePropertyValues by adapting an underlying array.
 * This class handles the conversion from number to bigint if the underlying array returns numbers.
 */
class AdaptedLongNodePropertyValues implements LongNodePropertyValues {
  protected readonly array: GenericAdaptableArray;

  constructor(array: GenericAdaptableArray) {
    this.array = array;
  }

  longValue(nodeId: number): number {
    const value = this.array.get(nodeId);
    // Ensure the return type is always bigint
    return value;
  }

  nodeCount(): number {
    return this.array.size();
  }

  valueType(): ValueType.LONG {
    return ValueType.LONG;
  }

  dimension(): number {
    // Scalar long properties always have a dimension of 1.
    return 1;
  }

  getObject(nodeId: number): number {
    return this.longValue(nodeId);
  }

  doubleValue(nodeId: number): number {
    const value = this.array.get(nodeId);

    // Assuming DefaultValue.LONG_DEFAULT_FALLBACK is a bigint
    if (value === DefaultValue.LONG_DEFAULT_FALLBACK) {
      return NaN; // Or some other default double, GDS uses NaN for missing converted longs
    }
    return ValueConversion.exactLongToDouble(value);
  }

  getMaxLongPropertyValue(): number | undefined {
    if (this.nodeCount() === 0) {
      return undefined;
    }
    // Need a very small bigint for initialization if all values could be negative
    let max: number | undefined = undefined;
    for (let i = 0; i < this.nodeCount(); i++) {
      // This assumes 'i' is a valid nodeId for the underlying array.
      const val = this.longValue(i);
      if (max === undefined || val > max) {
        max = val;
      }
    }
    return max;
  }

  // Methods from NodePropertyValues base interface
  hasValue(_nodeId: number): boolean {
    return _nodeId >= 0 && _nodeId < this.nodeCount();
  }

  release(): void {
    // Delegate if the underlying array has a release method
    // (this.array as any).release?.();
  }

  memoryEstimation(): MemoryEstimation {
    // Delegate if the underlying array has a memoryEstimation method
    // return (this.array as any).memoryEstimation?.() || MemoryEstimations.empty();
    return MemoryEstimations.empty(); // Placeholder
  }
}

/**
 * Adapter class to create LongNodePropertyValues from various "Huge" array types.
 * This mirrors the static factory methods in GDS's LongNodePropertyValuesAdapter.
 */
export class LongNodePropertyValuesAdapter {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Adapts a HugeLongArray to the LongNodePropertyValues interface.
   * @param array The HugeLongArray to adapt.
   * @returns An instance of LongNodePropertyValues.
   */
  public static adaptFromHugeLongArray(
    array: HugeLongArray
  ): LongNodePropertyValues {
    return new AdaptedLongNodePropertyValues(
      array as unknown as GenericAdaptableArray
    );
  }

  /**
   * Adapts a HugeAtomicLongArray to the LongNodePropertyValues interface.
   * @param array The HugeAtomicLongArray to adapt.
   * @returns An instance of LongNodePropertyValues.
   */
  public static adaptFromHugeAtomicLongArray(
    array: HugeAtomicLongArray
  ): LongNodePropertyValues {
    return new AdaptedLongNodePropertyValues(
      array as unknown as GenericAdaptableArray
    );
  }

  /**
   * Adapts a HugeIntArray to the LongNodePropertyValues interface.
   * The integer values from HugeIntArray will be converted to bigints.
   * @param array The HugeIntArray to adapt.
   * @returns An instance of LongNodePropertyValues.
   */
  public static adaptFromHugeIntArray(
    array: HugeIntArray
  ): LongNodePropertyValues {
    return new AdaptedLongNodePropertyValues(
      array as unknown as GenericAdaptableArray
    );
  }

  /**
   * Adapts a HugeByteArray to the LongNodePropertyValues interface.
   * The byte values from HugeByteArray will be converted to bigints.
   * @param array The HugeByteArray to adapt.
   * @returns An instance of LongNodePropertyValues.
   */
  public static adaptFromHugeByteArray(
    array: HugeByteArray
  ): LongNodePropertyValues {
    return new AdaptedLongNodePropertyValues(
      array as unknown as GenericAdaptableArray
    );
  }
}
