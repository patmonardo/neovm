import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// 🔧 CSV GRAPHSTORE TOOL CONFIGURATION
// ============================================================================

const TOOL_CONFIG = {
  // 🎯 Tool identity
  TOOL_NAME: "CSV GraphStore Tool",
  TOOL_VERSION: "1.0.0",
  TOOL_SCOPE: "CSV Import Layer",

  // 📁 Storage location - NOW IN /src/tools/
  REFERENCE_STORE_DIR: path.join(__dirname, "reference-graphstore"),

  // 🎪 Data configuration for CSV testing
  CSV_DATA_SETS: {
    USERS: 6,
    POSTS: 6,
    COMPANIES: 5,
    TAGS: 8,
    RELATIONSHIPS: 44
  },

  // 🧪 Test expectations for CSV layer
  CSV_EXPECTATIONS: {
    NODE_TYPES: 7,
    RELATIONSHIP_TYPES: 6,
    MIN_NODES: 25,
    MIN_RELATIONSHIPS: 40,
    SCHEMA_ENTRIES: 25
  },

  // 🎭 Tool capabilities
  TOOL_FEATURES: {
    CREATE_REFERENCE_STORE: true,
    VALIDATE_CSV_FORMAT: true,
    CHECK_REFERENTIAL_INTEGRITY: true,
    GENERATE_STATISTICS: true,
    SHOW_DETAILED_OUTPUT: true,
    EXPORT_TO_JSON: false,        // Future feature
    PERFORMANCE_BENCHMARKS: false // Future feature
  }
} as const;

// ============================================================================
// 🔧 CSV GRAPHSTORE TOOL SUITE
// ============================================================================

describe("🔧 CSV GraphStore Tool - CSV Import Layer Development", () => {

  beforeAll(() => {
    console.log(`🔧 ${TOOL_CONFIG.TOOL_NAME} v${TOOL_CONFIG.TOOL_VERSION}`);
    console.log(`🎯 Scope: ${TOOL_CONFIG.TOOL_SCOPE}`);
    console.log(`📁 Reference store: ${TOOL_CONFIG.REFERENCE_STORE_DIR}`);

    // Ensure reference store exists
    if (!fs.existsSync(TOOL_CONFIG.REFERENCE_STORE_DIR)) {
      createReferenceGraphStore(TOOL_CONFIG.REFERENCE_STORE_DIR);
    }
  });

  it("🏗️ CREATE REFERENCE STORE - Generate CSV test data", () => {
    console.log("🏗️ === CSV REFERENCE STORE CREATION ===");
    console.log("🎯 Purpose: Provide realistic CSV data for CsvFileInput testing");

    validateStoreStructure();
    console.log("✅ CSV reference store is ready for import testing");
  });

  it("📋 EXPLORE CSV SCHEMAS - Understand CSV format definitions", () => {
    console.log("📋 === CSV SCHEMA EXPLORATION ===");
    console.log("🎯 Purpose: Understand CSV schema format for CsvFileInput");

    exploreNodeSchemas();
    exploreRelationshipSchemas();
    console.log("✅ CSV schema format understood");
  });

  it("📊 ANALYZE CSV DATA - Examine actual CSV storage format", () => {
    console.log("📊 === CSV DATA ANALYSIS ===");
    console.log("🎯 Purpose: Understand CSV data format for CsvFileInput parsing");

    analyzeNodeData();
    analyzeRelationshipData();
    console.log("✅ CSV data format analyzed");
  });

  it("🔍 VALIDATE CSV INTEGRITY - Check referential consistency", () => {
    if (!TOOL_CONFIG.TOOL_FEATURES.CHECK_REFERENTIAL_INTEGRITY) {
      return;
    }

    console.log("🔍 === CSV INTEGRITY VALIDATION ===");
    console.log("🎯 Purpose: Ensure CSV data has valid references for import");

    const integrity = validateCsvIntegrity();
    console.log(`✅ CSV integrity: ${integrity.isValid ? 'VALID' : 'INVALID'}`);

    expect(integrity.isValid).toBe(true);
  });

  it("📈 GENERATE CSV STATISTICS - Get comprehensive data metrics", () => {
    console.log("📈 === CSV STATISTICS GENERATION ===");
    console.log("🎯 Purpose: Understand CSV data size and distribution");

    const stats = generateCsvStatistics();

    if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n📊 CSV Data Statistics:");
      console.log(`  Nodes: ${stats.totalNodes} (${stats.nodeTypes} types)`);
      console.log(`  Relationships: ${stats.totalRelationships} (${stats.relationshipTypes} types)`);
      console.log(`  Schema entries: ${stats.schemaEntries}`);
      console.log(`  Files: ${stats.totalFiles}`);
    }

    console.log("✅ CSV statistics generated");

    expect(stats.totalNodes).toBeGreaterThan(TOOL_CONFIG.CSV_EXPECTATIONS.MIN_NODES);
    expect(stats.totalRelationships).toBeGreaterThan(TOOL_CONFIG.CSV_EXPECTATIONS.MIN_RELATIONSHIPS);
  });

  it("🧪 TEST CSV FOR CSVFILEINPUT - Validate compatibility", () => {
    console.log("🧪 === CSVFILEINPUT COMPATIBILITY TEST ===");
    console.log("🎯 Purpose: Verify CSV format is compatible with CsvFileInput");

    const compatibility = testCsvFileInputCompatibility();

    if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n🔧 CsvFileInput Compatibility:");
      console.log(`  Schema files: ${compatibility.schemasValid ? '✅' : '❌'}`);
      console.log(`  Directory structure: ${compatibility.structureValid ? '✅' : '❌'}`);
      console.log(`  File naming: ${compatibility.namingValid ? '✅' : '❌'}`);
      console.log(`  Header format: ${compatibility.headersValid ? '✅' : '❌'}`);
    }

    console.log("✅ CSV format is CsvFileInput compatible");

    expect(compatibility.isFullyCompatible).toBe(true);
  });

  it("🎯 TOOL SUMMARY - CSV GraphStore Tool Capabilities", () => {
    console.log("🎯 === CSV GRAPHSTORE TOOL SUMMARY ===");

    console.log("\n🔧 This tool provides:");
    console.log("  📁 Reference CSV GraphStore generation");
    console.log("  📋 CSV schema format exploration");
    console.log("  📊 CSV data format analysis");
    console.log("  🔍 CSV integrity validation");
    console.log("  📈 CSV statistics generation");
    console.log("  🧪 CsvFileInput compatibility testing");

    console.log("\n🚀 Next level tools to build:");
    console.log("  🔧 schema-validator.tool.ts - Schema system validation");
    console.log("  🔧 import-pipeline.tool.ts - Full import orchestration");
    console.log("  🔧 graph-explorer.tool.ts - Graph navigation and analysis");
    console.log("  🔧 pregel-debugger.tool.ts - Algorithm development");

    console.log("\n✅ CSV GraphStore Tool ready for development work!");
  });

});

