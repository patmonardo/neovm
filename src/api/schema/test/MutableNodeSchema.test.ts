import { MutableNodeSchema } from "../primitive/MutableNodeSchema";
import { NodeLabel } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { PropertySchema } from "../abstract/PropertySchema";

describe("MutableNodeSchema", () => {
  it("can add and retrieve node labels and properties", () => {
    const schema = MutableNodeSchema.empty();
    const label = NodeLabel.of("Person");
    schema.addLabel(label);
    schema.addProperty(label, "age", ValueType.LONG);

    // Check label exists
    expect(schema.availableLabels().includes(label)).toBe(true);

    // Check property exists
    const entry = schema.get(label);
    expect(entry).toBeDefined();
    expect(entry!.properties()).toHaveProperty("age");
    expect(entry!.properties()["age"].valueType()).toBe(ValueType.LONG);
  });

  it("can filter node labels", () => {
    const schema = MutableNodeSchema.empty();
    const label1 = NodeLabel.of("Person");
    const label2 = NodeLabel.of("Company");
    schema.addLabel(label1);
    schema.addLabel(label2);

    const filtered = schema.filter([label1]);
    expect(filtered.availableLabels().includes(label1)).toBe(true);
    expect(filtered.availableLabels().includes(label2)).toBe(false);
  });

  it("can union two schemas", () => {
    const schema1 = MutableNodeSchema.empty();
    const schema2 = MutableNodeSchema.empty();
    const label = NodeLabel.of("Person");
    schema1.addLabel(label, { age: PropertySchema.of("age", ValueType.LONG) });
    schema2.addLabel(label, {
      name: PropertySchema.of("name", ValueType.STRING),
    });

    const union = schema1.union(schema2);
    const entry = union.get(label);
    expect(entry).toBeDefined();
    expect(entry!.properties()).toHaveProperty("age");
    expect(entry!.properties()).toHaveProperty("name");
  });

  it("can serialize a larger schema to map", () => {
    const schema = MutableNodeSchema.empty();

    const person = NodeLabel.of("Person");
    const company = NodeLabel.of("Company");
    const city = NodeLabel.of("City");

    schema.addLabel(person, {
      age: PropertySchema.of("age", ValueType.LONG),
      name: PropertySchema.of("name", ValueType.STRING),
      employed: PropertySchema.of("employed", ValueType.BOOLEAN),
    });

    schema.addLabel(company, {
      name: PropertySchema.of("name", ValueType.STRING),
      founded: PropertySchema.of("founded", ValueType.LONG),
      revenue: PropertySchema.of("revenue", ValueType.DOUBLE),
    });

    schema.addLabel(city, {
      name: PropertySchema.of("name", ValueType.STRING),
      population: PropertySchema.of("population", ValueType.LONG),
    });

    const map = schema.toMap();

    // Pretty print for inspection (optional)
    console.log(JSON.stringify(map, null, 2));

    expect(map).toHaveProperty(person.name());
    expect(map[person.name()]).toHaveProperty("age");
    expect(map[person.name()]).toHaveProperty("name");
    expect(map[person.name()]).toHaveProperty("employed");

    expect(map).toHaveProperty(company.name());
    expect(map[company.name()]).toHaveProperty("name");
    expect(map[company.name()]).toHaveProperty("founded");
    expect(map[company.name()]).toHaveProperty("revenue");

    expect(map).toHaveProperty(city.name());
    expect(map[city.name()]).toHaveProperty("name");
    expect(map[city.name()]).toHaveProperty("population");
  });
});
