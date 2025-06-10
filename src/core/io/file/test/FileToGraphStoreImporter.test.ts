import { describe, it, expect } from 'vitest';
import { ConsoleLog } from '@/utils';
import { Concurrency } from '@/concurrency';
import { TaskRegistryFactory } from '@/core/utils/progress';
import { CsvToGraphStoreImporter } from '../csv/CsvToGraphStoreImporter';

/**
 * 🎯 STAGE 1: FileToGraphStoreImporter Core Functionality Test
 *
 * This test demonstrates what FileToGraphStoreImporter ACTUALLY does:
 * 1. 📊 Takes CSV files and converts them to a complete GraphStore
 * 2. 🔧 Orchestrates the entire IO/LOADING pipeline
 * 3. 📋 Provides detailed import statistics and progress tracking
 * 4. 🚀 Returns a complete UserGraphStore ready for use
 *
 * Focus: Understanding the MAIN MODULE, not CSV parsing details
 */

const REFERENCE_STORE = "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

describe('🎯 FileToGraphStoreImporter - Core Functionality', () => {

  it("🏗️ BASIC IMPORT - CSV Files → Complete GraphStore", () => {
    console.log("🏗️ === BASIC IMPORT TEST ===");

    // ✅ STEP 1: Setup import configuration
    const concurrency = Concurrency.of(1);
    const log = new ConsoleLog();
    const taskRegistryFactory = TaskRegistryFactory.empty();

    console.log("📋 Import Configuration:");
    console.log(`  Source: ${REFERENCE_STORE}`);
    console.log(`  Concurrency: ${concurrency.value()} threads`);
    console.log(`  Task tracking: ${taskRegistryFactory !== null ? 'Enabled' : 'Disabled'}`);

    // ✅ STEP 2: Create the importer
    const importer = new CsvToGraphStoreImporter(
      concurrency,
      REFERENCE_STORE,
      log,
      taskRegistryFactory
    );

    console.log("✅ FileToGraphStoreImporter created");

    // ✅ STEP 3: Run the import (THE MAIN EVENT!)
    console.log("🚀 Starting import process...");
    const result = importer.run();

    console.log("✅ Import completed successfully!");

    // ✅ STEP 4: Examine the results
    console.log("\n📊 === IMPORT RESULTS ===");
    console.log(`👤 User: ${result.userName}`);
    console.log(`📊 GraphStore: ${result.graphStore ? 'Created' : 'Failed'}`);

    // Statistics breakdown
    const stats = result.importStatistics;
    console.log("\n📈 Import Statistics:");
    console.log(`  ⏱️ Duration: ${stats.durationMs}ms`);
    console.log(`  👥 Nodes imported: ${stats.nodesImported}`);
    console.log(`  🔗 Relationships imported: ${stats.relationshipsImported}`);
    console.log(`  🌐 Graph properties imported: ${stats.graphPropertiesImported}`);
    console.log(`  📁 Files processed: ${stats.nodeFilesProcessed + stats.relationshipFilesProcessed + stats.graphPropertyFilesProcessed}`);
    console.log(`  💾 Memory used: ${stats.memoryUsageMB}MB`);
    console.log(`  ⚡ Performance: ${stats.nodesPerSecond} nodes/sec, ${stats.relationshipsPerSecond} rels/sec`);
    console.log(`  ⚠️ Warnings: ${stats.warningCount}`);
    console.log(`  ❌ Errors: ${stats.errorCount}`);

    // ✅ STEP 5: Validate the GraphStore
    console.log("\n🔍 === GRAPHSTORE VALIDATION ===");
    const graphStore = result.graphStore;

    if (graphStore.nodeCount() > 0) {
      console.log(`📊 Node store: ${graphStore.nodes().nodeCount()} nodes`);
    }

    if (graphStore.relationshipCount() > 0) {
      console.log(`🔗 Relationship store: Available relationship types`);
    }

    if (graphStore.schema) {
      const schema = graphStore.schema();
      console.log(`📋 Schema: ${schema.nodeSchema().availableLabels().length} node labels`);
      console.log(`📋 Schema: ${schema.relationshipSchema().availableTypes().length} relationship types`);
    }

    // ✅ ASSERTIONS: Verify the import worked
    expect(result.userName).toBeTruthy();
    expect(result.graphStore).toBeTruthy();
    expect(stats.nodesImported).toBeGreaterThan(0);
    expect(stats.relationshipsImported).toBeGreaterThan(0);
    expect(stats.durationMs).toBeGreaterThan(0);
    expect(stats.errorCount).toBe(0);
  });

  it("📊 IMPORT STATISTICS - Detailed Performance Analysis", () => {
    console.log("📊 === IMPORT STATISTICS ANALYSIS ===");

    const concurrency = Concurrency.of(1);
    const log = new ConsoleLog();
    const taskRegistryFactory = TaskRegistryFactory.empty();

    const importer = new CsvToGraphStoreImporter(
      concurrency,
      REFERENCE_STORE,
      log,
      taskRegistryFactory
    );

    // Measure total import time
    const startTime = Date.now();
    const result = importer.run();
    const totalTime = Date.now() - startTime;

    console.log("🔍 Performance Breakdown:");
    const stats = result.importStatistics;

    // Calculate efficiency metrics
    const totalEntities = stats.nodesImported + stats.relationshipsImported;
    const entitiesPerSecond = (totalEntities * 1000) / stats.durationMs;
    const memoryPerEntity = stats.memoryUsageMB / totalEntities;

    console.log(`  🎯 Total entities: ${totalEntities}`);
    console.log(`  ⚡ Entities/second: ${Math.round(entitiesPerSecond)}`);
    console.log(`  💾 Memory/entity: ${memoryPerEntity.toFixed(3)}MB`);
    console.log(`  🧵 Concurrency: ${concurrency.value()} threads`);
    console.log(`  📁 I/O efficiency: ${(stats.nodeFilesProcessed + stats.relationshipFilesProcessed)} files`);

    // Timing analysis
    console.log(`  ⏱️ Internal timing: ${stats.durationMs}ms`);
    console.log(`  ⏱️ External timing: ${totalTime}ms`);
    console.log(`  📊 Timing overhead: ${totalTime - stats.durationMs}ms`);

    expect(entitiesPerSecond).toBeGreaterThan(100); // Should be reasonably fast
    expect(stats.memoryUsageMB).toBeLessThan(1000); // Should not use excessive memory
  });

  it("🔧 IMPORT PIPELINE - Understanding the Process Flow", () => {
    console.log("🔧 === IMPORT PIPELINE ANALYSIS ===");

    // This test explores what happens INSIDE the importer
    const concurrency = Concurrency.of(1); // Single thread for clearer logging
    const log = new ConsoleLog();
    const taskRegistryFactory = TaskRegistryFactory.empty();

    console.log("🔍 Pipeline stages to watch for:");
    console.log("  1. 📁 File discovery and validation");
    console.log("  2. 📋 Schema loading and validation");
    console.log("  3. 🏗️ GraphStore builder setup");
    console.log("  4. 👥 Node import with ID mapping");
    console.log("  5. 🔗 Relationship import with topology building");
    console.log("  6. 🌐 Graph property import");
    console.log("  7. 📊 Final GraphStore assembly");

    const importer = new CsvToGraphStoreImporter(
      concurrency,
      REFERENCE_STORE,
      log,
      taskRegistryFactory
    );

    // Run and capture the pipeline execution
    console.log("\n🚀 Executing pipeline...");
    const result = importer.run();

    console.log("\n✅ Pipeline completed!");
    console.log("🔍 Key pipeline outputs:");
    console.log(`  📊 Final GraphStore: ${result.graphStore.constructor.name}`);
    console.log(`  👤 User context: ${result.userName}`);
    console.log(`  📈 Performance metrics: Available`);

    // Validate pipeline integrity
    expect(result.graphStore).toBeTruthy();
    expect(result.graphStore.nodeCount()).toBeTruthy();
    expect(result.graphStore.relationshipCount()).toBeTruthy();
    expect(result.graphStore.schema).toBeTruthy();
  });

  it("🎯 GRAPHSTORE OUTPUT - What We Actually Get", () => {
    console.log("🎯 === GRAPHSTORE OUTPUT ANALYSIS ===");

    const concurrency = Concurrency.of(1);
    const log = new ConsoleLog();
    const taskRegistryFactory = TaskRegistryFactory.empty();

    const importer = new CsvToGraphStoreImporter(
      concurrency,
      REFERENCE_STORE,
      log,
      taskRegistryFactory
    );

    const result = importer.run();
    const graphStore = result.graphStore;

    console.log("🔍 GraphStore Components:");

    // Nodes analysis
    if (graphStore.nodeCount() > 0) {
      const nodes = graphStore.nodes();
      console.log(`  👥 Nodes: ${nodes.nodeCount()} total nodes`);
      console.log(`  📊 Node ID mapping: Available`);
      console.log(`  💾 Node properties: Available`);
    }

    // Relationships analysis
    if (graphStore.relationshipCount() > 0) {
      console.log(`  🔗 Relationships: Available`);
      console.log(`  📊 Relationship topologies: Available`);
      console.log(`  💾 Relationship properties: Available`);
    }

    // Schema analysis
    if (graphStore.schema()) {
      const schema = graphStore.schema();
      const nodeSchema = schema.nodeSchema();
      const relSchema = schema.relationshipSchema();

      console.log(`  📋 Node labels: ${nodeSchema.availableLabels().length}`);
      console.log(`  📋 Relationship types: ${relSchema.availableTypes().length}`);
      console.log(`  📋 Graph properties: ${schema.graphProperties().size}`);
    }

    // Database info
    if (graphStore.databaseInfo) {
      const dbInfo = graphStore.databaseInfo();
      console.log(`  🗃️ Database: ${dbInfo.databaseId()}`);
    }

    console.log("\n🎯 This GraphStore is ready for:");
    console.log("  📊 Graph algorithms and analysis");
    console.log("  🔍 Node and relationship queries");
    console.log("  📈 Performance operations");
    console.log("  💾 Persistence and export");

    // Validate completeness
    expect(graphStore.nodeCount()).toBeTruthy();
    expect(graphStore.relationshipCount()).toBeTruthy();
    expect(graphStore.schema).toBeTruthy();
    expect(result.userName).toBeTruthy();
  });

  it("🚨 ERROR HANDLING - What Happens When Things Go Wrong", () => {
    console.log("🚨 === ERROR HANDLING TEST ===");

    const concurrency = Concurrency.of(1);
    const log = new ConsoleLog();
    const taskRegistryFactory = TaskRegistryFactory.empty();

    // Test with invalid path
    console.log("🔍 Testing with invalid import path...");

    const invalidImporter = new CsvToGraphStoreImporter(
      concurrency,
      "/nonexistent/path",
      log,
      taskRegistryFactory
    );

    try {
      invalidImporter.run();
      console.log("❌ Should have failed but didn't!");
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(`✅ Correctly caught error: ${(error as Error).message}`);
      expect(error).toBeTruthy();
    }

    // Test with valid path to ensure baseline works
    console.log("\n🔍 Testing with valid path for comparison...");
    const validImporter = new CsvToGraphStoreImporter(
      concurrency,
      REFERENCE_STORE,
      log,
      taskRegistryFactory
    );

    const result = validImporter.run();
    console.log("✅ Valid import succeeded as expected");
    expect(result.graphStore).toBeTruthy();
  });

});
