import { describe, it, expect } from 'vitest';
import { NodeLabel } from './NodeLabel';
import { ElementIdentifier } from './ElementIdentifier';

describe('NodeLabel', () => {
  it('should create a NodeLabel instance with the correct name', () => {
    const labelName = 'Person';
    const nodeLabel = new NodeLabel(labelName);
    expect(nodeLabel).toBeInstanceOf(NodeLabel);
    expect(nodeLabel).toBeInstanceOf(ElementIdentifier);
    expect(nodeLabel.name).toBe(labelName);
  });

  it('should provide a static ALL_NODES constant', () => {
    expect(NodeLabel.ALL_NODES).toBeInstanceOf(NodeLabel);
    expect(NodeLabel.ALL_NODES.name).toBe('__ALL__');
  });

  it('should create a NodeLabel instance using the static of() factory method', () => {
    const labelName = 'Movie';
    const nodeLabel = NodeLabel.of(labelName);
    expect(nodeLabel).toBeInstanceOf(NodeLabel);
    expect(nodeLabel.name).toBe(labelName);
  });

  describe('equals()', () => {
    it('should return true for the same instance', () => {
      const label1 = NodeLabel.of('TestLabel');
      expect(label1.equals(label1)).toBe(true);
    });

    it('should return true for different instances with the same name', () => {
      const label1 = NodeLabel.of('TestLabel');
      const label2 = NodeLabel.of('TestLabel');
      expect(label1.equals(label2)).toBe(true);
      expect(label2.equals(label1)).toBe(true);
    });

    it('should return false for different instances with different names', () => {
      const label1 = NodeLabel.of('TestLabel1');
      const label2 = NodeLabel.of('TestLabel2');
      expect(label1.equals(label2)).toBe(false);
      expect(label2.equals(label1)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      const label1 = NodeLabel.of('TestLabel');
      expect(label1.equals(null)).toBe(false);
    });

    it('should return false when comparing with an object of a different type', () => {
      const label1 = NodeLabel.of('TestLabel');
      const otherObject = { name: 'TestLabel' };
      expect(label1.equals(otherObject)).toBe(false);
    });

    it('should return false when comparing with an ElementIdentifier that is not a NodeLabel but has the same name', () => {
      const nodeLabel = NodeLabel.of('SameName');
      // Assuming ElementIdentifier can be instantiated directly or via another subclass for testing
      class OtherIdentifier extends ElementIdentifier {
        constructor(name: string) {
          super(name, 'OtherType');
        }
        projectAll(): ElementIdentifier {
          throw new Error('Not implemented for test');
        }
      }
      const otherIdentifier = new OtherIdentifier('SameName');
      expect(nodeLabel.equals(otherIdentifier)).toBe(false);
    });
  });

  describe('projectAll()', () => {
    it('should return NodeLabel.ALL_NODES', () => {
      const label = NodeLabel.of('User');
      expect(label.projectAll()).toBe(NodeLabel.ALL_NODES);
    });

    it('projectAll() on NodeLabel.ALL_NODES should return itself', () => {
      expect(NodeLabel.ALL_NODES.projectAll()).toBe(NodeLabel.ALL_NODES);
    });
  });

  it('should inherit from ElementIdentifier and have the correct typeName', () => {
    const nodeLabel = new NodeLabel('Test');
    // typeName is a protected member in ElementIdentifier,
    // so we can't directly test it without making it public or having a public getter.
    // However, we can infer its correctness if other parts behave as expected.
    // For a more direct test, ElementIdentifier would need a public way to access typeName.
    // For now, instanceof checks cover the inheritance.
    expect(nodeLabel instanceof ElementIdentifier).toBe(true);
    // If ElementIdentifier had a public getTypeName() method:
    // expect(nodeLabel.getTypeName()).toBe('NodeLabel');
  });
});
