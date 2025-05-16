import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeProjection, NodeProjectionBuilder } from './NodeProjection';
import { ElementProjection } from './ElementProjection';
import { PropertyMappings } from './PropertyMappings';
import { PropertyMapping } from './PropertyMapping';
import { Aggregation } from '@/core/Aggregation';

// Simple TestNodeLabel class for testing purposes
class TestNodeLabel {
  private _name: string;
  constructor(name: string) {
    this._name = name;
  }
  name(): string {
    return this._name;
  }
}

describe('NodeProjection', () => {
  const testLabelString = 'TestLabel';
  const testNodeLabel = new TestNodeLabel(testLabelString);
  const anotherLabelString = 'AnotherLabel';

  describe('Static Members and Basic Factories', () => {
    it('LABEL_KEY should be "label"', () => {
      expect(NodeProjection.LABEL_KEY).toBe('label');
    });

    it('NodeProjection.ALL should project all labels and have default properties', () => {
      const allProjection = NodeProjection.ALL;
      expect(allProjection.label()).toBe(ElementProjection.PROJECT_ALL);
      expect(allProjection.projectAll()).toBe(true);
      expect(allProjection.properties()).toBeInstanceOf(PropertyMappings);
      expect(allProjection.properties().mappings().length).toBe(0);
    });

    it('NodeProjection.all() should be equivalent to NodeProjection.ALL', () => {
      expect(NodeProjection.all()).toBe(NodeProjection.ALL);
    });

    it('NodeProjection.of(label) should create a projection with the given label and default properties', () => {
      const projection = NodeProjection.of(testLabelString);
      expect(projection.label()).toBe(testLabelString);
      expect(projection.projectAll()).toBe(false);
      expect(projection.properties()).toBeInstanceOf(PropertyMappings);
      expect(projection.properties().mappings().length).toBe(0);
    });

    it('NodeProjection.fromString(label) should create a projection with the given label', () => {
      const projection = NodeProjection.fromString(testLabelString);
      expect(projection.label()).toBe(testLabelString);
      expect(projection.properties().mappings().length).toBe(0);
    });

    it('NodeProjection.fromString(null) should create a projection with an empty string label', () => {
      const projection = NodeProjection.fromString(null);
      expect(projection.label()).toBe(''); // As per current NodeProjection.fromString and builder logic
    });

    it('NodeProjection.builder() should return a NodeProjectionBuilder instance', () => {
      expect(NodeProjection.builder()).toBeInstanceOf(NodeProjectionBuilder);
    });
  });

  describe('NodeProjection.fromObject()', () => {
    it('should return the instance if a NodeProjection is passed', () => {
      const originalProjection = NodeProjection.of(testLabelString);
      const result = NodeProjection.fromObject(originalProjection, testNodeLabel);
      expect(result).toBe(originalProjection);
    });

    it('should parse a string label', () => {
      const projection = NodeProjection.fromObject(testLabelString, testNodeLabel);
      expect(projection.label()).toBe(testLabelString);
    });

    it('should parse a plain object (Map-like) configuration', () => {
      const config = {
        [NodeProjection.LABEL_KEY]: anotherLabelString,
        [ElementProjection.PROPERTIES_KEY]: {
          prop1: 'source1',
          prop2: { property: 'source2', defaultValue: 100 },
        },
      };
      const projection = NodeProjection.fromObject(config, testNodeLabel);
      expect(projection.label()).toBe(anotherLabelString);
      expect(projection.properties().mappings().length).toBe(2);
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.prop1.property).toBe('source1');
      expect(propsObj.prop2.property).toBe('source2');
      expect(propsObj.prop2.defaultValue).toBe(100);
    });

    it('should use default nodeLabel if label is not in object config', () => {
      const config = {
        [ElementProjection.PROPERTIES_KEY]: { prop1: 'source1' },
      };
      const projection = NodeProjection.fromObject(config, testNodeLabel);
      expect(projection.label()).toBe(testNodeLabel.name());
    });

    it('should parse a Map configuration', () => {
      const configMap = new Map<string, any>();
      configMap.set(NodeProjection.LABEL_KEY, anotherLabelString);
      configMap.set(ElementProjection.PROPERTIES_KEY, { prop1: 'source1' });

      const projection = NodeProjection.fromObject(configMap, testNodeLabel);
      expect(projection.label()).toBe(anotherLabelString);
      expect(projection.properties().mappings().length).toBe(1);
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.prop1.property).toBe('source1');
    });

    it('should handle case-insensitivity for keys in object/Map config', () => {
        const config = {
            "LaBeL": anotherLabelString, // Mixed case
            "PrOpErTiEs": { "myProp": "mySource" }
        };
        const projection = NodeProjection.fromObject(config, testNodeLabel);
        expect(projection.label()).toBe(anotherLabelString);
        expect(projection.properties().mappings().length).toBe(1);
        const propsObj = projection.properties().toObject(false);
        expect(propsObj.myProp.property).toBe("mySource");
    });


    it('should throw error for invalid config object type', () => {
      expect(() => NodeProjection.fromObject(123, testNodeLabel)).toThrowError(
        'Cannot construct a node projection out of a number'
      );
    });

    it('should throw error for invalid keys in map config via fromMap', () => {
        const mapWithInvalidKey = {
            [NodeProjection.LABEL_KEY.toLowerCase()]: testLabelString,
            "invalidkey": "someValue"
        };
        // fromMap is called by fromObject
        expect(() => NodeProjection.fromObject(mapWithInvalidKey, testNodeLabel)).toThrowError(
            `Invalid keys in node projection: invalidkey. Valid keys are: ${NodeProjection.LABEL_KEY}, ${ElementProjection.PROPERTIES_KEY}.`
        );
    });
  });

  describe('NodeProjection.fromMap()', () => {
    // fromMap is also tested via fromObject, but direct tests can be more focused.
    it('should correctly parse label and properties from a pre-processed map', () => {
      const preProcessedMap = { // Keys are already lowercase
        [NodeProjection.LABEL_KEY.toLowerCase()]: anotherLabelString,
        [ElementProjection.PROPERTIES_KEY.toLowerCase()]: {
          propA: 'sourceA',
        },
      };
      const projection = NodeProjection.fromMap(preProcessedMap, testNodeLabel);
      expect(projection.label()).toBe(anotherLabelString);
      const props = projection.properties().toObject(false);
      expect(props.propA.property).toBe('sourceA');
    });

    it('should use default nodeLabel if label key is absent in map', () => {
      const preProcessedMap = {
        [ElementProjection.PROPERTIES_KEY.toLowerCase()]: { propA: 'sourceA' },
      };
      const projection = NodeProjection.fromMap(preProcessedMap, testNodeLabel);
      expect(projection.label()).toBe(testNodeLabel.name());
    });
  });


  describe('NodeProjection Instance Methods (via factories/builder)', () => {
    let projection: NodeProjection;

    beforeEach(() => {
      // Create a projection using a factory or builder for instance method tests
      projection = NodeProjection.builder()
        .label(testLabelString)
        .addProperty({ name: 'prop1', source: 'source1', defaultValue: 'defaultVal' })
        .addProperty({ name: 'prop2', source: 'source2', aggregation: Aggregation.COUNT })
        .build();
    });

    it('label() should return the correct label', () => {
      expect(projection.label()).toBe(testLabelString);
    });

    it('properties() should return the configured PropertyMappings', () => {
      const props = projection.properties();
      expect(props).toBeInstanceOf(PropertyMappings);
      expect(props.mappings().length).toBe(2);
      const propsObj = props.toObject(true); // include aggregation for prop2
      expect(propsObj.prop1.property).toBe('source1');
      expect(propsObj.prop1.defaultValue).toBe('defaultVal');
      expect(propsObj.prop2.property).toBe('source2');
      expect(propsObj.prop2.aggregation).toBe(Aggregation.COUNT.toString());
    });

    it('projectAll() should be false for a specific label', () => {
      expect(projection.projectAll()).toBe(false);
      const allProj = NodeProjection.fromString(ElementProjection.PROJECT_ALL);
      expect(allProj.projectAll()).toBe(true);
    });

    it('includeAggregation() should return false', () => {
      // Accessing protected method via a cast for testing, or test via toObject
      expect((projection as any).includeAggregation()).toBe(false);
    });

    it('toObject() should correctly serialize the projection', () => {
      const obj = projection.toObject();
      expect(obj[NodeProjection.LABEL_KEY]).toBe(testLabelString);
      const propsPart = obj[ElementProjection.PROPERTIES_KEY];
      expect(propsPart.prop1.property).toBe('source1');
      expect(propsPart.prop2.property).toBe('source2');
      // Aggregation is not included in NodeProjection.toObject properties because includeAggregation() is false
      expect(propsPart.prop2.aggregation).toBeUndefined();
    });

    describe('withAdditionalPropertyMappings()', () => {
      it('should return a new instance with merged properties if changes occur', () => {
        const additionalMappings = PropertyMappings.fromObject({
          prop3: 'source3',
          prop1: { property: 'newSource1' }, // Override prop1
        });
        const newProjection = projection.withAdditionalPropertyMappings(additionalMappings);

        expect(newProjection).not.toBe(projection); // New instance
        expect(newProjection.label()).toBe(testLabelString);

        const newPropsObj = newProjection.properties().toObject(false);
        expect(newPropsObj.prop1.property).toBe('newSource1'); // Overridden
        expect(newPropsObj.prop2.property).toBe('source2');   // Existing
        expect(newPropsObj.prop3.property).toBe('source3');   // Added
        expect(Object.keys(newPropsObj).length).toBe(3);
      });

      it('should return the same instance if no changes to properties occur', () => {
        const sameMappings = PropertyMappings.fromObject({
            prop1: { property: 'source1', defaultValue: 'defaultVal' } // Same as original prop1 effectively
        });
        // This depends on PropertyMappings.mergeWith and PropertyMapping.equals logic
        // If mergeWith determines no actual change, it should return original PropertyMappings.
        // For this test to pass as "toBe(projection)", PropertyMappings.mergeWith must return `this`
        // if the merged result is identical to the original.
        const currentProps = projection.properties();
        const spyMergeWith = vi.spyOn(currentProps, 'mergeWith').mockReturnValueOnce(currentProps); // Force no change

        const newProjection = projection.withAdditionalPropertyMappings(PropertyMappings.of()); // Empty, or effectively no change
        expect(newProjection).toBe(projection);
        spyMergeWith.mockRestore();
      });
    });
  });

  describe('NodeProjectionBuilder', () => {
    let builder: NodeProjectionBuilder;

    beforeEach(() => {
      builder = NodeProjection.builder();
    });

    it('label() should set the label', () => {
      builder.label(testLabelString);
      const projection = builder.build();
      expect(projection.label()).toBe(testLabelString);
    });

    it('label(null) should result in an empty string label in the built projection', () => {
        builder.label(null);
        const projection = builder.build();
        expect(projection.label()).toBe('');
    });

    it('properties() should set PropertyMappings wholesale', () => {
      const customMappings = PropertyMappings.fromObject({
        customProp: 'customSource',
      });
      builder.properties(customMappings);
      const projection = builder.build();
      expect(projection.properties()).toBe(customMappings); // Should be the exact instance
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.customProp.property).toBe('customSource');
    });

    it('addProperty() should add a property mapping', () => {
      builder.label(testLabelString).addProperty({ name: 'p1', source: 's1' });
      const projection = builder.build();
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.p1.property).toBe('s1');
    });

    it('addProperties() should add multiple property mappings', () => {
      builder.addProperties(
        { name: 'p1', source: 's1' },
        { name: 'p2', source: 's2', defaultValue: 'def' }
      );
      const projection = builder.build();
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.p1.property).toBe('s1');
      expect(propsObj.p2.property).toBe('s2');
      expect(propsObj.p2.defaultValue).toBe('def');
    });

    it('addAllProperties() should add properties from an iterable', () => {
      const newProperties = [
        PropertyMapping.ofKey('pIter1'), // Assuming PropertyMapping.ofKey exists
        PropertyMapping.of('pIter2', {neoPropertyKey: 'sIter2'})
      ];
      builder.addAllProperties(newProperties);
      const projection = builder.build();
      const propsObj = projection.properties().toObject(false);
      expect(propsObj.pIter1.property).toBe('pIter1');
      expect(propsObj.pIter2.property).toBe('sIter2');
    });

    it('build() should finalize inline properties before using wholesale properties if both are used', () => {
        // 1. Add inline property
        builder.addProperty({ name: 'inlineProp', source: 'inlineSource' });
        // 2. Set wholesale properties (this should clear the effect of inlineBuilder for this build)
        const wholesaleProps = PropertyMappings.fromObject({ wholesale: "sourceW" });
        builder.properties(wholesaleProps);

        const projection = builder.build();
        // Expect only wholesale properties because builder._propertiesBuilderInternal is reset
        const propsObj = projection.properties().toObject(false);
        expect(propsObj.wholesale.property).toBe('sourceW');
        expect(propsObj.inlineProp).toBeUndefined();
    });

     it('build() should use inline properties if wholesale are set first, then inline', () => {
        // 1. Set wholesale properties
        const wholesaleProps = PropertyMappings.fromObject({ wholesale: "sourceW" });
        builder.properties(wholesaleProps);
        // 2. Add inline property (this should build upon the wholesale ones)
        builder.addProperty({ name: 'inlineProp', source: 'inlineSource' });

        const projection = builder.build();
        // Expect both, as inlineBuilder builds upon existing _properties
        const propsObj = projection.properties().toObject(false);
        expect(propsObj.wholesale.property).toBe('sourceW');
        expect(propsObj.inlineProp.property).toBe('inlineSource');
    });


    it('build() should create a projection with default empty label and properties if nothing is set', () => {
      const projection = builder.build();
      expect(projection.label()).toBe(''); // Default label in builder
      expect(projection.properties().mappings().length).toBe(0);
    });
  });
});
