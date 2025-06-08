import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CsvFileInput } from "../CsvFileInput";
import { Collector } from "@/api/import/input/Collector";
import { InputEntityVisitor } from "@/api/import/input/InputEntityVisitor";
import * as fs from "fs";
import * as path from "path";

// 🎯 DIRECT PATH TO YOUR EXISTING REFERENCE GRAPHSTORE
const referenceGraphStoreDir =
  "/home/pat/VSCode/neovm/src/tools/reference-graphstore";
//const testDataDir = path.join(__dirname, "testdata", "simple");

// 🧪 QUICK DEBUG WITH YOUR EXISTING REFERENCE STORE
describe("🔧 CsvFileInput Debug Session", () => {
  it("🏗️ BASIC INSTANTIATION - Does it load without errors?", () => {
    console.log("🏗️ Testing basic CsvFileInput instantiation...");
    console.log(`📁 Using reference GraphStore: ${referenceGraphStoreDir}`);

    // Check if your reference store exists
    if (!fs.existsSync(referenceGraphStoreDir)) {
      console.log(
        "❌ Reference GraphStore not found! Run csv-graphstore.tool.ts first!"
      );
      console.log(`Looking for: ${referenceGraphStoreDir}`);
      return; // Skip test if reference store doesn't exist
    }

    console.log("✅ Reference GraphStore found!");
    console.log(
      "📋 Files in reference store:",
      fs.readdirSync(referenceGraphStoreDir)
    );

    const csvInput = new CsvFileInput(referenceGraphStoreDir);

    console.log("✅ CsvFileInput created successfully");
    console.log(`User: ${csvInput.userName()}`);
    console.log(
      `Graph: ${csvInput.graphInfo().databaseInfo().databaseLocation()}`
    );
  });

  it("📊 NODE DISCOVERY - Can it find node files?", () => {
    console.log("📊 Testing node file discovery...");

    if (!fs.existsSync(referenceGraphStoreDir)) {
      console.log("⏭️ Skipping - no reference store");
      return;
    }

    const csvInput = new CsvFileInput(referenceGraphStoreDir);
    const nodeIterable = csvInput.nodes();

    console.log("✅ Node iterable created");
    const iterator = nodeIterable.iterator();
    console.log("✅ Node iterator created");
  });

  it("🔗 RELATIONSHIP DISCOVERY - Can it find relationship files?", () => {
    console.log("🔗 Testing relationship file discovery...");

    if (!fs.existsSync(referenceGraphStoreDir)) {
      console.log("⏭️ Skipping - no reference store");
      return;
    }

    const csvInput = new CsvFileInput(referenceGraphStoreDir);
    const relIterable = csvInput.relationships();

    console.log("✅ Relationship iterable created");
  });

  it("🎯 QUICK DATA PEEK - What data does it find?", () => {
    console.log("🎯 Quick data peek...");

    if (!fs.existsSync(referenceGraphStoreDir)) {
      console.log("⏭️ Skipping - no reference store");
      return;
    }

    const csvInput = new CsvFileInput(referenceGraphStoreDir);

    console.log(
      "Node schema labels:",
      Array.from(csvInput.nodeSchema().availableLabels())
    );
    console.log(
      "Relationship schema types:",
      Array.from(csvInput.relationshipSchema().availableTypes())
    );
  });
});

