import { describe, it, expect } from "vitest";
import {
  NodesBuilderContext,
  ThreadLocalContext,
} from "@/core/loading/construction";
import { PropertyValues } from "@/core/loading/construction";
import { NodeLabelTokens } from "@/core/loading/construction";
import { Concurrency } from "@/concurrency";

/**
 * 🎯 LocalNodesBuilderProvider - Thread-Local Resource Management
 *
 * This tests the sophisticated resource management layer that provides
 * LocalNodesBuilder instances to worker threads efficiently through:
 * - POOLED strategy: Reuse instances across operations (memory efficient)
 * - THREAD-LOCAL strategy: Dedicated instances per thread (contention-free)
 * - AutoCloseable pattern: Automatic resource cleanup
 * - Supplier interface: Clean acquisition pattern
 *
 * THIS IS THE RESOURCE MANAGEMENT FOUNDATION!
 */

// ✅ MOCK LocalNodesBuilder for testing Provider patterns
class MockLocalNodesBuilder {
  private _closed = false;
  private _nodeCount = 0;
  private readonly threadLocalContext: ThreadLocalContext;

  constructor(threadLocalContext: ThreadLocalContext) {
    this.threadLocalContext = threadLocalContext;
  }

  addNode(originalId: number, nodeLabelToken: any): void;
  addNode(
    originalId: number,
    nodeLabelToken: any,
    properties: PropertyValues
  ): void;
  addNode(
    originalId: number,
    nodeLabelToken: any,
    properties?: PropertyValues
  ): void {
    if (this._closed) {
      throw new Error("Cannot add nodes to closed builder");
    }
    this._nodeCount++;

    // Simulate thread-local context usage
    if (properties) {
      this.threadLocalContext.addNodeLabelTokenAndPropertyKeys(
        nodeLabelToken,
        Array.from(properties.propertyKeys())
      );
    } else {
      this.threadLocalContext.addNodeLabelToken(nodeLabelToken);
    }
  }

  close(): void {
    this._closed = true;
  }

  isClosed(): boolean {
    return this._closed;
  }

  nodeCount(): number {
    return this._nodeCount;
  }

  reset(): void {
    this._nodeCount = 0;
    this._closed = false;
  }

  getThreadLocalContext(): ThreadLocalContext {
    return this.threadLocalContext;
  }
}

// ✅ SIMPLIFIED LocalNodesBuilderProvider implementations
abstract class TestableLocalNodesBuilderProvider {
  protected readonly context: NodesBuilderContext;

  static pooled(
    context: NodesBuilderContext
  ): TestableLocalNodesBuilderProvider {
    return new PooledProvider(context);
  }

  static threadLocal(
    context: NodesBuilderContext
  ): TestableLocalNodesBuilderProvider {
    return new ThreadLocalProvider(context);
  }

  protected constructor(context: NodesBuilderContext) {
    this.context = context;
  }

  abstract get(): MockLocalNodesBuilder;
}

// ✅ POOLED IMPLEMENTATION - Reuses instances
class PooledProvider extends TestableLocalNodesBuilderProvider {
  private readonly pool: MockLocalNodesBuilder[] = [];
  private readonly maxPoolSize = 10;

  get(): MockLocalNodesBuilder {
    // Try to reuse from pool
    if (this.pool.length > 0) {
      const builder = this.pool.pop()!;
      builder.reset(); // Clear state for reuse
      return builder;
    }

    // Create new if pool empty
    const threadLocalContext = this.context.threadLocalContext();
    return new MockLocalNodesBuilder(threadLocalContext);
  }

  // Return builder to pool (would be called by AutoCloseable)
  returnToPool(builder: MockLocalNodesBuilder): void {
    if (this.pool.length < this.maxPoolSize) {
      builder.close();
      this.pool.push(builder);
    }
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}

// ✅ THREAD-LOCAL IMPLEMENTATION - One per thread
class ThreadLocalProvider extends TestableLocalNodesBuilderProvider {
  private readonly threadBuilders = new Map<string, MockLocalNodesBuilder>();

