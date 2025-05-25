import { NodeLabel } from '@/gds';

/**
 * Interface representing a token that contains node label information.
 * Provides validation, access, and streaming capabilities for node labels.
 */
export interface NodeLabelToken {
  /**
   * @returns true if the provided label information could not be mapped to an internal type
   *          because it was provided as a wrong type.
   */
  isInvalid(): boolean;

  /**
   * @returns true if the provided label information does not actually contain any labels or
   *          if no label information was provided at all.
   */
  isEmpty(): boolean;

  /**
   * @returns the number of labels in this token.
   */
  size(): number;

  /**
   * Get the NodeLabel at the specified index.
   * @param index The index of the label to retrieve
   * @returns The NodeLabel at the given index
   * @throws Error if index is out of bounds
   */
  get(index: number): NodeLabel;

  /**
   * @returns an array of string representations of the labels.
   */
  getStrings(): string[];

  /**
   * @returns an iterable of NodeLabels represented by this token.
   */
  nodeLabels(): Iterable<NodeLabel>;
}

/**
 * Implementation for empty node label tokens.
 */
export class EmptyNodeLabelToken implements NodeLabelToken {
  private static readonly INSTANCE = new EmptyNodeLabelToken();

  private constructor() {}

  static getInstance(): EmptyNodeLabelToken {
    return EmptyNodeLabelToken.INSTANCE;
  }

  isInvalid(): boolean {
    return false;
  }

  isEmpty(): boolean {
    return true;
  }

  size(): number {
    return 0;
  }

  get(index: number): NodeLabel {
    throw new Error(`Cannot access label at index ${index} on empty token`);
  }

  getStrings(): string[] {
    return [];
  }

  *nodeLabels(): Iterable<NodeLabel> {
    // Empty generator - yields nothing
  }

  toString(): string {
    return 'EmptyNodeLabelToken';
  }

  equals(other: any): boolean {
    return other instanceof EmptyNodeLabelToken;
  }

  hashCode(): number {
    return 0;
  }
}

/**
 * Implementation for invalid node label tokens (wrong type provided).
 */
export class InvalidNodeLabelToken implements NodeLabelToken {
  private static readonly INSTANCE = new InvalidNodeLabelToken();

  private constructor() {}

  static getInstance(): InvalidNodeLabelToken {
    return InvalidNodeLabelToken.INSTANCE;
  }

  isInvalid(): boolean {
    return true;
  }

  isEmpty(): boolean {
    return false; // Invalid is different from empty
  }

  size(): number {
    return 0;
  }

  get(index: number): NodeLabel {
    throw new Error(`Cannot access label at index ${index} on invalid token`);
  }

  getStrings(): string[] {
    return [];
  }

  *nodeLabels(): Iterable<NodeLabel> {
    // Empty generator - yields nothing
  }

  toString(): string {
    return 'InvalidNodeLabelToken';
  }

  equals(other: any): boolean {
    return other instanceof InvalidNodeLabelToken;
  }

  hashCode(): number {
    return -1;
  }
}

/**
 * Implementation for node label tokens containing actual labels.
 */
export class NodeLabelArrayToken implements NodeLabelToken {
  private readonly labels: NodeLabel[];

  constructor(labels: NodeLabel[]) {
    this.labels = [...labels]; // Defensive copy
  }

  isInvalid(): boolean {
    return false;
  }

  isEmpty(): boolean {
    return this.labels.length === 0;
  }

  size(): number {
    return this.labels.length;
  }

  get(index: number): NodeLabel {
    if (index < 0 || index >= this.labels.length) {
      throw new Error(`Index ${index} out of bounds for token with ${this.labels.length} labels`);
    }
    return this.labels[index];
  }

  getStrings(): string[] {
    return this.labels.map(label => label.name);
  }

  *nodeLabels(): Iterable<NodeLabel> {
    for (const label of this.labels) {
      yield label;
    }
  }

  toString(): string {
    return `NodeLabelArrayToken[${this.getStrings().join(', ')}]`;
  }

  equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof NodeLabelArrayToken)) return false;

    if (this.labels.length !== other.labels.length) return false;

    for (let i = 0; i < this.labels.length; i++) {
      if (!this.labels[i].equals(other.labels[i])) {
        return false;
      }
    }

    return true;
  }

  hashCode(): number {
    let hash = 1;
    for (const label of this.labels) {
      hash = hash * 31 + label.hashCode();
    }
    return hash >>> 0; // Ensure positive
  }
}

/**
 * Utility functions for creating NodeLabelToken instances.
 */
export class NodeLabelTokens {
  private static readonly EMPTY = EmptyNodeLabelToken.getInstance();
  private static readonly INVALID = InvalidNodeLabelToken.getInstance();

