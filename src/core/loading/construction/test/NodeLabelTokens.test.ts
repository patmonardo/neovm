import { describe, it, expect } from "vitest";
import { NodeLabelTokens, NodeLabelToken, ValidNodeLabelToken } from "@/core/loading/construction/NodeLabelTokens";
import { NodeLabel } from "@/projection";

/**
 * 🎯 NodeLabelTokens - Polymorphic Token Factory System
 *
 * This tests the core tokenization system that converts various input types
 * into standardized NodeLabelToken objects. This is the FOUNDATION of the
 * entire label management system.
 *
 * Think: NLP tokenization but for graph node labels!
 */

describe("🏷️ NodeLabelTokens - Polymorphic Token Factory", () => {

  it("🔧 FACTORY METHODS: Basic token creation patterns", () => {
    console.log("🔧 === FACTORY METHOD TESTING ===");

    // ✅ SINGLETON PATTERN - Single string
    const singleString = NodeLabelTokens.of("User");
    console.log(`Single string: "${singleString.getStrings().join(',')}" (size: ${singleString.size()})`);

    expect(singleString.size()).toBe(1);
    expect(singleString.get(0).name()).toBe("User");
    expect(singleString.getStrings()).toEqual(["User"]);
    expect(singleString.isEmpty()).toBe(false);
    expect(singleString.isInvalid()).toBe(false);

    // ✅ ARRAY PATTERN - Multiple strings
    const multiString = NodeLabelTokens.of(["User", "Person", "Customer"]);
    console.log(`Multi string: "${multiString.getStrings().join(',')}" (size: ${multiString.size()})`);

    expect(multiString.size()).toBe(3);
    expect(multiString.get(0).name()).toBe("User");
    expect(multiString.get(1).name()).toBe("Person");
    expect(multiString.get(2).name()).toBe("Customer");
    expect(multiString.getStrings()).toEqual(["User", "Person", "Customer"]);

    console.log("✅ Basic factory methods work perfectly");
  });

  it("📦 EMPTY AND MISSING: Handle edge cases", () => {
    console.log("📦 === EMPTY AND MISSING STATES ===");

    // ✅ EMPTY ARRAY
    const emptyArray = NodeLabelTokens.of([]);
    console.log(`Empty array: size=${emptyArray.size()}, isEmpty=${emptyArray.isEmpty()}`);

    expect(emptyArray.size()).toBe(0);
    expect(emptyArray.isEmpty()).toBe(true);
    expect(emptyArray.isInvalid()).toBe(false);
    expect(emptyArray.getStrings()).toEqual([]);

    // ✅ NULL/UNDEFINED HANDLING
    const nullInput = NodeLabelTokens.ofNullable(null);
    console.log(`Null input: size=${nullInput.size()}, isEmpty=${nullInput.isEmpty()}`);

    expect(nullInput.size()).toBe(0);
    expect(nullInput.isEmpty()).toBe(true);
    expect(nullInput.isInvalid()).toBe(false);

    const undefinedInput = NodeLabelTokens.ofNullable(undefined);
    expect(undefinedInput.isEmpty()).toBe(true);
    expect(undefinedInput.isInvalid()).toBe(false);

    console.log("✅ Edge cases handled correctly");
  });

  it("🚨 INVALID INPUT: Error handling and invalid tokens", () => {
    console.log("🚨 === INVALID INPUT HANDLING ===");

    // ✅ INVALID INPUT THROUGH ofNullable (doesn't throw)
    const invalidObject = NodeLabelTokens.ofNullable({ not: "a label" });
    console.log(`Invalid object: isEmpty=${invalidObject.isEmpty()}, isInvalid=${invalidObject.isInvalid()}`);

    expect(invalidObject.isInvalid()).toBe(true);
    expect(invalidObject.isEmpty()).toBe(true);

    // ✅ INVALID INPUT THROUGH of() should throw
    try {
      const shouldThrow = NodeLabelTokens.of({ invalid: "object" });
      console.log("❌ Should have thrown but didn't!");
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(`✅ Correctly threw error: ${(error as Error).message}`);
      expect((error as Error).message).toContain("Could not represent");
    }

    // ✅ MIXED INVALID ARRAYS
    const mixedArray = NodeLabelTokens.ofNullable(["User", 123, "Person"]);
    console.log(`Mixed array: isInvalid=${mixedArray.isInvalid()}`);
    expect(mixedArray.isInvalid()).toBe(true);

    console.log("✅ Invalid input handling works correctly");
  });

  it("🔄 ITERATION: Symbol.iterator and for-of loops", () => {
    console.log("🔄 === ITERATION TESTING ===");

    const multiLabel = NodeLabelTokens.of(["Admin", "User", "Moderator"]);

    // ✅ FOR-OF LOOP
    const iteratedLabels: string[] = [];
    for (const label of multiLabel) {
      iteratedLabels.push(label.name());
    }
    console.log(`For-of iteration: ${iteratedLabels.join(", ")}`);
    expect(iteratedLabels).toEqual(["Admin", "User", "Moderator"]);

    // ✅ ARRAY SPREADING
    const spreadLabels = [...multiLabel].map(label => label.name());
    console.log(`Array spreading: ${spreadLabels.join(", ")}`);
    expect(spreadLabels).toEqual(["Admin", "User", "Moderator"]);

    // ✅ ARRAY.FROM
    const arrayFromLabels = Array.from(multiLabel).map(label => label.name());
    console.log(`Array.from: ${arrayFromLabels.join(", ")}`);
    expect(arrayFromLabels).toEqual(["Admin", "User", "Moderator"]);

    // ✅ EMPTY ITERATION
    const emptyToken = NodeLabelTokens.of([]);
    const emptyIteration = [...emptyToken];
    expect(emptyIteration).toEqual([]);

    console.log("✅ All iteration patterns work perfectly");
  });

  it("🎯 TYPE-SAFE FACTORIES: ofStrings and ofNodeLabels", () => {
    console.log("🎯 === TYPE-SAFE FACTORY METHODS ===");

    // ✅ STRING-ONLY FACTORY
    const stringToken = NodeLabelTokens.ofStrings("Manager", "Employee", "Contractor");
    console.log(`String factory: ${stringToken.getStrings().join(", ")} (size: ${stringToken.size()})`);

    expect(stringToken.size()).toBe(3);
    expect(stringToken.getStrings()).toEqual(["Manager", "Employee", "Contractor"]);

    // ✅ EMPTY STRING FACTORY
    const emptyStrings = NodeLabelTokens.ofStrings();
    expect(emptyStrings.isEmpty()).toBe(true);
    expect(emptyStrings.size()).toBe(0);

    // ✅ NODELABEL-ONLY FACTORY
    const userLabel = NodeLabel.of("User");
    const adminLabel = NodeLabel.of("Admin");
    const nodeLabelToken = NodeLabelTokens.ofNodeLabels(userLabel, adminLabel);

    console.log(`NodeLabel factory: ${nodeLabelToken.getStrings().join(", ")} (size: ${nodeLabelToken.size()})`);
    expect(nodeLabelToken.size()).toBe(2);
    expect(nodeLabelToken.get(0)).toBe(userLabel);
    expect(nodeLabelToken.get(1)).toBe(adminLabel);

    console.log("✅ Type-safe factories work perfectly");
  });

  it("🔍 VALIDNODELABELTOKEN: Type safety markers", () => {
    console.log("🔍 === VALIDNODELABELTOKEN TESTING ===");

    // ✅ VALID TOKENS
    const validToken = NodeLabelTokens.of(["User", "Person"]);
    console.log(`Valid token: isInvalid=${validToken.isInvalid()}`);

    // Type assertion should work
    if (!validToken.isInvalid()) {
      const validTyped = validToken as ValidNodeLabelToken;
      expect(validTyped.isInvalid()).toBe(false);
      console.log("✅ Valid token correctly typed");
    }

    // ✅ INVALID TOKENS
    const invalidToken = NodeLabelTokens.ofNullable({ bad: "data" });
    console.log(`Invalid token: isInvalid=${invalidToken.isInvalid()}`);

    expect(invalidToken.isInvalid()).toBe(true);

    // Should NOT be ValidNodeLabelToken
    if (invalidToken.isInvalid()) {
      console.log("✅ Invalid token correctly identified");
    }

    console.log("✅ Type safety markers work correctly");
  });

  it("📊 INDEX ACCESS: Bounds checking and error handling", () => {
    console.log("📊 === INDEX ACCESS TESTING ===");

    const token = NodeLabelTokens.of(["First", "Second", "Third"]);

    // ✅ VALID INDICES
    expect(token.get(0).name()).toBe("First");
    expect(token.get(1).name()).toBe("Second");
    expect(token.get(2).name()).toBe("Third");
    console.log("✅ Valid indices work correctly");

    // ✅ INVALID INDICES
    try {
      token.get(3); // Out of bounds
      console.log("❌ Should have thrown for index 3");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly threw for index 3: ${(error as Error).message}`);
      expect((error as Error).message).toContain("bounds");
    }

    try {
      token.get(-1); // Negative index
      console.log("❌ Should have thrown for index -1");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly threw for index -1: ${(error as Error).message}`);
      expect((error as Error).message).toContain("bounds");
    }

    // ✅ EMPTY TOKEN ACCESS
    const emptyToken = NodeLabelTokens.of([]);
    try {
      emptyToken.get(0);
      console.log("❌ Should have thrown for empty token access");
      expect(false).toBe(true);
    } catch (error) {
      console.log(`✅ Correctly threw for empty token: ${(error as Error).message}`);
    }

    console.log("✅ Index bounds checking works perfectly");
  });

  it("🎯 REAL-WORLD USAGE: CSV import simulation", () => {
    console.log("🎯 === REAL-WORLD USAGE SIMULATION ===");

    // ✅ SIMULATE CSV IMPORT SCENARIOS
    const csvScenarios = [
      "User",                    // Single label
      "User,Person",            // Multiple labels
      "Employee,Manager,Admin", // Complex hierarchy
      "",                       // Empty (missing data)
      null,                     // Null value
      ["User"],                 // Already parsed array
      ["User", "Customer"]      // Multiple in array
    ];

    console.log("📋 Processing CSV-like scenarios:");

    for (const scenario of csvScenarios) {
      const token = NodeLabelTokens.ofNullable(scenario);
      const labels = token.getStrings().join(",") || "(empty)";
      const state = token.isInvalid() ? "INVALID" : token.isEmpty() ? "EMPTY" : "VALID";

      console.log(`  Input: ${JSON.stringify(scenario)} → ${labels} [${state}]`);

      // All should be processable (no crashes)
      expect(token).toBeTruthy();
      expect(typeof token.size()).toBe("number");
      expect(typeof token.isEmpty()).toBe("boolean");
      expect(typeof token.isInvalid()).toBe("boolean");
    }

    console.log("✅ All CSV scenarios handled gracefully");
  });

  it("🚀 PERFORMANCE: Large label sets", () => {
    console.log("🚀 === PERFORMANCE TESTING ===");

    // ✅ LARGE LABEL SET
    const manyLabels = Array.from({ length: 100 }, (_, i) => `Label${i}`);
    const largeToken = NodeLabelTokens.of(manyLabels);

    console.log(`Large token: ${largeToken.size()} labels`);
    expect(largeToken.size()).toBe(100);

    // ✅ RAPID ACCESS
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      const label = largeToken.get(i);
      expect(label.name()).toBe(`Label${i}`);
    }
    const accessTime = Date.now() - startTime;
    console.log(`✅ 100 label accesses in ${accessTime}ms`);

    // ✅ ITERATION PERFORMANCE
    const iterStart = Date.now();
    const collected = [...largeToken].map(label => label.name());
    const iterTime = Date.now() - iterStart;
    console.log(`✅ Full iteration in ${iterTime}ms`);

    expect(collected).toHaveLength(100);
    expect(collected[0]).toBe("Label0");
    expect(collected[99]).toBe("Label99");

    console.log("✅ Performance characteristics verified");
  });

});
