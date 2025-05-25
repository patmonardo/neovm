import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global configuration structure that can be loaded from YAML files.
 */
export interface GlobalConfig {
  defaults?: {
    export?: Record<string, any>;
    database?: Record<string, any>;
    generation?: Record<string, any>;
    algorithms?: Record<string, any>;
  };
  profiles?: {
    [profileName: string]: {
      export?: Record<string, any>;
      database?: Record<string, any>;
      generation?: Record<string, any>;
      algorithms?: Record<string, any>;
    };
  };
}

/**
 * Configuration loader that supports YAML files, environment variables, and profiles.
 */
export class ConfigLoader {
  private static globalConfig: GlobalConfig = {};
  private static currentProfile: string = 'default';

  /**
   * Load configuration from YAML file.
   */
  static loadFromFile(configPath: string): void {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const parsed = yaml.load(content) as GlobalConfig;
        this.globalConfig = this.mergeConfigs(this.globalConfig, parsed);
      }
    } catch (error) {
      console.warn(`Could not load config from ${configPath}:`, error);
    }
  }

  /**
   * Load configuration from multiple sources in order of precedence.
   */
  static loadDefaults(): void {
    // 1. Load from standard locations
    const possiblePaths = [
      '/etc/neovm/config.yaml',
      path.join(process.cwd(), 'neovm.config.yaml'),
      path.join(process.cwd(), 'config', 'neovm.yaml'),
      path.join(process.env.HOME || '~', '.neovm', 'config.yaml')
    ];

    for (const configPath of possiblePaths) {
      this.loadFromFile(configPath);
    }

    // 2. Load from environment variable path
    const envConfigPath = process.env.NEOVM_CONFIG_PATH;
    if (envConfigPath) {
      this.loadFromFile(envConfigPath);
    }

    // 3. Override with environment variables
    this.loadFromEnvironment();
  }

  /**
   * Load configuration overrides from environment variables.
   */
  static loadFromEnvironment(): void {
    const envConfig: GlobalConfig = { defaults: {} };

    // Export defaults
    if (process.env.NEOVM_EXPORT_PATH) {
      envConfig.defaults!.export = envConfig.defaults!.export || {};
      envConfig.defaults!.export.exportPath = process.env.NEOVM_EXPORT_PATH;
    }
    if (process.env.NEOVM_WRITE_CONCURRENCY) {
      const concurrency = parseInt(process.env.NEOVM_WRITE_CONCURRENCY, 10);
      if (!isNaN(concurrency)) {
        envConfig.defaults!.export = envConfig.defaults!.export || {};
        envConfig.defaults!.export.writeConcurrency = concurrency;
      }
    }

    this.globalConfig = this.mergeConfigs(this.globalConfig, envConfig);
  }

  /**
   * Set active configuration profile.
   */
  static setProfile(profileName: string): void {
    this.currentProfile = profileName;
  }

  /**
   * Get configuration defaults for a specific config type.
   */
  static getDefaults<T>(configType: 'export' | 'database' | 'generation' | 'algorithms'): Partial<T> {
    const defaults = this.globalConfig.defaults?.[configType] || {};
    const profileOverrides = this.globalConfig.profiles?.[this.currentProfile]?.[configType] || {};

    return { ...defaults, ...profileOverrides } as Partial<T>;
  }

  /**
   * Merge two configuration objects deeply.
   */
  private static mergeConfigs(target: GlobalConfig, source: GlobalConfig): GlobalConfig {
    return {
      defaults: {
        export: { ...target.defaults?.export, ...source.defaults?.export },
        database: { ...target.defaults?.database, ...source.defaults?.database },
        generation: { ...target.defaults?.generation, ...source.defaults?.generation },
        algorithms: { ...target.defaults?.algorithms, ...source.defaults?.algorithms }
      },
      profiles: { ...target.profiles, ...source.profiles }
    };
  }

  /**
   * Reset configuration to empty state (useful for testing).
   */
  static reset(): void {
    this.globalConfig = {};
    this.currentProfile = 'default';
  }

  /**
   * Get current configuration state (useful for debugging).
   */
  static getCurrentConfig(): GlobalConfig {
    return JSON.parse(JSON.stringify(this.globalConfig));
  }
}

// Auto-load configuration on module import
try {
  ConfigLoader.loadDefaults();
} catch (error) {
  console.warn('Could not load default configuration:', error);
}
