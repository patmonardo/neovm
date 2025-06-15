import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import { NodePropertyValues } from "../NodePropertyValues";
import { LongNodePropertyValues } from "../abstract/LongNodePropertyValues";

export class DefaultLongNodePropertyValues implements LongNodePropertyValues {
  private readonly data: Map<number, number>;
  private readonly defaultValue: number;
  private readonly defaults: Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType"
  >;

  constructor(data: Map<number, number>, customDefaultValue?: DefaultValue) {
    this.data = data;
    // If customDefaultValue is provided, use its .longValue(), else use the static fallback
    this.defaultValue = customDefaultValue
      ? typeof customDefaultValue === "number"
        ? customDefaultValue
        : customDefaultValue.longValue()
      : DefaultValue.LONG_DEFAULT_FALLBACK;
    this.defaults = NodePropertyValues.withDefaultsForType(() =>
      this.valueType()
    );
  }

  // --- Methods specific to LongNodePropertyValues or overriding defaults ---

  valueType(): ValueType.LONG {
    return ValueType.LONG;
  }

  longValue(nodeId: number): number {
    if (this.data.has(nodeId)) {
      return this.data.get(nodeId)!;
    }
    return this.defaultValue;
  }

  getObject(nodeId: number): number {
    return this.longValue(nodeId);
  }

  dimension(): number {
    return 1; // Scalar
  }

  // --- Required methods from NodePropertyValues base ---

  nodeCount(): number {
    return this.data.size;
  }

  hasValue(nodeId: number): boolean {
    return this.data.has(nodeId);
  }

  release(): void {
    this.data.clear(); // Simple release for a Map-based implementation
  }

  // --- Inherited default throwing implementations or specific coercions ---

  doubleValue(nodeId: number): number {
    const longVal = this.longValue(nodeId);
    // GDS specific: if the long value is the default fallback, return NaN for double.
    if (longVal === DefaultValue.LONG_DEFAULT_FALLBACK) {
      return NaN;
    }
    return Number(longVal); // Standard conversion
  }

  floatValue(nodeId: number): number {
    // Similar to doubleValue, but GDS might have specific rules for float conversion.
    // For simplicity, we'll mirror the doubleValue logic for NaN on default fallback.
    const longVal = this.longValue(nodeId);
    if (longVal === DefaultValue.LONG_DEFAULT_FALLBACK) {
      // GDS might return Float.NaN, which is just NaN in JS.
      // Or it might have a specific Float Default Fallback.
      // Assuming NaN is the desired behavior for now.
      return NaN;
    }
    // JavaScript numbers are doubles, direct conversion is fine.
    // Precision loss might occur if this were true float32.
    return Number(longVal);
  }

  doubleArrayValue(nodeId: number): Float64Array {
    return this.defaults.doubleArrayValue!(nodeId);
  }

  floatArrayValue(nodeId: number): Float32Array {
    return this.defaults.floatArrayValue!(nodeId);
  }

  longArrayValue(nodeId: number): number[] {
    return this.defaults.longArrayValue!(nodeId);
  }

  getMaxLongPropertyValue(): number | undefined {
    if (this.data.size === 0) {
      return undefined;
    }
    let max = -Infinity; // Or Number.MIN_SAFE_INTEGER if only positive longs are expected
    for (const value of this.data.values()) {
      if (value > max) {
        max = value;
      }
    }
    return max;
  }

  getMaxDoublePropertyValue(): number | undefined {
    // If we allow coercion from long to double (as implemented in doubleValue above)
    if (this.data.size === 0) return undefined;
    let max = -Infinity;
    for (const val of this.data.values()) {
      const doubleVal =
        val === DefaultValue.LONG_DEFAULT_FALLBACK ? NaN : Number(val);
      if (!isNaN(doubleVal) && doubleVal > max) {
        max = doubleVal;
      }
    }
    return max === -Infinity ? undefined : max; // Handle case where all values were default fallback
    // Or, if strictly adhering to "this is a LONG store", then:
    // return this.defaults.getMaxDoublePropertyValue!();
  }
}
