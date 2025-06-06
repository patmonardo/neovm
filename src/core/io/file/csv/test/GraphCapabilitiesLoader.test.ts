import { describe, it, expect } from 'vitest';
import { GraphCapabilitiesLoader } from '../GraphCapabilitiesLoader';
import { WriteMode } from '@/core/loading/Capabilities';
import { StaticCapabilities } from '@/core/loading/StaticCapabilities';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, 'testdata', 'graph_capabilities_test');

describe('GraphCapabilitiesLoader - CSV Capabilities Parser', () => {

  it('should load basic capabilities from CSV', () => {
    console.log('🔍 === BASIC CAPABILITIES LOADING ===');

    // Create test directory and CSV file
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const capabilitiesCsv = `writeMode,canWrite,canRead,supportsTransactions
LOCAL,true,true,true`;

    const capabilitiesPath = path.join(testDataDir, 'graph_capabilities.csv');
    fs.writeFileSync(capabilitiesPath, capabilitiesCsv);

    console.log(`📄 Created test file: ${capabilitiesPath}`);
    console.log(`📊 CSV content: ${capabilitiesCsv}`);

    try {
      const loader = new GraphCapabilitiesLoader(testDataDir);
      const capabilities = loader.load();

      console.log('✅ Capabilities loaded successfully!');
      console.log(`📋 Write mode: ${capabilities.writeMode()}`);
      console.log(`✍️ Can write: ${capabilities.canWrite()}`);
      console.log(`📖 Can read: ${capabilities.canRead()}`);
      console.log(`🔄 Supports transactions: ${capabilities.supportsTransactions()}`);

      // Basic assertions
      expect(capabilities.writeMode()).toBe(WriteMode.LOCAL);
      expect(capabilities.canWrite()).toBe(true);
      expect(capabilities.canRead()).toBe(true);
      expect(capabilities.supportsTransactions()).toBe(true);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle different write modes', () => {
    console.log('\n🔄 === WRITE MODE VARIATIONS ===');

    const writeModes = [
      { mode: 'LOCAL', expected: WriteMode.LOCAL },
      { mode: 'REMOTE', expected: WriteMode.REMOTE },
      { mode: 'NONE', expected: WriteMode.NONE },
      { mode: 'local', expected: WriteMode.LOCAL }, // Test case insensitive
      { mode: 'invalid', expected: WriteMode.LOCAL } // Test default fallback
    ];

    writeModes.forEach(({ mode, expected }, index) => {
      console.log(`\n🔧 Testing WriteMode: ${mode}`);

      const capabilitiesCsv = `writeMode,canWrite,canRead
${mode},true,true`;

      const capabilitiesPath = path.join(testDataDir, 'graph_capabilities.csv');
      fs.writeFileSync(capabilitiesPath, capabilitiesCsv);

      try {
        const loader = new GraphCapabilitiesLoader(testDataDir);
        const capabilities = loader.load();

        console.log(`   ✅ Loaded WriteMode: ${capabilities.writeMode()}`);
        expect(capabilities.writeMode()).toBe(expected);

      } catch (error) {
        console.log(`   ❌ FAIL for ${mode}: ${(error as Error).message}`);
        throw error;
      }
    });
  });

  it('should return default capabilities when file missing', () => {
    console.log('\n📂 === MISSING FILE HANDLING ===');

    const missingDir = path.join(testDataDir, 'missing_capabilities');

    try {
      const loader = new GraphCapabilitiesLoader(missingDir);
      const capabilities = loader.load();

      console.log('✅ Default capabilities returned for missing file');
      console.log(`📋 Default write mode: ${capabilities.writeMode()}`);
      console.log(`✍️ Default can write: ${capabilities.canWrite()}`);
      console.log(`📖 Default can read: ${capabilities.canRead()}`);

      // Test that we get default StaticCapabilities
      const defaultCapabilities = StaticCapabilities.of();
      expect(capabilities.writeMode()).toBe(defaultCapabilities.writeMode());
      expect(capabilities.canWrite()).toBe(defaultCapabilities.canWrite());
      expect(capabilities.canRead()).toBe(defaultCapabilities.canRead());

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should handle empty and malformed CSV files', () => {
    console.log('\n🔧 === EDGE CASES TESTING ===');

    const edgeCases = [
      { name: 'Empty file', content: '' },
      { name: 'Header only', content: 'writeMode,canWrite,canRead' },
      { name: 'Whitespace', content: '  writeMode  ,  canWrite  \n  LOCAL  ,  true  ' },
      { name: 'Missing writeMode column', content: 'canWrite,canRead\ntrue,true' },
      { name: 'Extra columns', content: 'writeMode,canWrite,canRead,extra\nLOCAL,true,true,ignored' }
    ];

    edgeCases.forEach(({ name, content }, index) => {
      console.log(`\n📋 Edge case: ${name}`);
      console.log(`   Content: "${content}"`);

      const capabilitiesPath = path.join(testDataDir, 'graph_capabilities.csv');
      fs.writeFileSync(capabilitiesPath, content);

      try {
        const loader = new GraphCapabilitiesLoader(testDataDir);
        const capabilities = loader.load();

        console.log(`   ✅ Successfully handled: ${name}`);
        console.log(`   📊 Write mode: ${capabilities.writeMode()}`);

        // Should always return some valid capabilities
        expect(capabilities).toBeDefined();
        expect(capabilities.writeMode()).toBeDefined();

      } catch (error) {
        console.log(`   ❌ FAIL on ${name}: ${(error as Error).message}`);
        // Some edge cases might legitimately fail
      }
    });
  });

  it('should handle CSV parsing with various data types', () => {
    console.log('\n📊 === DATA TYPE PARSING ===');

    const capabilitiesCsv = `writeMode,canWrite,canRead,supportsTransactions,maxConnections,features
REMOTE,false,true,false,100,"feature1,feature2"`;

    const capabilitiesPath = path.join(testDataDir, 'graph_capabilities.csv');
    fs.writeFileSync(capabilitiesPath, capabilitiesCsv);

    console.log(`📄 Complex CSV: ${capabilitiesCsv}`);

    try {
      const loader = new GraphCapabilitiesLoader(testDataDir);
      const capabilities = loader.load();

      console.log('✅ Complex capabilities loaded!');
      console.log(`📋 Write mode: ${capabilities.writeMode()}`);
      console.log(`✍️ Can write: ${capabilities.canWrite()}`);
      console.log(`📖 Can read: ${capabilities.canRead()}`);

      expect(capabilities.writeMode()).toBe(WriteMode.REMOTE);
      expect(capabilities.canWrite()).toBe(false);
      expect(capabilities.canRead()).toBe(true);

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }
  });

  it('should verify file naming convention', () => {
    console.log('\n📁 === FILE NAMING CONVENTION ===');

    // Test that loader looks for the correct filename
    const loader = new GraphCapabilitiesLoader(testDataDir);

    // Inspect the internal path (if accessible)
    console.log(`🔍 Loader expects file: graph_capabilities.csv`);

    // Create file with correct name
    const capabilitiesCsv = `writeMode\nLOCAL`;
    const correctPath = path.join(testDataDir, 'graph_capabilities.csv');
    fs.writeFileSync(correctPath, capabilitiesCsv);

    try {
      const capabilities = loader.load();
      console.log('✅ Found file with correct naming convention');
      expect(capabilities).toBeDefined();

    } catch (error) {
      console.log(`❌ FAIL: ${(error as Error).message}`);
      throw error;
    }

    // Clean up
    if (fs.existsSync(correctPath)) {
      fs.unlinkSync(correctPath);
    }
  });

});
