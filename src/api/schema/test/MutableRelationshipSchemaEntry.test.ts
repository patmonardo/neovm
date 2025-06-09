import { describe, it, expect } from 'vitest';
import { RelationshipType } from "@/projection";
import { ValueType, PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { Direction } from "../Direction";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { MutableRelationshipSchemaEntry } from "../primitive/MutableRelationshipSchemaEntry";
import { DefaultValue } from '@/api';

describe('MutableRelationshipSchemaEntry', () => {

  it('should create entry with type and direction using Map API', () => {
    console.log('\n🏗️ === ENTRY CREATION WITH TYPE AND DIRECTION ===');

    // 🏗️ SETUP: Create relationship entry
    const knowsType = RelationshipType.of("KNOWS");
    console.log(`🔗 Creating entry for: ${knowsType.name()}`);
    console.log(`🧭 Direction: UNDIRECTED`);

    const entry = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    // ✅ VERIFY: Basic construction
    console.log(`✅ Identifier equals: ${entry.identifier().equals(knowsType)}`);
    console.log(`🧭 Direction: ${entry.direction()}`);
    console.log(`🧭 Is undirected: ${entry.isUndirected()}`);
    console.log(`📊 Initial properties: ${entry.properties().size}`);

    expect(entry.identifier().equals(knowsType)).toBe(true);
    expect(entry.direction()).toBe(Direction.UNDIRECTED);
    expect(entry.isUndirected()).toBe(true);
    expect(entry.properties().size).toBe(0);

    console.log('✅ Entry creation working correctly');
  });

  it('should manage properties with clean Map API', () => {
    console.log('\n🔧 === PROPERTY MANAGEMENT WITH MAP API ===');

    // 🏗️ SETUP: Create entry and add properties
    const worksAtType = RelationshipType.of("WORKS_AT");
    const entry = new MutableRelationshipSchemaEntry(worksAtType, Direction.DIRECTED);

    console.log(`🏢 Working with WORKS_AT relationship`);

    // 🔧 ACTION: Add various property types
    console.log('➕ Adding properties with different types...');
    entry.addProperty("since", ValueType.LONG);
    entry.addProperty("role", ValueType.STRING);
    entry.addProperty("salary", ValueType.DOUBLE);

    // ✅ VERIFY: Properties using Map API
    const properties = entry.properties();
    const propertyNames = Array.from(properties.keys());

    console.log(`📊 Properties added: ${propertyNames.join(', ')}`);
    console.log(`🔍 Since: ${properties.get("since")?.valueType()} (${properties.get("since")?.aggregation()})`);
    console.log(`🔍 Role: ${properties.get("role")?.valueType()} (${properties.get("role")?.aggregation()})`);
    console.log(`🔍 Salary: ${properties.get("salary")?.valueType()} (${properties.get("salary")?.aggregation()})`);

    expect(properties.size).toBe(3);
    expect(properties.has("since")).toBe(true);
    expect(properties.has("role")).toBe(true);
    expect(properties.has("salary")).toBe(true);

    expect(properties.get("since")!.valueType()).toBe(ValueType.LONG);
    expect(properties.get("role")!.valueType()).toBe(ValueType.STRING);
    expect(properties.get("salary")!.valueType()).toBe(ValueType.DOUBLE);

    // Default aggregation should be NONE
    expect(properties.get("since")!.aggregation()).toBe(Aggregation.NONE);

    console.log('✅ Property management with Map API working');
  });

  it('should handle property states correctly', () => {
    console.log('\n📋 === PROPERTY STATES MANAGEMENT ===');

    // 🏗️ SETUP: Create entry for testing states
    const likesType = RelationshipType.of("LIKES");
    const entry = new MutableRelationshipSchemaEntry(likesType, Direction.DIRECTED);

    console.log(`💖 Working with LIKES relationship`);

    // 🔧 ACTION: Add properties with different states
    console.log('➕ Adding properties with states...');
    entry.addProperty("strength", ValueType.DOUBLE, PropertyState.TRANSIENT);
    entry.addProperty("timestamp", ValueType.LONG, PropertyState.PERSISTENT);

    // ✅ VERIFY: Property states using Map API
    const properties = entry.properties();

    console.log(`🔍 Strength: ${properties.get("strength")?.valueType()} (state: ${properties.get("strength")?.state()})`);
    console.log(`🔍 Timestamp: ${properties.get("timestamp")?.valueType()} (state: ${properties.get("timestamp")?.state()})`);

    expect(properties.get("strength")!.valueType()).toBe(ValueType.DOUBLE);
    expect(properties.get("strength")!.state()).toBe(PropertyState.TRANSIENT);
    expect(properties.get("timestamp")!.valueType()).toBe(ValueType.LONG);
    expect(properties.get("timestamp")!.state()).toBe(PropertyState.PERSISTENT);

    console.log('✅ Property states working correctly');
  });

  it('should handle relationship property schemas', () => {
    console.log('\n🎯 === RELATIONSHIP PROPERTY SCHEMAS ===');

    // 🏗️ SETUP: Create entry and custom schema
    const ratesType = RelationshipType.of("RATES");
    const entry = new MutableRelationshipSchemaEntry(ratesType, Direction.DIRECTED);

    console.log(`⭐ Working with RATES relationship`);

    // 🔧 ACTION: Create and add custom property schema
    console.log('🔧 Creating custom score schema...');
    const scoreSchema = RelationshipPropertySchema.of(
      "score",
      ValueType.DOUBLE,
      DefaultValue.of(null, true),
      PropertyState.PERSISTENT,
      Aggregation.SUM
    );

    console.log(`📋 Score schema - Type: ${scoreSchema.valueType()}, Aggregation: ${scoreSchema.aggregation()}`);

    entry.addProperty("score", scoreSchema);

    // ✅ VERIFY: Schema-based property using Map API
    const properties = entry.properties();
    const scoreProperty = properties.get("score");

    console.log(`🔍 Score property: ${scoreProperty?.valueType()} (state: ${scoreProperty?.state()}, agg: ${scoreProperty?.aggregation()})`);

    expect(scoreProperty).toBeDefined();
    expect(scoreProperty!.valueType()).toBe(ValueType.DOUBLE);
    expect(scoreProperty!.state()).toBe(PropertyState.PERSISTENT);
    expect(scoreProperty!.aggregation()).toBe(Aggregation.SUM);

    console.log('✅ Relationship property schemas working');
  });

  it('should handle property removal with Map API', () => {
    console.log('\n🗑️ === PROPERTY REMOVAL ===');

    // 🏗️ SETUP: Create entry with multiple properties
    const knowsType = RelationshipType.of("KNOWS");
    const entry = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    console.log(`👥 Working with KNOWS relationship`);

    // 🔧 ACTION: Add then remove properties
    console.log('➕ Adding multiple properties...');
    entry.addProperty("since", ValueType.LONG);
    entry.addProperty("strength", ValueType.DOUBLE);
    entry.addProperty("active", ValueType.BOOLEAN);

    const beforeRemoval = Array.from(entry.properties().keys());
    console.log(`📊 Before removal: ${beforeRemoval.join(', ')} (${beforeRemoval.length})`);

    console.log('➖ Removing strength property...');
    entry.removeProperty("strength");

    // ✅ VERIFY: Property removal using Map API
    const properties = entry.properties();
    const afterRemoval = Array.from(properties.keys());

    console.log(`📊 After removal: ${afterRemoval.join(', ')} (${afterRemoval.length})`);
    console.log(`✅ Since exists: ${properties.has("since")}`);
    console.log(`❌ Strength removed: ${!properties.has("strength")}`);
    console.log(`✅ Active exists: ${properties.has("active")}`);

    expect(properties.size).toBe(2);
    expect(properties.has("since")).toBe(true);
    expect(properties.has("strength")).toBe(false);
    expect(properties.has("active")).toBe(true);

    console.log('✅ Property removal working correctly');
  });

  it('should perform union operations correctly', () => {
    console.log('\n🤝 === UNION OPERATIONS ===');

    // 🏗️ SETUP: Create two entries for union
    const followsType = RelationshipType.of("FOLLOWS");
    console.log(`👥 Working with FOLLOWS relationship`);

    const entry1 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);

    console.log('🏗️ Building entries with different properties...');
    entry1.addProperty("since", ValueType.LONG);
    entry2.addProperty("active", ValueType.BOOLEAN);

    const entry1Props = Array.from(entry1.properties().keys());
    const entry2Props = Array.from(entry2.properties().keys());

    console.log(`📊 Entry1 properties: ${entry1Props.join(', ')}`);
    console.log(`📊 Entry2 properties: ${entry2Props.join(', ')}`);

    // 🔧 ACTION: Perform union
    console.log('🤝 Performing union...');
    const union = entry1.union(entry2);

    // ✅ VERIFY: Union results using Map API
    const unionProperties = union.properties();
    const unionPropNames = Array.from(unionProperties.keys());

    console.log(`📊 Union properties: ${unionPropNames.join(', ')} (${unionProperties.size})`);
    console.log(`✅ Type preserved: ${union.identifier().equals(followsType)}`);
    console.log(`🧭 Direction preserved: ${union.direction()}`);
    console.log(`✅ Has since: ${unionProperties.has("since")}`);
    console.log(`✅ Has active: ${unionProperties.has("active")}`);

    expect(union.identifier().equals(followsType)).toBe(true);
    expect(union.direction()).toBe(Direction.DIRECTED);
    expect(unionProperties.has("since")).toBe(true);
    expect(unionProperties.has("active")).toBe(true);
    expect(unionProperties.size).toBe(2);

    console.log('✅ Union operations working correctly');
  });

  it('should handle union validation and errors', () => {
    console.log('\n💥 === UNION VALIDATION AND ERRORS ===');

    // 🔧 ACTION: Test different relationship types
    console.log('🧪 Testing union with different relationship types...');
    const knowsType = RelationshipType.of("KNOWS");
    const followsType = RelationshipType.of("FOLLOWS");

    const entry1 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);

    console.log(`🔗 Entry1: ${knowsType.name()}`);
    console.log(`🔗 Entry2: ${followsType.name()}`);

    // ✅ VERIFY: Different types error
    expect(() => {
      entry1.union(entry2);
    }).toThrow("Cannot union relationship schema entries with different relationship types");

    console.log('✅ Different types properly rejected');

    // 🔧 ACTION: Test different directions
    console.log('\n🧪 Testing union with different directions...');
    const knowsType2 = RelationshipType.of("KNOWS");
    const entry3 = new MutableRelationshipSchemaEntry(knowsType2, Direction.UNDIRECTED);
    const entry4 = new MutableRelationshipSchemaEntry(knowsType2, Direction.DIRECTED);

    console.log(`🧭 Entry3: UNDIRECTED`);
    console.log(`🧭 Entry4: DIRECTED`);

    // ✅ VERIFY: Different directions error
    expect(() => {
      entry3.union(entry4);
    }).toThrow("Conflicting directionality");

    console.log('✅ Different directions properly rejected');
    console.log('✅ Union validation working correctly');
  });

  it('should copy entries and handle serialization', () => {
    console.log('\n📋 === COPYING AND SERIALIZATION ===');

    // 🏗️ SETUP: Create complex original entry
    const knowsType = RelationshipType.of("KNOWS");
    const original = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    console.log(`👥 Creating complex KNOWS entry...`);
    original.addProperty("since", ValueType.LONG);
    original.addProperty("strength", ValueType.DOUBLE, PropertyState.TRANSIENT);

    const originalProps = Array.from(original.properties().keys());
    console.log(`📊 Original properties: ${originalProps.join(', ')}`);

    // 🔧 ACTION: Create copy
    console.log('📋 Creating copy using from()...');
    const copy = MutableRelationshipSchemaEntry.from(original);

    // ✅ VERIFY: Copy correctness using Map API
    const copyProperties = copy.properties();
    const copyProps = Array.from(copyProperties.keys());

    console.log(`📊 Copy properties: ${copyProps.join(', ')}`);
    console.log(`✅ Different instances: ${copy !== original}`);
    console.log(`✅ Same identifier: ${copy.identifier().equals(original.identifier())}`);
    console.log(`✅ Same direction: ${copy.direction() === original.direction()}`);
    console.log(`✅ Same property count: ${copyProperties.size === original.properties().size}`);

    expect(copy).not.toBe(original);
    expect(copy.identifier().equals(original.identifier())).toBe(true);
    expect(copy.direction()).toBe(original.direction());
    expect(copyProperties.size).toBe(original.properties().size);
    expect(copyProperties.has("since")).toBe(true);
    expect(copyProperties.has("strength")).toBe(true);

    console.log('✅ Copying working correctly');
  });

  it('should handle equality and hash codes', () => {
    console.log('\n⚖️ === EQUALITY AND HASH CODES ===');

    // 🏗️ SETUP: Create identical entries
    const knowsType = RelationshipType.of("KNOWS");
    console.log(`👥 Testing equality with KNOWS entries`);

    const entry1 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    console.log('🏗️ Creating identical entries...');
    entry1.addProperty("since", ValueType.LONG);
    entry2.addProperty("since", ValueType.LONG);

    // ✅ VERIFY: Initial equality
    const initialEquals = entry1.equals(entry2);
    const hash1 = entry1.hashCode();
    const hash2 = entry2.hashCode();

    console.log(`⚖️ Initial equality: ${initialEquals}`);
    console.log(`🔢 Hash codes equal: ${hash1 === hash2} (${hash1} vs ${hash2})`);

    expect(initialEquals).toBe(true);
    expect(hash1).toBe(hash2);

    // 🔧 ACTION: Test with different directions
    console.log('\n🔄 Testing with different directions...');
    const entry3 = new MutableRelationshipSchemaEntry(knowsType, Direction.DIRECTED);
    entry3.addProperty("since", ValueType.LONG);

    const directionEquals = entry1.equals(entry3);
    console.log(`⚖️ Different direction equality: ${directionEquals}`);
    expect(directionEquals).toBe(false);

    // 🔧 ACTION: Test with different properties
    console.log('\n🔄 Testing with different property types...');
    const entry4 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    entry4.addProperty("since", ValueType.DOUBLE); // Different type

    const propertyEquals = entry1.equals(entry4);
    console.log(`⚖️ Different property type equality: ${propertyEquals}`);
    expect(propertyEquals).toBe(false);

    console.log('✅ Equality and hash codes working correctly');
  });

});
