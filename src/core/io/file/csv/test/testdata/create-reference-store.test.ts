import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// 🎯 CONFIGURATION - Control everything from here!
// ============================================================================

/**
 * 📁 REFERENCE STORE CONFIGURATION
 *
 * Control where your reference GraphStore gets created and what it contains.
 * Change these settings to customize the test data for your needs.
 */
const CONFIG = {
  // 📁 Storage location - modify this to control where reference store goes
  REFERENCE_STORE_DIR: path.join(__dirname, "reference-graphstore"),

  // 🎪 Data configuration
  DATA_SETS: {
    USERS: 6,
    POSTS: 6,
    COMPANIES: 5,
    TAGS: 8,
    RELATIONSHIPS: 32
  },

  // 🧪 Test expectations
  EXPECTED: {
    NODE_TYPES: 4,
    RELATIONSHIP_TYPES: 5,
    MIN_NODES: 15,
    MIN_RELATIONSHIPS: 25,
    SCHEMA_ENTRIES: 15
  },

  // 🎭 Feature flags
  FEATURES: {
    CREATE_MAPPINGS: true,
    CREATE_CAPABILITIES: true,
    VALIDATE_INTEGRITY: true,
    SHOW_DETAILED_OUTPUT: true
  }
} as const;

// ============================================================================
// 🧩 MAIN REFERENCE STORE CREATION FUNCTION
// ============================================================================

/**
 * Creates a complete, realistic CSV GraphStore for testing.
 * This is our "ground truth" - a working CSV representation of a graph
 * that all our tests can use without recreating test data every time.
 */
