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
 */
class FeatureToggleManager {
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

  private static readonly toggles = new Map<GdsFeatureToggles, AtomicNumber>(); // ← Changed

  static {
    // Initialize all toggles
    for (const [toggle, defaultValue] of this.DEFAULT_VALUES) {
      const propertyName = `org.neo4j.gds.utils.GdsFeatureToggles.${this.toCamelCase(
        toggle
      )}`;
      const envValue = this.getBooleanProperty(propertyName, defaultValue);
      this.toggles.set(toggle, new AtomicNumber(envValue ? 1 : 0)); // ← Changed
    }
  }

  public static isEnabled(toggle: GdsFeatureToggles): boolean {
    const atomic = this.toggles.get(toggle);
    return atomic
      ? atomic.get() === 1
      : this.DEFAULT_VALUES.get(toggle) || false; // ← Changed
  }

  public static isDisabled(toggle: GdsFeatureToggles): boolean {
    return !this.isEnabled(toggle);
  }

  public static toggle(toggle: GdsFeatureToggles, value: boolean): boolean {
    const atomic = this.toggles.get(toggle);
    if (atomic) {
      const oldValue = atomic.getAndSet(value ? 1 : 0); // ← Changed
      return oldValue === 1; // ← Changed
    }
    return false;
  }

  public static reset(toggle: GdsFeatureToggles): void {
    const atomic = this.toggles.get(toggle);
    const defaultValue = this.DEFAULT_VALUES.get(toggle) || false;
    if (atomic) {
      atomic.set(defaultValue ? 1 : 0); // ← Changed
    }
  }

  public static enableAndRun<E extends Error>(
    toggle: GdsFeatureToggles,
    code: () => void
  ): void {
    const before = this.toggle(toggle, true);
    try {
      code();
    } finally {
      this.toggle(toggle, before);
    }
  }

  public static disableAndRun<E extends Error>(
    toggle: GdsFeatureToggles,
    code: () => void
  ): void {
    const before = this.toggle(toggle, false);
    try {
      code();
    } finally {
      this.toggle(toggle, before);
    }
  }

  private static getBooleanProperty(
    propertyName: string,
    defaultValue: boolean
  ): boolean {
    const value = process.env[propertyName]; // || globalThis[propertyName as any];
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

// Constants
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

// Extension methods for enum
declare global {
  namespace GdsFeatureTogglesExt {
    interface GdsFeatureToggles {
      isEnabled(): boolean;
      isDisabled(): boolean;
      toggle(value: boolean): boolean;
      reset(): void;
      enableAndRun(code: () => void): void;
      disableAndRun(code: () => void): void;
    }
  }
}

// Add methods to enum prototype
Object.values(GdsFeatureToggles).forEach((toggle) => {
  (GdsFeatureToggles as any)[toggle].isEnabled = function () {
    return FeatureToggleManager.isEnabled(this);
  };
  (GdsFeatureToggles as any)[toggle].isDisabled = function () {
    return FeatureToggleManager.isDisabled(this);
  };
  (GdsFeatureToggles as any)[toggle].toggle = function (value: boolean) {
    return FeatureToggleManager.toggle(this, value);
  };
  (GdsFeatureToggles as any)[toggle].reset = function () {
    return FeatureToggleManager.reset(this);
  };
  (GdsFeatureToggles as any)[toggle].enableAndRun = function (
    code: () => void
  ) {
    return FeatureToggleManager.enableAndRun(this, code);
  };
  (GdsFeatureToggles as any)[toggle].disableAndRun = function (
    code: () => void
  ) {
    return FeatureToggleManager.disableAndRun(this, code);
  };
});
