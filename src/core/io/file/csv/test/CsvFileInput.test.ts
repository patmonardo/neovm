import { describe, it, expect } from 'vitest';
import { CsvFileInput } from '../CsvFileInput';
import { InputEntityVisitor } from '@/api/import/input/InputEntityVisitor';

/**
 * 🎯 CLEAN CSVFILEINPUT TESTS - Understanding the API step by step
 *
 * This file demonstrates exactly how CsvFileInput works:
 * 1. Load schemas and metadata from CSV files
 * 2. Create iterables for nodes, relationships, graph properties
 * 3. Stream through CSV data chunk by chunk
 * 4. Parse CSV lines into visitor calls
 */

const REFERENCE_STORE = "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

describe('🧪 CsvFileInput - Clean API Tests', () => {

  it("🏗️ BASIC CONSTRUCTION - Load schemas and metadata", () => {
    console.log("🏗️ === BASIC CONSTRUCTION TEST ===");

    // ✅ STEP 1: Create CsvFileInput (loads all schemas)
    const csvInput = new CsvFileInput(REFERENCE_STORE);
    console.log("✅ CsvFileInput created - all schemas loaded");

    // ✅ STEP 2: Check loaded metadata
    console.log(`👤 User: ${csvInput.userName()}`);
    console.log(`📊 Database: ${csvInput.graphInfo().databaseInfo().databaseId()}`);
    console.log(`📊 Node count: ${csvInput.graphInfo().nodeCount()}`);

    // ✅ STEP 3: Check loaded schemas
    const nodeLabels = Array.from(csvInput.nodeSchema().availableLabels()).map(l => l.name());
    const relTypes = Array.from(csvInput.relationshipSchema().availableTypes()).map(t => t.name());
    console.log(`🏷️ Node labels: ${nodeLabels.join(', ')}`);
    console.log(`🔗 Relationship types: ${relTypes.join(', ')}`);

    expect(csvInput).toBeTruthy();
    expect(nodeLabels.length).toBeGreaterThan(0);
    expect(relTypes.length).toBeGreaterThan(0);
  });

  it("📊 NODE STREAMING - Stream through node data", async () => {
    console.log("📊 === NODE STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE);

    // ✅ STEP 1: Create node iterable (discovers header files)
    const nodeIterable = csvInput.nodes();
    console.log("✅ Node iterable created");

    // ✅ STEP 2: Create iterator (maps headers to data files)
    const iterator = nodeIterable.iterator();
    console.log("✅ Node iterator created");

    // ✅ STEP 3: Create chunk for processing
    const chunk = iterator.newChunk();
    console.log("✅ Node chunk created");

    // ✅ STEP 4: Load first chunk of data
    const hasData = await iterator.next(chunk);
    console.log(`📦 First chunk loaded: ${hasData}`);

    if (hasData) {
      // ✅ STEP 5: Process entities in chunk
      const visitor = new TestVisitor();
      let entityCount = 0;

      while (await chunk.next(visitor) && entityCount < 5) {
        entityCount++;
      }

      console.log(`🎯 Processed ${entityCount} entities`);
      console.log(`📊 Visitor stats: ${visitor.getStats()}`);
    }

    await iterator.close();
    expect(hasData).toBe(true);
  });

  it("🔗 RELATIONSHIP STREAMING - Stream through relationship data", async () => {
    console.log("🔗 === RELATIONSHIP STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE);

    // ✅ Same pattern as nodes, but for relationships
    const relIterable = csvInput.relationships();
    const iterator = relIterable.iterator();
    const chunk = iterator.newChunk();

    console.log("✅ Relationship streaming components created");

    const hasData = await iterator.next(chunk);
    console.log(`📦 Relationship chunk loaded: ${hasData}`);

    if (hasData) {
      const visitor = new TestVisitor();
      let entityCount = 0;

      while (await chunk.next(visitor) && entityCount < 5) {
        entityCount++;
      }

      console.log(`🎯 Processed ${entityCount} relationships`);
      console.log(`📊 Visitor stats: ${visitor.getStats()}`);
    }

    await iterator.close();
    expect(hasData).toBe(true);
  });

  it("🌐 GRAPH PROPERTY STREAMING - Stream through graph properties", async () => {
    console.log("🌐 === GRAPH PROPERTY STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE);

    const propIterable = csvInput.graphProperties();
    const iterator = propIterable.iterator();
    const chunk = iterator.newChunk();

    console.log("✅ Graph property streaming components created");

    const hasData = await iterator.next(chunk);
    console.log(`📦 Graph property chunk loaded: ${hasData}`);

    if (hasData) {
      const visitor = new TestVisitor();
      let entityCount = 0;

      while (await chunk.next(visitor) && entityCount < 10) {
        entityCount++;
      }

      console.log(`🎯 Processed ${entityCount} graph properties`);
      console.log(`📊 Visitor stats: ${visitor.getStats()}`);
    }

    await iterator.close();
    // Graph properties might not exist, so don't require hasData
  });

  it("🎭 COMPLETE STREAMING FLOW - Show the full API pattern", async () => {
    console.log("🎭 === COMPLETE STREAMING FLOW TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE);
    const visitor = new DetailedVisitor();

    // ✅ THE COMPLETE PATTERN:
    console.log("\n📊 Processing ALL nodes:");
    await processAllChunks(csvInput.nodes(), visitor, "nodes");

    console.log("\n🔗 Processing ALL relationships:");
    await processAllChunks(csvInput.relationships(), visitor, "relationships");

    console.log("\n🌐 Processing ALL graph properties:");
    await processAllChunks(csvInput.graphProperties(), visitor, "graph properties");

    console.log(`\n🎯 FINAL TOTALS: ${visitor.getFinalStats()}`);
  });

});

// ✅ HELPER FUNCTION - Shows the complete streaming pattern
async function processAllChunks(iterable: any, visitor: DetailedVisitor, entityType: string) {
  const iterator = iterable.iterator();
  let chunkCount = 0;

  try {
    while (true) {
      const chunk = iterator.newChunk();
      const hasData = await iterator.next(chunk);

      if (!hasData) break;

      chunkCount++;
      console.log(`  📦 Processing ${entityType} chunk ${chunkCount}...`);

      let entityCount = 0;
      while (await chunk.next(visitor)) {
        entityCount++;
      }

      console.log(`    ✅ Chunk ${chunkCount}: ${entityCount} ${entityType}`);
    }
  } finally {
    await iterator.close();
  }

  console.log(`  🎯 Total ${entityType} chunks: ${chunkCount}`);
}

// ✅ SIMPLE TEST VISITOR - Just counts and shows basic info
class TestVisitor implements InputEntityVisitor {
  private entityCount = 0;
  private propertyCount = 0;
  private lastEntity: any = {};

  // Node methods
  id(id: any): void {
    this.lastEntity.id = id;
  }

  labels(labels: string[]): void {
    this.lastEntity.labels = labels;
  }

  property(key: string, value: any): void {
    this.propertyCount++;
    if (!this.lastEntity.properties) this.lastEntity.properties = {};
    this.lastEntity.properties[key] = value;
  }

  endOfEntity(): void {
    this.entityCount++;
    if (this.entityCount <= 3) {
      console.log(`    📋 Entity ${this.entityCount}: ${JSON.stringify(this.lastEntity)}`);
    }
    this.lastEntity = {};
  }

  // Relationship methods
  startId(id: any): void {
    this.lastEntity.startId = id;
  }

  endId(id: any): void {
    this.lastEntity.endId = id;
  }

  type(type: string): void {
    this.lastEntity.type = type;
  }

  getStats(): string {
    return `${this.entityCount} entities, ${this.propertyCount} properties`;
  }
}

// ✅ DETAILED VISITOR - Tracks comprehensive statistics
class DetailedVisitor implements InputEntityVisitor {
  private nodeCount = 0;
  private relCount = 0;
  private propCount = 0;
  private labelCounts = new Map<string, number>();
  private typeCounts = new Map<string, number>();
  private currentEntity: any = {};

  id(id: any): void {
    this.currentEntity.id = id;
  }

  labels(labels: string[]): void {
    this.currentEntity.labels = labels;
    labels.forEach(label => {
      this.labelCounts.set(label, (this.labelCounts.get(label) || 0) + 1);
    });
  }

  property(key: string, value: any): void {
    this.propCount++;
    if (!this.currentEntity.properties) this.currentEntity.properties = {};
    this.currentEntity.properties[key] = value;
  }

  endOfEntity(): void {
    if (this.currentEntity.labels) {
      this.nodeCount++;
    } else if (this.currentEntity.type) {
      this.relCount++;
    }
    this.currentEntity = {};
  }

  startId(id: any): void {
    this.currentEntity.startId = id;
  }

  endId(id: any): void {
    this.currentEntity.endId = id;
  }

  type(type: string): void {
    this.currentEntity.type = type;
    this.typeCounts.set(type, (this.typeCounts.get(type) || 0) + 1);
  }

  getFinalStats(): string {
    const labels = Array.from(this.labelCounts.entries()).map(([k,v]) => `${k}:${v}`).join(', ');
    const types = Array.from(this.typeCounts.entries()).map(([k,v]) => `${k}:${v}`).join(', ');
    return `${this.nodeCount} nodes (${labels}), ${this.relCount} rels (${types}), ${this.propCount} properties`;
  }
}
