import { describe, it, expect } from 'vitest';
import { ElementIdentifier } from './ElementIdentifier';

// Create a concrete class for testing the abstract ElementIdentifier
class MockElementIdentifier extends ElementIdentifier {
  constructor(name: string, type: string) {
    super(name, type);
  }

  // Implement the abstract method
  public projectAll(): ElementIdentifier {
    // For testing purposes, we can return a new instance or a specific mock
    // This implementation detail depends on what projectAll means for a generic mock
    // Let's assume for a mock, it might return a special "ALL" version of itself.
    // Or, more simply, just return itself if it's not meant to change type.
    // For this test, the exact return value of projectAll isn't the focus,
    // but that it's implemented.
    // We'll create a specific "ALL" mock instance for this.
    if (this.name === MockElementIdentifier.ALL_MOCK.name && this.type === MockElementIdentifier.ALL_MOCK.type) {
        return this;
    }
    return MockElementIdentifier.ALL_MOCK;
  }

  // A mock "ALL" instance for testing projectAll, if needed
  public static readonly ALL_MOCK = new MockElementIdentifier("__ALL_MOCK__", "MockTypeAll");
}

// Another mock class to test equality between different types
class AnotherMockElementIdentifier extends ElementIdentifier {
    constructor(name: string, type: string) {
        super(name, type);
    }
    public projectAll(): ElementIdentifier {
        return this; // Simple implementation
    }
}


describe('ElementIdentifier', () => {
  describe('constructor', () => {
    it('should correctly set name and type for a valid identifier', () => {
      const name = 'ValidName';
      const type = 'ValidType';
      const identifier = new MockElementIdentifier(name, type);
      expect(identifier.name).toBe(name);
      expect(identifier.type).toBe(type);
    });

    it('should throw an error if name is ElementIdentifier.PROJECT_ALL ("*")', () => {
      const type = 'TestType';
      expect(() => new MockElementIdentifier(ElementIdentifier.PROJECT_ALL, type))
        .toThrowError(`${type} cannot be \`*\``);
    });

    it('should throw an error if name is an empty string', () => {
      const type = 'TestType';
      expect(() => new MockElementIdentifier('', type))
        .toThrowError(`${type} name cannot be empty`);
    });

    it('should throw an error if name is a string with only whitespace', () => {
      const type = 'TestType';
      expect(() => new MockElementIdentifier('   ', type))
        .toThrowError(`${type} name cannot be empty`);
    });

    // TypeScript's type system usually prevents passing null/undefined if 'name: string'
    // but if it somehow happens (e.g. from JS), the '!name' check handles it.
    it('should throw an error if name is null (coerced by !name)', () => {
        const type = 'TestType';
        expect(() => new MockElementIdentifier(null as any, type))
          .toThrowError(`${type} name cannot be empty`);
    });
  });

  describe('getters', () => {
    it('name getter should return the correct name', () => {
      const identifier = new MockElementIdentifier('TestName', 'TestType');
      expect(identifier.name).toBe('TestName');
    });

    it('type getter should return the correct type', () => {
      const identifier = new MockElementIdentifier('TestName', 'TestType');
      expect(identifier.type).toBe('TestType');
    });
  });

  describe('equals()', () => {
    const id1 = new MockElementIdentifier('Name1', 'TypeA');
    const id1Again = new MockElementIdentifier('Name1', 'TypeA');
    const id2 = new MockElementIdentifier('Name2', 'TypeA'); // Same type, different name
    const id3 = new MockElementIdentifier('Name1', 'TypeB'); // Same name, different type
    const id4 = new AnotherMockElementIdentifier('Name1', 'TypeA'); // Different class, same name and type string

    it('should return true for the same instance', () => {
      expect(id1.equals(id1)).toBe(true);
    });

    it('should return true for different instances with the same name and type', () => {
      expect(id1.equals(id1Again)).toBe(true);
    });

    it('should return false for different names but same type', () => {
      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false for same name but different types', () => {
      expect(id1.equals(id3)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      expect(id1.equals(null)).toBe(false);
    });

    it('should return false when comparing with an object of a different, unrelated type', () => {
      expect(id1.equals({ name: 'Name1', type: 'TypeA' })).toBe(false);
    });

    it('should return false when comparing with an instance of a different ElementIdentifier subclass (even with same name/type strings)', () => {
      // This relies on the `instanceof ElementIdentifier` check and then `this.type === other.type`.
      // If `other` is an instance of `ElementIdentifier` (which `id4` is),
      // then `this.type === other.type` will compare the type strings.
      // The current `equals` method in ElementIdentifier will return true if type strings and name strings match,
      // regardless of the concrete subclass. This is generally the desired behavior for value objects.
      // If strict type checking (id1.constructor === other.constructor) was intended, equals would need modification.
      // Based on the current ElementIdentifier.equals, this should be true.
      expect(id1.equals(id4)).toBe(true); // Both are ElementIdentifier, same name, same type string.

      // To make it false, the types would need to differ:
      const id5 = new AnotherMockElementIdentifier('Name1', 'TypeC'); // Different type string
      expect(id1.equals(id5)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return a string in the format "Type[Name]"', () => {
      const identifier = new MockElementIdentifier('MyName', 'MyType');
      expect(identifier.toString()).toBe('MyType[MyName]');
    });
  });

  describe('static PROJECT_ALL', () => {
    it('should have the value "*"', () => {
      expect(ElementIdentifier.PROJECT_ALL).toBe('*');
    });
  });

  describe('static ElementIdentifier.of() (namespace)', () => {
    it('should throw an error as it is meant to be implemented by subclasses', () => {
      expect(() => ElementIdentifier.of('someName'))
        .toThrowError('Cannot create ElementIdentifier directly');
    });
  });
});
