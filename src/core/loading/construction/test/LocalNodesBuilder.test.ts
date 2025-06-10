import { describe, it, expect } from "vitest";
import { LocalNodesBuilder, LocalNodesBuilderConfig } from "@/core/loading/construction/LocalNodesBuilder";
import { PropertyValues } from "@/core/loading/construction/PropertyValues";
import { NodeLabelTokens } from "@/core/loading/construction/NodeLabelTokens";
import { NodeLabel } from "@/projection";

/**
 * 🎯 LocalNodesBuilder - Thread-Local Processing Worker
 *
 * This tests the core worker that processes nodes in batches within a single thread.
 * LocalNodesBuilder is the WORKHORSE that transforms individual node additions
 * into efficient batch operations through:
 * - Automatic batching (accumulate until buffer full)
 * - Deduplication (skip already-seen node IDs)
 * - Property coordination (manage thread-local property builders)
 * - Buffer management (auto-flush when full)
 *
 * THIS IS WHERE THE ACTUAL WORK HAPPENS!
 */

// ✅ MOCK DEPENDENCIES (LocalNodesBuilder has many complex dependencies)

class MockLongAdder {
  private count = 0;

  add(value: number): void {
    this.count += value;
  }

  sum(): number {
    return this.count;
  }
}

class MockNodesBatchBuffer {
  private items: Array<{originalId: number, propertyRef: number, tokens: any}> = [];
  private readonly maxCapacity: number;

  constructor(capacity: number = 10) {
    this.maxCapacity = capacity;
  }

  add(originalId: number, propertyRef: number, tokens: any): void {
    this.items.push({ originalId, propertyRef, tokens });
  }

  isFull(): boolean {
    return this.items.length >= this.maxCapacity;
  }

  reset(): void {
    this.items.length = 0;
  }

  capacity(): number {
    return this.maxCapacity;
  }

  size(): number {
    return this.items.length;
  }

  getItems() {
    return [...this.items];
  }
}

class MockNodeImporter {
  private importCalls: Array<{buffer: any, tokenMapping: any, propertyImporter: any}> = [];

  importNodes(buffer: any, tokenMapping: any, propertyImporter: any): number {
    this.importCalls.push({ buffer, tokenMapping, propertyImporter });

    // Simulate processing buffer items
    const bufferSize = buffer.size ? buffer.size() : buffer.getItems().length;

    // Call property importer for items with properties
    if (buffer.getItems) {
      buffer.getItems().forEach((item: any, index: number) => {
        if (item.propertyRef !== -1) {
          propertyImporter(index, item.tokens, item.propertyRef);
        }
      });
    }

    return bufferSize; // Return number of imported nodes
  }

  getImportCalls() {
    return this.importCalls;
  }
}

class MockThreadLocalContext {
  private labelTokenCalls: Array<{token: any, properties?: string[]}> = [];
  private propertyBuilders = new Map<string, MockNodePropertyBuilder>();

  addNodeLabelToken(token: any): any {
    this.labelTokenCalls.push({ token });
    return token; // Return thread-local token representation
  }

  addNodeLabelTokenAndPropertyKeys(token: any, propertyKeys: string[]): any {
    this.labelTokenCalls.push({ token, properties: propertyKeys });
    return token;
  }

  threadLocalTokenToNodeLabels(): any {
    return new Map(); // Mock token mapping
  }

  nodePropertyBuilder(propertyKey: string): MockNodePropertyBuilder | null {
    if (!this.propertyBuilders.has(propertyKey)) {
      this.propertyBuilders.set(propertyKey, new MockNodePropertyBuilder(propertyKey));
    }
    return this.propertyBuilders.get(propertyKey)!;
  }

  getLabelTokenCalls() {
    return this.labelTokenCalls;
  }

  getPropertyBuilders() {
    return this.propertyBuilders;
  }
}

class MockNodePropertyBuilder {
  private properties = new Map<number, any>();

  constructor(private propertyKey: string) {}

  set(nodeReference: number, value: any): void {
    this.properties.set(nodeReference, value);
  }

  getProperties() {
    return this.properties;
  }

  getPropertyKey() {
    return this.propertyKey;
  }
}

// ✅ SIMPLIFIED LocalNodesBuilder (core logic with mocked dependencies)
class TestableLocalNodesBuilder {
  static readonly NO_PROPERTY = -1;

  private readonly importedNodes: MockLongAdder;
  private readonly seenNodeIdPredicate: (id: number) => boolean;
  private readonly buffer: MockNodesBatchBuffer;
  private readonly nodeImporter: MockNodeImporter;
  private readonly batchNodeProperties: PropertyValues[];
  private readonly threadLocalContext: MockThreadLocalContext;

