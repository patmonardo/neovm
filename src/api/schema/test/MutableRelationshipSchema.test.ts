import { describe, it, expect } from "vitest";
import { MutableRelationshipSchema } from "../primitive/MutableRelationshipSchema";
import { RelationshipType } from "@/projection";
import { Direction } from "../Direction";
import { ValueType } from "@/api/ValueType";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { PropertyState } from "@/api/PropertyState";

describe("MutableRelationshipSchema - Enhanced Testing", () => {
  it("should construct empty schema and add relationship types", () => {
    console.log("🏗️ === SCHEMA CONSTRUCTION AND TYPE MANAGEMENT ===");

    const schema = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log(
      `📋 Creating schema with relationship type: ${knowsType.name()}`
    ); // ← TEST: Does this work?
    console.log(
      `📊 Initial available types count: ${schema.availableTypes().length}`
    );

    // TEST + EXPECT: Initial state
    expect(schema.availableTypes().length).toBe(0);

    // Add relationship type
    console.log("➕ Adding KNOWS relationship (UNDIRECTED)...");
    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);

    const afterAdd = schema.availableTypes();
    console.log(`📊 Types after adding KNOWS: ${afterAdd.length}`);
    console.log(`🔍 KNOWS type exists: ${afterAdd.includes(knowsType)}`);
    console.log(`🧭 KNOWS is undirected: ${schema.isUndirected(knowsType)}`);

    // TEST + EXPECT: Type addition
    expect(afterAdd.length).toBe(1);
    expect(afterAdd.includes(knowsType)).toBe(true);
    expect(schema.isUndirected(knowsType)).toBe(true);

    console.log("✅ Schema construction and type management working correctly");
  });

  it("should handle property addition with different value types", () => {
    console.log("\n🔧 === PROPERTY ADDITION WITH VALUE TYPES ===");

    const schema = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log(`🔗 Working with KNOWS relationship`);
    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);

    // Add properties with different approaches
    console.log("➕ Adding since property (LONG)...");
    schema.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "since",
      ValueType.LONG
    );

    console.log("➕ Adding strength property (DOUBLE)...");
    schema.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "strength",
      ValueType.DOUBLE
    );

    console.log("➕ Adding active property (BOOLEAN, TRANSIENT)...");
    schema.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "active",
      ValueType.BOOLEAN,
      PropertyState.TRANSIENT
    );

    console.log("➕ Adding metadata property (using PropertySchema)...");
    schema.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "metadata",
      RelationshipPropertySchema.of("metadata", ValueType.STRING)
    );

    // TEST + EXPECT: Property retrieval
    const entry = schema.get(knowsType);
    console.log(`📊 Entry found: ${entry !== undefined}`);
    expect(entry).toBeDefined();

    if (entry) {
      const props = entry.properties();
      const propKeys = Object.keys(props);

      console.log(`📊 Properties found: ${propKeys.join(", ")}`);
      console.log(`🔍 Since type: ${props.since?.valueType()}`);
      console.log(`🔍 Strength type: ${props.strength?.valueType()}`);
      console.log(
        `🔍 Active type: ${props.active?.valueType()}, state: ${props.active?.state()}`
      );
      console.log(`🔍 Metadata type: ${props.metadata?.valueType()}`);

      expect(props).toHaveProperty("since");
      expect(props).toHaveProperty("strength");
      expect(props).toHaveProperty("active");
      expect(props).toHaveProperty("metadata");

      expect(props.since.valueType()).toBe(ValueType.LONG);
      expect(props.strength.valueType()).toBe(ValueType.DOUBLE);
      expect(props.active.valueType()).toBe(ValueType.BOOLEAN);
      expect(props.active.state()).toBe(PropertyState.TRANSIENT);
      expect(props.metadata.valueType()).toBe(ValueType.STRING);
    }

    console.log("✅ Property addition with value types working correctly");
  });

  it("should handle direction variations and validation", () => {
    console.log("\n🧭 === DIRECTION VARIATIONS AND VALIDATION ===");

    const schema = MutableRelationshipSchema.empty();

    console.log("🔗 Adding FRIENDS (UNDIRECTED) and FOLLOWS (DIRECTED)...");
    const friendsType = RelationshipType.of("FRIENDS");
    const followsType = RelationshipType.of("FOLLOWS");

    schema.addRelationshipType(friendsType, Direction.UNDIRECTED);
    schema.addRelationshipType(followsType, Direction.DIRECTED);

    console.log(
      `📊 Total relationship types: ${schema.availableTypes().length}`
    );
    console.log(
      `🧭 FRIENDS is undirected: ${schema.isUndirected(friendsType)}`
    );
    console.log(
      `🧭 FOLLOWS is undirected: ${schema.isUndirected(followsType)}`
    );
    console.log(`🧭 Schema globally undirected: ${schema.isUndirected()}`);

    // TEST + EXPECT: Direction validation
    expect(schema.availableTypes().length).toBe(2);
    expect(schema.isUndirected(friendsType)).toBe(true);
    expect(schema.isUndirected(followsType)).toBe(false);
    expect(schema.isUndirected()).toBe(false); // Mixed directions = not globally undirected

    // Test with only undirected relationships
    console.log("\n🔄 Testing schema with only undirected relationships...");
    const undirectedSchema = MutableRelationshipSchema.empty();
    undirectedSchema.addRelationshipType(
      RelationshipType.of("LIKES"),
      Direction.UNDIRECTED
    );
    undirectedSchema.addRelationshipType(
      RelationshipType.of("SIMILAR_TO"),
      Direction.UNDIRECTED
    );

    console.log(
      `🧭 Undirected-only schema globally undirected: ${undirectedSchema.isUndirected()}`
    );
    expect(undirectedSchema.isUndirected()).toBe(true);

    console.log("✅ Direction variations and validation working correctly");
  });

  it("should handle schema filtering correctly", () => {
    console.log("\n🔍 === SCHEMA FILTERING ===");

    const schema = MutableRelationshipSchema.empty();

    console.log("🏗️ Creating schema with multiple relationship types...");
    const knowsType = RelationshipType.of("KNOWS");
    const worksAtType = RelationshipType.of("WORKS_AT");
    const livesInType = RelationshipType.of("LIVES_IN");

    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema.addRelationshipType(worksAtType, Direction.DIRECTED);
    schema.addRelationshipType(livesInType, Direction.DIRECTED);

    console.log(`📊 Original schema types: ${schema.availableTypes().length}`);

    // Filter to keep only specific types
    console.log("🔍 Filtering to keep only KNOWS and WORKS_AT...");
    const filtered = schema.filter([knowsType, worksAtType]);

    const filteredTypes = filtered.availableTypes();
    console.log(`📊 Filtered schema types: ${filteredTypes.length}`);
    console.log(`✅ KNOWS kept: ${filteredTypes.includes(knowsType)}`);
    console.log(`✅ WORKS_AT kept: ${filteredTypes.includes(worksAtType)}`);
    console.log(`❌ LIVES_IN removed: ${!filteredTypes.includes(livesInType)}`);

    // TEST + EXPECT: Filtering results
    expect(filteredTypes.length).toBe(2);
    expect(filteredTypes.includes(knowsType)).toBe(true);
    expect(filteredTypes.includes(worksAtType)).toBe(true);
    expect(filteredTypes.includes(livesInType)).toBe(false);

    console.log("✅ Schema filtering working correctly");
  });

  it("should handle schema union operations", () => {
    console.log("\n🤝 === SCHEMA UNION OPERATIONS ===");

    console.log("🏗️ Creating two schemas with different relationship types...");
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();

    const knowsType = RelationshipType.of("KNOWS");
    const worksAtType = RelationshipType.of("WORKS_AT");

    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema1.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "since",
      ValueType.LONG
    );

    schema2.addRelationshipType(worksAtType, Direction.DIRECTED);
    schema2.addProperty(
      worksAtType,
      Direction.DIRECTED,
      "startDate",
      ValueType.LONG
    );

    console.log(`📊 Schema1 types: ${schema1.availableTypes().length}`);
    console.log(`📊 Schema2 types: ${schema2.availableTypes().length}`);

    // Perform union
    console.log("🤝 Performing union...");
    const union = schema1.union(schema2);

    const unionTypes = union.availableTypes();
    console.log(`📊 Union types: ${unionTypes.length}`);
    console.log(`✅ KNOWS in union: ${unionTypes.includes(knowsType)}`);
    console.log(`✅ WORKS_AT in union: ${unionTypes.includes(worksAtType)}`);

    // TEST + EXPECT: Union results
    expect(unionTypes.length).toBe(2);
    expect(unionTypes.includes(knowsType)).toBe(true);
    expect(unionTypes.includes(worksAtType)).toBe(true);

    // Check properties are preserved
    const knowsEntry = union.get(knowsType);
    const worksAtEntry = union.get(worksAtType);

    console.log(
      `🔍 KNOWS entry includes 'since' property: ${knowsEntry
        ?.properties()
        .hasOwnProperty("since")}`
    );
    console.log(
      `🔍 WORKS_AT entry includes 'startDate' property: ${worksAtEntry
        ?.properties()
        .hasOwnProperty("startDate")}`
    );

    expect(knowsEntry?.properties()).toHaveProperty("since");
    expect(worksAtEntry?.properties()).toHaveProperty("startDate");

    console.log("✅ Schema union operations working correctly");
  });

  it("should handle property merging in union operations", () => {
    console.log("\n🔄 === PROPERTY MERGING IN UNION ===");

    console.log(
      "🏗️ Creating schemas with same relationship type but different properties..."
    );
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    // Both schemas have KNOWS but with different properties
    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema1.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "since",
      ValueType.LONG
    );

    schema2.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema2.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "strength",
      ValueType.DOUBLE
    );

    console.log(
      `📊 Schema1 KNOWS properties: ${Object.keys(
        schema1.get(knowsType)!.properties()
      ).join(", ")}`
    );
    console.log(
      `📊 Schema2 KNOWS properties: ${Object.keys(
        schema2.get(knowsType)!.properties()
      ).join(", ")}`
    );

    // Perform union
    console.log("🤝 Performing property-merging union...");
    const union = schema1.union(schema2);

    const mergedEntry = union.get(knowsType);
    const mergedProps = mergedEntry!.properties();
    const propKeys = Object.keys(mergedProps);

    console.log(`📊 Merged KNOWS properties: ${propKeys.join(", ")}`);
    console.log(`✅ Has 'since': ${propKeys.includes("since")}`);
    console.log(`✅ Has 'strength': ${propKeys.includes("strength")}`);

    // TEST + EXPECT: Property merging
    expect(mergedProps).toHaveProperty("since");
    expect(mergedProps).toHaveProperty("strength");
    expect(mergedProps.since.valueType()).toBe(ValueType.LONG);
    expect(mergedProps.strength.valueType()).toBe(ValueType.DOUBLE);

    console.log("✅ Property merging in union working correctly");
  });

  it("should handle direction conflicts in union operations", () => {
    console.log("\n💥 === DIRECTION CONFLICTS IN UNION ===");

    console.log(
      "🏗️ Creating schemas with same relationship type but different directions..."
    );
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    // Same relationship type with conflicting directions
    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema2.addRelationshipType(knowsType, Direction.DIRECTED);

    console.log(`🧭 Schema1 KNOWS direction: UNDIRECTED`);
    console.log(`🧭 Schema2 KNOWS direction: DIRECTED`);

    // This should throw an error
    console.log("💥 Attempting union with direction conflict...");
    try {
      schema1.union(schema2);
      console.log("❌ FAIL: Should have thrown for direction conflict");
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(
        `✅ Correctly threw for direction conflict: ${(error as Error).message}`
      );
      expect(error).toBeDefined();
      expect((error as Error).message).toContain("direction"); // Should mention direction conflict
    }

    console.log("✅ Direction conflict handling working correctly");
  });

  it("should handle complex serialization scenarios", () => {
    console.log("\n📋 === COMPLEX SERIALIZATION ===");

    const schema = MutableRelationshipSchema.empty();

    console.log("🏗️ Creating complex multi-type schema...");
    const relationshipConfigs = [
      {
        type: "KNOWS",
        direction: Direction.UNDIRECTED,
        props: { since: ValueType.LONG, strength: ValueType.DOUBLE },
      },
      {
        type: "WORKS_AT",
        direction: Direction.DIRECTED,
        props: { startDate: ValueType.LONG, role: ValueType.STRING },
      },
      {
        type: "LIVES_IN",
        direction: Direction.DIRECTED,
        props: { since: ValueType.LONG, isTemporary: ValueType.BOOLEAN },
      },
    ];

    relationshipConfigs.forEach((config) => {
      const relType = RelationshipType.of(config.type);
      console.log(
        `➕ Adding ${config.type} (${config.direction.toString()})...`
      );

      schema.addRelationshipType(relType, config.direction);

      Object.entries(config.props).forEach(([propName, propType]) => {
        console.log(`   ➕ Adding property ${propName} (${propType})`);
        schema.addProperty(relType, config.direction, propName, propType);
      });
    });

    console.log("\n📤 Serializing entries to maps...");
    relationshipConfigs.forEach((config) => {
      const relType = RelationshipType.of(config.type);
      const entry = schema.get(relType);

      if (entry) {
        const map = entry.toMap();
        console.log(`\n📋 ${config.type} serialized structure:`);
        console.log(JSON.stringify(map, null, 2));

        // TEST + EXPECT: Map structure
        expect(map).toHaveProperty("direction");
        expect(map).toHaveProperty("properties");
        expect(map.direction).toBe(config.direction.toString());

        Object.keys(config.props).forEach((propName) => {
          expect(map.properties).toHaveProperty(propName);
          console.log(`   ✅ ${propName} property found in map`);
        });
      }
    });

    console.log("\n✅ Complex serialization working correctly");
  });

  it("should handle equality and cloning operations", () => {
    console.log("\n⚖️ === EQUALITY AND CLONING ===");

    console.log("🏗️ Creating original schema...");
    const original = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    original.addRelationshipType(knowsType, Direction.UNDIRECTED);
    original.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "since",
      ValueType.LONG
    );

    console.log(`📊 Original types: ${original.availableTypes().length}`);
    console.log(
      `📊 Original KNOWS properties: ${Object.keys(
        original.get(knowsType)!.properties()
      ).join(", ")}`
    );

    // Create copy using from()
    console.log("📋 Creating copy using from()...");
    const copy = MutableRelationshipSchema.from(original);

    console.log(`📊 Copy types: ${copy.availableTypes().length}`);
    console.log(
      `📊 Copy KNOWS properties: ${Object.keys(
        copy.get(knowsType)!.properties()
      ).join(", ")}`
    );

    // Test initial equality
    const initialEquals = original.equals(copy);
    const originalHash = original.hashCode();
    const copyHash = copy.hashCode();

    console.log(`⚖️ Initial equality: ${initialEquals}`);
    console.log(
      `🔢 Original includesh: ${originalHash}, Copy includesh: ${copyHash}, Equal: ${
        originalHash === copyHash
      }`
    );

    // TEST + EXPECT: Initial equality
    expect(copy).not.toBe(original); // Different instances
    expect(initialEquals).toBe(true); // But equal content
    expect(originalHash).toBe(copyHash); // Same includesh

    // Modify copy
    console.log("\n🔄 Adding property to copy...");
    copy.addProperty(
      knowsType,
      Direction.UNDIRECTED,
      "strength",
      ValueType.DOUBLE
    );

    const afterModEquals = original.equals(copy);
    const newCopyHash = copy.hashCode();

    console.log(`⚖️ Equality after modification: ${afterModEquals}`);
    console.log(
      `🔢 Original includesh: ${originalHash}, New copy includesh: ${newCopyHash}, Equal: ${
        originalHash === newCopyHash
      }`
    );

    // TEST + EXPECT: Equality after modification
    expect(afterModEquals).toBe(false);
    // Hash might or might not be different (depends on implementation)

    console.log("✅ Equality and cloning operations working correctly");
  });
});
