/**
 * GDS Feature Toggles - Runtime Configuration and A/B Testing
 *
 * **The Configuration Engine**: Provides runtime control over graph database
 * features, compression strategies, and performance optimizations.
 *
 * **A/B Testing Support**: Enables safe feature rollout and performance
 * comparison in production environments.
 *
 * **Environment Integration**: Reads from system properties/environment
 * variables to configure behavior without code changes.
 */

import { AtomicBoolean } from '../concurrency/AtomicBoolean';
import { AtomicInteger } from '../concurrency/AtomicInteger';
import { AtomicReference } from '../concurrency/AtomicReference';

/**
 * Functional interface for test operations that may throw
 */
interface CheckedRunnable<E extends Error> {
  checkedRun(): void | Promise<void>;
}

/**
 * Main feature toggle enumeration
 */
export enum GdsFeatureToggles {
  /**
   * Use bit-optimized ID mapping for memory efficiency.
   * **Default**: true (enabled for memory savings)
   */
  USE_BIT_ID_MAP = 'USE_BIT_ID_MAP',

  /**
   * Store adjacency lists without compression.
   * **Default**: false (compression preferred for memory)
   */
  USE_UNCOMPRESSED_ADJACENCY_LIST = 'USE_UNCOMPRESSED_ADJACENCY_LIST',

  /**
   * Use packed bit compression for adjacency lists.
   * **Default**: false (other strategies preferred)
   */
  USE_PACKED_ADJACENCY_LIST = 'USE_PACKED_ADJACENCY_LIST',

  /**
   * Use mixed compression strategies based on list size.
   * **Default**: false (single strategy preferred)
   */
  USE_MIXED_ADJACENCY_LIST = 'USE_MIXED_ADJACENCY_LIST',

  /**
   * Reorder adjacency lists for better cache performance.
   * **Default**: false (preserve input order)
   */
  USE_REORDERED_ADJACENCY_LIST = 'USE_REORDERED_ADJACENCY_LIST',

  /**
   * Enable Arrow format database import.
   * **Default**: true (Arrow is efficient)
   */
  ENABLE_ARROW_DATABASE_IMPORT = 'ENABLE_ARROW_DATABASE_IMPORT',

  /**
   * Fail on progress tracker errors (useful for testing).
   * **Default**: false (resilient in production)
   */
  FAIL_ON_PROGRESS_TRACKER_ERRORS = 'FAIL_ON_PROGRESS_TRACKER_ERRORS',

  /**
   * Track memory usage during adjacency compression.
   * **Default**: false (overhead not worth it in production)
   */
  ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING = 'ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING'
}

/**
 * Adjacency compression strategy options
 */
export enum AdjacencyPackingStrategy {
  /**
   * Block-aligned compression for optimal cache performance.
   * **Best For**: CPU-intensive graph algorithms
   */
  BLOCK_ALIGNED_TAIL = 'BLOCK_ALIGNED_TAIL',

  /**
   * Variable-length tail compression.
   * **Best For**: Balanced compression and speed
   */
  VAR_LONG_TAIL = 'VAR_LONG_TAIL',

  /**
   * Maximum bit-packing compression.
   * **Best For**: Memory-constrained environments
   */
  PACKED_TAIL = 'PACKED_TAIL',

  /**
   * Inlined first value with packed tail.
   * **Best For**: Power-law graphs with frequent first-neighbor access
   */
  INLINED_HEAD_PACKED_TAIL = 'INLINED_HEAD_PACKED_TAIL'
}

/**
 * Feature toggle registry and management
 */
export class GdsFeatureToggleRegistry {

  // ============================================================================
  // TOGGLE STORAGE
  // ============================================================================

  private static readonly toggles = new Map<GdsFeatureToggles, {
    current: AtomicBoolean;
    defaultValue: boolean;
  }>();

  private static readonly defaults = new Map<GdsFeatureToggles, boolean>([
    [GdsFeatureToggles.USE_BIT_ID_MAP, true],
    [GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_PACKED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_MIXED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_REORDERED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.ENABLE_ARROW_DATABASE_IMPORT, true],
    [GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS, false],
    [GdsFeatureToggles.ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING, false]
  ]);

  // ============================================================================
  // SPECIAL CONFIGURATION VALUES
  // ============================================================================

  /**
   * How many pages per loading thread.
   * **Trade-off**: More pages = less contention, fewer pages = higher throughput
   */
  static readonly PAGES_PER_THREAD_DEFAULT_SETTING = 4;
  static readonly PAGES_PER_THREAD = new AtomicInteger(
    GdsFeatureToggleRegistry.getIntegerProperty(
      'org.neo4j.gds.utils.GdsFeatureToggles.pagesPerThread',
      GdsFeatureToggleRegistry.PAGES_PER_THREAD_DEFAULT_SETTING
    )
  );

