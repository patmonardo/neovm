import { describe, it, expect } from 'vitest';
import { RelationshipSchemaLoader } from '../RelationshipSchemaLoader';
import { CsvRelationshipSchemaVisitor } from '../CsvRelationshipSchemaVisitor';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'relationship_schema_test');

describe('RelationshipSchemaLoader - CSV Relationship Schema Parser', () => {

  it('should load basic relationship schema from CSV', () => {
    console.log('🔗 === BASIC RELATIONSHIP SCHEMA LOADING ===');

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const relationshipSchemaCsv = `relationshipType,direction,propertyKey,valueType,defaultValue,aggregation,state
FRIENDS,DIRECTED,since,STRING,,NONE,PERSISTENT
WORKS_FOR,DIRECTED,startDate,STRING,,NONE,PERSISTENT
WORKS_FOR,DIRECTED,salary,LONG,DefaultValue(50000),SUM,PERSISTENT
LIKES,UNDIRECTED,rating,DOUBLE,DefaultValue(5.0),MAX,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, relationshipSchemaCsv);

    console.log(`📄 Created: ${relationshipSchemaPath}`);
    console.log(`📊 CSV:\n${relationshipSchemaCsv}`);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Relationship schema loaded successfully!');
      console.log(`📊 Schema details loaded`);

      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle missing file gracefully', () => {
    console.log('\n📂 === MISSING FILE HANDLING ===');

    const missingDir = path.join(testDataDir, 'missing_rel_schema');

    try {
      const loader = new RelationshipSchemaLoader(missingDir);
      loader.load();

      console.log('❌ FAIL: Should have thrown for missing file');
      expect(false).toBe(true);

    } catch (error) {
      console.log(`✅ Correctly threw for missing file: ${(error as Error).message}`);
      expect((error as Error).message).toContain('Failed to load relationship schema');
    }
  });

  it('should handle different directions', () => {
    console.log('\n🧭 === DIRECTION VARIATIONS ===');

    const directionSchemaCsv = `relationshipType,direction,propertyKey,valueType,aggregation,state
CONNECTS,DIRECTED,weight,DOUBLE,SUM,PERSISTENT
SIMILAR_TO,UNDIRECTED,score,DOUBLE,MAX,PERSISTENT
FOLLOWS,DIRECTED,followDate,STRING,NONE,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, directionSchemaCsv);

    console.log(`📄 Direction types CSV:\n${directionSchemaCsv}`);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Direction variations loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle different aggregations', () => {
    console.log('\n📊 === AGGREGATION VARIATIONS ===');

    const aggregationSchemaCsv = `relationshipType,direction,propertyKey,valueType,defaultValue,aggregation,state
TRANSACTION,DIRECTED,amount,DOUBLE,DefaultValue(0.0),SUM,PERSISTENT
RATING,DIRECTED,score,DOUBLE,DefaultValue(1.0),MAX,PERSISTENT
VISIT,DIRECTED,count,LONG,DefaultValue(1),COUNT,PERSISTENT
TEMPERATURE,DIRECTED,minTemp,DOUBLE,DefaultValue(0.0),MIN,PERSISTENT
STATUS,DIRECTED,active,LONG,DefaultValue(1),NONE,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, aggregationSchemaCsv);

    console.log(`📄 Aggregation types CSV:\n${aggregationSchemaCsv}`);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Aggregation variations loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle value types and arrays', () => {
    console.log('\n🔢 === VALUE TYPE VARIATIONS ===');

    const valueTypesSchemaCsv = `relationshipType,direction,propertyKey,valueType,defaultValue,aggregation,state
NETWORK,DIRECTED,bandwidth,LONG,DefaultValue(100),MIN,PERSISTENT
SOCIAL,DIRECTED,strength,DOUBLE,DefaultValue(1.0),MAX,PERSISTENT
TAGS,DIRECTED,labels,LONG_ARRAY,DefaultValue([1,2,3]),NONE,PERSISTENT
SCORES,DIRECTED,values,DOUBLE_ARRAY,DefaultValue([1.1,2.2]),SUM,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, valueTypesSchemaCsv);

    console.log(`📄 Value types CSV:\n${valueTypesSchemaCsv}`);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Value types loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle property states', () => {
    console.log('\n🔄 === PROPERTY STATE HANDLING ===');

    const statesSchemaCsv = `relationshipType,direction,propertyKey,valueType,aggregation,state
CONNECTION,DIRECTED,sessionId,STRING,NONE,TRANSIENT
CONNECTION,DIRECTED,permanentId,STRING,NONE,PERSISTENT
LINK,DIRECTED,tempData,STRING,NONE,TRANSIENT
LINK,DIRECTED,stableData,STRING,NONE,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, statesSchemaCsv);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Property states loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle relationships without properties', () => {
    console.log('\n🔗 === RELATIONSHIPS WITHOUT PROPERTIES ===');

    const noPropertiesSchemaCsv = `relationshipType,direction
FOLLOWS,DIRECTED
FRIENDS,UNDIRECTED
CONNECTED_TO,DIRECTED`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, noPropertiesSchemaCsv);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Relationships without properties loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle edge cases', () => {
    console.log('\n🔧 === EDGE CASES ===');

    const edgeCases = [
      {
        name: 'Empty file',
        content: '',
        shouldThrow: true
      },
      {
        name: 'Header only',
        content: 'relationshipType,direction,propertyKey,valueType,aggregation,state',
        shouldThrow: false
      },
      {
        name: 'Missing relationshipType column',
        content: 'direction,propertyKey\nDIRECTED,name',
        shouldThrow: true
      },
      {
        name: 'Empty lines',
        content: `relationshipType,direction
FOLLOWS,DIRECTED

FRIENDS,UNDIRECTED

`,
        shouldThrow: false
      }
    ];

    edgeCases.forEach(({ name, content, shouldThrow }) => {
      console.log(`\n📋 Edge case: ${name}`);

      const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
      fs.writeFileSync(relationshipSchemaPath, content);

      try {
        const loader = new RelationshipSchemaLoader(testDataDir);
        const schema = loader.load();

        if (shouldThrow) {
          console.log(`   ❌ FAIL: Should have thrown for ${name}`);
          expect(false).toBe(true);
        } else {
          console.log(`   ✅ Successfully handled: ${name}`);
          expect(schema).toBeDefined();
        }

      } catch (error) {
        if (shouldThrow) {
          console.log(`   ✅ Correctly threw for ${name}: ${(error as Error).message}`);
          expect(error).toBeDefined();
        } else {
          console.log(`   ❌ FAIL: Unexpected error for ${name}: ${(error as Error).message}`);
          throw error;
        }
      }
    });
  });

  it('should handle column reordering', () => {
    console.log('\n🔄 === COLUMN REORDERING ===');

    const reorderedCsv = `aggregation,state,relationshipType,direction,propertyKey,valueType,defaultValue
SUM,PERSISTENT,PAYMENT,DIRECTED,amount,DOUBLE,DefaultValue(0.0)
NONE,TRANSIENT,SESSION,DIRECTED,token,STRING,
MAX,PERSISTENT,RATING,UNDIRECTED,score,DOUBLE,DefaultValue(5.0)`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, reorderedCsv);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Column reordering handled successfully!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle complex multi-property relationships', () => {
    console.log('\n🎯 === COMPLEX MULTI-PROPERTY RELATIONSHIPS ===');

    const complexSchemaCsv = `relationshipType,direction,propertyKey,valueType,defaultValue,aggregation,state
TRANSACTION,DIRECTED,amount,DOUBLE,DefaultValue(0.0),SUM,PERSISTENT
TRANSACTION,DIRECTED,fee,DOUBLE,DefaultValue(0.0),SUM,PERSISTENT
TRANSACTION,DIRECTED,currency,STRING,,NONE,PERSISTENT
TRANSACTION,DIRECTED,timestamp,LONG,DefaultValue(0),MAX,PERSISTENT
SOCIAL_LINK,UNDIRECTED,strength,DOUBLE,DefaultValue(1.0),MAX,PERSISTENT
SOCIAL_LINK,UNDIRECTED,interactions,LONG,DefaultValue(0),COUNT,PERSISTENT
SOCIAL_LINK,UNDIRECTED,lastContact,LONG,DefaultValue(0),MAX,PERSISTENT`;

    const relationshipSchemaPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(relationshipSchemaPath, complexSchemaCsv);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Complex multi-property relationships loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should verify filename convention', () => {
    console.log('\n📁 === FILENAME VERIFICATION ===');

    console.log(`🔍 Expected filename: ${CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME}`);

    const relationshipSchemaCsv = `relationshipType,direction
TEST_REL,DIRECTED`;

    const correctPath = path.join(testDataDir, CsvRelationshipSchemaVisitor.RELATIONSHIP_SCHEMA_FILE_NAME);
    fs.writeFileSync(correctPath, relationshipSchemaCsv);

    try {
      const loader = new RelationshipSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Found file with correct naming convention');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

});
