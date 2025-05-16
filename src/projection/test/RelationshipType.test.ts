import { describe, it, expect } from 'vitest';
import { RelationshipType } from './RelationshipType';
import { ElementIdentifier } from './ElementIdentifier';

describe('RelationshipType', () => {
  it('should create a RelationshipType instance with the correct name and type', () => {
    const typeNameStr = 'KNOWS';
    const relType = new RelationshipType(typeNameStr);
    expect(relType).toBeInstanceOf(RelationshipType);
    expect(relType).toBeInstanceOf(ElementIdentifier);
    expect(relType.name).toBe(typeNameStr);
    expect(relType.type).toBe('Relationship type');
  });

  it('should provide a static ALL_RELATIONSHIPS constant with name "__ALL__"', () => {
    expect(RelationshipType.ALL_RELATIONSHIPS).toBeInstanceOf(RelationshipType);
    expect(RelationshipType.ALL_RELATIONSHIPS.name).toBe('__ALL__');
    expect(RelationshipType.ALL_RELATIONSHIPS.type).toBe('Relationship type');
  });

  describe('of()', () => {
    it('should create a RelationshipType instance using the static of() factory method', () => {
      const typeNameStr = 'FOLLOWS';
      const relType = RelationshipType.of(typeNameStr);
      expect(relType).toBeInstanceOf(RelationshipType);
      expect(relType.name).toBe(typeNameStr);
      expect(relType.type).toBe('Relationship type');
    });

    it('RelationshipType.of("__ALL__") should create a new instance that equals RelationshipType.ALL_RELATIONSHIPS', () => {
      const fromOf = RelationshipType.of('__ALL__');
      expect(fromOf).toBeInstanceOf(RelationshipType);
      expect(fromOf).not.toBe(RelationshipType.ALL_RELATIONSHIPS); // Check it's a NEW instance
      expect(fromOf.equals(RelationshipType.ALL_RELATIONSHIPS)).toBe(true); // Check it's logically equal
      expect(fromOf.name).toBe('__ALL__');
    });

    it('should throw an error if name is an asterisk (ElementIdentifier.PROJECT_ALL)', () => {
        expect(() => RelationshipType.of(ElementIdentifier.PROJECT_ALL)).toThrowError('Relationship type cannot be `*`');
    });

    it('should throw an error if name is empty', () => {
        expect(() => RelationshipType.of('')).toThrowError('Relationship type name cannot be empty');
    });
  });


  describe('equals()', () => {
    it('should return true for the same instance', () => {
      const relType1 = RelationshipType.of('LIKES');
      expect(relType1.equals(relType1)).toBe(true);
    });

    it('should return true for different instances with the same name', () => {
      const relType1 = RelationshipType.of('LIKES');
      const relType2 = RelationshipType.of('LIKES');
      expect(relType1.equals(relType2)).toBe(true);
      expect(relType2.equals(relType1)).toBe(true);
    });

    it('RelationshipType.ALL_RELATIONSHIPS should equal RelationshipType.of("__ALL__")', () => {
      expect(RelationshipType.ALL_RELATIONSHIPS.equals(RelationshipType.of('__ALL__'))).toBe(true);
    });

    it('should return false for different instances with different names', () => {
      const relType1 = RelationshipType.of('LIKES');
      const relType2 = RelationshipType.of('LOVES');
      expect(relType1.equals(relType2)).toBe(false);
      expect(relType2.equals(relType1)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      const relType1 = RelationshipType.of('WORKS_WITH');
      expect(relType1.equals(null)).toBe(false);
    });

    it('should return false when comparing with an object of a different type', () => {
      const relType1 = RelationshipType.of('WORKS_WITH');
      const otherObject = { name: 'WORKS_WITH', type: 'Relationship type' };
      expect(relType1.equals(otherObject)).toBe(false);
    });

    it('should return false when comparing with an ElementIdentifier that is not a RelationshipType but has the same name', () => {
      const relType = RelationshipType.of('SameName');
      // Mock class for testing
      class OtherIdentifier extends ElementIdentifier {
        constructor(name: string) {
          super(name, 'OtherType');
        }
        projectAll(): ElementIdentifier {
          throw new Error('Not implemented for test');
        }
      }
      const otherIdentifier = new OtherIdentifier('SameName');
      expect(relType.equals(otherIdentifier)).toBe(false);
    });
  });

  describe('projectAll()', () => {
    it('should return RelationshipType.ALL_RELATIONSHIPS', () => {
      const relType = RelationshipType.of('HAS_TAG');
      expect(relType.projectAll()).toBe(RelationshipType.ALL_RELATIONSHIPS);
    });

    it('projectAll() on RelationshipType.ALL_RELATIONSHIPS should return itself', () => {
      expect(RelationshipType.ALL_RELATIONSHIPS.projectAll()).toBe(RelationshipType.ALL_RELATIONSHIPS);
    });
  });

  describe('listOf()', () => {
    it('should create an array of RelationshipTypes from an array of strings', () => {
      const typeNames = ['ACTED_IN', 'DIRECTED', 'PRODUCED'];
      const relTypes = RelationshipType.listOf(...typeNames);

      expect(relTypes).toBeInstanceOf(Array);
      expect(relTypes.length).toBe(typeNames.length);

      relTypes.forEach((relType, index) => {
        expect(relType).toBeInstanceOf(RelationshipType);
        expect(relType.name).toBe(typeNames[index]);
      });
    });

    it('should return an empty array if no arguments are provided', () => {
      const relTypes = RelationshipType.listOf();
      expect(relTypes).toEqual([]);
    });

    it('should correctly handle "__ALL__" within listOf', () => {
      const typeNames = ['FRIENDS_WITH', '__ALL__', 'COLLEAGUES_WITH'];
      const relTypes = RelationshipType.listOf(...typeNames);

      expect(relTypes.length).toBe(3);
      expect(relTypes[0].name).toBe('FRIENDS_WITH');
      expect(relTypes[1].name).toBe('__ALL__');
      expect(relTypes[1].equals(RelationshipType.ALL_RELATIONSHIPS)).toBe(true);
      expect(relTypes[1]).not.toBe(RelationshipType.ALL_RELATIONSHIPS); // It's a new instance via of()
      expect(relTypes[2].name).toBe('COLLEAGUES_WITH');
    });

    it('should throw error if any type name is an asterisk in listOf', () => {
        expect(() => RelationshipType.listOf('VALID_TYPE', ElementIdentifier.PROJECT_ALL))
            .toThrowError('Relationship type cannot be `*`');
    });
  });
});
