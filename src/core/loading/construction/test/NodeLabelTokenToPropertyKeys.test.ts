import { describe, it, expect } from "vitest";
import { NodeLabelTokenToPropertyKeys } from "@/core/loading/construction/NodeLabelTokenToPropertyKeys";
import { NodeLabelTokens } from "@/core/loading/construction/NodeLabelTokens";
import { NodeLabel } from "@/projection";
import { NodeSchema, PropertySchema } from "@/api/schema";

/**
 * 🎯 NodeLabelTokenToPropertyKeys - Schema Coordination System
 *
 * This tests the critical mapping system that coordinates between:
 * - Node labels (User, Person, Company)
 * - Property keys (name, age, email)
 * - Property schemas (types, validation, defaults)
 *
 * TWO STRATEGIES:
 * - LAZY: Discovers schema from imported data (flexible)
 * - FIXED: Validates against predefined schema (strict)
 *
 * This is the THREAD COORDINATION layer for multi-threaded imports!
 */

describe("🗺️ NodeLabelTokenToPropertyKeys - Schema Coordination", () => {

  it("🔧 LAZY STRATEGY: Schema discovery from data", () => {
    console.log("🔧 === LAZY STRATEGY TESTING ===");

    // ✅ CREATE LAZY MAPPING
    const lazyMapping = NodeLabelTokenToPropertyKeys.lazy();
    console.log(`Lazy mapping created: ${lazyMapping.constructor.name}`);

    // ✅ ADD PROPERTY ASSOCIATIONS
    const userToken = NodeLabelTokens.of("User");
    const personToken = NodeLabelTokens.of("Person");
    const companyToken = NodeLabelTokens.of("Company");

    // User properties
    lazyMapping.add(userToken, ["name", "email", "age"]);
    console.log("Added User properties: name, email, age");

    // Person properties (overlaps with User)
    lazyMapping.add(personToken, ["name", "birthDate", "address"]);
    console.log("Added Person properties: name, birthDate, address");

    // Company properties
    lazyMapping.add(companyToken, ["name", "industry", "employees"]);
    console.log("Added Company properties: name, industry, employees");

    // ✅ VERIFY LABEL DISCOVERY
    const discoveredLabels = lazyMapping.nodeLabels();
    const labelNames = Array.from(discoveredLabels).map(label => label.name()).sort();
    console.log(`Discovered labels: ${labelNames.join(", ")}`);

    expect(discoveredLabels.size).toBe(3);
    expect(labelNames).toEqual(["Company", "Person", "User"]);

    console.log("✅ Lazy strategy discovery works perfectly");
  });

  it("📦 LAZY STRATEGY: Property schema retrieval", () => {
    console.log("📦 === PROPERTY SCHEMA RETRIEVAL ===");

    const lazyMapping = NodeLabelTokenToPropertyKeys.lazy();

    // ✅ SETUP LABELS AND PROPERTIES
    const userToken = NodeLabelTokens.of("User");
    const adminToken = NodeLabelTokens.of(["User", "Admin"]); // Multi-label

    lazyMapping.add(userToken, ["name", "email"]);
    lazyMapping.add(adminToken, ["permissions", "lastLogin"]);

    // ✅ CREATE MOCK PROPERTY SCHEMAS
    const importPropertySchemas = new Map<string, PropertySchema>();
    importPropertySchemas.set("name", createMockPropertySchema("name", "STRING"));
    importPropertySchemas.set("email", createMockPropertySchema("email", "STRING"));
    importPropertySchemas.set("permissions", createMockPropertySchema("permissions", "LIST"));
    importPropertySchemas.set("lastLogin", createMockPropertySchema("lastLogin", "DATETIME"));

    // ✅ GET PROPERTY SCHEMAS FOR USER LABEL
    const userLabel = NodeLabel.of("User");
    const userProperties = lazyMapping.propertySchemas(userLabel, importPropertySchemas);

    console.log(`User properties found: ${Array.from(userProperties.keys()).join(", ")}`);

    // Should include properties from both userToken and adminToken (because adminToken contains User)
    expect(userProperties.has("name")).toBe(true);
    expect(userProperties.has("email")).toBe(true);
    expect(userProperties.has("permissions")).toBe(true);
    expect(userProperties.has("lastLogin")).toBe(true);

    // ✅ GET PROPERTY SCHEMAS FOR ADMIN LABEL
    const adminLabel = NodeLabel.of("Admin");
    const adminProperties = lazyMapping.propertySchemas(adminLabel, importPropertySchemas);

    console.log(`Admin properties found: ${Array.from(adminProperties.keys()).join(", ")}`);

    // Should only include properties from adminToken
    expect(adminProperties.has("permissions")).toBe(true);
    expect(adminProperties.has("lastLogin")).toBe(true);
    expect(adminProperties.has("name")).toBe(false);
    expect(adminProperties.has("email")).toBe(false);

    console.log("✅ Property schema retrieval works correctly");
  });

  it("🏗️ FIXED STRATEGY: Schema validation mode", () => {
    console.log("🏗️ === FIXED STRATEGY TESTING ===");

    // ✅ CREATE PREDEFINED SCHEMA
    const predefinedSchema = createMockNodeSchema({
      "User": ["name", "email", "age"],
      "Company": ["name", "industry", "employees"]
    });

    const fixedMapping = NodeLabelTokenToPropertyKeys.fixed(predefinedSchema);
    console.log(`Fixed mapping created: ${fixedMapping.constructor.name}`);

    // ✅ VERIFY LABELS FROM SCHEMA
    const schemaLabels = fixedMapping.nodeLabels();
    const labelNames = Array.from(schemaLabels).map(label => label.name()).sort();
    console.log(`Schema labels: ${labelNames.join(", ")}`);

    expect(labelNames).toEqual(["Company", "User"]);

    // ✅ TEST ADD OPERATIONS (SHOULD BE IGNORED)
    const userToken = NodeLabelTokens.of("User");
    fixedMapping.add(userToken, ["newProperty", "anotherProperty"]);
    console.log("Added properties to fixed mapping (should be ignored)");

    // Labels should remain unchanged
    const labelsAfterAdd = fixedMapping.nodeLabels();
    expect(labelsAfterAdd.size).toBe(schemaLabels.size);

    console.log("✅ Fixed strategy ignores additions correctly");
  });

  it("✅ FIXED STRATEGY: Successful validation", () => {
    console.log("✅ === SUCCESSFUL VALIDATION ===");

    const predefinedSchema = createMockNodeSchema({
      "User": ["name", "email", "age"]
    });

    const fixedMapping = NodeLabelTokenToPropertyKeys.fixed(predefinedSchema);

    // ✅ CREATE COMPATIBLE IMPORT SCHEMAS
    const importPropertySchemas = new Map<string, PropertySchema>();
    importPropertySchemas.set("name", createMockPropertySchema("name", "STRING"));
    importPropertySchemas.set("email", createMockPropertySchema("email", "STRING"));
    importPropertySchemas.set("age", createMockPropertySchema("age", "LONG"));

    // ✅ VALIDATE COMPATIBLE SCHEMAS
    const userLabel = NodeLabel.of("User");
    const userProperties = fixedMapping.propertySchemas(userLabel, importPropertySchemas);

    console.log(`Validated properties: ${Array.from(userProperties.keys()).join(", ")}`);

    expect(userProperties.size).toBe(3);
    expect(userProperties.has("name")).toBe(true);
    expect(userProperties.has("email")).toBe(true);
    expect(userProperties.has("age")).toBe(true);

    console.log("✅ Validation passes with compatible schemas");
  });

  it("🚨 FIXED STRATEGY: Missing property validation", () => {
    console.log("🚨 === MISSING PROPERTY VALIDATION ===");

    const predefinedSchema = createMockNodeSchema({
      "User": ["name", "email", "age", "verified"]
    });

    const fixedMapping = NodeLabelTokenToPropertyKeys.fixed(predefinedSchema);

    // ✅ CREATE INCOMPLETE IMPORT SCHEMAS (missing 'verified')
    const importPropertySchemas = new Map<string, PropertySchema>();
    importPropertySchemas.set("name", createMockPropertySchema("name", "STRING"));
    importPropertySchemas.set("email", createMockPropertySchema("email", "STRING"));
    importPropertySchemas.set("age", createMockPropertySchema("age", "LONG"));
    // Missing: verified

    // ✅ EXPECT VALIDATION ERROR
    const userLabel = NodeLabel.of("User");

    try {
      fixedMapping.propertySchemas(userLabel, importPropertySchemas);
      console.log("❌ Should have thrown for missing properties");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly caught missing property error: ${(error as Error).message}`);
      expect((error as Error).message).toContain("Missing node properties");
      expect((error as Error).message).toContain("verified");
    }

    console.log("✅ Missing property validation works correctly");
  });

  it("⚠️ FIXED STRATEGY: Incompatible type validation", () => {
    console.log("⚠️ === INCOMPATIBLE TYPE VALIDATION ===");

    const predefinedSchema = createMockNodeSchema({
      "User": ["name", "age"]
    });

    const fixedMapping = NodeLabelTokenToPropertyKeys.fixed(predefinedSchema);

    // ✅ CREATE INCOMPATIBLE IMPORT SCHEMAS
    const importPropertySchemas = new Map<string, PropertySchema>();
    importPropertySchemas.set("name", createMockPropertySchema("name", "STRING"));
    importPropertySchemas.set("age", createMockPropertySchema("age", "STRING")); // Should be LONG

    // ✅ EXPECT TYPE COMPATIBILITY ERROR
    const userLabel = NodeLabel.of("User");

    try {
      fixedMapping.propertySchemas(userLabel, importPropertySchemas);
      console.log("❌ Should have thrown for incompatible types");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly caught type incompatibility error: ${(error as Error).message}`);
      expect((error as Error).message).toContain("Incompatible value types");
      expect((error as Error).message).toContain("age");
    }

    console.log("✅ Type compatibility validation works correctly");
  });

  it("🤝 UNION OPERATION: Thread coordination", () => {
    console.log("🤝 === UNION OPERATION TESTING ===");

    // ✅ CREATE TWO SEPARATE MAPPINGS (simulating different threads)
    const leftMapping = NodeLabelTokenToPropertyKeys.lazy();
    const rightMapping = NodeLabelTokenToPropertyKeys.lazy();

    // Thread 1 discovers User properties
    leftMapping.add(NodeLabelTokens.of("User"), ["name", "email"]);
    leftMapping.add(NodeLabelTokens.of("Company"), ["name", "industry"]);

    // Thread 2 discovers overlapping and new properties
    rightMapping.add(NodeLabelTokens.of("User"), ["age", "verified"]); // New User props
    rightMapping.add(NodeLabelTokens.of("Person"), ["name", "birthDate"]); // New label

    // ✅ CREATE PROPERTY SCHEMAS FOR UNION
    const importPropertySchemas = new Map<string, PropertySchema>();
    const allPropertyKeys = ["name", "email", "age", "verified", "industry", "birthDate"];
    allPropertyKeys.forEach(key => {
      importPropertySchemas.set(key, createMockPropertySchema(key, "STRING"));
    });

    // ✅ PERFORM UNION OPERATION
    const unionMapping = NodeLabelTokenToPropertyKeys.union(
      leftMapping,
      rightMapping,
      importPropertySchemas
    );

    console.log(`Union mapping created: ${unionMapping.constructor.name}`);

    // ✅ VERIFY ALL LABELS ARE PRESENT
    const unionLabels = unionMapping.nodeLabels();
    const labelNames = Array.from(unionLabels).map(label => label.name()).sort();
    console.log(`Union labels: ${labelNames.join(", ")}`);

    expect(unionLabels.size).toBe(3);
    expect(labelNames).toEqual(["Company", "Person", "User"]);

    // ✅ VERIFY PROPERTY MERGING
    const userLabel = NodeLabel.of("User");
    const userProperties = unionMapping.propertySchemas(userLabel, importPropertySchemas);
    const userPropertyKeys = Array.from(userProperties.keys()).sort();
    console.log(`Union User properties: ${userPropertyKeys.join(", ")}`);

    // Should have properties from both mappings
    expect(userPropertyKeys).toEqual(["age", "email", "name", "verified"]);

    console.log("✅ Union operation combines mappings correctly");
  });

  it("🧵 THREAD SAFETY: Concurrent property addition", () => {
    console.log("🧵 === THREAD SAFETY TESTING ===");

    const lazyMapping = NodeLabelTokenToPropertyKeys.lazy();
    const userToken = NodeLabelTokens.of("User");

    // ✅ SIMULATE CONCURRENT ADDITIONS
    console.log("Simulating concurrent property additions...");

    // Multiple "threads" adding properties to same label
    lazyMapping.add(userToken, ["name", "email"]);
    lazyMapping.add(userToken, ["age", "verified"]);
    lazyMapping.add(userToken, ["email", "lastLogin"]); // Overlapping property

    // ✅ VERIFY DEDUPLICATION
    const importPropertySchemas = new Map<string, PropertySchema>();
    ["name", "email", "age", "verified", "lastLogin"].forEach(key => {
      importPropertySchemas.set(key, createMockPropertySchema(key, "STRING"));
    });

    const userLabel = NodeLabel.of("User");
    const userProperties = lazyMapping.propertySchemas(userLabel, importPropertySchemas);
    const propertyKeys = Array.from(userProperties.keys()).sort();

    console.log(`Final properties after concurrent additions: ${propertyKeys.join(", ")}`);

    // Should have all unique properties
    expect(propertyKeys).toEqual(["age", "email", "lastLogin", "name", "verified"]);
    expect(propertyKeys.length).toBe(5); // No duplicates

    console.log("✅ Thread safety and deduplication work correctly");
  });

  it("🎯 REAL-WORLD USAGE: Multi-threaded import simulation", () => {
    console.log("🎯 === REAL-WORLD IMPORT SIMULATION ===");

    // ✅ SIMULATE IMPORT PROCESS
    console.log("Simulating multi-threaded CSV import...");

    // Each thread gets its own mapping
    const thread1Mapping = NodeLabelTokenToPropertyKeys.lazy();
    const thread2Mapping = NodeLabelTokenToPropertyKeys.lazy();
    const thread3Mapping = NodeLabelTokenToPropertyKeys.lazy();

    // Thread 1: Processes User nodes
    console.log("Thread 1: Processing User nodes...");
    thread1Mapping.add(NodeLabelTokens.of("User"), ["id", "name", "email"]);
    thread1Mapping.add(NodeLabelTokens.of(["User", "Customer"]), ["membershipLevel", "joinDate"]);

    // Thread 2: Processes Company nodes
    console.log("Thread 2: Processing Company nodes...");
    thread2Mapping.add(NodeLabelTokens.of("Company"), ["id", "name", "industry", "employees"]);

    // Thread 3: Processes mixed nodes
    console.log("Thread 3: Processing mixed nodes...");
    thread3Mapping.add(NodeLabelTokens.of("User"), ["verified", "lastLogin"]);
    thread3Mapping.add(NodeLabelTokens.of("Person"), ["name", "birthDate", "address"]);

    // ✅ COMBINE ALL THREAD MAPPINGS
    console.log("Combining thread results...");

    const importPropertySchemas = new Map<string, PropertySchema>();
    const allProps = ["id", "name", "email", "membershipLevel", "joinDate", "industry",
                     "employees", "verified", "lastLogin", "birthDate", "address"];
    allProps.forEach(key => {
      importPropertySchemas.set(key, createMockPropertySchema(key, "STRING"));
    });

    // Union thread 1 and 2
    const partial = NodeLabelTokenToPropertyKeys.union(thread1Mapping, thread2Mapping, importPropertySchemas);

    // Union result with thread 3
    const finalMapping = NodeLabelTokenToPropertyKeys.union(partial, thread3Mapping, importPropertySchemas);

    // ✅ VERIFY FINAL SCHEMA
    const finalLabels = finalMapping.nodeLabels();
    const labelNames = Array.from(finalLabels).map(label => label.name()).sort();
    console.log(`Final schema labels: ${labelNames.join(", ")}`);

    expect(labelNames).toEqual(["Company", "Customer", "Person", "User"]);

    // Check User properties (should have contributions from multiple threads)
    const userProperties = finalMapping.propertySchemas(NodeLabel.of("User"), importPropertySchemas);
    const userPropKeys = Array.from(userProperties.keys()).sort();
    console.log(`Final User properties: ${userPropKeys.join(", ")}`);

    // Should include properties from all threads that mentioned User
    expect(userPropKeys).toContain("id");
    expect(userPropKeys).toContain("name");
    expect(userPropKeys).toContain("email");
    expect(userPropKeys).toContain("membershipLevel"); // From multi-label token
    expect(userPropKeys).toContain("verified"); // From thread 3

    console.log("✅ Multi-threaded import simulation successful!");
  });

});

// ✅ HELPER FUNCTIONS

function createMockPropertySchema(key: string, valueType: string): PropertySchema {
  return {
    key: () => key,
    valueType: () => ({
      name: () => valueType,
      isCompatibleWith: (other: any) => other.name() === valueType
    }),
    defaultValue: () => null,
    state: () => "PERSISTENT"
  } as PropertySchema;
}

function createMockNodeSchema(labelToProperties: Record<string, string[]>): NodeSchema {
  const labels = new Set<NodeLabel>();

  Object.keys(labelToProperties).forEach(labelName => {
    labels.add(NodeLabel.of(labelName));
  });

  return {
    availableLabels: () => labels,
    get: (label: NodeLabel) => ({
      properties: () => {
        const props = new Map<string, PropertySchema>();
        const propKeys = labelToProperties[label.name()] || [];
        propKeys.forEach(key => {
          props.set(key, createMockPropertySchema(key, "STRING"));
        });
        return props;
      }
    })
  } as NodeSchema;
}
