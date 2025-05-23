import { ValueType } from "@/api/ValueType";
import { PropertyState } from "@/api/PropertyState";
import { DefaultValue } from "@/api/DefaultValue";
import { Aggregation } from "@/core";
import { RelationshipPropertySchema } from "@/api/schema";
import { DefRelationshipProperty } from "../primitive/DefRelationshipProperty";
import { RelationshipProperty } from "../RelationshipProperty";

// Import the real Properties implementation
import { DoubleProperties } from "../primitive/DoubleProperties";
import { LongProperties } from "../primitive/LongProperties";

describe("RelationshipProperty", () => {
  // Common test data
  const weightData = new Map([
    [1, 0.5],
    [2, 1.2],
    [3, 0.8]
  ]);

  const defaultWeight = -1;

  describe("Basic functionality", () => {
    let weightValues: DoubleProperties;
    let weightSchema: RelationshipPropertySchema;
    let weightProperty: RelationshipProperty;

    beforeEach(() => {
      // Create the actual properties implementation
      weightValues = DoubleProperties.fromMap(weightData, defaultWeight);

      weightSchema = RelationshipPropertySchema.of(
        "weight",
        ValueType.DOUBLE,
        DefaultValue.of(-1),
        PropertyState.PERSISTENT,
        Aggregation.SINGLE
      );

      weightProperty = new DefRelationshipProperty(weightValues, weightSchema);
    });

    test("should retrieve values correctly", () => {
      // Access through the property interface
      expect(weightProperty.values().value(1)).toBeCloseTo(0.5);
      expect(weightProperty.values().value(2)).toBeCloseTo(1.2);
      expect(weightProperty.values().value(999)).toBe(defaultWeight); // Missing value returns default
    });

    test("should provide metadata correctly", () => {
      expect(weightProperty.key()).toBe("weight");
      expect(weightProperty.valueType()).toBe(ValueType.DOUBLE);
      expect(weightProperty.propertyState()).toBe(PropertyState.PERSISTENT);
      expect(weightProperty.aggregation()).toBe(Aggregation.SINGLE);
    });

    test("should allow updating values", () => {
      weightProperty.values().set(1, 2.5);
      expect(weightProperty.values().value(1)).toBeCloseTo(2.5);

      // Add a new value
      weightProperty.values().set(10, 3.7);
      expect(weightProperty.values().value(10)).toBeCloseTo(3.7);
    });
  });

  describe("Factory methods", () => {
    test("should create property from key and values", () => {
      const costValues = LongProperties.fromMap(new Map([[1, 10], [2, 20]]));
      const property = RelationshipProperty.of("cost", costValues);

      expect(property.key()).toBe("cost");
      expect(property.values().value(1)).toBe(10);
      expect(property.propertyState()).toBe(PropertyState.PERSISTENT); // Default state
    });

    test("should create property with custom schema", () => {
      const costValues = DoubleProperties.of(0); // Create with default value 0
      const schema = RelationshipPropertySchema.of(
        "cost",
        ValueType.DOUBLE,
        DefaultValue.of(0),
        PropertyState.TRANSIENT,
        Aggregation.MAX
      );

      const property = RelationshipProperty.of(costValues, schema);

      expect(property.key()).toBe("cost");
      expect(property.propertyState()).toBe(PropertyState.TRANSIENT);
      expect(property.aggregation()).toBe(Aggregation.MAX);
    });
  });

  describe("Different property types", () => {
    test("should handle long property values", () => {
      const countData = new Map([
        [1, 5],
        [2, 12],
        [3, 8]
      ]);

      const countValues = LongProperties.fromMap(countData);
      const countSchema = RelationshipPropertySchema.of(
        "count",
        ValueType.LONG,
        DefaultValue.of(0),
        PropertyState.PERSISTENT,
        Aggregation.SUM
      );

      const countProperty = new DefRelationshipProperty(countValues, countSchema);

      expect(countProperty.values().value(1)).toBe(5);
      expect(countProperty.values().value(4)).toBe(0); // Default value
      expect(countProperty.valueType()).toBe(ValueType.LONG);
    });

    test("should handle properties with aggregation", () => {
      // Create properties that would be aggregated in a real scenario
      const distanceValues = DoubleProperties.fromMap(
        new Map([[1, 5.2], [2, 3.7]]),
        Number.POSITIVE_INFINITY // Default for MIN aggregation
      );

      const minSchema = RelationshipPropertySchema.of(
        "distance",
        ValueType.DOUBLE,
        DefaultValue.of(Number.POSITIVE_INFINITY),
        PropertyState.PERSISTENT,
        Aggregation.MIN
      );

      const distanceProperty = new DefRelationshipProperty(distanceValues, minSchema);
      expect(distanceProperty.aggregation()).toBe(Aggregation.MIN);
      expect(distanceProperty.values().value(1)).toBeCloseTo(5.2);
    });
  });
});