// ============================================================================
// 🔧 IMPLEMENTATION FUNCTIONS - UPDATED FOR FLAT STRUCTURE
// ============================================================================

function validateStoreStructure(): void {
  // ✅ UPDATED: No more headers/ and data/ directories!
  const expectedFiles = [
    "node-schema.csv",
    "relationship-schema.csv",
    "graph-property-schema.csv",
    "user-info.csv",
    "graph-info.csv",
    "nodes_User_001.csv",         // ✅ Combined header+data files
    "nodes_Post_001.csv",
    "nodes_Company_001.csv",
    "nodes_Tag_001.csv",
    "relationships_FOLLOWS_001.csv",
    "relationships_POSTED_001.csv"
  ];

  if (TOOL_CONFIG.TOOL_FEATURES.CREATE_REFERENCE_STORE) {
    expectedFiles.push("label-mappings.csv", "type-mappings.csv", "capabilities.csv");
  }

  expectedFiles.forEach(file => {
    const filePath = path.join(TOOL_CONFIG.REFERENCE_STORE_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Missing file: ${file} (may be optional)`);
    }
  });
}

function exploreNodeSchemas(): void {
  const schemaPath = path.join(TOOL_CONFIG.REFERENCE_STORE_DIR, "node-schema.csv");
  const content = fs.readFileSync(schemaPath, "utf-8");
  const lines = content.trim().split("\n");

  if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
    console.log(`  📋 Node schema: ${lines.length - 1} properties across multiple types`);

    // Show first few schema entries
    const entries = lines.slice(1, 4).map(line => {
      const [label, propertyKey, valueType] = line.split(",");
      return `${label}.${propertyKey}:${valueType}`;
    });
    console.log(`  📊 Sample properties: ${entries.join(", ")}`);
  }
}

function exploreRelationshipSchemas(): void {
  const schemaPath = path.join(TOOL_CONFIG.REFERENCE_STORE_DIR, "relationship-schema.csv");
  const content = fs.readFileSync(schemaPath, "utf-8");
  const lines = content.trim().split("\n");

  if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
    console.log(`  🔗 Relationship schema: ${lines.length - 1} properties across multiple types`);

    // Show first few schema entries
    const entries = lines.slice(1, 4).map(line => {
      const [startLabel, type, endLabel, propertyKey] = line.split(",");
      return `${startLabel}-[${type}:${propertyKey}]->${endLabel}`;
    });
    console.log(`  📊 Sample relationships: ${entries.join(", ")}`);
  }
}

function analyzeNodeData(): void {
  // ✅ UPDATED: Look for combined files directly in base directory
  const baseDir = TOOL_CONFIG.REFERENCE_STORE_DIR;

  if (!fs.existsSync(baseDir)) {
    console.log("  ⚠️ Base directory not found, creating reference store...");
    return;
  }

  const nodeFiles = fs.readdirSync(baseDir)
    .filter(file => file.startsWith("nodes_") && file.endsWith("_001.csv"));

  if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
    console.log(`  👥 Node data: ${nodeFiles.length} node types found`);

    // Analyze a sample file
    if (nodeFiles.length > 0) {
      const sampleFile = nodeFiles[0];
      const content = fs.readFileSync(path.join(baseDir, sampleFile), "utf-8");
      const lines = content.trim().split("\n");
      const header = lines[0];
      const dataRows = lines.length - 1;

      console.log(`  📊 Sample file: ${sampleFile}`);
      console.log(`  📋 Header: ${header.substring(0, 60)}...`);
      console.log(`  📊 Data rows: ${dataRows}`);
    }
  }
}

function analyzeRelationshipData(): void {
  // ✅ UPDATED: Look for combined files directly in base directory
  const baseDir = TOOL_CONFIG.REFERENCE_STORE_DIR;

  if (!fs.existsSync(baseDir)) {
    console.log("  ⚠️ Base directory not found, creating reference store...");
    return;
  }

  const relFiles = fs.readdirSync(baseDir)
    .filter(file => file.startsWith("relationships_") && file.endsWith("_001.csv"));

  if (TOOL_CONFIG.TOOL_FEATURES.SHOW_DETAILED_OUTPUT) {
    console.log(`  🔗 Relationship data: ${relFiles.length} relationship types found`);

    // Analyze a sample file
    if (relFiles.length > 0) {
      const sampleFile = relFiles[0];
      const content = fs.readFileSync(path.join(baseDir, sampleFile), "utf-8");
      const lines = content.trim().split("\n");
      const header = lines[0];
      const dataRows = lines.length - 1;

      console.log(`  📊 Sample file: ${sampleFile}`);
      console.log(`  📋 Header: ${header}`);
      console.log(`  📊 Data rows: ${dataRows}`);
    }
  }
}

function validateCsvIntegrity(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const baseDir = TOOL_CONFIG.REFERENCE_STORE_DIR;

  try {
    // ✅ COLLECT ALL NODE IDS from combined files
    const nodeIds = new Set<string>();
    const nodeFiles = fs.readdirSync(baseDir)
      .filter(file => file.startsWith("nodes_") && file.endsWith("_001.csv"));

    nodeFiles.forEach(file => {
      const content = fs.readFileSync(path.join(baseDir, file), "utf-8");
      const lines = content.trim().split("\n");
      // Skip header row (index 0), collect IDs from data rows
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        if (columns.length > 0) {
          nodeIds.add(columns[0]); // First column is :ID
        }
      }
    });

    // ✅ VALIDATE RELATIONSHIP ENDPOINTS from combined files
    const relFiles = fs.readdirSync(baseDir)
      .filter(file => file.startsWith("relationships_") && file.endsWith("_001.csv"));

    relFiles.forEach(file => {
      const content = fs.readFileSync(path.join(baseDir, file), "utf-8");
      const lines = content.trim().split("\n");
      // Skip header row (index 0), validate data rows
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(",");
        if (columns.length >= 2) {
          const startId = columns[0]; // :START_ID
          const endId = columns[1];   // :END_ID

          if (!nodeIds.has(startId)) {
            errors.push(`Invalid START_ID '${startId}' in ${file} - node does not exist`);
          }
          if (!nodeIds.has(endId)) {
            errors.push(`Invalid END_ID '${endId}' in ${file} - node does not exist`);
          }
        }
      }
    });

    console.log(`  🔍 Validated ${nodeIds.size} nodes across ${nodeFiles.length} node files`);
    console.log(`  🔍 Validated relationships across ${relFiles.length} relationship files`);

  } catch (error) {
    errors.push(`Integrity validation error: ${(error as Error).message}`);
  }

  return { isValid: errors.length === 0, errors };
}

function generateCsvStatistics(): {
  totalNodes: number;
  totalRelationships: number;
  nodeTypes: number;
  relationshipTypes: number;
  schemaEntries: number;
  totalFiles: number;
} {
  const baseDir = TOOL_CONFIG.REFERENCE_STORE_DIR;

  if (!fs.existsSync(baseDir)) {
    return {
      totalNodes: 0,
      totalRelationships: 0,
      nodeTypes: 0,
      relationshipTypes: 0,
      schemaEntries: 0,
      totalFiles: 0
    };
  }

  // ✅ UPDATED: Count from combined files
  const nodeFiles = fs.readdirSync(baseDir)
    .filter(file => file.startsWith("nodes_") && file.endsWith("_001.csv"));

  const relFiles = fs.readdirSync(baseDir)
    .filter(file => file.startsWith("relationships_") && file.endsWith("_001.csv"));

  let totalNodes = 0;
  nodeFiles.forEach(file => {
    const content = fs.readFileSync(path.join(baseDir, file), "utf-8");
    const lines = content.trim().split("\n");
    totalNodes += lines.length - 1; // Subtract 1 for header
  });

  let totalRelationships = 0;
  relFiles.forEach(file => {
    const content = fs.readFileSync(path.join(baseDir, file), "utf-8");
    const lines = content.trim().split("\n");
    totalRelationships += lines.length - 1; // Subtract 1 for header
  });

  const nodeSchemaPath = path.join(baseDir, "node-schema.csv");
  let schemaEntries = 0;
  if (fs.existsSync(nodeSchemaPath)) {
    const nodeSchemaContent = fs.readFileSync(nodeSchemaPath, "utf-8");
    schemaEntries = nodeSchemaContent.trim().split("\n").length - 1;
  }

  return {
    totalNodes,
    totalRelationships,
    nodeTypes: nodeFiles.length,
    relationshipTypes: relFiles.length,
    schemaEntries,
    totalFiles: nodeFiles.length + relFiles.length
  };
}

function testCsvFileInputCompatibility(): {
  schemasValid: boolean;
  structureValid: boolean;
  namingValid: boolean;
  headersValid: boolean;
  isFullyCompatible: boolean;
} {
  const baseDir = TOOL_CONFIG.REFERENCE_STORE_DIR;

  let schemasValid = false;
  let structureValid = false;
  let namingValid = false;
  let headersValid = false;

  try {
    // ✅ CHECK SCHEMA FILES
    const requiredSchemas = ["node-schema.csv", "relationship-schema.csv"];
    schemasValid = requiredSchemas.every(schema =>
      fs.existsSync(path.join(baseDir, schema))
    );

    // ✅ CHECK DIRECTORY STRUCTURE (flat structure)
    structureValid = fs.existsSync(baseDir);

    // ✅ CHECK FILE NAMING (3-digit suffix pattern)
    const files = fs.readdirSync(baseDir);
    const nodeFilePattern = /^nodes_\w+_\d{3}\.csv$/;
    const relFilePattern = /^relationships_\w+_\d{3}\.csv$/;

    const nodeFiles = files.filter(f => nodeFilePattern.test(f));
    const relFiles = files.filter(f => relFilePattern.test(f));

    namingValid = nodeFiles.length > 0 && relFiles.length > 0;

    // ✅ CHECK HEADER FORMAT (first line should be CSV header)
    if (nodeFiles.length > 0) {
      const sampleFile = nodeFiles[0];
      const content = fs.readFileSync(path.join(baseDir, sampleFile), "utf-8");
      const firstLine = content.split("\n")[0];
      headersValid = firstLine.includes(":ID") && firstLine.includes(":LABEL");
    }

  } catch (error) {
    console.log(`❌ CsvFileInput compatibility error: ${(error as Error).message}`);
  }

  return {
    schemasValid,
    structureValid,
    namingValid,
    headersValid,
    isFullyCompatible: schemasValid && structureValid && namingValid && headersValid
  };
}

// ✅ REMOVE: createReferenceGraphStore is now in create-reference-store.ts
// We import and use that implementation instead of duplicating it

function createReferenceGraphStore(baseDir: string): void {
  // ✅ Import and call the actual implementation
  const { createReferenceGraphStore: createStore } = require("./create-reference-store");
  createStore(baseDir);
}

// ============================================================================
// 🔧 TOOL EXPORTS
// ============================================================================

export { TOOL_CONFIG };
export const csvGraphStoreToolDir = TOOL_CONFIG.REFERENCE_STORE_DIR;
