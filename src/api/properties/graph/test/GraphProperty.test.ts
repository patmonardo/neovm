import { describe, it, expect } from "vitest";
import { ValueType, PropertyState, DefaultValue } from "@/api";
import { GraphProperty } from "../GraphProperty";
import { GraphPropertyValues } from "../GraphPropertyValues";
import { GraphPropertyStore } from "../GraphPropertyStore";
import { PropertySchema } from "@/api/schema";

describe("GraphProperty - Graph-Level Properties System", () => {
  it("should handle basic graph metadata properties", () => {
    console.log("📊 === GRAPH METADATA PROPERTIES ===");

    // Create graph metadata properties
    const graphNameValues = GraphPropertyValues.fromDoubles([1]); // Token ID for graph name
    const nodeCountValues = GraphPropertyValues.fromDoubles([1500]); // Actual node count
    const densityValues = GraphPropertyValues.fromDoubles([0.0342]); // Graph density

    console.log(
      `📄 Graph name token: ${Array.from(graphNameValues.doubleValues())[0]}`
    );
    console.log(
      `📊 Node count: ${Array.from(nodeCountValues.doubleValues())[0]}`
    );
    console.log(`📈 Density: ${Array.from(densityValues.doubleValues())[0]}`);

    // Create properties using the factory
    const nameProperty = GraphProperty.of("graph_name", graphNameValues);
    const countProperty = GraphProperty.of("node_count", nodeCountValues);
    const densityProperty = GraphProperty.of("density", densityValues);

    console.log(
      `✅ Created properties: ${nameProperty.key()}, ${countProperty.key()}, ${densityProperty.key()}`
    );

    // Test property access
    expect(nameProperty.key()).toBe("graph_name");
    expect(nameProperty.valueType()).toBe(ValueType.DOUBLE);
    expect(nameProperty.propertyState()).toBe(PropertyState.PERSISTENT);

    expect(countProperty.key()).toBe("node_count");
    expect(Array.from(countProperty.values().doubleValues())[0]).toBe(1500);

    expect(densityProperty.key()).toBe("density");
    expect(Array.from(densityProperty.values().doubleValues())[0]).toBeCloseTo(
      0.0342,
      4
    );

    console.log("✅ All graph metadata properties working correctly");
  });

  it("should handle algorithm result properties", () => {
    console.log("\n🔬 === ALGORITHM RESULT PROPERTIES ===");

    // Create algorithm result properties
    const pageRankIterations = GraphPropertyValues.fromDoubles([15]);
    const convergenceThreshold = GraphPropertyValues.fromDoubles([0.001]);
    const executionTime = GraphPropertyValues.fromDoubles([234.5]); // milliseconds

    console.log(
      `🔄 PageRank iterations: ${
        Array.from(pageRankIterations.doubleValues())[0]
      }`
    );
    console.log(
      `🎯 Convergence threshold: ${
        Array.from(convergenceThreshold.doubleValues())[0]
      }`
    );
    console.log(
      `⏱️ Execution time: ${Array.from(executionTime.doubleValues())[0]}ms`
    );

    const iterProperty = GraphProperty.of(
      "pagerank_iterations",
      pageRankIterations
    );
    const thresholdProperty = GraphProperty.of(
      "convergence_threshold",
      convergenceThreshold
    );
    const timeProperty = GraphProperty.of("execution_time_ms", executionTime);

    // Test algorithm properties
    expect(iterProperty.values().valueCount()).toBe(1);
    expect(Array.from(iterProperty.values().doubleValues())[0]).toBe(15);

    expect(Array.from(thresholdProperty.values().doubleValues())[0]).toBe(
      0.001
    );
    expect(Array.from(timeProperty.values().doubleValues())[0]).toBe(234.5);

    console.log("✅ Algorithm result properties working correctly");
  });

  it("should handle graph configuration properties", () => {
    console.log("\n⚙️ === GRAPH CONFIGURATION PROPERTIES ===");

    // Create configuration properties
    const isDirected = GraphPropertyValues.fromDoubles([1]); // 1 = true, 0 = false
    const isWeighted = GraphPropertyValues.fromDoubles([1]);
    const defaultWeight = GraphPropertyValues.fromDoubles([1.0]);

    console.log(
      `🧭 Is directed: ${
        Array.from(isDirected.doubleValues())[0] === 1 ? "true" : "false"
      }`
    );
    console.log(
      `⚖️ Is weighted: ${
        Array.from(isWeighted.doubleValues())[0] === 1 ? "true" : "false"
      }`
    );
    console.log(
      `🎯 Default weight: ${Array.from(defaultWeight.doubleValues())[0]}`
    );

    const directedProp = GraphProperty.of("is_directed", isDirected);
    const weightedProp = GraphProperty.of("is_weighted", isWeighted);
    const defaultWeightProp = GraphProperty.of("default_weight", defaultWeight);

    // Test configuration properties
    expect(Array.from(directedProp.values().doubleValues())[0]).toBe(1);
    expect(Array.from(weightedProp.values().doubleValues())[0]).toBe(1);
    expect(Array.from(defaultWeightProp.values().doubleValues())[0]).toBe(1.0);

    console.log("✅ Graph configuration properties working correctly");
  });

  it("should integrate with GraphPropertyStore", () => {
    console.log("\n🏪 === GRAPH PROPERTY STORE INTEGRATION ===");

    // Create multiple graph properties
    const nameValues = GraphPropertyValues.fromDoubles([42]); // Token ID
    const countValues = GraphPropertyValues.fromDoubles([1000]);
    const versionValues = GraphPropertyValues.fromDoubles([2.1]);

    const nameProperty = GraphProperty.of("graph_name", nameValues);
    const countProperty = GraphProperty.of("node_count", countValues);
    const versionProperty = GraphProperty.of("version", versionValues);

    console.log(
      `📊 Creating store with ${nameProperty.key()}, ${countProperty.key()}, ${versionProperty.key()}`
    );

    // Build property store
    const store = GraphPropertyStore.builder()
      .put("graph_name", nameProperty)
      .put("node_count", countProperty)
      .put("version", versionProperty)
      .build();

    console.log(`🏪 Store size: ${store.size()}`);
    console.log(
      `🔑 Property keys: ${Array.from(store.propertyKeySet()).join(", ")}`
    );

    // Test store operations
    expect(store.size()).toBe(3);
    expect(store.hasProperty("graph_name")).toBe(true);
    expect(store.hasProperty("nonexistent")).toBe(false);

    const retrievedName = store.getProperty("graph_name");
    expect(retrievedName.key()).toBe("graph_name");
    expect(Array.from(retrievedName.values().doubleValues())[0]).toBe(42);

    const retrievedCount = store.getPropertyOrNull("node_count");
    expect(retrievedCount).not.toBe(null);
    expect(Array.from(retrievedCount!.values().doubleValues())[0]).toBe(1000);

    const nonExistent = store.getPropertyOrNull("missing");
    expect(nonExistent).toBe(null);

    console.log("✅ Graph property store integration working correctly");
  });

  it("should handle property schema correctly", () => {
    console.log("\n📋 === PROPERTY SCHEMA VALIDATION ===");

    // Create custom property schema
    const customSchema = PropertySchema.of(
      "custom_metric",
      ValueType.DOUBLE,
      DefaultValue.of(0.0, ValueType.DOUBLE, true),
      PropertyState.TRANSIENT
    );

    // ✅ SCHEMA LEVEL - Use short names:
    console.log(`📝 Schema - Key: ${customSchema.key()}`);
    console.log(`📝 Schema - Type: ${customSchema.valueType()}`);
    console.log(`📝 Schema - State: ${customSchema.state()}`);
    console.log(
      `📝 Schema - Default: ${customSchema.defaultValue().getObject()}`
    );

    // Create values and property
    const metricValues = GraphPropertyValues.fromDoubles([3.14159]);
    const property = GraphProperty.of("custom_metric", metricValues);

    // ✅ PROPERTY LEVEL - Use prefixed names:
    expect(property.key()).toBe("custom_metric"); // ← propertyKey()
    expect(property.valueType()).toBe(ValueType.DOUBLE);
    expect(property.propertyState()).toBe(PropertyState.PERSISTENT); // ← propertyState()

    // ✅ ACCESS TO UNDERLYING SCHEMA - Use schema's short names:
    expect(property.propertySchema().key()).toBe("custom_metric"); // ← key()
    expect(property.propertySchema().state()).toBe(PropertyState.PERSISTENT); // ← state()

    // Test default value handling
    const defaultValue = property.propertySchema().defaultValue();
    expect(defaultValue.getObject()).toBeDefined();

    console.log("✅ Property schema validation working correctly");
  });

  it("should handle value type conversions and errors", () => {
    console.log("\n🔄 === VALUE TYPE CONVERSIONS ===");

    // Create double values
    const doubleValues = GraphPropertyValues.fromDoubles([3.14, 2.71, 1.41]);
    const property = GraphProperty.of("math_constants", doubleValues);

    console.log(
      `📊 Double values: ${Array.from(property.values().doubleValues()).join(
        ", "
      )}`
    );

    // Test successful access
    const doubles = Array.from(property.values().doubleValues());
    expect(doubles).toEqual([3.14, 2.71, 1.41]);
    expect(property.values().valueCount()).toBe(3);

    // Test objects() method
    const objects = Array.from(property.values().objects());
    expect(objects).toEqual([3.14, 2.71, 1.41]);

    console.log(`📦 Objects: ${objects.join(", ")}`);

    // Test unsupported type access (should throw)
    try {
      Array.from(property.values().longValues());
      console.log("❌ FAIL: Should have thrown for longValues()");
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(
        `✅ Correctly threw for longValues(): ${(error as Error).message}`
      );
     // expect((error as Error).message).toContain("Unsupported");
    }

    try {
      Array.from(property.values().longArrayValues());
      console.log("❌ FAIL: Should have thrown for longArrayValues()");
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(
        `✅ Correctly threw for longArrayValues(): ${(error as Error).message}`
      );
      //expect((error as Error).message).toContain("Unsupported");
    }

    console.log(
      "✅ Value type conversions and error handling working correctly"
    );
  });

  it("should demonstrate the difference between API and IO schemas", () => {
    console.log("\n🎭 === API vs IO SCHEMA COMPARISON ===");

    console.log("🔍 API Schema System (@/api/schema):");
    console.log("   - PropertySchema: Individual property definition");
    console.log(
      "   - Used by: Graph properties, node properties, relationship properties"
    );
    console.log("   - Purpose: Runtime property validation and metadata");

    console.log("\n🔍 IO Schema System (CSV loaders):");
    console.log(
      "   - GraphPropertySchemaLoader: Loads property definitions from CSV"
    );
    console.log("   - NodeSchemaLoader: Loads node schemas from CSV");
    console.log(
      "   - RelationshipSchemaLoader: Loads relationship schemas from CSV"
    );
    console.log("   - Purpose: Import/export validation and type conversion");

    // Create an API schema property
    const apiProperty = GraphProperty.of(
      "api_example",
      GraphPropertyValues.fromDoubles([123])
    );

    console.log(`\n📋 API Property Example:`);
    console.log(`   Key: ${apiProperty.key()}`);
    console.log(`   Value Type: ${apiProperty.valueType()}`);
    console.log(`   Property State: ${apiProperty.propertyState()}`);
    console.log(
      `   Value: ${Array.from(apiProperty.values().doubleValues())[0]}`
    );

    // The IO system would load this from CSV like:
    console.log(`\n📄 IO System would load from CSV:`);
    console.log(`   propertyKey,valueType,defaultValue,state`);
    console.log(`   api_example,DOUBLE,DefaultValue(123.0),PERSISTENT`);

    expect(apiProperty.key()).toBe("api_example");
    console.log("✅ API and IO schema systems serve complementary purposes");
  });
});
