import { ValueType } from "@/api/ValueType";

export namespace DefaultValueUtil {
  export function parseDoubleArrayValue(
    value: any,
    type: ValueType
  ): Float64Array | null {
    if (value instanceof Float64Array) return value;
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "number")
    ) {
      return new Float64Array(value);
    }
    return null;
  }
  export function parseFloatArrayValue(
    value: any,
    type: ValueType
  ): Float32Array | null {
    if (value instanceof Float32Array) return value;
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "number")
    ) {
      return new Float32Array(value);
    }
    return null;
  }
  export function parseLongArrayValue(
    value: any,
    type: ValueType
  ): number[] | null {
    if (Array.isArray(value) && value.every((item) => Number.isInteger(item))) {
      return value;
    }
    return null;
  }
  export function transformObjectToPrimitiveArray(
    arr: any[]
  ): any[] | Float64Array | Float32Array | number[] {
    if (arr.length > 0) {
      if (
        arr.every((item) => typeof item === "number" && Number.isInteger(item))
      )
        return arr as number[];
      if (arr.every((item) => typeof item === "number"))
        return new Float64Array(arr);
    }
    return arr;
  }
}
