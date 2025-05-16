import { NodeLabel } from "@/NodeLabel";
import { NodeProjection } from "@/NodeProjection";
import { NodeProjections } from "@/NodeProjections";
import { PropertyMapping } from "@/PropertyMapping";
import { PropertyMappings } from "@/PropertyMappings";

/**
 * Test script for NodeProjections class
 * This exercises all major functionality of the NodeProjections class
 */
function testNodeProjections() {
  console.log("===== TESTING NODE PROJECTIONS =====\n");

  // Test 1: Create NodeProjections with single() factory
  console.log("Test 1: Creating with single() factory");
  const label1 = new NodeLabel("Person");
  const proj1 = NodeProjection.of("Person");
  const personProjections = NodeProjections.single(label1, proj1);

  console.log(`Created projections with single label: ${personProjections.labelProjection()}`);
  console.log(`Number of projections: ${personProjections.size()}`);
  console.log(`Contains '${label1.name}': ${personProjections.containsKey(label1)}`);
  console.log(`Object representation:`, JSON.stringify(personProjections.toObject(), null, 2));
  console.log();

  // Test 2: Create NodeProjections with fromString()
  console.log("Test 2: Creating with fromString()");
  const movieProjections = NodeProjections.fromString("Movie");
  console.log(`Created projections from string: ${movieProjections.labelProjection()}`);
  console.log(`Number of projections: ${movieProjections.size()}`);
  console.log(`Object representation:`, JSON.stringify(movieProjections.toObject(), null, 2));
  console.log();

  // Test 3: Create NodeProjections with fromMap()
  console.log("Test 3: Creating with fromMap()");
  const mapProjections = NodeProjections.fromMap({
    "Actor": { label: "Actor", properties: { name: "fullName" } },
    "Director": { label: "Director", properties: { name: "directorName" } }
  });

  console.log(`Created projections from map: ${mapProjections.labelProjection()}`);
  console.log(`Number of projections: ${mapProjections.size()}`);
  console.log(`All properties:`, Array.from(mapProjections.allProperties()));
  console.log(`Object representation:`, JSON.stringify(mapProjections.toObject(), null, 2));
  console.log();

  // Test 4: Create NodeProjections with fromList()
  console.log("Test 4: Creating with fromList()");
  const listProjections = NodeProjections.fromList([
    "Genre",
    { "Studio": { label: "Studio", properties: { name: "studioName", founded: "yearFounded" } } }
  ]);

  console.log(`Created projections from list: ${listProjections.labelProjection()}`);
  console.log(`Number of projections: ${listProjections.size()}`);
  console.log(`All projections:`, listProjections.allProjections().map(p => p.label()));
  console.log(`Object representation:`, JSON.stringify(listProjections.toObject(), null, 2));
  console.log();

  // Test 5: Create ALL NodeProjections
  console.log("Test 5: Creating ALL projections");
  const allProjections = NodeProjections.all();
  console.log(`All projections label: ${allProjections.labelProjection()}`);
  console.log(`Is ALL projection: ${allProjections.allProjections()[0].projectAll()}`);
  console.log(`Object representation:`, JSON.stringify(allProjections.toObject(), null, 2));
  console.log();

  // Test 6: Adding property mappings
  console.log("Test 6: Adding property mappings");
  const baseProjection = NodeProjections.fromString("Customer");
  console.log(`Base projection:`, JSON.stringify(baseProjection.toObject(), null, 2));

  // Create property mappings
  const nameMapping = PropertyMapping.of("name", "customerName");
  const ageMapping = PropertyMapping.of("age", "customerAge");
  const propertyMappings = PropertyMappings.of(nameMapping, ageMapping);

  // Add mappings to projections
  const enhancedProjection = baseProjection.addPropertyMappings(propertyMappings);
  console.log(`Enhanced projection:`, JSON.stringify(enhancedProjection.toObject(), null, 2));
  console.log(`All properties:`, Array.from(enhancedProjection.allProperties()));
  console.log();

  // Test 7: Property validation (success case)
  console.log("Test 7: Property validation (success case)");
  try {
    enhancedProjection.validatePropertyKeyMappings();
    console.log("✓ Property validation succeeded (no conflicts)");
  } catch (error) {
    console.error ("✗ Property validation failed unexpectedly:", (error as Error).message);
  }
  console.log();

  // Test 8: Property validation (failure case with conflicting neo properties)
  console.log("Test 8: Property validation (failure case - conflicting neo properties)");
  try {
    // Create projections with conflicting property mappings
    const conflictingMap = {
      "Customer": {
        label: "Customer",
        properties: { name: "fullName" }
      },
      "VIP": {
        label: "VIP",
        properties: { name: "shortName" } // Same property key 'name' but different neo keys
      }
    };

    const conflictingProjections = NodeProjections.fromMap(conflictingMap);
    conflictingProjections.validatePropertyKeyMappings();
    console.log("✗ Property validation should have failed but didn't");
  } catch (error) {
    console.log("✓ Property validation correctly failed:", (error as Error).message);
  }
  console.log();

  // Test 9: Get projection by identifier
  console.log("Test 9: Get projection by identifier");
  const actorLabel = new NodeLabel("Actor");
  const directorLabel = new NodeLabel("Director");
  const projection = mapProjections.get(actorLabel);

  if (projection) {
    console.log(`Found projection for '${actorLabel.name}': ${projection.label()}`);
  } else {
    console.log(`No projection found for '${actorLabel.name}'`);
  }

  const nonExistentProjection = mapProjections.get(new NodeLabel("NonExistent"));
  console.log(`Projection for 'NonExistent': ${nonExistentProjection ? 'Found' : 'Not found'}`);
  console.log();

  // Test 10: Test empty projections handling
  console.log("Test 10: Empty projections handling");
  try {
    NodeProjections.create(new Map());
    console.log("✗ Creating empty projections should have failed");
  } catch (error) {
    console.log("✓ Creating empty projections correctly failed:", (error as Error).message);
  }

  console.log("\n===== NODE PROJECTIONS TESTS COMPLETE =====");
}

// Run the test
testNodeProjections();