function createReferenceGraphStore(baseDir: string): void {
  console.log(`🏗️ Creating Reference CSV GraphStore at: ${baseDir}`);

  // Ensure base directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  // Create subdirectories
  const headersDir = path.join(baseDir, "headers");
  const dataDir = path.join(baseDir, "data");
  fs.mkdirSync(headersDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  // Create all components
  createSchemaFiles(baseDir);
  createNodeFiles(headersDir, dataDir);
  createRelationshipFiles(headersDir, dataDir);
  createGraphPropertyFiles(headersDir, dataDir);

  if (CONFIG.FEATURES.CREATE_MAPPINGS) {
    createMappingFiles(baseDir);
  }

  createMetadataFiles(baseDir);

  console.log("✅ Reference CSV GraphStore created successfully!");
}

// ============================================================================
// 🎪 NOTEBOOK TEST SUITE - Interactive Documentation
// ============================================================================

/**
 * 📚 REFERENCE GRAPHSTORE NOTEBOOK
 *
 * This is our first "notebook test" - interactive documentation that shows
 * exactly how the reference store is structured and what it contains.
 *
 * Each test block explores a different aspect of the CSV GraphStore format,
 * making this both validation AND learning material.
 */
describe("📚 Reference GraphStore Notebook - Interactive Documentation", () => {

  beforeAll(() => {
    console.log(`🎯 Reference store location: ${CONFIG.REFERENCE_STORE_DIR}`);

    // Ensure reference store exists
    if (!fs.existsSync(CONFIG.REFERENCE_STORE_DIR)) {
      createReferenceGraphStore(CONFIG.REFERENCE_STORE_DIR);
    }
  });

  it("🏗️ STORE CREATION - Understanding the Complete Structure", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🏗️ === REFERENCE STORE STRUCTURE EXPLORATION ===");
      console.log(`📁 Base directory: ${CONFIG.REFERENCE_STORE_DIR}`);
    }

    // 🎯 Verify main directory structure
    const expectedDirs = ["headers", "data"];
    const expectedFiles = [
      "node-schema.csv",
      "relationship-schema.csv",
      "graph-property-schema.csv",
      "user-info.csv",
      "graph-info.csv"
    ];

    // Add optional files based on feature flags
    if (CONFIG.FEATURES.CREATE_MAPPINGS) {
      expectedFiles.push("label-mappings.csv", "type-mappings.csv");
    }
    if (CONFIG.FEATURES.CREATE_CAPABILITIES) {
      expectedFiles.push("capabilities.csv");
    }

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n📁 Directory structure:");
      expectedDirs.forEach((dir) => {
        const dirPath = path.join(CONFIG.REFERENCE_STORE_DIR, dir);
        const exists = fs.existsSync(dirPath);
        console.log(`  ${dir}/: ${exists ? "✅" : "❌"}`);
        expect(exists).toBe(true);
      });

      console.log("\n📄 Root files:");
      expectedFiles.forEach((file) => {
        const filePath = path.join(CONFIG.REFERENCE_STORE_DIR, file);
        const exists = fs.existsSync(filePath);
        console.log(`  ${file}: ${exists ? "✅" : "❌"}`);
        expect(exists).toBe(true);
      });

      console.log("\n🎯 Store structure is complete and valid!");
    }

    // Validate structure even without detailed output
    expectedDirs.forEach((dir) => {
      const dirPath = path.join(CONFIG.REFERENCE_STORE_DIR, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });

    expectedFiles.forEach((file) => {
      const filePath = path.join(CONFIG.REFERENCE_STORE_DIR, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it("📋 NODE SCHEMA - Understanding Node Type Definitions", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("📋 === NODE SCHEMA EXPLORATION ===");
    }

    const schemaPath = path.join(CONFIG.REFERENCE_STORE_DIR, "node-schema.csv");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const lines = schemaContent.trim().split("\n");

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log(`📊 Schema file: ${lines.length} lines (including header)`);
      console.log(`📋 Header: ${lines[0]}`);
    }

    // Parse and analyze schema
    const schemaEntries = lines.slice(1).map((line) => {
      const [label, propertyKey, valueType, defaultValue, state] = line.split(",");
      return { label, propertyKey, valueType, defaultValue, state };
    });

    // Group by label
    const schemaByLabel = schemaEntries.reduce((acc, entry) => {
      if (!acc[entry.label]) acc[entry.label] = [];
      acc[entry.label].push(entry);
      return acc;
    }, {} as Record<string, typeof schemaEntries>);

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n🏷️ Node types and their properties:");
      Object.entries(schemaByLabel).forEach(([label, properties]) => {
        console.log(`\n  ${label} (${properties.length} properties):`);
        properties.forEach((prop) => {
          const defaultInfo = prop.defaultValue ? ` [default: ${prop.defaultValue}]` : "";
          console.log(`    • ${prop.propertyKey}: ${prop.valueType}${defaultInfo}`);
        });
      });

      console.log(`\n📊 Total labels: ${Object.keys(schemaByLabel).length}`);
      console.log(`📊 Total properties: ${schemaEntries.length}`);
    }

    expect(Object.keys(schemaByLabel)).toEqual(["User", "Post", "Company", "Tag"]);
    expect(schemaEntries.length).toBeGreaterThan(CONFIG.EXPECTED.SCHEMA_ENTRIES);
  });

  it("🔗 RELATIONSHIP SCHEMA - Understanding Connection Types", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🔗 === RELATIONSHIP SCHEMA EXPLORATION ===");
    }

    const schemaPath = path.join(CONFIG.REFERENCE_STORE_DIR, "relationship-schema.csv");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const lines = schemaContent.trim().split("\n");

    // Parse relationship schema
    const relSchemaEntries = lines.slice(1).map((line) => {
      const [startLabel, type, endLabel, propertyKey, valueType, defaultValue, state] = line.split(",");
      return { startLabel, type, endLabel, propertyKey, valueType, defaultValue, state };
    });

    const relationshipTypes = [...new Set(relSchemaEntries.map((e) => e.type))];

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log(`📊 Schema file: ${lines.length} lines (including header)`);
      console.log(`📊 Unique relationship types: ${relationshipTypes.join(", ")}`);
    }

    expect(relationshipTypes).toEqual(["FOLLOWS", "POSTED", "LIKED", "WORKS_AT", "TAGGED_WITH"]);
  });

  it("🗺️ MAPPING SYSTEM - Understanding Label and Type Indices", () => {
    if (!CONFIG.FEATURES.CREATE_MAPPINGS) {
      return; // Skip if mappings disabled
    }

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🗺️ === MAPPING SYSTEM EXPLORATION ===");
    }

    // Label mappings
    const labelMappingPath = path.join(CONFIG.REFERENCE_STORE_DIR, "label-mappings.csv");
    const labelContent = fs.readFileSync(labelMappingPath, "utf-8");
    const labelLines = labelContent.trim().split("\n");

    const labelMappings = labelLines.slice(1).map((line) => {
      const [index, label] = line.split(",");
      return { index: parseInt(index), label };
    });

    // Type mappings
    const typeMappingPath = path.join(CONFIG.REFERENCE_STORE_DIR, "type-mappings.csv");
    const typeContent = fs.readFileSync(typeMappingPath, "utf-8");
    const typeLines = typeContent.trim().split("\n");

    const typeMappings = typeLines.slice(1).map((line) => {
      const [index, type] = line.split(",");
      return { index: parseInt(index), type };
    });

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n🏷️ Label mappings:");
      labelMappings.forEach((mapping) => {
        console.log(`  Index ${mapping.index} → ${mapping.label}`);
      });

      console.log("\n🔗 Type mappings:");
      typeMappings.forEach((mapping) => {
        console.log(`  Index ${mapping.index} → ${mapping.type}`);
      });

      console.log("\n🎯 Mappings provide efficient integer-based storage!");
    }

    expect(labelMappings.length).toBe(CONFIG.EXPECTED.NODE_TYPES);
    expect(typeMappings.length).toBe(CONFIG.EXPECTED.RELATIONSHIP_TYPES);
  });

  it("👥 NODE DATA - Understanding Entity Storage Format", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("👥 === NODE DATA EXPLORATION ===");
    }

    const headersDir = path.join(CONFIG.REFERENCE_STORE_DIR, "headers");
    const dataDir = path.join(CONFIG.REFERENCE_STORE_DIR, "data");

    // Find all node files
    const nodeHeaderFiles = fs.readdirSync(headersDir)
      .filter((file) => file.startsWith("nodes_") && file.endsWith("_header.csv"));

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log(`📊 Found ${nodeHeaderFiles.length} node types:`);

      nodeHeaderFiles.forEach((headerFile) => {
        const nodeType = headerFile.replace("nodes_", "").replace("_header.csv", "");
        const headerPath = path.join(headersDir, headerFile);
        const dataFile = `nodes_${nodeType}_data.csv`;
        const dataPath = path.join(dataDir, dataFile);

        console.log(`\n🏷️ ${nodeType} nodes:`);

        // Read header
        const headerContent = fs.readFileSync(headerPath, "utf-8").trim();
        console.log(`  📋 Header: ${headerContent}`);

        // Count data rows
        if (fs.existsSync(dataPath)) {
          const dataContent = fs.readFileSync(dataPath, "utf-8");
          const dataLines = dataContent.trim().split("\n");
          console.log(`  📊 Data rows: ${dataLines.length}`);

          // Show first row as example
          if (dataLines.length > 0) {
            console.log(`  📝 Example: ${dataLines[0]}`);
          }
        }
      });
    }

    expect(nodeHeaderFiles.length).toBe(CONFIG.EXPECTED.NODE_TYPES);
  });

  it("🔗 RELATIONSHIP DATA - Understanding Connection Storage", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🔗 === RELATIONSHIP DATA EXPLORATION ===");
    }

    const headersDir = path.join(CONFIG.REFERENCE_STORE_DIR, "headers");
    const dataDir = path.join(CONFIG.REFERENCE_STORE_DIR, "data");

    // Find all relationship files
    const relHeaderFiles = fs.readdirSync(headersDir)
      .filter((file) => file.startsWith("relationships_") && file.endsWith("_header.csv"));

    let totalRelationships = 0;

    relHeaderFiles.forEach((headerFile) => {
      const relType = headerFile.replace("relationships_", "").replace("_header.csv", "");
      const dataFile = `relationships_${relType}_data.csv`;
      const dataPath = path.join(dataDir, dataFile);

      if (fs.existsSync(dataPath)) {
        const dataContent = fs.readFileSync(dataPath, "utf-8");
        const dataLines = dataContent.trim().split("\n");
        totalRelationships += dataLines.length;

        if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
          console.log(`\n🔗 ${relType}: ${dataLines.length} relationships`);
          if (dataLines.length > 0) {
            console.log(`  📝 Example: ${dataLines[0]}`);
          }
        }
      }
    });

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log(`\n📊 Total relationships in store: ${totalRelationships}`);
    }

    expect(relHeaderFiles.length).toBe(CONFIG.EXPECTED.RELATIONSHIP_TYPES);
    expect(totalRelationships).toBeGreaterThan(CONFIG.EXPECTED.MIN_RELATIONSHIPS);
  });

  it("🔍 DATA INTEGRITY - Understanding Referential Consistency", () => {
    if (!CONFIG.FEATURES.VALIDATE_INTEGRITY) {
      return; // Skip if integrity validation disabled
    }

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🔍 === DATA INTEGRITY ANALYSIS ===");
    }

    // Extract all node IDs by type
    const dataDir = path.join(CONFIG.REFERENCE_STORE_DIR, "data");
    const nodeIds = new Set<string>();
    const nodeIdsByType: Record<string, Set<string>> = {};

    // Collect all node IDs
    const nodeDataFiles = fs.readdirSync(dataDir)
      .filter((file) => file.startsWith("nodes_") && file.endsWith("_data.csv"));

    nodeDataFiles.forEach((file) => {
      const nodeType = file.replace("nodes_", "").replace("_data.csv", "");
      nodeIdsByType[nodeType] = new Set();

      const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const lines = content.trim().split("\n");

      lines.forEach((line) => {
        const nodeId = line.split(",")[0]; // First column is always :ID
        nodeIds.add(nodeId);
        nodeIdsByType[nodeType].add(nodeId);
      });
    });

    // Check relationship referential integrity
    const relDataFiles = fs.readdirSync(dataDir)
      .filter((file) => file.startsWith("relationships_") && file.endsWith("_data.csv"));

    let validRelationships = 0;
    let invalidRelationships = 0;

    relDataFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const lines = content.trim().split("\n");

      let validCount = 0;
      let invalidCount = 0;

      lines.forEach((line) => {
        const [startId, endId] = line.split(",");
        if (nodeIds.has(startId) && nodeIds.has(endId)) {
          validCount++;
        } else {
          invalidCount++;
        }
      });

      validRelationships += validCount;
      invalidRelationships += invalidCount;

      if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT && invalidCount > 0) {
        const relType = file.replace("relationships_", "").replace("_data.csv", "");
        console.log(`  ⚠️ ${relType}: ${invalidCount} invalid relationships`);
      }
    });

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log(`\n✅ Reference integrity: ${invalidRelationships === 0 ? "PERFECT" : "ISSUES FOUND"}`);
    }

    expect(invalidRelationships).toBe(0);
    expect(validRelationships).toBeGreaterThan(CONFIG.EXPECTED.MIN_RELATIONSHIPS);
  });

  it("🎪 COMPLETE STORE SUMMARY - Understanding the Full Picture", () => {
    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("🎪 === COMPLETE REFERENCE STORE SUMMARY ===");
    }

    // Count everything
    const dataDir = path.join(CONFIG.REFERENCE_STORE_DIR, "data");

    // Count nodes
    const nodeFiles = fs.readdirSync(dataDir)
      .filter((file) => file.startsWith("nodes_") && file.endsWith("_data.csv"));

    let totalNodes = 0;
    nodeFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const count = content.trim().split("\n").length;
      totalNodes += count;
    });

    // Count relationships
    const relFiles = fs.readdirSync(dataDir)
      .filter((file) => file.startsWith("relationships_") && file.endsWith("_data.csv"));

    let totalRelationships = 0;
    relFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
      const count = content.trim().split("\n").length;
      totalRelationships += count;
    });

    if (CONFIG.FEATURES.SHOW_DETAILED_OUTPUT) {
      console.log("\n🎯 REFERENCE STORE STATISTICS:");
      console.log(`📊 Total nodes: ${totalNodes}`);
      console.log(`🔗 Total relationships: ${totalRelationships}`);
      console.log(`🏷️ Node types: ${nodeFiles.length}`);
      console.log(`🔗 Relationship types: ${relFiles.length}`);
      console.log(`📁 Storage location: ${CONFIG.REFERENCE_STORE_DIR}`);

      console.log("\n🎉 REFERENCE STORE READY FOR TESTING!");
      console.log("🚀 This store provides a complete, realistic CSV GraphStore");
      console.log("🧩 All CsvFileInput tests can use this as ground truth data");
    }

    expect(totalNodes).toBeGreaterThan(CONFIG.EXPECTED.MIN_NODES);
    expect(totalRelationships).toBeGreaterThan(CONFIG.EXPECTED.MIN_RELATIONSHIPS);
    expect(nodeFiles.length).toBe(CONFIG.EXPECTED.NODE_TYPES);
    expect(relFiles.length).toBe(CONFIG.EXPECTED.RELATIONSHIP_TYPES);
  });

});

