import { describe, it, expect, vi } from 'vitest';
import { ElementProjection } from './ElementProjection';
import { PropertyMappings } from './PropertyMappings'; // Using the ACTUAL PropertyMappings
import { DefaultValue } from '@/api/DefaultValue';     // Using the ACTUAL DefaultValue
import { Aggregation } from '@/core/Aggregation';   // Using the ACTUAL Aggregation

// This is a CONCRETE class for testing the ABSTRACT ElementProjection.
// It is NOT a mock of an external dependency. It's a test utility.
class TestConcreteElementProjection extends ElementProjection {
  private _customProperties: PropertyMappings | null = null;
  public writtenValue: Record<string, any> | null = null;
  public shouldIncludeAggregation: boolean = false;
  public shouldProjectAll: boolean = false;

  constructor(customProperties?: PropertyMappings) {
    super(); // ElementProjection has no explicit constructor in the provided TS
    if (customProperties) {
        this._customProperties = customProperties;
    }
  }

  // Override properties() to control the PropertyMappings instance for some tests,
  // or allow it to use the base class's implementation.
  public properties(): PropertyMappings {
    if (this._customProperties) {
      return this._customProperties;
    }
    return super.properties(); // Calls the base ElementProjection.properties()
  }

  // Implement abstract methods
  public withAdditionalPropertyMappings(mappings: PropertyMappings): ElementProjection {
    // For testing, we can just return a new instance or this.
    const newInstance = new TestConcreteElementProjection(mappings);
    return newInstance;
  }

  public projectAll(): boolean {
    return this.shouldProjectAll;
  }

  protected writeToObject(value: Record<string, any>): void {
    value.specificKey = 'specificValue'; // Example write for testing
    this.writtenValue = value;
  }

  protected includeAggregation(): boolean {
    return this.shouldIncludeAggregation;
  }
}

// --- Test Suite ---

