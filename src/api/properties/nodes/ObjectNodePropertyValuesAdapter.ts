import { NodePropertyValues } from './NodePropertyValues';
import { FloatArrayNodePropertyValues } from './FloatArrayNodePropertyValues';
import { DoubleArrayNodePropertyValues } from './DoubleArrayNodePropertyValues';
import { LongArrayNodePropertyValues } from './LongArrayNodePropertyValues';
import { ValueType } from '../../ValueType';
import { HugeObjectArray } from '@/collections/ha/HugeObjectArray'; // Assuming this path
import { MemoryEstimation } from '@/mem/MemoryEstimation'; // Placeholder
import { MemoryEstimations } from '@/mem/MemoryEstimations'; // Placeholder

/**
 * Internal interface representing a HugeObjectArray that can be adapted.
 * It must provide:
 * - A way to get the stored elements (e.g., Float32Array, Float64Array, BigInt64Array).
 * - Its size.
 * - Critically, a way to identify the ValueType of the arrays it stores.
 */
interface AdaptableHugeObjectArray<T extends Float32Array | Float64Array | BigInt64Array> {
  get(nodeId: number): T | undefined;
  size(): number;
  getStoredValueType(): ValueType; // e.g., returns ValueType.FLOAT_ARRAY if it stores Float32Array[]
  // Optional: release?(): void;
  // Optional: memoryEstimation?(): MemoryEstimation;
}

// --- Adapter implementation for HugeObjectArray storing Float32Array[] ---
class AdaptedHOAFloatArrayNodeProps implements FloatArrayNodePropertyValues {
  protected readonly hoa: AdaptableHugeObjectArray<Float32Array>;

  constructor(hoa: AdaptableHugeObjectArray<Float32Array>) {
    this.hoa = hoa;
  }

  floatArrayValue(nodeId: number): Float32Array | undefined {
    return this.hoa.get(nodeId);
  }

  doubleArrayValue(nodeId: number): Float64Array | undefined {
    const floatArr = this.floatArrayValue(nodeId);
    return floatArr ? new Float64Array(floatArr) : undefined;
  }

  getObject(nodeId: number): Float32Array | undefined {
    return this.floatArrayValue(nodeId);
  }

  valueType(): ValueType.FLOAT_ARRAY {
    return ValueType.FLOAT_ARRAY;
  }

  dimension(): number | undefined {
    if (this.nodeCount() > 0) {
      for (let i = 0; i < this.nodeCount(); i++) {
        const firstElement = this.hoa.get(i);
        if (firstElement) return firstElement.length;
      }
    }
    return undefined;
  }

  nodeCount(): number {
    return this.hoa.size();
  }

  hasValue(nodeId: number): boolean {
    return nodeId >= 0 && nodeId < this.nodeCount() && this.hoa.get(nodeId) !== undefined;
  }

  release(): void {
    // Delegate to hoa.release?.() if applicable
  }

  memoryEstimation(): MemoryEstimation {
    // Delegate to hoa.memoryEstimation?.() or calculate
    return MemoryEstimations.empty(); // Placeholder
  }
}

// --- Adapter implementation for HugeObjectArray storing Float64Array[] ---
class AdaptedHOADoubleArrayNodeProps implements DoubleArrayNodePropertyValues {
  protected readonly hoa: AdaptableHugeObjectArray<Float64Array>;

  constructor(hoa: AdaptableHugeObjectArray<Float64Array>) {
    this.hoa = hoa;
  }

  doubleArrayValue(nodeId: number): Float64Array | undefined {
    return this.hoa.get(nodeId);
  }

  floatArrayValue(nodeId: number): Float32Array | undefined {
    const doubleArr = this.doubleArrayValue(nodeId);
    return doubleArr ? new Float32Array(doubleArr) : undefined;
  }

  getObject(nodeId: number): Float64Array | undefined {
    return this.doubleArrayValue(nodeId);
  }

  valueType(): ValueType.DOUBLE_ARRAY {
    return ValueType.DOUBLE_ARRAY;
  }

  dimension(): number | undefined {
    if (this.nodeCount() > 0) {
      for (let i = 0; i < this.nodeCount(); i++) {
        const firstElement = this.hoa.get(i);
        if (firstElement) return firstElement.length;
      }
    }
    return undefined;
  }

