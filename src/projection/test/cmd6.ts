import { RelationshipProjection } from "./RelationshipProjection";
import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";
import { RelationshipType } from "./RelationshipType";
import { Orientation } from "./Orientation";
import { Aggregation } from "./core/Aggregation";

/**
 * Test script for RelationshipProjection class - basic functionality
 */
function testRelationshipProjection() {
  console.log("===== RELATIONSHIP PROJECTION TEST =====\n");

  // 1. Creating RelationshipProjection with different factory methods
  console.log("1. Creating with different factory methods:");

  // 1.1 Using fromString
  const actedInProj = RelationshipProjection.fromString("ACTED_IN");
  console.log(`- fromString: type = "${actedInProj.type()}"`);
  console.log(`  indexInverse = ${actedInProj.indexInverse()}`);

  // 1.2 Using of() with basic parameters
  const directedProj = RelationshipProjection.of("DIRECTED_IN", Orientation.NATURAL, Aggregation.DEFAULT);
  console.log(`- of(): type = "${directedProj.type()}"`);

  // 1.3 Using fromObject with object
  const producedProj = RelationshipProjection.fromObject(
    {
      type: "PRODUCED",
      properties: {
        investment: "budget",
        year: "productionYear"
      }
    },
    new RelationshipType("DEFAULT_TYPE")
  );
  console.log(`- fromObject: type = "${producedProj.type()}"`);
  console.log(`  properties: ${Array.from(producedProj.properties().propertyKeys()).join(", ")}`);

  // 2. Property mappings
  console.log("\n2. Property mappings:");

  // 2.1 Create property mappings
  const weightProp = PropertyMapping.of("weight", "relationWeight");
  const scoreProp = PropertyMapping.of("score", {
    neoPropertyKey: "relationScore",
    defaultValue: 0.0
  });
  const timestampProp = PropertyMapping.of("timestamp", "createdAt");

  const propMappings = PropertyMappings.of(weightProp, scoreProp, timestampProp);

  // 2.2 Create relationship with properties
  const complexRel = new RelationshipProjection(
    "COMPLEX",
    Orientation.NATURAL,
    Aggregation.DEFAULT,
    false,
    propMappings
  );

  console.log(`- Complex relationship: type = "${complexRel.type()}"`);
  console.log(`  properties: ${Array.from(complexRel.properties().propertyKeys()).join(", ")}`);

  // 2.3 Add property mappings
  const newPropsMapping = PropertyMappings.fromObject({
    strength: "bondStrength"
  });

  const enhancedRel = complexRel.withAdditionalPropertyMappings(newPropsMapping);
  console.log(`- After adding property: properties = ${Array.from(enhancedRel.properties().propertyKeys()).join(", ")}`);

  // 3. Serializing to object
  console.log("\n3. Serializing to object:");

  // 3.1 Simple projection to object
  const actedInObj = actedInProj.toObject();
  console.log(`- Simple projection to object:`);
  console.log(`  type: ${actedInObj.type}`);

  // 3.2 Complex projection to object
  const complexObj = complexRel.toObject();
  console.log(`- Complex projection with properties - keys: ${Object.keys(complexObj).join(", ")}`);
  console.log(`  type: ${complexObj.type}`);
  console.log(`  property keys: ${Object.keys(complexObj.properties || {}).join(", ")}`);

  // 4. Special projections
  console.log("\n4. Special projections:");

  // 4.1 ALL projection
  const allRel = RelationshipProjection.ALL;
  console.log(`- ALL projection: type = "${allRel.type()}", projectAll = ${allRel.projectAll()}`);

  // 4.2 ALL_UNDIRECTED projection
  if (RelationshipProjection.ALL_UNDIRECTED) {
    const allUndirected = RelationshipProjection.ALL_UNDIRECTED;
    console.log(`- ALL_UNDIRECTED: type = "${allUndirected.type()}"`);
  } else {
    console.log("- ALL_UNDIRECTED not implemented");
  }

  console.log("\n===== RELATIONSHIP PROJECTION TEST COMPLETE =====");
}

// Run the test
testRelationshipProjection();
