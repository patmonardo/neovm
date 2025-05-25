import { ConfigFactory, ConfigLoader } from '@/config';

// Test basic configuration
console.log('=== Testing Basic Configuration ===');

const basicExportConfig = ConfigFactory.fileExporter({
  exportPath: "/custom/path"
});
console.log('Basic export config:', basicExportConfig);

const basicAlgoConfig = ConfigFactory.pageRank({
  maxIterations: 100
});
console.log('Basic PageRank config:', basicAlgoConfig);

// Test profile switching
console.log('\n=== Testing Profile Configuration ===');

ConfigLoader.setProfile('testing');
const testConfig = ConfigFactory.fileExporter();
console.log('Test profile config:', testConfig);

ConfigLoader.setProfile('production');
const prodConfig = ConfigFactory.fileExporter();
console.log('Production profile config:', prodConfig);

// Test environment override
console.log('\n=== Testing Environment Override ===');
process.env.NEOVM_EXPORT_PATH = '/env/override/path';
process.env.NEOVM_WRITE_CONCURRENCY = '8';

ConfigLoader.reset();
ConfigLoader.loadDefaults();

const envConfig = ConfigFactory.fileExporter();
console.log('Environment override config:', envConfig);
