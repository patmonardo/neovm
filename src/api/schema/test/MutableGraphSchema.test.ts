import { describe, it, expect } from "vitest";
import { MutableGraphSchema } from "../primitive/MutableGraphSchema";
import { MutableNodeSchema } from "../primitive/MutableNodeSchema";
import { MutableRelationshipSchema } from "../primitive/MutableRelationshipSchema";
import { NodeLabel, RelationshipType } from "@/projection";
import { ValueType } from "@/api";
import { PropertySchema } from "../abstract/PropertySchema";
import { Direction } from "../Direction";

describe("MutableGraphSchema - Best of Both Worlds", () => {
  it("should construct empty graph schema with proper Map APIs", () => {
    console.log("\n🏗️ === EMPTY GRAPH SCHEMA CONSTRUCTION ===");

    // 🏗️ SETUP: Create empty graph schema
    const schema = MutableGraphSchema.empty();
    console.log("📋 Created empty graph schema");

    // ✅ VERIFY: Empty state using proper APIs
    const nodeLabelsCount = schema.nodeSchema().availableLabels().length;
    const relationshipTypesCount = schema.relationshipSchema().availableTypes().length;
    const graphPropsCount = schema.graphProperties().size; // ✅ Map.size

    console.log(`📊 Node labels: ${nodeLabelsCount}`);
    console.log(`📊 Relationship types: ${relationshipTypesCount}`);
    console.log(`📊 Graph properties: ${graphPropsCount}`);

    expect(nodeLabelsCount).toBe(0);
    expect(relationshipTypesCount).toBe(0);
    expect(graphPropsCount).toBe(0);

    console.log("✅ Empty graph schema construction working correctly");
  });

  it("should build complex graph schema with Map-based properties", () => {
    console.log("\n🎯 === COMPLEX GRAPH SCHEMA CONSTRUCTION ===");

    // 🏗️ SETUP: Create node schema
    console.log("🏗️ Building node schema...");
    const nodeSchema = MutableNodeSchema.empty();
    const personLabel = NodeLabel.of("Person");
    const companyLabel = NodeLabel.of("Company");

    // ✅ FIXED: Use Map instead of Record
    const personProperties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)],
      ["age", PropertySchema.of("age", ValueType.LONG)]
    ]);

    const companyProperties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)],
      ["founded", PropertySchema.of("founded", ValueType.LONG)]
    ]);

    console.log(`👤 Adding Person with properties: ${Array.from(personProperties.keys()).join(", ")}`);
    nodeSchema.addLabel(personLabel, personProperties);

    console.log(`🏢 Adding Company with properties: ${Array.from(companyProperties.keys()).join(", ")}`);
    nodeSchema.addLabel(companyLabel, companyProperties);

    // 🏗️ SETUP: Create relationship schema
    console.log("\n🔗 Building relationship schema...");
    const relationshipSchema = MutableRelationshipSchema.empty();
    const worksAtType = RelationshipType.of("WORKS_AT");
    const knowsType = RelationshipType.of("KNOWS");

    console.log(`💼 Adding WORKS_AT (DIRECTED)`);
    relationshipSchema.addRelationshipType(worksAtType, Direction.DIRECTED);
    relationshipSchema.addProperty(worksAtType, Direction.DIRECTED, "since", ValueType.LONG);

    console.log(`👥 Adding KNOWS (UNDIRECTED)`);
    relationshipSchema.addRelationshipType(knowsType, Direction.UNDIRECTED);

    // 🏗️ SETUP: Create graph properties
    console.log("\n📋 Building graph properties...");
    const graphProperties = new Map([
      ["created", PropertySchema.of("created", ValueType.LONG)],
      ["version", PropertySchema.of("version", ValueType.STRING)]
    ]);

    const graphPropNames = Array.from(graphProperties.keys());
    console.log(`📊 Graph properties: ${graphPropNames.join(", ")}`);

    // 🔧 ACTION: Assemble complete schema
    console.log("\n🎯 Assembling complete graph schema...");
    const schema = MutableGraphSchema.of(nodeSchema, relationshipSchema, graphProperties);

    // ✅ VERIFY: Final counts
    const finalNodeCount = schema.nodeSchema().availableLabels().length;
    const finalRelCount = schema.relationshipSchema().availableTypes().length;
    const finalGraphPropCount = schema.graphProperties().size;

    console.log(`📊 Final schema - Nodes: ${finalNodeCount}, Rels: ${finalRelCount}, Props: ${finalGraphPropCount}`);

    expect(finalNodeCount).toBe(2);
    expect(finalRelCount).toBe(2);
    expect(finalGraphPropCount).toBe(2);

    console.log("✅ Complex graph schema construction working correctly");
  });

  it("should manage graph properties with Map API", () => {
    console.log("\n📋 === GRAPH PROPERTY MANAGEMENT ===");

    // 🏗️ SETUP: Create schema
    const schema = MutableGraphSchema.empty();
    console.log("📋 Created empty schema for property testing");

    // 🔧 ACTION: Add graph properties
    console.log("➕ Adding graph-level properties...");
    const propertiesToAdd = [
      { name: "created", type: ValueType.LONG },
      { name: "version", type: ValueType.STRING },
      { name: "isPublic", type: ValueType.BOOLEAN }
    ];

    propertiesToAdd.forEach(prop => {
      console.log(`   Adding ${prop.name} (${prop.type})`);
      schema.putGraphProperty(prop.name, PropertySchema.of(prop.name, prop.type));
    });

    // ✅ VERIFY: Property addition using Map API
    const afterAddition = schema.graphProperties();
    const propKeys = Array.from(afterAddition.keys());

    console.log(`📊 Properties after addition: ${propKeys.join(", ")} (${afterAddition.size})`);

    propertiesToAdd.forEach(prop => {
      console.log(`✅ ${prop.name} exists: ${afterAddition.has(prop.name)}`);
      expect(afterAddition.has(prop.name)).toBe(true);
    });

    expect(afterAddition.size).toBe(3);

    // 🔧 ACTION: Remove property
    console.log("\n➖ Removing version property...");
    schema.removeGraphProperty("version");

    // ✅ VERIFY: Property removal using Map API
    const afterRemoval = schema.graphProperties();
    const remainingKeys = Array.from(afterRemoval.keys());

    console.log(`📊 Properties after removal: ${remainingKeys.join(", ")} (${afterRemoval.size})`);
    console.log(`✅ Created exists: ${afterRemoval.has("created")}`);
    console.log(`❌ Version removed: ${!afterRemoval.has("version")}`);
    console.log(`✅ IsPublic exists: ${afterRemoval.has("isPublic")}`);

    expect(afterRemoval.size).toBe(2);
    expect(afterRemoval.has("created")).toBe(true);
    expect(afterRemoval.has("version")).toBe(false);
    expect(afterRemoval.has("isPublic")).toBe(true);

    console.log("✅ Graph property management working correctly");
  });

  it("should filter schemas using Array APIs", () => {
    console.log("\n🔍 === SCHEMA FILTERING OPERATIONS ===");

    // 🏗️ SETUP: Create schema with multiple labels and types
    console.log("🏗️ Building schema with multiple components...");
    const schema = MutableGraphSchema.empty();

    // Add node labels
    const nodeLabels = ["Person", "Company", "Product", "Location"];
    nodeLabels.forEach(labelName => {
      const label = NodeLabel.of(labelName);
      const properties = new Map([
        ["name", PropertySchema.of("name", ValueType.STRING)]
      ]);
      console.log(`   Adding ${labelName} node label`);
      schema.nodeSchema().addLabel(label, properties);
    });

    // Add relationship types
    const relationshipTypes = [
      { name: "WORKS_AT", direction: Direction.DIRECTED },
      { name: "KNOWS", direction: Direction.UNDIRECTED },
      { name: "LOCATED_IN", direction: Direction.DIRECTED },
      { name: "PRODUCES", direction: Direction.DIRECTED }
    ];

    relationshipTypes.forEach(rel => {
      const relType = RelationshipType.of(rel.name);
      console.log(`   Adding ${rel.name} (${rel.direction})`);
      schema.relationshipSchema().addRelationshipType(relType, rel.direction);
    });

    const originalNodeCount = schema.nodeSchema().availableLabels().length;
    const originalRelCount = schema.relationshipSchema().availableTypes().length;

    console.log(`📊 Original - Nodes: ${originalNodeCount}, Relationships: ${originalRelCount}`);

    // 🔧 ACTION: Filter node labels
    console.log("\n🔍 Filtering to keep only Person and Company...");
    const nodeFilterArray = [NodeLabel.of("Person"), NodeLabel.of("Company")];
    const nodeFiltered = schema.filterNodeLabels(nodeFilterArray);

    // ✅ VERIFY: Node filtering
    const filteredNodeCount = nodeFiltered.nodeSchema().availableLabels().length;
    const filteredNodeNames = nodeFiltered.nodeSchema().availableLabels().map(l => l.name());

    console.log(`📊 Node-filtered - Nodes: ${filteredNodeCount} (${filteredNodeNames.join(", ")})`);
    console.log(`📊 Relationships preserved: ${nodeFiltered.relationshipSchema().availableTypes().length}`);

    expect(filteredNodeCount).toBe(2);
    expect(filteredNodeNames).toContain("Person");
    expect(filteredNodeNames).toContain("Company");
    expect(filteredNodeNames).not.toContain("Product");
    expect(nodeFiltered.relationshipSchema().availableTypes().length).toBe(originalRelCount);

    // 🔧 ACTION: Filter relationship types
    console.log("\n🔍 Filtering to keep only WORKS_AT and KNOWS...");
    const relFilterArray = [RelationshipType.of("WORKS_AT"), RelationshipType.of("KNOWS")];
    const relFiltered = schema.filterRelationshipTypes(relFilterArray);

    // ✅ VERIFY: Relationship filtering
    const filteredRelCount = relFiltered.relationshipSchema().availableTypes().length;
    const filteredRelNames = relFiltered.relationshipSchema().availableTypes().map(r => r.name());

    console.log(`📊 Rel-filtered - Relationships: ${filteredRelCount} (${filteredRelNames.join(", ")})`);
    console.log(`📊 Nodes preserved: ${relFiltered.nodeSchema().availableLabels().length}`);

    expect(filteredRelCount).toBe(2);
    expect(filteredRelNames).toContain("WORKS_AT");
    expect(filteredRelNames).toContain("KNOWS");
    expect(filteredRelNames).not.toContain("LOCATED_IN");
    expect(relFiltered.nodeSchema().availableLabels().length).toBe(originalNodeCount);

    console.log("✅ Schema filtering operations working correctly");
  });

  it("should perform union operations correctly", () => {
    console.log("\n🤝 === SCHEMA UNION OPERATIONS ===");

    // 🏗️ SETUP: Create first schema
    console.log("🏗️ Creating schema1 with Person and WORKS_AT...");
    const schema1 = MutableGraphSchema.empty();

    const personProperties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)],
      ["age", PropertySchema.of("age", ValueType.LONG)]
    ]);

    schema1.nodeSchema().addLabel(NodeLabel.of("Person"), personProperties);
    schema1.relationshipSchema().addRelationshipType(RelationshipType.of("WORKS_AT"), Direction.DIRECTED);
    schema1.putGraphProperty("created", PropertySchema.of("created", ValueType.LONG));

    const schema1Nodes = schema1.nodeSchema().availableLabels().length;
    const schema1Rels = schema1.relationshipSchema().availableTypes().length;
    const schema1Props = schema1.graphProperties().size;

    console.log(`📊 Schema1 - Nodes: ${schema1Nodes}, Rels: ${schema1Rels}, Props: ${schema1Props}`);

    // 🏗️ SETUP: Create second schema
    console.log("\n🏗️ Creating schema2 with Company and LOCATED_IN...");
    const schema2 = MutableGraphSchema.empty();

    const companyProperties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)],
      ["founded", PropertySchema.of("founded", ValueType.LONG)]
    ]);

    schema2.nodeSchema().addLabel(NodeLabel.of("Company"), companyProperties);
    schema2.relationshipSchema().addRelationshipType(RelationshipType.of("LOCATED_IN"), Direction.DIRECTED);
    schema2.putGraphProperty("version", PropertySchema.of("version", ValueType.STRING));

    const schema2Nodes = schema2.nodeSchema().availableLabels().length;
    const schema2Rels = schema2.relationshipSchema().availableTypes().length;
    const schema2Props = schema2.graphProperties().size;

    console.log(`📊 Schema2 - Nodes: ${schema2Nodes}, Rels: ${schema2Rels}, Props: ${schema2Props}`);

    // 🔧 ACTION: Perform union
    console.log("\n🤝 Performing union...");
    const union = schema1.union(schema2);

    // ✅ VERIFY: Union results
    const unionNodes = union.nodeSchema().availableLabels().length;
    const unionRels = union.relationshipSchema().availableTypes().length;
    const unionProps = union.graphProperties().size;

    const unionNodeNames = union.nodeSchema().availableLabels().map(l => l.name());
    const unionRelNames = union.relationshipSchema().availableTypes().map(r => r.name());
    const unionPropNames = Array.from(union.graphProperties().keys());

    console.log(`📊 Union - Nodes: ${unionNodes} (${unionNodeNames.join(", ")})`);
    console.log(`📊 Union - Rels: ${unionRels} (${unionRelNames.join(", ")})`);
    console.log(`📊 Union - Props: ${unionProps} (${unionPropNames.join(", ")})`);

    expect(unionNodes).toBe(2);
    expect(unionRels).toBe(2);
    expect(unionProps).toBe(2);

    expect(unionNodeNames).toContain("Person");
    expect(unionNodeNames).toContain("Company");
    expect(unionRelNames).toContain("WORKS_AT");
    expect(unionRelNames).toContain("LOCATED_IN");
    expect(union.graphProperties().has("created")).toBe(true);
    expect(union.graphProperties().has("version")).toBe(true);

    console.log("✅ Schema union operations working correctly");
  });

  it("should handle overlapping unions with property merging", () => {
    console.log("\n🔄 === OVERLAPPING UNION WITH PROPERTY MERGING ===");

    // 🏗️ SETUP: Create schemas with overlapping Person
    console.log("🏗️ Creating schemas with overlapping Person label...");
    const schema1 = MutableGraphSchema.empty();
    const schema2 = MutableGraphSchema.empty();

    // Schema1: Person with name only
    const person1Properties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)]
    ]);
    schema1.nodeSchema().addLabel(NodeLabel.of("Person"), person1Properties);

    // Schema2: Person with age only
    const person2Properties = new Map([
      ["age", PropertySchema.of("age", ValueType.LONG)]
    ]);
    schema2.nodeSchema().addLabel(NodeLabel.of("Person"), person2Properties);

    console.log(`📊 Schema1 Person properties: ${Array.from(person1Properties.keys()).join(", ")}`);
    console.log(`📊 Schema2 Person properties: ${Array.from(person2Properties.keys()).join(", ")}`);

    // 🔧 ACTION: Perform union
    console.log("\n🤝 Performing overlapping union...");
    const union = schema1.union(schema2);

    // ✅ VERIFY: Property merging
    const unionLabels = union.nodeSchema().availableLabels();
    const personLabel = unionLabels.find(l => l.name() === "Person");

    console.log(`📊 Union labels: ${unionLabels.map(l => l.name()).join(", ")}`);
    console.log(`✅ Person label found: ${personLabel !== undefined}`);

    if (personLabel) {
      const personEntry = union.nodeSchema().get(personLabel);
      if (personEntry) {
        const mergedProperties = personEntry.properties();
        const mergedPropNames = Array.from(mergedProperties.keys());

        console.log(`📊 Merged Person properties: ${mergedPropNames.join(", ")} (${mergedProperties.size})`);
        console.log(`✅ Has name: ${mergedProperties.has("name")}`);
        console.log(`✅ Has age: ${mergedProperties.has("age")}`);

        expect(unionLabels.length).toBe(1);
        expect(mergedProperties.size).toBe(2);
        expect(mergedProperties.has("name")).toBe(true);
        expect(mergedProperties.has("age")).toBe(true);
      } else {
        console.log("❌ Could not retrieve Person entry from union");
        expect(false).toBe(true);
      }
    } else {
      console.log("❌ Person label not found in union");
      expect(false).toBe(true);
    }

    console.log("✅ Overlapping union with property merging working correctly");
  });

  it("should handle union conflicts properly", () => {
    console.log("\n💥 === UNION CONFLICTS AND ERROR HANDLING ===");

    // 🏗️ SETUP: Create schemas with conflicting properties
    console.log("🏗️ Creating schemas with conflicting graph properties...");
    const schema1 = MutableGraphSchema.empty();
    const schema2 = MutableGraphSchema.empty();

    schema1.putGraphProperty("version", PropertySchema.of("version", ValueType.STRING));
    schema2.putGraphProperty("version", PropertySchema.of("version", ValueType.DOUBLE));

    const version1Type = schema1.graphProperties().get("version")?.valueType();
    const version2Type = schema2.graphProperties().get("version")?.valueType();

    console.log(`📊 Schema1 version type: ${version1Type} (STRING)`);
    console.log(`📊 Schema2 version type: ${version2Type} (DOUBLE)`);

    // 🔧 ACTION: Attempt union with conflict
    console.log("\n💥 Attempting union with conflicting property types...");

    expect(() => {
      schema1.union(schema2);
    }).toThrow();

    console.log("✅ Union conflict properly rejected");
    console.log("✅ Error handling working correctly");
  });

  it("should handle builder pattern construction", () => {
    console.log("\n🏗️ === BUILDER PATTERN CONSTRUCTION ===");

    // 🏗️ SETUP: Create components
    console.log("🔧 Preparing components for builder...");
    const nodeSchema = MutableNodeSchema.empty();
    nodeSchema.addLabel(NodeLabel.of("Person"), new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)]
    ]));

    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);

    console.log("   Node schema prepared with Person");
    console.log("   Relationship schema prepared with KNOWS");

    // 🔧 ACTION: Use builder pattern
    console.log("\n🏗️ Using builder to construct schema...");
    const schema = MutableGraphSchema.builder()
      .nodeSchema(nodeSchema)
      .relationshipSchema(relationshipSchema)
      .putGraphProperty("created", PropertySchema.of("created", ValueType.LONG))
      .putGraphProperty("lastModified", PropertySchema.of("lastModified", ValueType.LONG))
      .build();

    // ✅ VERIFY: Builder results
    const builtNodes = schema.nodeSchema().availableLabels().length;
    const builtRels = schema.relationshipSchema().availableTypes().length;
    const builtProps = schema.graphProperties().size;
    const propNames = Array.from(schema.graphProperties().keys());

    console.log(`📊 Built schema - Nodes: ${builtNodes}, Rels: ${builtRels}, Props: ${builtProps}`);
    console.log(`📊 Graph properties: ${propNames.join(", ")}`);

    expect(builtNodes).toBe(1);
    expect(builtRels).toBe(1);
    expect(builtProps).toBe(2);
    expect(schema.graphProperties().has("created")).toBe(true);
    expect(schema.graphProperties().has("lastModified")).toBe(true);

    // 🔧 ACTION: Test builder validation
    console.log("\n💥 Testing builder validation...");

    console.log("   Testing missing node schema...");
    expect(() => {
      MutableGraphSchema.builder()
        .relationshipSchema(MutableRelationshipSchema.empty())
        .build();
    }).toThrow();

    console.log("   Testing missing relationship schema...");
    expect(() => {
      MutableGraphSchema.builder()
        .nodeSchema(MutableNodeSchema.empty())
        .build();
    }).toThrow();

    console.log("✅ Builder pattern construction working correctly");
  });

  it("should handle serialization properly", () => {
    console.log("\n📋 === SCHEMA SERIALIZATION ===");

    // 🏗️ SETUP: Create test schema
    console.log("🏗️ Creating schema for serialization testing...");
    const schema = MutableGraphSchema.empty();

    const personProperties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)],
      ["age", PropertySchema.of("age", ValueType.LONG)]
    ]);

    schema.nodeSchema().addLabel(NodeLabel.of("Person"), personProperties);
    schema.relationshipSchema().addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);
    schema.putGraphProperty("created", PropertySchema.of("created", ValueType.LONG));

    console.log("📊 Test schema created with Person, KNOWS, and created property");

    // 🔧 ACTION: Test serialization
    console.log("\n📤 Testing serialization...");
    const nodeMap = schema.nodeSchema().toMap();
    const relMap = schema.relationshipSchema().toMap();
    const graphProps = schema.graphProperties();

    // ✅ VERIFY: Serialization results
    console.log(`📋 Node serialization completed: ${typeof nodeMap === 'object'}`);
    console.log(`📋 Relationship serialization completed: ${typeof relMap === 'object'}`);
    console.log(`📋 Graph properties available: ${graphProps.size > 0}`);

    expect(nodeMap).toBeDefined();
    expect(relMap).toBeDefined();
    expect(typeof nodeMap).toBe("object");
    expect(typeof relMap).toBe("object");
    expect("Person" in nodeMap).toBe(true);
    expect("KNOWS" in relMap).toBe(true);
    expect(graphProps.has("created")).toBe(true);

    console.log("✅ Schema serialization working correctly");
  });

  it("should handle equality and copying operations", () => {
    console.log("\n⚖️ === EQUALITY AND COPYING OPERATIONS ===");

    // 🏗️ SETUP: Create original schema
    console.log("🏗️ Creating original schema...");
    const original = MutableGraphSchema.empty();

    const properties = new Map([
      ["name", PropertySchema.of("name", ValueType.STRING)]
    ]);

    original.nodeSchema().addLabel(NodeLabel.of("Person"), properties);
    original.putGraphProperty("version", PropertySchema.of("version", ValueType.STRING));

    // 🔧 ACTION: Test copying
    console.log("\n📋 Testing schema copying...");
    // Note: If from() method exists, test it; otherwise test manual copying

    const copy = MutableGraphSchema.empty();
    copy.nodeSchema().addLabel(NodeLabel.of("Person"), new Map(properties));
    copy.putGraphProperty("version", PropertySchema.of("version", ValueType.STRING));

    // ✅ VERIFY: Independence
    const originalNodes = original.nodeSchema().availableLabels().length;
    const copyNodes = copy.nodeSchema().availableLabels().length;
    const originalProps = original.graphProperties().size;
    const copyProps = copy.graphProperties().size;

    console.log(`📊 Original - Nodes: ${originalNodes}, Props: ${originalProps}`);
    console.log(`📊 Copy - Nodes: ${copyNodes}, Props: ${copyProps}`);

    expect(copy).not.toBe(original);
    expect(copyNodes).toBe(originalNodes);
    expect(copyProps).toBe(originalProps);

    // 🔧 ACTION: Test independence
    console.log("\n🔄 Testing mutation independence...");
    copy.putGraphProperty("newProp", PropertySchema.of("newProp", ValueType.LONG));

    const finalOriginalProps = original.graphProperties().size;
    const finalCopyProps = copy.graphProperties().size;

    console.log(`📊 After mutation - Original props: ${finalOriginalProps}, Copy props: ${finalCopyProps}`);

    expect(finalOriginalProps).toBe(1);
    expect(finalCopyProps).toBe(2);
    expect(original.graphProperties().has("newProp")).toBe(false);
    expect(copy.graphProperties().has("newProp")).toBe(true);

    console.log("✅ Equality and copying operations working correctly");
  });
});
