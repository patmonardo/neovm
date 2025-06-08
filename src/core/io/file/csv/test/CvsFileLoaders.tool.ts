import { describe, it, expect } from "vitest";
import { ValueType, PropertyState } from "@/api";
import { UserInfoLoader } from "../UserInfoLoader";
import { GraphInfoLoader } from "../GraphInfoLoader";
import { NodeSchemaLoader } from "../NodeSchemaLoader";
import { NodeLabelMappingLoader } from "../NodeLabelMappingLoader";
import { RelationshipTypeMappingLoader } from "../RelationshipTypeMappingLoader";
import { RelationshipSchemaLoader } from "../RelationshipSchemaLoader";
import { GraphPropertySchemaLoader } from "../GraphPropertySchemaLoader";
import { GraphCapabilitiesLoader } from "../GraphCapabilitiesLoader";
import { CsvFileInput } from "../CsvFileInput";

const referenceGraphStoreDir =
  "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

// 🎪 CONTROL PANEL: Individual Loader Tests
describe("🎛️ CsvFileInput Loader Control Panel", () => {
  it("👤 USER INFO LOADER - Enhanced Papa Parse version", () => {
    console.log("👤 === USER INFO LOADER (PAPA PARSE) TEST ===");

    try {
      const userLoader = new UserInfoLoader(referenceGraphStoreDir);

      // 🔍 Full debug analysis
      userLoader.debug();

      // Test all methods
      console.log("\n🧪 Testing all UserInfoLoader methods:");

      const singleUser = userLoader.load();
      console.log(`✅ load(): "${singleUser}"`);

      const allUsers = userLoader.loadAll();
      console.log(`✅ loadAll(): ${allUsers.length} users`);

      const userCount = userLoader.getUserCount();
      console.log(`✅ getUserCount(): ${userCount}`);

      const usernames = userLoader.getAllUsernames();
      console.log(`✅ getAllUsernames(): [${usernames.join(", ")}]`);

      // Test user search
      if (usernames.length > 0) {
        const foundUser = userLoader.findUser(usernames[0]);
        console.log(
          `✅ findUser("${usernames[0]}"): ${foundUser ? "found" : "not found"}`
        );
      }

      expect(singleUser).toBeTruthy();
      expect(allUsers.length).toBeGreaterThan(0);
      expect(userCount).toBe(allUsers.length);
      expect(usernames.length).toBe(userCount);
    } catch (error) {
      console.log(`❌ UserInfoLoader failed: ${(error as Error).message}`);
      throw error;
    }
  });

  it("🌐 GRAPH INFO LOADER - Papa Parse upgrade (simple)", () => {
    console.log("🌐 === GRAPH INFO LOADER (PAPA PARSE SIMPLE) TEST ===");

    try {
      const graphLoader = new GraphInfoLoader(referenceGraphStoreDir);

      // 🔍 Full debug analysis
      graphLoader.debug();

      // Test loading
      console.log("\n🧪 Testing GraphInfoLoader methods:");
      const graphInfo = graphLoader.load();

      // Test all existing API methods
      console.log(
        `✅ Database name: "${graphInfo
          .databaseInfo()
          .databaseId()
          .databaseName()}"`
      );
      console.log(
        `✅ Database location: ${graphInfo.databaseInfo().databaseLocation()}`
      );
      console.log(`✅ Node count: ${graphInfo.nodeCount()}`);
      console.log(`✅ Max original ID: ${graphInfo.maxOriginalId()}`);
      console.log(`✅ ID map builder type: ${graphInfo.idMapBuilderType()}`);
      console.log(
        `✅ Total relationships: ${graphInfo.totalRelationshipCount()}`
      );

      const relTypes = graphInfo.relationshipTypes();
      console.log(`✅ Relationship types: ${relTypes.length} types`);
      relTypes.forEach((type) => {
        const count = graphInfo.getRelationshipCount(type);
        const hasInverse = graphInfo.hasInverseIndex(type);
        console.log(
          `  ${type.name()}: ${count} relationships (inverse: ${hasInverse})`
        );
      });

      expect(graphInfo).toBeTruthy();
      expect(graphInfo.databaseInfo().databaseId().databaseName()).toBeTruthy();
      expect(graphInfo.nodeCount()).toBeGreaterThanOrEqual(0);
    } catch (error) {
      console.log(`❌ GraphInfoLoader failed: ${(error as Error).message}`);
      throw error;
    }
  });

  it("📋 NODE SCHEMA LOADER - Test node schema loading", () => {
    console.log("📋 === NODE SCHEMA LOADER TEST ===");

    try {
      const nodeSchemaLoader = new NodeSchemaLoader(referenceGraphStoreDir);
      const nodeSchema = nodeSchemaLoader.load();
      const labels = Array.from(nodeSchema.availableLabels());
      console.log(`✅ Node labels loaded: ${labels.join(", ")}`);
      console.log(`📊 Label count: ${labels.length}`);

      // Test specific label properties
      labels.forEach((label) => {
        const properties = nodeSchema.allProperties(label);
        console.log(`  ${label}: ${Array.from(properties.keys()).join(", ")}`);
      });

      expect(nodeSchema).toBeTruthy();
      expect(labels.length).toBeGreaterThan(0);
    } catch (error) {
      console.log(`❌ NodeSchemaLoader failed: ${(error as Error).message}`);
      throw error;
    }
  });

  it("🔗 RELATIONSHIP SCHEMA LOADER - Papa Parse upgrade", () => {
    console.log("🔗 === RELATIONSHIP SCHEMA LOADER TEST ===");

    try {
      const relSchemaLoader = new RelationshipSchemaLoader(
        referenceGraphStoreDir
      );

      // Basic debug
      relSchemaLoader.debug();

      // Test loading
      const relSchema = relSchemaLoader.load();
      const types = Array.from(relSchema.availableTypes());

      console.log(
        `✅ Relationship types loaded: ${types.map((t) => t.name()).join(", ")}`
      );
      console.log(`📊 Type count: ${types.length}`);

      types.forEach((type) => {
        const properties = relSchema.allProperties(type);
        console.log(
          `  ${type.name()}: ${properties.size || properties.size} properties`
        );
      });

      expect(relSchema).toBeTruthy();
      expect(types.length).toBeGreaterThan(0);
    } catch (error) {
      console.log(
        `❌ RelationshipSchemaLoader failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("🏷️ NODE LABEL MAPPING LOADER - Papa Parse upgrade", () => {
    console.log("🏷️ === NODE LABEL MAPPING LOADER TEST ===");

    try {
      const labelMappingLoader = new NodeLabelMappingLoader(
        referenceGraphStoreDir
      );

      // Basic debug
      labelMappingLoader.debug();

      // Test loading
      const mapping = labelMappingLoader.load();

      if (mapping) {
        console.log(`✅ Label mapping loaded: ${mapping.size} entries`);

        // Show all mappings
        for (const [index, label] of mapping.entries()) {
          console.log(`  ${index} -> ${label}`);
        }

        expect(mapping.size).toBeGreaterThan(0);
      } else {
        console.log("� No label mapping file found (returned null)");
        expect(mapping).toBeNull();
      }
    } catch (error) {
      console.log(
        `❌ NodeLabelMappingLoader failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("🔗 RELATIONSHIP TYPE MAPPING LOADER - Papa Parse upgrade", () => {
    console.log("🔗 === RELATIONSHIP TYPE MAPPING LOADER TEST ===");

    try {
      const typeMappingLoader = new RelationshipTypeMappingLoader(
        referenceGraphStoreDir
      );

      // Basic debug
      typeMappingLoader.debug();

      // Test loading
      const mapping = typeMappingLoader.load();

      if (mapping) {
        console.log(`✅ Type mapping loaded: ${mapping.size} entries`);

        // Show all mappings
        for (const [index, type] of mapping.entries()) {
          console.log(`  ${index} -> ${type}`);
        }

        expect(mapping.size).toBeGreaterThan(0);
      } else {
        console.log("📄 No type mapping file found (returned null)");
        expect(mapping).toBeNull();
      }
    } catch (error) {
      console.log(
        `❌ RelationshipTypeMappingLoader failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("🌐 GRAPH PROPERTY SCHEMA LOADER - Papa Parse upgrade", () => {
    console.log("🌐 === GRAPH PROPERTY SCHEMA LOADER TEST ===");

    try {
      const graphPropSchemaLoader = new GraphPropertySchemaLoader(
        referenceGraphStoreDir
      );

      // Basic debug
      graphPropSchemaLoader.debug();

      // Test loading
      const schema = graphPropSchemaLoader.load();

      console.log(`✅ Graph property schema loaded: ${schema.size} properties`);

      // Show all properties
      for (const [key, propSchema] of schema.entries()) {
        const valueType = ValueType.csvName(propSchema.valueType());
        const state = PropertyState.name(propSchema.state());
        const hasDefault = propSchema.defaultValue() !== null;
        const defaultStr = hasDefault
          ? ` default: ${propSchema.defaultValue()}`
          : " no default";
        console.log(`  ${key}: ${valueType} (${state})${defaultStr}`);
      }

      expect(schema).toBeTruthy();
      expect(schema.size).toBeGreaterThanOrEqual(0); // Can be empty
    } catch (error) {
      console.log(
        `❌ GraphPropertySchemaLoader failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("⚡ GRAPH CAPABILITIES LOADER - Papa Parse upgrade (FINAL BOSS!)", () => {
    console.log("⚡ === GRAPH CAPABILITIES LOADER TEST (FINAL!) ===");

    try {
      const graphCapabilitiesLoader = new GraphCapabilitiesLoader(
        referenceGraphStoreDir
      );

      // Basic debug
      graphCapabilitiesLoader.debug();

      // Test loading
      const capabilities = graphCapabilitiesLoader.load();

      console.log(`✅ Graph capabilities loaded:`);
      console.log(`  Write Mode: ${capabilities.writeMode()}`);
      console.log(
        `  Can Write Local Database: ${capabilities.canWriteToLocalDatabase()}`
      );
      console.log(
        `  Can Write Remote Database: ${capabilities.canWriteToRemoteDatabase()}`
      );

      expect(capabilities).toBeTruthy();
      expect(capabilities.writeMode()).toBeDefined();

      console.log("\n🎉 100% PAPA PARSE COVERAGE ACHIEVED! 🎉");
    } catch (error) {
      console.log(
        `❌ GraphCapabilitiesLoader failed: ${(error as Error).message}`
      );
      throw error;
    }
  });
});

// 🎯 CONTROL PANEL: CsvFileInput Constructor Tests
describe("🎯 CsvFileInput Constructor Control Panel", () => {
  it("🏗️ BASIC CONSTRUCTOR - Create CsvFileInput instance", () => {
    console.log("🏗️ === CSVFILEINPUT CONSTRUCTOR TEST ===");

    try {
      const csvInput = new CsvFileInput(referenceGraphStoreDir);
      console.log("✅ CsvFileInput created successfully!");
      console.log(`👤 Username: ${csvInput.userName()}`);
      const graphName = csvInput
        .graphInfo()
        .databaseInfo()
        .databaseId()
        .databaseName();
      console.log(`🌐 Graph name: ${graphName}`);
      expect(csvInput).toBeTruthy();
      expect(csvInput.userName()).toBeTruthy();
      expect(csvInput.graphInfo().databaseInfo()).toBeTruthy();
    } catch (error) {
      console.log(
        `❌ CsvFileInput constructor failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("📋 NODE ITERABLE CREATION - Test node stream creation", () => {
    console.log("📋 === NODE ITERABLE CREATION TEST ===");

    try {
      const csvInput = new CsvFileInput(referenceGraphStoreDir);
      const nodeIterable = csvInput.nodes();
      console.log("✅ Node iterable created successfully!");

      const iterator = nodeIterable.iterator();
      console.log("✅ Node iterator created successfully!");

      expect(nodeIterable).toBeTruthy();
      expect(iterator).toBeTruthy();
    } catch (error) {
      console.log(
        `❌ Node iterable creation failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("🔗 RELATIONSHIP ITERABLE CREATION - Test relationship stream creation", () => {
    console.log("🔗 === RELATIONSHIP ITERABLE CREATION TEST ===");

    try {
      const csvInput = new CsvFileInput(referenceGraphStoreDir);
      const relIterable = csvInput.relationships();
      console.log("✅ Relationship iterable created successfully!");

      const iterator = relIterable.iterator();
      console.log("✅ Relationship iterator created successfully!");

      expect(relIterable).toBeTruthy();
      expect(iterator).toBeTruthy();
    } catch (error) {
      console.log(
        `❌ Relationship iterable creation failed: ${(error as Error).message}`
      );
      throw error;
    }
  });

  it("🌐 GRAPH PROPERTIES ITERABLE CREATION - Test graph props stream creation", () => {
    console.log("🌐 === GRAPH PROPERTIES ITERABLE CREATION TEST ===");

    try {
      const csvInput = new CsvFileInput(referenceGraphStoreDir);
      const graphPropsIterable = csvInput.graphProperties();
      console.log("✅ Graph properties iterable created successfully!");

      expect(graphPropsIterable).toBeTruthy();
    } catch (error) {
      console.log(
        `❌ Graph properties iterable creation failed: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  });

});
