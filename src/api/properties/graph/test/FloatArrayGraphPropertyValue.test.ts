import { ValueType } from "@/api";
import { DefFloatArrayGraphPropertyValues } from "../primitive/DefFloatArrayGraphPropertyValues";

describe("FloatArrayGraphPropertyValuesImpl", () => {
  test("should store and retrieve array values correctly", () => {
    // Setup test arrays
    const arrays = [
      [1.1, 2.2, 3.3],
      [4.4, 5.5, 6.6],
    ];
    const values = new DefFloatArrayGraphPropertyValues(arrays);

    // Check value type
    expect(values.valueType()).toBe(ValueType.FLOAT_ARRAY);

    // Check value count
    expect(values.valueCount()).toBe(2);

    // Check floatArrayValues() iteration
    const retrieved: number[][] = [];
    for (const array of values.floatArrayValues()) {
      retrieved.push(array);
    }
    expect(retrieved).toEqual(arrays);

    // Check objects() returns the same values
    const objects: number[][] = [];
    for (const obj of values.objects()) {
      objects.push(obj);
    }
    expect(objects).toEqual(arrays);
  });

  test("should convert to doubleArrayValues correctly", () => {
    const arrays = [
      [1.1, 2.2],
      [3.3, 4.4],
    ];
    const values = new DefFloatArrayGraphPropertyValues(arrays);

    const doubleArrays: number[][] = [];
    for (const array of values.doubleArrayValues()) {
      doubleArrays.push(array);
    }

    // The values should be the same, but possibly new array instances
    expect(doubleArrays).toEqual(arrays);
  });

  test("should throw for unsupported conversions", () => {
    const values = new DefFloatArrayGraphPropertyValues([
      [1.1, 2.2],
      [3.3, 4.4],
    ]);

    expect(() => Array.from(values.doubleValues())).toThrow();
    expect(() => Array.from(values.longValues())).toThrow();
    expect(() => Array.from(values.longArrayValues())).toThrow();
  });

  test("should handle empty values", () => {
    const emptyValues = new DefFloatArrayGraphPropertyValues([]);
    expect(emptyValues.valueCount()).toBe(0);

    const values: number[][] = [];
    for (const val of emptyValues.floatArrayValues()) {
      values.push(val);
    }
    expect(values).toEqual([]);
  });
});