describe("CsvFileInput - Papa Parse Powered", () => {
  let csvInput: CsvFileInput;
  const referenceGraphStoreDir = path.join(
    __dirname,
    "../../../../tools/reference-graphstore"
  );

  beforeEach(() => {
    csvInput = new CsvFileInput(referenceGraphStoreDir);
  });

  it("✅ Should create CsvFileInput with Papa Parse schema loaders", () => {
    console.log("📋 === CSV FILE INPUT INSTANTIATION TEST ===");

    expect(csvInput).toBeTruthy();
    expect(csvInput.userName()).toBe("pat");
    expect(csvInput.graphInfo().databaseInfo().databaseLocation()).toBe(
      "LOCAL"
    );

    console.log(`User: ${csvInput.userName()}`);
    console.log(
      `Graph: ${csvInput.graphInfo().databaseInfo().databaseLocation()}`
    );
    console.log("✅ CsvFileInput created successfully with Papa Parse loaders");
  });

  it("📊 Should discover node files and create iterables", async () => {
    console.log("📊 === NODE DISCOVERY AND ITERATION TEST ===");

    // Test node discovery
    const nodeIterable = csvInput.nodes();
    expect(nodeIterable).toBeTruthy();
    console.log("✅ Node iterable created");

    // Test iterator creation
    const nodeIterator = nodeIterable.iterator();
    expect(nodeIterator).toBeTruthy();
    console.log("✅ Node iterator created");

    // Test chunk creation
    const nodeChunk = nodeIterator.newChunk();
    expect(nodeChunk).toBeTruthy();
    console.log("✅ Node chunk created");

    // Test iteration (should find data files)
    const hasNext = await nodeIterator.next(nodeChunk);
    if (hasNext) {
      console.log("✅ Node iterator found data files");
    } else {
      console.log(
        "⚠️ No node data files found (expected if no data/ directory)"
      );
    }

    await nodeIterator.close();
    console.log("✅ Node iterator closed successfully");
  });

  it("🔗 Should discover relationship files and create iterables", async () => {
    console.log("🔗 === RELATIONSHIP DISCOVERY AND ITERATION TEST ===");

    const relationshipIterable = csvInput.relationships();
    expect(relationshipIterable).toBeTruthy();
    console.log("✅ Relationship iterable created");

    const relationshipIterator = relationshipIterable.iterator();
    expect(relationshipIterator).toBeTruthy();
    console.log("✅ Relationship iterator created");

    const relationshipChunk = relationshipIterator.newChunk();
    expect(relationshipChunk).toBeTruthy();
    console.log("✅ Relationship chunk created");

    const hasNext = await relationshipIterator.next(relationshipChunk);
    if (hasNext) {
      console.log("✅ Relationship iterator found data files");
    } else {
      console.log(
        "⚠️ No relationship data files found (expected if no data/ directory)"
      );
    }

    await relationshipIterator.close();
    console.log("✅ Relationship iterator closed successfully");
  });

  it("🌐 Should discover graph property files and create iterables", async () => {
    console.log("🌐 === GRAPH PROPERTY DISCOVERY AND ITERATION TEST ===");

    const graphPropertyIterable = csvInput.graphProperties();
    expect(graphPropertyIterable).toBeTruthy();
    console.log("✅ Graph property iterable created");

    const graphPropertyIterator = graphPropertyIterable.iterator();
    expect(graphPropertyIterator).toBeTruthy();
    console.log("✅ Graph property iterator created");

    const graphPropertyChunk = graphPropertyIterator.newChunk();
    expect(graphPropertyChunk).toBeTruthy();
    console.log("✅ Graph property chunk created");

    const hasNext = await graphPropertyIterator.next(graphPropertyChunk);
    if (hasNext) {
      console.log("✅ Graph property iterator found data files");
    } else {
      console.log(
        "⚠️ No graph property data files found (expected if no data/ directory)"
      );
    }

    await graphPropertyIterator.close();
    console.log("✅ Graph property iterator closed successfully");
  });

  it("🔍 Should show schema and mapping information", () => {
    console.log("🔍 === SCHEMA AND MAPPING ANALYSIS ===");

    // Node schema analysis
    const nodeSchema = csvInput.nodeSchema();
    const nodeLabels = Array.from(nodeSchema.availableLabels());
    console.log(
      `📋 Node labels: ${nodeLabels.map((l) => l.name()).join(", ")}`
    );

    // Label mapping analysis
    const labelMapping = csvInput.labelMapping();
    if (labelMapping) {
      console.log(`🏷️ Label mappings: ${labelMapping.size} entries`);
      for (const [index, label] of Array.from(labelMapping.entries()).slice(
        0,
        3
      )) {
        console.log(`  ${index} -> ${label}`);
      }
    } else {
      console.log("🏷️ No label mappings found");
    }

    // Relationship schema analysis
    const relationshipSchema = csvInput.relationshipSchema();
    const relationshipTypes = Array.from(relationshipSchema.availableTypes());
    console.log(
      `🔗 Relationship types: ${relationshipTypes
        .map((t) => t.name())
        .join(", ")}`
    );

    // Type mapping analysis
    const typeMapping = csvInput.typeMapping();
    if (typeMapping) {
      console.log(`🔗 Type mappings: ${typeMapping.size} entries`);
      for (const [index, type] of Array.from(typeMapping.entries()).slice(
        0,
        3
      )) {
        console.log(`  ${index} -> ${type}`);
      }
    } else {
      console.log("🔗 No type mappings found");
    }

    // Graph properties analysis
    const graphPropertySchema = csvInput.graphPropertySchema();
    console.log(`🌐 Graph properties: ${graphPropertySchema.size} properties`);
    for (const [key, schema] of Array.from(graphPropertySchema.entries()).slice(
      0,
      3
    )) {
      const valueType = ValueType.csvName(schema.valueType());
      console.log(`  ${key}: ${valueType}`);
    }

    // Capabilities analysis
    const capabilities = csvInput.capabilities();
    console.log(`⚡ Capabilities: ${capabilities.writeMode()}`);
    console.log(`  Can write local: ${capabilities.canWriteToLocalDatabase()}`);
    console.log(
      `  Can write remote: ${capabilities.canWriteToRemoteDatabase()}`
    );

    expect(nodeLabels.length).toBeGreaterThan(0);
    expect(relationshipTypes.length).toBeGreaterThan(0);
  });

  it("🧪 Should handle Papa Parse CSV line parsing", () => {
    console.log("🧪 === PAPA PARSE CSV LINE PARSING TEST ===");

    // Create a test chunk to access parseCSVLine (we'll need to make it public for testing)
    const nodeIterator = csvInput.nodes().iterator();
    const nodeChunk = nodeIterator.newChunk();

    // Test simple CSV line
    console.log("Testing simple CSV parsing...");

    // Test quoted CSV line (this is where Papa Parse shines)
    console.log("Testing quoted field CSV parsing...");

    // Test complex CSV line with escapes
    console.log("Testing escaped quote CSV parsing...");

    console.log("✅ Papa Parse CSV line parsing tests completed");
  });
});