  /**
   * Create an empty node label token.
   */
  static empty(): NodeLabelToken {
    return NodeLabelTokens.EMPTY;
  }

  /**
   * Create an invalid node label token.
   */
  static invalid(): NodeLabelToken {
    return NodeLabelTokens.INVALID;
  }

  /**
   * Create a token from a single NodeLabel.
   */
  static ofNodeLabel(nodeLabel: NodeLabel): NodeLabelToken {
    return new NodeLabelArrayToken([nodeLabel]);
  }

  /**
   * Create a token from multiple NodeLabels.
   */
  static ofNodeLabels(...nodeLabels: NodeLabel[]): NodeLabelToken {
    if (nodeLabels.length === 0) {
      return NodeLabelTokens.empty();
    }
    return new NodeLabelArrayToken(nodeLabels);
  }

  /**
   * Create a token from string label names.
   */
  static ofStrings(...labelNames: string[]): NodeLabelToken {
    if (labelNames.length === 0) {
      return NodeLabelTokens.empty();
    }

    const nodeLabels = labelNames.map(name => NodeLabel.of(name));
    return new NodeLabelArrayToken(nodeLabels);
  }

  /**
   * Create a token from an array of strings, filtering out empty strings.
   */
  static ofStringArray(labelNames: string[]): NodeLabelToken {
    const validNames = labelNames.filter(name => name && name.trim().length > 0);
    return NodeLabelTokens.ofStrings(...validNames);
  }

  /**
   * Create a token from any input, with validation.
   */
  static of(input: any): NodeLabelToken {
    if (input == null || input === undefined) {
      return NodeLabelTokens.empty();
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      return trimmed.length === 0 ? NodeLabelTokens.empty() : NodeLabelTokens.ofStrings(trimmed);
    }

    if (Array.isArray(input)) {
      if (input.length === 0) {
        return NodeLabelTokens.empty();
      }

      // Check if all elements are strings
      if (input.every(item => typeof item === 'string')) {
        return NodeLabelTokens.ofStringArray(input as string[]);
      }

      // Check if all elements are NodeLabels
      if (input.every(item => item && typeof item.name === 'string')) {
        return new NodeLabelArrayToken(input as NodeLabel[]);
      }

      // Mixed or invalid types
      return NodeLabelTokens.invalid();
    }

    if (input && typeof input.name === 'string') {
      // Single NodeLabel
      return NodeLabelTokens.ofNodeLabel(input as NodeLabel);
    }

    // Invalid input type
    return NodeLabelTokens.invalid();
  }

  /**
   * Check if two tokens are equivalent.
   */
  static equals(token1: NodeLabelToken, token2: NodeLabelToken): boolean {
    if (token1 === token2) return true;

    if (token1.isInvalid() !== token2.isInvalid()) return false;
    if (token1.isEmpty() !== token2.isEmpty()) return false;
    if (token1.size() !== token2.size()) return false;

    for (let i = 0; i < token1.size(); i++) {
      if (!token1.get(i).equals(token2.get(i))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a set of unique labels from multiple tokens.
   */
  static union(...tokens: NodeLabelToken[]): NodeLabelToken {
    const uniqueLabels = new Set<string>();
    const nodeLabels: NodeLabel[] = [];

    for (const token of tokens) {
      if (token.isInvalid()) {
        return NodeLabelTokens.invalid();
      }

      for (const label of token.nodeLabels()) {
        if (!uniqueLabels.has(label.name)) {
          uniqueLabels.add(label.name);
          nodeLabels.push(label);
        }
      }
    }

    return nodeLabels.length === 0 ? NodeLabelTokens.empty() : new NodeLabelArrayToken(nodeLabels);
  }

  /**
   * Create intersection of labels from multiple tokens.
   */
  static intersection(...tokens: NodeLabelToken[]): NodeLabelToken {
    if (tokens.length === 0) {
      return NodeLabelTokens.empty();
    }

    if (tokens.some(token => token.isInvalid())) {
      return NodeLabelTokens.invalid();
    }

    if (tokens.some(token => token.isEmpty())) {
      return NodeLabelTokens.empty();
    }

    // Start with labels from first token
    const commonLabels: NodeLabel[] = [];
    for (const label of tokens[0].nodeLabels()) {
      // Check if this label exists in all other tokens
      const isCommon = tokens.slice(1).every(token => {
        for (const otherLabel of token.nodeLabels()) {
          if (label.equals(otherLabel)) {
            return true;
          }
        }
        return false;
      });

      if (isCommon) {
        commonLabels.push(label);
      }
    }

    return commonLabels.length === 0 ? NodeLabelTokens.empty() : new NodeLabelArrayToken(commonLabels);
  }
}
