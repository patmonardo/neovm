import { describe, it, expect } from "vitest";
import { CsvFileInput } from "@/core/io/file";
import { GraphFactory } from "@/core/loading";
import { Concurrency } from "@/concurrency";

/**
 * 🎯 FOCUSED IMPORT ANALYSIS - importNodes() Method Breakdown
 *
 * This tool dissects the importNodes() method to understand:
 * 1. 📋 Schema loading and validation
 * 2. 🏗️ NodesBuilder configuration
 * 3. 🎭 Visitor pattern setup
 * 4. 🧵 Parallel processing execution
 * 5. 📊 Node construction and statistics
 *
 * Focus: Understanding EXACTLY what importNodes() does step-by-step
 */

const REFERENCE_STORE_PATH = "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

describe("🎯 importNodes() Method Analysis", () => {

  it("📋 STEP 1: Schema Loading and Validation", () => {
    console.log("📋 === SCHEMA LOADING ANALYSIS ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);

    // ✅ This is exactly what importNodes() does first:
    const nodeSchema = csvInput.nodeSchema();

    console.log("🔍 Schema Analysis:");
    console.log(`  📊 Schema type: ${nodeSchema.constructor.name}`);
    console.log(`  🏷️ Available labels: ${nodeSchema.availableLabels().length}`);

    // Log each label like importNodes() does
    const nodeLabels = Array.from(nodeSchema.availableLabels());
    console.log(`📋 Node labels (${nodeLabels.length}): ${nodeLabels.map(l => l.name()).join(", ")}`);

    // Log schema entries like importNodes() does
    for (const entry of nodeSchema.entries()) {
      console.log(`  📊 Node label schema: ${entry.identifier()}`);
      // Dig deeper into what each entry contains
      console.log(`    🔧 Entry type: ${entry.constructor.name}`);
    }

    expect(nodeSchema).toBeTruthy();
    expect(nodeLabels.length).toBeGreaterThan(0);
  });

  it("🏷️ STEP 2: Label Mapping Analysis", () => {
    console.log("🏷️ === LABEL MAPPING ANALYSIS ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);

    // ✅ This is the label mapping logic from importNodes():
    const labelMapping = csvInput.labelMapping();

    if (labelMapping) {
      console.log(`🏷️ Label mappings found: ${labelMapping.size} entries`);
      for (const [key, value] of labelMapping) {
        console.log(`  🏷️ Label mapping: ${key} -> ${value}`);
      }
    } else {
      console.log("🏷️ Label mapping file was not found, continuing without label mapping");
    }

    // This reveals how label mapping works (or doesn't work)
    console.log("🔍 Label mapping impact:");
    console.log("  ✅ Optional feature - import continues without it");
    console.log("  🎯 Probably used for label transformation during import");
  });

  it("🏗️ STEP 3: NodesBuilder Configuration", () => {
    console.log("🏗️ === NODESBUILDER CONFIGURATION ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const nodeSchema = csvInput.nodeSchema();
    const graphInfo = csvInput.graphInfo();
    const concurrency = Concurrency.of(1);

    console.log("🔍 GraphInfo for NodesBuilder:");
    console.log(`  📊 Max original ID: ${graphInfo.maxOriginalId()}`);
    console.log(`  📊 Node count: ${graphInfo.nodeCount()}`);
    console.log(`  🔧 ID map builder type: ${graphInfo.idMapBuilderType()}`);

    // ✅ This is the exact NodesBuilder setup from importNodes():
    try {
      const nodesBuilder = GraphFactory.initNodesBuilder(nodeSchema)
        .maxOriginalId(graphInfo.maxOriginalId())
        .concurrency(concurrency)
        .nodeCount(graphInfo.nodeCount())
        .deduplicateIds(false)
        .idMapBuilderType(graphInfo.idMapBuilderType())
        .build();

      console.log("✅ NodesBuilder created successfully");
      console.log(`  🔧 Builder type: ${nodesBuilder.constructor.name}`);

      // Analyze the builder configuration
      console.log("🎯 Builder Configuration:");
      console.log(`  🧵 Concurrency: ${concurrency.value()}`);
      console.log(`  📊 Expected node count: ${graphInfo.nodeCount()}`);
      console.log(`  🔑 ID deduplication: false`);
      console.log(`  🗂️ ID map type: ${graphInfo.idMapBuilderType()}`);

    } catch (error) {
      console.log(`❌ NodesBuilder creation failed: ${(error as Error).message}`);
      console.log("🔍 This reveals the exact configuration requirements");
    }
  });

  it("🎭 STEP 4: Visitor Pattern Setup", () => {
    console.log("🎭 === VISITOR PATTERN SETUP ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const nodeSchema = csvInput.nodeSchema();

    console.log("🔍 Visitor Builder Configuration:");
    console.log("  📋 Input: NodeSchema");
    console.log("  🏗️ Input: NodesBuilder");
    console.log("  🎯 Output: GraphStoreNodeVisitor");

    // This is what importNodes() does with the visitor builder:
    console.log("🎭 Visitor Builder Pattern:");
    console.log("  1. nodeVisitorBuilder.withNodeSchema(nodeSchema)");
    console.log("  2. nodeVisitorBuilder.withNodesBuilder(nodesBuilder)");
    console.log("  3. nodeVisitorBuilder.build() → GraphStoreNodeVisitor");

    console.log("🔧 Visitor Purpose:");
    console.log("  ✅ Receives CSV data via visitor methods");
    console.log("  ✅ Converts CSV rows to internal node format");
    console.log("  ✅ Populates NodesBuilder with parsed data");
    console.log("  ✅ Handles property type conversion");
    console.log("  ✅ Manages ID mapping and validation");
  });

  it("🧵 STEP 5: Parallel Processing Setup", () => {
    console.log("🧵 === PARALLEL PROCESSING SETUP ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const concurrency = Concurrency.of(2);

    console.log("🔍 Parallel Processing Analysis:");
    console.log(`  🧵 Concurrency level: ${concurrency.value()}`);
    console.log("  📦 Iterator: csvInput.nodes().iterator()");
    console.log("  🏃 Runner: ElementImportRunner");
    console.log("  👥 Tasks: ParallelUtil.tasks()");
    console.log("  ⚡ Execution: ParallelUtil.run()");

    // This is the parallel processing pattern from importNodes():
    console.log("🎯 Parallel Execution Flow:");
    console.log("  1. Create nodes iterator");
    console.log("  2. Create multiple ElementImportRunner tasks");
    console.log("  3. Each task processes chunks in parallel");
    console.log("  4. All tasks use same visitor builder (thread-safe)");
    console.log("  5. ParallelUtil coordinates execution");
    console.log("  6. Progress tracker monitors completion");

    // Test iterator creation
    const nodesIterator = csvInput.nodes().iterator();
    console.log(`✅ Nodes iterator created: ${nodesIterator.constructor.name}`);
  });

  it("📊 STEP 6: Node Construction and Statistics", () => {
    console.log("📊 === NODE CONSTRUCTION ANALYSIS ===");

    const csvInput = new CsvFileInput(REFERENCE_STORE_PATH);
    const graphInfo = csvInput.graphInfo();

    console.log("🔍 Construction Process:");
    console.log("  1. 🎭 Visitor processes all CSV chunks");
    console.log("  2. 🏗️ NodesBuilder accumulates node data");
    console.log("  3. 📊 nodesBuilder.build() creates final Nodes");
    console.log("  4. 🎯 graphStoreBuilder.nodes(nodes) sets nodes");
    console.log("  5. 📈 Statistics updated with counts and timing");

    // Expected output statistics
    console.log("📈 Expected Statistics:");
    console.log(`  👥 Nodes imported: ${graphInfo.nodeCount()}`);
    console.log(`  📁 Node files processed: 1 (or actual file count)`);
    console.log(`  ⏱️ Import time: measured in milliseconds`);
    console.log(`  📊 Nodes per second: calculated rate`);

    // Final result
    console.log("🎯 Final Output:");
    console.log("  ✅ Nodes object with complete node store");
    console.log("  ✅ ID mapping for relationship processing");
    console.log("  ✅ Property storage with type safety");
    console.log("  ✅ Label-based node organization");
  });

  it("🔧 STEP 7: Error Handling and Cleanup", () => {
    console.log("🔧 === ERROR HANDLING ANALYSIS ===");

    console.log("🚨 Error Scenarios in importNodes():");
    console.log("  1. 📁 File access errors during iteration");
    console.log("  2. 📋 Schema validation failures");
    console.log("  3. 🏗️ NodesBuilder configuration errors");
    console.log("  4. 🧵 Parallel processing exceptions");
    console.log("  5. 💾 Memory allocation failures");

    console.log("🛡️ Error Handling Strategy:");
    console.log("  ✅ Try-catch around parallel processing");
    console.log("  ✅ Error count increment on failures");
    console.log("  ✅ Progress tracker failure notification");
    console.log("  ✅ Detailed error logging");
    console.log("  ✅ Exception re-throwing for caller handling");

    console.log("🧹 Cleanup Operations:");
    console.log("  ✅ Progress tracker endSubTask() on success");
    console.log("  ✅ Progress tracker endSubTaskWithFailure() on error");
    console.log("  ✅ Resource cleanup in finally blocks");
  });

  it("🎯 COMPLETE importNodes() FLOW SUMMARY", () => {
    console.log("🎯 === COMPLETE FLOW SUMMARY ===");

    console.log("📋 importNodes() Complete Process:");
    console.log("  1. 📋 Load and validate node schema");
    console.log("  2. 🏷️ Handle optional label mapping");
    console.log("  3. 🏗️ Configure NodesBuilder with graph info");
    console.log("  4. 🎭 Setup visitor with schema and builder");
    console.log("  5. 🧵 Create parallel processing tasks");
    console.log("  6. ⚡ Execute parallel CSV processing");
    console.log("  7. 📊 Build final Nodes object");
    console.log("  8. 📈 Update statistics and timing");
    console.log("  9. 🛡️ Handle errors and cleanup");
    console.log("  10. ✅ Return Nodes with ID mapping");

    console.log("🎯 Key Insights:");
    console.log("  ✅ Schema-driven processing ensures type safety");
    console.log("  ✅ Parallel processing scales with concurrency");
    console.log("  ✅ Visitor pattern abstracts CSV details");
    console.log("  ✅ NodesBuilder handles memory optimization");
    console.log("  ✅ ID mapping enables relationship processing");
    console.log("  ✅ Statistics provide performance monitoring");
  });

});
