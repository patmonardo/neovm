import { describe, it, expect } from "vitest";
import { MutableRelationshipSchema } from "../primitive/MutableRelationshipSchema";
import { RelationshipType } from "@/projection";
import { Direction } from "../Direction";
import { ValueType } from "@/api/ValueType";
import { PropertyState } from "@/api/PropertyState";

describe("MutableRelationshipSchema", () => {
  it("should construct empty schema and manage relationship types", () => {
    console.log("\n🏗️ === SCHEMA CONSTRUCTION AND TYPE MANAGEMENT ===");

    // 🏗️ SETUP: Create empty schema
    const schema = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log(`📋 Creating schema with relationship type: ${knowsType.name()}`);
    console.log(`📊 Initial available types: ${schema.availableTypes().length}`);

    // ✅ VERIFY: Initial empty state
    expect(schema.availableTypes().length).toBe(0);

    // 🔧 ACTION: Add relationship type
    console.log("➕ Adding KNOWS relationship (UNDIRECTED)...");
    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);

    // ✅ VERIFY: Type addition
    const availableTypes = schema.availableTypes();
    console.log(`📊 Types after adding: ${availableTypes.length}`);
    console.log(`🔍 Contains KNOWS: ${availableTypes.includes(knowsType)}`);
    console.log(`🧭 KNOWS is undirected: ${schema.isUndirected(knowsType)}`);

    expect(availableTypes.length).toBe(1);
    expect(availableTypes.includes(knowsType)).toBe(true);
    expect(schema.isUndirected(knowsType)).toBe(true);

    console.log("✅ Schema construction and type management working");
  });

  it("should manage properties with Map API", () => {
    console.log("\n🔧 === PROPERTY MANAGEMENT WITH MAP API ===");

    // 🏗️ SETUP: Create schema with relationship
    const schema = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);
    console.log(`🔗 Created KNOWS relationship`);

    // 🔧 ACTION: Add various property types
    console.log("➕ Adding properties with different types...");
    schema.addProperty(knowsType, Direction.UNDIRECTED, "since", ValueType.LONG);
    schema.addProperty(knowsType, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);
    schema.addProperty(knowsType, Direction.UNDIRECTED, "active", ValueType.BOOLEAN, PropertyState.TRANSIENT);

    // ✅ VERIFY: Properties using Map API
    const entry = schema.get(knowsType);
    expect(entry).toBeDefined();

    const properties = entry!.properties();
    const propertyNames = Array.from(properties.keys());

    console.log(`📊 Properties added: ${propertyNames.join(", ")}`);
    console.log(`🔍 Since type: ${properties.get("since")?.valueType()}`);
    console.log(`🔍 Strength type: ${properties.get("strength")?.valueType()}`);
    console.log(`🔍 Active type: ${properties.get("active")?.valueType()}, state: ${properties.get("active")?.state()}`);

    // ✅ VERIFY: Map methods work correctly
    expect(properties.size).toBe(3);
    expect(properties.has("since")).toBe(true);
    expect(properties.has("strength")).toBe(true);
    expect(properties.has("active")).toBe(true);

    expect(properties.get("since")!.valueType()).toBe(ValueType.LONG);
    expect(properties.get("strength")!.valueType()).toBe(ValueType.DOUBLE);
    expect(properties.get("active")!.valueType()).toBe(ValueType.BOOLEAN);
    expect(properties.get("active")!.state()).toBe(PropertyState.TRANSIENT);

    console.log("✅ Property management with Map API working");
  });

  it("should handle direction variations correctly", () => {
    console.log("\n🧭 === DIRECTION VARIATIONS ===");

    // 🏗️ SETUP: Create schema with mixed directions
    const schema = MutableRelationshipSchema.empty();
    const friendsType = RelationshipType.of("FRIENDS");
    const followsType = RelationshipType.of("FOLLOWS");

    console.log("🔗 Adding mixed-direction relationships...");
    schema.addRelationshipType(friendsType, Direction.UNDIRECTED);
    schema.addRelationshipType(followsType, Direction.DIRECTED);

    // ✅ VERIFY: Direction properties
    console.log(`🧭 FRIENDS is undirected: ${schema.isUndirected(friendsType)}`);
    console.log(`🧭 FOLLOWS is undirected: ${schema.isUndirected(followsType)}`);
    console.log(`🧭 Schema globally undirected: ${schema.isUndirected()}`);

    expect(schema.availableTypes().length).toBe(2);
    expect(schema.isUndirected(friendsType)).toBe(true);
    expect(schema.isUndirected(followsType)).toBe(false);
    expect(schema.isUndirected()).toBe(false); // Mixed = not globally undirected

    // 🔧 ACTION: Test all-undirected scenario
    console.log("\n🔄 Testing all-undirected schema...");
    const undirectedSchema = MutableRelationshipSchema.empty();
    undirectedSchema.addRelationshipType(RelationshipType.of("LIKES"), Direction.UNDIRECTED);
    undirectedSchema.addRelationshipType(RelationshipType.of("SIMILAR_TO"), Direction.UNDIRECTED);

    console.log(`🧭 All-undirected schema globally undirected: ${undirectedSchema.isUndirected()}`);
    expect(undirectedSchema.isUndirected()).toBe(true);

    console.log("✅ Direction variations working correctly");
  });

  it("should filter schemas by relationship types", () => {
    console.log("\n🔍 === SCHEMA FILTERING ===");

    // 🏗️ SETUP: Create schema with multiple types
    const schema = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");
    const worksAtType = RelationshipType.of("WORKS_AT");
    const livesInType = RelationshipType.of("LIVES_IN");

    console.log("🏗️ Building multi-type schema...");
    schema.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema.addRelationshipType(worksAtType, Direction.DIRECTED);
    schema.addRelationshipType(livesInType, Direction.DIRECTED);

    console.log(`📊 Original types: ${schema.availableTypes().length}`);

    // 🔧 ACTION: Filter to subset
    console.log("🔍 Filtering to keep only KNOWS and WORKS_AT...");
    const filtered = schema.filter([knowsType, worksAtType]);

    // ✅ VERIFY: Filtered results
    const filteredTypes = filtered.availableTypes();
    console.log(`📊 Filtered types: ${filteredTypes.length}`);
    console.log(`✅ KNOWS kept: ${filteredTypes.includes(knowsType)}`);
    console.log(`✅ WORKS_AT kept: ${filteredTypes.includes(worksAtType)}`);
    console.log(`❌ LIVES_IN removed: ${!filteredTypes.includes(livesInType)}`);

    expect(filteredTypes.length).toBe(2);
    expect(filteredTypes.includes(knowsType)).toBe(true);
    expect(filteredTypes.includes(worksAtType)).toBe(true);
    expect(filteredTypes.includes(livesInType)).toBe(false);

    console.log("✅ Schema filtering working correctly");
  });

  it("should union schemas with different relationship types", () => {
    console.log("\n🤝 === SCHEMA UNION - DIFFERENT TYPES ===");

    // 🏗️ SETUP: Create two schemas with different types
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");
    const worksAtType = RelationshipType.of("WORKS_AT");

    console.log("🏗️ Building separate schemas...");
    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema1.addProperty(knowsType, Direction.UNDIRECTED, "since", ValueType.LONG);

    schema2.addRelationshipType(worksAtType, Direction.DIRECTED);
    schema2.addProperty(worksAtType, Direction.DIRECTED, "startDate", ValueType.LONG);

    console.log(`📊 Schema1 types: ${schema1.availableTypes().length}`);
    console.log(`📊 Schema2 types: ${schema2.availableTypes().length}`);

    // 🔧 ACTION: Perform union
    console.log("🤝 Performing union...");
    const union = schema1.union(schema2);

    // ✅ VERIFY: Union contains both types
    const unionTypes = union.availableTypes();
    console.log(`📊 Union types: ${unionTypes.length}`);
    console.log(`✅ Contains KNOWS: ${unionTypes.includes(knowsType)}`);
    console.log(`✅ Contains WORKS_AT: ${unionTypes.includes(worksAtType)}`);

    expect(unionTypes.length).toBe(2);
    expect(unionTypes.includes(knowsType)).toBe(true);
    expect(unionTypes.includes(worksAtType)).toBe(true);

    // ✅ VERIFY: Properties preserved using Map API
    const knowsEntry = union.get(knowsType);
    const worksAtEntry = union.get(worksAtType);

    console.log(`🔍 KNOWS has 'since': ${knowsEntry?.properties().has("since")}`);
    console.log(`🔍 WORKS_AT has 'startDate': ${worksAtEntry?.properties().has("startDate")}`);

    expect(knowsEntry?.properties().has("since")).toBe(true);
    expect(worksAtEntry?.properties().has("startDate")).toBe(true);

    console.log("✅ Schema union with different types working");
  });

  it("should union schemas with same type and merge properties", () => {
    console.log("\n🔄 === SCHEMA UNION - PROPERTY MERGING ===");

    // 🏗️ SETUP: Two schemas with same type, different properties
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log("🏗️ Building schemas with same type, different properties...");
    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema1.addProperty(knowsType, Direction.UNDIRECTED, "since", ValueType.LONG);

    schema2.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema2.addProperty(knowsType, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);

    const schema1Props = schema1.get(knowsType)!.properties();
    const schema2Props = schema2.get(knowsType)!.properties();

    console.log(`📊 Schema1 KNOWS properties: ${Array.from(schema1Props.keys()).join(", ")}`);
    console.log(`📊 Schema2 KNOWS properties: ${Array.from(schema2Props.keys()).join(", ")}`);

    // 🔧 ACTION: Union with property merging
    console.log("🤝 Performing property-merging union...");
    const union = schema1.union(schema2);

    // ✅ VERIFY: Properties merged correctly
    const mergedEntry = union.get(knowsType);
    const mergedProps = mergedEntry!.properties();
    const propertyNames = Array.from(mergedProps.keys());

    console.log(`📊 Merged KNOWS properties: ${propertyNames.join(", ")}`);
    console.log(`✅ Has 'since': ${mergedProps.has("since")}`);
    console.log(`✅ Has 'strength': ${mergedProps.has("strength")}`);

    expect(mergedProps.has("since")).toBe(true);
    expect(mergedProps.has("strength")).toBe(true);
    expect(mergedProps.get("since")!.valueType()).toBe(ValueType.LONG);
    expect(mergedProps.get("strength")!.valueType()).toBe(ValueType.DOUBLE);

    console.log("✅ Property merging in union working");
  });

  it("should handle direction conflicts in union", () => {
    console.log("\n💥 === UNION DIRECTION CONFLICTS ===");

    // 🏗️ SETUP: Same type with conflicting directions
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log("🏗️ Creating direction conflict scenario...");
    schema1.addRelationshipType(knowsType, Direction.UNDIRECTED);
    schema2.addRelationshipType(knowsType, Direction.DIRECTED);

    console.log(`🧭 Schema1 KNOWS: UNDIRECTED`);
    console.log(`🧭 Schema2 KNOWS: DIRECTED`);

    // 🔧 ACTION: Attempt union (should fail)
    console.log("💥 Attempting union with direction conflict...");

    // ✅ VERIFY: Error thrown for direction conflict
    expect(() => {
      schema1.union(schema2);
    }).toThrow();

    console.log("✅ Direction conflict properly rejected");
  });

  it("should copy schemas correctly with from() method", () => {
    console.log("\n📋 === SCHEMA COPYING ===");

    // 🏗️ SETUP: Create complex original schema
    const original = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");
    const worksAtType = RelationshipType.of("WORKS_AT");

    console.log("🏗️ Building complex original schema...");
    original.addRelationshipType(knowsType, Direction.UNDIRECTED);
    original.addProperty(knowsType, Direction.UNDIRECTED, "since", ValueType.LONG);
    original.addProperty(knowsType, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);

    original.addRelationshipType(worksAtType, Direction.DIRECTED);
    original.addProperty(worksAtType, Direction.DIRECTED, "startDate", ValueType.LONG);

    console.log(`📊 Original types: ${original.availableTypes().length}`);

    // 🔧 ACTION: Copy using from()
    console.log("📋 Creating copy using from()...");
    const copy = MutableRelationshipSchema.from(original);

    // ✅ VERIFY: Copy is accurate but separate
    expect(copy).not.toBe(original); // Different instances
    expect(copy.availableTypes().length).toBe(original.availableTypes().length);

    const copyKnowsEntry = copy.get(knowsType);
    const copyWorksAtEntry = copy.get(worksAtType);

    console.log(`📋 Copy KNOWS properties: ${Array.from(copyKnowsEntry!.properties().keys()).join(", ")}`);
    console.log(`📋 Copy WORKS_AT properties: ${Array.from(copyWorksAtEntry!.properties().keys()).join(", ")}`);

    expect(copyKnowsEntry?.properties().has("since")).toBe(true);
    expect(copyKnowsEntry?.properties().has("strength")).toBe(true);
    expect(copyWorksAtEntry?.properties().has("startDate")).toBe(true);

    console.log("✅ Schema copying working correctly");
  });

  it("should handle equality and hash codes", () => {
    console.log("\n⚖️ === EQUALITY AND HASH CODES ===");

    // 🏗️ SETUP: Create identical schemas
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const knowsType = RelationshipType.of("KNOWS");

    console.log("🏗️ Building identical schemas...");
    [schema1, schema2].forEach(schema => {
      schema.addRelationshipType(knowsType, Direction.UNDIRECTED);
      schema.addProperty(knowsType, Direction.UNDIRECTED, "since", ValueType.LONG);
    });

    // ✅ VERIFY: Equal schemas
    const areEqual = schema1.equals(schema2);
    const hash1 = schema1.hashCode();
    const hash2 = schema2.hashCode();

    console.log(`⚖️ Schemas equal: ${areEqual}`);
    console.log(`🔢 Hash codes equal: ${hash1 === hash2} (${hash1} vs ${hash2})`);

    expect(areEqual).toBe(true);
    expect(hash1).toBe(hash2);

    // 🔧 ACTION: Modify one schema
    console.log("🔄 Adding property to schema2...");
    schema2.addProperty(knowsType, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);

    // ✅ VERIFY: No longer equal
    const stillEqual = schema1.equals(schema2);
    console.log(`⚖️ After modification equal: ${stillEqual}`);
    expect(stillEqual).toBe(false);

    console.log("✅ Equality and hash codes working correctly");
  });
});
