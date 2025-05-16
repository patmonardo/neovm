import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyMapping, PropertyMappingOptions } from './PropertyMapping';
import { DefaultValue } from '@/api/DefaultValue'; // Assuming this path
import { Aggregation } from '@/core/Aggregation';   // Assuming this path
import { ElementProjection } from './ElementProjection';
import { RelationshipProjection } from './RelationshipProjection';

// Mock or ensure these constants are available if not directly imported
// For the purpose of this test, let's define them if they aren't exported by their modules
// In a real scenario, you'd import them or ensure ElementProjection/RelationshipProjection are set up.
// if (typeof ElementProjection.PROJECT_ALL === 'undefined') {
//   (ElementProjection as any).PROJECT_ALL = "*";
// }
// if (typeof RelationshipProjection.AGGREGATION_KEY === 'undefined') {
//   (RelationshipProjection as any).AGGREGATION_KEY = "aggregation";
// }


describe('PropertyMapping', () => {
  const targetKey = 'targetProp';
  const sourceKey = 'sourceProp';

  describe('PropertyMapping.validatePropertyKey()', () => {
    it('should not throw for a valid property key', () => {
      expect(() => PropertyMapping.validatePropertyKey('validKey')).not.toThrow();
    });
    it('should throw if property key is null', () => {
      expect(() => PropertyMapping.validatePropertyKey(null)).toThrow('Property key must not be null or empty.');
    });
    it('should throw if property key is undefined', () => {
      expect(() => PropertyMapping.validatePropertyKey(undefined)).toThrow('Property key must not be null or empty.');
    });
    it('should throw if property key is an empty string', () => {
      expect(() => PropertyMapping.validatePropertyKey('')).toThrow('Property key must not be null or empty.');
    });
  });

  describe('PropertyMapping.of()', () => {
    it('should create with only propertyKey (targetKey)', () => {
      const mapping = PropertyMapping.of(targetKey);
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(targetKey); // Defaults to targetKey
      expect(mapping.defaultValue()).toEqual(DefaultValue.DEFAULT);
      expect(mapping.aggregation()).toBe(Aggregation.DEFAULT);
    });

    it('should create with propertyKey and neoPropertyKey as string option', () => {
      const mapping = PropertyMapping.of(targetKey, sourceKey);
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
      expect(mapping.defaultValue()).toEqual(DefaultValue.DEFAULT);
      expect(mapping.aggregation()).toBe(Aggregation.DEFAULT);
    });

    it('should create with options: neoPropertyKey', () => {
      const mapping = PropertyMapping.of(targetKey, { neoPropertyKey: sourceKey });
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
    });

    it('should create with options: neoPropertyKey explicitly null', () => {
      const mapping = PropertyMapping.of(targetKey, { neoPropertyKey: null });
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBeNull();
    });

    it('should create with options: neoPropertyKey undefined (defaults to targetKey)', () => {
      const mapping = PropertyMapping.of(targetKey, { neoPropertyKey: undefined });
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(targetKey);
    });

    it('should create with options: defaultValue (raw value)', () => {
      const defVal = 42;
      const mapping = PropertyMapping.of(targetKey, { defaultValue: defVal });
      expect(mapping.defaultValue().get()).toBe(defVal);
    });

    it('should create with options: defaultValue (DefaultValue instance)', () => {
      const defValInstance = DefaultValue.of(100);
      const mapping = PropertyMapping.of(targetKey, { defaultValue: defValInstance });
      expect(mapping.defaultValue()).toBe(defValInstance);
    });

    it('should create with options: aggregation', () => {
      const mapping = PropertyMapping.of(targetKey, { aggregation: Aggregation.SUM });
      expect(mapping.aggregation()).toBe(Aggregation.SUM);
    });

    it('should create with all options', () => {
      const defVal = 'test';
      const mapping = PropertyMapping.of(targetKey, {
        neoPropertyKey: sourceKey,
        defaultValue: defVal,
        aggregation: Aggregation.COUNT,
      });
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
      expect(mapping.defaultValue().get()).toBe(defVal);
      expect(mapping.aggregation()).toBe(Aggregation.COUNT);
    });

    it('should throw if propertyKey is invalid via constructor path', () => {
      expect(() => PropertyMapping.of('')).toThrow('Property key must not be null or empty.');
    });

    it('should allow "*" neoPropertyKey with Aggregation.COUNT', () => {
      const mapping = PropertyMapping.of(targetKey, {
        neoPropertyKey: ElementProjection.PROJECT_ALL,
        aggregation: Aggregation.COUNT,
      });
      expect(mapping.neoPropertyKey()).toBe(ElementProjection.PROJECT_ALL);
      expect(mapping.aggregation()).toBe(Aggregation.COUNT);
    });

    it('should throw if neoPropertyKey is "*" and aggregation is not COUNT', () => {
      expect(() =>
        PropertyMapping.of(targetKey, {
          neoPropertyKey: ElementProjection.PROJECT_ALL,
          aggregation: Aggregation.SUM,
        })
      ).toThrow("A '*' property key can only be used in combination with count aggregation.");
    });
     it('should throw if neoPropertyKey (defaulting to targetKey) is "*" and aggregation is not COUNT', () => {
      expect(() =>
        PropertyMapping.of(ElementProjection.PROJECT_ALL, { // targetKey is "*"
          // neoPropertyKey is undefined, so it defaults to targetKey
          aggregation: Aggregation.SUM,
        })
      ).toThrow("A '*' property key can only be used in combination with count aggregation.");
    });
  });

  describe('PropertyMapping.fromObject()', () => {
    it('should parse with configValue as string (neoPropertyKey)', () => {
      const mapping = PropertyMapping.fromObject(targetKey, sourceKey);
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
      expect(mapping.defaultValue()).toEqual(DefaultValue.DEFAULT);
      expect(mapping.aggregation()).toBe(Aggregation.DEFAULT);
    });

    it('should parse with configValue as object with "property" (source key)', () => {
      const mapping = PropertyMapping.fromObject(targetKey, { property: sourceKey });
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
    });

    it('should parse with configValue as object with "property" (case-insensitive)', () => {
      const mapping = PropertyMapping.fromObject(targetKey, { PrOpErTy: sourceKey });
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
    });

    it('should parse with configValue as object with "defaultValue"', () => {
      const defVal = 123;
      const mapping = PropertyMapping.fromObject(targetKey, { defaultValue: defVal });
      expect(mapping.defaultValue().get()).toBe(defVal);
    });

    it('should parse with configValue as object with "aggregation"', () => {
      const mapping = PropertyMapping.fromObject(targetKey, { [RelationshipProjection.AGGREGATION_KEY]: 'SUM' });
      expect(mapping.aggregation()).toBe(Aggregation.SUM);
    });

    it('should parse with configValue as object with all keys', () => {
      const defVal = 'hello';
      const mapping = PropertyMapping.fromObject(targetKey, {
        property: sourceKey,
        defaultValue: defVal,
        [RelationshipProjection.AGGREGATION_KEY]: 'COUNT',
      });
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
      expect(mapping.defaultValue().get()).toBe(defVal);
      expect(mapping.aggregation()).toBe(Aggregation.COUNT);
    });

    it('should default neoPropertyKey to targetPropertyKey if "property" is not in config object', () => {
      const mapping = PropertyMapping.fromObject(targetKey, { defaultValue: 5 });
      expect(mapping.neoPropertyKey()).toBe(targetKey);
    });

    it('should throw if targetPropertyKey is invalid', () => {
      expect(() => PropertyMapping.fromObject('', 'test')).toThrow('Property key must not be null or empty.');
    });

    it('should throw if configValue is not string or object', () => {
      expect(() => PropertyMapping.fromObject(targetKey, 123)).toThrow(
        `Expected configuration for property '${targetKey}' to be of type String or Object, but got number`
      );
    });

    it('should throw if "property" in config object is not a string', () => {
      expect(() => PropertyMapping.fromObject(targetKey, { property: 123 })).toThrow(
        `Expected the value of 'property' for property '${targetKey}' to be of type String, but was 'number'.`
      );
    });

    it('should throw if "aggregation" in config object is not a string', () => {
      expect(() => PropertyMapping.fromObject(targetKey, { [RelationshipProjection.AGGREGATION_KEY]: 123 })).toThrow(
        `Expected the value of '${RelationshipProjection.AGGREGATION_KEY}' for property '${targetKey}' to be of type String, but was 'number'.`
      );
    });
  });

  describe('Instance Methods', () => {
    const mappingDefault = PropertyMapping.of(targetKey);
    const mappingFull = PropertyMapping.of('target', {
      neoPropertyKey: 'source',
      defaultValue: 'def',
      aggregation: Aggregation.MIN,
    });
    const mappingNullNeoKey = PropertyMapping.of(targetKey, { neoPropertyKey: null });


    it('propertyKey() should return target property key', () => {
      expect(mappingDefault.propertyKey()).toBe(targetKey);
      expect(mappingFull.propertyKey()).toBe('target');
    });

    it('neoPropertyKey() should return source property key or default to target', () => {
      expect(mappingDefault.neoPropertyKey()).toBe(targetKey); // Defaults to targetKey
      expect(mappingFull.neoPropertyKey()).toBe('source');
      expect(mappingNullNeoKey.neoPropertyKey()).toBeNull();
    });

    it('defaultValue() should return the DefaultValue instance', () => {
      expect(mappingDefault.defaultValue()).toEqual(DefaultValue.DEFAULT);
      expect(mappingFull.defaultValue().get()).toBe('def');
    });

    it('aggregation() should return the Aggregation enum', () => {
      expect(mappingDefault.aggregation()).toBe(Aggregation.DEFAULT);
      expect(mappingFull.aggregation()).toBe(Aggregation.MIN);
    });

    describe('hasValidName()', () => {
      it('should return true if neoPropertyKey is a non-empty string', () => {
        expect(PropertyMapping.of(targetKey, sourceKey).hasValidName()).toBe(true);
        expect(PropertyMapping.of(targetKey).hasValidName()).toBe(true); // Defaults to targetKey
      });
      it('should return false if neoPropertyKey is null', () => {
        expect(PropertyMapping.of(targetKey, { neoPropertyKey: null }).hasValidName()).toBe(false);
      });
      it('should return false if neoPropertyKey resolves to an empty string (though constructor might prevent this)', () => {
        // The constructor validates targetPropertyKey. If neoPropertyKey is explicitly set to "",
        // and neoPropertyKey() returns it, then hasValidName should be false.
        // However, the instance validation for '*' is the primary check on neoPropertyKey's value.
        // Let's test explicit empty string for neoPropertyKey if allowed by constructor path (it's not for targetKey)
        // The current `validateInstanceProperties` doesn't re-validate neoPropertyKey for emptiness if not '*'.
        // If `PropertyMapping.of(targetKey, { neoPropertyKey: "" })` was possible and neoPropertyKey() returned "",
        // then hasValidName() would be false.
        // For now, this case is tricky as "" for neoPropertyKey might be disallowed earlier or not.
        // The current code allows `PropertyMapping.of(targetKey, { neoPropertyKey: "" })`
        const mappingWithEmptyNeoKey = PropertyMapping.of(targetKey, { neoPropertyKey: "" });
        expect(mappingWithEmptyNeoKey.hasValidName()).toBe(false);

      });
    });

    it('exists() should return false (base implementation)', () => {
      expect(mappingDefault.exists()).toBe(false);
    });

    describe('toObject()', () => {
      it('should convert to object without aggregation', () => {
        const [key, config] = mappingFull.toObject(false);
        expect(key).toBe('target');
        expect(config).toEqual({
          property: 'source',
          defaultValue: 'def',
        });
      });

      it('should convert to object with aggregation', () => {
        const [key, config] = mappingFull.toObject(true);
        expect(key).toBe('target');
        expect(config).toEqual({
          property: 'source',
          defaultValue: 'def',
          [RelationshipProjection.AGGREGATION_KEY]: 'MIN', // Assuming Aggregation.MIN.toString() or key is 'MIN'
        });
      });

      it('toObject with default mapping', () => {
        const mapping = PropertyMapping.of("prop");
        const [key, config] = mapping.toObject(true);
        expect(key).toBe("prop");
        expect(config.property).toBe("prop");
        expect(config.defaultValue).toBeNull(); // DefaultValue.DEFAULT.get()
        expect(config.aggregation).toBe("DEFAULT");
      });
    });

    describe('setNonDefaultAggregation()', () => {
      const baseMapping = PropertyMapping.of(targetKey); // Aggregation.DEFAULT

      it('should return new instance if current is DEFAULT and new is not DEFAULT', () => {
        const newMapping = baseMapping.setNonDefaultAggregation(Aggregation.SUM);
        expect(newMapping).not.toBe(baseMapping);
        expect(newMapping.aggregation()).toBe(Aggregation.SUM);
        expect(newMapping.propertyKey()).toBe(targetKey); // Other props remain
      });

      it('should return self if newAggregation is DEFAULT', () => {
        const newMapping = baseMapping.setNonDefaultAggregation(Aggregation.DEFAULT);
        expect(newMapping).toBe(baseMapping);
      });

      it('should return self if current aggregation is not DEFAULT', () => {
        const initialMapping = PropertyMapping.of(targetKey, { aggregation: Aggregation.MAX });
        const newMapping = initialMapping.setNonDefaultAggregation(Aggregation.SUM);
        expect(newMapping).toBe(initialMapping);
        expect(initialMapping.aggregation()).toBe(Aggregation.MAX);
      });
    });
  });

  describe('Other Static Factories', () => {
    it('PropertyMapping.ofKey()', () => {
      const mapping = PropertyMapping.ofKey(targetKey);
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(targetKey);
      expect(mapping.defaultValue()).toEqual(DefaultValue.DEFAULT);
      expect(mapping.aggregation()).toBe(Aggregation.DEFAULT);
    });

    it('PropertyMapping.ofNeoKey()', () => {
      const defVal = 77;
      // neoPropertyKey becomes the targetPropertyKey here
      const mapping = PropertyMapping.ofNeoKey(sourceKey, defVal);
      expect(mapping.propertyKey()).toBe(sourceKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey); // Because explicitNeoPropertyKey is undefined in this .of call
      expect(mapping.defaultValue().get()).toBe(defVal);
      expect(mapping.aggregation()).toBe(Aggregation.DEFAULT);
    });

     it('PropertyMapping.ofNeoKey() where neoPropertyKey is used as target and source', () => {
      const defVal = 77;
      const mapping = PropertyMapping.of(sourceKey, { defaultValue: defVal }); // This is what ofNeoKey effectively calls
      expect(mapping.propertyKey()).toBe(sourceKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey); // neoPropertyKey option is undefined, defaults to propertyKey
      expect(mapping.defaultValue().get()).toBe(defVal);
    });


    it('PropertyMapping.ofFull()', () => {
      const defValInst = DefaultValue.of('val');
      const mapping = PropertyMapping.ofFull(targetKey, sourceKey, defValInst, Aggregation.MAX);
      expect(mapping.propertyKey()).toBe(targetKey);
      expect(mapping.neoPropertyKey()).toBe(sourceKey);
      expect(mapping.defaultValue()).toBe(defValInst);
      expect(mapping.aggregation()).toBe(Aggregation.MAX);
    });

    it('PropertyMapping.ofFull() with raw default value', () => {
        const mapping = PropertyMapping.ofFull(targetKey, null, 99, Aggregation.MIN);
        expect(mapping.propertyKey()).toBe(targetKey);
        expect(mapping.neoPropertyKey()).toBeNull();
        expect(mapping.defaultValue().get()).toBe(99);
        expect(mapping.aggregation()).toBe(Aggregation.MIN);
    });
  });
});
