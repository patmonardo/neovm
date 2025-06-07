import { describe, it, expect } from "vitest";
import { ElementSchemaVisitor } from "../ElementSchemaVisitor";
import { ValueType, PropertyState } from "@/api";

// Simple concrete implementation for testing
class TestElementSchemaVisitor extends ElementSchemaVisitor {
  public exportedCount = 0;

  protected export(): void {
    this.exportedCount++;
    console.log(`🔄 Export called! Key: ${this.key()}, Type: ${this.valueType()}, State: ${this.state()}`);
  }
}

describe("ElementSchemaVisitor - The Foundation", () => {

  it("should demonstrate the overloaded methods pattern", () => {
    console.log("🧩 Testing method overloads");

    const visitor = new TestElementSchemaVisitor();

    // Test the dual nature - visitor methods return boolean, getters return values
    const keyResult = visitor.key("testProperty");
    expect(keyResult).toBe(true); // Visitor method returns boolean

    const keyValue = visitor.key();
    expect(keyValue).toBe("testProperty"); // Getter method returns value

    const typeResult = visitor.valueType(ValueType.STRING);
    expect(typeResult).toBe(true);

    const typeValue = visitor.valueType();
    expect(typeValue).toBe(ValueType.STRING);

    console.log("✅ Overloaded methods work perfectly!");
  });

  it("should trigger export when endOfEntity is called", () => {
    console.log("🎯 Testing export trigger");

    const visitor = new TestElementSchemaVisitor();

    // Set up a complete property
    visitor.key("name");
    visitor.valueType(ValueType.STRING);
    visitor.state(PropertyState.PERSISTENT);

    expect(visitor.exportedCount).toBe(0);

    // This should trigger export() and reset
    visitor.endOfEntity();

    expect(visitor.exportedCount).toBe(1);
    console.log("✅ Export triggered on endOfEntity!");
  });

});
