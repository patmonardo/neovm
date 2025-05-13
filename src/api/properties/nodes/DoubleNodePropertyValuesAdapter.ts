import { DoubleNodePropertyValues } from './DoubleNodePropertyValues';
import { ValueType } from '../../ValueType';
import { HugeDoubleArray } from '@/collections/ha/HugeDoubleArray'; // Placeholder path
import { HugeAtomicDoubleArray } from '@/collections/haa/HugeAtomicDoubleArray'; // Placeholder path
import { NodePropertyValues } from './NodePropertyValues'; // Base interface
import { MemoryEstimation } from '@/mem/MemoryEstimation'; // Placeholder
import { MemoryEstimations } from '@/mem/MemoryEstimations'; // Placeholder

// A common interface for the array types to simplify the adapter class
interface AdaptableDoubleArray {
  get(nodeId: number): number;
  size(): number; // Or 'readonly size: number;' if it's a property
  // Add other methods if needed for full DoubleNodePropertyValues implementation
  // e.g., for memoryEstimation or iterating for getMaxDoublePropertyValue
}

/**
 * Helper class that implements DoubleNodePropertyValues by adapting an underlying array.
 * This class is not typically exported directly but used by the static adapter methods.
 */
class AdaptedDoubleNodePropertyValues implements DoubleNodePropertyValues {
  protected readonly array: AdaptableDoubleArray;

  constructor(array: AdaptableDoubleArray) {
    this.array = array;
  }

  doubleValue(nodeId: number): number {
    // TODO: Add bounds checking if nodeId can be out of range for array.get()
    // GDS often relies on the caller to provide valid node IDs.
    return this.array.get(nodeId);
  }

  nodeCount(): number {
    return this.array.size();
  }

  valueType(): ValueType.DOUBLE {
    return ValueType.DOUBLE;
  }

  dimension(): number {
    // Scalar double properties always have a dimension of 1.
    return 1;
  }

  getObject(nodeId: number): number {
    return this.doubleValue(nodeId);
  }

  getMaxDoublePropertyValue(): number | undefined {
    if (this.nodeCount() === 0) {
      return undefined;
    }
    let max = -Infinity;
    for (let i = 0; i < this.nodeCount(); i++) {
      // This assumes 'i' is a valid nodeId for the underlying array.
      // If nodeIds are not dense from 0 to nodeCount-1, this needs adjustment
      // or the AdaptableDoubleArray needs an iterator.
      const val = this.doubleValue(i);
      if (val > max) {
        max = val;
      }
    }
    return max;
  }

  // Methods from NodePropertyValues base interface
  hasValue(_nodeId: number): boolean {
    // For dense arrays, if nodeId < nodeCount, it has a value.
    // This might need more sophisticated logic if arrays can be sparse
    // or if the underlying array can tell us.
    // GDS often assumes values exist for all nodes in the range.
    return _nodeId >= 0 && _nodeId < this.nodeCount();
  }

  release(): void {
    // No-op if the underlying array doesn't need explicit release.
    // If HugeDoubleArray/HugeAtomicDoubleArray implement a release method, call it here.
    // (this.array as any).release?.();
  }

  memoryEstimation(): MemoryEstimation {
    // This would ideally delegate to the underlying array's memory estimation
    // or calculate based on its size and type.
    // e.g., return (this.array as any).memoryEstimation?.() || MemoryEstimations.empty();
    return MemoryEstimations.empty(); // Placeholder
  }
}

/**
 * Adapter class to create DoubleNodePropertyValues from HugeDoubleArray or HugeAtomicDoubleArray.
 * This mirrors the static factory methods in GDS's DoubleNodePropertyValuesAdapter.
 */
export class DoubleNodePropertyValuesAdapter {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  /**
   * Adapts a HugeDoubleArray to the DoubleNodePropertyValues interface.
   * @param array The HugeDoubleArray to adapt.
   * @returns An instance of DoubleNodePropertyValues.
   */
  public static adapt(array: HugeDoubleArray): DoubleNodePropertyValues {
    // Ensure HugeDoubleArray conforms to AdaptableDoubleArray
    return new AdaptedDoubleNodePropertyValues(array as unknown as AdaptableDoubleArray);
  }

  /**
   * Adapts a HugeAtomicDoubleArray to the DoubleNodePropertyValues interface.
   * @param array The HugeAtomicDoubleArray to adapt.
   * @returns An instance of DoubleNodePropertyValues.
   */
  public static adaptAtomic(array: HugeAtomicDoubleArray): DoubleNodePropertyValues {
    // Ensure HugeAtomicDoubleArray conforms to AdaptableDoubleArray
    // The method name is changed to adaptAtomic to allow for different signatures if needed,
    // or keep it 'adapt' if HugeDoubleArray and HugeAtomicDoubleArray are interchangeable
    // or share a common enough interface for AdaptableDoubleArray.
    // For this example, assuming they are similar enough for the same adapter.
    return new AdaptedDoubleNodePropertyValues(array as unknown as AdaptableDoubleArray);
  }
}
