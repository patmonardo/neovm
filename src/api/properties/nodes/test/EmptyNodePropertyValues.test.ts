import { ValueType } from '@/api/ValueType';
import { UnsupportedOperationError } from '../NodePropertyValues';

// Import all Empty implementations
import { EmptyDoubleNodePropertyValues } from '../primitive/EmptyDoubleNodePropertyValues';
import { EmptyLongNodePropertyValues } from "../primitive/EmptyLongNodePropertyValues";
import { EmptyDoubleArrayNodePropertyValues } from "../primitive/EmptyDoubleArrayNodePropertyValues";
import { EmptyLongArrayNodePropertyValues } from "../primitive/EmptyLongArrayNodePropertyValues";
import { EmptyFloatArrayNodePropertyValues } from "../primitive/EmptyFloatArrayNodePropertyValues";

// Define test cases as configuration objects
const emptyImplementations = [
  {
    name: 'EmptyDoubleNodePropertyValues',
    instance: EmptyDoubleNodePropertyValues.INSTANCE,
    valueType: ValueType.DOUBLE,
    isArray: false,
    valueMethod: 'doubleValue',
    expectedValue: (val) => Number.isNaN(val),
    maxMethod: 'getMaxDoublePropertyValue',
    validConversions: {
      longValue: 0,
      floatValue: (val) => Number.isNaN(val)
    },
    invalidConversions: ['booleanValue', 'doubleArrayValue', 'longArrayValue', 'floatArrayValue']
  },
  {
    name: 'EmptyLongNodePropertyValues',
    instance: EmptyLongNodePropertyValues.INSTANCE,
    valueType: ValueType.LONG,
    isArray: false,
    valueMethod: 'longValue',
    expectedValue: -1,
    maxMethod: 'getMaxLongPropertyValue',
    validConversions: {
      doubleValue: (val) => Number.isNaN(val),
      floatValue: (val) => Number.isNaN(val)
    },
    invalidConversions: ['booleanValue', 'doubleArrayValue', 'longArrayValue', 'floatArrayValue']
  },
  // Add entries for array types
  {
    name: 'EmptyDoubleArrayNodePropertyValues',
    instance: EmptyDoubleArrayNodePropertyValues.INSTANCE,
    valueType: ValueType.DOUBLE_ARRAY,
    isArray: true,
    valueMethod: 'doubleArrayValue',
    expectedValue: (arr) => arr.length === 0,
    maxMethod: 'getMaxDoubleArrayPropertyValue',
    validConversions: {
      floatArrayValue: (arr) => arr.length === 0,
      longArrayValue: (arr) => arr.length === 0
    },
    invalidConversions: ['doubleValue', 'longValue', 'floatValue', 'booleanValue']
  },
  {
    name: 'EmptyLongArrayNodePropertyValues',
    instance: EmptyLongArrayNodePropertyValues.INSTANCE,
    valueType: ValueType.LONG_ARRAY,
    isArray: true,
    valueMethod: 'longArrayValue',
    expectedValue: (arr) => arr.length === 0,
    maxMethod: 'getMaxLongArrayPropertyValue',
    validConversions: {
      doubleArrayValue: (arr) => arr.length === 0,
      floatArrayValue: (arr) => arr.length === 0
    },
    invalidConversions: ['doubleValue', 'longValue', 'floatValue', 'booleanValue']
  },
  {
    name: 'EmptyFloatArrayNodePropertyValues',
    instance: EmptyFloatArrayNodePropertyValues.INSTANCE,
    valueType: ValueType.FLOAT_ARRAY,
    isArray: true,
    valueMethod: 'floatArrayValue',
    expectedValue: (arr) => arr.length === 0,
    maxMethod: 'getMaxFloatArrayPropertyValue',
    validConversions: {
      doubleArrayValue: (arr) => arr.length === 0,
      longArrayValue: (arr) => arr.length === 0
    },
    invalidConversions: ['doubleValue', 'longValue', 'floatValue', 'booleanValue']
  }
];

describe('Empty Node Property Values', () => {
  // Test common behaviors for all implementations
  emptyImplementations.forEach((impl) => {
    describe(impl.name, () => {
      it('returns correct value type', () => {
        expect(impl.instance.valueType()).toBe(impl.valueType);
      });

      it('returns 0 for node count', () => {
        expect(impl.instance.nodeCount()).toBe(0);
      });

      it('returns false for hasValue', () => {
        expect(impl.instance.hasValue(1)).toBe(false);
        expect(impl.instance.hasValue(42)).toBe(false);
      });

      it('has dimension of 1', () => {
        expect(impl.instance.dimension()).toBe(1);
      });

      it('returns undefined for max value', () => {
        expect(impl.instance[impl.maxMethod]()).toBeUndefined();
      });

      it('returns expected empty value', () => {
        const value = impl.instance[impl.valueMethod](42);
        if (typeof impl.expectedValue === 'function') {
          expect(impl.expectedValue(value)).toBe(true);
        } else {
          expect(value).toBe(impl.expectedValue);
        }
      });

      // Test conversions
      Object.entries(impl.validConversions).forEach(([method, expected]) => {
        it(`supports conversion to ${method}`, () => {
          const result = impl.instance[method](42);
          if (typeof expected === 'function') {
            expect(expected(result)).toBe(true);
          } else {
            expect(result).toBe(expected);
          }
        });
      });

      impl.invalidConversions.forEach((method) => {
        it(`throws when converting to ${method}`, () => {
          expect(() => impl.instance[method](42)).toThrow(UnsupportedOperationError);
        });
      });
    });
  });
});
