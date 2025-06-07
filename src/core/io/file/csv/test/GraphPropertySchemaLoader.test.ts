import { describe, it, expect } from 'vitest';
import { GraphPropertySchemaLoader } from '../GraphPropertySchemaLoader';
import { CsvGraphPropertySchemaVisitor } from '../CsvGraphPropertySchemaVisitor';
import { ValueType, PropertyState } from '@/api';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'graph_property_schema_test');

describe('GraphPropertySchemaLoader - CSV Property Schema Parser', () => {

  it('should load basic property schemas from CSV', () => {
    console.log('📋 === BASIC PROPERTY SCHEMA LOADING ===');

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const schemaCsv = `propertyKey,valueType,defaultValue,state
name,STRING,,PERSISTENT
age,LONG,0,PERSISTENT
email,STRING,null,TRANSIENT
isActive,BOOLEAN,,PERSISTENT`;

    const schemaPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    fs.writeFileSync(schemaPath, schemaCsv);

    console.log(`📄 Created: ${schemaPath}`);
    console.log(`📊 CSV:\n${schemaCsv}`);

    try {
      const loader = new GraphPropertySchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Property schema loaded!');
      console.log(`📊 Schema size: ${schema.size}`);

      schema.forEach((propSchema, key) => {
        console.log(`   ${key} → ${propSchema.valueType()}, default: ${propSchema.defaultValue()}, state: ${propSchema.state()}`);
      });

      expect(schema.size).toBe(4);
      expect(schema.get('name')?.valueType()).toBe(ValueType.STRING);
      expect(schema.get('age')?.valueType()).toBe(ValueType.LONG);
      expect(schema.get('email')?.state()).toBe(PropertyState.TRANSIENT);
      expect(schema.get('isActive')?.valueType()).toBe(ValueType.BOOLEAN);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should return empty schema for missing file', () => {
    console.log('\n📂 === MISSING FILE HANDLING ===');

    const loader = new GraphPropertySchemaLoader(path.join(testDataDir, 'missing'));
    const schema = loader.load();

    console.log('✅ Empty schema returned for missing file');
    console.log(`📊 Schema size: ${schema.size}`);
    expect(schema.size).toBe(0);
  });

  it('should handle different value types', () => {
    console.log('\n🔢 === VALUE TYPE VARIATIONS ===');

    const typesSchemaCsv = `propertyKey,valueType,defaultValue,state
text,STRING,,PERSISTENT
count,LONG,42,PERSISTENT
price,DOUBLE,9.99,PERSISTENT
active,BOOLEAN,,PERSISTENT
tags,STRING_ARRAY,,PERSISTENT
scores,LONG_ARRAY,[1,2,3],PERSISTENT
prices,DOUBLE_ARRAY,[1.1,2.2],PERSISTENT`;

    const schemaPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    fs.writeFileSync(schemaPath, typesSchemaCsv);

    console.log(`📄 Value types CSV:\n${typesSchemaCsv}`);

    try {
      const loader = new GraphPropertySchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Value types loaded!');
      schema.forEach((propSchema, key) => {
        console.log(`   ${key} → ${propSchema.valueType()}`);
      });

      expect(schema.get('text')?.valueType()).toBe(ValueType.STRING);
      expect(schema.get('count')?.valueType()).toBe(ValueType.LONG);
      expect(schema.get('price')?.valueType()).toBe(ValueType.DOUBLE);
      expect(schema.get('active')?.valueType()).toBe(ValueType.BOOLEAN);
      expect(schema.get('tags')?.valueType()).toBe(ValueType.STRING_ARRAY);
      expect(schema.get('scores')?.valueType()).toBe(ValueType.LONG_ARRAY);
      expect(schema.get('prices')?.valueType()).toBe(ValueType.DOUBLE_ARRAY);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle property states', () => {
    console.log('\n🔄 === PROPERTY STATE HANDLING ===');

    const statesSchemaCsv = `propertyKey,valueType,defaultValue,state
id,LONG,0,PERSISTENT
sessionToken,STRING,,TRANSIENT
cached_score,DOUBLE,0.0,TRANSIENT
permanent_name,STRING,,PERSISTENT`;

    const schemaPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    fs.writeFileSync(schemaPath, statesSchemaCsv);

    try {
      const loader = new GraphPropertySchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Property states loaded!');
      schema.forEach((propSchema, key) => {
        console.log(`   ${key} → state: ${propSchema.state()}`);
      });

      expect(schema.get('id')?.state()).toBe(PropertyState.PERSISTENT);
      expect(schema.get('sessionToken')?.state()).toBe(PropertyState.TRANSIENT);
      expect(schema.get('cached_score')?.state()).toBe(PropertyState.TRANSIENT);
      expect(schema.get('permanent_name')?.state()).toBe(PropertyState.PERSISTENT);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle column reordering and missing columns', () => {
    console.log('\n🔄 === COLUMN FLEXIBILITY ===');

    const flexibleCsv = `state,propertyKey,valueType
PERSISTENT,username,STRING
TRANSIENT,temp_data,STRING
PERSISTENT,user_id,LONG`;

    const schemaPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    fs.writeFileSync(schemaPath, flexibleCsv);

    try {
      const loader = new GraphPropertySchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Flexible columns handled!');
      schema.forEach((propSchema, key) => {
        console.log(`   ${key} → ${propSchema.valueType()}, state: ${propSchema.state()}`);
      });

      expect(schema.get('username')?.valueType()).toBe(ValueType.STRING);
      expect(schema.get('username')?.state()).toBe(PropertyState.PERSISTENT);
      expect(schema.get('temp_data')?.state()).toBe(PropertyState.TRANSIENT);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle edge cases', () => {
    console.log('\n🔧 === EDGE CASES ===');

    const edgeCases = [
      {
        name: 'Empty lines',
        content: `propertyKey,valueType
name,STRING

age,LONG

`
      },
      {
        name: 'Whitespace handling',
        content: `  propertyKey  ,  valueType
  name  ,  STRING
  age  ,  LONG  `
      },
      {
        name: 'Header only',
        content: 'propertyKey,valueType,defaultValue,state'
      }
    ];

    edgeCases.forEach(({ name, content }) => {
      console.log(`\n📋 Edge case: ${name}`);

      const schemaPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
      fs.writeFileSync(schemaPath, content);

      try {
        const loader = new GraphPropertySchemaLoader(testDataDir);
        const schema = loader.load();

        console.log(`   ✅ Successfully handled: ${name}`);
        console.log(`   📊 Schema size: ${schema.size}`);

      } catch (error) {
        console.log(`   ❌ FAIL on ${name}: ${(error as Error).message}`);
      }
    });
  });

  it('should verify filename convention', () => {
    console.log('\n📁 === FILENAME VERIFICATION ===');

    console.log(`🔍 Expected filename: ${CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME}`);

    const schemaCsv = `propertyKey,valueType
test_prop,STRING`;

    const correctPath = path.join(testDataDir, CsvGraphPropertySchemaVisitor.GRAPH_PROPERTY_SCHEMA_FILE_NAME);
    fs.writeFileSync(correctPath, schemaCsv);

    try {
      const loader = new GraphPropertySchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Found file with correct naming convention');
      expect(schema.size).toBe(1);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

});
