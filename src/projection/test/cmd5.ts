import { NodeLabel } from "./NodeLabel";
import { NodeProjection } from "./NodeProjection";
import { NodeProjections } from "./NodeProjections";
import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";

/**
 * This script provides clarity on how NodeProjections (plural) works
 * as a container for multiple NodeProjection (singular) objects.
 */
function nodeProjectionsClarity() {
  console.log("===== NODE PROJECTIONS CLARITY =====\n");

  // STEP 1: Create individual NodeProjection objects
  console.log("STEP 1: Create individual NodeProjection objects");

  // 1.1: Person projection with name and age properties
  const personLabel = new NodeLabel("Person");
  // Replace builder with direct construction
  const personProperties = PropertyMappings.of(
    PropertyMapping.of("name", "fullName"),
    PropertyMapping.of("age", "personAge")
  );
  const personProj = new NodeProjection("Person", personProperties);

  console.log("Created Person projection:");
  console.log(`- Label: ${personProj.label()}`);
  console.log(`- Properties: ${Array.from(personProj.properties().propertyKeys()).join(", ")}`);

  // 1.2: Movie projection with title and year properties
  const movieLabel = new NodeLabel("Movie");
  // Replace builder with direct construction
  const movieProperties = PropertyMappings.of(
    PropertyMapping.of("title", "originalTitle"),
    PropertyMapping.of("year", "releaseYear")
  );
  const movieProj = new NodeProjection("Movie", movieProperties);

  console.log("\nCreated Movie projection:");
  console.log(`- Label: ${movieProj.label()}`);
  console.log(`- Properties: ${Array.from(movieProj.properties().propertyKeys()).join(", ")}`);

  // Rest of the code remains the same
  // STEP 2: Create a NodeProjections collection
  console.log("\nSTEP 2: Create NodeProjections collection");

  // Create a Map of NodeLabel -> NodeProjection
  const projectionsMap = new Map<NodeLabel, NodeProjection>();
  projectionsMap.set(personLabel, personProj);
  projectionsMap.set(movieLabel, movieProj);

  // Create NodeProjections from the map
  const projections = NodeProjections.create(projectionsMap);
  console.log(`Created NodeProjections with ${projections.size()} projections`);

  // STEP 3: Accessing projections from the collection
  console.log("\nSTEP 3: Accessing projections from the collection");

  console.log("Get projection for Person label:");
  const retrievedPersonProj = projections.get(personLabel);
  if (retrievedPersonProj) {
    console.log(`- Label: ${retrievedPersonProj.label()}`);
    console.log(`- Properties: ${Array.from(retrievedPersonProj.properties().propertyKeys()).join(", ")}`);
  }

  // STEP 4: Operating on all projections
  console.log("\nSTEP 4: Operating on all projections");

  // 4.1: Get all properties across all projections
  const allProperties = projections.allProperties();
  console.log(`All properties across projections: ${Array.from(allProperties).join(", ")}`);

  // 4.2: Add a property to all projections
  const ratingMapping = PropertyMapping.of("rating", "score");
  const newMappings = PropertyMappings.of(ratingMapping);

  const enhancedProjections = projections.addPropertyMappings(newMappings);
  console.log("\nAfter adding 'rating' property to all projections:");

  for (const [label, projection] of enhancedProjections.projections()) {
    console.log(`- ${label.name} properties: ${Array.from(projection.properties().propertyKeys()).join(", ")}`);
  }

  // STEP 5: Other common creation methods - using factory methods instead of builder
  console.log("\nSTEP 5: Other common creation methods");

  // 5.1: From string - use static factory method
  const actorProjections = NodeProjections.fromString("Actor");
  console.log(`Created from string: projections for label "${actorProjections.labelProjection()}"`);

  // 5.2: From map - use existing fromMap method
  const genreProjections = NodeProjections.fromMap({
    "Genre": {
      label: "Genre",
      properties: { name: "genreName", popularity: "genreRank" }
    }
  });

  console.log(`Created from map: projections for labels "${genreProjections.labelProjection()}"`);
  console.log(`- Properties: ${Array.from(genreProjections.allProperties()).join(", ")}`);

  // 5.3: All nodes
  const allProjections = NodeProjections.all();
  console.log(`Created ALL projections: label = "${allProjections.labelProjection()}"`);
  console.log(`- Is project all: ${allProjections.allProjections()[0].projectAll()}`);

  console.log("\n===== NODE PROJECTIONS CLARITY COMPLETE =====");
}

// Run the clarity script
nodeProjectionsClarity();
