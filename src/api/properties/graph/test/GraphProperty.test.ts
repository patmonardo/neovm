import { ValueType } from "@/api/ValueType";
import { PropertyState } from "@/api/PropertyState";
import { GraphProperty } from "../GraphProperty";
import { LongGraphPropertyValues } from "../abstract/LongGraphPropertyValues";
import { DoubleGraphPropertyValues } from "../abstract/DoubleGraphPropertyValues";
import { PropertySchema } from "@/api/schema";

describe("GraphProperty Integration Tests", () => {
  describe("Long Graph Properties", () => {
    test("should store and retrieve long values", () => {
      // Create real property values with actual data
      const data = new Map<string, number>([
        ["nodeCount", 100],
        ["relationshipCount", 500],
        ["density", 0.05]
      ]);

      // Use the factory method to create real values
      const values = LongGraphPropertyValues.fromMap(data);

      // Create a property using these values
      const property = GraphProperty.of("graphStats", values);

      // Test actual value retrieval
      expect(property.values().longValue("nodeCount")).toBe(100);
      expect(property.values().longValue("relationshipCount")).toBe(500);
      expect(property.values().longValue("nonExistent")).toBe(0); // Default value

      // Test property metadata
      expect(property.key()).toBe("graphStats");
      expect(property.valueType()).toBe(ValueType.LONG);
      expect(property.propertyState()).toBe(PropertyState.PERSISTENT);
    });

    test("should handle schema and default values correctly", () => {
      // Create with custom schema
      const values = LongGraphPropertyValues.of(42); // 42 as default value
      const schema = PropertySchema.of(
        "customStats",
        ValueType.LONG,
        99, // Default value in schema
        PropertyState.TRANSIENT
      );

      // Create property with custom schema
      const property = GraphProperty.of(values, schema);

      // Verify schema properties
      expect(property.key()).toBe("customStats");
      expect(property.propertyState()).toBe(PropertyState.TRANSIENT);

      // Test default value behavior (should use the one from values)
      expect(property.values().longValue("nonExistent")).toBe(42);
    });
  });

  describe("Double Graph Properties", () => {
    test("should handle type conversions correctly", () => {
      // Create double property values
      const data = new Map<string, number>([
        ["pageRank", 0.85],
        ["centrality", 0.75]
      ]);

      const values = DoubleGraphPropertyValues.fromMap(data);
      const property = GraphProperty.of("algorithms", values);

      // Test value retrieval
      expect(property.values().doubleValue("pageRank")).toBeCloseTo(0.85);

      // Test type conversions
      expect(property.values().longValue("pageRank")).toBe(0); // Double→Long conversion
      expect(Number.isNaN(property.values().doubleValue("missing"))).toBe(true); // Default for missing doubles is NaN
    });
  });

  describe("Property Operations", () => {
    test("should allow updating values", () => {
      const values = LongGraphPropertyValues.of();
      const property = GraphProperty.of("dynamic", values);

      // Add values to the property
      property.values().set("initial", 100);
      property.values().set("updated", 200);

      // Verify values were stored
      expect(property.values().longValue("initial")).toBe(100);
      expect(property.values().longValue("updated")).toBe(200);

      // Update an existing value
      property.values().set("initial", 150);
      expect(property.values().longValue("initial")).toBe(150);

      // Check that schema reflects the value type
      expect(property.propertySchema().valueType()).toBe(ValueType.LONG);
    });
  });
});