// ============================================================================
// 🔧 IMPLEMENTATION FUNCTIONS - File creation logic
// ============================================================================

function createSchemaFiles(baseDir: string): void {
  console.log("📋 Creating schema files...");

  // NODE SCHEMA - Complete schema for all node types
  const nodeSchemaContent = `label,propertyKey,valueType,defaultValue,state
User,username,STRING,,PERSISTENT
User,email,STRING,,PERSISTENT
User,age,LONG,"DefaultValue(25)",PERSISTENT
User,verified,BOOLEAN,"DefaultValue(false)",PERSISTENT
User,followers,LONG,"DefaultValue(0)",PERSISTENT
User,bio,STRING,,PERSISTENT
Post,id,STRING,,PERSISTENT
Post,title,STRING,,PERSISTENT
Post,content,STRING,,PERSISTENT
Post,timestamp,STRING,,PERSISTENT
Post,likes,LONG,"DefaultValue(0)",PERSISTENT
Post,public,BOOLEAN,"DefaultValue(true)",PERSISTENT
Company,name,STRING,,PERSISTENT
Company,industry,STRING,"DefaultValue(Technology)",PERSISTENT
Company,employees,LONG,"DefaultValue(100)",PERSISTENT
Company,founded,LONG,,PERSISTENT
Company,revenue,DOUBLE,,PERSISTENT
Tag,name,STRING,,PERSISTENT
Tag,category,STRING,,PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "node-schema.csv"), nodeSchemaContent);

  // RELATIONSHIP SCHEMA - Complete schema for all relationship types
  const relationshipSchemaContent = `startLabel,type,endLabel,propertyKey,valueType,defaultValue,state
User,FOLLOWS,User,since,STRING,,PERSISTENT
User,FOLLOWS,User,notifications,BOOLEAN,"DefaultValue(true)",PERSISTENT
User,POSTED,Post,timestamp,STRING,,PERSISTENT
User,LIKED,Post,timestamp,STRING,,PERSISTENT
User,WORKS_AT,Company,position,STRING,,PERSISTENT
User,WORKS_AT,Company,salary,DOUBLE,,PERSISTENT
User,WORKS_AT,Company,startDate,STRING,,PERSISTENT
Post,TAGGED_WITH,Tag,confidence,DOUBLE,"DefaultValue(1.0)",PERSISTENT
Company,LOCATED_IN,Company,relationship,STRING,,PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "relationship-schema.csv"), relationshipSchemaContent);

  // GRAPH PROPERTY SCHEMA - Metadata about the graph itself
  const graphPropertySchemaContent = `propertyKey,valueType,defaultValue,state
name,STRING,,PERSISTENT
description,STRING,,PERSISTENT
version,STRING,"DefaultValue(1.0)",PERSISTENT
created,STRING,,PERSISTENT
lastModified,STRING,,PERSISTENT
nodeCount,LONG,"DefaultValue(0)",PERSISTENT
relationshipCount,LONG,"DefaultValue(0)",PERSISTENT`;

  fs.writeFileSync(path.join(baseDir, "graph-property-schema.csv"), graphPropertySchemaContent);

  console.log("✅ Schema files created");
}

