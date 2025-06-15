import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { NodePropertyValues } from "../NodePropertyValues";
import { DoubleArrayNodePropertyValues } from "../abstract/DoubleArrayNodePropertyValues";

export class DefaultDoubleArrayNodePropertyValues
  implements DoubleArrayNodePropertyValues
{
  private readonly data: Map<number, Float64Array>;
  private readonly defaultValue: Float64Array;
  // 'dimension' is correctly omitted here as this class provides the specific implementation.
  private readonly defaults: Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType" | "dimension"
  >;

  constructor(
    inputData: Map<number, ArrayLike<number>>,
    customDefaultValue?: DefaultValue
  ) {
    this.data = new Map<number, Float64Array>();
    inputData.forEach((arr, nodeId) => {
      this.data.set(nodeId, arr instanceof Float64Array ? arr : new Float64Array(arr));
    });

    const customDefault = customDefaultValue;
    if (customDefault instanceof Float64Array || customDefault === undefined) {
      this.defaultValue = customDefault!;
    } else if (Array.isArray(customDefault) ||
      (typeof customDefault === 'number' && typeof customDefault !== 'string')) {
      this.defaultValue = new Float64Array(customDefault as ArrayLike<number>);
    } else {
      this.defaultValue = customDefaultValue!.doubleArrayValue()!;
    }

    this.defaults = NodePropertyValues.withDefaultsForType(() => this.valueType());
  }

  valueType(): ValueType.DOUBLE_ARRAY {
    return ValueType.DOUBLE_ARRAY;
  }

  doubleArrayValue(nodeId: number): Float64Array {
    // If nodeId 0 is requested and not present, it will correctly return this.defaultValue
    return this.data.get(nodeId) ?? this.defaultValue;
  }

  floatArrayValue(nodeId: number): Float32Array {
    const doubleArr = this.doubleArrayValue(nodeId);
    return doubleArr ? new Float32Array(doubleArr) : new Float32Array(0);
  }

  getObject(nodeId: number): Float64Array | undefined {
    return this.doubleArrayValue(nodeId);
  }

  /**
   * Returns the dimension of arrays stored by this property.
   * Following GDS convention, this is the length of the array at nodeId 0.
   */
  dimension(): number | undefined {
    // Get the array for node ID 0.
    // If node 0 is not in 'this.data', doubleArrayValue(0) will return 'this.defaultValue'.
    // If 'this.defaultValue' is undefined, then 'arr' will be undefined, and 'arr?.length' will be undefined.
    // If 'this.defaultValue' is an empty Float64Array, then 'arr?.length' will be 0.
    const arr = this.doubleArrayValue(0);
    return arr?.length;
  }

  nodeCount(): number {
    return this.data.size;
  }

  hasValue(nodeId: number): boolean {
    return this.data.has(nodeId);
  }

  release(): void {
    this.data.clear();
  }

  // --- Delegate other methods to defaults (which should throw) ---
  doubleValue(nodeId: number): number {
    return this.defaults.doubleValue!(nodeId);
  }

  longValue(nodeId: number): number {
    return this.defaults.longValue!(nodeId);
  }

  longArrayValue(nodeId: number): number[] {
    return this.defaults.longArrayValue!(nodeId);
  }

  getMaxDoublePropertyValue(): number | undefined {
    return this.defaults.getMaxDoublePropertyValue!();
  }

  getMaxLongPropertyValue(): number | undefined {
    return this.defaults.getMaxLongPropertyValue!();
  }
}