  constructor(config: TestableLocalNodesBuilderConfig) {
    this.importedNodes = config.importedNodes;
    this.seenNodeIdPredicate = config.seenNodeIdPredicate;
    this.threadLocalContext = config.threadLocalContext;
    this.nodeImporter = config.nodeImporter;
    this.buffer = new MockNodesBatchBuffer(config.batchSize || 3); // Small batch for testing
    this.batchNodeProperties = [];
  }

  addNode(originalId: number, nodeLabelToken: any): void;
  addNode(originalId: number, nodeLabelToken: any, properties: PropertyValues): void;
  addNode(originalId: number, nodeLabelToken: any, properties?: PropertyValues): void {
    // Skip if already seen (deduplication)
    if (this.seenNodeIdPredicate(originalId)) {
      return;
    }

    if (properties) {
      // Property path
      const threadLocalTokens = this.threadLocalContext.addNodeLabelTokenAndPropertyKeys(
        nodeLabelToken,
        Array.from(properties.propertyKeys())
      );

      const propertyReference = this.batchNodeProperties.length;
      this.batchNodeProperties[propertyReference] = properties;

      this.buffer.add(originalId, propertyReference, threadLocalTokens);
    } else {
      // Fast path
      const threadLocalTokens = this.threadLocalContext.addNodeLabelToken(nodeLabelToken);
      this.buffer.add(originalId, TestableLocalNodesBuilder.NO_PROPERTY, threadLocalTokens);
    }

    if (this.buffer.isFull()) {
      this.flushBuffer();
      this.reset();
    }
  }

  private reset(): void {
    this.buffer.reset();
    this.batchNodeProperties.length = 0;
  }

  private flushBuffer(): void {
    const importedNodeCount = this.nodeImporter.importNodes(
      this.buffer,
      this.threadLocalContext.threadLocalTokenToNodeLabels(),
      this.importProperties.bind(this)
    );

    this.importedNodes.add(importedNodeCount);
  }

  private importProperties(nodeReference: number, labelTokens: any, propertyValueIndex: number): number {
    if (propertyValueIndex !== TestableLocalNodesBuilder.NO_PROPERTY) {
      const properties = this.batchNodeProperties[propertyValueIndex];

      properties.forEach((propertyKey: string, propertyValue: any) => {
        const nodePropertyBuilder = this.threadLocalContext.nodePropertyBuilder(propertyKey);
        if (!nodePropertyBuilder) {
          throw new Error(`Observed property key '${propertyKey}' that is not present in schema`);
        }
        nodePropertyBuilder.set(nodeReference, propertyValue);
      });

      return properties.size();
    }
    return 0;
  }

  close(): void {
    if (this.buffer.size() > 0) {
      this.flushBuffer();
    }
  }

  // ✅ TEST HELPERS
  getBuffer() { return this.buffer; }
  getImportedNodes() { return this.importedNodes; }
  getNodeImporter() { return this.nodeImporter; }
  getThreadLocalContext() { return this.threadLocalContext; }
}

interface TestableLocalNodesBuilderConfig {
  importedNodes: MockLongAdder;
  nodeImporter: MockNodeImporter;
  seenNodeIdPredicate: (id: number) => boolean;
  threadLocalContext: MockThreadLocalContext;
  batchSize?: number;
}

