import { PropertyMapping } from "./PropertyMapping";
import { PropertyMappings } from "./PropertyMappings";
import { DefaultValue } from "./api/DefaultValue";

/**
 * This script demonstrates PropertyMappings functionality
 * without any dependencies on projection classes
 */
function testPropertyMappings() {
  console.log("===== PROPERTY MAPPINGS TEST =====\n");

  // 1. Create individual PropertyMappings
  console.log("1. Creating individual PropertyMappings:");

  // 1.1 Simple property with same name
  const nameMapping = PropertyMapping.of("name");
  console.log(
    `- Simple mapping: ${nameMapping.propertyKey()} -> ${nameMapping.neoPropertyKey()}`
  );

  // 1.2 Property with different source name
  const ageMapping = PropertyMapping.of("age", "personAge");
  console.log(
    `- Different source: ${ageMapping.propertyKey()} -> ${ageMapping.neoPropertyKey()}`
  );

  // 1.3 Property with default value
  const activeMapping = PropertyMapping.of("active", {
    neoPropertyKey: "isActive",
    defaultValue: false,
  });
  console.log(
    `- With default: ${activeMapping.propertyKey()} -> ${activeMapping.neoPropertyKey()}, default: ${activeMapping
      .defaultValue()
      .get()}`
  );

  // 1.4 Using DefaultValue directly
  const scoreMapping = PropertyMapping.of("score", {
    neoPropertyKey: "ranking",
    defaultValue: DefaultValue.of(0.0),
  });
  console.log(
    `- Using DefaultValue: ${scoreMapping.propertyKey()} -> ${scoreMapping.neoPropertyKey()}, default: ${scoreMapping
      .defaultValue()
      .get()}`
  );

  // 2. Create PropertyMappings collection
  console.log("\n2. Creating PropertyMappings collection:");

  // 2.1 Using of() factory
  const mappings1 = PropertyMappings.of(nameMapping, ageMapping);
  console.log(`- Collection with ${mappings1.size()} mappings`);
  console.log(`- Property keys: ${Array.from(mappings1.propertyKeys())}`);

  // 2.2 Using fromObject with strings
  const mappings2 = PropertyMappings.fromObject(["rating", "verified"]);
  console.log(`- From string array: ${mappings2.size()} mappings`);
  console.log(`- Property keys: ${Array.from(mappings2.propertyKeys())}`);

  // 2.3 Using fromObject with objects
  const mappings3 = PropertyMappings.fromObject({
    firstName: "given_name",
    lastName: {
      property: "family_name",
      defaultValue: "Unknown",
    },
    memberSince: {
      property: "join_date",
    },
  });
  console.log(`- From object: ${mappings3.size()} mappings`);
  console.log(`- Property keys: ${Array.from(mappings3.propertyKeys())}`);

  // 3. Convert to objects
  console.log("\n3. Converting mappings to objects:");

  // 3.1 Convert individual mapping to object
  const [key, config] = nameMapping.toObject(true);
  console.log("Inspecting config object...");
  for (const [k, v] of Object.entries(config)) {
    console.log(`- ${k}: ${v} (type: ${typeof v})`);

    // If it's an object, inspect one level deeper
    if (typeof v === "object" && v !== null) {
      for (const [innerK, innerV] of Object.entries(v)) {
        console.log(`  - ${innerK}: ${innerV} (type: ${typeof innerV})`);
      }
    }
  }
  console.log(
    `- Single mapping as object: ${key} -> ${JSON.stringify(config)}`
  );

  // 3.2 Convert mappings collection to object
  const mappingsObj = mappings3.toObject(true);
  console.log(`- Mappings as object:\n${JSON.stringify(mappingsObj, null, 2)}`);

  // 4. Merging PropertyMappings
  console.log("\n4. Merging PropertyMappings:");

  // 4.1 Merge two collections
  const mergedMappings = mappings1.mergeWith(mappings3);
  console.log(
    `- Original collections: ${mappings1.size()} and ${mappings3.size()} mappings`
  );
  console.log(`- Merged collection: ${mergedMappings.size()} mappings`);
  console.log(
    `- All property keys: ${Array.from(mergedMappings.propertyKeys())}`
  );

  // 4.2 Convert merged mappings to object
  const mergedObj = mergedMappings.toObject(true);
  console.log(
    `- Merged mappings as object:\n${JSON.stringify(mergedObj, null, 2)}`
  );

  // 5. Handling duplicate keys (last one wins in fromObject)
  console.log("\n5. Handling duplicate keys:");

  try {
    // This should fail due to duplicate "name" key
    const duplicateMappings = PropertyMappings.of(
      PropertyMapping.of("name", "firstName"),
      PropertyMapping.of("name", "lastName") // Duplicate key should cause error
    );
    console.log("❌ Expected error for duplicate keys");
  } catch (error) {
    console.log(`✓ Correctly caught error: ${(error as Error).message}`);
  }

  // 6. Equality checks and membership
  console.log("\n6. Collection operations:");

  // Check if a mapping exists in the collection
  const hasName = Array.from(mergedMappings).some(
    (m) => m.propertyKey() === "name"
  );
  console.log(`- Collection contains 'name' mapping: ${hasName}`);

  // Filter mappings with default values
  const withDefaults = Array.from(mergedMappings)
    .filter((m) => !m.defaultValue().isUserDefined)
    .map((m) => m.propertyKey());
  console.log(`- Mappings with non-default values: ${withDefaults}`);

  console.log("\n===== TEST COMPLETE =====");
}

// Run the test
testPropertyMappings();
