import { ValueType } from '../ValueType';
import { DefaultValue } from '../DefaultValue';

describe("ValueType API - Core Data Type System", () => {

  it("🔍 Basic ValueType Enum Values", () => {
    console.log("🔍 === BASIC VALUETYPE ENUM VALUES ===");

    // List all ValueType enum values
    console.log("📊 Available ValueType enum values:");
    Object.values(ValueType)
      .filter(v => typeof v === 'number')
      .forEach((value, index) => {
        const enumName = ValueType[value as ValueType];
        console.log(`  ${index + 1}. ${enumName} = ${value}`);
      });

    // Test enum value access
    console.log("\n🎯 Testing enum value access:");
    console.log("  ValueType.LONG:", ValueType.LONG);
    console.log("  ValueType.STRING:", ValueType.STRING);
    console.log("  ValueType.DOUBLE:", ValueType.DOUBLE);
    console.log("  ValueType.BOOLEAN:", ValueType.BOOLEAN);

    // ▶️ CLICK -> See all enum values!
  });

  it("📝 ValueType.name() Function", () => {
    console.log("📝 === VALUETYPE.NAME() FUNCTION ===");

    const testTypes = [
      ValueType.LONG,
      ValueType.STRING,
      ValueType.DOUBLE,
      ValueType.BOOLEAN,
      ValueType.FLOAT,
      ValueType.LONG_ARRAY,
      ValueType.STRING_ARRAY
    ];

    console.log("🏷️ Testing ValueType.name() function:");
    testTypes.forEach((type, index) => {
      const name = ValueType.name(type);
      console.log(`  ${index + 1}. ValueType.name(${type}) = "${name}"`);
    });

    // ▶️ CLICK -> Test name function!
  });

  it("📄 CSV Name Mapping", () => {
    console.log("📄 === CSV NAME MAPPING ===");

    const csvTestTypes = [
      ValueType.LONG,
      ValueType.DOUBLE,
      ValueType.FLOAT,
      ValueType.STRING,
      ValueType.BOOLEAN,
      ValueType.LONG_ARRAY,
      ValueType.DOUBLE_ARRAY,
      ValueType.STRING_ARRAY
    ];

    console.log("📊 ValueType → CSV name mapping:");
    csvTestTypes.forEach((type, index) => {
      try {
        const csvName = ValueType.csvName(type);
        console.log(`  ${index + 1}. ${ValueType.name(type)} → "${csvName}"`);
      } catch (error) {
        console.log(`  ${index + 1}. ${ValueType.name(type)} → ERROR: ${error.message}`);
      }
    });

    // Test reverse mapping
    console.log("\n🔄 CSV name → ValueType reverse mapping:");
    const csvNames = ["long", "string", "double", "boolean", "long[]", "string[]"];

    csvNames.forEach((csvName, index) => {
      try {
        const valueType = ValueType.fromCsvName(csvName);
        console.log(`  ${index + 1}. "${csvName}" → ${ValueType.name(valueType)}`);
      } catch (error) {
        console.log(`  ${index + 1}. "${csvName}" → ERROR: ${error.message}`);
      }
    });

    // ▶️ CLICK -> Test CSV name mapping!
  });

  it("🔮 Cypher Name Mapping", () => {
    console.log("🔮 === CYPHER NAME MAPPING ===");

    const cypherTestTypes = [
      ValueType.LONG,
      ValueType.DOUBLE,
      ValueType.FLOAT,
      ValueType.STRING,
      ValueType.BOOLEAN,
      ValueType.BIGINT,
      ValueType.LONG_ARRAY,
      ValueType.STRING_ARRAY
    ];

    console.log("🎯 ValueType → Cypher name mapping:");
    cypherTestTypes.forEach((type, index) => {
      const cypherName = ValueType.cypherName(type);
      console.log(`  ${index + 1}. ${ValueType.name(type)} → "${cypherName}"`);
    });

    // ▶️ CLICK -> Test Cypher name mapping!
  });

  it("🏭 Default Value Generation", () => {
    console.log("🏭 === DEFAULT VALUE GENERATION ===");

    const defaultTestTypes = [
      ValueType.LONG,
      ValueType.DOUBLE,
      ValueType.STRING,
      ValueType.BOOLEAN,
      ValueType.LONG_ARRAY,
      ValueType.DOUBLE_ARRAY,
      ValueType.STRING_ARRAY
    ];

    console.log("⚙️ ValueType → Default value mapping:");
    defaultTestTypes.forEach((type, index) => {
      try {
        const defaultValue = ValueType.fallbackValue(type);
        console.log(`  ${index + 1}. ${ValueType.name(type)} → DefaultValue created`);

        // Try to inspect the default value (if it has accessible methods)
        if (defaultValue) {
          console.log(`       Default value type: ${typeof defaultValue}`);
        }
      } catch (error) {
        console.log(`  ${index + 1}. ${ValueType.name(type)} → ERROR: ${error.message}`);
      }
    });

    // ▶️ CLICK -> Test default value generation!
  });

  it("🔧 Type Compatibility System", () => {
    console.log("🔧 === TYPE COMPATIBILITY SYSTEM ===");

    const compatibilityTests = [
      { type1: ValueType.LONG, type2: ValueType.LONG, expected: true },
      { type1: ValueType.FLOAT, type2: ValueType.DOUBLE, expected: true },
      { type1: ValueType.LONG, type2: ValueType.BIGINT, expected: true },
      { type1: ValueType.STRING, type2: ValueType.LONG, expected: false },
      { type1: ValueType.LONG_ARRAY, type2: ValueType.UNTYPED_ARRAY, expected: true },
      { type1: ValueType.STRING_ARRAY, type2: ValueType.UNTYPED_ARRAY, expected: true }
    ];

    console.log("🎯 Type compatibility tests:");
    compatibilityTests.forEach((test, index) => {
      const result = ValueType.isCompatibleWith(test.type1, test.type2);
      const status = result === test.expected ? '✅' : '❌';

      console.log(`  ${index + 1}. ${status} ${ValueType.name(test.type1)} ↔ ${ValueType.name(test.type2)}`);
      console.log(`       Expected: ${test.expected}, Got: ${result}`);
    });

    // ▶️ CLICK -> Test type compatibility!
  });

  it("🎭 Visitor Pattern Deep Dive", () => {
    console.log("🎭 === VISITOR PATTERN DEEP DIVE ===");

    // Create a simple test visitor to understand the pattern
    const testVisitor: ValueType.ValueTypeVisitor<string> = {
      visitLong: () => "VISITED_LONG",
      visitFloat: () => "VISITED_FLOAT",
      visitDouble: () => "VISITED_DOUBLE",
      visitBoolean: () => "VISITED_BOOLEAN",
      visitString: () => "VISITED_STRING",
      visitBigInt: () => "VISITED_BIGINT",
      visitLongArray: () => "VISITED_LONG_ARRAY",
      visitFloatArray: () => "VISITED_FLOAT_ARRAY",
      visitDoubleArray: () => "VISITED_DOUBLE_ARRAY",
      visitBooleanArray: () => "VISITED_BOOLEAN_ARRAY",
      visitStringArray: () => "VISITED_STRING_ARRAY",
      visitBigIntArray: () => "VISITED_BIGINT_ARRAY",
      visitUntypedArray: () => "VISITED_UNTYPED_ARRAY",
      visitUnknown: () => "VISITED_UNKNOWN"
    };

    const visitorTestTypes = [
      ValueType.LONG,
      ValueType.STRING,
      ValueType.DOUBLE,
      ValueType.BOOLEAN,
      ValueType.LONG_ARRAY,
      ValueType.STRING_ARRAY,
      ValueType.UNKNOWN
    ];

    console.log("🎯 Testing visitor pattern with ValueType.accept():");
    visitorTestTypes.forEach((type, index) => {
      try {
        const result = ValueType.accept(type, testVisitor);
        console.log(`  ${index + 1}. ${ValueType.name(type)} → "${result}"`);
      } catch (error) {
        console.log(`  ${index + 1}. ${ValueType.name(type)} → ERROR: ${error.message}`);
      }
    });

    // ▶️ CLICK -> Test visitor pattern!
  });

  it("💡 Understanding the Visitor Pattern Purpose", () => {
    console.log("💡 === UNDERSTANDING THE VISITOR PATTERN PURPOSE ===");

    console.log("🧠 The Visitor Pattern in ValueType allows:");
    console.log("  1. Type-safe operations on different ValueType enum values");
    console.log("  2. Adding new operations without modifying the ValueType enum");
    console.log("  3. Compile-time checking that all cases are handled");

    console.log("\n📋 Example: Creating a 'size calculator' visitor:");

    const sizeCalculatorVisitor: ValueType.ValueTypeVisitor<number> = {
      visitLong: () => 8,        // 8 bytes for long
      visitFloat: () => 4,       // 4 bytes for float
      visitDouble: () => 8,      // 8 bytes for double
      visitBoolean: () => 1,     // 1 byte for boolean
      visitString: () => -1,     // Variable size
      visitBigInt: () => 16,     // Approximate
      visitLongArray: () => -1,  // Variable size
      visitFloatArray: () => -1, // Variable size
      visitDoubleArray: () => -1,// Variable size
      visitBooleanArray: () => -1,// Variable size
      visitStringArray: () => -1, // Variable size
      visitBigIntArray: () => -1,  // Variable size
      visitUntypedArray: () => -1, // Variable size
      visitUnknown: () => 0       // Unknown size
    };

    const sizeTestTypes = [
      ValueType.LONG,
      ValueType.FLOAT,
      ValueType.DOUBLE,
      ValueType.BOOLEAN,
      ValueType.STRING
    ];

    console.log("\n📏 Size calculation visitor results:");
    sizeTestTypes.forEach((type, index) => {
      const size = ValueType.accept(type, sizeCalculatorVisitor);
      const sizeStr = size === -1 ? "Variable" : `${size} bytes`;
      console.log(`  ${index + 1}. ${ValueType.name(type)} → ${sizeStr}`);
    });

    // ▶️ CLICK -> Understand visitor pattern purpose!
  });

  it("🚨 Error Handling and Edge Cases", () => {
    console.log("🚨 === ERROR HANDLING AND EDGE CASES ===");

    console.log("🔍 Testing invalid CSV name:");
    try {
      const invalidType = ValueType.fromCsvName("invalid_type");
      console.log("  ❌ Should have thrown error for invalid CSV name");
    } catch (error) {
      console.log("  ✅ Correctly threw error:", error.message);
    }

    console.log("\n🔍 Testing UNKNOWN type with CSV name:");
    try {
      const unknownCsvName = ValueType.csvName(ValueType.UNKNOWN);
      console.log("  ❌ Should have thrown error for UNKNOWN CSV name");
    } catch (error) {
      console.log("  ✅ Correctly threw error:", error.message);
    }

    console.log("\n🔍 Testing visitor with missing methods:");
    const incompleteVisitor: Partial<ValueType.ValueTypeVisitor<string>> = {
      visitLong: () => "ONLY_LONG"
      // Missing other required methods
    };

    try {
      // This should work for LONG
      const result = ValueType.accept(ValueType.LONG, incompleteVisitor as any);
      console.log("  ✅ LONG with incomplete visitor:", result);
    } catch (error) {
      console.log("  ❌ LONG with incomplete visitor failed:", error.message);
    }

    // ▶️ CLICK -> Test error handling!
  });

  it("🔗 Integration with CsvImportParsingUtil", () => {
    console.log("🔗 === INTEGRATION WITH CSVIMPORTPARSINGUTIL ===");

    console.log("🎯 How ValueType integrates with CSV parsing:");
    console.log("  1. CSV header 'name:string' → ValueType.fromCsvName('string') → ValueType.STRING");
    console.log("  2. ValueType.accept(visitor) → Calls appropriate parsing function");
    console.log("  3. Parsing function converts CSV string value to typed value");

    console.log("\n📋 Simulating CSV parsing integration:");
    const csvHeaders = [
      { header: "name:string", expectedType: "STRING" },
      { header: "age:long", expectedType: "LONG" },
      { header: "salary:double", expectedType: "DOUBLE" },
      { header: "isActive:boolean", expectedType: "BOOLEAN" },
      { header: "scores:long[]", expectedType: "LONG_ARRAY" }
    ];

    csvHeaders.forEach((test, index) => {
      const [propertyName, typeName] = test.header.split(':');
      console.log(`\n  ${index + 1}. Header: "${test.header}"`);
      console.log(`       Property: "${propertyName}"`);
      console.log(`       Type name: "${typeName}"`);

      try {
        const valueType = ValueType.fromCsvName(typeName);
        const actualType = ValueType.name(valueType);
        const match = actualType === test.expectedType ? '✅' : '❌';

        console.log(`       ${match} Parsed type: ${actualType} (expected: ${test.expectedType})`);
      } catch (error) {
        console.log(`       ❌ Parse error: ${error.message}`);
      }
    });

    // ▶️ CLICK -> See CSV integration!
  });

});
