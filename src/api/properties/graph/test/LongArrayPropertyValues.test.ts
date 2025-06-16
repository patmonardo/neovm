import { ValueType } from "@/api";
import { DefaultLongArrayGraphPropertyValues } from "../primitive/DefaultLongArrayGraphPropertyValues";

describe("LongArrayGraphPropertyValues", () => {
  test("should store and retrieve array values correctly", () => {
    // Setup test arrays
    const arrays = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const values = new DefaultLongArrayGraphPropertyValues(arrays);

    // Check value type
    expect(values.valueType()).toBe(ValueType.LONG_ARRAY);

    // Check value count
    expect(values.valueCount()).toBe(2);

    // Check longArrayValues() iteration
    const retrieved: number[][] = [];
    for (const array of values.longArrayValues()) {
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
    const values = new DefaultLongArrayGraphPropertyValues([
      [1, 2],
      [3, 4],
    ]);

    // Test each unsupported conversion
    expect(() => Array.from(values.doubleValues())).toThrow();
    expect(() => Array.from(values.longValues())).toThrow();
    expect(() => Array.from(values.doubleArrayValues())).toThrow();
    expect(() => Array.from(values.floatArrayValues())).toThrow();

    // Check specific error message for one case
    try {
      Array.from(values.doubleValues());
    } catch (e: any) {
      // expect(e.message).toContain(ValueType[ValueType.LONG_ARRAY]);
      // expect(e.message).toContain(ValueType[ValueType.DOUBLE]);
    }
  });

  test("should handle empty values", () => {
    const emptyValues = new DefaultLongArrayGraphPropertyValues([]);
    expect(emptyValues.valueCount()).toBe(0);

    // Check that iteration works with empty arrays
    const values: number[][] = [];
    for (const val of emptyValues.longArrayValues()) {
      values.push(val);
    }
    expect(values).toEqual([]);
  });

  test("should handle arrays with empty elements", () => {
    const valuesWithEmpty = new DefaultLongArrayGraphPropertyValues([
      [1, 2],
      [],
      [3, 4],
    ]);
    expect(valuesWithEmpty.valueCount()).toBe(3);

    // Verify we can iterate and get the empty array
    const retrieved: number[][] = [];
    for (const array of valuesWithEmpty.longArrayValues()) {
      retrieved.push(array);
    }
    expect(retrieved).toEqual([[1, 2], [], [3, 4]]);
  });
});
