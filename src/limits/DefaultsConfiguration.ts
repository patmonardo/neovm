import { Default } from './Default';

/**
 * Configuration class for managing default values.
 */
export class DefaultsConfiguration {
  /**
   * A singleton we can use to store the defaults configuration.
   */
  public static readonly Instance: DefaultsConfiguration = new DefaultsConfiguration(
    new Map<string, Default>(),
    new Map<string, Map<string, Default>>()
  );

  /**
   * A handy singleton for when you need to satisfy a requirement for the configuration,
   * but want to ignore defaults entirely.
   */
  public static readonly Empty: DefaultsConfiguration = new DefaultsConfiguration(
    new Map<string, Default>(),
    new Map<string, Map<string, Default>>()
  );

  private readonly globalDefaults: Map<string, Default>;
  private readonly personalDefaults: Map<string, Map<string, Default>>;

  /**
   * Creates a new defaults configuration.
   * 
   * @param globalDefaults Global default values
   * @param personalDefaults User-specific default values
   */
  constructor(
    globalDefaults: Map<string, Default>,
    personalDefaults: Map<string, Map<string, Default>>
  ) {
    this.globalDefaults = globalDefaults;
    this.personalDefaults = personalDefaults;
  }

  /**
   * Take user input and apply defaults to fill out fields not supplied by user.
   * 
   * @param configuration The user-supplied configuration
   * @param username The username to apply personal defaults for
   * @returns Configuration with defaults applied
   */
  apply(configuration: Record<string, unknown>, username: string): Record<string, unknown> {
    const configurationWithDefaults: Record<string, unknown> = { ...configuration };

    this.startWithPersonalDefaults(username, configurationWithDefaults);
    this.fillInWithGlobalDefaults(configurationWithDefaults);

    return configurationWithDefaults;
  }

  /**
   * List global default settings.
   *
   * @param username If supplied, defaults for this user are overlaid
   * @param key If supplied, return just the default setting for that key
   * @returns Map of default settings
   */
  list(username?: string, key?: string): Record<string, unknown> {
    const defaults = this.startWithGlobalDefaults();
    this.overlayPersonalDefaultsIfApplicable(username, defaults);

    if (key === undefined) {
      return defaults; // if no key specified, we are done
    }

    if (!(key in defaults)) {
      return {}; // done because value does not exist for key
    }

    const value = defaults[key];
    return { [key]: value };
  }

  /**
   * Set default for key to value globally or for a specific user.
   *
   * @param key The configuration key
   * @param value The default value
   * @param username If supplied, set the key-value pair just for that user
   */
  set(key: string, value: unknown, username?: string): void {
    const valueAsDefault = new Default(value);

    if (username !== undefined) {
      if (!this.personalDefaults.has(username)) {
        this.personalDefaults.set(username, new Map<string, Default>()); // lazy initialization
      }
      this.personalDefaults.get(username)!.set(key, valueAsDefault);
    } else {
      this.globalDefaults.set(key, valueAsDefault);
    }
  }

  private fillInWithGlobalDefaults(configurationWithDefaults: Record<string, unknown>): void {
    this.globalDefaults.forEach((d, s) => {
      if (!(s in configurationWithDefaults)) {
        configurationWithDefaults[s] = d.getValue();
      }
    });
  }

  private startWithPersonalDefaults(username: string, configurationWithDefaults: Record<string, unknown>): void {
    const userDefaults = this.personalDefaults.get(username) || new Map<string, Default>();
    userDefaults.forEach((d, s) => {
      if (!(s in configurationWithDefaults)) {
        configurationWithDefaults[s] = d.getValue();
      }
    });
  }

  private startWithGlobalDefaults(): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};
    this.globalDefaults.forEach((value, key) => {
      defaults[key] = value.getValue();
    });
    return defaults;
  }

  private overlayPersonalDefaultsIfApplicable(username: string | undefined, defaults: Record<string, unknown>): void {
    if (username !== undefined) {
      const userDefaults = this.personalDefaults.get(username) || new Map<string, Default>();
      userDefaults.forEach((v, k) => {
        defaults[k] = v.getValue();
      });
    }
  }
}