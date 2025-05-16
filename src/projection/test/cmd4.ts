import { NodeProjection } from "./NodeProjection";
import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";
import { NodeLabel } from "./NodeLabel";
import { ElementProjection } from "./ElementProjection";

/**
 * Test script for NodeProjection class
 * Tests all major functionality of NodeProjection without using NodeProjections
 */
function testNodeProjection() {
  console.log("===== NODE PROJECTION TEST =====\n");

  // 1. Creating NodeProjections with different factory methods
  console.log("1. Creating NodeProjections with different factory methods:");

  // 1.1 Using fromString
  const personProj = NodeProjection.fromString("Person");
  console.log(`- fromString: label = "${personProj.label()}", projectAll = ${personProj.projectAll()}`);

  // 1.2 Using of()
  const movieProj = NodeProjection.of("Movie");
  console.log(`- of(): label = "${movieProj.label()}", projectAll = ${movieProj.projectAll()}`);

  // 1.3 Using fromObject with string
  const actorProj = NodeProjection.fromObject("Actor", new NodeLabel("DefaultLabel"));
  console.log(`- fromObject(string): label = "${actorProj.label()}", projectAll = ${actorProj.projectAll()}`);

  // 1.4 Using fromObject with object
  const directorProj = NodeProjection.fromObject(
    { label: "Director", properties: { name: "fullName", born: "birthYear" } },
    new NodeLabel("DefaultLabel")
  );
  console.log(`- fromObject(object): label = "${directorProj.label()}", projectAll = ${directorProj.projectAll()}`);
  console.log(`  - Properties: ${Array.from(directorProj.properties().propertyKeys()).join(", ")}`);

  // 1.5 Using all()
  const allProj = NodeProjection.all();
  console.log(`- all(): label = "${allProj.label()}", projectAll = ${allProj.projectAll()}`);

  // 2. Building with NodeProjectionBuilder
  console.log("\n2. Skipping with NodeProjectionBuilder:");

  // // 2.1 Basic builder
  // const genreProj = NodeProjection.builder()
  //   .label("Genre")
  //   .build();
  // console.log(`- Basic builder: label = "${genreProj.label()}"`);

  // // 2.2 Builder with properties
  // const studioProj = NodeProjection.builder()
  //   .label("Studio")
  //   .properties(PropertyMappings.of(
  //     PropertyMapping.of("name", "studioName"),
  //     PropertyMapping.of("founded", "yearFounded")
  //   ))
  //   .build();
  // console.log(`- Builder with properties: label = "${studioProj.label()}"`);
  // console.log(`  - Properties: ${Array.from(studioProj.properties().propertyKeys()).join(", ")}`);

  // // 2.3 Builder with addProperty methods
  // const crewProj = NodeProjection.builder()
  //   .label("Crew")
  //   .addProperty(PropertyMapping.of("role"))
  //   .addProperties(
  //     PropertyMapping.of("department"),
  //     PropertyMapping.of("credits")
  //   )
  //   .build();
  // console.log(`- Builder with addProperty: label = "${crewProj.label()}"`);
  // console.log(`  - Properties: ${Array.from(crewProj.properties().propertyKeys()).join(", ")}`);

  // 3. Adding property mappings to existing projection
  console.log("\n3. Adding property mappings to existing projection:");

  // 3.1 Create base projection
  const baseProj = NodeProjection.of("Award");
  console.log(`- Base projection: label = "${baseProj.label()}"`);
  console.log(`  - Initial properties: ${baseProj.properties().size()}`);

  // 3.2 Add property mappings
  const newMappings = PropertyMappings.fromObject({
    category: "awardCategory",
    year: "awardYear",
    winner: { property: "isWinner", defaultValue: false }
  });

  const enhancedProj = baseProj.withAdditionalPropertyMappings(newMappings);
  console.log(`- Enhanced projection: label = "${enhancedProj.label()}"`);
  console.log(`  - Properties after adding: ${enhancedProj.properties().size()}`);
  console.log(`  - Property keys: ${Array.from(enhancedProj.properties().propertyKeys()).join(", ")}`);

  // 4. Serializing to object
  console.log("\n4. Serializing to object:");

  // 4.1 Simple projection to object
  const personObj = personProj.toObject();
  console.log(`- Simple projection to object:\n${JSON.stringify(personObj, null, 2)}`);

  // 4.2 Projection with properties to object
  const directorObj = directorProj.toObject();
  console.log(`- Projection with properties to object:\n${JSON.stringify(directorObj, null, 2)}`);

  // 5. Edge cases and validation
  console.log("\n5. Edge cases and validation:");

  // 5.1 Creating with PROJECT_ALL constant
  const wildcardProj = NodeProjection.fromString(ElementProjection.PROJECT_ALL);
  console.log(`- Wildcard projection: label = "${wildcardProj.label()}", projectAll = ${wildcardProj.projectAll()}`);

  // 5.2 Testing invalid config key (should throw)
  try {
    NodeProjection.fromObject(
      { label: "Test", invalidKey: "value" },
      new NodeLabel("DefaultLabel")
    );
    console.log("❌ Expected error for invalid config key");
  } catch (error) {
    console.log(`✓ Correctly caught error: ${(error as Error).message}`);
  }

  console.log("\n===== NODE PROJECTION TEST COMPLETE =====");
}

// Run the test
testNodeProjection();
