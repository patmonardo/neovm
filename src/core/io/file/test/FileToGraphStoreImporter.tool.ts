import { describe, it, expect } from "vitest";
import { CsvFileInput } from "@/core/io/file/csv/CsvFileInput";

/**
 * 🧪 SIMPLE IMPORT TOOL - Just test CSV chunk streaming!
 *
 * Goals:
 * 1. ✅ Test that CSV chunks stream properly
 * 2. 📊 Count chunks without processing content
 * 3. 🎯 Verify file structure works with CsvFileInput
 * 4. 🚀 Keep it SIMPLE!
 */

const REFERENCE_STORE_PATH =
  "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

describe("🧪 Simple CSV Import Tests", () => {
  it("📊 CSV FILE INPUT - Basic loading test", () => {
    console.log("📊 === CSV FILE INPUT BASIC TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);

    // Test basic info loading
    const userName = csvInput.userName();
    const graphInfo = csvInput.graphInfo();

    console.log("✅ CSV File Input created");
    console.log(`👤 User: ${userName}`);
    console.log(`📊 Database: ${graphInfo.databaseInfo().databaseId()}`);
    console.log(`📊 Node count: ${graphInfo.nodeCount()}`);
    console.log(`📊 Max ID: ${graphInfo.maxOriginalId()}`);

    expect(csvInput).toBeTruthy();
    expect(userName).toBeTruthy();
    expect(graphInfo.nodeCount()).toBeGreaterThan(0);
  });

  it("🌊 NODE CHUNK STREAMING - Count chunks without processing", async () => {
    console.log("🌊 === NODE CHUNK STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const nodeIterable = csvInput.nodes();
    const iterator = nodeIterable.iterator();

    let chunkCount = 0;
    let totalRows = 0;

    console.log("🔍 Streaming through node chunks...");

    try {
      while (true) {
        const chunk = iterator.newChunk(); // ✅ Create chunk
        const hasData = await iterator.next(chunk); // ✅ Load data

        if (!hasData) break;

        chunkCount++;
        // ✅ Count rows by processing with visitor
        const counter = new RowCounterVisitor();
        while (await chunk.next(counter)) {
          // Visitor counts each entity
        }

        const rowCount = counter.getCount();
        totalRows += rowCount;

        console.log(`📦 Chunk ${chunkCount}: ${rowCount} rows`);

        if (chunkCount >= 10) break;
      }
    } finally {
      await iterator.close(); // ✅ Cleanup
    }

    console.log(
      `✅ Node streaming complete: ${chunkCount} chunks, ${totalRows} total rows`
    );
    expect(chunkCount).toBeGreaterThan(0);
    expect(totalRows).toBeGreaterThan(0);
  });
  // Update to match the working CsvFileInput.test.ts pattern:

  it("🌊 REL CHUNK STREAMING - Count chunks without processing", async () => {
    console.log("🌊 === REL CHUNK STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const relIterable = csvInput.relationships();
    const iterator = relIterable.iterator();

    let chunkCount = 0;
    let totalRows = 0;

    console.log("🔍 Streaming through rel chunks...");

    try {
      while (true) {
        const chunk = iterator.newChunk();
        const hasData = await iterator.next(chunk);

        if (!hasData) break;

        chunkCount++;

        // ✅ Use visitor pattern like nodes
        const counter = new RowCounterVisitor();
        while (await chunk.next(counter)) {
          // Visitor counts each entity
        }

        const rowCount = counter.getCount();
        totalRows += rowCount;

        console.log(`📦 Chunk ${chunkCount}: ${rowCount} rows`);

        if (chunkCount >= 10) break;
      }
    } finally {
      await iterator.close();
    }

    console.log(
      `✅ Rel streaming complete: ${chunkCount} chunks, ${totalRows} total rows`
    );
    expect(chunkCount).toBeGreaterThan(0);
    expect(totalRows).toBeGreaterThan(0);
  });

  it("🌐 GRAPH PROPERTY STREAMING - Count chunks without processing", async () => {
    console.log("🌐 === GRAPH PROPERTY STREAMING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const propIterable = csvInput.graphProperties();
    const iterator = propIterable.iterator();

    let chunkCount = 0;
    let totalRows = 0;

    console.log("🔍 Streaming through graph property chunks...");

    try {
      while (true) {
        const chunk = iterator.newChunk();
        const hasData = await iterator.next(chunk);

        if (!hasData) break;

        chunkCount++;

        // ✅ Use visitor pattern consistently
        const counter = new RowCounterVisitor();
        while (await chunk.next(counter)) {
          // Count entities
        }

        const rowCount = counter.getCount();
        totalRows += rowCount;

        console.log(`📦 Chunk ${chunkCount}: ${rowCount} rows`);

        if (chunkCount >= 10) break;
      }
    } finally {
      await iterator.close();
    }

    console.log(
      `✅ Graph property streaming: ${chunkCount} chunks, ${totalRows} total rows`
    );
    expect(chunkCount).toBeGreaterThanOrEqual(0);
  });

  it("📋 SCHEMA LOADING - Test schema extraction", () => {
    console.log("📋 === SCHEMA LOADING TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);

    // Test node schema
    const nodeSchema = csvInput.nodeSchema();
    const nodeLabels = Array.from(nodeSchema.availableLabels()).map((l) =>
      l.name()
    );
    console.log(`🏷️ Node labels: ${nodeLabels.join(", ")}`);

    // Test relationship schema
    const relSchema = csvInput.relationshipSchema();
    const relTypes = Array.from(relSchema.availableTypes()).map((t) =>
      t.name()
    );
    console.log(`🔗 Relationship types: ${relTypes.join(", ")}`);

    // Test graph property schema
    const graphPropSchema = csvInput.graphPropertySchema();
    console.log(`🌐 Graph properties: ${graphPropSchema.size}`);

    expect(nodeLabels.length).toBeGreaterThan(0);
    expect(relTypes.length).toBeGreaterThan(0);
  });

  it("🎯 STREAMING PERFORMANCE - Quick performance check", () => {
    console.log("🎯 === STREAMING PERFORMANCE TEST ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);

    const startTime = Date.now();

    // Quick count of all chunks
    let totalChunks = 0;
    let totalRows = 0;

    // Count node chunks
    const nodeIterator = csvInput.nodes().iterator();

    // Use different pattern since graph properties might be different
    try {
      while (nodeIterator.newChunk()) {
        nodeIterator.next(chunk);
        chunkCount++;

        // ✅ Use visitor pattern like nodes
        const counter = new RowCounterVisitor();
        while (await chunk.next(counter)) {
          // Visitor counts each entity
        }

        const rowCount = counter.getCount();
        totalRows += rowCount;

        console.log(`📦 Chunk ${chunkCount}: ${rowCount} rows`);

        if (chunkCount >= 10) {
          console.log("... (limiting output)");
          break;
        }
      }
    } catch (error) {
      console.log(
        `⚠️ Graph property streaming issue: ${(error as Error).message}`
      );
      // This might reveal the graph property iteration pattern difference
    }

    // Count relationship chunks
    const relIterator = csvInput.relationships().iterator();
    while (relIterator.hasNext()) {
      const chunk = relIterator.next();
      totalChunks++;
      totalRows += chunk.size();
    }

    const duration = Date.now() - startTime;

    console.log(
      `⚡ Performance: ${totalChunks} chunks, ${totalRows} rows in ${duration}ms`
    );
    console.log(
      `📊 Rate: ${Math.round((totalRows / duration) * 1000)} rows/second`
    );

    expect(duration).toBeLessThan(5000); // Should be fast!
    expect(totalChunks).toBeGreaterThan(0);
    expect(totalRows).toBeGreaterThan(0);
  });

  // Simple visitor that just counts entities
  class RowCounterVisitor {
    private count = 0;

    id(id: any): void {}
    labels(labels: string[]): void {}
    property(key: string, value: any): void {}
    startId(id: any): void {}
    endId(id: any): void {}
    type(type: string): void {}

    endOfEntity(): void {
      this.count++;
    }

    getCount(): number {
      return this.count;
    }
  }
});
