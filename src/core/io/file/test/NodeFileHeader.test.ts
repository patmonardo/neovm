import { NodeFileHeader } from "../NodeFileHeader";

describe("NodeFileHeader - CSV Node Import Brain", () => {
  it("🧠 Understanding NodeFileHeader Basics", () => {
    console.log("🧠 === UNDERSTANDING NODEFILEHEADER BASICS ===");

    // This is what a typical CSV node file header looks like
    const csvHeaders = [
      ":ID",
      "name:string",
      "age:long",
      "salary:double",
      ":LABEL",
    ];
    const nodeLabels = ["Person", "Employee"];

    console.log("📊 Raw CSV headers:", csvHeaders);
    console.log("🏷️ Node labels for this file:", nodeLabels);

    // Create NodeFileHeader - this parses the CSV structure
    const nodeFileHeader = NodeFileHeader.of(csvHeaders, nodeLabels);

    console.log("\n🔍 Parsed NodeFileHeader:");
    console.log("  Node labels:", nodeFileHeader.nodeLabels());
    console.log(
      "  Property mappings count:",
      nodeFileHeader.propertyMappings().length
    );

    // Show each property mapping
    nodeFileHeader.propertyMappings().forEach((prop, index) => {
      console.log(`  Property ${index + 1}:`, {
        columnIndex: prop.position(),
        propertyKey: prop.propertyKey(),
        // Note: These methods might not exist, showing conceptually
        // sourceColumn: prop.sourceColumn,
        // dataType: prop.dataType
      });
    });

    // ▶️ CLICK -> Learn NodeFileHeader structure!
  });

  it("🏗️ CSV Header Parsing Magic", () => {
    console.log("🏗️ === CSV HEADER PARSING MAGIC ===");

    // Different CSV header formats to understand the parsing
    const examples = [
      {
        name: "Simple Person File",
        headers: [":ID", "name:string", "age:long", ":LABEL"],
        labels: ["Person"],
      },
      {
        name: "Multi-Property Company File",
        headers: [
          ":ID",
          "companyName:string",
          "founded:long",
          "revenue:double",
          "public:boolean",
          ":LABEL",
        ],
        labels: ["Company", "Organization"],
      },
      {
        name: "Minimal Node File",
        headers: [":ID", ":LABEL"],
        labels: ["MinimalNode"],
      },
      {
        name: "Unlabeled Nodes",
        headers: [":ID", "data:string"],
        labels: [], // Empty = ALL_NODES
      },
    ];

    examples.forEach((example, index) => {
      console.log(`\n📋 Example ${index + 1}: ${example.name}`);
      console.log("  Headers:", example.headers);
      console.log(
        "  Labels:",
        example.labels.length > 0 ? example.labels : ["ALL_NODES (unlabeled)"]
      );

      try {
        const header = NodeFileHeader.of(example.headers, example.labels);
        console.log("  ✅ Valid header structure");
        console.log("  📊 Properties:", header.propertyMappings().length);
        console.log("  🏷️ Final labels:", header.nodeLabels());
      } catch (error) {
        console.log("  ❌ Invalid header:", error.message);
      }
    });

    // ▶️ CLICK -> See CSV header parsing in action!
  });

  it("⚠️ Error Cases and Validation", () => {
    console.log("⚠️ === ERROR CASES AND VALIDATION ===");

    const errorCases = [
      {
        name: "Missing ID Column",
        headers: ["name:string", "age:long"],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
      {
        name: "Wrong ID Column Position",
        headers: ["name:string", ":ID", "age:long"],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
      {
        name: "Empty Headers",
        headers: [],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
    ];

    errorCases.forEach((testCase, index) => {
      console.log(`\n🚨 Error Case ${index + 1}: ${testCase.name}`);
      console.log("  Headers:", testCase.headers);

      try {
        const header = NodeFileHeader.of(testCase.headers, testCase.labels);
        console.log("  ❌ Unexpected success - should have failed!");
      } catch (error) {
        console.log("  ✅ Correctly caught error:", error.message);
        console.log("  🎯 Expected:", testCase.expectedError);
      }
    });

    // ▶️ CLICK -> Test error handling!
  });

  it("🔬 Property Mapping Deep Dive", () => {
    console.log("🔬 === PROPERTY MAPPING DEEP DIVE ===");

    const complexHeaders = [
      ":ID",
      "firstName:string",
      "lastName:string",
      "age:long",
      "salary:double",
      "isActive:boolean",
      "joinDate:string",
      ":LABEL",
    ];

    const nodeFileHeader = NodeFileHeader.of(complexHeaders, [
      "Employee",
      "Person",
    ]);

    console.log("📊 Complex CSV structure:");
    console.log("  Total columns:", complexHeaders.length);
    console.log(
      "  Property columns:",
      nodeFileHeader.propertyMappings().length
    );

    console.log("\n🔍 Property mappings breakdown:");
    nodeFileHeader.propertyMappings().forEach((prop, index) => {
      const sourceColumn = complexHeaders[prop.position()];
      const [propertyName, propertyType] = sourceColumn.split(":");

      console.log(`  Mapping ${index + 1}:`);
      console.log(`    Column index: ${prop.position()}`);
      console.log(`    Property key: ${prop.propertyKey()}`);
      console.log(`    Source column: ${sourceColumn}`);
      console.log(`    Property type: ${propertyType || "string"}`); // ✅ ADDED: Show type
    });
  });

  // Add this new test to understand supported types:

  it("🔧 Type System Deep Dive", () => {
    console.log("🔧 === TYPE SYSTEM DEEP DIVE ===");

    const supportedTypes = [
      "string",
      "long",
      "double",
      "boolean",
      "bigint",
      "float",
      "string[]",
      "long[]",
      "double[]",
      "boolean[]",
      "bigint[]",
      "float[]",
      "Any[]",
    ];

    const unsupportedTypes = ["int", "short", "byte", "char", "int[]"];

    console.log("✅ Supported CSV types:");
    supportedTypes.forEach((type) => {
      try {
        const headers = [":ID", `testProp:${type}`, ":LABEL"];
        NodeFileHeader.of(headers, ["TestNode"]);
        console.log(`  ✅ ${type}`);
      } catch (error) {
        console.log(`  ❌ ${type} - ${error.message}`);
      }
    });

    console.log("\n❌ Unsupported CSV types (should fail):");
    unsupportedTypes.forEach((type) => {
      try {
        const headers = [":ID", `testProp:${type}`, ":LABEL"];
        NodeFileHeader.of(headers, ["TestNode"]);
        console.log(`  ⚠️ ${type} - Unexpectedly succeeded!`);
      } catch (error) {
        console.log(`  ✅ ${type} - Correctly rejected: ${error.message}`);
      }
    });
  });

  it("⚠️ Error Cases and Validation", () => {
    console.log("⚠️ === ERROR CASES AND VALIDATION ===");

    const errorCases = [
      {
        name: "Missing ID Column",
        headers: ["name:string", "age:long"],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
      {
        name: "Wrong ID Column Position",
        headers: ["name:string", ":ID", "age:long"],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
      {
        name: "Empty Headers",
        headers: [],
        labels: ["Person"],
        expectedError: "First column of header must be :ID",
      },
      // ✅ ADD: Test invalid type
      {
        name: "Invalid Type 'int'",
        headers: [":ID", "age:int", ":LABEL"],
        labels: ["Person"],
        expectedError: "Unknown value type from CSV name: 'int'",
      },
      // ✅ ADD: Test missing type annotation
      {
        name: "Missing Type Annotation",
        headers: [":ID", "name", ":LABEL"], // No :string
        labels: ["Person"],
        expectedError: "Property column must have type annotation",
      },
    ];

    errorCases.forEach((testCase, index) => {
      console.log(`\n🚨 Error Case ${index + 1}: ${testCase.name}`);
      console.log("  Headers:", testCase.headers);

      try {
        const header = NodeFileHeader.of(testCase.headers, testCase.labels);
        console.log("  ❌ Unexpected success - should have failed!");
        console.log("  📊 Properties:", header.propertyMappings().length);
      } catch (error) {
        console.log("  ✅ Correctly caught error:", error.message);
        console.log("  🎯 Expected:", testCase.expectedError);

        // ✅ ADD: Check if error message matches expected
        if (
          error.message.includes(testCase.expectedError) ||
          testCase.expectedError.includes(error.message)
        ) {
          console.log("  ✅ Error message matches expectation");
        } else {
          console.log("  ⚠️ Error message differs from expectation");
        }
      }
    });
  });

  it("📊 Graph Info CSV Compatibility", () => {
    console.log("📊 === GRAPH INFO CSV COMPATIBILITY ===");

    // Test that NodeFileHeader can work with the data referenced in graph-info.csv
    const typicalGraphInfoStructure = {
      expectedNodeTypes: ["User", "Post", "Company", "Tag"],
      expectedRelationshipTypes: ["FOLLOWS", "POSTED", "LIKED", "WORKS_AT"],
      expectedNodeCount: 29,
      expectedRelationshipCount: 50,
    };

    console.log("🎯 Expected structure from graph-info.csv:");
    console.log("  Node types:", typicalGraphInfoStructure.expectedNodeTypes);
    console.log(
      "  Relationship types:",
      typicalGraphInfoStructure.expectedRelationshipTypes
    );
    console.log("  Node count:", typicalGraphInfoStructure.expectedNodeCount);
    console.log(
      "  Relationship count:",
      typicalGraphInfoStructure.expectedRelationshipCount
    );

    // Test that NodeFileHeader can handle these node types
    typicalGraphInfoStructure.expectedNodeTypes.forEach((nodeType) => {
      try {
        const testHeaders = [":ID", "testProp:string", ":LABEL"];
        const header = NodeFileHeader.of(testHeaders, [nodeType]);
        console.log(`  ✅ ${nodeType}: Compatible with NodeFileHeader`);
      } catch (error) {
        console.log(`  ❌ ${nodeType}: Error - ${error.message}`);
      }
    });
  });

  it("🏷️ Node Labels and Schema Integration", () => {
    console.log("🏷️ === NODE LABELS AND SCHEMA INTEGRATION ===");

    // Test different label scenarios
    const scenarios = [
      {
        name: "Single Label",
        headers: [":ID", "name:string", "age:long"],
        labels: ["Person"],
        description: "Simple single-labeled nodes",
      },
      {
        name: "Multiple Labels",
        headers: [":ID", "name:string", "salary:double"],
        labels: ["Person", "Employee", "Manager"],
        description: "Nodes with multiple labels",
      },
      {
        name: "No Labels (ALL_NODES)",
        headers: [":ID", "data:string"],
        labels: [],
        description: "Unlabeled nodes - uses ALL_NODES",
      },
    ];

    scenarios.forEach((scenario, index) => {
      console.log(`\n📋 Scenario ${index + 1}: ${scenario.name}`);
      console.log("  Description:", scenario.description);

      const header = NodeFileHeader.of(scenario.headers, scenario.labels);
      const resultLabels = header.nodeLabels();

      console.log("  Input labels:", scenario.labels);
      console.log("  Result labels:", resultLabels);

      if (scenario.labels.length === 0) {
        console.log("  💡 Empty input labels = ALL_NODES handling");
      }

      if (scenario.labels.length > 1) {
        console.log("  💡 Multiple labels = union of schemas will be used");
      }
    });

    // ▶️ CLICK -> Explore label handling!
  });

  it("🧪 Real-World CSV Examples", () => {
    console.log("🧪 === REAL-WORLD CSV EXAMPLES ===");

    // Simulate what actual CSV files might look like
    const realWorldExamples = [
      {
        filename: "users.csv",
        headers: [
          ":ID",
          "username:string",
          "email:string",
          "joinDate:string",
          "isVerified:boolean",
        ],
        labels: ["User"],
        sampleRow: [
          "user_001",
          "john_doe",
          "john@example.com",
          "2024-01-15",
          "true",
        ],
      },
      {
        filename: "companies.csv",
        headers: [
          ":ID",
          "name:string",
          "industry:string",
          "employees:long",
          "revenue:double",
        ],
        labels: ["Company", "Organization"],
        sampleRow: ["comp_001", "TechCorp", "Software", "1500", "50000000.00"],
      },
      {
        filename: "products.csv",
        headers: [":ID", "title:string", "price:double", "inStock:boolean"],
        labels: ["Product"],
        sampleRow: ["prod_001", "Laptop Pro", "1299.99", "true"],
      },
    ];

    realWorldExamples.forEach((example, index) => {
      console.log(`\n📄 File ${index + 1}: ${example.filename}`);
      console.log("  Headers:", example.headers);
      console.log("  Sample row:", example.sampleRow);

      const header = NodeFileHeader.of(example.headers, example.labels);

      console.log("  Analysis:");
      console.log(`    Node labels: ${header.nodeLabels().join(", ")}`);
      console.log(`    Properties: ${header.propertyMappings().length}`);

      // Show property types inferred from headers
      console.log("    Property types:");
      header.propertyMappings().forEach((prop) => {
        const columnHeader = example.headers[prop.position()];
        const [propName, propType] = columnHeader.split(":");
        console.log(`      ${propName} → ${propType || "string"}`);
      });
    });

    // ▶️ CLICK -> See real-world CSV examples!
  });

  it("🚀 Performance and Memory Insights", () => {
    console.log("🚀 === PERFORMANCE AND MEMORY INSIGHTS ===");

    // Test with various header sizes
    const sizes = [5, 20, 50, 100];

    sizes.forEach((size) => {
      console.log(`\n📊 Testing header with ${size} properties:`);

      // Generate large header
      const headers = [":ID"];
      for (let i = 1; i < size; i++) {
        headers.push(`prop${i}:string`);
      }
      headers.push(":LABEL");

      const startTime = performance.now();
      const header = NodeFileHeader.of(headers, ["TestNode"]);
      const parseTime = performance.now() - startTime;

      console.log(`  Parse time: ${parseTime.toFixed(3)}ms`);
      console.log(`  Properties parsed: ${header.propertyMappings().length}`);
      console.log(
        `  Memory efficiency: ${(
          (header.propertyMappings().length / parseTime) *
          1000
        ).toFixed(0)} props/sec`
      );

      // Test label copying (immutability)
      const labels1 = header.nodeLabels();
      const labels2 = header.nodeLabels();
      console.log(
        `  Label immutability: ${
          labels1 !== labels2 ? "✅ Safe copies" : "⚠️ Same reference"
        }`
      );
    });

    // ▶️ CLICK -> Analyze performance characteristics!
  });
});
