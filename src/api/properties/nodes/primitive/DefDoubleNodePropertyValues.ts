import { ValueType } from "@/api";
import { DefaultValue } from "@/api";
import {
  NodePropertyValues,
  UnsupportedOperationError,
} from "../NodePropertyValues";
import { DoubleNodePropertyValues } from "../abstract/DoubleNodePropertyValues";

export class DefDoubleNodePropertyValues implements DoubleNodePropertyValues {
  private readonly data: Map<number, number>;
  private readonly defaultValue: DefaultValue;
  private readonly defaults: Omit<
    NodePropertyValues,
    "nodeCount" | "release" | "hasValue" | "valueType"
  >;

  constructor(data: Map<number, number>, customDefaultValue: DefaultValue) {
    this.data = data;
    this.defaultValue = customDefaultValue;
    this.defaults = NodePropertyValues.withDefaultsForType(() =>
      this.valueType()
    );
  }

  valueType(): ValueType.DOUBLE {
    return ValueType.DOUBLE;
  }

  doubleValue(nodeId: number): number {
    if (this.data.has(nodeId)) {
      return this.data.get(nodeId)!;
    }
    return this.defaultValue.doubleValue();
  }

  getObject(nodeId: number): number {
    return this.doubleValue(nodeId);
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

  // --- Inherited default throwing implementations ---
  // For methods not directly applicable to DOUBLE, we delegate to the 'defaults' object.

  longValue(nodeId: number): number {
    // GDS specific: double to long conversion might be defined,
    // or it might throw if not a whole number, or use floor.
    // For now, let's assume a direct conversion if it's a whole number, else throw or use default.
    // This is often a point of careful translation from Java GDS.
    // A common GDS pattern is if it's not its primary type, it tries to convert or throws.
    // The `withDefaultsForType` provides a strict throwing default.
    // If GDS allows Double -> Long coercion, this method needs specific logic.
    // For a simple primitive impl, often it's best to rely on the strict default:
    // return this.defaults.longValue!(nodeId); // The ! asserts it's there from Omit

    // Let's implement a GDS-like coercion for this example:
    const doubleVal = this.doubleValue(nodeId);
    if (Number.isInteger(doubleVal)) {
      return doubleVal;
    }
    // If it's the default double, and we're asked for long, what should it be?
    // Often, if it's a default value, it might return the corresponding long default.
    if (
      doubleVal === this.defaultValue.doubleValue() &&
      this.defaultValue.doubleValue() === DefaultValue.DOUBLE_DEFAULT_FALLBACK
    ) {
      return DefaultValue.LONG_DEFAULT_FALLBACK;
    }
    throw new UnsupportedOperationError(
      `Cannot coerce double value ${doubleVal} at nodeId ${nodeId} to long.`
    );
  }

  floatValue(nodeId: number): number {
    // Doubles can be losslessly converted to floats if within range,
    // but JS numbers are doubles. So, this is effectively the same as doubleValue.
    return this.doubleValue(nodeId);
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

  getMaxDoublePropertyValue(): number | undefined {
    if (this.data.size === 0) {
      return undefined;
    }
    let max = -Infinity;
    for (const value of this.data.values()) {
      if (value > max) {
        max = value;
      }
    }
    return max;
  }

  getMaxLongPropertyValue(): number | undefined {
    // If we allow coercion from double to long (as implemented in longValue above)
    if (this.data.size === 0) return undefined;
    let max: number | undefined = undefined;
    for (const val of this.data.values()) {
      if (Number.isInteger(val)) {
        if (max === undefined || val > max) {
          max = val;
        }
      }
    }
    return max;
    // Or, if strictly adhering to "this is a DOUBLE store", then:
    // return this.defaults.getMaxLongPropertyValue!();
  }
}
