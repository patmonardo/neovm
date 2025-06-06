import { describe, it, expect } from 'vitest';
import { CsvImportParsingUtil } from "../CsvImportParsingUtil";
import { ValueType } from "@/api/ValueType";

describe("CsvImportParsingUtil", () => {

  it("should parse basic values correctly", () => {
    const result = CsvImportParsingUtil.parseProperty("42", ValueType.LONG, ValueType.fallbackValue(ValueType.LONG));
    expect(result).toBe(42);

    const stringResult = CsvImportParsingUtil.parseProperty("Hello", ValueType.STRING, ValueType.fallbackValue(ValueType.STRING));
    expect(stringResult).toBe("Hello");

    const boolResult = CsvImportParsingUtil.parseProperty("true", ValueType.BOOLEAN, ValueType.fallbackValue(ValueType.BOOLEAN));
    expect(boolResult).toBe(true);

    const doubleResult = CsvImportParsingUtil.parseProperty("3.14159", ValueType.DOUBLE, ValueType.fallbackValue(ValueType.DOUBLE));
    expect(doubleResult).toBe(3.14159);
  });

  it("should parse arrays correctly", () => {
    const longArray = CsvImportParsingUtil.parseProperty("[1,2,3]", ValueType.LONG_ARRAY, ValueType.fallbackValue(ValueType.LONG_ARRAY));
    expect(longArray).toEqual([1, 2, 3]);

    const stringArray = CsvImportParsingUtil.parseProperty('["a","b","c"]', ValueType.STRING_ARRAY, ValueType.fallbackValue(ValueType.STRING_ARRAY));
    expect(stringArray).toEqual(["a", "b", "c"]);

    const boolArray = CsvImportParsingUtil.parseProperty('[true,false,true]', ValueType.BOOLEAN_ARRAY, ValueType.fallbackValue(ValueType.BOOLEAN_ARRAY));
    expect(boolArray).toEqual([true, false, true]);
  });

  it("should handle blank values with defaults", () => {
    const emptyLong = CsvImportParsingUtil.parseProperty("", ValueType.LONG, ValueType.fallbackValue(ValueType.LONG));
    expect(emptyLong).toBe(0);

    const whitespaceLong = CsvImportParsingUtil.parseProperty("   ", ValueType.LONG, ValueType.fallbackValue(ValueType.LONG));
    expect(whitespaceLong).toBe(0);

    const emptyString = CsvImportParsingUtil.parseProperty("", ValueType.STRING, ValueType.fallbackValue(ValueType.STRING));
    expect(emptyString).toBe("");
  });

  it("should throw errors for invalid values", () => {
    expect(() => {
      CsvImportParsingUtil.parseProperty("not_a_number", ValueType.LONG, ValueType.fallbackValue(ValueType.LONG));
    }).toThrow("Invalid long value");

    expect(() => {
      CsvImportParsingUtil.parseProperty("definitely_not_a_double", ValueType.DOUBLE, ValueType.fallbackValue(ValueType.DOUBLE));
    }).toThrow("Invalid double value");

    expect(() => {
      CsvImportParsingUtil.parseProperty("maybe", ValueType.BOOLEAN, ValueType.fallbackValue(ValueType.BOOLEAN));
    }).toThrow("Invalid boolean");
  });

  it("should handle ID parsing for both numeric and string IDs", () => {
    // Numeric ID
    const numericId = CsvImportParsingUtil.parseId("12345");
    expect(numericId).toBe(12345);

    // String ID
    const stringId = CsvImportParsingUtil.parseId("user_001");
    expect(stringId).toBe("user_001");

    // Should throw for blank
    expect(() => {
      CsvImportParsingUtil.parseId("");
    }).toThrow("ID cannot be blank");
  });

  it("should handle real CSV row parsing", () => {
    const csvData = {
      'name:string': 'Alice Johnson',
      'age:long': '28',
      'salary:double': '95000.75',
      'isActive:boolean': 'true',
      'skills:string[]': '["JavaScript","TypeScript","React"]'
    };

    const name = CsvImportParsingUtil.parseProperty(csvData['name:string'], ValueType.STRING, ValueType.fallbackValue(ValueType.STRING));
    expect(name).toBe('Alice Johnson');

    const age = CsvImportParsingUtil.parseProperty(csvData['age:long'], ValueType.LONG, ValueType.fallbackValue(ValueType.LONG));
    expect(age).toBe(28);

    const salary = CsvImportParsingUtil.parseProperty(csvData['salary:double'], ValueType.DOUBLE, ValueType.fallbackValue(ValueType.DOUBLE));
    expect(salary).toBe(95000.75);

    const isActive = CsvImportParsingUtil.parseProperty(csvData['isActive:boolean'], ValueType.BOOLEAN, ValueType.fallbackValue(ValueType.BOOLEAN));
    expect(isActive).toBe(true);

    const skills = CsvImportParsingUtil.parseProperty(csvData['skills:string[]'], ValueType.STRING_ARRAY, ValueType.fallbackValue(ValueType.STRING_ARRAY));
    expect(skills).toEqual(["JavaScript", "TypeScript", "React"]);
  });

  it("should handle alternative array formats", () => {
    // Semicolon separated
    const semicolonArray = CsvImportParsingUtil.parseProperty("red;green;blue", ValueType.STRING_ARRAY, ValueType.fallbackValue(ValueType.STRING_ARRAY));
    expect(semicolonArray).toEqual(["red", "green", "blue"]);
  });

});