  nodeCount(): number {
    return this.hoa.size();
  }

  hasValue(nodeId: number): boolean {
    return nodeId >= 0 && nodeId < this.nodeCount() && this.hoa.get(nodeId) !== undefined;
  }

  release(): void { /* Delegate if applicable */ }
  memoryEstimation(): MemoryEstimation { return MemoryEstimations.empty(); /* Placeholder */ }
}

// --- Adapter implementation for HugeObjectArray storing BigInt64Array[] ---
class AdaptedHOALongArrayNodeProps implements LongArrayNodePropertyValues {
  protected readonly hoa: AdaptableHugeObjectArray<BigInt64Array>;

  constructor(hoa: AdaptableHugeObjectArray<BigInt64Array>) {
    this.hoa = hoa;
  }

  longArrayValue(nodeId: number): BigInt64Array | undefined {
    return this.hoa.get(nodeId);
  }

  getObject(nodeId: number): BigInt64Array | undefined {
    return this.longArrayValue(nodeId);
  }

  valueType(): ValueType.LONG_ARRAY {
    return ValueType.LONG_ARRAY;
  }

  dimension(): number | undefined {
    if (this.nodeCount() > 0) {
      for (let i = 0; i < this.nodeCount(); i++) {
        const firstElement = this.hoa.get(i);
        if (firstElement) return firstElement.length;
      }
    }
    return undefined;
  }

  nodeCount(): number {
    return this.hoa.size();
  }

  hasValue(nodeId: number): boolean {
    return nodeId >= 0 && nodeId < this.nodeCount() && this.hoa.get(nodeId) !== undefined;
  }

  release(): void { /* Delegate if applicable */ }
  memoryEstimation(): MemoryEstimation { return MemoryEstimations.empty(); /* Placeholder */ }
}

/**
 * Adapter class to create specific XxxArrayNodePropertyValues from a generic HugeObjectArray
 * by inspecting the type of elements it stores (via an assumed `getStoredValueType()` method
 * on the HugeObjectArray instance).
 * This mirrors GDS's ObjectNodePropertyValuesAdapter.
 */
export class ObjectNodePropertyValuesAdapter {
  /**
   * Private constructor to prevent instantiation of this utility class.
   */
  private constructor() {}

  /**
   * Adapts a HugeObjectArray to a specific XxxArrayNodePropertyValues interface.
   *
   * @param objectArray The HugeObjectArray to adapt. It is assumed that this array
   *                    has a method `getStoredValueType()` returning a ValueType
   *                    (e.g., ValueType.FLOAT_ARRAY) indicating the type of arrays it holds.
   * @returns An instance of a specific XxxArrayNodePropertyValues (e.g., FloatArrayNodePropertyValues),
   *          or throws an error if the stored element type is not supported.
   */
  public static adapt(
    objectArray: HugeObjectArray<any> // Or HugeObjectArray<unknown>
  ): NodePropertyValues { // The return type is general, but dynamically it's more specific.

    // Cast to our internal adaptable interface to access getStoredValueType()
    // This cast assumes that the passed objectArray conforms to AdaptableHugeObjectArray.
    const adaptableHOA = objectArray as unknown as AdaptableHugeObjectArray<any>;
    const storedType = adaptableHOA.getStoredValueType();

    switch (storedType) {
      case ValueType.FLOAT_ARRAY:
        return new AdaptedHOAFloatArrayNodeProps(
          adaptableHOA as AdaptableHugeObjectArray<Float32Array>
        );
      case ValueType.DOUBLE_ARRAY:
        return new AdaptedHOADoubleArrayNodeProps(
          adaptableHOA as AdaptableHugeObjectArray<Float64Array>
        );
      case ValueType.LONG_ARRAY: // This corresponds to the `cls == long[].class` case
        return new AdaptedHOALongArrayNodeProps(
          adaptableHOA as AdaptableHugeObjectArray<BigInt64Array>
        );
      default:
        // This corresponds to the `throw new UnsupportedOperationException(...)`
        const typeName = ValueType[storedType] || 'unknown type code ' + storedType;
        throw new Error(
          `This HugeObjectArray (storing elements of type corresponding to ValueType: ${typeName}) cannot be converted to node properties.`
        );
    }
  }
}
