import { MutableRelationshipSchemaEntry } from "../primitive/MutableRelationshipSchemaEntry";
import { RelationshipType } from "@/projection";
import { Direction } from "../Direction";
import { ValueType } from "@/api";
import { PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";

describe("MutableRelationshipSchemaEntry", () => {
  it("can be constructed with a type and direction", () => {
    const type = RelationshipType.of("KNOWS");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);

    expect(entry.identifier().equals(type)).toBe(true);
    expect(entry.direction()).toBe(Direction.UNDIRECTED);
    expect(entry.isUndirected()).toBe(true);
    expect(Object.keys(entry.properties())).toHaveLength(0);
  });

  it("can add and retrieve properties with ValueType", () => {
    const type = RelationshipType.of("WORKS_AT");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    entry.addProperty("since", ValueType.LONG);
    expect(entry.properties()).toHaveProperty("since");
    expect(entry.properties().since.valueType()).toBe(ValueType.LONG);

    // Default aggregation should be NONE
    expect(entry.properties().since.aggregation()).toBe(Aggregation.NONE);
  });

  it("can add and retrieve properties with PropertyState", () => {
    const type = RelationshipType.of("LIKES");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    entry.addProperty("strength", ValueType.DOUBLE, PropertyState.TRANSIENT);
    expect(entry.properties()).toHaveProperty("strength");
    expect(entry.properties().strength.valueType()).toBe(ValueType.DOUBLE);
    expect(entry.properties().strength.state()).toBe(PropertyState.TRANSIENT);
  });

  it("can add and retrieve properties with RelationshipPropertySchema", () => {
    const type = RelationshipType.of("RATES");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    const schema = RelationshipPropertySchema.of(
      "score",
      ValueType.DOUBLE,
      undefined,
      PropertyState.PERSISTENT,
      Aggregation.AVG
    );

    entry.addProperty("score", schema);
    expect(entry.properties()).toHaveProperty("score");
    expect(entry.properties().score.valueType()).toBe(ValueType.DOUBLE);
    expect(entry.properties().score.aggregation()).toBe(Aggregation.);
  });

  it("can remove properties", () => {
    const type = RelationshipType.of("KNOWS");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);

    entry.addProperty("since", ValueType.LONG);
    entry.addProperty("strength", ValueType.DOUBLE);

    expect(Object.keys(entry.properties())).toHaveLength(2);

    entry.removeProperty("since");
    expect(Object.keys(entry.properties())).toHaveLength(1);
    expect(entry.properties()).not.toHaveProperty("since");
    expect(entry.properties()).toHaveProperty("strength");
  });

  it("can union two entries with same type and direction", () => {
    const type = RelationshipType.of("FOLLOWS");

    const entry1 = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);
    entry1.addProperty("since", ValueType.LONG);

    const entry2 = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);
    entry2.addProperty("active", ValueType.BOOLEAN);

    const union = entry1.union(entry2);
    expect(union.identifier().equals(type)).toBe(true);
    expect(union.direction()).toBe(Direction.DIRECTED);
    expect(union.properties()).toHaveProperty("since");
    expect(union.properties()).toHaveProperty("active");
  });

  it("throws on union with different relationship types", () => {
    const type1 = RelationshipType.of("KNOWS");
    const type2 = RelationshipType.of("FOLLOWS");

    const entry1 = new MutableRelationshipSchemaEntry(type1, Direction.UNDIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(type2, Direction.DIRECTED);

    expect(() => entry1.union(entry2)).toThrow();
  });

  it("throws on union with different directions", () => {
    const type = RelationshipType.of("KNOWS");

    const entry1 = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    expect(() => entry1.union(entry2)).toThrow(/Conflicting directionality/);
  });

  it("can create a copy using from()", () => {
    const type = RelationshipType.of("KNOWS");
    const original = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);
    original.addProperty("since", ValueType.LONG);

    const copy = MutableRelationshipSchemaEntry.from(original);
    expect(copy).not.toBe(original); // Different instance
    expect(copy.identifier().equals(original.identifier())).toBe(true);
    expect(copy.direction()).toBe(original.direction());
    expect(copy.properties()).toHaveProperty("since");
  });

  it("can serialize to map", () => {
    const type = RelationshipType.of("RATES");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    entry.addProperty("score", RelationshipPropertySchema.of(
      "score", ValueType.DOUBLE, undefined, PropertyState.PERSISTENT, Aggregation.AVG
    ));
    entry.addProperty("comment", ValueType.STRING);

    const map = entry.toMap();

    // Pretty prlong for inspection
    console.log(JSON.stringify(map, null, 2));

    expect(map).toHaveProperty("direction");
    expect(map).toHaveProperty("properties");
    expect(map.direction).toBe(Direction.DIRECTED.toString());

    expect(map.properties).toHaveProperty("score");
    expect(map.properties).toHaveProperty("comment");

    expect(map.properties.score).toHaveProperty("valueType");
    expect(map.properties.score).toHaveProperty("aggregation");
    expect(map.properties.score.valueType).toBe(ValueType.DOUBLE.toString());
    expect(map.properties.score.aggregation).toBe(Aggregation.AVG.toString());
  });

  it("supports equality and hashCode", () => {
    const type = RelationshipType.of("KNOWS");

    const entry1 = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);
    entry1.addProperty("since", ValueType.LONG);

    const entry2 = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);
    entry2.addProperty("since", ValueType.LONG);

    expect(entry1.equals(entry2)).toBe(true);
    expect(entry1.hashCode()).toBe(entry2.hashCode());

    // Different direction
    const entry3 = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);
    entry3.addProperty("since", ValueType.LONG);
    expect(entry1.equals(entry3)).toBe(false);

    // Different properties
    const entry4 = new MutableRelationshipSchemaEntry(type, Direction.UNDIRECTED);
    entry4.addProperty("since", ValueType.DOUBLE); // Different type
    expect(entry1.equals(entry4)).toBe(false);

    // Different number of properties
    const entry5 = MutableRelationshipSchemaEntry.from(entry1);
    entry5.addProperty("extra", ValueType.STRING);
    expect(entry1.equals(entry5)).toBe(false);
  });

  it("can serialize a larger entry to map", () => {
    const type = RelationshipType.of("COMPLEX_REL");
    const entry = new MutableRelationshipSchemaEntry(type, Direction.DIRECTED);

    // Add various properties with different settings
    entry.addProperty("longProp", ValueType.LONG);
    entry.addProperty("stringProp", ValueType.STRING);
    entry.addProperty("doubleProp", ValueType.DOUBLE);
    entry.addProperty("boolProp", ValueType.BOOLEAN);

    // Add property with aggregation
    entry.addProperty("sum", RelationshipPropertySchema.of(
      "sum", ValueType.DOUBLE, undefined, PropertyState.PERSISTENT, Aggregation.SUM
    ));

    // Add transient property
    entry.addProperty("temp", RelationshipPropertySchema.of(
      "temp", ValueType.LONG, undefined, PropertyState.TRANSIENT
    ));

    const map = entry.toMap();

    // Pretty prlong for inspection
    console.log(JSON.stringify(map, null, 2));

    // Validate structure
    expect(map.direction).toBe(Direction.DIRECTED.toString());
    expect(Object.keys(map.properties)).toHaveLength(6);
    expect(map.properties.sum.aggregation).toBe(Aggregation.SUM.toString());
    expect(map.properties.temp.state).toBe(PropertyState.TRANSIENT.toString());
  });
});