  /**
   * Default adjacency packing strategy.
   */
  static readonly ADJACENCY_PACKING_STRATEGY_DEFAULT_SETTING = AdjacencyPackingStrategy.INLINED_HEAD_PACKED_TAIL;
  static readonly ADJACENCY_PACKING_STRATEGY = new AtomicReference<AdjacencyPackingStrategy>(
    GdsFeatureToggleRegistry.ADJACENCY_PACKING_STRATEGY_DEFAULT_SETTING
  );

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  static {
    // Initialize all toggles from environment/system properties
    for (const [toggle, defaultValue] of GdsFeatureToggleRegistry.defaults) {
      const propertyName = GdsFeatureToggleRegistry.getPropertyName(toggle);
      const envValue = GdsFeatureToggleRegistry.getBooleanProperty(propertyName, defaultValue);

      GdsFeatureToggleRegistry.toggles.set(toggle, {
        current: new AtomicBoolean(envValue),
        defaultValue: defaultValue
      });
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if a feature toggle is enabled.
   */
  static isEnabled(toggle: GdsFeatureToggles): boolean {
    const entry = GdsFeatureToggleRegistry.toggles.get(toggle);
    if (!entry) {
      throw new Error(`Unknown feature toggle: ${toggle}`);
    }
    return entry.current.get();
  }

  /**
   * Check if a feature toggle is disabled.
   */
  static isDisabled(toggle: GdsFeatureToggles): boolean {
    return !GdsFeatureToggleRegistry.isEnabled(toggle);
  }

  /**
   * Set a feature toggle value and return the previous value.
   */
  static toggle(toggle: GdsFeatureToggles, value: boolean): boolean {
    const entry = GdsFeatureToggleRegistry.toggles.get(toggle);
    if (!entry) {
      throw new Error(`Unknown feature toggle: ${toggle}`);
    }
    return entry.current.getAndSet(value);
  }

  /**
   * Reset a feature toggle to its default value.
   */
  static reset(toggle: GdsFeatureToggles): void {
    const entry = GdsFeatureToggleRegistry.toggles.get(toggle);
    if (!entry) {
      throw new Error(`Unknown feature toggle: ${toggle}`);
    }
    entry.current.set(entry.defaultValue);
  }

  /**
   * Reset all feature toggles to their default values.
   */
  static resetAll(): void {
    for (const toggle of Object.values(GdsFeatureToggles)) {
      GdsFeatureToggleRegistry.reset(toggle);
    }
  }

  // ============================================================================
  // TEST UTILITIES
  // ============================================================================

  /**
   * Enable a toggle, run code, then restore previous value.
   * **Test Only**: For controlled testing scenarios
   */
  static async enableAndRun<E extends Error>(
    toggle: GdsFeatureToggles,
    code: CheckedRunnable<E>
  ): Promise<void> {
    const before = GdsFeatureToggleRegistry.toggle(toggle, true);
    try {
      await code.checkedRun();
    } finally {
      GdsFeatureToggleRegistry.toggle(toggle, before);
    }
  }

  /**
   * Disable a toggle, run code, then restore previous value.
   * **Test Only**: For controlled testing scenarios
   */
  static async disableAndRun<E extends Error>(
    toggle: GdsFeatureToggles,
    code: CheckedRunnable<E>
  ): Promise<void> {
    const before = GdsFeatureToggleRegistry.toggle(toggle, false);
    try {
      await code.checkedRun();
    } finally {
      GdsFeatureToggleRegistry.toggle(toggle, before);
    }
  }

  // ============================================================================
  // ENVIRONMENT INTEGRATION
  // ============================================================================

  /**
   * Convert toggle enum to property name.
   */
  private static getPropertyName(toggle: GdsFeatureToggles): string {
    // Convert SCREAMING_SNAKE_CASE to camelCase
    const camelCase = toggle.toLowerCase()
      .split('_')
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');

    return `org.neo4j.gds.utils.GdsFeatureToggles.${camelCase}`;
  }

  /**
   * Get boolean property from environment or system property.
   */
  private static getBooleanProperty(propertyName: string, defaultValue: boolean): boolean {
    // Check environment variable first (convert dots to underscores)
    const envName = propertyName.replace(/\./g, '_').toUpperCase();
    const envValue = process.env[envName];

    if (envValue !== undefined) {
      return GdsFeatureToggleRegistry.parseBoolean(envValue, defaultValue);
    }

    // In browser environment, we could check localStorage or other mechanisms
    // For now, just return default
    return defaultValue;
  }

  /**
   * Get integer property from environment.
   */
  private static getIntegerProperty(propertyName: string, defaultValue: number): number {
    const envName = propertyName.replace(/\./g, '_').toUpperCase();
    const envValue = process.env[envName];

    if (envValue !== undefined) {
      const parsed = parseInt(envValue, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }

  /**
   * Parse boolean value from string.
   */
  private static parseBoolean(value: string, defaultValue: boolean): boolean {
    if (defaultValue) {
      // Default true: only "false" disables it
      return !"false".toLowerCase() === value.toLowerCase();
    } else {
      // Default false: only "true" enables it
      return "true".toLowerCase() === value.toLowerCase();
    }
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Convenience object that mimics the original Java enum pattern
 */
export const GdsFeatureToggleUtils = {
  /**
   * Check if feature is enabled
   */
  isEnabled: (toggle: GdsFeatureToggles) => GdsFeatureToggleRegistry.isEnabled(toggle),

  /**
   * Check if feature is disabled
   */
  isDisabled: (toggle: GdsFeatureToggles) => GdsFeatureToggleRegistry.isDisabled(toggle),

  /**
   * Toggle a feature
   */
  toggle: (toggle: GdsFeatureToggles, value: boolean) => GdsFeatureToggleRegistry.toggle(toggle, value),

  /**
   * Reset feature to default
   */
  reset: (toggle: GdsFeatureToggles) => GdsFeatureToggleRegistry.reset(toggle),

  /**
   * Get current adjacency packing strategy
   */
  getAdjacencyPackingStrategy: () => GdsFeatureToggleRegistry.ADJACENCY_PACKING_STRATEGY.get(),

  /**
   * Set adjacency packing strategy
   */
  setAdjacencyPackingStrategy: (strategy: AdjacencyPackingStrategy) =>
    GdsFeatureToggleRegistry.ADJACENCY_PACKING_STRATEGY.set(strategy),

  /**
   * Get pages per thread setting
   */
  getPagesPerThread: () => GdsFeatureToggleRegistry.PAGES_PER_THREAD.get(),

  /**
   * Set pages per thread
   */
  setPagesPerThread: (pages: number) => GdsFeatureToggleRegistry.PAGES_PER_THREAD.set(pages)
};
