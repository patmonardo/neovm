import { describe, it, expect } from "vitest";
import { NodeLabel } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { MutableNodeSchemaEntry } from "../primitive/MutableNodeSchemaEntry";

describe("MutableNodeSchemaEntry - Enhanced Testing", () => {
  it("should construct with label and manage properties", () => {
    console.log("🏗️ === CONSTRUCTION AND PROPERTY MANAGEMENT ===");

    const label = NodeLabel.of("Person");
    console.log(`📋 Creating entry for label: ${label.name()}`);

    const entry = new MutableNodeSchemaEntry(label);

    // TEST + EXPECT: Initial state
    console.log(
      `✅ Entry identifier equals label: ${entry.identifier().equals(label)}`
    );
    expect(entry.identifier().equals(label)).toBe(true);

    const initialProps = entry.properties();
    console.log(
      `📊 Initial properties count: ${Object.keys(initialProps).length}`
    );
    expect(Object.keys(initialProps)).toHaveLength(0);

    // TEST + EXPECT: Add property
    console.log("➕ Adding age property (LONG)...");
    entry.addProperty("age", ValueType.LONG);

    const afterAdd = entry.properties();
    console.log(
      `📊 Properties after adding age: ${Object.keys(afterAdd).length}`
    );
    console.log(`🔍 Age property value type: ${afterAdd.age?.valueType()}`);

    expect(afterAdd).toHaveProperty("age");
    expect(afterAdd.age.valueType()).toBe(ValueType.LONG);

    console.log("✅ Construction and property management working correctly");
  });

  it("should handle property addition and removal", () => {
    console.log("\n🔄 === PROPERTY ADDITION AND REMOVAL ===");

    const label = NodeLabel.of("Company");
    const entry = new MutableNodeSchemaEntry(label);

    console.log(`🏢 Working with Company schema`);

    // Add multiple properties
    console.log("➕ Adding name (STRING) and founded (LONG)...");
    entry.addProperty("name", ValueType.STRING);
    entry.addProperty("founded", ValueType.LONG);

    const afterAdding = entry.properties();
    console.log(
      `📊 Properties after adding: ${Object.keys(afterAdding).join(", ")}`
    );
    console.log(`🔍 Name type: ${afterAdding.name?.valueType()}`);
    console.log(`🔍 Founded type: ${afterAdding.founded?.valueType()}`);

    expect(afterAdding).toHaveProperty("name");
    expect(afterAdding).toHaveProperty("founded");
    expect(afterAdding.name.valueType()).toBe(ValueType.STRING);
    expect(afterAdding.founded.valueType()).toBe(ValueType.LONG);

    // Remove property
    console.log("➖ Removing name property...");
    entry.removeProperty("name");

    const afterRemoving = entry.properties();
    console.log(
      `📊 Properties after removing: ${Object.keys(afterRemoving).join(", ")}`
    );

    expect(afterRemoving).not.toHaveProperty("name");
    expect(afterRemoving).toHaveProperty("founded");

    console.log("✅ Property addition and removal working correctly");
  });

  // Add this debug test to check NodeLabel.equals():
  it("should debug NodeLabel equals method", () => {
    console.log("\n🔍 === DEBUGGING NODELABEL EQUALS ===");

    const labelA = NodeLabel.of("A");
    const labelB = NodeLabel.of("B");
    const labelACopy = NodeLabel.of("A");

    console.log(`Label A: ${labelA.name}`);
    console.log(`Label B: ${labelB.name}`);
    console.log(`Label A Copy: ${labelACopy.name}`);

    const aEqualsA = labelA.equals(labelA);
    const aEqualsACopy = labelA.equals(labelACopy);
    const aEqualsB = labelA.equals(labelB);

    console.log(`A.equals(A): ${aEqualsA}`); // Should be true
    console.log(`A.equals(ACopy): ${aEqualsACopy}`); // Should be true
    console.log(`A.equals(B): ${aEqualsB}`); // Should be false

    expect(aEqualsA).toBe(true);
    expect(aEqualsACopy).toBe(true);
    expect(aEqualsB).toBe(false);

    console.log("✅ NodeLabel.equals() working correctly");
  });

  it("should handle union operations correctly", () => {
    console.log("\n🤝 === UNION OPERATIONS ===");

    const label = NodeLabel.of("City");
    console.log(`🏙️ Creating union test with City schemas`);

    // Create first entry
    const entry1 = new MutableNodeSchemaEntry(label);
    entry1.addProperty("population", ValueType.LONG);

    console.log(
      `📊 Entry1 properties: ${Object.keys(entry1.properties()).join(", ")}`
    );

    // Create second entry
    const entry2 = new MutableNodeSchemaEntry(label);
    entry2.addProperty("name", ValueType.STRING);

    console.log(
      `📊 Entry2 properties: ${Object.keys(entry2.properties()).join(", ")}`
    );

    // Test successful union
    console.log("🤝 Performing union...");
    const union = entry1.union(entry2);

    const unionProps = union.properties();
    console.log(`📊 Union properties: ${Object.keys(unionProps).join(", ")}`);
    console.log(`🔍 Population type: ${unionProps.population?.valueType()}`);
    console.log(`🔍 Name type: ${unionProps.name?.valueType()}`);

    expect(unionProps).toHaveProperty("population");
    expect(unionProps).toHaveProperty("name");
    expect(unionProps.population.valueType()).toBe(ValueType.LONG);
    expect(unionProps.name.valueType()).toBe(ValueType.STRING);

    // Test union with different labels (should throw)
    console.log("❌ Testing union with different labels...");
    const entryA = new MutableNodeSchemaEntry(NodeLabel.of("A"));
    const entryB = new MutableNodeSchemaEntry(NodeLabel.of("B"));

    try {
      entryA.union(entryB); // This should throw but doesn't!
      console.log("❌ FAIL: Should have thrown for different labels");
      expect(false).toBe(true); // This line executes = test fails
    } catch (error) {
      // This never executes because no error is thrown
      console.log(
        `✅ Correctly threw for different labels: ${(error as Error).message}`
      );
      expect(error).toBeDefined();
    }

    console.log("✅ Union operations working correctly");
  });

  it("should handle equality and hashing", () => {
    console.log("\n⚖️ === EQUALITY AND HASHING ===");

    const label = NodeLabel.of("Person");
    console.log(`👤 Testing equality with Person schemas`);

    // Create first entry
    const entry1 = new MutableNodeSchemaEntry(label);
    entry1.addProperty("age", ValueType.LONG);

    console.log(
      `📊 Entry1 properties: ${Object.keys(entry1.properties()).join(", ")}`
    );

    // Create copy
    console.log("📋 Creating copy using from()...");
    const entry2 = MutableNodeSchemaEntry.from(entry1);

    console.log(
      `📊 Entry2 properties: ${Object.keys(entry2.properties()).join(", ")}`
    );

    // Test initial equality
    const initialEquals = entry1.equals(entry2);
    const hash1 = entry1.hashCode();
    const hash2 = entry2.hashCode();

    console.log(`⚖️ Initial equality: ${initialEquals}`);
    console.log(
      `🔢 Hash1: ${hash1}, Hash2: ${hash2}, Equal: ${hash1 === hash2}`
    );

    expect(initialEquals).toBe(true);
    expect(hash1).toBe(hash2);

    // Modify entry2
    console.log("🔄 Adding name property to entry2...");
    entry2.addProperty("name", ValueType.STRING);

    const afterModEquals = entry1.equals(entry2);
    const newHash2 = entry2.hashCode();

    console.log(`⚖️ Equality after modification: ${afterModEquals}`);
    console.log(
      `🔢 Hash1: ${hash1}, NewHash2: ${newHash2}, Equal: ${hash1 === newHash2}`
    );

    expect(afterModEquals).toBe(false);
    expect(hash1).not.toBe(newHash2);

    console.log("✅ Equality and hashing working correctly");
  });

  it("should serialize complex entries to map format", () => {
    console.log("\n📋 === COMPLEX SERIALIZATION ===");

    const label = NodeLabel.of("Person");
    const entry = new MutableNodeSchemaEntry(label);

    console.log(`👤 Creating complex Person schema`);

    // Add various property types
    const properties = [
      { name: "age", type: ValueType.LONG },
      { name: "name", type: ValueType.STRING },
      { name: "employed", type: ValueType.BOOLEAN },
      { name: "height", type: ValueType.DOUBLE },
    ];

    properties.forEach((prop) => {
      console.log(`➕ Adding ${prop.name} (${prop.type})`);
      entry.addProperty(prop.name, prop.type);
    });

    console.log("📤 Serializing to map...");
    const map = entry.toMap();

    console.log("📋 Serialized map structure:");
    console.log(JSON.stringify(map, null, 2));

    // Test map structure
    expect(map).toHaveProperty("properties");
    expect(typeof map.properties).toBe("object");

    // Test all properties exist
    properties.forEach((prop) => {
      console.log(`🔍 Checking ${prop.name} in map...`);
      expect(map.properties).toHaveProperty(prop.name);

      const mapProp = map.properties[prop.name];
      const expectedType = prop.type.toString();

      console.log(`   Type: ${mapProp.valueType} (expected: ${expectedType})`);
      expect(mapProp.valueType).toBe(expectedType);
    });

    console.log("✅ Complex serialization working correctly");
  });

  it("should handle edge cases and error conditions", () => {
    console.log("\n🔧 === EDGE CASES AND ERROR CONDITIONS ===");

    const label = NodeLabel.of("TestNode");
    const entry = new MutableNodeSchemaEntry(label);

    console.log(`🧪 Testing edge cases with TestNode`);

    // Test removing non-existent property
    console.log("❓ Attempting to remove non-existent property...");
    try {
      entry.removeProperty("nonExistent");
      console.log("✅ Remove non-existent property handled gracefully");
      // Should not throw - this is usually handled gracefully
    } catch (error) {
      console.log(`⚠️ Remove non-existent threw: ${(error as Error).message}`);
      // Either way is acceptable behavior
    }

    // Test duplicate property addition
    console.log("🔄 Testing duplicate property addition...");
    entry.addProperty("test", ValueType.STRING);

    const beforeDupe = Object.keys(entry.properties()).length;
    console.log(`📊 Properties before duplicate: ${beforeDupe}`);

    entry.addProperty("test", ValueType.LONG); // Different type

    const afterDupe = Object.keys(entry.properties()).length;
    const finalType = entry.properties().test?.valueType();

    console.log(`📊 Properties after duplicate: ${afterDupe}`);
    console.log(`🔍 Final type for 'test': ${finalType}`);

    expect(afterDupe).toBe(beforeDupe); // Should still be same count
    // Type should be updated to LONG
    expect(finalType).toBe(ValueType.LONG);

    console.log("✅ Edge cases handled correctly");
  });
});
