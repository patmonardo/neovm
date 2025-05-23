import { MutableGraphSchema } from "../primitive/MutableGraphSchema";
import { MutableNodeSchema } from "../primitive/MutableNodeSchema";
import { MutableRelationshipSchema } from "../primitive/MutableRelationshipSchema";
import { NodeLabel } from "@/projection";
import { RelationshipType } from "@/projection";
import { ValueType } from "@/api/ValueType";
import { PropertySchema } from "../abstract/PropertySchema";
import { Direction } from "../Direction";

describe("MutableGraphSchema", () => {
  // Helper function to create a test schema with predefined data
  function createTestSchema(): MutableGraphSchema {
    // Create node schema
    const nodeSchema = MutableNodeSchema.empty();
    nodeSchema.addLabel(NodeLabel.of("Person"), {
      name: PropertySchema.of("name", ValueType.STRING),
      age: PropertySchema.of("age", ValueType.LONG),
    });
    nodeSchema.addLabel(NodeLabel.of("Company"), {
      name: PropertySchema.of("name", ValueType.STRING),
      founded: PropertySchema.of("founded", ValueType.LONG),
    });

    // Create relationship schema
    const relationshipSchema = MutableRelationshipSchema.empty();
    relationshipSchema.addRelationshipType(RelationshipType.of("WORKS_AT"), Direction.DIRECTED);
    relationshipSchema.addProperty(
      RelationshipType.of("WORKS_AT"),
      Direction.DIRECTED,
      "since",
      ValueType.LONG
    );
    relationshipSchema.addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);

    // Create graph properties
    const graphProperties = new Map<string, PropertySchema>();
    graphProperties.set("created", PropertySchema.of("created", ValueType.LONG));

    // Create and return the graph schema
    return MutableGraphSchema.of(nodeSchema, relationshipSchema, graphProperties);
  }

  // Construction Tests
  describe("construction", () => {
    it("should create an empty graph schema", () => {
      const schema = MutableGraphSchema.empty();
      expect(schema.nodeSchema().availableLabels().size).toBe(0);
      expect(schema.relationshipSchema().availableTypes().size).toBe(0);
      expect(schema.graphProperties().size).toBe(0);
    });

    it("should create from existing components", () => {
      const nodeSchema = MutableNodeSchema.empty();
      nodeSchema.addLabel(NodeLabel.of("Person"));

      const relationshipSchema = MutableRelationshipSchema.empty();
      relationshipSchema.addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);

      const graphProperties = new Map<string, PropertySchema>();
      graphProperties.set("created", PropertySchema.of("created", ValueType.LONG));

      const schema = MutableGraphSchema.of(nodeSchema, relationshipSchema, graphProperties);

      expect(schema.nodeSchema().availableLabels().size).toBe(1);
      expect(schema.relationshipSchema().availableTypes().size).toBe(1);
      expect(schema.graphProperties().size).toBe(1);
    });

    it("should create a copy using from()", () => {
      const original = createTestSchema();
      const copy = MutableGraphSchema.from(original);

      // Should be a deep copy with equal contents
      expect(copy.nodeSchema().availableLabels().size).toBe(2);
      expect(copy.relationshipSchema().availableTypes().size).toBe(2);
      expect(copy.graphProperties().size).toBe(1);

      // Should be different instances
      expect(copy).not.toBe(original);
      expect(copy.nodeSchema()).not.toBe(original.nodeSchema());
    });
  });

  // Graph Properties Tests
  describe("graph properties", () => {
    it("should add and retrieve graph properties", () => {
      const schema = MutableGraphSchema.empty();

      schema.putGraphProperty("created", PropertySchema.of("created", ValueType.LONG));
      schema.putGraphProperty("version", PropertySchema.of("version", ValueType.DOUBLE));

      expect(schema.graphProperties().size).toBe(2);
      expect(schema.graphProperties().has("created")).toBe(true);
      expect(schema.graphProperties().has("version")).toBe(true);
    });

    it("should remove graph properties", () => {
      const schema = MutableGraphSchema.empty();

      schema.putGraphProperty("created", PropertySchema.of("created", ValueType.LONG));
      schema.putGraphProperty("version", PropertySchema.of("version", ValueType.DOUBLE));
      schema.removeGraphProperty("version");

      expect(schema.graphProperties().size).toBe(1);
      expect(schema.graphProperties().has("created")).toBe(true);
      expect(schema.graphProperties().has("version")).toBe(false);
    });
  });

  // Filtering Tests
  describe("filtering", () => {
    it("should filter node labels", () => {
      const schema = createTestSchema();
      const filtered = schema.filterNodeLabels(new Set([NodeLabel.of("Person")]));

      // Should only have Person label
      expect(filtered.nodeSchema().availableLabels().size).toBe(1);
      expect(filtered.nodeSchema().availableLabels().has(NodeLabel.of("Person"))).toBe(true);
      expect(filtered.nodeSchema().availableLabels().has(NodeLabel.of("Company"))).toBe(false);

      // Relationships and graph properties should remain intact
      expect(filtered.relationshipSchema().availableTypes().size).toBe(2);
      expect(filtered.graphProperties().size).toBe(1);
    });

    it("should filter relationship types", () => {
      const schema = createTestSchema();
      const filtered = schema.filterRelationshipTypes(new Set([RelationshipType.of("KNOWS")]));

      // Should only have KNOWS relationship
      expect(filtered.relationshipSchema().availableTypes().size).toBe(1);
      expect(filtered.relationshipSchema().availableTypes().has(RelationshipType.of("KNOWS"))).toBe(true);
      expect(filtered.relationshipSchema().availableTypes().has(RelationshipType.of("WORKS_AT"))).toBe(false);

      // Nodes and graph properties should remain intact
      expect(filtered.nodeSchema().availableLabels().size).toBe(2);
      expect(filtered.graphProperties().size).toBe(1);
    });
  });

  // Union Tests
  describe("union", () => {
    it("should merge two schemas with different elements", () => {
      // First schema
      const schema1 = MutableGraphSchema.empty();
      schema1.nodeSchema().addLabel(NodeLabel.of("Person"), {
        name: PropertySchema.of("name", ValueType.STRING),
      });
      schema1.graphProperties().set("created", PropertySchema.of("created", ValueType.LONG));

      // Second schema
      const schema2 = MutableGraphSchema.empty();
      schema2.nodeSchema().addLabel(NodeLabel.of("Company"), {
        founded: PropertySchema.of("founded", ValueType.LONG),
      });
      schema2.relationshipSchema().addRelationshipType(RelationshipType.of("LOCATED_IN"), Direction.DIRECTED);

      // Union
      const union = schema1.union(schema2);

      expect(union.nodeSchema().availableLabels().size).toBe(2);
      expect(union.relationshipSchema().availableTypes().size).toBe(1);
      expect(union.graphProperties().size).toBe(1);
    });

    it("should merge overlapping schemas correctly", () => {
      // First schema
      const schema1 = MutableGraphSchema.empty();
      schema1.nodeSchema().addLabel(NodeLabel.of("Person"), {
        name: PropertySchema.of("name", ValueType.STRING),
      });

      // Second schema with same label but different property
      const schema2 = MutableGraphSchema.empty();
      schema2.nodeSchema().addLabel(NodeLabel.of("Person"), {
        age: PropertySchema.of("age", ValueType.LONG),
      });

      // Union
      const union = schema1.union(schema2);

      expect(union.nodeSchema().availableLabels().size).toBe(1);

      // Person should have both properties
      const personEntry = union.nodeSchema().get(NodeLabel.of("Person"));
      expect(personEntry).toBeDefined();
      expect(personEntry!.properties()).toHaveProperty("name");
      expect(personEntry!.properties()).toHaveProperty("age");
    });

    it("should throw error when merging conflicting property types", () => {
      // First schema
      const schema1 = MutableGraphSchema.empty();
      schema1.putGraphProperty("version", PropertySchema.of("version", ValueType.STRING));

      // Second schema with same property name but different type
      const schema2 = MutableGraphSchema.empty();
      schema2.putGraphProperty("version", PropertySchema.of("version", ValueType.DOUBLE));

      // Union should fail due to conflicting property types
      expect(() => schema1.union(schema2)).toThrow();
    });
  });

  // Builder Tests
  describe("builder pattern", () => {
    it("should build a schema using the builder", () => {
      const nodeSchema = MutableNodeSchema.empty();
      nodeSchema.addLabel(NodeLabel.of("Person"));

      const relationshipSchema = MutableRelationshipSchema.empty();
      relationshipSchema.addRelationshipType(RelationshipType.of("KNOWS"), Direction.UNDIRECTED);

      const schema = MutableGraphSchema.builder()
        .nodeSchema(nodeSchema)
        .relationshipSchema(relationshipSchema)
        .putGraphProperty("created", PropertySchema.of("created", ValueType.LONG))
        .build();

      expect(schema.nodeSchema().availableLabels().size).toBe(1);
      expect(schema.relationshipSchema().availableTypes().size).toBe(1);
      expect(schema.graphProperties().size).toBe(1);
    });

    it("should throw error when building with missing components", () => {
      // Missing node schema
      expect(() => {
        MutableGraphSchema.builder()
          .relationshipSchema(MutableRelationshipSchema.empty())
          .build();
      }).toThrow();

      // Missing relationship schema
      expect(() => {
        MutableGraphSchema.builder()
          .nodeSchema(MutableNodeSchema.empty())
          .build();
      }).toThrow();
    });
  });

  // Serialization Tests
  describe("serialization", () => {
    it("should serialize a complex schema to a map", () => {
      const schema = createTestSchema();

      // Access the underlying node and relationship schemas for serialization
      const nodeMap = schema.nodeSchema().toMap();
      const relationshipMap = schema.relationshipSchema().toMap();

      console.log("Node Schema:", JSON.stringify(nodeMap, null, 2));
      console.log("Relationship Schema:", JSON.stringify(relationshipMap, null, 2));

      // Node schema checks
      expect(nodeMap).toHaveProperty("Person");
      expect(nodeMap.Person).toHaveProperty("name");
      expect(nodeMap.Person).toHaveProperty("age");

      expect(nodeMap).toHaveProperty("Company");
      expect(nodeMap.Company).toHaveProperty("name");
      expect(nodeMap.Company).toHaveProperty("founded");

      // Relationship schema checks
      expect(relationshipMap).toHaveProperty("WORKS_AT");
      expect(relationshipMap).toHaveProperty("KNOWS");
    });
  });
});