  get(): MockLocalNodesBuilder {
    const threadId = this.getCurrentThreadId();

    let builder = this.threadBuilders.get(threadId);
    if (!builder) {
      const threadLocalContext = this.context.threadLocalContext();
      builder = new MockLocalNodesBuilder(threadLocalContext);
      this.threadBuilders.set(threadId, builder);
    }

    return builder;
  }

  private getCurrentThreadId(): string {
    // In browser: always main thread
    // In Node.js: would use worker_threads.threadId
    return "main-thread";
  }

  getThreadBuilderCount(): number {
    return this.threadBuilders.size;
  }

  getThreadBuilders(): Map<string, MockLocalNodesBuilder> {
    return this.threadBuilders;
  }
}

describe("🏭 LocalNodesBuilderProvider - Resource Management", () => {
  function createTestContext(): NodesBuilderContext {
    return NodesBuilderContext.lazy(Concurrency.of(2));
  }

  it("🏗️ CONSTRUCTION: Provider creation patterns", () => {
    console.log("🏗️ === PROVIDER CONSTRUCTION ===");

    const context = createTestContext();

    // ✅ CREATE POOLED PROVIDER
    const pooledProvider = TestableLocalNodesBuilderProvider.pooled(context);
    console.log(`Pooled provider created: ${pooledProvider.constructor.name}`);
    expect(pooledProvider).toBeTruthy();

    // ✅ CREATE THREAD-LOCAL PROVIDER
    const threadLocalProvider =
      TestableLocalNodesBuilderProvider.threadLocal(context);
    console.log(
      `Thread-local provider created: ${threadLocalProvider.constructor.name}`
    );
    expect(threadLocalProvider).toBeTruthy();

    console.log("✅ Provider construction works correctly");
  });

  it("🏊 POOLED STRATEGY: Instance reuse", () => {
    console.log("🏊 === POOLED STRATEGY TESTING ===");

    const context = createTestContext();
    const pooledProvider = TestableLocalNodesBuilderProvider.pooled(
      context
    ) as PooledProvider;

    console.log(`Initial pool size: ${pooledProvider.getPoolSize()}`);
    expect(pooledProvider.getPoolSize()).toBe(0);

    // ✅ GET FIRST BUILDER (creates new)
    const builder1 = pooledProvider.get();
    console.log(`First builder acquired: ${builder1.constructor.name}`);
    expect(builder1).toBeTruthy();
    expect(builder1.isClosed()).toBe(false);

    // ✅ USE BUILDER
    const token = NodeLabelTokens.of("User");
    builder1.addNode(101, token);
    builder1.addNode(102, token);
    expect(builder1.nodeCount()).toBe(2);

    // ✅ RETURN TO POOL (simulate AutoCloseable)
    pooledProvider.returnToPool(builder1);
    console.log(`Pool size after return: ${pooledProvider.getPoolSize()}`);
    expect(pooledProvider.getPoolSize()).toBe(1);
    expect(builder1.isClosed()).toBe(true);

    // ✅ GET SECOND BUILDER (should reuse)
    const builder2 = pooledProvider.get();
    console.log(
      `Second builder acquired - same instance: ${builder2 === builder1}`
    );
    expect(builder2).toBe(builder1); // Same instance
    expect(builder2.isClosed()).toBe(false); // Reset after reuse
    expect(builder2.nodeCount()).toBe(0); // State cleared

    console.log("✅ Pooled strategy reuses instances correctly");
  });

  it("🧵 THREAD-LOCAL STRATEGY: Per-thread instances", () => {
    console.log("🧵 === THREAD-LOCAL STRATEGY TESTING ===");

    const context = createTestContext();
    const threadLocalProvider = TestableLocalNodesBuilderProvider.threadLocal(
      context
    ) as ThreadLocalProvider;

    console.log(
      `Initial thread builders: ${threadLocalProvider.getThreadBuilderCount()}`
    );
    expect(threadLocalProvider.getThreadBuilderCount()).toBe(0);

    // ✅ GET BUILDER FOR FIRST "THREAD"
    const builder1 = threadLocalProvider.get();
    console.log(`First thread builder acquired`);
    expect(threadLocalProvider.getThreadBuilderCount()).toBe(1);

    // ✅ GET BUILDER AGAIN (should be same instance)
    const builder2 = threadLocalProvider.get();
    console.log(`Second acquisition - same instance: ${builder2 === builder1}`);
    expect(builder2).toBe(builder1); // Same instance for same thread
    expect(threadLocalProvider.getThreadBuilderCount()).toBe(1); // Still just one

    // ✅ USE BUILDER
    const token = NodeLabelTokens.of("User");
    builder1.addNode(201, token);
    builder2.addNode(202, token); // Same builder
    expect(builder1.nodeCount()).toBe(2);
    expect(builder2.nodeCount()).toBe(2); // Same instance

    console.log("✅ Thread-local strategy provides dedicated instances");
  });

  it("🔄 RESOURCE LIFECYCLE: AutoCloseable simulation", () => {
    console.log("🔄 === RESOURCE LIFECYCLE ===");

    const context = createTestContext();
    const pooledProvider = TestableLocalNodesBuilderProvider.pooled(
      context
    ) as PooledProvider;

    // ✅ SIMULATE try-with-resources PATTERN
    console.log("Simulating try-with-resources pattern...");

    function processNodesWithResource() {
      const builder = pooledProvider.get();

      try {
        // Use the builder
        const token = NodeLabelTokens.of(["User", "Customer"]);
        const props = PropertyValues.ofObject({
          name: "Test User",
          active: true,
        });

        builder.addNode(301, token, props);
        builder.addNode(302, token);

        console.log(`Processed ${builder.nodeCount()} nodes`);
        return builder.nodeCount();
      } finally {
        // Simulate AutoCloseable cleanup
        pooledProvider.returnToPool(builder);
      }
    }

    const processedCount = processNodesWithResource();
    expect(processedCount).toBe(2);

    console.log(
      `Pool size after auto-cleanup: ${pooledProvider.getPoolSize()}`
    );
    expect(pooledProvider.getPoolSize()).toBe(1); // Builder returned to pool

    console.log("✅ Resource lifecycle management works correctly");
  });

  it("⚡ PERFORMANCE: Provider strategy comparison", () => {
    console.log("⚡ === PERFORMANCE COMPARISON ===");

    const context = createTestContext();
    const pooledProvider = TestableLocalNodesBuilderProvider.pooled(
      context
    ) as PooledProvider;
    const threadLocalProvider = TestableLocalNodesBuilderProvider.threadLocal(
      context
    ) as ThreadLocalProvider;

    // ✅ SIMULATE MULTIPLE SHORT OPERATIONS (favors pooling)
    console.log("Testing multiple short operations...");

    const startPooled = Date.now();
    for (let i = 0; i < 100; i++) {
      const builder = pooledProvider.get();
      builder.addNode(i, NodeLabelTokens.of("TestNode"));
      pooledProvider.returnToPool(builder);
    }
    const pooledTime = Date.now() - startPooled;

    console.log(`Pooled strategy: 100 operations in ${pooledTime}ms`);
    console.log(
      `Pool efficiency: ${pooledProvider.getPoolSize()} instances reused`
    );

    // ✅ SIMULATE SINGLE LONG OPERATION (favors thread-local)
    const startThreadLocal = Date.now();
    const longRunningBuilder = threadLocalProvider.get();

    for (let i = 0; i < 100; i++) {
      longRunningBuilder.addNode(i + 1000, NodeLabelTokens.of("TestNode"));
    }

    const threadLocalTime = Date.now() - startThreadLocal;
    console.log(
      `Thread-local strategy: 100 operations in ${threadLocalTime}ms`
    );
    console.log(
      `Thread builders created: ${threadLocalProvider.getThreadBuilderCount()}`
    );

    expect(pooledProvider.getPoolSize()).toBeGreaterThan(0);
    expect(threadLocalProvider.getThreadBuilderCount()).toBe(1);

    console.log(
      "✅ Performance characteristics demonstrate strategy differences"
    );
  });

  it("🎯 INTEGRATION: Context coordination", () => {
    console.log("🎯 === CONTEXT INTEGRATION ===");

    const context = createTestContext();
    const provider = TestableLocalNodesBuilderProvider.threadLocal(context);

    // ✅ VERIFY CONTEXT INTEGRATION
    const builder = provider.get();
    const threadLocalContext = builder.getThreadLocalContext();

    console.log(
      `ThreadLocalContext integrated: ${threadLocalContext.constructor.name}`
    );
    expect(threadLocalContext).toBeTruthy();

    // ✅ USE CONTEXT THROUGH BUILDER
    const userToken = NodeLabelTokens.of(["User", "Premium"]);
    const properties = PropertyValues.ofObject({
      name: "Premium User",
      level: "GOLD",
      verified: true,
    });

    builder.addNode(401, userToken, properties);

    // ✅ VERIFY CONTEXT STATE
    const tokenMapping = threadLocalContext.threadLocalTokenToNodeLabels();
    console.log(`Token mappings created: ${tokenMapping.size}`);
    expect(tokenMapping.size).toBeGreaterThan(0);

    // ✅ VERIFY PROPERTY BUILDER ACCESS
    const nameBuilder = threadLocalContext.nodePropertyBuilder("name");
    const levelBuilder = threadLocalContext.nodePropertyBuilder("level");

    expect(nameBuilder).toBeTruthy();
    expect(levelBuilder).toBeTruthy();
    console.log("✅ Property builders accessible through context");

    console.log("✅ Context integration works correctly");
  });

  it("🔧 STRATEGY SELECTION: When to use which provider", () => {
    console.log("🔧 === STRATEGY SELECTION GUIDE ===");

    console.log("📋 POOLED STRATEGY - Best for:");
    console.log("  ✅ Short-lived operations (CSV row processing)");
    console.log("  ✅ Memory-constrained environments");
    console.log("  ✅ High operation frequency with small batches");
    console.log("  ✅ Microservice architectures");

    console.log("📋 THREAD-LOCAL STRATEGY - Best for:");
    console.log("  ✅ Long-running operations (large file processing)");
    console.log("  ✅ CPU-intensive workloads");
    console.log("  ✅ True multi-threaded environments");
    console.log("  ✅ When thread affinity matters");

    // ✅ DEMONSTRATE DECISION LOGIC
    const context = createTestContext();

    function chooseProvider(
      operationType: "short" | "long",
      concurrency: number
    ) {
      if (operationType === "short" || concurrency === 1) {
        console.log(`  → Choosing POOLED for ${operationType} operations`);
        return TestableLocalNodesBuilderProvider.pooled(context);
      } else {
        console.log(
          `  → Choosing THREAD-LOCAL for ${operationType} operations`
        );
        return TestableLocalNodesBuilderProvider.threadLocal(context);
      }
    }

    const shortOpProvider = chooseProvider("short", 1);
    const longOpProvider = chooseProvider("long", 4);

    expect(shortOpProvider.constructor.name).toBe("PooledProvider");
    expect(longOpProvider.constructor.name).toBe("ThreadLocalProvider");

    console.log("✅ Strategy selection logic demonstrated");
  });

  it("🧵 CONCURRENT SIMULATION: Multiple providers", () => {
    console.log("🧵 === CONCURRENT PROVIDER SIMULATION ===");

    const context = createTestContext();

    // ✅ SIMULATE MULTIPLE WORKER THREADS
    const workers = [
      {
        id: "worker-1",
        provider: TestableLocalNodesBuilderProvider.threadLocal(context),
      },
      {
        id: "worker-2",
        provider: TestableLocalNodesBuilderProvider.threadLocal(context),
      },
      {
        id: "worker-3",
        provider: TestableLocalNodesBuilderProvider.pooled(context),
      },
      {
        id: "worker-4",
        provider: TestableLocalNodesBuilderProvider.pooled(context),
      },
    ];

    console.log(`Created ${workers.length} worker simulations`);

    // ✅ SIMULATE CONCURRENT PROCESSING
    const results = workers.map((worker) => {
      const builder = worker.provider.get();

      // Each worker processes different ID ranges
      const startId = parseInt(worker.id.split("-")[1]) * 1000;
      const token = NodeLabelTokens.of(`${worker.id}-Node`);

      for (let i = 0; i < 10; i++) {
        builder.addNode(startId + i, token);
      }

      return {
        workerId: worker.id,
        providerType: worker.provider.constructor.name,
        nodesProcessed: builder.nodeCount(),
      };
    });

    // ✅ VERIFY CONCURRENT RESULTS
    console.log("Worker results:");
    results.forEach((result) => {
      console.log(
        `  ${result.workerId} (${result.providerType}): ${result.nodesProcessed} nodes`
      );
      expect(result.nodesProcessed).toBe(10);
    });

    // ✅ VERIFY CONTEXT COORDINATION
    const propertyBuilders = context.nodePropertyBuilders();
    const labelMappings = context.nodeLabelTokenToPropertyKeys();

    console.log(`Shared property builders: ${propertyBuilders.size}`);
    console.log(`Label mapping contributions: ${labelMappings.length}`);

    // Each worker should contribute to shared context
    expect(labelMappings.length).toBeGreaterThan(0);

    console.log("✅ Concurrent provider coordination works");
  });

  it("🎯 REAL-WORLD: CSV import provider usage", () => {
    console.log("🎯 === CSV IMPORT PROVIDER SIMULATION ===");

    const context = createTestContext();

    // ✅ SIMULATE CSV IMPORT CONFIGURATION
    const csvConfig = {
      fileSize: "large", // large files → thread-local
      concurrency: 4,
      batchSize: 1000,
    };

    const provider =
      csvConfig.fileSize === "large"
        ? TestableLocalNodesBuilderProvider.threadLocal(context)
        : TestableLocalNodesBuilderProvider.pooled(context);

    console.log(
      `Selected ${provider.constructor.name} for ${csvConfig.fileSize} CSV import`
    );

    // ✅ SIMULATE CSV CHUNK PROCESSING
    function processCsvChunk(chunkId: number, rows: any[]) {
      const builder = provider.get();

      console.log(`Processing chunk ${chunkId} with ${rows.length} rows...`);

      for (const row of rows) {
        const token = NodeLabelTokens.of(row.labels);
        const properties = PropertyValues.ofObject(row.properties);
        builder.addNode(row.id, token, properties);
      }

      return builder.nodeCount();
    }

    // ✅ SIMULATE MULTIPLE CSV CHUNKS
    const csvChunks = [
      {
        chunkId: 1,
        rows: [
          {
            id: 1001,
            labels: ["User"],
            properties: { name: "Alice", dept: "Engineering" },
          },
          {
            id: 1002,
            labels: ["User"],
            properties: { name: "Bob", dept: "Marketing" },
          },
        ],
      },
      {
        chunkId: 2,
        rows: [
          {
            id: 2001,
            labels: ["Company"],
            properties: { name: "Tech Corp", industry: "Tech" },
          },
          {
            id: 2002,
            labels: ["Company"],
            properties: { name: "Marketing Inc", industry: "Services" },
          },
        ],
      },
    ];

    const chunkResults = csvChunks.map((chunk) =>
      processCsvChunk(chunk.chunkId, chunk.rows)
    );

    console.log(
      `Chunk processing results: ${chunkResults.join(", ")} nodes per chunk`
    );
    expect(chunkResults).toEqual([2, 2]);

    // ✅ VERIFY SCHEMA DISCOVERY
    const finalPropertyBuilders = context.nodePropertyBuilders();
    console.log(
      `Properties discovered: ${Array.from(finalPropertyBuilders.keys()).join(
        ", "
      )}`
    );

    expect(finalPropertyBuilders.has("name")).toBe(true);
    expect(finalPropertyBuilders.has("dept")).toBe(true);
    expect(finalPropertyBuilders.has("industry")).toBe(true);

    console.log(
      "✅ CSV import provider usage demonstrates real-world patterns"
    );
  });
});
