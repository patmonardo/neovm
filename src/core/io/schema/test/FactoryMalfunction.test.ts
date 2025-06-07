import { describe, it, expect } from "vitest";
import { NodeSchemaBuilderVisitor } from "../NodeSchemaBuilderVisitor";
import { RelationshipSchemaBuilderVisitor } from "../RelationshipSchemaBuilderVisitor";
import { NodeLabel, RelationshipType } from "@/projection";
import { Direction } from "@/api/schema";
import { ValueType, PropertyState } from "@/api";
import { Aggregation } from "@/core";

describe("Wonka Factory Malfunctions", () => {

  it("should test what happens when NodeSchema endOfEntity fails", () => {
    console.log("💥 Testing Node Factory Explosion!");

    const factory = new NodeSchemaBuilderVisitor();

    // 🔧 Set up some good data first
    factory.nodeLabel(NodeLabel.of("Person"));
    factory.key("name");
    factory.valueType(ValueType.STRING);
    factory.state(PropertyState.PERSISTENT);
    factory.endOfEntity(); // ✅ This should work

    // 🧪 Now try to break it
    factory.nodeLabel(NodeLabel.of("BadNode"));
    factory.key("badProperty");
    // ❌ Missing valueType and state!

    let schemaBeforeFailure = factory.schema();
    console.log("📊 Schema before malfunction attempt");

    // 💥 THE MALFUNCTION MOMENT
    expect(() => {
      factory.endOfEntity(); // What happens here?
    }).not.toThrow(); // Or maybe it WILL throw?

    let schemaAfterFailure = factory.schema();
    console.log("📊 Schema after malfunction - did it melt?");

    // 🔍 Compare schemas
    expect(schemaBeforeFailure).toBeDefined();
    expect(schemaAfterFailure).toBeDefined();

    // Are they the same object? Did the schema survive?
    expect(schemaBeforeFailure === schemaAfterFailure).toBe(true);

    console.log("🍫 Factory malfunction test complete!");
  });

  it("should test partial data corruption in RelationshipSchema", () => {
    console.log("⚡ Testing Relationship Factory Short Circuit!");

    const factory = new RelationshipSchemaBuilderVisitor();

    // 🍫 Create one good entity first
    factory.relationshipType(RelationshipType.of("WORKS"));
    factory.direction(Direction.DIRECTED);
    factory.key("goodProperty");
    factory.valueType(ValueType.STRING);
    factory.state(PropertyState.PERSISTENT);
    factory.aggregation(Aggregation.NONE);
    factory.endOfEntity(); // ✅ Good entity created

    // ⚡ Now attempt corruption
    factory.relationshipType(RelationshipType.of("CORRUPT"));
    factory.direction(Direction.DIRECTED);
    factory.key("corruptProperty");
    // ❌ Missing everything else!

    console.log("⚡ Attempting to corrupt the factory...");

    let errorThrown = false;
    try {
      factory.endOfEntity(); // Will this corrupt the whole schema?
    } catch (error) {
      errorThrown = true;
      console.log(`💥 Factory threw error: ${(error as Error).message}`);
    }

    const finalSchema = factory.schema();

    // 🔍 Did the good entity survive the corruption attempt?
    expect(finalSchema).toBeDefined();
    console.log("🍫 Final schema state after corruption attempt");

    if (!errorThrown) {
      console.log("✅ Factory handled corruption gracefully (no error thrown)");
    } else {
      console.log("💥 Factory threw error during corruption");
    }
  });

  it("should test schema state during progressive corruption", () => {
    console.log("🌡️ Testing Progressive Schema Temperature!");

    const factory = new NodeSchemaBuilderVisitor();

    // 🌡️ Temperature check 1: Fresh factory
    let schema1 = factory.schema();
    console.log("🌡️ Fresh factory temperature");

    // 🔧 Add some good data
    factory.nodeLabel(NodeLabel.of("GoodNode"));
    factory.key("goodProp");
    factory.valueType(ValueType.STRING);
    factory.state(PropertyState.PERSISTENT);

    // 🌡️ Temperature check 2: Before endOfEntity
    let schema2 = factory.schema();
    console.log("🌡️ Before endOfEntity temperature");

    factory.endOfEntity(); // ✨ Successful entity creation

    // 🌡️ Temperature check 3: After successful entity
    let schema3 = factory.schema();
    console.log("🌡️ After successful entity temperature");

    // 💣 Add corrupted data (no endOfEntity yet)
    factory.nodeLabel(NodeLabel.of("CorruptNode"));
    factory.key("corruptProp");
    // Missing valueType and state

    // 🌡️ Temperature check 4: After adding corrupt data
    let schema4 = factory.schema();
    console.log("🌡️ After adding corrupt data temperature");

    // 🔍 Are all schemas the same object?
    expect(schema1 === schema2).toBe(true);
    expect(schema2 === schema3).toBe(true);
    expect(schema3 === schema4).toBe(true);

    console.log("🌡️ Schema object identity maintained throughout!");
  });

  it("should test what happens with completely empty endOfEntity", () => {
    console.log("🕳️ Testing Empty Void endOfEntity!");

    const factory = new NodeSchemaBuilderVisitor();

    // 🕳️ Call endOfEntity with absolutely no data
    expect(() => {
      factory.endOfEntity(); // What happens with pure void?
    }).not.toThrow();

    const voidSchema = factory.schema();
    expect(voidSchema).toBeDefined();

    console.log("🕳️ Void endOfEntity handled!");
  });

});
