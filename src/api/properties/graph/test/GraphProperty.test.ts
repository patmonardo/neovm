import { ValueType } from "@/api/ValueType";
import { PropertyState } from "@/api/PropertyState";
import { GraphProperty } from "../abstract/GraphProperty";
import { LongGraphPropertyValues } from "../abstract/LongGraphPropertyValues";

// Mock for GraphPropertyValues
class MockLongGraphPropertyValues implements Partial<LongGraphPropertyValues> {
  private readonly value: number;

  constructor(value: number) {
    this.value = value;
  }

  valueType(): ValueType {
    return ValueType.LONG;
  }

  longValue(): number {
    return this.value;
  }
}

describe("GraphProperty", () => {
  test("should create property with correct key and values", () => {
    // Arrange
    const key = "testKey";
    const values = new MockLongGraphPropertyValues(
      42
    ) as unknown as LongGraphPropertyValues;

    // Act
    const property = GraphProperty.of(key, values);

    // Assert
    expect(property.key()).toBe(key);
    expect(property.values()).toBe(values);
    expect(property.valueType()).toBe(ValueType.LONG);
    expect(property.propertyState()).toBe(PropertyState.PERSISTENT);
  });

  test("should retrieve schema with correct properties", () => {
    // Arrange
    const key = "testKey";
    const values = new MockLongGraphPropertyValues(
      42
    ) as unknown as LongGraphPropertyValues;

    // Act
    const property = GraphProperty.of(key, values);
    const schema = property.propertySchema();

    // Assert
    expect(schema.key()).toBe(key);
    expect(schema.valueType()).toBe(ValueType.LONG);
    expect(schema.state()).toBe(PropertyState.PERSISTENT);
    const defaultValue = schema.defaultValue();
    expect(defaultValue.get()).toBe(0);
    expect(defaultValue.getValueType()).toBe(ValueType.LONG);
    expect(defaultValue.isUserDefined).toBe(true);
  });
});