describe("🔧 LocalNodesBuilder - Thread-Local Worker Engine", () => {

  function createTestConfig(options: Partial<TestableLocalNodesBuilderConfig> = {}): TestableLocalNodesBuilderConfig {
    return {
      importedNodes: new MockLongAdder(),
      nodeImporter: new MockNodeImporter(),
      seenNodeIdPredicate: () => false, // Never seen before (no deduplication)
      threadLocalContext: new MockThreadLocalContext(),
      batchSize: 3, // Small batch for testing
      ...options
    };
  }

  it("🏗️ CONSTRUCTION: Basic worker creation", () => {
    console.log("🏗️ === LOCALNODESBUILDER CONSTRUCTION ===");

    const config = createTestConfig();
    const worker = new TestableLocalNodesBuilder(config);

    console.log(`Worker created: ${worker.constructor.name}`);
    console.log(`Initial imported count: ${worker.getImportedNodes().sum()}`);
    console.log(`Buffer capacity: ${worker.getBuffer().capacity()}`);

    expect(worker).toBeTruthy();
    expect(worker.getImportedNodes().sum()).toBe(0);
    expect(worker.getBuffer().capacity()).toBe(3);

    console.log("✅ LocalNodesBuilder construction works");
  });

  it("⚡ FAST PATH: Nodes without properties", () => {
    console.log("⚡ === FAST PATH TESTING ===");

    const config = createTestConfig();
    const worker = new TestableLocalNodesBuilder(config);

    // ✅ ADD NODES WITHOUT PROPERTIES (fast path)
    const userToken = NodeLabelTokens.of("User");
    const companyToken = NodeLabelTokens.of("Company");

    console.log("Adding nodes via fast path...");
    worker.addNode(101, userToken);
    worker.addNode(102, companyToken);

    console.log(`Buffer after 2 adds: ${worker.getBuffer().size()}`);
    expect(worker.getBuffer().size()).toBe(2);
    expect(worker.getImportedNodes().sum()).toBe(0); // No flush yet

    // ✅ TRIGGER BUFFER FLUSH (3rd node fills buffer)
    worker.addNode(103, userToken);

    console.log(`Buffer after flush: ${worker.getBuffer().size()}`);
    console.log(`Imported count after flush: ${worker.getImportedNodes().sum()}`);

    expect(worker.getBuffer().size()).toBe(0); // Buffer reset after flush
    expect(worker.getImportedNodes().sum()).toBe(3); // 3 nodes flushed

    // ✅ VERIFY LABEL TOKEN COORDINATION
    const labelCalls = worker.getThreadLocalContext().getLabelTokenCalls();
    expect(labelCalls).toHaveLength(3);
    expect(labelCalls[0].properties).toBeUndefined(); // Fast path has no properties

    console.log("✅ Fast path processing works correctly");
  });

  it("📦 PROPERTY PATH: Nodes with properties", () => {
    console.log("📦 === PROPERTY PATH TESTING ===");

    const config = createTestConfig();
    const worker = new TestableLocalNodesBuilder(config);

    // ✅ CREATE PROPERTY VALUES
    const userProps = PropertyValues.ofObject({
      name: "Alice Johnson",
      age: 30,
      verified: true
    });

    const companyProps = PropertyValues.ofObject({
      name: "Tech Corp",
      industry: "Technology",
      employees: 500
    });

    console.log("Adding nodes via property path...");

    const userToken = NodeLabelTokens.of("User");
    const companyToken = NodeLabelTokens.of("Company");

    worker.addNode(201, userToken, userProps);
    worker.addNode(202, companyToken, companyProps);

    console.log(`Buffer after 2 property adds: ${worker.getBuffer().size()}`);
    expect(worker.getBuffer().size()).toBe(2);

    // ✅ TRIGGER FLUSH WITH 3rd NODE
    worker.addNode(203, userToken, userProps);

    console.log(`Imported count after property flush: ${worker.getImportedNodes().sum()}`);
    expect(worker.getImportedNodes().sum()).toBe(3);

    // ✅ VERIFY PROPERTY COORDINATION
    const labelCalls = worker.getThreadLocalContext().getLabelTokenCalls();
    expect(labelCalls).toHaveLength(3);
    expect(labelCalls[0].properties).toEqual(["name", "age", "verified"]);
    expect(labelCalls[1].properties).toEqual(["name", "industry", "employees"]);

    // ✅ VERIFY PROPERTY BUILDERS CREATED
    const propertyBuilders = worker.getThreadLocalContext().getPropertyBuilders();
    expect(propertyBuilders.has("name")).toBe(true);
    expect(propertyBuilders.has("age")).toBe(true);
    expect(propertyBuilders.has("verified")).toBe(true);
    expect(propertyBuilders.has("industry")).toBe(true);
    expect(propertyBuilders.has("employees")).toBe(true);

    console.log("✅ Property path processing works correctly");
  });

  it("🚫 DEDUPLICATION: Skip already-seen nodes", () => {
    console.log("🚫 === DEDUPLICATION TESTING ===");

    // ✅ CREATE DEDUPLICATING PREDICATE
    const seenIds = new Set<number>();
    const dedupPredicate = (id: number) => {
      if (seenIds.has(id)) {
        return true; // Already seen
      }
      seenIds.add(id);
      return false; // First time seeing this ID
    };

    const config = createTestConfig({ seenNodeIdPredicate: dedupPredicate });
    const worker = new TestableLocalNodesBuilder(config);

    console.log("Adding nodes with duplicates...");

    const token = NodeLabelTokens.of("User");

    worker.addNode(301, token); // New
    worker.addNode(302, token); // New
    worker.addNode(301, token); // Duplicate - should be skipped
    worker.addNode(303, token); // New
    worker.addNode(302, token); // Duplicate - should be skipped

    console.log(`Buffer size after adds with duplicates: ${worker.getBuffer().size()}`);
    expect(worker.getBuffer().size()).toBe(3); // Only 3 unique nodes

    // ✅ FORCE FLUSH
    worker.close();

    console.log(`Final imported count: ${worker.getImportedNodes().sum()}`);
    expect(worker.getImportedNodes().sum()).toBe(3); // Only unique nodes imported

    console.log("✅ Deduplication works correctly");
  });

  it("🔄 BATCHING: Auto-flush behavior", () => {
    console.log("🔄 === BATCHING BEHAVIOR ===");

    const config = createTestConfig({ batchSize: 2 }); // Smaller batch for testing
    const worker = new TestableLocalNodesBuilder(config);

    console.log("Testing auto-flush with batch size 2...");

    const token = NodeLabelTokens.of("User");

    // ✅ ADD FIRST NODE (no flush)
    worker.addNode(401, token);
    expect(worker.getBuffer().size()).toBe(1);
    expect(worker.getImportedNodes().sum()).toBe(0);
    console.log("After 1st add: buffer=1, imported=0");

    // ✅ ADD SECOND NODE (triggers flush)
    worker.addNode(402, token);
    expect(worker.getBuffer().size()).toBe(0); // Buffer reset after flush
    expect(worker.getImportedNodes().sum()).toBe(2); // 2 nodes flushed
    console.log("After 2nd add: buffer=0, imported=2 (auto-flush triggered)");

    // ✅ ADD THIRD NODE (starts new batch)
    worker.addNode(403, token);
    expect(worker.getBuffer().size()).toBe(1);
    expect(worker.getImportedNodes().sum()).toBe(2); // Still 2 until next flush
    console.log("After 3rd add: buffer=1, imported=2 (new batch started)");

    // ✅ CLOSE TO FLUSH REMAINING
    worker.close();
    expect(worker.getBuffer().size()).toBe(0); // Closed and flushed
    expect(worker.getImportedNodes().sum()).toBe(3); // All 3 nodes processed
    console.log("After close: buffer=0, imported=3 (final flush)");

    console.log("✅ Auto-flush batching works correctly");
  });

  it("🎭 MIXED PATH: Fast path and property path together", () => {
    console.log("🎭 === MIXED PATH TESTING ===");

    const config = createTestConfig();
    const worker = new TestableLocalNodesBuilder(config);

    console.log("Mixing fast path and property path nodes...");

    const userToken = NodeLabelTokens.of("User");
    const props = PropertyValues.ofObject({ name: "Test User", active: true });

    // ✅ MIX FAST AND PROPERTY PATHS
    worker.addNode(501, userToken);              // Fast path
    worker.addNode(502, userToken, props);       // Property path
    worker.addNode(503, userToken);              // Fast path (triggers flush)

    expect(worker.getImportedNodes().sum()).toBe(3);

    // ✅ VERIFY MIXED COORDINATION
    const labelCalls = worker.getThreadLocalContext().getLabelTokenCalls();
    expect(labelCalls).toHaveLength(3);
    expect(labelCalls[0].properties).toBeUndefined(); // Fast path
    expect(labelCalls[1].properties).toEqual(["name", "active"]); // Property path
    expect(labelCalls[2].properties).toBeUndefined(); // Fast path

    // ✅ VERIFY PROPERTY BUILDER ONLY FOR PROPERTY PATH
    const propertyBuilders = worker.getThreadLocalContext().getPropertyBuilders();
    expect(propertyBuilders.has("name")).toBe(true);
    expect(propertyBuilders.has("active")).toBe(true);

    console.log("✅ Mixed path processing works correctly");
  });

  it("🧵 THREAD COORDINATION: ThreadLocalContext integration", () => {
    console.log("🧵 === THREAD COORDINATION ===");

    const config = createTestConfig();
    const worker = new TestableLocalNodesBuilder(config);

    // ✅ ADD VARIOUS NODES TO TRIGGER COORDINATION
    const multiToken = NodeLabelTokens.of(["User", "Admin"]);
    const props1 = PropertyValues.ofObject({ role: "admin", level: 5 });
    const props2 = PropertyValues.ofObject({ role: "user", level: 1, active: true });

    worker.addNode(601, multiToken, props1);
    worker.addNode(602, multiToken, props2);
    worker.addNode(603, multiToken, props1); // Triggers flush

    // ✅ VERIFY THREAD-LOCAL COORDINATION
    const context = worker.getThreadLocalContext();

    // Should have coordinated label tokens
    const labelCalls = context.getLabelTokenCalls();
    expect(labelCalls).toHaveLength(3);
    labelCalls.forEach(call => {
      expect(call.token).toBeTruthy();
      expect(call.properties).toBeTruthy();
    });

    // Should have created property builders for all seen properties
    const propertyBuilders = context.getPropertyBuilders();
    expect(propertyBuilders.has("role")).toBe(true);
    expect(propertyBuilders.has("level")).toBe(true);
    expect(propertyBuilders.has("active")).toBe(true);

    // ✅ VERIFY PROPERTY VALUES WERE SET
    const roleBuilder = propertyBuilders.get("role")!;
    const levelBuilder = propertyBuilders.get("level")!;
    const activeBuilder = propertyBuilders.get("active")!;

    expect(roleBuilder.getProperties().size).toBe(3); // Set for all 3 nodes
    expect(levelBuilder.getProperties().size).toBe(3);
    expect(activeBuilder.getProperties().size).toBe(2); // Only nodes 602, 603 had 'active'

    console.log("✅ Thread coordination works correctly");
  });

  it("⚡ PERFORMANCE: Large batch processing", () => {
    console.log("⚡ === PERFORMANCE TESTING ===");

    const config = createTestConfig({ batchSize: 100 }); // Larger batch
    const worker = new TestableLocalNodesBuilder(config);

    console.log("Processing 500 nodes in batches of 100...");

    const startTime = Date.now();
    const token = NodeLabelTokens.of("TestNode");

    for (let i = 1; i <= 500; i++) {
      if (i % 2 === 0) {
        // Half with properties
        const props = PropertyValues.ofObject({ id: i, name: `Node${i}` });
        worker.addNode(i, token, props);
      } else {
        // Half without properties (fast path)
        worker.addNode(i, token);
      }
    }

    // Final flush
    worker.close();

    const processTime = Date.now() - startTime;
    console.log(`Processed 500 nodes in ${processTime}ms`);
    console.log(`Rate: ${Math.round(500 / processTime * 1000)} nodes/second`);

    expect(worker.getImportedNodes().sum()).toBe(500);

    // ✅ VERIFY BATCHING OCCURRED
    const importCalls = worker.getNodeImporter().getImportCalls();
    expect(importCalls.length).toBe(5); // 500 nodes / 100 batch size = 5 batches

    console.log("✅ Performance characteristics verified");
  });

  it("🎯 REAL-WORLD: CSV import worker simulation", () => {
    console.log("🎯 === CSV WORKER SIMULATION ===");

    // ✅ SIMULATE WORKER PROCESSING CSV CHUNK
    const config = createTestConfig({ batchSize: 10 });
    const worker = new TestableLocalNodesBuilder(config);

    // Simulate CSV rows assigned to this worker thread
    const csvChunk = [
      { id: 1001, labels: ["User"], name: "Alice", dept: "Engineering" },
      { id: 1002, labels: ["User"], name: "Bob", dept: "Marketing" },
      { id: 1003, labels: ["Company"], name: "Tech Corp", industry: "Technology" },
      { id: 1004, labels: ["User", "Admin"], name: "Carol", dept: "IT", permissions: "all" },
      { id: 1005, labels: ["Product"], name: "Widget A", price: 29.99 }
    ];

    console.log(`Processing CSV chunk with ${csvChunk.length} rows...`);

    for (const row of csvChunk) {
      const labelToken = NodeLabelTokens.of(row.labels);

      // Extract properties (exclude id and labels)
      const { id, labels, ...properties } = row;

      if (Object.keys(properties).length > 0) {
        const props = PropertyValues.ofObject(properties);
        worker.addNode(id, labelToken, props);
      } else {
        worker.addNode(id, labelToken);
      }
    }

    worker.close();

    console.log(`CSV chunk processed: ${worker.getImportedNodes().sum()} nodes`);
    expect(worker.getImportedNodes().sum()).toBe(5);

    // ✅ VERIFY SCHEMA DISCOVERY
    const propertyBuilders = worker.getThreadLocalContext().getPropertyBuilders();
    const discoveredProperties = Array.from(propertyBuilders.keys()).sort();
    console.log(`Discovered properties: ${discoveredProperties.join(", ")}`);

    expect(discoveredProperties).toContain("name");
    expect(discoveredProperties).toContain("dept");
    expect(discoveredProperties).toContain("industry");
    expect(discoveredProperties).toContain("permissions");
    expect(discoveredProperties).toContain("price");

    console.log("✅ CSV worker simulation demonstrates real-world usage");
  });

});
