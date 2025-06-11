import { ConfigLoader } from '@/config/ConfigLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('🔧 ConfigLoader - YAML & Environment Configuration', () => {

  beforeEach(() => {
    // Reset configuration state before each test
    ConfigLoader.reset();
    console.log('🧹 ConfigLoader state reset for clean testing');
  });

  // ==================== YAML FILE LOADING TESTS ====================
  describe('📁 YAML Configuration File Loading', () => {

    test('📄 loads valid YAML configuration files', () => {
      console.log('🧪 Testing YAML file loading functionality...');

      // Create a temporary test config file
      const testConfigPath = path.join(__dirname, 'fixtures', 'test-config.yaml');
      const testConfig = `
defaults:
  algorithms:
    pagerank:
      maxIterations: 25
      dampingFactor: 0.90
    louvain:
      maxIterations: 15
  export:
    writeConcurrency: 8
    includeMetaData: true
`;

      // Ensure test directory exists
      const fixturesDir = path.dirname(testConfigPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
        console.log('📁 Created test fixtures directory');
      }

      // Write test config file
      fs.writeFileSync(testConfigPath, testConfig);
      console.log('📝 Created test YAML file:', testConfigPath);

      try {
        const loadedConfig = ConfigLoader.loadFromFile(testConfigPath);
        console.log('📊 Loaded config:', loadedConfig);

        expect(loadedConfig).toBeDefined();
        expect(loadedConfig?.defaults?.algorithms?.pagerank?.maxIterations).toBe(25);
        expect(loadedConfig?.defaults?.algorithms?.pagerank?.dampingFactor).toBe(0.90);
        expect(loadedConfig?.defaults?.export?.writeConcurrency).toBe(8);

        console.log('✅ YAML configuration: SUCCESSFULLY LOADED');
        console.log(`🎯 PageRank iterations: ${loadedConfig?.defaults?.algorithms?.pagerank?.maxIterations}`);
        console.log(`🎯 Write concurrency: ${loadedConfig?.defaults?.export?.writeConcurrency}`);

      } finally {
        // Clean up test file
        if (fs.existsSync(testConfigPath)) {
          fs.unlinkSync(testConfigPath);
          console.log('🧹 Test YAML file cleaned up');
        }
      }
    });

    test('❌ handles missing YAML files gracefully', () => {
      console.log('🧪 Testing missing YAML file handling...');

      const nonExistentPath = './non-existent-config.yaml';
      console.log(`🚫 Attempting to load: ${nonExistentPath}`);

      const result = ConfigLoader.loadFromFile(nonExistentPath);

      expect(result).toBeNull();
      console.log('✅ Missing file handling: GRACEFUL');
      console.log('🛡️  Null returned for missing files (no crash)');
    });

    test('❌ handles malformed YAML files gracefully', () => {
      console.log('🧪 Testing malformed YAML file handling...');

      const malformedConfigPath = path.join(__dirname, 'fixtures', 'malformed-config.yaml');
      const malformedYaml = `
defaults:
  algorithms:
    pagerank:
      maxIterations: 25
      dampingFactor: 0.90
    - invalid yaml structure here
      missing proper indentation
`;

      // Ensure test directory exists
      const fixturesDir = path.dirname(malformedConfigPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }

      fs.writeFileSync(malformedConfigPath, malformedYaml);
      console.log('📝 Created malformed YAML file for testing');

      try {
        const result = ConfigLoader.loadFromFile(malformedConfigPath);

        expect(result).toBeNull(); // Should handle gracefully
        console.log('✅ Malformed YAML handling: GRACEFUL');
        console.log('🛡️  Parse errors handled without crashing');

      } finally {
        // Clean up test file
        if (fs.existsSync(malformedConfigPath)) {
          fs.unlinkSync(malformedConfigPath);
          console.log('🧹 Malformed YAML test file cleaned up');
        }
      }
    });
  });

  // ==================== ENVIRONMENT VARIABLE TESTS ====================
  describe('🌍 Environment Variable Configuration', () => {

    test('🔧 loads environment variables correctly', () => {
      console.log('🧪 Testing environment variable loading...');

      // Set up test environment variables
      const originalExportPath = process.env.NEOVM_EXPORT_PATH;
      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;

      process.env.NEOVM_EXPORT_PATH = '/test/export/path';
      process.env.NEOVM_WRITE_CONCURRENCY = '16';
      console.log('🌍 Set test environment variables:');
      console.log(`   NEOVM_EXPORT_PATH=${process.env.NEOVM_EXPORT_PATH}`);
      console.log(`   NEOVM_WRITE_CONCURRENCY=${process.env.NEOVM_WRITE_CONCURRENCY}`);

      try {
        const config = ConfigLoader.fromEnvironment();
        console.log('📊 Environment config result:', config);

        expect(config).toBeDefined();
        expect(config.defaults?.export?.exportPath).toBe('/test/export/path');
        expect(config.defaults?.export?.writeConcurrency).toBe(16);

        console.log('✅ Environment variables: LOADED CORRECTLY');
        console.log(`🎯 Export path: ${config.defaults?.export?.exportPath}`);
        console.log(`🎯 Write concurrency: ${config.defaults?.export?.writeConcurrency}`);

      } finally {
        // Clean up environment
        if (originalExportPath !== undefined) {
          process.env.NEOVM_EXPORT_PATH = originalExportPath;
        } else {
          delete process.env.NEOVM_EXPORT_PATH;
        }

        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
        console.log('🧹 Environment variables restored');
      }
    });

    test('🔢 parses numeric environment variables correctly', () => {
      console.log('🧪 Testing numeric environment variable parsing...');

      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;

      // Test valid number
      process.env.NEOVM_WRITE_CONCURRENCY = '32';
      console.log('🌍 Set NEOVM_WRITE_CONCURRENCY=32');

      try {
        const config = ConfigLoader.fromEnvironment();

        expect(config.defaults?.export?.writeConcurrency).toBe(32);
        expect(typeof config.defaults?.export?.writeConcurrency).toBe('number');

        console.log('✅ Numeric parsing: CORRECT');
        console.log(`🔢 Parsed concurrency: ${config.defaults?.export?.writeConcurrency} (type: ${typeof config.defaults?.export?.writeConcurrency})`);

      } finally {
        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
        console.log('🧹 Environment cleanup completed');
      }
    });

    test('❌ handles invalid numeric environment variables', () => {
      console.log('🧪 Testing invalid numeric environment variable handling...');

      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;

      // Test invalid number
      process.env.NEOVM_WRITE_CONCURRENCY = 'not-a-number';
      console.log('🌍 Set NEOVM_WRITE_CONCURRENCY=not-a-number');

      try {
        const config = ConfigLoader.fromEnvironment();

        // Should not set the property if parsing fails
        expect(config.defaults?.export?.writeConcurrency).toBeUndefined();

        console.log('✅ Invalid numeric handling: GRACEFUL');
        console.log('🛡️  Invalid numbers ignored (not set)');

      } finally {
        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
        console.log('🧹 Environment cleanup completed');
      }
    });
  });

  // ==================== CONFIGURATION MERGING TESTS ====================
  describe('🔄 Configuration Merging & Profiles', () => {

    test('🎯 merges YAML and environment configurations correctly', () => {
      console.log('🧪 Testing YAML + Environment configuration merging...');

      // Create YAML config
      const testConfigPath = path.join(__dirname, 'fixtures', 'merge-test-config.yaml');
      const yamlConfig = `
defaults:
  algorithms:
    pagerank:
      maxIterations: 20
      dampingFactor: 0.85
  export:
    writeConcurrency: 4
    includeMetaData: false
`;

      const fixturesDir = path.dirname(testConfigPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }

      fs.writeFileSync(testConfigPath, yamlConfig);
      console.log('📝 Created YAML config with base values');

      // Set environment variables that should override
      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;
      process.env.NEOVM_WRITE_CONCURRENCY = '16'; // Override YAML value
      console.log('🌍 Set environment override: NEOVM_WRITE_CONCURRENCY=16');

      try {
        // Load YAML first
        ConfigLoader.loadFromFile(testConfigPath);
        console.log('📁 YAML config loaded');

        // Then load environment (should merge/override)
        const finalConfig = ConfigLoader.fromEnvironment();
        console.log('🌍 Environment config merged');

        // YAML values should be preserved
        expect(finalConfig.defaults?.algorithms?.pagerank?.maxIterations).toBe(20);
        expect(finalConfig.defaults?.algorithms?.pagerank?.dampingFactor).toBe(0.85);
        expect(finalConfig.defaults?.export?.includeMetaData).toBe(false);

        // Environment should override YAML
        expect(finalConfig.defaults?.export?.writeConcurrency).toBe(16);

        console.log('✅ Configuration merging: WORKING CORRECTLY');
        console.log('📊 Final merged config:');
        console.log(`   PageRank iterations: ${finalConfig.defaults?.algorithms?.pagerank?.maxIterations} (from YAML)`);
        console.log(`   Write concurrency: ${finalConfig.defaults?.export?.writeConcurrency} (from ENV override)`);

      } finally {
        // Clean up
        if (fs.existsSync(testConfigPath)) {
          fs.unlinkSync(testConfigPath);
        }
        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
        console.log('🧹 Test cleanup completed');
      }
    });

    test('🏷️  handles configuration profiles correctly', () => {
      console.log('🧪 Testing configuration profile handling...');

      const testConfigPath = path.join(__dirname, 'fixtures', 'profile-test-config.yaml');
      const profileConfig = `
defaults:
  algorithms:
    pagerank:
      maxIterations: 20
profiles:
  development:
    algorithms:
      pagerank:
        maxIterations: 5  # Faster for dev
  production:
    algorithms:
      pagerank:
        maxIterations: 100  # More accurate for prod
`;

      const fixturesDir = path.dirname(testConfigPath);
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }

      fs.writeFileSync(testConfigPath, profileConfig);
      console.log('📝 Created profile-based config');

      try {
        ConfigLoader.loadFromFile(testConfigPath);

        // Test default profile
        let defaults = ConfigLoader.getDefaults<any>('algorithms');
        expect(defaults.pagerank?.maxIterations).toBe(20);
        console.log(`🎯 Default profile iterations: ${defaults.pagerank?.maxIterations}`);

        // Switch to development profile
        ConfigLoader.setProfile('development');
        console.log('🔄 Switched to development profile');

        defaults = ConfigLoader.getDefaults<any>('algorithms');
        expect(defaults.pagerank?.maxIterations).toBe(5);
        console.log(`🎯 Development profile iterations: ${defaults.pagerank?.maxIterations}`);

        // Switch to production profile
        ConfigLoader.setProfile('production');
        console.log('🔄 Switched to production profile');

        defaults = ConfigLoader.getDefaults<any>('algorithms');
        expect(defaults.pagerank?.maxIterations).toBe(100);
        console.log(`🎯 Production profile iterations: ${defaults.pagerank?.maxIterations}`);

        console.log('✅ Configuration profiles: WORKING CORRECTLY');

      } finally {
        if (fs.existsSync(testConfigPath)) {
          fs.unlinkSync(testConfigPath);
        }
        console.log('🧹 Profile test cleanup completed');
      }
    });
  });

  // ==================== UTILITY & STATE MANAGEMENT ====================
  describe('🛠️  Utility & State Management', () => {

    test('🔄 resets configuration state correctly', () => {
      console.log('🧪 Testing configuration state reset...');

      // Load some configuration
      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;
      process.env.NEOVM_WRITE_CONCURRENCY = '8';

      try {
        ConfigLoader.fromEnvironment();
        ConfigLoader.setProfile('test-profile');

        let config = ConfigLoader.getCurrentConfig();
        console.log('📊 Config before reset:', Object.keys(config));
        expect(Object.keys(config).length).toBeGreaterThan(0);

        // Reset configuration
        ConfigLoader.reset();
        console.log('🔄 Configuration reset called');

        // Verify reset
        config = ConfigLoader.getCurrentConfig();
        console.log('📊 Config after reset:', Object.keys(config));
        expect(Object.keys(config).length).toBe(0);

        console.log('✅ Configuration reset: WORKING');
        console.log('🧹 State properly cleared');

      } finally {
        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
      }
    });

    test('📊 getCurrentConfig returns deep copy', () => {
      console.log('🧪 Testing getCurrentConfig deep copy behavior...');

      const originalConcurrency = process.env.NEOVM_WRITE_CONCURRENCY;
      process.env.NEOVM_WRITE_CONCURRENCY = '4';

      try {
        ConfigLoader.fromEnvironment();

        const config1 = ConfigLoader.getCurrentConfig();
        const config2 = ConfigLoader.getCurrentConfig();

        // Should be different objects (deep copy)
        expect(config1).not.toBe(config2);

        // But should have same content
        expect(config1).toEqual(config2);

        // Modifying one shouldn't affect the other
        if (config1.defaults?.export) {
          config1.defaults.export.writeConcurrency = 999;
        }

        expect(config2.defaults?.export?.writeConcurrency).toBe(4); // Unchanged

        console.log('✅ getCurrentConfig: RETURNS DEEP COPY');
        console.log('🛡️  Configuration state protected from external mutations');

      } finally {
        if (originalConcurrency !== undefined) {
          process.env.NEOVM_WRITE_CONCURRENCY = originalConcurrency;
        } else {
          delete process.env.NEOVM_WRITE_CONCURRENCY;
        }
      }
    });
  });
});
