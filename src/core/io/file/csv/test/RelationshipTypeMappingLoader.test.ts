import { describe, it, expect } from 'vitest';
import { RelationshipTypeMappingLoader } from '../RelationshipTypeMappingLoader';
import { CsvRelationshipTypeMappingVisitor } from '../CsvRelationshipTypeMappingVisitor';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'rel_type_mapping_test');

describe('RelationshipTypeMappingLoader - CSV Type Mapping Parser', () => {

  it('should load basic relationship type mappings', () => {
    console.log('🔗 === BASIC TYPE MAPPING LOADING ===');

    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const typeMappingCsv = `index,type
0,FRIENDS
1,FOLLOWS
2,LIKES
3,WORKS_FOR
4,MANAGES`;

    const typeMappingPath = path.join(testDataDir, CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME);
    fs.writeFileSync(typeMappingPath, typeMappingCsv);

    console.log(`📄 Created: ${typeMappingPath}`);
    console.log(`📊 CSV:\n${typeMappingCsv}`);

    const loader = new RelationshipTypeMappingLoader(testDataDir);
    const mapping = loader.load();

    expect(mapping).not.toBe(null);
    console.log('✅ Type mapping loaded!');
    console.log(`📊 Mapping size: ${mapping!.size}`);

    mapping!.forEach((type, index) => {
      console.log(`   ${index} → ${type}`);
    });

    expect(mapping!.get('0')).toBe('FRIENDS');
    expect(mapping!.get('2')).toBe('LIKES');
    expect(mapping!.get('4')).toBe('MANAGES');
  });

  it('should return null for missing file', () => {
    console.log('\n📂 === MISSING FILE ===');

    const loader = new RelationshipTypeMappingLoader(path.join(testDataDir, 'missing'));
    const mapping = loader.load();

    console.log('✅ Correctly returned null');
    expect(mapping).toBe(null);
  });

  it('should handle complex relationship types', () => {
    console.log('\n🔗 === COMPLEX TYPES ===');

    const complexCsv = `index,type
0,FRIEND_OF
1,EMPLOYEE_OF
2,CHILD_OF
3,LIVES_IN
4,PURCHASED_FROM
5,REVIEWED_BY`;

    const typeMappingPath = path.join(testDataDir, CsvRelationshipTypeMappingVisitor.TYPE_MAPPING_FILE_NAME);
    fs.writeFileSync(typeMappingPath, complexCsv);

    const loader = new RelationshipTypeMappingLoader(testDataDir);
    const mapping = loader.load();

    console.log('✅ Complex types loaded!');
    mapping!.forEach((type, index) => {
      console.log(`   ${index} → ${type}`);
    });

    expect(mapping!.get('1')).toBe('EMPLOYEE_OF');
    expect(mapping!.get('4')).toBe('PURCHASED_FROM');
  });

});
