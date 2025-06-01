/**
 * NODE LABEL TOKENS - POLYMORPHIC LABEL CONTAINER
 *
 * This system handles the conversion of various input types into standardized
 * NodeLabel collections. It's the first stage in the token conversion pipeline:
 *
 * Input Types → NodeLabelTokens → NodeLabel[] → Integer Tokens
 *
 * SUPPORTED INPUT TYPES:
 * - Single string: "Person"
 * - Single NodeLabel: NodeLabel.of("Person")
 * - String arrays: ["Person", "Customer"]
 * - NodeLabel arrays: [NodeLabel.of("Person"), NodeLabel.of("Customer")]
 * - Lists of strings or NodeLabels
 * - null/undefined (becomes Missing)
 * - Invalid types (becomes Invalid)
 *
 * POLYMORPHIC DESIGN:
 * Uses polymorphic classes instead of enums for better TypeScript ergonomics.
 * Each input type gets its own specialized class with optimized implementations.
 */

import { NodeLabel } from '@/projection';
import { formatWithLocale } from '@/utils';
import { NodeLabelToken, ValidNodeLabelToken } from './NodeLabelToken';
export { NodeLabelToken, ValidNodeLabelToken } from './NodeLabelToken';

/**
 * Factory class for creating NodeLabelToken instances from various input types.
 *
 * USAGE PATTERNS:
 * - NodeLabelTokens.of(input) - throws on invalid input
 * - NodeLabelTokens.ofNullable(input) - returns Invalid token for bad input
 * - NodeLabelTokens.ofStrings("Person", "Customer") - type-safe string input
 * - NodeLabelTokens.ofNodeLabels(...labels) - type-safe NodeLabel input
 */
export class NodeLabelTokens {
  /**
   * Create a NodeLabelToken from any supported input type.
   * Throws an error if the input cannot be converted to valid labels.
   *
   * @param nodeLabels Input to convert (string, array, list, etc.)
   * @returns Valid NodeLabelToken
   * @throws Error if input type is not supported
   */
  static of(nodeLabels: any): NodeLabelToken {
    const token = this.ofNullable(nodeLabels);
    if (token.isInvalid()) {
      throw new Error(
        formatWithLocale(
          "Could not represent a value of type[%s] as nodeLabels: %s",
          nodeLabels?.constructor?.name ?? 'null',
          String(nodeLabels)
        )
      );
    }
    return token;
  }

  /**
   * Create a NodeLabelToken from any input, returning Invalid for unsupported types.
   * This is the main conversion logic that handles all supported input types.
   *
   * @param nodeLabels Input to convert
   * @returns NodeLabelToken (possibly Invalid for unsupported input)
   */
  static ofNullable(nodeLabels: any): NodeLabelToken {
    // Handle null/undefined
    if (nodeLabels == null) {
      return this.missing();
    }

    // Handle NodeLabel arrays
    if (Array.isArray(nodeLabels) && nodeLabels.every(item => item instanceof NodeLabel)) {
      return this.ofNodeLabels(...nodeLabels);
    }

    // Handle string arrays
    if (Array.isArray(nodeLabels) && nodeLabels.every(item => typeof item === 'string')) {
      return this.ofStrings(...nodeLabels);
    }

    // Handle mixed arrays (attempt conversion)
    if (Array.isArray(nodeLabels)) {
      return this.ofList(nodeLabels);
    }

    // Handle single values
    return this.ofSingleton(nodeLabels);
  }

  /** Create a token representing missing/null labels */
  static missing(): NodeLabelToken {
    return new Missing();
  }

  /** Create a token representing invalid/unparseable input */
  static invalid(): NodeLabelToken {
    return new Invalid();
  }

  /** Create a token representing an empty label set */
  static empty(): NodeLabelToken {
    return new Empty();
  }

  /** Create a token from NodeLabel objects */
  static ofNodeLabels(...nodeLabels: NodeLabel[]): NodeLabelToken {
    if (nodeLabels.length === 0) return this.empty();
    if (nodeLabels.length === 1) return new Singleton(nodeLabels[0]);
    return new ArrayToken(nodeLabels, (label: NodeLabel) => label);
  }

  /** Create a token from string labels */
  static ofStrings(...nodeLabelStrings: string[]): NodeLabelToken {
    if (nodeLabelStrings.length === 0) return this.empty();
    if (nodeLabelStrings.length === 1) return new Singleton(this.labelOf(nodeLabelStrings[0]));
    return new ArrayToken(nodeLabelStrings, this.labelOf);
  }

  /** Create a token from strings with additional static labels */
  static ofStringsWithStatic(staticLabels: NodeLabel[], ...nodeLabelStrings: string[]): NodeLabelToken {
    return new ArrayWithStatic(nodeLabelStrings, staticLabels, this.labelOf);
  }

  /** Convert string to NodeLabel */
  static labelOf(label: string): NodeLabel {
    return NodeLabel.of(label);
  }

  /** Handle array/list input */
  private static ofList(nodeLabels: any[]): NodeLabelToken {
    if (nodeLabels.length === 0) {
      return this.empty();
    }

    if (nodeLabels.length === 1) {
      return this.ofSingleton(nodeLabels[0]);
    }

    const firstItem = nodeLabels[0];

    if (firstItem instanceof NodeLabel) {
      return new ListToken(nodeLabels as NodeLabel[], (label: NodeLabel) => label);
    }

    if (typeof firstItem === 'string') {
      return new ListToken(nodeLabels as string[], this.labelOf);
    }

    return this.invalid();
  }

