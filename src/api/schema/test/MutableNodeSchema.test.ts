import { describe, it, expect } from "vitest";
import { NodeLabel } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { MutableNodeSchemaEntry } from "../primitive/MutableNodeSchemaEntry";

describe("MutableNodeSchemaEntry", () => {
  it("should create entry and manage properties with Map API", () => {
    console.log("\n🏗️ === ENTRY CREATION AND PROPERTY MANAGEMENT ===");

    // 🏗️ SETUP: Create basic entry
    const personLabel = NodeLabel.of("Person");
    const entry = new MutableNodeSchemaEntry(personLabel);

    console.log(`📋 Created entry for: ${personLabel.name()}`);

    // ✅ VERIFY: Initial state
    expect(entry.identifier().equals(personLabel)).toBe(true);
    expect(entry.properties().size).toBe(0);

    console.log(`📊 Initial properties: ${entry.properties().size}`);

    // 🔧 ACTION: Add properties
    console.log("➕ Adding properties...");
    entry.addProperty("age", ValueType.LONG);
    entry.addProperty("name", ValueType.STRING);

    // ✅ VERIFY: Properties added correctly
    const properties = entry.properties();
    console.log(`📊 Properties after adding: ${properties.size}`);
    console.log(`🔍 Properties: ${Array.from(properties.keys()).join(", ")}`);

    expect(properties.size).toBe(2);
    expect(properties.has("age")).toBe(true);
    expect(properties.has("name")).toBe(true);
    expect(properties.get("age")!.valueType()).toBe(ValueType.LONG);
    expect(properties.get("name")!.valueType()).toBe(ValueType.STRING);

    console.log("✅ Entry creation and property management working");
  });

  it("should copy entries with from() method", () => {
    console.log("\n📋 === COPYING WITH from() METHOD ===");

    // 🏗️ SETUP: Create original entry with properties
    const originalLabel = NodeLabel.of("Company");
    const original = new MutableNodeSchemaEntry(originalLabel);

    original.addProperty("name", ValueType.STRING);
    original.addProperty("founded", ValueType.LONG);

    console.log(
      `🏢 Original entry has ${original.properties().size} properties`
    );

    // 🔧 ACTION: Copy using from()
    const copy = MutableNodeSchemaEntry.from(original);

    // ✅ VERIFY: Copy is correct but separate
    expect(copy).not.toBe(original); // Different instances
    expect(copy.identifier().equals(original.identifier())).toBe(true);
    expect(copy.properties().size).toBe(original.properties().size);

    const copyProps = copy.properties();
    console.log(`📋 Copy has ${copyProps.size} properties`);
    console.log(
      `🔍 Copy properties: ${Array.from(copyProps.keys()).join(", ")}`
    );

    expect(copyProps.has("name")).toBe(true);
    expect(copyProps.has("founded")).toBe(true);

    console.log("✅ Copying with from() working correctly");
  });

  it("should union entries with same labels", () => {
    console.log("\n🤝 === UNION OPERATIONS ===");

    // 🏗️ SETUP: Create two entries with different properties
    const cityLabel = NodeLabel.of("City");
    const entry1 = new MutableNodeSchemaEntry(cityLabel);
    const entry2 = new MutableNodeSchemaEntry(cityLabel);

    entry1.addProperty("population", ValueType.LONG);
    entry1.addProperty("country", ValueType.STRING);

    entry2.addProperty("name", ValueType.STRING);
    entry2.addProperty("founded", ValueType.LONG);

    console.log(
      `🏙️ Entry1 properties: ${Array.from(entry1.properties().keys()).join(
        ", "
      )}`
    );
    console.log(
      `🏙️ Entry2 properties: ${Array.from(entry2.properties().keys()).join(
        ", "
      )}`
    );

    // 🔧 ACTION: Perform union
    const union = entry1.union(entry2);

    // ✅ VERIFY: Union contains all properties
    const unionProps = union.properties();
    console.log(
      `🤝 Union properties: ${Array.from(unionProps.keys()).join(", ")}`
    );
    console.log(`📊 Total properties: ${unionProps.size}`);

    expect(unionProps.size).toBe(4);
    expect(unionProps.has("population")).toBe(true);
    expect(unionProps.has("country")).toBe(true);
    expect(unionProps.has("name")).toBe(true);
    expect(unionProps.has("founded")).toBe(true);

    console.log("✅ Union operations working correctly");
  });

  it("should throw error for union with different labels", () => {
    console.log("\n❌ === UNION ERROR HANDLING ===");

    // 🏗️ SETUP: Create entries with different labels
    const personEntry = new MutableNodeSchemaEntry(NodeLabel.of("Person"));
    const companyEntry = new MutableNodeSchemaEntry(NodeLabel.of("Company"));

    console.log("🧪 Attempting union with different labels...");

    // ✅ VERIFY: Union throws error for different labels
    expect(() => {
      personEntry.union(companyEntry);
    }).toThrow("Cannot union node schema entries with different node labels");

    console.log("✅ Error handling working correctly");
  });

  it("should handle property removal", () => {
    console.log("\n➖ === PROPERTY REMOVAL ===");

    // 🏗️ SETUP: Create entry with multiple properties
    const entry = new MutableNodeSchemaEntry(NodeLabel.of("Product"));

    entry.addProperty("name", ValueType.STRING);
    entry.addProperty("price", ValueType.DOUBLE);
    entry.addProperty("inStock", ValueType.BOOLEAN);

    console.log(
      `📦 Initial properties: ${Array.from(entry.properties().keys()).join(
        ", "
      )}`
    );

    // 🔧 ACTION: Remove property
    entry.removeProperty("price");

    // ✅ VERIFY: Property removed correctly
    const properties = entry.properties();
    console.log(
      `📦 After removal: ${Array.from(properties.keys()).join(", ")}`
    );

    expect(properties.size).toBe(2);
    expect(properties.has("name")).toBe(true);
    expect(properties.has("price")).toBe(false);
    expect(properties.has("inStock")).toBe(true);

    console.log("✅ Property removal working correctly");
  });

  it("should handle equality and hash codes", () => {
    console.log("\n⚖️ === EQUALITY AND HASH CODES ===");

    // 🏗️ SETUP: Create identical entries
    const label = NodeLabel.of("Person");
    const entry1 = new MutableNodeSchemaEntry(label);
    const entry2 = new MutableNodeSchemaEntry(label);

    entry1.addProperty("age", ValueType.LONG);
    entry2.addProperty("age", ValueType.LONG);

    // ✅ VERIFY: Equal entries
    console.log(`⚖️ Entries equal: ${entry1.equals(entry2)}`);
    console.log(
      `🔢 Hash codes equal: ${entry1.hashCode() === entry2.hashCode()}`
    );

    expect(entry1.equals(entry2)).toBe(true);
    expect(entry1.hashCode()).toBe(entry2.hashCode());

    // 🔧 ACTION: Modify one entry
    entry2.addProperty("name", ValueType.STRING);

    // ✅ VERIFY: No longer equal
    console.log(`⚖️ After modification equal: ${entry1.equals(entry2)}`);
    expect(entry1.equals(entry2)).toBe(false);

    console.log("✅ Equality and hash codes working correctly");
  });
});
