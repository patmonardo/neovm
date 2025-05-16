import { describe, it, expect } from 'vitest';
import { AbstractProjections } from './AbstractProjections';
import { ElementIdentifier } from './ElementIdentifier';
import { ElementProjection } from './ElementProjection';
// We don't directly import PropertyMapping or PropertyMappings here,
// but our mocks will need to simulate their relevant interfaces.

// --- Mock Implementations ---

// 1. Mock ElementIdentifier
class MockId extends ElementIdentifier {
  constructor(name: string) {
    super(name, 'MockIdType');
  }
  // Implement abstract method from ElementIdentifier
  public projectAll(): ElementIdentifier {
    return new MockId(`${this.name}_ALL`); // Simple mock implementation
  }
}

// 2. Mock PropertyMapping (just enough for AbstractProjections.allProperties)
class MockPropMapping {
  private _key: string;
  constructor(key: string) {
    this._key = key;
  }
  propertyKey(): string {
    return this._key;
  }
}

// 3. Mock PropertyMappings (the class that ElementProjection.properties() would return)
class MockPropMappings {
  private _mappings: MockPropMapping[];
  constructor(mappings: MockPropMapping[]) {
    this._mappings = mappings;
  }
  mappings(): MockPropMapping[] { // Simulates returning a collection of property mappings
    return this._mappings;
  }
}

// 4. Mock ElementProjection
class MockProj extends ElementProjection {
  // The actual ElementProjection constructor is:
  // protected constructor(identifier: I, properties: PropertyMappings<PropertyMapping>)
  // So our MockProj needs to call super with compatible types.
  constructor(identifier: MockId, propertyMappings: MockPropMapping[]) {
    const mockMappingsInstance = new MockPropMappings(propertyMappings);
    super(identifier, mockMappingsInstance as any); // Use 'as any' if MockPropMappings isn't a perfect subtype
  }

  // Implement abstract methods from ElementProjection
  public isAllLabelsOrTypes(): boolean {
    return false; // Mock implementation
  }
  public isAllProperties(): boolean {
    return false; // Mock implementation
  }

  // ElementProjection.properties() returns the PropertyMappings instance passed to constructor.
  // ElementProjection.identifier() returns the identifier passed to constructor.
}

// 5. Concrete implementation of AbstractProjections for testing
class ConcreteProjections extends AbstractProjections<MockId, MockProj> {
  private map: Map<MockId, MockProj>;

  constructor() {
    super();
    this.map = new Map<MockId, MockProj>();
  }

  // Implement the abstract method
  public projections(): Map<MockId, MockProj> {
    return this.map;
  }

  // Helper to add projections for tests
  public addProjection(projection: MockProj): void {
    // ElementProjection has an identifier() method.
    this.map.set(projection.identifier() as MockId, projection);
  }
}

// --- Test Suite ---

describe('AbstractProjections', () => {
  let concreteProjections: ConcreteProjections;
  let id1: MockId, id2: MockId, id3: MockId;
  let proj1: MockProj, proj2: MockProj;

  beforeEach(() => {
    concreteProjections = new ConcreteProjections();

    id1 = new MockId('id1');
    id2 = new MockId('id2');
    id3 = new MockId('id3'); // Unused in some tests, for checking non-existence

    // Proj1 has properties "propA", "propB"
    proj1 = new MockProj(id1, [new MockPropMapping('propA'), new MockPropMapping('propB')]);
    // Proj2 has properties "propB", "propC"
    proj2 = new MockProj(id2, [new MockPropMapping('propB'), new MockPropMapping('propC')]);

    concreteProjections.addProjection(proj1);
    concreteProjections.addProjection(proj2);
  });

  describe('allProperties()', () => {
    it('should return a set of all unique property keys from all projections', () => {
      const properties = concreteProjections.allProperties();
      expect(properties).toBeInstanceOf(Set);
      expect(properties.size).toBe(3);
      expect(properties).toContain('propA');
      expect(properties).toContain('propB');
      expect(properties).toContain('propC');
    });

    it('should return an empty set if there are no projections', () => {
      const emptyProjections = new ConcreteProjections();
      expect(emptyProjections.allProperties().size).toBe(0);
    });

    it('should return an empty set if projections have no properties', () => {
      const emptyProjections = new ConcreteProjections();
      const noPropsId = new MockId('noPropsId');
      const projWithNoProps = new MockProj(noPropsId, []);
      emptyProjections.addProjection(projWithNoProps);
      expect(emptyProjections.allProperties().size).toBe(0);
    });

    it('should handle propertyKey being null (though our mock does not return null)', () => {
        // Test if the original code's `if (key !== null)` is hit.
        // Our MockPropMapping always returns a string, so this test is more for conceptual coverage.
        // To truly test this, MockPropMapping would need to sometimes return null.
        const projectionsWithNullKey = new ConcreteProjections();
        const idWithNullKeyProp = new MockId('idNullKey');
        const projWithNullKey = new MockProj(idWithNullKeyProp, [
            new MockPropMapping('validKey'),
            { propertyKey: () => null } as MockPropMapping // Simulate a mapping with null key
        ]);
        projectionsWithNullKey.addProjection(projWithNullKey);
        const properties = projectionsWithNullKey.allProperties();
        expect(properties.size).toBe(1);
        expect(properties).toContain('validKey');
    });
  });

  describe('allProjections()', () => {
    it('should return an array of all projection instances', () => {
      const all = concreteProjections.allProjections();
      expect(all).toBeInstanceOf(Array);
      expect(all.length).toBe(2);
      expect(all).toContain(proj1);
      expect(all).toContain(proj2);
    });

    it('should return an empty array if there are no projections', () => {
      const emptyProjections = new ConcreteProjections();
      expect(emptyProjections.allProjections().length).toBe(0);
    });
  });

  describe('containsKey()', () => {
    it('should return true if the identifier exists in the projections', () => {
      expect(concreteProjections.containsKey(id1)).toBe(true);
      expect(concreteProjections.containsKey(id2)).toBe(true);
    });

    it('should return false if the identifier does not exist', () => {
      expect(concreteProjections.containsKey(id3)).toBe(false);
    });

    it('should return false for a different instance with the same name if equals relies on instance', () => {
        // ElementIdentifier.equals compares by name and type.
        const id1Again = new MockId('id1'); // Same name & type as id1
        expect(concreteProjections.containsKey(id1Again)).toBe(true);
    });
  });

  describe('get()', () => {
    it('should return the projection for a given identifier', () => {
      expect(concreteProjections.get(id1)).toBe(proj1);
      expect(concreteProjections.get(id2)).toBe(proj2);
    });

    it('should return undefined if the identifier is not found', () => {
      expect(concreteProjections.get(id3)).toBeUndefined();
    });

    it('should return the projection for an equivalent identifier', () => {
        const id1Again = new MockId('id1');
        expect(concreteProjections.get(id1Again)).toBe(proj1);
    });
  });

  describe('size()', () => {
    it('should return the number of projections', () => {
      expect(concreteProjections.size()).toBe(2);
    });

    it('should return 0 for an empty set of projections', () => {
      const emptyProjections = new ConcreteProjections();
      expect(emptyProjections.size()).toBe(0);
    });
  });
});
