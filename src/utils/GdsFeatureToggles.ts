import { AtomicNumber } from "@/concurrency/AtomicNumber";

/**
 * Feature toggles for GDS functionality.
 */
export enum GdsFeatureToggles {
  USE_BIT_ID_MAP = "USE_BIT_ID_MAP",
  USE_UNCOMPRESSED_ADJACENCY_LIST = "USE_UNCOMPRESSED_ADJACENCY_LIST",
  USE_PACKED_ADJACENCY_LIST = "USE_PACKED_ADJACENCY_LIST",
  USE_MIXED_ADJACENCY_LIST = "USE_MIXED_ADJACENCY_LIST",
  USE_REORDERED_ADJACENCY_LIST = "USE_REORDERED_ADJACENCY_LIST",
  ENABLE_ARROW_DATABASE_IMPORT = "ENABLE_ARROW_DATABASE_IMPORT",
  FAIL_ON_PROGRESS_TRACKER_ERRORS = "FAIL_ON_PROGRESS_TRACKER_ERRORS",
  ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING = "ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING",
}

/**
 * Adjacency packing strategies.
 */
export enum AdjacencyPackingStrategy {
  BLOCK_ALIGNED_TAIL = "BLOCK_ALIGNED_TAIL",
  VAR_LONG_TAIL = "VAR_LONG_TAIL",
  PACKED_TAIL = "PACKED_TAIL",
  INLINED_HEAD_PACKED_TAIL = "INLINED_HEAD_PACKED_TAIL",
}

/**
 * Feature toggle manager with atomic state.
 * Clean static API instead of monkey-patching enums.
 */
export class FeatureToggleManager {
  private static readonly DEFAULT_VALUES = new Map<GdsFeatureToggles, boolean>([
    [GdsFeatureToggles.USE_BIT_ID_MAP, true],
    [GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_PACKED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_MIXED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.USE_REORDERED_ADJACENCY_LIST, false],
    [GdsFeatureToggles.ENABLE_ARROW_DATABASE_IMPORT, true],
    [GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS, false],
    [GdsFeatureToggles.ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING, false],
  ]);

  private static readonly toggleStore = new Map<GdsFeatureToggles, AtomicNumber>();

  static {
    // Initialize all toggles cleanly
    for (const [toggle, defaultValue] of this.DEFAULT_VALUES) {
      const propertyName = `org.neo4j.gds.utils.GdsFeatureToggles.${this.toCamelCase(toggle)}`;
      const envValue = this.getBooleanProperty(propertyName, defaultValue);
      this.toggleStore.set(toggle, new AtomicNumber(envValue ? 1 : 0));
    }
  }

  // 🎯 CLEAN STATIC API METHODS
  public static isEnabled(toggle: GdsFeatureToggles): boolean {
    const atomic = this.toggleStore.get(toggle);
    return atomic
      ? atomic.get() === 1
      : this.DEFAULT_VALUES.get(toggle) || false;
  }

  public static isDisabled(toggle: GdsFeatureToggles): boolean {
    return !this.isEnabled(toggle);
  }

  public static setToggle(toggle: GdsFeatureToggles, value: boolean): boolean {
    const atomic = this.toggleStore.get(toggle);
    if (atomic) {
      const oldValue = atomic.getAndSet(value ? 1 : 0);
      return oldValue === 1;
    }
    return false;
  }

  public static reset(toggle: GdsFeatureToggles): void {
    const atomic = this.toggleStore.get(toggle);
    const defaultValue = this.DEFAULT_VALUES.get(toggle) || false;
    if (atomic) {
      atomic.set(defaultValue ? 1 : 0);
    }
  }

  public static enableAndRun(toggle: GdsFeatureToggles, code: () => void): void {
    const before = this.setToggle(toggle, true);
    try {
      code();
    } finally {
      this.setToggle(toggle, before);
    }
  }

  public static disableAndRun(toggle: GdsFeatureToggles, code: () => void): void {
    const before = this.setToggle(toggle, false);
    try {
      code();
    } finally {
      this.setToggle(toggle, before);
    }
  }

  private static getBooleanProperty(propertyName: string, defaultValue: boolean): boolean {
    const value = process.env[propertyName];
    return this.parseBoolean(value, defaultValue);
  }

  private static parseBoolean(value: any, defaultValue: boolean): boolean {
    if (typeof value === "string") {
      return defaultValue
        ? value.toLowerCase() !== "false"
        : value.toLowerCase() === "true";
    }
    return defaultValue;
  }

  private static toCamelCase(toggle: GdsFeatureToggles): string {
    return toggle
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// 🎯 CLEAN CONVENIENCE WRAPPER CLASS
export class FeatureToggle {
  constructor(private readonly toggleType: GdsFeatureToggles) {}

  isEnabled(): boolean {
    return FeatureToggleManager.isEnabled(this.toggleType);
  }

  isDisabled(): boolean {
    return FeatureToggleManager.isDisabled(this.toggleType);
  }

  setValue(value: boolean): boolean {
    return FeatureToggleManager.setToggle(this.toggleType, value);
  }

  reset(): void {
    FeatureToggleManager.reset(this.toggleType);
  }

  enableAndRun(code: () => void): void {
    FeatureToggleManager.enableAndRun(this.toggleType, code);
  }

  disableAndRun(code: () => void): void {
    FeatureToggleManager.disableAndRun(this.toggleType, code);
  }
}

// 🎯 CLEAN CONSTANTS
export const PAGES_PER_THREAD_DEFAULT_SETTING = 4;
export const PAGES_PER_THREAD = new AtomicNumber(
  parseInt(
    process.env["org.neo4j.gds.utils.GdsFeatureToggles.pagesPerThread"] || "4",
    10
  )
);

export const ADJACENCY_PACKING_STRATEGY_DEFAULT_SETTING =
  AdjacencyPackingStrategy.INLINED_HEAD_PACKED_TAIL;

export const ADJACENCY_PACKING_STRATEGY = {
  value: ADJACENCY_PACKING_STRATEGY_DEFAULT_SETTING,
};

// 🎯 CLEAN PREDEFINED TOGGLE INSTANCES (Optional convenience)
export const FEATURE_TOGGLES = {
  FAIL_ON_PROGRESS_TRACKER_ERRORS: new FeatureToggle(GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS),
  USE_BIT_ID_MAP: new FeatureToggle(GdsFeatureToggles.USE_BIT_ID_MAP),
  ENABLE_ARROW_DATABASE_IMPORT: new FeatureToggle(GdsFeatureToggles.ENABLE_ARROW_DATABASE_IMPORT),
  // ... add others as needed
} as const;
