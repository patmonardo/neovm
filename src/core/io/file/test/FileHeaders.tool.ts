import { describe, it, expect } from 'vitest';
import { NodeFileHeader } from '../NodeFileHeader';
import { RelationshipFileHeader } from '../RelationshipFileHeader';
import { GraphPropertyFileHeader } from '../GraphPropertyFileHeader';
import { CsvFileInput } from '../csv/CsvFileInput';

/**
 * 🧪 COMPREHENSIVE FILE HEADER EXPLORATION TOOL
 *
 * This tool examines ALL file header types in our IO/FILES layer
 * to understand the complete CSV import architecture.
 *
 * Headers we'll explore:
 * 1. 📋 NodeFileHeader - Node CSV structure
 * 2. 🔗 RelationshipFileHeader - Relationship CSV structure
 * 3. 🌐 GraphPropertyFileHeader - Graph property CSV structure
 * 4. 🎯 Complete file structure analysis from real CSV data
 */

/**
 * Enhanced logger for detailed file header analysis.
 */
class FileHeaderExplorer {
  private depth = 0;

  section(title: string): void {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 ${title}`);
    console.log(`${'='.repeat(50)}`);
  }

  subsection(title: string): void {
    console.log(`\n📋 ${title}`);
    console.log(`${'-'.repeat(30)}`);
  }

  info(message: string): void {
    const indent = '  '.repeat(this.depth);
    console.log(`${indent}ℹ️ ${message}`);
  }

  success(message: string): void {
    const indent = '  '.repeat(this.depth);
    console.log(`${indent}✅ ${message}`);
  }

  data(label: string, value: any): void {
    const indent = '  '.repeat(this.depth);
    console.log(`${indent}📊 ${label}: ${JSON.stringify(value, null, 2)}`);
  }

  structure(label: string, obj: any): void {
    const indent = '  '.repeat(this.depth);
    console.log(`${indent}🏗️ ${label}:`);
    this.depth++;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        console.log(`${indent}  [${index}]: ${JSON.stringify(item)}`);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object') {
          console.log(`${indent}  ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`${indent}  ${key}: ${value}`);
        }
      });
    } else {
      console.log(`${indent}  ${obj}`);
    }

    this.depth--;
  }

  indent(): void {
    this.depth++;
  }

  outdent(): void {
    this.depth = Math.max(0, this.depth - 1);
  }
}

