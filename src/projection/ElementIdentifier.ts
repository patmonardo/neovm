/**
 * Base class for identifiers of graph elements (nodes and relationships).
 */
export abstract class ElementIdentifier {
  /**
   * The name of this element identifier.
   */
  public readonly _name: string;

  /**
   * Value used to project all elements.
   */
  protected static readonly PROJECT_ALL = "*";

  /**
   * Creates a new ElementIdentifier.
   *
   * @param name The name of the element
   * @param type The type of the element (for error messages)
   * @throws Error if name is invalid
   */
  protected constructor(name: string, type: string) {
    if (name === ElementIdentifier.PROJECT_ALL) {
      throw new Error(`${type} cannot be \`*\``);
    } else if (!name || name.trim() === "") {
      throw new Error(`${type} cannot be empty`);
    }
    this._name = name;
  }

  /**
   * Returns the name of this element identifier.
   *
   * @returns The name
   */
  public getName(): string {
    return this._name;
  }

  /**
   * Returns the name of this element identifier.
   * New method to match expected API in translated code.
   *
   * @returns The name
   */
  public name(): string {
    return this._name;
  }

  /**
   * Creates a new element identifier that projects all elements.
   *
   * @returns A new element identifier for all elements
   */
  public abstract projectAll(): ElementIdentifier;

  /**
   * Checks if this element identifier equals another object.
   *
   * @param other The object to compare with
   * @returns True if the objects are equal
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof ElementIdentifier)) return false;
    if (this.constructor !== other.constructor) return false;

    return this._name === other._name;
  }

  /**
   * Computes a hash code for this element identifier.
   *
   * @returns The hash code
   */
  public hashCode(): number {
    // Simple string hash for name
    let hash = 0;
    for (let i = 0; i < this._name.length; i++) {
      hash = (hash << 5) - hash + this._name.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Returns a string representation of this element identifier.
   *
   * @returns A string representation
   */
  public toString(): string {
    return `${this.constructor.name}{name='${this._name}'}`;
  }

  /**
   * Used by Map and Set for identity comparisons.
   */
  public valueOf(): string {
    return this._name;
  }
}

export namespace ElementIdentifier {
  /**
   * Creates an ElementIdentifier from a string name.
   * Implementation would be in subclasses.
   */
  export function of(name: string): ElementIdentifier {
    // Would be implemented by specific subclasses
    throw new Error("Cannot create ElementIdentifier directly");
  }
}
