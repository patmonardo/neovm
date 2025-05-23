import { MutableRelationshipSchema } from "../primitive/MutableRelationshipSchema";
import { RelationshipType } from "@/projection";
import { Direction } from "../Direction";
import { ValueType } from "@/api/ValueType";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { PropertyState } from "@/api/PropertyState";

describe("MutableRelationshipSchema", () => {
  it("can add and retrieve relationship types and properties", () => {
    const schema = MutableRelationshipSchema.empty();
    const type = RelationshipType.of("KNOWS");

    // Add relationship type
    schema.addRelationshipType(type, Direction.UNDIRECTED);

    // Check type exists
    expect(schema.availableTypes().has(type)).toBe(true);
    expect(schema.isUndirected(type)).toBe(true);

    // Add property
    schema.addProperty(type, Direction.UNDIRECTED, "since", ValueType.LONG);

    // Check property exists
    const entry = schema.get(type);
    expect(entry).toBeDefined();
    expect(entry!.properties()).toHaveProperty("since");
    expect(entry!.properties().since.valueType()).toBe(ValueType.LONG);
  });

  it("can add relationship types with different directions", () => {
    const schema = MutableRelationshipSchema.empty();

    // Add undirected relationship
    schema.addRelationshipType(RelationshipType.of("FRIENDS"), Direction.UNDIRECTED);

    // Add directed relationship
    schema.addRelationshipType(RelationshipType.of("FOLLOWS"), Direction.DIRECTED);

    // Check directions
    expect(schema.isUndirected(RelationshipType.of("FRIENDS"))).toBe(true);
    expect(schema.isUndirected(RelationshipType.of("FOLLOWS"))).toBe(false);

    // Check global isUndirected (should be false with mixed directions)
    expect(schema.isUndirected()).toBe(false);
  });

  it("can filter relationship types", () => {
    const schema = MutableRelationshipSchema.empty();
    const knows = RelationshipType.of("KNOWS");
    const worksAt = RelationshipType.of("WORKS_AT");

    schema.addRelationshipType(knows, Direction.UNDIRECTED);
    schema.addRelationshipType(worksAt, Direction.DIRECTED);

    const filtered = schema.filter(new Set([knows]));
    expect(filtered.availableTypes().size).toBe(1);
    expect(filtered.availableTypes().has(knows)).toBe(true);
    expect(filtered.availableTypes().has(worksAt)).toBe(false);
  });

  it("can union two schemas with different relationship types", () => {
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();

    schema1.addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);
    schema2.addRelationshipType(RelationshipType.of("WORKS_AT"), Direction.DIRECTED);

    const union = schema1.union(schema2);
    expect(union.availableTypes().size).toBe(2);
    expect(union.availableTypes().has(RelationshipType.of("KNOWS"))).toBe(true);
    expect(union.availableTypes().has(RelationshipType.of("WORKS_AT"))).toBe(true);
  });

  it("can merge properties when unioning schemas with the same relationship type", () => {
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const type = RelationshipType.of("KNOWS");

    // Both schemas have the same relationship type but different properties
    schema1.addRelationshipType(type, Direction.UNDIRECTED);
    schema1.addProperty(type, Direction.UNDIRECTED, "since", ValueType.LONG);

    schema2.addRelationshipType(type, Direction.UNDIRECTED);
    schema2.addProperty(type, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);

    const union = schema1.union(schema2);
    const entry = union.get(type);
    expect(entry).toBeDefined();
    expect(entry!.properties()).toHaveProperty("since");
    expect(entry!.properties()).toHaveProperty("strength");
  });

  it("throws when unioning schemas with the same relationship type but different directions", () => {
    const schema1 = MutableRelationshipSchema.empty();
    const schema2 = MutableRelationshipSchema.empty();
    const type = RelationshipType.of("KNOWS");

    // Add same relationship type with different directions
    schema1.addRelationshipType(type, Direction.UNDIRECTED);
    schema2.addRelationshipType(type, Direction.DIRECTED);

    // Union should throw due to direction conflict
    expect(() => schema1.union(schema2)).toThrow();
  });

  it("can serialize a larger schema to map", () => {
    const schema = MutableRelationshipSchema.empty();

    // Set up a rich schema with multiple types and properties
    const knows = RelationshipType.of("KNOWS");
    schema.addRelationshipType(knows, Direction.UNDIRECTED);
    schema.addProperty(knows, Direction.UNDIRECTED, "since", ValueType.LONG);
    schema.addProperty(knows, Direction.UNDIRECTED, "strength", ValueType.DOUBLE);

    const worksAt = RelationshipType.of("WORKS_AT");
    schema.addRelationshipType(worksAt, Direction.DIRECTED);
    schema.addProperty(worksAt, Direction.DIRECTED, "startDate", ValueType.LONG);
    schema.addProperty(worksAt, Direction.DIRECTED, "role", ValueType.STRING);
    schema.addProperty(
      worksAt,
      Direction.DIRECTED,
      "isActive",
      RelationshipPropertySchema.of("isActive", ValueType.BOOLEAN)
    );

    // Get serialized map from entries
    const knows_entry = schema.get(knows);
    const worksAt_entry = schema.get(worksAt);

    expect(knows_entry).toBeDefined();
    expect(worksAt_entry).toBeDefined();

    const knowsMap = knows_entry!.toMap();
    const worksAtMap = worksAt_entry!.toMap();

    // Pretty print for inspection
    console.log("KNOWS entry:", JSON.stringify(knowsMap, null, 2));
    console.log("WORKS_AT entry:", JSON.stringify(worksAtMap, null, 2));

    // Verify map structure
    expect(knowsMap).toHaveProperty("direction");
    expect(knowsMap).toHaveProperty("properties");
    expect(knowsMap.direction).toBe(Direction.UNDIRECTED.toString());
    expect(knowsMap.properties).toHaveProperty("since");
    expect(knowsMap.properties).toHaveProperty("strength");

    expect(worksAtMap).toHaveProperty("direction");
    expect(worksAtMap.direction).toBe(Direction.DIRECTED.toString());
    expect(worksAtMap.properties).toHaveProperty("startDate");
    expect(worksAtMap.properties).toHaveProperty("role");
    expect(worksAtMap.properties).toHaveProperty("isActive");
  });

  it("can create a schema from an existing schema", () => {
    // Create the original schema
    const original = MutableRelationshipSchema.empty();
    const type = RelationshipType.of("KNOWS");
    original.addRelationshipType(type, Direction.UNDIRECTED);
    original.addProperty(type, Direction.UNDIRECTED, "since", ValueType.LONG);

    // Create a copy using from()
    const copy = MutableRelationshipSchema.from(original);

    // Verify the copy has the same content but is a different instance
    expect(copy).not.toBe(original);
    expect(copy.availableTypes().size).toBe(1);
    expect(copy.availableTypes().has(type)).toBe(true);
    expect(copy.isUndirected(type)).toBe(true);

    const entry = copy.get(type);
    expect(entry).toBeDefined();
    expect(entry!.properties()).toHaveProperty("since");
  });

  it("supports both value type and property schema when adding properties", () => {
    const schema = MutableRelationshipSchema.empty();
    const type = RelationshipType.of("KNOWS");
    schema.addRelationshipType(type, Direction.UNDIRECTED);

    // Add property with ValueType
    schema.addProperty(type, Direction.UNDIRECTED, "since", ValueType.LONG);

    // Add property with PropertySchema
    schema.addProperty(
      type,
      Direction.UNDIRECTED,
      "strength",
      RelationshipPropertySchema.of("strength", ValueType.DOUBLE)
    );

    // Add property with ValueType and PropertyState
    schema.addProperty(
      type,
      Direction.UNDIRECTED,
      "active",
      ValueType.BOOLEAN,
      PropertyState.TRANSIENT
    );

    const entry = schema.get(type);
    expect(entry!.properties().since.valueType()).toBe(ValueType.LONG);
    expect(entry!.properties().strength.valueType()).toBe(ValueType.DOUBLE);
    expect(entry!.properties().active.valueType()).toBe(ValueType.BOOLEAN);
    expect(entry!.properties().active.state()).toBe(PropertyState.TRANSIENT);
  });
});