describe('ElementProjection', () => {
  describe('Static Members', () => {
    it('PROJECT_ALL should be "*"', () => {
      expect(ElementProjection.PROJECT_ALL).toBe('*');
    });

    it('PROPERTIES_KEY should be "properties"', () => {
      expect(ElementProjection.PROPERTIES_KEY).toBe('properties');
    });
  });

  describe('Static Methods', () => {
    describe('nonEmptyString()', () => {
      it('should return the string if it is non-empty', () => {
        const config = { myKey: 'validString' };
        expect(ElementProjection.nonEmptyString(config, 'myKey')).toBe('validString');
      });

      it('should throw an error if the value is an empty string', () => {
        const config = { myKey: '' };
        expect(() => ElementProjection.nonEmptyString(config, 'myKey')).toThrowError(
          "'' is not a valid value for the key 'myKey'"
        );
      });

      it('should throw an error if the value is not a string', () => {
        const config = { myKey: 123 };
        expect(() => ElementProjection.nonEmptyString(config, 'myKey')).toThrowError(
          "'123' is not a valid value for the key 'myKey'"
        );
      });

      it('should throw an error if the key does not exist (value is undefined)', () => {
        const config = {};
        expect(() => ElementProjection.nonEmptyString(config, 'myKey')).toThrowError(
          "'undefined' is not a valid value for the key 'myKey'"
        );
      });
    });

    describe('create()', () => {
      it('should create an instance using the provided constructor and parse properties with ACTUAL PropertyMappings', () => {
        const propertiesConfig = {
          propA: 'sourceA',
          propB: { property: 'sourceB', defaultValue: 42 },
        };
        const config = {
          [ElementProjection.PROPERTIES_KEY]: propertiesConfig,
          otherConfig: 'value',
        };

        // vi.fn is used to spy on the constructor function we pass in, not to mock ElementProjection itself.
        const constructorSpy = vi.fn((pm: PropertyMappings) => new TestConcreteElementProjection(pm));
        const instance = ElementProjection.create(config, constructorSpy);

        expect(constructorSpy).toHaveBeenCalledTimes(1);
        const passedPropertyMappings = constructorSpy.mock.calls[0][0];
        expect(passedPropertyMappings).toBeInstanceOf(PropertyMappings); // Verifies it's the ACTUAL PropertyMappings

        // Verify the content of the actual PropertyMappings instance.
        // This depends on your ACTUAL PropertyMappings and PropertyMapping implementations.
        const actualMappingsObject = passedPropertyMappings.toObject(false); // Assuming toObject(false) for no aggregation

        expect(actualMappingsObject.propA).toBeDefined();
        expect(actualMappingsObject.propA.property).toBe('sourceA');
        // DefaultValue.DEFAULT.get() might be null or some other defined default. Adjust if needed.
        expect(actualMappingsObject.propA.defaultValue).toEqual(DefaultValue.DEFAULT.get());

        expect(actualMappingsObject.propB).toBeDefined();
        expect(actualMappingsObject.propB.property).toBe('sourceB');
        expect(actualMappingsObject.propB.defaultValue).toBe(42);

        expect(instance).toBeInstanceOf(TestConcreteElementProjection);
      });

      it('should handle missing PROPERTIES_KEY by passing empty config to PropertyMappings.fromObject', () => {
        const config = { otherConfig: 'value' };
        const constructorSpy = vi.fn((pm: PropertyMappings) => new TestConcreteElementProjection(pm));

        ElementProjection.create(config, constructorSpy);
        const passedPropertyMappings = constructorSpy.mock.calls[0][0] as PropertyMappings;
        // Assuming an empty PropertyMappings instance has 0 mappings.
        expect(passedPropertyMappings.mappings().length).toBe(0);
      });
    });
  });

  describe('Instance Methods (using TestConcreteElementProjection)', () => {
    it('properties() should return PropertyMappings.of() by default', () => {
      const proj = new TestConcreteElementProjection(); // Does not set _customProperties
      const props = proj.properties();
      expect(props).toBeInstanceOf(PropertyMappings); // From ACTUAL PropertyMappings.of()
      expect(props.mappings().length).toBe(0);    // Assuming an empty one has 0 mappings
    });

    describe('toObject()', () => {
      it('should call writeToObject and include properties from ACTUAL properties().toObject()', () => {
        // Use ACTUAL PropertyMappings.fromObject
        const propertyMappingsConfig = {
            testProp: 'testSource',
            anotherProp: { property: 'anotherSource', defaultValue: 100 }
        };
        const actualPropsInstance = PropertyMappings.fromObject(propertyMappingsConfig);
        const proj = new TestConcreteElementProjection(actualPropsInstance);
        proj.shouldIncludeAggregation = false; // Configure our TestConcreteElementProjection

        const result = proj.toObject();

        // Check that TestConcreteElementProjection.writeToObject was effectively called
        expect(proj.writtenValue).toEqual({ specificKey: 'specificValue' });
        // Check that the result contains what writeToObject wrote
        expect(result.specificKey).toBe('specificValue');

        // This now depends on the ACTUAL output of actualPropsInstance.toObject(false)
        const actualPropertiesOutput = result[ElementProjection.PROPERTIES_KEY];

        expect(actualPropertiesOutput.testProp).toBeDefined();
        expect(actualPropertiesOutput.testProp.property).toBe('testSource');
        expect(actualPropertiesOutput.testProp.defaultValue).toEqual(DefaultValue.DEFAULT.get());


        expect(actualPropertiesOutput.anotherProp).toBeDefined();
        expect(actualPropertiesOutput.anotherProp.property).toBe('anotherSource');
        expect(actualPropertiesOutput.anotherProp.defaultValue).toBe(100);
      });

      it('should pass includeAggregation value to ACTUAL properties().toObject()', () => {
        const actualPropsInstance = PropertyMappings.fromObject({
            aggProp: { property: "sourceAgg", aggregation: "SUM" } // Assuming Aggregation.SUM.toString() is "SUM"
        });
        const proj = new TestConcreteElementProjection(actualPropsInstance);

        proj.shouldIncludeAggregation = true;
        let result = proj.toObject();
        let propsObject = result[ElementProjection.PROPERTIES_KEY];
        // Assertion depends on how your actual PropertyMappings.toObject(true) includes aggregation
        expect(propsObject.aggProp.aggregation).toBe(Aggregation.SUM.toString());


        proj.shouldIncludeAggregation = false;
        result = proj.toObject();
        propsObject = result[ElementProjection.PROPERTIES_KEY];
        // Assertion depends on how your actual PropertyMappings.toObject(false) excludes/defaults aggregation
        // If it omits aggregation when false, it would be undefined.
        // If it defaults to Aggregation.DEFAULT, check for that.
        expect(propsObject.aggProp.aggregation).toBeUndefined(); // Or Aggregation.DEFAULT.toString()
      });
    });
  });
});
