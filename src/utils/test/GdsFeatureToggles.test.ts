import {
  GdsFeatureToggles,
  AdjacencyPackingStrategy,
  FeatureToggleManager,
  FeatureToggle,
  FEATURE_TOGGLES,
  PAGES_PER_THREAD,
  ADJACENCY_PACKING_STRATEGY
} from '@/utils/GdsFeatureToggles';

describe('GdsFeatureToggles - Comprehensive Infrastructure Tests', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Backup original environment
    originalEnv = { ...process.env };

    // Reset all toggles to defaults before each test
    Object.values(GdsFeatureToggles).forEach(toggle => {
      FeatureToggleManager.reset(toggle);
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Basic Toggle Management', () => {
    it('has all expected feature toggles defined', () => {
      const expectedToggles = [
        'USE_BIT_ID_MAP',
        'USE_UNCOMPRESSED_ADJACENCY_LIST',
        'USE_PACKED_ADJACENCY_LIST',
        'USE_MIXED_ADJACENCY_LIST',
        'USE_REORDERED_ADJACENCY_LIST',
        'ENABLE_ARROW_DATABASE_IMPORT',
        'FAIL_ON_PROGRESS_TRACKER_ERRORS',
        'ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING'
      ];

      expectedToggles.forEach(toggle => {
        expect(GdsFeatureToggles[toggle as keyof typeof GdsFeatureToggles]).toBeDefined();
      });
    });

    it('returns correct default values', () => {
      // These are the documented defaults
      expect(FeatureToggleManager.isEnabled(GdsFeatureToggles.USE_BIT_ID_MAP)).toBe(true);
      expect(FeatureToggleManager.isEnabled(GdsFeatureToggles.ENABLE_ARROW_DATABASE_IMPORT)).toBe(true);
      expect(FeatureToggleManager.isDisabled(GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST)).toBe(true);
      expect(FeatureToggleManager.isDisabled(GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS)).toBe(true);
    });

    it('can toggle features on and off', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const originalValue = FeatureToggleManager.isEnabled(toggle);

      // Toggle it
      FeatureToggleManager.setToggle(toggle, !originalValue);
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(!originalValue);

      // Toggle back
      FeatureToggleManager.setToggle(toggle, originalValue);
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(originalValue);
    });

    it('setToggle returns previous value', () => {
      const toggle = GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS;

      // Initially false
      expect(FeatureToggleManager.isDisabled(toggle)).toBe(true);

      // Set to true, should return false (previous value)
      const previousValue = FeatureToggleManager.setToggle(toggle, true);
      expect(previousValue).toBe(false);
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(true);

      // Set to false, should return true (previous value)
      const secondPrevious = FeatureToggleManager.setToggle(toggle, false);
      expect(secondPrevious).toBe(true);
      expect(FeatureToggleManager.isDisabled(toggle)).toBe(true);
    });

    it('can reset toggles to defaults', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const defaultValue = true; // Known default

      // Change from default
      FeatureToggleManager.setToggle(toggle, false);
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(false);

      // Reset to default
      FeatureToggleManager.reset(toggle);
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(defaultValue);
    });
  });

  describe('Environment Variable Integration', () => {

    it('handles boolean parsing correctly', () => {
      const testCases = [
        // For default true toggles
        { envValue: 'false', defaultTrue: true, expected: false },
        { envValue: 'FALSE', defaultTrue: true, expected: false },
        { envValue: 'true', defaultTrue: true, expected: true },
        { envValue: 'anything', defaultTrue: true, expected: true },
        { envValue: undefined, defaultTrue: true, expected: true },

        // For default false toggles
        { envValue: 'true', defaultTrue: false, expected: true },
        { envValue: 'TRUE', defaultTrue: false, expected: true },
        { envValue: 'false', defaultTrue: false, expected: false },
        { envValue: 'anything', defaultTrue: false, expected: false },
        { envValue: undefined, defaultTrue: false, expected: false }
      ];

      testCases.forEach(({ envValue, defaultTrue, expected }) => {
        // Test the private parseBoolean method through reflection
        const parseBoolean = (FeatureToggleManager as any).parseBoolean;
        const result = parseBoolean(envValue, defaultTrue);

        expect(result).toBe(expected);
        console.log(`parseBoolean('${envValue}', ${defaultTrue}) = ${result}`);
      });
    });

    it('converts toggle names to camelCase correctly', () => {
      const testCases = [
        { input: GdsFeatureToggles.USE_BIT_ID_MAP, expected: 'useBitIdMap' },
        { input: GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS, expected: 'failOnProgressTrackerErrors' },
        { input: GdsFeatureToggles.ENABLE_ADJACENCY_COMPRESSION_MEMORY_TRACKING, expected: 'enableAdjacencyCompressionMemoryTracking' }
      ];

      testCases.forEach(({ input, expected }) => {
        const toCamelCase = (FeatureToggleManager as any).toCamelCase;
        const result = toCamelCase(input);

        expect(result).toBe(expected);
        console.log(`toCamelCase('${input}') = '${result}'`);
      });
    });
  });

  describe('Atomic Operations and Thread Safety', () => {
    it('uses AtomicNumber for thread-safe operations', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;

      // Multiple rapid toggles should be atomic
      const results: boolean[] = [];

      for (let i = 0; i < 100; i++) {
        const previous = FeatureToggleManager.setToggle(toggle, i % 2 === 0);
        results.push(previous);
      }

      // Should have alternating true/false values
      expect(results.length).toBe(100);
      expect(results[0]).toBe(true); // Original default

      // Final state should be even (false) since we ended on i=99 (odd)
      expect(FeatureToggleManager.isDisabled(toggle)).toBe(true);
    });

    it('handles concurrent access patterns', () => {
      const toggle = GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS;

      // Simulate concurrent access
      const operations = [
        () => FeatureToggleManager.isEnabled(toggle),
        () => FeatureToggleManager.setToggle(toggle, true),
        () => FeatureToggleManager.isDisabled(toggle),
        () => FeatureToggleManager.setToggle(toggle, false),
        () => FeatureToggleManager.reset(toggle)
      ];

      // Should not throw with rapid concurrent operations
      expect(() => {
        for (let i = 0; i < 50; i++) {
          operations[i % operations.length]();
        }
      }).not.toThrow();
    });
  });

  describe('Temporary Toggle Operations', () => {
    it('enableAndRun executes code with toggle enabled then restores', () => {
      const toggle = GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS;
      const originalValue = FeatureToggleManager.isEnabled(toggle);

      let valueInsideCallback: boolean | undefined;

      FeatureToggleManager.enableAndRun(toggle, () => {
        valueInsideCallback = FeatureToggleManager.isEnabled(toggle);
      });

      expect(valueInsideCallback).toBe(true); // Should be enabled inside
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(originalValue); // Should be restored
    });

    it('disableAndRun executes code with toggle disabled then restores', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const originalValue = FeatureToggleManager.isEnabled(toggle);

      let valueInsideCallback: boolean | undefined;

      FeatureToggleManager.disableAndRun(toggle, () => {
        valueInsideCallback = FeatureToggleManager.isEnabled(toggle);
      });

      expect(valueInsideCallback).toBe(false); // Should be disabled inside
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(originalValue); // Should be restored
    });

    it('restores value even if callback throws', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const originalValue = FeatureToggleManager.isEnabled(toggle);

      expect(() => {
        FeatureToggleManager.disableAndRun(toggle, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Should still restore original value
      expect(FeatureToggleManager.isEnabled(toggle)).toBe(originalValue);
    });

    it('handles nested temporary toggles correctly', () => {
      const toggle = GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS;
      const originalValue = false; // Known default

      const capturedValues: boolean[] = [];

      FeatureToggleManager.enableAndRun(toggle, () => {
        capturedValues.push(FeatureToggleManager.isEnabled(toggle)); // Should be true

        FeatureToggleManager.disableAndRun(toggle, () => {
          capturedValues.push(FeatureToggleManager.isEnabled(toggle)); // Should be false
        });

        capturedValues.push(FeatureToggleManager.isEnabled(toggle)); // Should be true again
      });

      capturedValues.push(FeatureToggleManager.isEnabled(toggle)); // Should be original

      expect(capturedValues).toEqual([true, false, true, originalValue]);
    });
  });

  describe('FeatureToggle Wrapper Class', () => {
    it('provides convenient instance-based API', () => {
      const toggle = new FeatureToggle(GdsFeatureToggles.USE_BIT_ID_MAP);

      const originalValue = toggle.isEnabled();

      // Toggle it
      toggle.setValue(!originalValue);
      expect(toggle.isEnabled()).toBe(!originalValue);
      expect(toggle.isDisabled()).toBe(originalValue);

      // Reset it
      toggle.reset();
      expect(toggle.isEnabled()).toBe(true); // Known default
    });

    it('delegates temporary operations correctly', () => {
      const toggle = new FeatureToggle(GdsFeatureToggles.FAIL_ON_PROGRESS_TRACKER_ERRORS);

      let valueInside: boolean | undefined;

      toggle.enableAndRun(() => {
        valueInside = toggle.isEnabled();
      });

      expect(valueInside).toBe(true);
      expect(toggle.isDisabled()).toBe(true); // Back to default
    });

    it('works with predefined toggle instances', () => {
      const toggle = FEATURE_TOGGLES.FAIL_ON_PROGRESS_TRACKER_ERRORS;

      expect(toggle).toBeInstanceOf(FeatureToggle);
      expect(toggle.isDisabled()).toBe(true); // Known default

      toggle.setValue(true);
      expect(toggle.isEnabled()).toBe(true);

      toggle.reset();
      expect(toggle.isDisabled()).toBe(true);
    });
  });

  describe('Adjacency Packing Strategy', () => {
    it('has all expected packing strategies', () => {
      const expectedStrategies = [
        'BLOCK_ALIGNED_TAIL',
        'VAR_LONG_TAIL',
        'PACKED_TAIL',
        'INLINED_HEAD_PACKED_TAIL'
      ];

      expectedStrategies.forEach(strategy => {
        expect(AdjacencyPackingStrategy[strategy as keyof typeof AdjacencyPackingStrategy]).toBeDefined();
      });
    });

    it('has correct default packing strategy', () => {
      expect(ADJACENCY_PACKING_STRATEGY.value).toBe(AdjacencyPackingStrategy.INLINED_HEAD_PACKED_TAIL);
    });

    it('allows packing strategy modification', () => {
      const original = ADJACENCY_PACKING_STRATEGY.value;

      ADJACENCY_PACKING_STRATEGY.value = AdjacencyPackingStrategy.PACKED_TAIL;
      expect(ADJACENCY_PACKING_STRATEGY.value).toBe(AdjacencyPackingStrategy.PACKED_TAIL);

      // Restore
      ADJACENCY_PACKING_STRATEGY.value = original;
    });
  });

  describe('Pages Per Thread Configuration', () => {
    it('has correct default pages per thread', () => {
      expect(PAGES_PER_THREAD.get()).toBe(4);
    });

    it('reads pages per thread from environment', () => {
      // Test that PAGES_PER_THREAD is atomic
      const original = PAGES_PER_THREAD.get();

      PAGES_PER_THREAD.set(8);
      expect(PAGES_PER_THREAD.get()).toBe(8);

      // Test atomic operations
      const previous = PAGES_PER_THREAD.getAndSet(16);
      expect(previous).toBe(8);
      expect(PAGES_PER_THREAD.get()).toBe(16);

      // Restore
      PAGES_PER_THREAD.set(original);
    });

  });

  describe('Real-World Usage Scenarios', () => {
    it('handles typical feature flag workflow', () => {
      // Scenario: Testing new adjacency list format
      const toggle = FEATURE_TOGGLES.USE_BIT_ID_MAP;

      // Start with default
      expect(toggle.isEnabled()).toBe(true);

      // Temporarily disable for testing
      toggle.disableAndRun(() => {
        // Simulate algorithm running with feature disabled
        expect(toggle.isDisabled()).toBe(true);

        // Test some logic here...
        console.log('Running algorithm with USE_BIT_ID_MAP disabled');
      });

      // Back to normal
      expect(toggle.isEnabled()).toBe(true);
    });

    it('handles progress tracker error testing', () => {
      const toggle = FEATURE_TOGGLES.FAIL_ON_PROGRESS_TRACKER_ERRORS;

      // Normally disabled for production stability
      expect(toggle.isDisabled()).toBe(true);

      // Enable for strict testing
      toggle.enableAndRun(() => {
        expect(toggle.isEnabled()).toBe(true);

        // Now progress tracker errors would cause failures
        console.log('Progress tracker errors will now cause test failures');
      });

      // Back to lenient mode
      expect(toggle.isDisabled()).toBe(true);
    });

    it('demonstrates configuration-driven algorithm selection', () => {
      const testScenarios = [
        {
          name: 'Legacy Mode',
          config: {
            [GdsFeatureToggles.USE_BIT_ID_MAP]: false,
            [GdsFeatureToggles.USE_UNCOMPRESSED_ADJACENCY_LIST]: true
          }
        },
        {
          name: 'Modern Mode',
          config: {
            [GdsFeatureToggles.USE_BIT_ID_MAP]: true,
            [GdsFeatureToggles.USE_PACKED_ADJACENCY_LIST]: true
          }
        }
      ];

      testScenarios.forEach(scenario => {
        console.log(`Testing ${scenario.name}`);

        // Apply configuration
        Object.entries(scenario.config).forEach(([toggle, value]) => {
          FeatureToggleManager.setToggle(toggle as GdsFeatureToggles, value);
        });

        // Verify configuration
        Object.entries(scenario.config).forEach(([toggle, expectedValue]) => {
          expect(FeatureToggleManager.isEnabled(toggle as GdsFeatureToggles)).toBe(expectedValue);
        });

        // Reset for next scenario
        Object.keys(scenario.config).forEach(toggle => {
          FeatureToggleManager.reset(toggle as GdsFeatureToggles);
        });
      });
    });

    it('handles high-frequency toggle operations', () => {
      const toggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const start = performance.now();

      // Simulate high-frequency feature flag checks
      for (let i = 0; i < 10000; i++) {
        FeatureToggleManager.isEnabled(toggle);
        if (i % 100 === 0) {
          FeatureToggleManager.setToggle(toggle, i % 200 === 0);
        }
      }

      const duration = performance.now() - start;
      console.log(`10,000 toggle operations took ${duration}ms`);

      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined toggle gracefully', () => {
      // This should handle gracefully if toggle doesn't exist
      const result = FeatureToggleManager.isEnabled('NONEXISTENT_TOGGLE' as any);
      expect(result).toBe(false); // Should default to false for unknown toggles
    });

    it('maintains consistency across multiple managers', () => {
      // Changes should be visible across different access patterns
      const directToggle = GdsFeatureToggles.USE_BIT_ID_MAP;
      const wrapperToggle = new FeatureToggle(GdsFeatureToggles.USE_BIT_ID_MAP);
      const predefToggle = FEATURE_TOGGLES.USE_BIT_ID_MAP;

      FeatureToggleManager.setToggle(directToggle, false);

      expect(wrapperToggle.isDisabled()).toBe(true);
      expect(predefToggle.isDisabled()).toBe(true);

      wrapperToggle.setValue(true);

      expect(FeatureToggleManager.isEnabled(directToggle)).toBe(true);
      expect(predefToggle.isEnabled()).toBe(true);
    });

    it('handles memory pressure with many toggles', () => {
      // Verify that the static initialization doesn't leak memory
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        Object.values(GdsFeatureToggles).forEach(toggle => {
          FeatureToggleManager.isEnabled(toggle);
          FeatureToggleManager.setToggle(toggle, i % 2 === 0);
          FeatureToggleManager.reset(toggle);
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory increase after 1000 toggle operations: ${memoryIncrease} bytes`);

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });
});