function createNodeFiles(headersDir: string, dataDir: string): void {
  console.log("👥 Creating node files...");

  // USER NODES
  const userHeaderContent = `:ID,username:string,email:string,age:long,verified:boolean,followers:long,bio:string,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_User_header.csv"), userHeaderContent);

  const userDataContent = `user_001,alice_dev,alice@example.com,28,true,1250,Full-stack developer passionate about graph databases,User
user_002,bob_data,bob@company.com,34,true,890,Data scientist working on ML and graph analytics,User
user_003,charlie_design,charlie@design.com,26,false,340,UX designer creating beautiful interfaces,User
user_004,diana_pm,diana@startup.com,31,true,675,Product manager building the future of social networks,User
user_005,eve_researcher,eve@university.edu,29,true,2100,PhD researcher in distributed systems and graph theory,User
user_006,frank_junior,frank@newbie.com,22,false,45,Junior developer learning TypeScript and graph databases,User`;

  fs.writeFileSync(path.join(dataDir, "nodes_User_data.csv"), userDataContent);

  // POST NODES
  const postHeaderContent = `:ID,title:string,content:string,timestamp:string,likes:long,public:boolean,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Post_header.csv"), postHeaderContent);

  const postDataContent = `post_001,Introduction to Graph Databases,Graph databases are revolutionary for connected data. They excel at traversing relationships and finding patterns that relational databases struggle with.,2024-01-15T10:30:00Z,42,true,Post
post_002,TypeScript Tips for Graph Processing,Working with graphs in TypeScript requires careful type definitions. Here are my favorite patterns for type-safe graph operations.,2024-01-16T14:20:00Z,38,true,Post
post_003,Building Scalable Data Pipelines,Modern data pipelines need to handle streaming data efficiently. CSV processing is just the beginning of a larger data flow.,2024-01-17T09:15:00Z,56,true,Post
post_004,The Future of Social Networks,Decentralized social networks built on graph infrastructure could revolutionize how we connect and share information.,2024-01-18T16:45:00Z,89,true,Post
post_005,Learning Graph Algorithms,Started implementing PageRank from scratch. The math is beautiful but the implementation details are tricky!,2024-01-19T11:30:00Z,23,true,Post
post_006,My First Open Source Contribution,Just submitted my first PR to a graph database project. Nervous but excited to contribute to the community!,2024-01-20T13:20:00Z,67,true,Post`;

  fs.writeFileSync(path.join(dataDir, "nodes_Post_data.csv"), postDataContent);

  // COMPANY NODES
  const companyHeaderContent = `:ID,name:string,industry:string,employees:long,founded:long,revenue:double,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Company_header.csv"), companyHeaderContent);

  const companyDataContent = `company_001,GraphTech Solutions,Technology,1500,2015,125000000.50,Company
company_002,DataFlow Systems,Analytics,800,2018,45000000.25,Company
company_003,Creative Designs Inc,Design,250,2020,8500000.75,Company
company_004,InnovateLab Startup,Technology,45,2022,2100000.00,Company
company_005,University Research Center,Education,320,2010,0.00,Company`;

  fs.writeFileSync(path.join(dataDir, "nodes_Company_data.csv"), companyDataContent);

  // TAG NODES
  const tagHeaderContent = `:ID,name:string,category:string,:LABEL`;
  fs.writeFileSync(path.join(headersDir, "nodes_Tag_header.csv"), tagHeaderContent);

  const tagDataContent = `tag_001,typescript,programming,Tag
tag_002,graphs,data-structures,Tag
tag_003,databases,technology,Tag
tag_004,machine-learning,ai,Tag
tag_005,design,creative,Tag
tag_006,social-networks,platforms,Tag
tag_007,algorithms,computer-science,Tag
tag_008,open-source,community,Tag`;

  fs.writeFileSync(path.join(dataDir, "nodes_Tag_data.csv"), tagDataContent);

  console.log("✅ Node files created");
}

function createRelationshipFiles(headersDir: string, dataDir: string): void {
  console.log("🔗 Creating relationship files...");

  // FOLLOWS RELATIONSHIPS
  const followsHeaderContent = `:START_ID,:END_ID,:TYPE,since:string,notifications:boolean`;
  fs.writeFileSync(path.join(headersDir, "relationships_FOLLOWS_header.csv"), followsHeaderContent);

  const followsDataContent = `user_001,user_002,FOLLOWS,2023-06-15,true
user_001,user_005,FOLLOWS,2023-08-20,true
user_002,user_001,FOLLOWS,2023-06-20,true
user_002,user_003,FOLLOWS,2023-07-10,false
user_002,user_004,FOLLOWS,2023-09-05,true
user_003,user_001,FOLLOWS,2023-07-01,true
user_004,user_002,FOLLOWS,2023-09-10,true
user_004,user_005,FOLLOWS,2023-10-15,true
user_005,user_001,FOLLOWS,2023-08-25,true
user_005,user_002,FOLLOWS,2023-09-01,false
user_006,user_001,FOLLOWS,2024-01-10,true
user_006,user_005,FOLLOWS,2024-01-12,true`;

  fs.writeFileSync(path.join(dataDir, "relationships_FOLLOWS_data.csv"), followsDataContent);

  // POSTED RELATIONSHIPS
  const postedHeaderContent = `:START_ID,:END_ID,:TYPE,timestamp:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_POSTED_header.csv"), postedHeaderContent);

  const postedDataContent = `user_001,post_001,POSTED,2024-01-15T10:30:00Z
user_002,post_002,POSTED,2024-01-16T14:20:00Z
user_002,post_003,POSTED,2024-01-17T09:15:00Z
user_004,post_004,POSTED,2024-01-18T16:45:00Z
user_006,post_005,POSTED,2024-01-19T11:30:00Z
user_006,post_006,POSTED,2024-01-20T13:20:00Z`;

  fs.writeFileSync(path.join(dataDir, "relationships_POSTED_data.csv"), postedDataContent);

  // LIKED RELATIONSHIPS
  const likedHeaderContent = `:START_ID,:END_ID,:TYPE,timestamp:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_LIKED_header.csv"), likedHeaderContent);

  const likedDataContent = `user_002,post_001,LIKED,2024-01-15T11:00:00Z
user_003,post_001,LIKED,2024-01-15T12:30:00Z
user_004,post_001,LIKED,2024-01-15T14:15:00Z
user_005,post_001,LIKED,2024-01-15T16:20:00Z
user_001,post_002,LIKED,2024-01-16T15:00:00Z
user_003,post_002,LIKED,2024-01-16T16:30:00Z
user_001,post_003,LIKED,2024-01-17T10:00:00Z
user_004,post_003,LIKED,2024-01-17T11:45:00Z
user_005,post_003,LIKED,2024-01-17T13:20:00Z
user_001,post_004,LIKED,2024-01-18T17:30:00Z
user_002,post_004,LIKED,2024-01-18T18:00:00Z
user_003,post_004,LIKED,2024-01-18T19:15:00Z
user_005,post_005,LIKED,2024-01-19T12:00:00Z
user_001,post_006,LIKED,2024-01-20T14:00:00Z`;

  fs.writeFileSync(path.join(dataDir, "relationships_LIKED_data.csv"), likedDataContent);

  // WORKS_AT RELATIONSHIPS
  const worksAtHeaderContent = `:START_ID,:END_ID,:TYPE,position:string,salary:double,startDate:string`;
  fs.writeFileSync(path.join(headersDir, "relationships_WORKS_AT_header.csv"), worksAtHeaderContent);

  const worksAtDataContent = `user_001,company_001,WORKS_AT,Senior Software Engineer,125000.00,2022-03-15
user_002,company_002,WORKS_AT,Lead Data Scientist,135000.00,2021-09-01
user_003,company_003,WORKS_AT,Senior UX Designer,95000.00,2023-01-10
user_004,company_004,WORKS_AT,Product Manager,110000.00,2022-11-20
user_005,company_005,WORKS_AT,Research Scientist,89000.00,2020-08-01
user_006,company_001,WORKS_AT,Junior Developer,75000.00,2023-10-15`;

  fs.writeFileSync(path.join(dataDir, "relationships_WORKS_AT_data.csv"), worksAtDataContent);

  // TAGGED_WITH RELATIONSHIPS
  const taggedWithHeaderContent = `:START_ID,:END_ID,:TYPE,confidence:double`;
  fs.writeFileSync(path.join(headersDir, "relationships_TAGGED_WITH_header.csv"), taggedWithHeaderContent);

  const taggedWithDataContent = `post_001,tag_003,TAGGED_WITH,0.95
post_001,tag_002,TAGGED_WITH,0.88
post_002,tag_001,TAGGED_WITH,0.92
post_002,tag_002,TAGGED_WITH,0.85
post_003,tag_003,TAGGED_WITH,0.78
post_004,tag_006,TAGGED_WITH,0.93
post_004,tag_002,TAGGED_WITH,0.67
post_005,tag_007,TAGGED_WITH,0.89
post_005,tag_002,TAGGED_WITH,0.91
post_006,tag_008,TAGGED_WITH,0.96`;

  fs.writeFileSync(path.join(dataDir, "relationships_TAGGED_WITH_data.csv"), taggedWithDataContent);

  console.log("✅ Relationship files created");
}

function createGraphPropertyFiles(headersDir: string, dataDir: string): void {
  console.log("📊 Creating graph property files...");

  const graphPropertyHeaderContent = `name:string,description:string,version:string,created:string,lastModified:string,nodeCount:long,relationshipCount:long`;
  fs.writeFileSync(path.join(headersDir, "graph_property_metadata_header.csv"), graphPropertyHeaderContent);

  const graphPropertyDataContent = `Social Network Demo Graph,A complete social network graph for testing CSV import functionality with realistic data including users posts companies and relationships,1.2.0,2024-01-01T00:00:00Z,2024-01-20T15:30:00Z,21,32`;
  fs.writeFileSync(path.join(dataDir, "graph_property_metadata_data.csv"), graphPropertyDataContent);

  console.log("✅ Graph property files created");
}

function createMappingFiles(baseDir: string): void {
  console.log("🗺️ Creating mapping files...");

  // LABEL MAPPINGS
  const labelMappingContent = `index,label
0,User
1,Post
2,Company
3,Tag`;

  fs.writeFileSync(path.join(baseDir, "label-mappings.csv"), labelMappingContent);

  // TYPE MAPPINGS
  const typeMappingContent = `index,type
0,FOLLOWS
1,POSTED
2,LIKED
3,WORKS_AT
4,TAGGED_WITH`;

  fs.writeFileSync(path.join(baseDir, "type-mappings.csv"), typeMappingContent);

  console.log("✅ Mapping files created");
}

function createMetadataFiles(baseDir: string): void {
  console.log("📝 Creating metadata files...");

  // USER INFO
  const userInfoContent = `userName
test_user_social_network`;

  fs.writeFileSync(path.join(baseDir, "user-info.csv"), userInfoContent);

  // GRAPH INFO
  const graphInfoContent = `graphName
SocialNetworkDemo`;

  fs.writeFileSync(path.join(baseDir, "graph-info.csv"), graphInfoContent);

  // CAPABILITIES (optional)
  if (CONFIG.FEATURES.CREATE_CAPABILITIES) {
    const capabilitiesContent = `capability,enabled
STREAMING_IMPORT,true
SCHEMA_VALIDATION,true
ERROR_RECOVERY,true
PROGRESS_TRACKING,true
MEMORY_OPTIMIZATION,true`;

    fs.writeFileSync(path.join(baseDir, "capabilities.csv"), capabilitiesContent);
  }

  console.log("✅ Metadata files created");
}

// ============================================================================
// 🎯 EXPORTS - Make configuration and functions available
// ============================================================================

export { CONFIG, createReferenceGraphStore };
export const referenceStoreDir = CONFIG.REFERENCE_STORE_DIR;
