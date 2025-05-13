import { Limit } from './Limit';
import { LimitFactory } from './LimitFactory';
import { LimitViolation } from './LimitViolation';

/**
 * Configuration class for managing limits on configuration values.
 */
export class LimitsConfiguration {
  /**
   * A singleton we can use to store the limits configuration.
   */
  public static readonly Instance: LimitsConfiguration = new LimitsConfiguration(
    new Map<string, Limit>(),
    new Map<string, Map<string, Limit>>()
  );

  /**
   * A handy singleton for when you need to satisfy a requirement for the configuration,
   * but want to ignore limits entirely.
   */
  public static readonly Empty: LimitsConfiguration = new LimitsConfiguration(
    new Map<string, Limit>(),
    new Map<string, Map<string, Limit>>()
  );

  private readonly globalLimits: Map<string, Limit>;
  private readonly personalLimits: Map<string, Map<string, Limit>>;

  /**
   * Creates a new limits configuration.
   * 
   * @param globalLimits Global limit values
   * @param personalLimits User-specific limit values
   */
  constructor(
    globalLimits: Map<string, Limit>,
    personalLimits: Map<string, Map<string, Limit>>
  ) {
    this.globalLimits = globalLimits;
    this.personalLimits = personalLimits;
  }

  /**
   * Validates a configuration against limits.
   * 
   * @param configuration The user-supplied configuration
   * @param username The username to check personal limits for
   * @returns Set of limit violations, empty if configuration is valid
   */
  validate(configuration: Record<string, unknown>, username: string): Set<LimitViolation> {
    const limitViolations = new Set<LimitViolation>();

    for (const [key, value] of Object.entries(configuration)) {
      // Personal limits take precedence
      const userLimits = this.personalLimits.get(username) || new Map<string, Limit>();
      if (userLimits.has(key)) {
        const limit = userLimits.get(key)!;
        
        if (limit.isViolated(value)) {
          limitViolations.add(new LimitViolation(limit.asErrorMessage(key, value)));
          continue; // We found a violation; skip to next parameter
        }
      }

      // Global limits come second
      if (!this.globalLimits.has(key)) continue;

      const limit = this.globalLimits.get(key)!;
      
      if (limit.isViolated(value)) {
        const limitViolation = new LimitViolation(limit.asErrorMessage(key, value));
        limitViolations.add(limitViolation);
      }
    }

    return limitViolations;
  }

  /**
   * List limit settings.
   *
   * @param username If supplied, limits for this user are overlaid
   * @param key If supplied, return just the limit setting for that key
   * @returns Map of limit settings
   */
  list(username?: string, key?: string): Record<string, unknown> {
    const limits = this.startWithGlobalLimits();
    this.overlayPersonalLimitsIfApplicable(username, limits);

    if (key === undefined) {
      return limits;
    }

    if (!(key in limits)) {
      return {}; // Done because value does not exist for key
    }

    const value = limits[key];
    return { [key]: value };
  }

  /**
   * Set limit for key to value globally or for a specific user.
   *
   * @param key The configuration key
   * @param value The limit value
   * @param username If supplied, set the key-value pair just for that user
   */
  set(key: string, value: unknown, username?: string): void {
    const valueAsLimit = LimitFactory.create(value);

    if (username !== undefined) {
      if (!this.personalLimits.has(username)) {
        this.personalLimits.set(username, new Map<string, Limit>()); // Lazy initialization
      }
      this.personalLimits.get(username)!.set(key, valueAsLimit);
    } else {
      this.globalLimits.set(key, valueAsLimit);
    }
  }

  private startWithGlobalLimits(): Record<string, unknown> {
    const limits: Record<string, unknown> = {};
    this.globalLimits.forEach((limit, key) => {
      limits[key] = limit.getValue();
    });
    return limits;
  }

  private overlayPersonalLimitsIfApplicable(username: string | undefined, limits: Record<string, unknown>): void {
    if (username !== undefined) {
      const userLimits = this.personalLimits.get(username);
      if (userLimits) {
        userLimits.forEach((limit, key) => {
          limits[key] = limit.getValue();
        });
      }
    }
  }
}