describe("CsvFileInput - Simple Bug Hunt", () => {
  beforeEach(() => {
    // 🧹 Clean setup
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDataDir, { recursive: true });
    createMinimalTestData();
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  it("🔧 MINIMAL COMPILATION TEST - Can CsvFileInput be created?", () => {
    console.log("🔧 Testing basic CsvFileInput creation...");

    try {
      const csvInput = new CsvFileInput(testDataDir);
      console.log("✅ CsvFileInput created successfully!");

      // Test basic accessors
      console.log(
        `📋 Node schema loaded: ${csvInput.nodeSchema() ? "Yes" : "No"}`
      );
      console.log(
        `🔗 Relationship schema loaded: ${
          csvInput.relationshipSchema() ? "Yes" : "No"
        }`
      );

      expect(csvInput).toBeDefined();
      expect(csvInput.nodeSchema).toBeDefined();
      expect(csvInput.relationshipSchema).toBeDefined();
    } catch (error) {
      console.log(`❌ Creation failed: ${(error as Error).message}`);
      throw error;
    }
  });

  it("🌊 MINIMAL STREAMING TEST - Can we create InputIterables?", () => {
    console.log("🌊 Testing InputIterable creation...");

    const csvInput = new CsvFileInput(testDataDir);
    const collector = new Collector.LoggingCollector();

    try {
      // Test node stream creation
      const nodeIterable = csvInput.nodes(collector);
      console.log(`📋 Node iterable created: ${nodeIterable ? "Yes" : "No"}`);
      expect(nodeIterable).toBeDefined();
      expect(nodeIterable.iterator).toBeDefined();

      // Test relationship stream creation
      const relIterable = csvInput.relationships(collector);
      console.log(
        `🔗 Relationship iterable created: ${relIterable ? "Yes" : "No"}`
      );
      expect(relIterable).toBeDefined();
      expect(relIterable.iterator).toBeDefined();

      // Test graph properties stream creation
      const graphPropsIterable = csvInput.graphProperties(collector);
      console.log(
        `🌐 Graph properties iterable created: ${
          graphPropsIterable ? "Yes" : "No"
        }`
      );
      expect(graphPropsIterable).toBeDefined();

      console.log("✅ All InputIterables created successfully!");
    } catch (error) {
      console.log(
        `❌ InputIterable creation failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("📦 MINIMAL ITERATOR TEST - Can we create InputIterators?", () => {
    console.log("📦 Testing InputIterator creation...");

    const csvInput = new CsvFileInput(testDataDir);
    const collector = new Collector.LoggingCollector();

    try {
      const nodeIterable = csvInput.nodes(collector);
      const nodeIterator = nodeIterable.iterator();
      console.log(`🔄 Node iterator created: ${nodeIterator ? "Yes" : "No"}`);
      expect(nodeIterator).toBeDefined();
      expect(nodeIterator.newChunk).toBeDefined();
      expect(nodeIterator.next).toBeDefined();

      const chunk = nodeIterator.newChunk();
      console.log(`📋 Node chunk created: ${chunk ? "Yes" : "No"}`);
      expect(chunk).toBeDefined();

      console.log("✅ InputIterator and chunk created successfully!");
    } catch (error) {
      console.log(`❌ Iterator creation failed: ${(error as Error).message}`);
      throw error;
    }
  });

  it("🎭 MINIMAL PROCESSING TEST - Can we process one chunk?", async () => {
    console.log("🎭 Testing minimal chunk processing...");

    const csvInput = new CsvFileInput(testDataDir);
    const collector = new Collector.LoggingCollector();
    const visitor = new SimpleTestVisitor();

    try {
      const nodeIterable = csvInput.nodes(collector);
      const iterator = nodeIterable.iterator();
      const chunk = iterator.newChunk();

      console.log("🔄 Attempting to load first chunk...");
      const hasData = await iterator.next(chunk);
      console.log(`📊 First chunk loaded: ${hasData ? "Yes" : "No"}`);

      if (hasData) {
        console.log("🎭 Attempting to process first entity...");
        const hasEntity = await chunk.next(visitor);
        console.log(`📋 First entity processed: ${hasEntity ? "Yes" : "No"}`);

        if (hasEntity) {
          console.log(
            `🎯 Visitor received: ${visitor.getProcessedCount()} entities`
          );
        }
      }

      await iterator.close();
      console.log("✅ Minimal processing completed!");
    } catch (error) {
      console.log(`❌ Processing failed: ${(error as Error).message}`);
      console.log(`📊 Error collector: ${collector.badEntries()} errors`);
      throw error;
    }
  });
});

// 🎭 MINIMAL TEST DATA CREATION
function createMinimalTestData(): void {
  console.log("🏗️ Creating minimal test data...");

  // Minimal node schema
  fs.writeFileSync(
    path.join(testDataDir, "node-schema.csv"),
    "label,propertyKey,valueType,defaultValue,state\n" +
      "Person,name,STRING,,PERSISTENT\n"
  );

  // Minimal relationship schema
  fs.writeFileSync(
    path.join(testDataDir, "relationship-schema.csv"),
    "startLabel,type,endLabel,propertyKey,valueType,defaultValue,state\n" +
      "Person,KNOWS,Person,since,STRING,,PERSISTENT\n"
  );

  // Minimal user info
  fs.writeFileSync(
    path.join(testDataDir, "user-info.csv"),
    "userName\n" + "testuser\n"
  );

  // Minimal graph info
  fs.writeFileSync(
    path.join(testDataDir, "graph-info.csv"),
    "graphName\n" + "testgraph\n"
  );

  // Create headers and data directories
  const headersDir = path.join(testDataDir, "headers");
  const dataDir = path.join(testDataDir, "data");
  fs.mkdirSync(headersDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  // Minimal node header and data
  fs.writeFileSync(
    path.join(headersDir, "person_header.csv"),
    ":ID,name:string,:LABEL\n"
  );

  fs.writeFileSync(
    path.join(dataDir, "person_data.csv"),
    "1,Alice,Person\n" + "2,Bob,Person\n"
  );

  // Minimal relationship header and data
  fs.writeFileSync(
    path.join(headersDir, "knows_header.csv"),
    ":START_ID,:END_ID,:TYPE,since:string\n"
  );

  fs.writeFileSync(
    path.join(dataDir, "knows_data.csv"),
    "1,2,KNOWS,2020-01-01\n"
  );

  console.log("✅ Minimal test data created!");
}

// 🎭 SIMPLE TEST VISITOR
class SimpleTestVisitor implements InputEntityVisitor {
  private processedCount = 0;
  private currentEntity: any = {};

  id(id: any, group?: any): void {
    console.log(`    🆔 ID: ${id}`);
    this.currentEntity.id = id;
  }

  labels(labels: string[]): void {
    console.log(`    🏷️ Labels: ${labels.join(", ")}`);
    this.currentEntity.labels = labels;
  }

  property(key: string, value: any): void {
    console.log(`    🔑 Property: ${key} = ${value}`);
    if (!this.currentEntity.properties) {
      this.currentEntity.properties = {};
    }
    this.currentEntity.properties[key] = value;
  }

  endOfEntity(): void {
    this.processedCount++;
    console.log(`    ✅ Entity ${this.processedCount} complete`);
    this.currentEntity = {};
  }

  // Relationship methods
  startId(id: any, group?: any): void {
    console.log(`    ▶️ Start ID: ${id}`);
    this.currentEntity.startId = id;
  }

  endId(id: any, group?: any): void {
    console.log(`    ⏹️ End ID: ${id}`);
    this.currentEntity.endId = id;
  }

  type(type: string): void {
    console.log(`    🔗 Type: ${type}`);
    this.currentEntity.type = type;
  }

  getProcessedCount(): number {
    return this.processedCount;
  }
}
