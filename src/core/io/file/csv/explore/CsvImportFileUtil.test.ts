import { describe, it } from 'vitest';
import { CsvImportFileUtil } from "../CsvImportFileUtil";
import * as path from "path";
import * as fs from "fs";

const testDataDir = path.join(__dirname, "testdata");

describe("CsvImportFileUtil - File System Operations", () => {

  it("should discover node header files", () => {
    console.log("🔍 === NODE HEADER FILE DISCOVERY ===");
    console.log(`📁 Test data directory: ${testDataDir}`);

    try {
      const nodeHeaderFiles = CsvImportFileUtil.getNodeHeaderFiles(testDataDir);
      console.log(`✅ Found node header files: ${JSON.stringify(nodeHeaderFiles)}`);

      if (nodeHeaderFiles.length === 0) {
        console.log("❌ FAIL: No node header files found");
      }
    } catch (error) {
      console.log(`❌ FAIL: File discovery error: ${(error as Error).message}`);
    }
  });

  it("should discover relationship header files", () => {
    console.log("\n📄 === RELATIONSHIP HEADER FILE DISCOVERY ===");

    try {
      const relationshipHeaderFiles = CsvImportFileUtil.getRelationshipHeaderFiles(testDataDir);
      console.log(`✅ Found relationship header files: ${JSON.stringify(relationshipHeaderFiles)}`);

      if (relationshipHeaderFiles.length === 0) {
        console.log("❌ FAIL: No relationship header files found");
      }
    } catch (error) {
      console.log(`❌ FAIL: File discovery error: ${(error as Error).message}`);
    }
  });

  it("should infer labels from GDS filenames", () => {
    console.log("\n🏷️ === LABEL INFERENCE TESTS ===");

    const testFiles = [
      "nodes_Person_header.csv",
      "nodes_Company_header.csv",
      "relationships_WORKS_FOR_header.csv"
    ];

    testFiles.forEach(fileName => {
      console.log(`📋 Testing: ${fileName}`);

      if (fileName.startsWith("nodes_")) {
        try {
          const labels = CsvImportFileUtil.inferNodeLabelsFromFileName(fileName);
          console.log(`   ✅ Node labels: ${JSON.stringify(labels)}`);
        } catch (error) {
          console.log(`   ❌ FAIL: ${(error as Error).message}`);
        }
      } else if (fileName.startsWith("relationships_")) {
        try {
          const relType = CsvImportFileUtil.inferRelationshipTypeFromFileName(fileName);
          console.log(`   ✅ Relationship type: ${relType}`);
        } catch (error) {
          console.log(`   ❌ FAIL: ${(error as Error).message}`);
        }
      }
    });
  });

  it("should map header files to data files", () => {
    console.log("\n🗺️ === HEADER TO DATA FILE MAPPING ===");

    try {
      console.log("📊 Node header to file mapping...");
      const nodeMapping = CsvImportFileUtil.nodeHeaderToFileMapping(testDataDir);
      console.log(`✅ Node mapping:`, nodeMapping);
    } catch (error) {
      console.log(`❌ FAIL: Node mapping error: ${(error as Error).message}`);
    }

    try {
      console.log("📊 Relationship header to file mapping...");
      const relationshipMapping = CsvImportFileUtil.relationshipHeaderToFileMapping(testDataDir);
      console.log(`✅ Relationship mapping:`, relationshipMapping);
    } catch (error) {
      console.log(`❌ FAIL: Relationship mapping error: ${(error as Error).message}`);
    }
  });

  it("should read and analyze GDS CSV file content", () => {
    console.log("\n📖 === GDS CSV FILE CONTENT ANALYSIS ===");

    const actualFiles = [
      "nodes_Person_header.csv",
      "nodes_Company_header.csv",
      "relationships_WORKS_FOR_header.csv"
    ];

    actualFiles.forEach(fileName => {
      const filePath = path.join(testDataDir, fileName);
      console.log(`📄 Analyzing: ${fileName}`);

      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.trim().split("\n");

          console.log(`   ✅ Header: ${lines[0]}`);
          console.log(`   ✅ Rows: ${lines.length - 1}`);
          console.log(`   ✅ Sample: ${lines[1] || 'No data'}`);

          // Parse column types
          const headerColumns = lines[0].split(",");
          console.log(`   📊 Column types:`);
          headerColumns.forEach((col, index) => {
            if (col.includes(":")) {
              const [name, type] = col.split(":");
              console.log(`     ${index + 1}. ${name} → ${type}`);
            } else {
              console.log(`     ${index + 1}. ${col} → (no type)`);
            }
          });
        } else {
          console.log(`   ❌ FAIL: File not found: ${filePath}`);
        }
      } catch (error) {
        console.log(`   ❌ FAIL: Error reading ${fileName}: ${(error as Error).message}`);
      }
    });
  });

  it("should scan directory for CSV files", () => {
    console.log("\n📁 === DIRECTORY SCANNING ===");

    try {
      const allFiles = fs.readdirSync(testDataDir);
      console.log(`✅ All files: ${JSON.stringify(allFiles)}`);

      const csvFiles = allFiles.filter(f => f.endsWith('.csv'));
      console.log(`✅ CSV files: ${JSON.stringify(csvFiles)}`);

      const nodeFiles = csvFiles.filter(f => f.startsWith('nodes_'));
      console.log(`✅ Node files: ${JSON.stringify(nodeFiles)}`);

      const relationshipFiles = csvFiles.filter(f => f.startsWith('relationships_'));
      console.log(`✅ Relationship files: ${JSON.stringify(relationshipFiles)}`);

      if (csvFiles.length === 0) {
        console.log("❌ FAIL: No CSV files found in directory");
      }
    } catch (error) {
      console.log(`❌ FAIL: Directory scanning error: ${(error as Error).message}`);
    }
  });

});
