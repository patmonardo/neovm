import { NodeLabel } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { MutableNodeSchemaEntry } from "../primitive/MutableNodeSchemaEntry";

describe("MutableNodeSchemaEntry", () => {
  it("can be constructed with a label and properties", () => {
    const label = NodeLabel.of("Person");
    const entry = new MutableNodeSchemaEntry(label);
    expect(entry.identifier().equals(label)).toBe(true);
    expect(Object.keys(entry.properties())).toHaveLength(0);

    entry.addProperty("age", ValueType.LONG);
    expect(entry.properties()).toHaveProperty("age");
    expect(entry.properties()["age"].valueType()).toBe(ValueType.LONG);
  });

  it("can add and remove properties", () => {
    const label = NodeLabel.of("Company");
    const entry = new MutableNodeSchemaEntry(label);
    entry.addProperty("name", ValueType.STRING);
    entry.addProperty("founded", ValueType.LONG);

    expect(entry.properties()).toHaveProperty("name");
    expect(entry.properties()).toHaveProperty("founded");

    entry.removeProperty("name");
    expect(entry.properties()).not.toHaveProperty("name");
    expect(entry.properties()).toHaveProperty("founded");
  });

  it("can union with another entry of the same label", () => {
    const label = NodeLabel.of("City");
    const entry1 = new MutableNodeSchemaEntry(label);
    entry1.addProperty("population", ValueType.LONG);

    const entry2 = new MutableNodeSchemaEntry(label);
    entry2.addProperty("name", ValueType.STRING);

    const union = entry1.union(entry2);
    expect(union.properties()).toHaveProperty("population");
    expect(union.properties()).toHaveProperty("name");
  });

  it("throws on union with a different label", () => {
    const entry1 = new MutableNodeSchemaEntry(NodeLabel.of("A"));
    const entry2 = new MutableNodeSchemaEntry(NodeLabel.of("B"));
    expect(() => entry1.union(entry2)).toThrow();
  });

  it("supports equality and hashCode", () => {
    const label = NodeLabel.of("Person");
    const entry1 = new MutableNodeSchemaEntry(label);
    entry1.addProperty("age", ValueType.LONG);

    const entry2 = MutableNodeSchemaEntry.from(entry1);
    expect(entry1.equals(entry2)).toBe(true);
    expect(entry1.hashCode()).toBe(entry2.hashCode());

    entry2.addProperty("name", ValueType.STRING);
    expect(entry1.equals(entry2)).toBe(false);
  });

it("can serialize a larger entry to map", () => {
  const label = NodeLabel.of("Person");
  const entry = new MutableNodeSchemaEntry(label);

  entry.addProperty("age", ValueType.LONG);
  entry.addProperty("name", ValueType.STRING);
  entry.addProperty("employed", ValueType.BOOLEAN);
  entry.addProperty("height", ValueType.DOUBLE);

  const map = entry.toMap();

  // Pretty print for inspection
  console.log(JSON.stringify(map, null, 2));

  expect(map).toHaveProperty("properties");
  expect(map.properties).toHaveProperty("age");
  expect(map.properties).toHaveProperty("name");
  expect(map.properties).toHaveProperty("employed");
  expect(map.properties).toHaveProperty("height");
  expect(map.properties.age.valueType).toBe(ValueType.LONG.toString());
  expect(map.properties.name.valueType).toBe(ValueType.STRING.toString());
  expect(map.properties.employed.valueType).toBe(ValueType.BOOLEAN.toString());
  expect(map.properties.height.valueType).toBe(ValueType.DOUBLE.toString());
});
});
