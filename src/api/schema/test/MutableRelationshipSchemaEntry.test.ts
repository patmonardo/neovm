import { describe, it, expect } from 'vitest';
import { RelationshipType } from "@/projection";
import { ValueType, PropertyState } from "@/api";
import { Aggregation } from "@/core";
import { Direction } from "../Direction";
import { RelationshipPropertySchema } from "../abstract/RelationshipPropertySchema";
import { MutableRelationshipSchemaEntry } from "../primitive/MutableRelationshipSchemaEntry";
import { DefaultValue } from '@/api';

describe('MutableRelationshipSchemaEntry - Enhanced Testing', () => {

  it('should construct with type and direction', () => {
    console.log('🏗️ === CONSTRUCTION WITH TYPE AND DIRECTION ===');

    const knowsType = RelationshipType.of("KNOWS");
    console.log(`🔗 Creating entry for relationship type: ${knowsType.name()}`);
    console.log(`🧭 Using direction: UNDIRECTED`);

    const entry = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    const typeEquals = entry.identifier().equals(knowsType);
    const direction = entry.direction();
    const isUndirected = entry.isUndirected();
    const propCount = Object.keys(entry.properties()).length;

    console.log(`✅ Identifier equals type: ${typeEquals}`);
    console.log(`🧭 Direction: ${direction} (${direction.toString()})`);
    console.log(`🧭 Is undirected: ${isUndirected}`);
    console.log(`📊 Initial properties count: ${propCount}`);

    // TEST + EXPECT: Construction
    expect(typeEquals).toBe(true);
    expect(direction).toBe(Direction.UNDIRECTED);
    expect(isUndirected).toBe(true);
    expect(propCount).toBe(0);

    console.log('✅ Construction with type and direction working correctly');
  });

  it('should handle property addition with value types', () => {
    console.log('\n🔧 === PROPERTY ADDITION WITH VALUE TYPES ===');

    const worksAtType = RelationshipType.of("WORKS_AT");
    console.log(`🏢 Working with WORKS_AT relationship (DIRECTED)`);

    const entry = new MutableRelationshipSchemaEntry(worksAtType, Direction.DIRECTED);

    console.log('➕ Adding since property (LONG)...');
    entry.addProperty("since", ValueType.LONG);

    console.log('➕ Adding role property (STRING)...');
    entry.addProperty("role", ValueType.STRING);

    console.log('➕ Adding salary property (DOUBLE)...');
    entry.addProperty("salary", ValueType.DOUBLE);

    const props = entry.properties();
    const propKeys = Object.keys(props);

    console.log(`📊 Properties added: ${propKeys.join(', ')}`);
    console.log(`🔍 Since type: ${props.since?.valueType()}, aggregation: ${props.since?.aggregation()}`);
    console.log(`🔍 Role type: ${props.role?.valueType()}, aggregation: ${props.role?.aggregation()}`);
    console.log(`🔍 Salary type: ${props.salary?.valueType()}, aggregation: ${props.salary?.aggregation()}`);

    // TEST + EXPECT: Property addition
    expect(props).toHaveProperty('since');
    expect(props).toHaveProperty('role');
    expect(props).toHaveProperty('salary');

    expect(props.since.valueType()).toBe(ValueType.LONG);
    expect(props.role.valueType()).toBe(ValueType.STRING);
    expect(props.salary.valueType()).toBe(ValueType.DOUBLE);

    // Default aggregation should be NONE
    expect(props.since.aggregation()).toBe(Aggregation.NONE);
    expect(props.role.aggregation()).toBe(Aggregation.NONE);
    expect(props.salary.aggregation()).toBe(Aggregation.NONE);

    console.log('✅ Property addition with value types working correctly');
  });

  it("should handle property states correctly", () => {
    console.log("\n📋 === PROPERTY STATES HANDLING ===");

    const likesType = RelationshipType.of("LIKES");
    const entry = new MutableRelationshipSchemaEntry(
      likesType,
      Direction.DIRECTED
    );

    console.log("💖 Working with LIKES relationship");

    console.log("➕ Adding strength property (DOUBLE, TRANSIENT)...");
    entry.addProperty("strength", ValueType.DOUBLE, PropertyState.TRANSIENT);

    console.log("➕ Adding timestamp property (LONG, PERSISTENT)...");
    entry.addProperty("timestamp", ValueType.LONG, PropertyState.PERSISTENT);

    const props = entry.properties();

    console.log(
      `🔍 Strength type: ${props.strength?.valueType()}, state: ${props.strength?.state()}`
    );
    console.log(
      `🔍 Timestamp type: ${props.timestamp?.valueType()}, state: ${props.timestamp?.state()}`
    );

    console.log(`🔢 PropertyState.TRANSIENT = ${PropertyState.TRANSIENT}`);
    console.log(`🔢 PropertyState.PERSISTENT = ${PropertyState.PERSISTENT}`);

    // TEST + EXPECT: Property states
    expect(props.strength.valueType()).toBe(ValueType.DOUBLE);
    expect(props.strength.state()).toBe(PropertyState.TRANSIENT);
    expect(props.timestamp.valueType()).toBe(ValueType.LONG);
    expect(props.timestamp.state()).toBe(PropertyState.PERSISTENT);

    console.log("✅ Property states handling working correctly");
  });

  it('should handle relationship property schemas', () => {
    console.log('\n🎯 === RELATIONSHIP PROPERTY SCHEMAS ===');

    const ratesType = RelationshipType.of("RATES");
    const entry = new MutableRelationshipSchemaEntry(ratesType, Direction.DIRECTED);

    console.log('⭐ Working with RATES relationship');

    console.log('➕ Creating score schema (DOUBLE, PERSISTENT, AVG)...');
    const scoreSchema = RelationshipPropertySchema.of(
      "score",
      ValueType.DOUBLE,
      DefaultValue.of(null, true),
      PropertyState.PERSISTENT,
      Aggregation.SUM
    );

    console.log(`📋 Score schema - Key: ${scoreSchema.key()}`);
    console.log(`📋 Score schema - Type: ${scoreSchema.valueType()}`);
    console.log(`📋 Score schema - State: ${scoreSchema.state()}`);
    console.log(`📋 Score schema - Aggregation: ${scoreSchema.aggregation()}`);

    console.log('➕ Adding score property using schema...');
    entry.addProperty("score", scoreSchema);

    const props = entry.properties();
    const scoreProperty = props.score;

    console.log(`🔍 Score property - Type: ${scoreProperty?.valueType()}`);
    console.log(`🔍 Score property - State: ${scoreProperty?.state()}`);
    console.log(`🔍 Score property - Aggregation: ${scoreProperty?.aggregation()}`);

    // TEST + EXPECT: Schema-based property
    expect(scoreProperty).toBeDefined();
    expect(scoreProperty.valueType()).toBe(ValueType.DOUBLE);
    expect(scoreProperty.state()).toBe(PropertyState.PERSISTENT);
    expect(scoreProperty.aggregation()).toBe(Aggregation.SUM);

    console.log('✅ Relationship property schemas working correctly');
  });

  it('should handle property removal', () => {
    console.log('\n🗑️ === PROPERTY REMOVAL ===');

    const knowsType = RelationshipType.of("KNOWS");
    const entry = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);

    console.log('👥 Working with KNOWS relationship');

    console.log('➕ Adding multiple properties...');
    entry.addProperty("since", ValueType.LONG);
    entry.addProperty("strength", ValueType.DOUBLE);
    entry.addProperty("active", ValueType.BOOLEAN);

    const beforeRemoval = Object.keys(entry.properties());
    console.log(`📊 Properties before removal: ${beforeRemoval.join(', ')} (${beforeRemoval.length})`);

    console.log('➖ Removing strength property...');
    entry.removeProperty("strength");

    const afterRemoval = Object.keys(entry.properties());
    const props = entry.properties();

    console.log(`📊 Properties after removal: ${afterRemoval.join(', ')} (${afterRemoval.length})`);
    console.log(`✅ Since still exists: ${props.hasOwnProperty('since')}`);
    console.log(`❌ Strength removed: ${!props.hasOwnProperty('strength')}`);
    console.log(`✅ Active still exists: ${props.hasOwnProperty('active')}`);

    // TEST + EXPECT: Property removal
    expect(afterRemoval.length).toBe(2);
    expect(props).toHaveProperty('since');
    expect(props).not.toHaveProperty('strength');
    expect(props).toHaveProperty('active');

    console.log('✅ Property removal working correctly');
  });

  it('should handle union operations correctly', () => {
    console.log('\n🤝 === UNION OPERATIONS ===');

    const followsType = RelationshipType.of("FOLLOWS");
    console.log('👥 Working with FOLLOWS relationship');

    console.log('🏗️ Creating entry1 with since property...');
    const entry1 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);
    entry1.addProperty("since", ValueType.LONG);

    console.log('🏗️ Creating entry2 with active property...');
    const entry2 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);
    entry2.addProperty("active", ValueType.BOOLEAN);

    const entry1Props = Object.keys(entry1.properties());
    const entry2Props = Object.keys(entry2.properties());

    console.log(`📊 Entry1 properties: ${entry1Props.join(', ')}`);
    console.log(`📊 Entry2 properties: ${entry2Props.join(', ')}`);

    console.log('🤝 Performing union...');
    const union = entry1.union(entry2);

    const unionProps = union.properties();
    const unionPropKeys = Object.keys(unionProps);

    console.log(`📊 Union properties: ${unionPropKeys.join(', ')} (${unionPropKeys.length})`);
    console.log(`✅ Union type equals original: ${union.identifier().equals(followsType)}`);
    console.log(`🧭 Union direction: ${union.direction()}`);
    console.log(`✅ Has since: ${unionProps.hasOwnProperty('since')}`);
    console.log(`✅ Has active: ${unionProps.hasOwnProperty('active')}`);

    // TEST + EXPECT: Union results
    expect(union.identifier().equals(followsType)).toBe(true);
    expect(union.direction()).toBe(Direction.DIRECTED);
    expect(unionProps).toHaveProperty('since');
    expect(unionProps).toHaveProperty('active');
    expect(unionPropKeys.length).toBe(2);

    console.log('✅ Union operations working correctly');
  });

  it('should handle union errors correctly', () => {
    console.log('\n💥 === UNION ERROR HANDLING ===');

    console.log('🔍 Testing union with different relationship types...');
    const knowsType = RelationshipType.of("KNOWS");
    const followsType = RelationshipType.of("FOLLOWS");

    const entry1 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    const entry2 = new MutableRelationshipSchemaEntry(followsType, Direction.DIRECTED);

    console.log(`🔗 Entry1 type: ${knowsType.name()}`);
    console.log(`🔗 Entry2 type: ${followsType.name()}`);

    try {
      console.log('💥 Attempting union with different types...');
      entry1.union(entry2);
      console.log('❌ FAIL: Should have thrown for different types');
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(`✅ Correctly threw for different types: ${(error as Error).message}`);
      expect(error).toBeDefined();
    }

    console.log('\n🔍 Testing union with different directions...');
    const knowsType2 = RelationshipType.of("KNOWS");
    const entry3 = new MutableRelationshipSchemaEntry(knowsType2, Direction.UNDIRECTED);
    const entry4 = new MutableRelationshipSchemaEntry(knowsType2, Direction.DIRECTED);

    console.log(`🧭 Entry3 direction: UNDIRECTED`);
    console.log(`🧭 Entry4 direction: DIRECTED`);

    try {
      console.log('💥 Attempting union with different directions...');
      entry3.union(entry4);
      console.log('❌ FAIL: Should have thrown for different directions');
      expect(false).toBe(true); // Force failure
    } catch (error) {
      console.log(`✅ Correctly threw for different directions: ${(error as Error).message}`);
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Conflicting directionality');
    }

    console.log('✅ Union error handling working correctly');
  });

  it('should handle copying and serialization', () => {
    console.log('\n📋 === COPYING AND SERIALIZATION ===');

    const knowsType = RelationshipType.of("KNOWS");
    console.log('👥 Creating original KNOWS entry...');

    const original = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    original.addProperty("since", ValueType.LONG);
    original.addProperty("strength", ValueType.DOUBLE, PropertyState.TRANSIENT);

    const originalProps = Object.keys(original.properties());
    console.log(`📊 Original properties: ${originalProps.join(', ')}`);

    console.log('📋 Creating copy using from()...');
    const copy = MutableRelationshipSchemaEntry.from(original);

    const copyProps = Object.keys(copy.properties());
    console.log(`📊 Copy properties: ${copyProps.join(', ')}`);
    console.log(`✅ Different instances: ${copy !== original}`);
    console.log(`✅ Same identifier: ${copy.identifier().equals(original.identifier())}`);
    console.log(`✅ Same direction: ${copy.direction() === original.direction()}`);

    // TEST + EXPECT: Copying
    expect(copy).not.toBe(original);
    expect(copy.identifier().equals(original.identifier())).toBe(true);
    expect(copy.direction()).toBe(original.direction());
    expect(copyProps).toEqual(originalProps);

    console.log('\n📤 Testing serialization...');
    const map = copy.toMap();

    console.log('📋 Serialized structure:');
    console.log(JSON.stringify(map, null, 2));

    console.log(`🧭 Direction in map: ${map.direction}`);
    console.log(`📊 Properties in map: ${Object.keys(map.properties).join(', ')}`);

    // TEST + EXPECT: Serialization
    expect(map).toHaveProperty('direction');
    expect(map).toHaveProperty('properties');
    expect(map.properties).toHaveProperty('since');
    expect(map.properties).toHaveProperty('strength');

    console.log('✅ Copying and serialization working correctly');
  });

  it('should handle equality and hashing', () => {
    console.log('\n⚖️ === EQUALITY AND HASHING ===');

    const knowsType = RelationshipType.of("KNOWS");
    console.log('👥 Testing equality with KNOWS entries');

    console.log('🏗️ Creating two identical entries...');
    const entry1 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    entry1.addProperty("since", ValueType.LONG);

    const entry2 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    entry2.addProperty("since", ValueType.LONG);

    const initialEquals = entry1.equals(entry2);
    const hash1 = entry1.hashCode();
    const hash2 = entry2.hashCode();

    console.log(`⚖️ Initial equality: ${initialEquals}`);
    console.log(`🔢 Hash1: ${hash1}, Hash2: ${hash2}, Equal: ${hash1 === hash2}`);

    // TEST + EXPECT: Initial equality
    expect(initialEquals).toBe(true);
    expect(hash1).toBe(hash2);

    console.log('\n🔄 Testing with different directions...');
    const entry3 = new MutableRelationshipSchemaEntry(knowsType, Direction.DIRECTED);
    entry3.addProperty("since", ValueType.LONG);

    const directionEquals = entry1.equals(entry3);
    const hash3 = entry3.hashCode();

    console.log(`⚖️ Different direction equality: ${directionEquals}`);
    console.log(`🔢 Hash1: ${hash1}, Hash3: ${hash3}, Equal: ${hash1 === hash3}`);

    expect(directionEquals).toBe(false);

    console.log('\n🔄 Testing with different properties...');
    const entry4 = new MutableRelationshipSchemaEntry(knowsType, Direction.UNDIRECTED);
    entry4.addProperty("since", ValueType.DOUBLE); // Different type

    const propertyEquals = entry1.equals(entry4);
    console.log(`⚖️ Different property type equality: ${propertyEquals}`);
    expect(propertyEquals).toBe(false);

    console.log('✅ Equality and hashing working correctly');
  });

});
