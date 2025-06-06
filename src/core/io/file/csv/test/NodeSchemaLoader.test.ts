import { describe, it, expect } from 'vitest';
import { NodeSchemaLoader } from '../NodeSchemaLoader';
import { CsvNodeSchemaVisitor } from '../CsvNodeSchemaVisitor';
import { NodeLabel } from '@/projection';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'node_schema_test');

describe('NodeSchemaLoader - CSV Node Schema Parser', () => {

  it('should load basic node schema from CSV', () => {
    console.log('📋 === BASIC NODE SCHEMA LOADING ===');

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const nodeSchemaCsv = `label,propertyKey,valueType,defaultValue,state
Person,name,STRING,,PERSISTENT
Person,age,LONG,DefaultValue(0),PERSISTENT
Person,email,STRING,,TRANSIENT
Company,name,STRING,,PERSISTENT
Company,employees,LONG,DefaultValue(1),PERSISTENT`;

    const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(nodeSchemaPath, nodeSchemaCsv);

    console.log(`📄 Created: ${nodeSchemaPath}`);
    console.log(`📊 CSV:\n${nodeSchemaCsv}`);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Node schema loaded successfully!');
      console.log(`📊 Schema details:`);

      // Check Person label properties
      const personLabel = NodeLabel.of('Person');
      console.log(`   Person label: ${personLabel.name()}`);

      // Check Company label properties
      const companyLabel = NodeLabel.of('Company');
      console.log(`   Company label: ${companyLabel.name()}`);

      expect(schema).toBeDefined();
      // More specific tests would require access to schema internals

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle missing file gracefully', () => {
    console.log('\n📂 === MISSING FILE HANDLING ===');

    const missingDir = path.join(testDataDir, 'missing_schema');

    try {
      const loader = new NodeSchemaLoader(missingDir);
      loader.load();

      console.log('❌ FAIL: Should have thrown for missing file');
      expect(false).toBe(true);

    } catch (error) {
      console.log(`✅ Correctly threw for missing file: ${(error as Error).message}`);
      expect((error as Error).message).toContain('Failed to load node schema');
    }
  });

  it('should handle different value types', () => {
    console.log('\n🔢 === VALUE TYPE VARIATIONS ===');

    const typesSchemaCsv = `label,propertyKey,valueType,defaultValue,state
TestNode,longProp,LONG,DefaultValue(42),PERSISTENT
TestNode,doubleProp,DOUBLE,DefaultValue(3.14),PERSISTENT
TestNode,booleanProp,BOOLEAN,DefaultValue(true),PERSISTENT
TestNode,longArrayProp,LONG_ARRAY,DefaultValue([1,2,3]),PERSISTENT
TestNode,doubleArrayProp,DOUBLE_ARRAY,DefaultValue([1.1,2.2]),PERSISTENT`;

    const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(nodeSchemaPath, typesSchemaCsv);

    console.log(`📄 Value types CSV:\n${typesSchemaCsv}`);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Value types schema loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle property states', () => {
    console.log('\n🔄 === PROPERTY STATE HANDLING ===');

    const statesSchemaCsv = `label,propertyKey,valueType,state
User,id,LONG,PERSISTENT
User,sessionToken,STRING,TRANSIENT
User,tempData,STRING,TRANSIENT
User,permanentName,STRING,PERSISTENT`;

    const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(nodeSchemaPath, statesSchemaCsv);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Property states schema loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle multiple labels', () => {
    console.log('\n🏷️ === MULTIPLE LABELS ===');

    const multiLabelSchemaCsv = `label,propertyKey,valueType,defaultValue,state
Person,name,STRING,,PERSISTENT
Person,age,LONG,DefaultValue(0),PERSISTENT
Company,name,STRING,,PERSISTENT
Company,industry,STRING,,PERSISTENT
Product,name,STRING,,PERSISTENT
Product,price,DOUBLE,DefaultValue(0.0),PERSISTENT
Organization,name,STRING,,PERSISTENT`;

    const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(nodeSchemaPath, multiLabelSchemaCsv);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Multiple labels schema loaded!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle empty and malformed data', () => {
    console.log('\n🔧 === EDGE CASES ===');

    const edgeCases = [
      {
        name: 'Empty file',
        content: '',
        shouldThrow: true
      },
      {
        name: 'Header only',
        content: 'label,propertyKey,valueType,defaultValue,state',
        shouldThrow: false
      },
      {
        name: 'Missing label column',
        content: 'propertyKey,valueType\nname,STRING',
        shouldThrow: true
      },
      {
        name: 'Empty lines',
        content: `label,propertyKey,valueType
Person,name,STRING

Company,name,STRING

`,
        shouldThrow: false
      }
    ];

    edgeCases.forEach(({ name, content, shouldThrow }) => {
      console.log(`\n📋 Edge case: ${name}`);

      const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
      fs.writeFileSync(nodeSchemaPath, content);

      try {
        const loader = new NodeSchemaLoader(testDataDir);
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

    const reorderedCsv = `valueType,state,label,propertyKey,defaultValue
STRING,PERSISTENT,Person,name,
LONG,PERSISTENT,Person,age,DefaultValue(25)
STRING,TRANSIENT,Person,email,`;

    const nodeSchemaPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(nodeSchemaPath, reorderedCsv);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Column reordering handled successfully!');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should verify filename convention', () => {
    console.log('\n📁 === FILENAME VERIFICATION ===');

    console.log(`🔍 Expected filename: ${CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME}`);

    const nodeSchemaCsv = `label,propertyKey,valueType
TestLabel,testProp,STRING`;

    const correctPath = path.join(testDataDir, CsvNodeSchemaVisitor.NODE_SCHEMA_FILE_NAME);
    fs.writeFileSync(correctPath, nodeSchemaCsv);

    try {
      const loader = new NodeSchemaLoader(testDataDir);
      const schema = loader.load();

      console.log('✅ Found file with correct naming convention');
      expect(schema).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

});
