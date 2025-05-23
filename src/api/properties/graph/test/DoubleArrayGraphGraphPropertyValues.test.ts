import { ValueType } from "@/api/ValueType";
import { DefDoubleArrayGraphPropertyValues } from "../primitive/DefDoubleArrayGraphPropertyValues";

describe("DoubleArrayGraphPropertyValuesImpl", () => {
  test("should store and retrieve array values correctly", () => {
    // Setup test arrays
    const arrays = [
      [1.1, 2.2, 3.3],
      [4.4, 5.5, 6.6],
    ];
    const values = new DefDoubleArrayGraphPropertyValues(arrays);

    // Check value type
    expect(values.valueType()).toBe(ValueType.DOUBLE_ARRAY);

    // Check value count
    expect(values.valueCount()).toBe(2);

    // Check doubleArrayValues() iteration
    const retrieved: number[][] = [];
    for (const array of values.doubleArrayValues()) {
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

  test("should throw for unsupported conversions", () => {
    const values = new DefDoubleArrayGraphPropertyValues([
      [1.1, 2.2],
      [3.3, 4.4],
    ]);

    // Test each unsupported conversion
    expect(() => Array.from(values.doubleValues())).toThrow();
    expect(() => Array.from(values.longValues())).toThrow();
    expect(() => Array.from(values.longArrayValues())).toThrow();
  });

  test("should handle empty values", () => {
    const emptyValues = new DefDoubleArrayGraphPropertyValues([]);
    expect(emptyValues.valueCount()).toBe(0);

    // Check that iteration works with empty arrays
    const values: number[][] = [];
    for (const val of emptyValues.doubleArrayValues()) {
      values.push(val);
    }
    expect(values).toEqual([]);
  });
});