describe('🧪 Complete File Header Architecture Explorer', () => {
  const explorer = new FileHeaderExplorer();

  describe('📋 Node File Header Deep Analysis', () => {
    it('should analyze various node CSV structures', () => {
      explorer.section("NODE FILE HEADER STRUCTURAL ANALYSIS");

      const nodeExamples = [
        {
          name: "Basic User Nodes",
          headers: [":ID", "username:string", "email:string", "age:long", ":LABEL"],
          labels: ["User"],
          description: "Simple user nodes with basic properties"
        },
        {
          name: "Multi-Label Employee Nodes",
          headers: [":ID", "firstName:string", "lastName:string", "salary:double", "isManager:boolean", ":LABEL"],
          labels: ["Person", "Employee", "Staff"],
          description: "Complex nodes with multiple labels"
        },
        {
          name: "Property-Rich Company Nodes",
          headers: [":ID", "name:string", "industry:string", "employees:long", "revenue:double", "founded:long", "public:boolean", ":LABEL"],
          labels: ["Company", "Organization"],
          description: "Nodes with many typed properties"
        },
        {
          name: "Minimal Nodes",
          headers: [":ID", ":LABEL"],
          labels: ["MinimalNode"],
          description: "Nodes with only ID and labels"
        },
        {
          name: "Unlabeled Data Nodes",
          headers: [":ID", "data:string", "metadata:string"],
          labels: [],
          description: "Nodes without explicit labels (ALL_NODES)"
        }
      ];

      nodeExamples.forEach((example, index) => {
        explorer.subsection(`Example ${index + 1}: ${example.name}`);
        explorer.info(example.description);
        explorer.data("CSV Headers", example.headers);
        explorer.data("Node Labels", example.labels);

        try {
          const header = NodeFileHeader.of(example.headers, example.labels);

          explorer.success("Header parsed successfully");
          explorer.structure("Final Labels", header.nodeLabels());
          explorer.structure("Property Mappings", header.propertyMappings().map(prop => ({
            columnIndex: prop.position(),
            propertyKey: prop.propertyKey(),
            sourceColumn: example.headers[prop.position()]
          })));

          // Analyze property types
          explorer.indent();
          explorer.info("Property Type Analysis:");
          header.propertyMappings().forEach(prop => {
            const columnHeader = example.headers[prop.position()];
            const [propName, propType] = columnHeader.split(':');
            explorer.info(`  ${propName} → ${propType || 'string (default)'}`);
          });
          explorer.outdent();

        } catch (error) {
          explorer.info(`❌ Error: ${(error as Error).message}`);
        }
      });
    });
  });

  describe('🔗 Relationship File Header Deep Analysis', () => {
    it('should analyze relationship CSV structures', () => {
      explorer.section("RELATIONSHIP FILE HEADER STRUCTURAL ANALYSIS");

      const relationshipExamples = [
        {
          name: "Basic FOLLOWS Relationships",
          headers: [":START_ID", ":END_ID", ":TYPE"],
          relationshipType: "FOLLOWS",
          description: "Simple relationships without properties"
        },
        {
          name: "Friendship with Properties",
          headers: [":START_ID", ":END_ID", "since:string", "strength:double", ":TYPE"],
          relationshipType: "FRIENDS",
          description: "Relationships with typed properties"
        },
        {
          name: "Employment Relationships",
          headers: [":START_ID", ":END_ID", "startDate:string", "position:string", "salary:double", "isActive:boolean", ":TYPE"],
          relationshipType: "EMPLOYED_BY",
          description: "Complex relationships with multiple properties"
        },
        {
          name: "Minimal Relationships",
          headers: [":START_ID", ":END_ID", ":TYPE"],
          relationshipType: "RELATES_TO",
          description: "Minimal relationship structure"
        }
      ];

      relationshipExamples.forEach((example, index) => {
        explorer.subsection(`Example ${index + 1}: ${example.name}`);
        explorer.info(example.description);
        explorer.data("CSV Headers", example.headers);
        explorer.data("Relationship Type", example.relationshipType);

        try {
          const header = RelationshipFileHeader.of(example.headers, example.relationshipType);

          explorer.success("Header parsed successfully");
          explorer.structure("Relationship Type", header.relationshipType());
          explorer.structure("Property Mappings", header.propertyMappings().map(prop => ({
            columnIndex: prop.position(),
            propertyKey: prop.propertyKey(),
            sourceColumn: example.headers[prop.position()]
          })));

          // Analyze special columns
          explorer.indent();
          explorer.info("Special Column Analysis:");
          explorer.info(`  START_ID column: index 0`);
          explorer.info(`  END_ID column: index 1`);
          explorer.info(`  TYPE column: index ${example.headers.indexOf(':TYPE')}`);
          explorer.info(`  Property columns: ${header.propertyMappings().length}`);
          explorer.outdent();

        } catch (error) {
          explorer.info(`❌ Error: ${(error as Error).message}`);
        }
      });
    });
  });

  describe('🌐 Graph Property File Header Deep Analysis', () => {
    it('should analyze graph property CSV structures', () => {
      explorer.section("GRAPH PROPERTY FILE HEADER STRUCTURAL ANALYSIS");

      const graphPropertyExamples = [
        {
          name: "Basic Graph Metadata",
          headers: ["propertyKey", "propertyValue"],
          description: "Simple key-value graph properties"
        },
        {
          name: "Typed Graph Properties",
          headers: ["propertyKey", "propertyValue", "propertyType"],
          description: "Graph properties with type information"
        },
        {
          name: "Extended Graph Metadata",
          headers: ["propertyKey", "propertyValue", "propertyType", "propertyState", "defaultValue"],
          description: "Complete graph property metadata"
        }
      ];

      graphPropertyExamples.forEach((example, index) => {
        explorer.subsection(`Example ${index + 1}: ${example.name}`);
        explorer.info(example.description);
        explorer.data("CSV Headers", example.headers);

        try {
          const header = GraphPropertyFileHeader.of(example.headers);

          explorer.success("Header parsed successfully");
          explorer.structure("Property Mappings", header.propertyMappings().map(prop => ({
            columnIndex: prop.position(),
            propertyKey: prop.propertyKey(),
            sourceColumn: example.headers[prop.position()]
          })));

          // Analyze column purposes
          explorer.indent();
          explorer.info("Column Purpose Analysis:");
          example.headers.forEach((columnName, index) => {
            let purpose = "Data column";
            if (columnName.includes("Key")) purpose = "Property key identifier";
            if (columnName.includes("Value")) purpose = "Property value data";
            if (columnName.includes("Type")) purpose = "Value type information";
            if (columnName.includes("State")) purpose = "Property state (persistent/transient)";
            if (columnName.includes("default")) purpose = "Default value specification";

            explorer.info(`  Column ${index} (${columnName}): ${purpose}`);
          });
          explorer.outdent();

        } catch (error) {
          explorer.info(`❌ Error: ${(error as Error).message}`);
        }
      });
    });
  });

  describe('🎯 Real CSV File Structure Analysis', () => {
    it('should analyze actual CSV file structures from reference data', async () => {
      explorer.section("REAL CSV FILE STRUCTURE ANALYSIS");

      const csvPath = "/home/pat/VSCode/neovm/src/tools/reference-graphstore";

      try {
        const fileInput = new CsvFileInput(csvPath);

        explorer.subsection("File Input Overview");
        const graphInfo = fileInput.graphInfo();
        explorer.data("Database Name", graphInfo.databaseInfo.databaseName);
        explorer.data("Total Nodes", graphInfo.nodeCount);
        explorer.data("Max Original ID", graphInfo.maxOriginalId);
        explorer.data("Relationship Counts", Object.fromEntries(graphInfo.relationshipTypeCounts));

        // Analyze node schema structure
        explorer.subsection("Node Schema Structure");
        const nodeSchema = fileInput.nodeSchema();
        const nodeLabels = Array.from(nodeSchema.availableLabels()).map(l => l.name());
        explorer.data("Available Node Labels", nodeLabels);

        explorer.indent();
        nodeLabels.forEach(labelName => {
          const label = Array.from(nodeSchema.availableLabels()).find(l => l.name() === labelName);
          if (label) {
            const properties = nodeSchema.propertySchemasFor(label);
            explorer.info(`Label "${labelName}":`);
            explorer.indent();
            properties.forEach(prop => {
              explorer.info(`  Property: ${prop.key()} (${prop.valueType()})`);
            });
            explorer.outdent();
          }
        });
        explorer.outdent();

        // Analyze relationship schema structure
        explorer.subsection("Relationship Schema Structure");
        const relationshipSchema = fileInput.relationshipSchema();
        const relationshipTypes = Array.from(relationshipSchema.availableTypes()).map(t => t.name());
        explorer.data("Available Relationship Types", relationshipTypes);

        explorer.indent();
        relationshipTypes.forEach(typeName => {
          const type = Array.from(relationshipSchema.availableTypes()).find(t => t.name() === typeName);
          if (type) {
            const properties = relationshipSchema.propertySchemasFor(type);
            explorer.info(`Type "${typeName}":`);
            explorer.indent();
            properties.forEach(prop => {
              explorer.info(`  Property: ${prop.key()} (${prop.valueType()})`);
            });
            explorer.outdent();
          }
        });
        explorer.outdent();

        // Analyze graph property schema
        explorer.subsection("Graph Property Schema Structure");
        const graphPropertySchema = fileInput.graphPropertySchema();
        explorer.data("Graph Properties Count", graphPropertySchema.size);

        explorer.indent();
        for (const [key, schema] of graphPropertySchema) {
          explorer.info(`Property "${key}":`);
          explorer.indent();
          explorer.info(`  Value Type: ${schema.valueType()}`);
          explorer.info(`  Property State: ${schema.propertyState()}`);
          explorer.info(`  Has Default: ${schema.defaultValue() !== null}`);
          explorer.outdent();
        }
        explorer.outdent();

        explorer.success("Real CSV file analysis completed successfully");

      } catch (error) {
        explorer.info(`❌ Error analyzing real CSV files: ${(error as Error).message}`);
      }
    });
  });

  describe('🔬 File Header Performance Analysis', () => {
    it('should analyze header parsing performance characteristics', () => {
      explorer.section("FILE HEADER PERFORMANCE ANALYSIS");

      const testSizes = [5, 20, 50, 100, 200];

      testSizes.forEach(size => {
        explorer.subsection(`Performance Test: ${size} Properties`);

        // Generate large node header
        const nodeHeaders = [":ID"];
        for (let i = 1; i < size; i++) {
          const types = ["string", "long", "double", "boolean"];
          const type = types[i % types.length];
          nodeHeaders.push(`prop${i}:${type}`);
        }
        nodeHeaders.push(":LABEL");

        // Test node header parsing
        const nodeStartTime = performance.now();
        const nodeHeader = NodeFileHeader.of(nodeHeaders, [`TestNode${size}`]);
        const nodeParseTime = performance.now() - nodeStartTime;

        explorer.info(`Node Header (${size} props):`);
        explorer.indent();
        explorer.info(`Parse time: ${nodeParseTime.toFixed(3)}ms`);
        explorer.info(`Properties: ${nodeHeader.propertyMappings().length}`);
        explorer.info(`Throughput: ${(nodeHeader.propertyMappings().length / nodeParseTime * 1000).toFixed(0)} props/sec`);
        explorer.outdent();

        // Generate relationship header
        const relHeaders = [":START_ID", ":END_ID"];
        for (let i = 0; i < Math.min(size - 3, 50); i++) {
          const types = ["string", "long", "double", "boolean"];
          const type = types[i % types.length];
          relHeaders.push(`relProp${i}:${type}`);
        }
        relHeaders.push(":TYPE");

        // Test relationship header parsing
        const relStartTime = performance.now();
        const relHeader = RelationshipFileHeader.of(relHeaders, `TEST_REL_${size}`);
        const relParseTime = performance.now() - relStartTime;

        explorer.info(`Relationship Header (${Math.min(size - 3, 50)} props):`);
        explorer.indent();
        explorer.info(`Parse time: ${relParseTime.toFixed(3)}ms`);
        explorer.info(`Properties: ${relHeader.propertyMappings().length}`);
        explorer.info(`Throughput: ${(relHeader.propertyMappings().length / relParseTime * 1000).toFixed(0)} props/sec`);
        explorer.outdent();
      });
    });
  });

  describe('🎭 Error Handling and Edge Cases', () => {
    it('should test comprehensive error scenarios', () => {
      explorer.section("ERROR HANDLING AND EDGE CASES");

      const errorScenarios = [
        {
          category: "Node Header Errors",
          tests: [
            {
              name: "Missing :ID column",
              headers: ["name:string", "age:long"],
              labels: ["Person"],
              expectError: true
            },
            {
              name: "Invalid property type",
              headers: [":ID", "age:invalidtype", ":LABEL"],
              labels: ["Person"],
              expectError: true
            },
            {
              name: "Empty headers",
              headers: [],
              labels: ["Person"],
              expectError: true
            }
          ]
        },
        {
          category: "Relationship Header Errors",
          tests: [
            {
              name: "Missing :START_ID",
              headers: [":END_ID", ":TYPE"],
              type: "FOLLOWS",
              expectError: true
            },
            {
              name: "Missing :END_ID",
              headers: [":START_ID", ":TYPE"],
              type: "FOLLOWS",
              expectError: true
            },
            {
              name: "Missing :TYPE",
              headers: [":START_ID", ":END_ID"],
              type: "FOLLOWS",
              expectError: true
            }
          ]
        }
      ];

      errorScenarios.forEach(scenario => {
        explorer.subsection(scenario.category);

        scenario.tests.forEach((test, index) => {
          explorer.info(`Test ${index + 1}: ${test.name}`);
          explorer.indent();

          try {
            if ('labels' in test) {
              // Node header test
              const header = NodeFileHeader.of(test.headers, test.labels);
              if (test.expectError) {
                explorer.info("❌ Expected error but parsing succeeded");
              } else {
                explorer.success("Parsing succeeded as expected");
              }
            } else {
              // Relationship header test
              const header = RelationshipFileHeader.of(test.headers, test.type);
              if (test.expectError) {
                explorer.info("❌ Expected error but parsing succeeded");
              } else {
                explorer.success("Parsing succeeded as expected");
              }
            }
          } catch (error) {
            if (test.expectError) {
              explorer.success(`Correctly caught error: ${(error as Error).message}`);
            } else {
              explorer.info(`❌ Unexpected error: ${(error as Error).message}`);
            }
          }

          explorer.outdent();
        });
      });
    });
  });
});
