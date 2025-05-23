import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { ValueType } from "@/api/ValueType";
import { DefaultValue } from "@/api/DefaultValue";
import { PropertyState } from "@/api/PropertyState";
import { Aggregation } from "@/core/Aggregation";

describe("RelationshipPropertySchema", () => {
  it("creates schemas with default values", () => {
    const schema = RelationshipPropertySchema.of("weight", ValueType.DOUBLE);

    expect(schema.key()).toBe("weight");
    expect(schema.valueType()).toBe(ValueType.DOUBLE);
    expect(schema.defaultValue().equals(DefaultValue.of(0))).toBe(true);
    expect(schema.state()).toBe(PropertyState.PERSISTENT);
    expect(schema.aggregation()).toBe(Aggregation.NONE);
  });

  it("creates schemas with custom values", () => {
    const schema = RelationshipPropertySchema.of(
      "since",
      ValueType.LONG,
      DefaultValue.of(2020),
      PropertyState.TRANSIENT,
      Aggregation.MAX
    );

    expect(schema.key()).toBe("since");
    expect(schema.valueType()).toBe(ValueType.LONG);
    expect(schema.defaultValue().equals(DefaultValue.of(2020))).toBe(true);
    expect(schema.state()).toBe(PropertyState.TRANSIENT);
    expect(schema.aggregation()).toBe(Aggregation.MAX);
  });

  it("supports all factory overloads", () => {
    // Basic overload
    const schema1 = RelationshipPropertySchema.of("prop1", ValueType.DOUBLE);
    expect(schema1.key()).toBe("prop1");

    // With default value
    const schema2 = RelationshipPropertySchema.of(
      "prop2",
      ValueType.LONG,
      DefaultValue.of(42)
    );
    expect(schema2.defaultValue().equals(DefaultValue.of(42))).toBe(true);

    // With default and state
    const schema3 = RelationshipPropertySchema.of(
      "prop3",
      ValueType.STRING,
      DefaultValue.of("default"),
      PropertyState.TRANSIENT
    );
    expect(schema3.state()).toBe(PropertyState.TRANSIENT);
  });

  it("normalizes DEFAULT aggregation", () => {
    // Create with DEFAULT aggregation
    const schema = RelationshipPropertySchema.of(
      "score",
      ValueType.DOUBLE,
      DefaultValue.of(0),
      PropertyState.PERSISTENT,
      Aggregation.DEFAULT
    );

    // Before normalization
    expect(schema.aggregation()).toBe(Aggregation.DEFAULT);

    // After normalization
    const normalized = schema.normalize();
    expect(normalized.aggregation()).not.toBe(Aggregation.DEFAULT);

    // Other properties should be preserved
    expect(normalized.key()).toBe("score");
    expect(normalized.valueType()).toBe(ValueType.DOUBLE);
  });

  it("returns same instance when already normalized", () => {
    const schema = RelationshipPropertySchema.of(
      "weight",
      ValueType.DOUBLE,
      DefaultValue.of(0),
      PropertyState.PERSISTENT,
      Aggregation.SUM
    );

    const normalized = schema.normalize();
    expect(normalized).toBe(schema); // Should be same instance
  });

  it("compares schemas correctly", () => {
    const schema1 = RelationshipPropertySchema.of("prop", ValueType.LONG);
    const schema2 = RelationshipPropertySchema.of("prop", ValueType.LONG);
    const schema3 = RelationshipPropertySchema.of("prop", ValueType.DOUBLE);

    expect(schema1.equals(schema2)).toBe(true);
    expect(schema2.equals(schema1)).toBe(true);
    expect(schema1.equals(schema3)).toBe(false);

    // Hash codes should match for equal objects
    expect(schema1.hashCode()).toBe(schema2.hashCode());
  });

  it("creates string representation", () => {
    const schema = RelationshipPropertySchema.of("weight", ValueType.DOUBLE);
    const str = schema.toString();

    expect(str).toContain("weight");
    expect(str).toContain("DOUBLE");
    console.log(str); // For inspection
  });
});
