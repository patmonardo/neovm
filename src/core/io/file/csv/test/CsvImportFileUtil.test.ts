import { CsvImportFileUtil } from "../CsvImportFileUtil";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

describe("CsvImportFileUtil - File Discovery Engine", () => {
  const testDataDir = join(__dirname, "testdata");
  const csvTestDir = join(testDataDir, "csv_discovery");

  // Setup test directory structure
  beforeAll(() => {
    if (!existsSync(csvTestDir)) {
      mkdirSync(csvTestDir, { recursive: true });
    }
    createTestCsvStructure();
  });

  it("🔍 File Discovery Patterns", () => {
    console.log("🔍 === FILE DISCOVERY PATTERNS ===");

    console.log("📁 Test directory:", csvTestDir);

    // Test node header file discovery
    const nodeHeaderFiles = CsvImportFileUtil.getNodeHeaderFiles(csvTestDir);
    console.log("\n🏷️ Node header files discovered:");
    nodeHeaderFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // Test relationship header file discovery
    const relationshipHeaderFiles = CsvImportFileUtil.getRelationshipHeaderFiles(csvTestDir);
    console.log("\n🔗 Relationship header files discovered:");
    relationshipHeaderFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // Test graph property header file discovery
    const graphPropertyHeaderFiles = CsvImportFileUtil.getGraphPropertyHeaderFiles(csvTestDir);
    console.log("\n📊 Graph property header files discovered:");
    graphPropertyHeaderFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // ▶️ CLICK -> Discover all CSV file types!
  });

  it("🧠 Node Label Inference Magic", () => {
    console.log("🧠 === NODE LABEL INFERENCE MAGIC ===");

    const nodeFileExamples = [
      "nodes_Person_header.csv",
      "nodes_Company_Organization_header.csv",
      "nodes_Product_header.csv",
      "nodes_User_Admin_header.csv",
      "nodes_header.csv", // No labels
      "nodes_Employee_Manager_Director_header.csv", // Multiple labels
    ];

    nodeFileExamples.forEach((fileName, index) => {
      console.log(`\n📄 File ${index + 1}: ${fileName}`);

      const inferredLabels = CsvImportFileUtil.inferNodeLabelsFromFileName(fileName);
      console.log(
        "  Inferred labels:",
        inferredLabels.length > 0 ? inferredLabels : ["ALL_NODES (no labels)"]
      );

      // Show the parsing logic
      const withoutPrefix = fileName.replace(/^nodes_/, "");
      const withoutSuffix = withoutPrefix.replace(/_?header\.csv$/, "");
      const splitLabels = withoutSuffix.split("_");

      console.log("  Parsing steps:");
      console.log(`    Remove prefix: "${withoutPrefix}"`);
      console.log(`    Remove suffix: "${withoutSuffix}"`);
      console.log(`    Split by '_': ${JSON.stringify(splitLabels)}`);
    });

    // ▶️ CLICK -> See label inference in action!
  });

  it("🔗 Relationship Type Inference", () => {
    console.log("🔗 === RELATIONSHIP TYPE INFERENCE ===");

    const relationshipFiles = [
      "relationships_FRIENDS_header.csv",
      "relationships_WORKS_FOR_header.csv",
      "relationships_KNOWS_header.csv",
      "relationships_BOUGHT_header.csv",
      "relationships_MANAGES_header.csv",
    ];

    relationshipFiles.forEach((fileName, index) => {
      console.log(`\n🔗 File ${index + 1}: ${fileName}`);

      // Show the relationship type extraction logic
      const typeFromName = fileName.replace(/relationships_|_header\.csv/g, "");
      console.log("  Inferred relationship type:", typeFromName);

      console.log("  Parsing logic:");
      console.log(`    Original: "${fileName}"`);
      console.log(`    Remove 'relationships_': "${fileName.replace(/relationships_/, "")}"`);
      console.log(`    Remove '_header.csv': "${typeFromName}"`);
    });

    // ▶️ CLICK -> Understand relationship type parsing!
  });

  it("🗂️ Header to Data File Mapping", () => {
    console.log("🗂️ === HEADER TO DATA FILE MAPPING ===");

    // This is the core functionality - mapping header files to their data files
    const nodeMapping = CsvImportFileUtil.nodeHeaderToFileMapping(csvTestDir);

    console.log("📊 Node header → data file mappings:");
    nodeMapping.forEach((dataFiles, headerFile) => {
      console.log(`\n📄 Header: ${headerFile}`);
      console.log("  Data files:");
      dataFiles.forEach((dataFile, index) => {
        console.log(`    ${index + 1}. ${dataFile}`);
      });
      if (dataFiles.length === 0) {
        console.log("    (No data files found)");
      }
    });

    const relationshipMapping = CsvImportFileUtil.relationshipHeaderToFileMapping(csvTestDir);

    console.log("\n🔗 Relationship header → data file mappings:");
    relationshipMapping.forEach((dataFiles, headerFile) => {
      console.log(`\n📄 Header: ${headerFile}`);
      console.log("  Data files:");
      dataFiles.forEach((dataFile, index) => {
        console.log(`    ${index + 1}. ${dataFile}`);
      });
      if (dataFiles.length === 0) {
        console.log("    (No data files found)");
      }
    });

    // ▶️ CLICK -> See header-to-data mapping!
  });

  it("📋 Header Parsing with Real Files", () => {
    console.log("📋 === HEADER PARSING WITH REAL FILES ===");

    // Test parsing actual header files
    const headerTests = [
      {
        fileName: "nodes_Person_header.csv",
        content: ":ID,name:string,age:long,email:string,:LABEL",
      },
      {
        fileName: "relationships_FRIENDS_header.csv",
        content: ":START_ID,:END_ID,:TYPE,since:string,strength:double",
      },
    ];

    headerTests.forEach((test, index) => {
      console.log(`\n📄 Test ${index + 1}: ${test.fileName}`);
      console.log("  Content:", test.content);

      const headerFilePath = join(csvTestDir, test.fileName);

      try {
        if (test.fileName.includes("nodes_")) {
          // Test node header parsing
          const nodeHeader = CsvImportFileUtil.parseNodeHeader(
            headerFilePath,
            (label) => label // Identity mapping for now
          );

          console.log("  ✅ Node header parsed successfully");
          console.log("  📊 Node labels:", nodeHeader.nodeLabels());
          console.log("  📊 Property mappings:", nodeHeader.propertyMappings().length);
        } else if (test.fileName.includes("relationships_")) {
          // Test relationship header parsing
          const relationshipHeader = CsvImportFileUtil.parseRelationshipHeader(
            headerFilePath,
            (type) => type // Identity mapping for now
          );

          console.log("  ✅ Relationship header parsed successfully");
          console.log("  📊 Relationship type:", relationshipHeader.relationshipType());
          console.log("  📊 Property mappings:", relationshipHeader.propertyMappings().length);
        }
      } catch (error) {
        console.log("  ❌ Header parsing failed:", (error as Error).message);
      }
    });

    // ▶️ CLICK -> Parse real header files!
  });

  it("🎯 Advanced File Pattern Matching", () => {
    console.log("🎯 === ADVANCED FILE PATTERN MATCHING ===");

    // Show the regex patterns used for file discovery
    const patterns = [
      { name: "Node files", regex: /^nodes(_\w+)*_header\.csv$/ },
      { name: "Relationship files", regex: /^relationships(_\w+)+_header\.csv$/ },
      { name: "Graph property files", regex: /^graph_property(_\w+)+_header\.csv$/ },
    ];

    patterns.forEach((pattern, index) => {
      console.log(`\n🔍 Pattern ${index + 1}: ${pattern.name}`);
      console.log("  Regex:", pattern.regex.toString());

      // Test various file names against the pattern
      const testFileNames = [
        "nodes_Person_header.csv",
        "nodes_header.csv",
        "relationships_FRIENDS_header.csv",
        "graph_property_meta_header.csv",
        "users.csv", // Should not match
        "nodes_Person.csv", // Should not match (no _header)
        "random_file.txt", // Should not match
      ];

      console.log("  Matches:");
      testFileNames.forEach((fileName) => {
        const matches = pattern.regex.test(fileName);
        console.log(`    ${fileName}: ${matches ? "✅" : "❌"}`);
      });
    });

    // ▶️ CLICK -> Test pattern matching!
  });

  it("📁 Directory Structure Analysis", () => {
    console.log("📁 === DIRECTORY STRUCTURE ANALYSIS ===");

    // Show what a typical CSV import directory looks like
    console.log("📊 Typical CSV import directory structure:");
    console.log("  csv_import/");
    console.log("  ├── nodes_Person_header.csv");
    console.log("  ├── nodes_Person_1.csv");
    console.log("  ├── nodes_Person_2.csv");
    console.log("  ├── nodes_Company_header.csv");
    console.log("  ├── nodes_Company_1.csv");
    console.log("  ├── relationships_FRIENDS_header.csv");
    console.log("  ├── relationships_FRIENDS_1.csv");
    console.log("  ├── relationships_WORKS_FOR_header.csv");
    console.log("  └── relationships_WORKS_FOR_1.csv");

    console.log("\n🎯 File naming conventions:");
    console.log("  Header files: {type}_{labels/name}_header.csv");
    console.log("  Data files: {type}_{labels/name}_{number}.csv");
    console.log("  Multiple data files per header = batch processing");

    console.log("\n💡 Discovery algorithm:");
    console.log("  1. Find all *_header.csv files");
    console.log("  2. Extract labels/types from filename");
    console.log("  3. Find matching data files using pattern replacement");
    console.log("  4. Map header → [data_file_1, data_file_2, ...]");

    // ▶️ CLICK -> Understand directory conventions!
  });

  // Helper function to create test CSV structure
  function createTestCsvStructure() {
    const testFiles = [
      // Node header files
      { name: "nodes_Person_header.csv", content: ":ID,name:string,age:long,email:string,:LABEL" },
      { name: "nodes_Company_header.csv", content: ":ID,name:string,industry:string,employees:long,:LABEL" },
      { name: "nodes_Product_header.csv", content: ":ID,title:string,price:double,category:string,:LABEL" },

      // Node data files
      { name: "nodes_Person_1.csv", content: "user_001,Alice,28,alice@example.com,Person" },
      { name: "nodes_Person_2.csv", content: "user_002,Bob,34,bob@example.com,Person" },
      { name: "nodes_Company_1.csv", content: "comp_001,TechCorp,Software,1500,Company" },
      { name: "nodes_Product_1.csv", content: "prod_001,Laptop,1299.99,Electronics,Product" },

      // Relationship header files
      { name: "relationships_FRIENDS_header.csv", content: ":START_ID,:END_ID,:TYPE,since:string,strength:double" },
      { name: "relationships_WORKS_FOR_header.csv", content: ":START_ID,:END_ID,:TYPE,position:string,salary:double" },

      // Relationship data files
      { name: "relationships_FRIENDS_1.csv", content: "user_001,user_002,FRIENDS,2020-01-15,0.8" },
      { name: "relationships_WORKS_FOR_1.csv", content: "user_001,comp_001,WORKS_FOR,Developer,95000.00" },
    ];

    testFiles.forEach((file) => {
      writeFileSync(join(csvTestDir, file.name), file.content);
    });

    console.log(`✅ Created ${testFiles.length} test CSV files in ${csvTestDir}`);
  }
});
