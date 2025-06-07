import { describe, it, expect } from "vitest";
import { RelationshipSchemaBuilderVisitor } from "../RelationshipSchemaBuilderVisitor";
import { RelationshipType } from "@/projection";
import { Direction } from "@/api/schema";
import { ValueType, PropertyState } from "@/api";
import { Aggregation } from "@/core";
describe("RelationshipSchema Wonka Factory", () => {

  it("should endow entityhood on relationship data", () => {
    console.log("🏭 Welcome to Relationship Chocolate Factory!");

    const factory = new RelationshipSchemaBuilderVisitor();

    // 🔧 Preparing the chocolate ingredients
    console.log("🔧 Adding relationship ingredients...");
    factory.relationshipType(RelationshipType.of("KNOWS"));
    factory.direction(Direction.DIRECTED);
    factory.key("since");
    factory.valueType(ValueType.LONG);
    factory.state(PropertyState.PERSISTENT);
    factory.aggregation(Aggregation.MIN);

    // ✨ THE ENTITYHOOD RITUAL ✨
    console.log("✨ Granting Entityhood...");
    factory.endOfEntity(); // 🪄 Raw data becomes Entity!

    // 🍫 Retrieve the finished chocolate
    const schema = factory.schema();
    expect(schema).toBeDefined();

    console.log("🍫 Relationship Entity created!");
  });

  it("should create multiple relationship entities", () => {
    console.log("🏭 Mass producing relationship entities!");

    const factory = new RelationshipSchemaBuilderVisitor();

    // 🍫 First Entity: KNOWS relationship
    factory.relationshipType(RelationshipType.of("KNOWS"));
    factory.direction(Direction.DIRECTED);
    factory.key("since");
    factory.valueType(ValueType.LONG);
    factory.state(PropertyState.PERSISTENT);
    factory.aggregation(Aggregation.MIN);
    factory.endOfEntity(); // 🪄 First Entity born!

    // 🍫 Second Entity: LIKES relationship
    factory.relationshipType(RelationshipType.of("LIKES"));
    factory.direction(Direction.UNDIRECTED);
    factory.key("strength");
    factory.valueType(ValueType.DOUBLE);
    factory.state(PropertyState.TRANSIENT);
    factory.aggregation(Aggregation.MAX);
    factory.endOfEntity(); // 🪄 Second Entity born!

    const schema = factory.schema();
    expect(schema).toBeDefined();

    console.log("🍫 Multiple Relationship Entities created!");
  });

  it("should handle entityhood ritual gracefully with missing data", () => {
    console.log("🏭 Testing incomplete chocolate recipes...");

    const factory = new RelationshipSchemaBuilderVisitor();

    // 🔧 Incomplete ingredients (missing aggregation)
    factory.relationshipType(RelationshipType.of("INCOMPLETE"));
    factory.direction(Direction.DIRECTED);
    factory.key("badProperty");
    factory.valueType(ValueType.STRING);
    factory.state(PropertyState.PERSISTENT);
    // ❌ Missing aggregation!

    // ✨ Attempt the ritual anyway
    expect(() => {
      factory.endOfEntity(); // Should gracefully skip
    }).not.toThrow();

    const schema = factory.schema();
    expect(schema).toBeDefined(); // Schema exists but probably empty

    console.log("🍫 Factory handled incomplete recipe gracefully!");
  });

});
