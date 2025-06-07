import { describe, it, expect } from "vitest";
import { ElementSchemaVisitor } from "../ElementSchemaVisitor";
import { ValueType, PropertyState } from "@/api";

class PropertySchemaBuilder extends ElementSchemaVisitor {
  protected export(): void {
    // We'll test the PropertySchema interface directly
  }
}

describe("ElementSchemaVisitor as PropertySchema", () => {

  it("should act as a PropertySchema once built", () => {
    console.log("🏗️ Testing PropertySchema interface");

    const builder = new PropertySchemaBuilder();

    // Build up the PropertySchema
    builder.key("userName");
    builder.valueType(ValueType.STRING);
    builder.state(PropertyState.PERSISTENT);

    // Now treat it AS a PropertySchema
    const propertySchema = builder as any; // Cast to access PropertySchema methods

    expect(propertySchema.key()).toBe("userName");
    expect(propertySchema.valueType()).toBe(ValueType.STRING);
    expect(propertySchema.state()).toBe(PropertyState.PERSISTENT);

    console.log("✅ ElementSchemaVisitor IS a PropertySchema!");
  });

  it("should demonstrate the builder-then-schema pattern", () => {
    console.log("🔄 Testing builder → schema transition");

    const builder = new PropertySchemaBuilder();

    // Phase 1: Builder mode (setters return boolean)
    const setResult = builder.key("score");
    expect(setResult).toBe(true); // Builder returns boolean

    // Phase 2: Schema mode (getters return values)
    const getValue = builder.key();
    expect(getValue).toBe("score"); // Schema returns value

    console.log("✅ Same object, two modes!");
  });

});
