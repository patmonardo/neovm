import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

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
  private static currentProfile: string = "default";

  /**
   * Load configuration from YAML file and return it.
   */
  static loadFromFile(configPath: string): GlobalConfig | null {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf8");
        const parsed = yaml.load(content) as GlobalConfig;
        ConfigLoader.globalConfig = ConfigLoader.mergeConfigs(ConfigLoader.globalConfig, parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.warn(`Could not load config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Load from environment and return the config.
   */
  static fromEnvironment(): GlobalConfig {
    ConfigLoader.loadFromEnvironment();
    return ConfigLoader.getCurrentConfig();
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

    ConfigLoader.globalConfig = ConfigLoader.mergeConfigs(ConfigLoader.globalConfig, envConfig);
  }

  /**
   * Set active configuration profile.
   */
  static setProfile(profileName: string): void {
    ConfigLoader.currentProfile = profileName;
  }

  /**
   * Get configuration defaults for a specific config type.
   */
  static getDefaults<T>(
    configType: "export" | "database" | "generation" | "algorithms"
  ): Partial<T> {
    const defaults = ConfigLoader.globalConfig.defaults?.[configType] || {};
    const profileOverrides =
      ConfigLoader.globalConfig.profiles?.[ConfigLoader.currentProfile]?.[configType] || {};

    return { ...defaults, ...profileOverrides } as Partial<T>;
  }

  /**
   * Merge two configuration objects deeply.
   */
  private static mergeConfigs(
    target: GlobalConfig,
    source: GlobalConfig
  ): GlobalConfig {
    return {
      defaults: {
        export: { ...target.defaults?.export, ...source.defaults?.export },
        database: {
          ...target.defaults?.database,
          ...source.defaults?.database,
        },
        generation: {
          ...target.defaults?.generation,
          ...source.defaults?.generation,
        },
        algorithms: {
          ...target.defaults?.algorithms,
          ...source.defaults?.algorithms,
        },
      },
      profiles: { ...target.profiles, ...source.profiles },
    };
  }

  /**
   * Reset configuration to empty state (useful for testing).
   */
  static reset(): void {
    ConfigLoader.globalConfig = {};
    ConfigLoader.currentProfile = "default";
  }

  /**
   * Get current configuration state (useful for debugging).
   */
  static getCurrentConfig(): GlobalConfig {
    return JSON.parse(JSON.stringify(ConfigLoader.globalConfig));
  }

  /**
   * Load default configuration files if they exist.
   */
  static loadDefaults(): void {
    const defaultConfigPath = path.join(process.cwd(), 'config', 'defaults.yaml');
    if (fs.existsSync(defaultConfigPath)) {
      ConfigLoader.loadFromFile(defaultConfigPath);
    }
  }
}

// Auto-load configuration on module import
try {
  ConfigLoader.loadDefaults();
} catch (error) {
  console.warn("Could not load default configuration:", error);
}
