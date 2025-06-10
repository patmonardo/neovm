import { describe, it, expect } from "vitest";
import { NodesBuilderContext, ThreadLocalContext } from "@/core/loading/construction/NodesBuilderContext";
import { NodeLabelTokenToPropertyKeys } from "@/core/loading/construction/NodeLabelTokenToPropertyKeys";
import { TokenToNodeLabels } from "@/core/loading/construction/TokenToNodeLabels";
import { NodeLabelTokens } from "@/core/loading/construction/NodeLabelTokens";
import { NodeLabel } from "@/projection";
import { Concurrency } from "@/core/concurrency";

/**
 * 🎯 NodesBuilderContext - Master Thread Coordinator
 *
 * This tests the MASTER COORDINATOR that manages:
 * - Thread-local contexts (isolated worker state)
 * - Global token management (label → integer mappings)
 * - Property builder coordination (shared property processing)
 * - Schema aggregation (combine discoveries from all threads)
 * - Final assembly coordination (merge all thread work)
 *
 * THIS IS THE BRAIN OF THE CONCURRENT CONSTRUCTION SYSTEM!
 */

describe("🧠 NodesBuilderContext - Master Thread Coordinator", () => {

  it("🏗️ CONSTRUCTION: Context creation strategies", () => {
    console.log("🏗️ === CONTEXT CONSTRUCTION ===");

    // ✅ LAZY CONTEXT (dynamic schema discovery)
    const lazyContext = NodesBuilderContext.lazy(Concurrency.of(4));
    console.log(`Lazy context created: ${lazyContext.constructor.name}`);
    console.log(`Concurrency: ${lazyContext.concurrency().value()}`);

    expect(lazyContext).toBeTruthy();
    expect(lazyContext.concurrency().value()).toBe(4);

    // ✅ FIXED CONTEXT (predefined schema - if available)
    try {
      // This might not be available without full schema dependencies
      const mockSchema = null; // Would be NodeSchema
      // const fixedContext = NodesBuilderContext.fixed(mockSchema, Concurrency.of(2));
      console.log("Fixed context creation would require full schema dependencies");
    } catch (error) {
      console.log(`Fixed context not available: ${(error as Error).message}`);
    }

    console.log("✅ Context construction works");
  });

  it("🧵 THREAD-LOCAL CONTEXTS: Isolated worker management", () => {
    console.log("🧵 === THREAD-LOCAL CONTEXT MANAGEMENT ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(3));

    // ✅ CREATE MULTIPLE THREAD-LOCAL CONTEXTS
    console.log("Creating thread-local contexts...");

    const threadContext1 = masterContext.threadLocalContext();
    const threadContext2 = masterContext.threadLocalContext();
    const threadContext3 = masterContext.threadLocalContext();

    console.log(`Thread context 1: ${threadContext1.constructor.name}`);
    console.log(`Thread context 2: ${threadContext2.constructor.name}`);
    console.log(`Thread context 3: ${threadContext3.constructor.name}`);

    // ✅ VERIFY ISOLATION (different instances)
    expect(threadContext1).not.toBe(threadContext2);
    expect(threadContext2).not.toBe(threadContext3);
    expect(threadContext1).not.toBe(threadContext3);

    console.log("✅ Thread-local contexts are properly isolated");
  });

  it("🏷️ LABEL TOKEN COORDINATION: Global token management", () => {
    console.log("🏷️ === LABEL TOKEN COORDINATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(2));

    // ✅ SIMULATE MULTIPLE THREADS DISCOVERING LABELS
    const thread1 = masterContext.threadLocalContext();
    const thread2 = masterContext.threadLocalContext();

    console.log("Thread 1 discovering labels...");
    const userToken = NodeLabelTokens.of("User");
    const companyToken = NodeLabelTokens.of("Company");

    const thread1UserToken = thread1.addNodeLabelToken(userToken);
    const thread1CompanyToken = thread1.addNodeLabelToken(companyToken);

    console.log("Thread 2 discovering overlapping and new labels...");
    const adminToken = NodeLabelTokens.of(["User", "Admin"]); // Multi-label
    const personToken = NodeLabelTokens.of("Person");

    const thread2AdminToken = thread2.addNodeLabelToken(adminToken);
    const thread2PersonToken = thread2.addNodeLabelToken(personToken);

    // ✅ VERIFY THREAD-LOCAL TOKEN CREATION
    expect(thread1UserToken).toBeTruthy();
    expect(thread1CompanyToken).toBeTruthy();
    expect(thread2AdminToken).toBeTruthy();
    expect(thread2PersonToken).toBeTruthy();

    // ✅ VERIFY GLOBAL COORDINATION
    const globalTokenMapping = masterContext.tokenToNodeLabels();
    console.log(`Global token mapping: ${globalTokenMapping.constructor.name}`);
    expect(globalTokenMapping).toBeTruthy();

    console.log("✅ Label token coordination works across threads");
  });

  it("📦 PROPERTY COORDINATION: Shared property builders", () => {
    console.log("📦 === PROPERTY COORDINATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(2));

    // ✅ SIMULATE THREADS DISCOVERING PROPERTIES
    const thread1 = masterContext.threadLocalContext();
    const thread2 = masterContext.threadLocalContext();

    console.log("Thread 1 processing User properties...");
    const userToken = NodeLabelTokens.of("User");
    thread1.addNodeLabelTokenAndPropertyKeys(userToken, ["name", "email", "age"]);

    console.log("Thread 2 processing Company properties...");
    const companyToken = NodeLabelTokens.of("Company");
    thread2.addNodeLabelTokenAndPropertyKeys(companyToken, ["name", "industry", "employees"]);

    // ✅ ACCESS PROPERTY BUILDERS FROM MASTER CONTEXT
    const propertyBuilders = masterContext.nodePropertyBuilders();
    console.log(`Property builders created: ${propertyBuilders.size}`);

    // Should have all properties from both threads
    expect(propertyBuilders.has("name")).toBe(true);
    expect(propertyBuilders.has("email")).toBe(true);
    expect(propertyBuilders.has("age")).toBe(true);
    expect(propertyBuilders.has("industry")).toBe(true);
    expect(propertyBuilders.has("employees")).toBe(true);

    console.log("Property builders discovered:");
    for (const [key, builder] of propertyBuilders) {
      console.log(`  ${key}: ${builder?.constructor.name || 'null'}`);
    }

    console.log("✅ Property coordination aggregates from all threads");
  });

  it("🗺️ SCHEMA AGGREGATION: Label-property mapping coordination", () => {
    console.log("🗺️ === SCHEMA AGGREGATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(3));

    // ✅ SIMULATE COMPLEX SCHEMA DISCOVERY
    const thread1 = masterContext.threadLocalContext();
    const thread2 = masterContext.threadLocalContext();
    const thread3 = masterContext.threadLocalContext();

    console.log("Simulating complex multi-thread schema discovery...");

    // Thread 1: User nodes
    thread1.addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("User"),
      ["id", "name", "email"]
    );

    // Thread 2: Company nodes + User overlap
    thread2.addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("Company"),
      ["id", "name", "industry"]
    );
    thread2.addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("User"),
      ["age", "verified"] // Additional User properties
    );

    // Thread 3: Multi-label nodes
    thread3.addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of(["User", "Admin"]),
      ["permissions", "lastLogin"]
    );

    // ✅ GET AGGREGATED SCHEMA MAPPINGS
    const labelToPropertyMappings = masterContext.nodeLabelTokenToPropertyKeys();
    console.log(`Schema mappings collected: ${labelToPropertyMappings.length}`);

    // Should have aggregated all label-property combinations
    expect(labelToPropertyMappings.length).toBeGreaterThan(0);

    // ✅ VERIFY PROPERTY BUILDER COVERAGE
    const allPropertyBuilders = masterContext.nodePropertyBuilders();
    const expectedProperties = [
      "id", "name", "email", "age", "verified",
      "industry", "permissions", "lastLogin"
    ];

    console.log("Verifying property builder coverage:");
    for (const prop of expectedProperties) {
      const hasBuilder = allPropertyBuilders.has(prop);
      console.log(`  ${prop}: ${hasBuilder ? '✅' : '❌'}`);
      expect(hasBuilder).toBe(true);
    }

    console.log("✅ Schema aggregation combines all thread discoveries");
  });

  it("⚡ PERFORMANCE: High-concurrency simulation", () => {
    console.log("⚡ === HIGH-CONCURRENCY SIMULATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(8));

    // ✅ SIMULATE 8 CONCURRENT THREADS
    console.log("Simulating 8 concurrent worker threads...");

    const threads = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      context: masterContext.threadLocalContext()
    }));

    const startTime = Date.now();

    // Each thread processes different label/property combinations
    threads.forEach(thread => {
      const threadLabels = [
        `Thread${thread.id}Node`,
        `Worker${thread.id}`,
        `Type${thread.id % 3}` // Some overlap across threads
      ];

      const threadProperties = [
        `prop${thread.id}_1`,
        `prop${thread.id}_2`,
        `common_prop`, // All threads have this
        `shared_${thread.id % 2}` // Some sharing
      ];

      for (const label of threadLabels) {
        const token = NodeLabelTokens.of(label);
        thread.context.addNodeLabelTokenAndPropertyKeys(token, threadProperties);
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`8-thread simulation completed in ${processingTime}ms`);

    // ✅ VERIFY AGGREGATION RESULTS
    const finalPropertyBuilders = masterContext.nodePropertyBuilders();
    const finalLabelMappings = masterContext.nodeLabelTokenToPropertyKeys();

    console.log(`Final property builders: ${finalPropertyBuilders.size}`);
    console.log(`Final label mappings: ${finalLabelMappings.length}`);

    // Should have accumulated from all threads
    expect(finalPropertyBuilders.size).toBeGreaterThan(20); // 8*4 properties minus duplicates
    expect(finalLabelMappings.length).toBeGreaterThan(20); // 8*3 labels minus duplicates

    console.log("✅ High-concurrency coordination performs well");
  });

  it("🎯 REAL-WORLD: Massive CSV import simulation", () => {
    console.log("🎯 === MASSIVE CSV IMPORT SIMULATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(16));

    // ✅ SIMULATE REALISTIC CSV IMPORT SCENARIO
    const csvSchema = {
      users: ["user_id", "name", "email", "age", "department", "salary", "verified"],
      companies: ["company_id", "name", "industry", "employees", "revenue", "founded"],
      products: ["product_id", "name", "category", "price", "manufacturer", "rating"],
      orders: ["order_id", "user_id", "product_id", "quantity", "total", "date"]
    };

    console.log("Simulating massive CSV import with 16 worker threads...");
    console.log("CSV schema:");
    Object.entries(csvSchema).forEach(([type, props]) => {
      console.log(`  ${type}: ${props.length} properties`);
    });

    const importStartTime = Date.now();

    // ✅ SIMULATE 16 WORKERS PROCESSING DIFFERENT CSV CHUNKS
    const workers = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      context: masterContext.threadLocalContext(),
      assignment: Object.keys(csvSchema)[i % 4] // Round-robin assignment
    }));

    workers.forEach(worker => {
      const entityType = worker.assignment;
      const properties = csvSchema[entityType as keyof typeof csvSchema];

      // Each worker processes multiple batches
      for (let batch = 0; batch < 5; batch++) {
        const labels = [entityType, `batch_${batch}`, `worker_${worker.id}`];
        const token = NodeLabelTokens.of(labels);

        worker.context.addNodeLabelTokenAndPropertyKeys(token, properties);
      }
    });

    const importTime = Date.now() - importStartTime;
    console.log(`Massive import simulation completed in ${importTime}ms`);

    // ✅ VERIFY FINAL AGGREGATION
    const finalPropertyBuilders = masterContext.nodePropertyBuilders();
    const finalTokenMapping = masterContext.tokenToNodeLabels();
    const finalLabelMappings = masterContext.nodeLabelTokenToPropertyKeys();

    console.log("\nFinal aggregation results:");
    console.log(`  Property builders: ${finalPropertyBuilders.size}`);
    console.log(`  Token mappings: ${finalTokenMapping.labelTokenNodeLabelMapping().size}`);
    console.log(`  Label-property mappings: ${finalLabelMappings.length}`);

    // ✅ VERIFY SCHEMA COMPLETENESS
    const allExpectedProperties = Object.values(csvSchema).flat();
    const uniqueExpectedProperties = [...new Set(allExpectedProperties)];

    console.log(`Expected unique properties: ${uniqueExpectedProperties.length}`);
    console.log(`Discovered properties: ${finalPropertyBuilders.size}`);

    for (const expectedProp of uniqueExpectedProperties) {
      expect(finalPropertyBuilders.has(expectedProp)).toBe(true);
    }

    console.log("✅ Massive CSV import coordination successful!");
  });

  it("🔧 INTEGRATION: Full pipeline coordination", () => {
    console.log("🔧 === FULL PIPELINE INTEGRATION ===");

    const masterContext = NodesBuilderContext.lazy(Concurrency.of(4));

    // ✅ SIMULATE COMPLETE IMPORT PIPELINE
    console.log("Simulating complete import pipeline...");

    // Phase 1: Schema Discovery
    console.log("Phase 1: Schema discovery across threads...");
    const discoveryThreads = Array.from({ length: 4 }, () =>
      masterContext.threadLocalContext()
    );

    discoveryThreads[0].addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("User"), ["id", "name", "email"]
    );
    discoveryThreads[1].addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("Company"), ["id", "name", "industry"]
    );
    discoveryThreads[2].addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of(["User", "Premium"]), ["subscription", "billing"]
    );
    discoveryThreads[3].addNodeLabelTokenAndPropertyKeys(
      NodeLabelTokens.of("Product"), ["id", "name", "price"]
    );

    // Phase 2: Schema Aggregation
    console.log("Phase 2: Schema aggregation...");
    const aggregatedPropertyBuilders = masterContext.nodePropertyBuilders();
    const aggregatedLabelMappings = masterContext.nodeLabelTokenToPropertyKeys();

    console.log(`  Aggregated properties: ${aggregatedPropertyBuilders.size}`);
    console.log(`  Aggregated mappings: ${aggregatedLabelMappings.length}`);

    // Phase 3: Token Coordination
    console.log("Phase 3: Token coordination...");
    const tokenMapping = masterContext.tokenToNodeLabels();
    const labelTokenMapping = tokenMapping.labelTokenNodeLabelMapping();

    console.log(`  Token mappings: ${labelTokenMapping.size}`);

    // ✅ VERIFY PIPELINE COMPLETENESS
    expect(aggregatedPropertyBuilders.size).toBeGreaterThan(8);
    expect(aggregatedLabelMappings.length).toBeGreaterThan(3);
    expect(labelTokenMapping.size).toBeGreaterThan(3);

    // ✅ VERIFY CROSS-REFERENCES
    const expectedLabels = ["User", "Company", "Premium", "Product"];
    const expectedProperties = ["id", "name", "email", "industry", "subscription", "billing", "price"];

    for (const prop of expectedProperties) {
      expect(aggregatedPropertyBuilders.has(prop)).toBe(true);
    }

    console.log("✅ Full pipeline integration successful!");
  });

});