  /** Handle single value input */
  private static ofSingleton(nodeLabel: any): NodeLabelToken {
    if (nodeLabel instanceof NodeLabel) {
      return new Singleton(nodeLabel);
    }

    if (typeof nodeLabel === 'string') {
      return new Singleton(this.labelOf(nodeLabel));
    }

    return this.invalid();
  }
}

// IMPLEMENTATION CLASSES

/** Represents missing/null input */
class Missing implements NodeLabelToken {
  isEmpty(): boolean { return true; }
  isInvalid(): boolean { return false; }
  size(): number { return 0; }

  get(index: number): NodeLabel {
    throw new Error('No such element - Missing token is empty');
  }

  getStrings(): string[] { return []; }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    // Empty iterator
  }
}

/** Represents invalid/unparseable input */
class Invalid implements NodeLabelToken {
  isEmpty(): boolean { return true; }
  isInvalid(): boolean { return true; }
  size(): number { return 0; }

  get(index: number): NodeLabel {
    throw new Error('No such element - Invalid token');
  }

  getStrings(): string[] { return []; }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    // Empty iterator
  }
}

/** Represents empty label set */
class Empty implements ValidNodeLabelToken {
  isEmpty(): boolean { return true; }
  isInvalid(): false { return false; }
  size(): number { return 0; }

  get(index: number): NodeLabel {
    throw new Error('No such element - Empty token');
  }

  getStrings(): string[] { return []; }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    // Empty iterator
  }
}

/** Handles array-based storage with conversion function */
class ArrayToken<T> implements ValidNodeLabelToken {
  constructor(
    private readonly nodeLabels: readonly T[],
    private readonly toNodeLabel: (item: T) => NodeLabel
  ) {}

  isEmpty(): boolean { return this.nodeLabels.length === 0; }
  isInvalid(): false { return false; }
  size(): number { return this.nodeLabels.length; }

  get(index: number): NodeLabel {
    if (index < 0 || index >= this.nodeLabels.length) {
      throw new Error(`Index ${index} out of bounds for size ${this.nodeLabels.length}`);
    }
    return this.toNodeLabel(this.nodeLabels[index]);
  }

  getStrings(): string[] {
    return this.nodeLabels.map(item => this.toNodeLabel(item).name());
  }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    for (const item of this.nodeLabels) {
      yield this.toNodeLabel(item);
    }
  }
}

/** Handles array with additional static labels */
class ArrayWithStatic<T> implements ValidNodeLabelToken {
  constructor(
    private readonly nodeLabels: readonly T[],
    private readonly staticLabels: readonly NodeLabel[],
    private readonly toNodeLabel: (item: T) => NodeLabel
  ) {}

  isEmpty(): boolean {
    return this.nodeLabels.length === 0 && this.staticLabels.length === 0;
  }

  isInvalid(): false { return false; }

  size(): number {
    return this.nodeLabels.length + this.staticLabels.length;
  }

  get(index: number): NodeLabel {
    if (index < 0 || index >= this.size()) {
      throw new Error(`Index ${index} out of bounds for size ${this.size()}`);
    }

    return index < this.nodeLabels.length
      ? this.toNodeLabel(this.nodeLabels[index])
      : this.staticLabels[index - this.nodeLabels.length];
  }

  getStrings(): string[] {
    const dynamicStrings = this.nodeLabels.map(item => this.toNodeLabel(item).name());
    const staticStrings = this.staticLabels.map(label => label.name());
    return [...dynamicStrings, ...staticStrings];
  }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    for (const item of this.nodeLabels) {
      yield this.toNodeLabel(item);
    }
    for (const label of this.staticLabels) {
      yield label;
    }
  }
}

/** Handles List-based storage */
class ListToken<T> implements ValidNodeLabelToken {
  constructor(
    private readonly nodeLabels: readonly T[],
    private readonly toNodeLabel: (item: T) => NodeLabel
  ) {}

  isEmpty(): boolean { return this.nodeLabels.length === 0; }
  isInvalid(): false { return false; }
  size(): number { return this.nodeLabels.length; }

  get(index: number): NodeLabel {
    if (index < 0 || index >= this.nodeLabels.length) {
      throw new Error(`Index ${index} out of bounds for size ${this.nodeLabels.length}`);
    }
    return this.toNodeLabel(this.nodeLabels[index]);
  }

  getStrings(): string[] {
    return this.nodeLabels.map(item => this.toNodeLabel(item).name());
  }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    for (const item of this.nodeLabels) {
      yield this.toNodeLabel(item);
    }
  }
}

/** Handles single NodeLabel storage */
class Singleton implements ValidNodeLabelToken {
  constructor(private readonly item: NodeLabel) {}

  isEmpty(): boolean { return false; }
  isInvalid(): false { return false; }
  size(): number { return 1; }

  get(index: number): NodeLabel {
    if (index !== 0) {
      throw new Error(`Index ${index} out of bounds for singleton`);
    }
    return this.item;
  }

  getStrings(): string[] {
    return [this.item.name()];
  }

  *[Symbol.iterator](): Iterator<NodeLabel> {
    yield this.item;
  }
}
