import { describe, it, expect } from 'vitest';
import { GraphInfoLoader } from '../GraphInfoLoader';
import { DatabaseLocation } from '@/api/DatabaseInfo';
import { IdMap } from '@/api';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'graph_info_test');

describe('GraphInfoLoader - CSV Graph Info Parser', () => {

  it('should load basic graph info from CSV', () => {
    console.log('🔍 === BASIC GRAPH INFO LOADING ===');

    // Create test directory and CSV file
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const graphInfoCsv = `databaseName,databaseLocation,idMapBuilderType,nodeCount,maxOriginalId,relTypeCounts,inverseIndexedRelTypes
myGraph,LOCAL,${IdMap.NO_TYPE},1000,999,,`;

    const graphInfoPath = path.join(testDataDir, 'graph_info.csv');
    fs.writeFileSync(graphInfoPath, graphInfoCsv);

    console.log(`📄 Created test file: ${graphInfoPath}`);
    console.log(`📊 CSV content: ${graphInfoCsv}`);

    try {
      const loader = new GraphInfoLoader(testDataDir);
      const graphInfo = loader.load();

      console.log('✅ GraphInfo loaded successfully!');
      console.log(`📋 Database name: ${graphInfo.databaseInfo().databaseId().databaseName()}`);
      console.log(`📍 Database location: ${graphInfo.databaseInfo().databaseLocation()}`);
      console.log(`🗂️ ID map type: ${graphInfo.idMapBuilderType()}`);
      console.log(`📊 Node count: ${graphInfo.nodeCount()}`);
      console.log(`🔢 Max original ID: ${graphInfo.maxOriginalId()}`);

      // Basic assertions
      expect(graphInfo.databaseInfo().databaseId().databaseName()).toBe('mygraph');
      expect(graphInfo.databaseInfo().databaseLocation()).toBe(DatabaseLocation.LOCAL);
      expect(graphInfo.nodeCount()).toBe(1000);
      expect(graphInfo.maxOriginalId()).toBe(999);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should load graph info with relationship type counts', () => {
    console.log('\n🔗 === RELATIONSHIP TYPE COUNTS LOADING ===');

    const graphInfoCsv = `databaseName,databaseLocation,idMapBuilderType,nodeCount,maxOriginalId,relTypeCounts,inverseIndexedRelTypes
socialGraph,LOCAL,${IdMap.NO_TYPE},5000,4999,FRIENDS=1200;FOLLOWS=800;LIKES=2000,FRIENDS;FOLLOWS`;

    const graphInfoPath = path.join(testDataDir, 'graph_info.csv');
    fs.writeFileSync(graphInfoPath, graphInfoCsv);

    console.log(`📄 CSV with relationship counts: ${graphInfoCsv}`);

    try {
      const loader = new GraphInfoLoader(testDataDir);
      const graphInfo = loader.load();

      console.log('✅ GraphInfo with relationships loaded!');

      const relTypeCounts = graphInfo.relationshipTypeCounts();
      console.log(`🔗 Relationship type counts:`);

      relTypeCounts.forEach((count, relType) => {
        console.log(`   ${relType.name()} → ${count}`);
      });

      const inverseIndexed = graphInfo.inverseIndexedRelationshipTypes();
      console.log(`📇 Inverse indexed types: ${inverseIndexed.map(rt => rt.name()).join(', ')}`);

      // Assertions
      expect(relTypeCounts.size).toBe(3);
      expect(inverseIndexed.length).toBe(2);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should load remote database graph info', () => {
    console.log('\n🌐 === REMOTE DATABASE LOADING ===');

    const graphInfoCsv = `databaseName,databaseLocation,remoteDatabaseId,idMapBuilderType,nodeCount,maxOriginalId,relTypeCounts,inverseIndexedRelTypes
remoteGraph,REMOTE,remote_db_123,${IdMap.NO_TYPE},10000,9999,,`;

    const graphInfoPath = path.join(testDataDir, 'graph_info.csv');
    fs.writeFileSync(graphInfoPath, graphInfoCsv);

    console.log(`📄 Remote database CSV: ${graphInfoCsv}`);

    try {
      const loader = new GraphInfoLoader(testDataDir);
      const graphInfo = loader.load();

      console.log('✅ Remote GraphInfo loaded!');
      console.log(`📍 Location: ${graphInfo.databaseInfo().databaseLocation()}`);
      console.log(`🔗 Remote ID: ${graphInfo.databaseInfo().remoteDatabaseId()?.databaseName() || 'N/A'}`);

      expect(graphInfo.databaseInfo().databaseLocation()).toBe(DatabaseLocation.REMOTE);
      expect(graphInfo.databaseInfo().remoteDatabaseId()?.databaseName()).toBe('remote_db_123');

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle CSV parsing edge cases', () => {
    console.log('\n🔧 === EDGE CASES TESTING ===');

    const edgeCases = [
      // Empty relationship counts
      `testGraph1,LOCAL,${IdMap.NO_TYPE},100,99,,`,
      // Whitespace in values
      `testGraph2 , LOCAL , ${IdMap.NO_TYPE} , 200 , 199 , FRIENDS=50 , FRIENDS `,
      // Missing optional fields
      `testGraph3,LOCAL,${IdMap.NO_TYPE},300,299`
    ];

    edgeCases.forEach((csvLine, index) => {
      console.log(`\n📋 Edge case ${index + 1}: ${csvLine}`);

      const fullCsv = `databaseName,databaseLocation,idMapBuilderType,nodeCount,maxOriginalId,relTypeCounts,inverseIndexedRelTypes\n${csvLine}`;
      const graphInfoPath = path.join(testDataDir, 'graph_info.csv');
      fs.writeFileSync(graphInfoPath, fullCsv);

      try {
        const loader = new GraphInfoLoader(testDataDir);
        const graphInfo = loader.load();

        console.log(`   ✅ Successfully parsed edge case ${index + 1}`);
        console.log(`   📊 Node count: ${graphInfo.nodeCount()}`);

      } catch (error) {
        console.log(`   ❌ FAIL on edge case ${index + 1}: ${(error as Error).message}`);
      }
    });
  });

  it('should handle file system operations', () => {
    console.log('\n📁 === FILE SYSTEM OPERATIONS ===');

    // Test missing file
    const missingDir = path.join(testDataDir, 'missing');
    try {
      const loader = new GraphInfoLoader(missingDir);
      loader.load();
      console.log('❌ FAIL: Should have thrown for missing file');
    } catch (error) {
      console.log(`✅ Correctly threw for missing file: ${(error as Error).message}`);
    }

    // Test invalid CSV format
    const invalidCsv = `just,one,line`;
    const graphInfoPath = path.join(testDataDir, 'graph_info.csv');
    fs.writeFileSync(graphInfoPath, invalidCsv);

    try {
      const loader = new GraphInfoLoader(testDataDir);
      loader.load();
      console.log('❌ FAIL: Should have thrown for invalid format');
    } catch (error) {
      console.log(`✅ Correctly threw for invalid format: ${(error as Error).message}`);
    }
  });

});
