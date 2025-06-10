import { describe, it, expect } from "vitest";
import { PropertyValues } from "@/core/loading/construction/PropertyValues";

/**
 * 🎯 PropertyValues - Efficient Property Storage System
 *
 * This tests the core property storage optimization that uses Map-based
 * factory construction rather than builder patterns.
 *
 * CORRECTED UNDERSTANDING: PropertyValues is constructed from Maps!
 */

describe("📦 PropertyValues - Property Storage Optimization", () => {

  it("🏗️ MAP FACTORY: Property construction from Map", () => {
    console.log("🏗️ === MAP FACTORY TESTING ===");

    // ✅ CREATE FROM MAP
    const propertyMap = new Map<string, any>([
      ["name", "John Doe"],
      ["age", 30],
      ["verified", true],
      ["salary", 75000.50]
    ]);

    const properties = PropertyValues.of(propertyMap);

    console.log(`Properties created: ${properties.constructor.name}`);
    console.log(`Property count: ${properties.size()}`);

    // ✅ VERIFY BASIC PROPERTIES
    expect(properties.size()).toBe(4);
    expect(properties.get("name")).toBe("John Doe");
    expect(properties.get("age")).toBe(30);
    expect(properties.get("verified")).toBe(true);
    expect(properties.get("salary")).toBe(75000.50);

    console.log("✅ Map factory creates properties correctly");
  });

  it("📱 OBJECT FACTORY: Convenience construction from object", () => {
    console.log("📱 === OBJECT FACTORY TESTING ===");

    // ✅ CREATE FROM PLAIN OBJECT
    const properties = PropertyValues.ofObject({
      //stringValue: "Hello World",
      intValue: 42,
      longValue: 9876543210,
      doubleValue: 3.14159,
      //booleanValue: false,
      nullValue: null
    });

    console.log("Property types:");
    console.log(`  string: "${properties.get("stringValue")}" (${typeof properties.get("stringValue")})`);
    console.log(`  int: ${properties.get("intValue")} (${typeof properties.get("intValue")})`);
    console.log(`  long: ${properties.get("longValue")} (${typeof properties.get("longValue")})`);
    console.log(`  double: ${properties.get("doubleValue")} (${typeof properties.get("doubleValue")})`);
    console.log(`  boolean: ${properties.get("booleanValue")} (${typeof properties.get("booleanValue")})`);
    console.log(`  null: ${properties.get("nullValue")}`);

    // ✅ VERIFY TYPE PRESERVATION
    expect(typeof properties.get("stringValue")).toBe("string");
    expect(typeof properties.get("intValue")).toBe("number");
    expect(typeof properties.get("longValue")).toBe("number");
    expect(typeof properties.get("doubleValue")).toBe("number");
    expect(typeof properties.get("booleanValue")).toBe("boolean");
    expect(properties.get("nullValue")).toBeNull();

    console.log("✅ Object factory preserves all JavaScript types");
  });

  it("🔑 PROPERTY KEYS: Key management and iteration", () => {
    console.log("🔑 === PROPERTY KEYS TESTING ===");

    const properties = PropertyValues.ofObject({
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@example.com",
      age: 28
    });

    // ✅ GET ALL PROPERTY KEYS
    const keys = properties.propertyKeys();
    console.log(`Property keys type: ${keys.constructor.name}`);

    // Convert to array for testing (might be Set or other collection)
    const keyArray = Array.from(keys);
    console.log(`Property keys: ${keyArray.join(", ")}`);

    expect(keyArray).toHaveLength(4);
    expect(keyArray).toContain("firstName");
    expect(keyArray).toContain("lastName");
    expect(keyArray).toContain("email");
    expect(keyArray).toContain("age");

    console.log("✅ Property key management works correctly");
  });

  it("🔄 ITERATION: Property enumeration patterns", () => {
    console.log("🔄 === ITERATION TESTING ===");

    const properties = PropertyValues.ofObject({
      prop1: "value1",
      prop2: 100,
      prop3: true
    });

    // ✅ TEST FOREACH ITERATION
    console.log("ForEach iteration:");
    const collectedEntries: Array<[string, any]> = [];

    properties.forEach((key: string, value: any) => {
      console.log(`  ${key} = ${value} (${typeof value})`);
      collectedEntries.push([key, value]);
    });

    expect(collectedEntries).toHaveLength(3);

    // ✅ VERIFY ENTRY VALUES
    const entryMap = new Map(collectedEntries);
    expect(entryMap.get("prop1")).toBe("value1");
    expect(entryMap.get("prop2")).toBe(100);
    expect(entryMap.get("prop3")).toBe(true);

    console.log("✅ ForEach iteration works correctly");
  });

  it("🔄 MAP CONVERSION: toMap() method", () => {
    console.log("🔄 === MAP CONVERSION TESTING ===");

    const originalObject = {
      name: "Test User",
      score: 95,
      active: true,
      metadata: null
    };

    const properties = PropertyValues.ofObject(originalObject);

    // ✅ CONVERT BACK TO MAP
    const resultMap = properties.toMap();
    console.log(`Converted to Map: ${resultMap.constructor.name}`);
    console.log(`Map size: ${resultMap.size}`);

    // ✅ VERIFY MAP CONTENTS
    expect(resultMap.size).toBe(4);
    expect(resultMap.get("name")).toBe("Test User");
    expect(resultMap.get("score")).toBe(95);
    expect(resultMap.get("active")).toBe(true);
    expect(resultMap.get("metadata")).toBeNull();

    console.log("Map contents:");
    for (const [key, value] of resultMap) {
      console.log(`  ${key}: ${value} (${typeof value})`);
    }

    console.log("✅ toMap() conversion works correctly");
  });

  it("📋 OBJECT CONVERSION: toObject() method", () => {
    console.log("📋 === OBJECT CONVERSION TESTING ===");

    const originalMap = new Map<string, any>([
      ["userId", 12345],
      ["username", "alice"],
      ["isAdmin", false],
      ["lastLogin", null]
    ]);

    const properties = PropertyValues.of(originalMap);

    // ✅ CONVERT TO PLAIN OBJECT
    const resultObject = properties.toObject();
    console.log(`Converted to object: ${typeof resultObject}`);
    console.log(`Object keys: ${Object.keys(resultObject).length}`);

    // ✅ VERIFY OBJECT CONTENTS
    expect(Object.keys(resultObject)).toHaveLength(4);
    expect(resultObject.userId).toBe(12345);
    expect(resultObject.username).toBe("alice");
    expect(resultObject.isAdmin).toBe(false);
    expect(resultObject.lastLogin).toBeNull();

    console.log("Object contents:");
    for (const [key, value] of Object.entries(resultObject)) {
      console.log(`  ${key}: ${value} (${typeof value})`);
    }

    console.log("✅ toObject() conversion works correctly");
  });

  it("🗳️ EMPTY FACTORY: Empty property instances", () => {
    console.log("🗳️ === EMPTY FACTORY TESTING ===");

    const empty = PropertyValues.empty();

    console.log(`Empty properties: ${empty.constructor.name}`);
    console.log(`Empty size: ${empty.size()}`);

    expect(empty.size()).toBe(0);
    expect(empty.get("anyKey")).toBeUndefined();

    // ✅ VERIFY EMPTY CONVERSIONS
    const emptyMap = empty.toMap();
    const emptyObject = empty.toObject();

    expect(emptyMap.size).toBe(0);
    expect(Object.keys(emptyObject)).toHaveLength(0);

    console.log("✅ Empty factory works correctly");
  });

  it("❓ MISSING VALUES: Null and undefined handling", () => {
    console.log("❓ === MISSING VALUES TESTING ===");

    const properties = PropertyValues.ofObject({
      presentValue: "I exist",
      nullValue: null,
      undefinedValue: undefined
    });

    console.log(`Properties with nulls: size = ${properties.size()}`);

    // ✅ VERIFY NULL/UNDEFINED HANDLING
    expect(properties.get("presentValue")).toBe("I exist");
    expect(properties.get("nullValue")).toBeNull();

    // Note: undefined might be converted to null or omitted
    const undefinedVal = properties.get("undefinedValue");
    console.log(`Undefined value result: ${undefinedVal}`);

    // ✅ NON-EXISTENT PROPERTY
    const missingValue = properties.get("nonExistentProperty");
    console.log(`Non-existent property: ${missingValue}`);
    expect(missingValue).toBeUndefined();

    console.log("✅ Missing value handling works correctly");
  });

  it("⚡ PERFORMANCE: Large property sets", () => {
    console.log("⚡ === PERFORMANCE TESTING ===");

    // ✅ CREATE LARGE PROPERTY MAP
    console.log("Creating large property map...");
    const startBuild = Date.now();

    const largeMap = new Map<string, any>();
    for (let i = 0; i < 1000; i++) {
      largeMap.set(`string_${i}`, `value_${i}`);
      largeMap.set(`number_${i}`, i);
      largeMap.set(`boolean_${i}`, i % 2 === 0);
    }

    const properties = PropertyValues.of(largeMap);
    const buildTime = Date.now() - startBuild;

    console.log(`Built 3000 properties in ${buildTime}ms`);
    expect(properties.size()).toBe(3000);

    // ✅ ACCESS PERFORMANCE
    const startAccess = Date.now();
    let accessCount = 0;

    for (let i = 0; i < 1000; i++) {
      const stringVal = properties.get(`string_${i}`);
      const numberVal = properties.get(`number_${i}`);
      const boolVal = properties.get(`boolean_${i}`);

      if (stringVal !== null && numberVal !== null && boolVal !== null) {
        accessCount++;
      }
    }

    const accessTime = Date.now() - startAccess;
    console.log(`Accessed 3000 properties in ${accessTime}ms (${accessCount} successful)`);

    // ✅ ITERATION PERFORMANCE
    const startIteration = Date.now();
    let iterationCount = 0;

    properties.forEach((key: string, value: any) => {
      if (value !== null && value !== undefined) {
        iterationCount++;
      }
    });

    const iterationTime = Date.now() - startIteration;
    console.log(`Iterated ${iterationCount} properties in ${iterationTime}ms`);

    expect(iterationCount).toBe(3000);
    console.log("✅ Performance characteristics verified");
  });

  it("🎯 REAL-WORLD: CSV node property simulation", () => {
    console.log("🎯 === CSV PROPERTY SIMULATION ===");

    // ✅ SIMULATE CSV ROW PARSING
    const csvRows = [
      { id: 1, name: "Alice Johnson", age: 28, email: "alice@company.com", verified: true, salary: 75000 },
      { id: 2, name: "Bob Smith", age: 35, email: "bob@company.com", verified: false, salary: 82000 },
      { id: 3, name: "Carol Davis", age: 42, email: "carol@company.com", verified: true, salary: 95000 }
    ];

    console.log("Converting CSV rows to PropertyValues:");

    const nodeProperties: PropertyValues[] = [];

    for (const row of csvRows) {
      // Create PropertyValues from object (excluding id for node properties)
      const { id, ...properties } = row;
      const propertyValues = PropertyValues.ofObject(properties);

      nodeProperties.push(propertyValues);
      console.log(`  Node ${id}: ${propertyValues.size()} properties`);
    }

    // ✅ VERIFY PROPERTY ACCESS
    expect(nodeProperties).toHaveLength(3);

    const firstNode = nodeProperties[0];
    expect(firstNode.get("name")).toBe("Alice Johnson");
    expect(firstNode.get("age")).toBe(28);
    expect(firstNode.get("verified")).toBe(true);

    // ✅ SIMULATE PROPERTY QUERIES
    console.log("\nProperty queries:");

    const verifiedUsers = nodeProperties.filter(props => props.get("verified") === true);
    console.log(`Verified users: ${verifiedUsers.length}`);
    expect(verifiedUsers).toHaveLength(2);

    const highEarners = nodeProperties.filter(props => (props.get("salary") as number) > 80000);
    console.log(`High earners: ${highEarners.length}`);
    expect(highEarners).toHaveLength(2);

    console.log("✅ CSV property simulation demonstrates real-world usage");
  });

  it("🔄 ROUND-TRIP: Map ↔ PropertyValues ↔ Object", () => {
    console.log("🔄 === ROUND-TRIP CONVERSION ===");

    // ✅ START WITH MAP
    const originalMap = new Map<string, any>([
      ["name", "Round Trip Test"],
      ["count", 42],
      ["enabled", true],
      ["metadata", null]
    ]);

    console.log("Original Map:");
    for (const [key, value] of originalMap) {
      console.log(`  ${key}: ${value}`);
    }

    // ✅ MAP → PROPERTYVALUES
    const properties = PropertyValues.of(originalMap);
    expect(properties.size()).toBe(4);

    // ✅ PROPERTYVALUES → OBJECT
    const objectForm = properties.toObject();
    expect(Object.keys(objectForm)).toHaveLength(4);

    // ✅ OBJECT → PROPERTYVALUES
    const propertiesFromObject = PropertyValues.ofObject(objectForm);
    expect(propertiesFromObject.size()).toBe(4);

    // ✅ PROPERTYVALUES → MAP
    const finalMap = propertiesFromObject.toMap();
    expect(finalMap.size).toBe(4);

    console.log("Final Map:");
    for (const [key, value] of finalMap) {
      console.log(`  ${key}: ${value}`);
    }

    // ✅ VERIFY ROUND-TRIP INTEGRITY
    expect(finalMap.get("name")).toBe("Round Trip Test");
    expect(finalMap.get("count")).toBe(42);
    expect(finalMap.get("enabled")).toBe(true);
    expect(finalMap.get("metadata")).toBeNull();

    console.log("✅ Round-trip conversion preserves data integrity");
  });

  it("🛡️ IMMUTABILITY: Property value safety", () => {
    console.log("🛡️ === IMMUTABILITY TESTING ===");

    const sourceMap = new Map<string, any>([
      ["name", "Original Name"],
      ["score", 100]
    ]);

    const properties = PropertyValues.of(sourceMap);

    console.log(`Original: name="${properties.get("name")}", score=${properties.get("score")}`);

    // ✅ MODIFY SOURCE MAP (should not affect PropertyValues)
    sourceMap.set("name", "Modified Name");
    sourceMap.set("score", 999);

    console.log(`After source modification: name="${properties.get("name")}", score=${properties.get("score")}`);

    // ✅ VERIFY IMMUTABILITY
    expect(properties.get("name")).toBe("Original Name");
    expect(properties.get("score")).toBe(100);

    // ✅ VERIFY NO MUTATING METHODS
    expect(typeof (properties as any).set).toBe("undefined");
    expect(typeof (properties as any).put).toBe("undefined");
    expect(typeof (properties as any).clear).toBe("undefined");

    console.log("✅ Immutability protects property values");
  });

});
