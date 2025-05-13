import { Orientation } from "@/Orientation";
import { Direction } from "./schema/Direction";

/**
 * Graph characteristics describe certain capabilities of the graph.
 *
 * Algorithms define the graph characteristics that they require
 * for correct execution. The execution framework can use both the
 * graph and the required characteristics to check if the algorithm
 * can be run on the given graph.
 */
export class GraphCharacteristics {
  // Bit flags for different characteristics
  public static readonly DIRECTED = 1;
  public static readonly UNDIRECTED = 1 << 1;
  public static readonly INVERSE_INDEXED = 1 << 2;

  // Static properties initialized immediately with proper instances
  public static readonly ALL: GraphCharacteristics = new GraphCharacteristics(
    GraphCharacteristics.DIRECTED |
    GraphCharacteristics.UNDIRECTED |
    GraphCharacteristics.INVERSE_INDEXED
  );

  public static readonly NONE: GraphCharacteristics = new GraphCharacteristics(0);

  /**
   * Creates a new builder for GraphCharacteristics.
   *
   * @returns A new builder instance
   */
  public static builder(): Builder {
    return new Builder();
  }

  // We use a single int value to store the characteristics.
  // Each bit represents a characteristic. Setting/Getting
  // a characteristic is performed by bit-wise Or/And.
  private readonly characteristics: number;

  /**
   * Creates a new GraphCharacteristics instance.
   * Use the builder to create instances.
   *
   * @param characteristics Bit flags for characteristics
   */
  constructor(characteristics: number) {
    this.characteristics = characteristics;
  }

  /**
   * Checks if this graph has directed capabilities.
   *
   * @returns true if the graph supports directed traversal
   */
  public isDirected(): boolean {
    return (
      (this.characteristicsValue() & GraphCharacteristics.DIRECTED) ===
      GraphCharacteristics.DIRECTED
    );
  }

  /**
   * Checks if this graph has undirected capabilities.
   *
   * @returns true if the graph supports undirected traversal
   */
  public isUndirected(): boolean {
    return (
      (this.characteristicsValue() & GraphCharacteristics.UNDIRECTED) ===
      GraphCharacteristics.UNDIRECTED
    );
  }

  /**
   * Checks if this graph has inverse indexing capabilities.
   *
   * @returns true if the graph supports inverse index lookups
   */
  public isInverseIndexed(): boolean {
    return (
      (this.characteristicsValue() & GraphCharacteristics.INVERSE_INDEXED) ===
      GraphCharacteristics.INVERSE_INDEXED
    );
  }

  /**
   * Intersects the characteristics with the given one and returns a new characteristics instance.
   * The resulting object will contain only those characteristics that are present in both inputs.
   *
   * @param other the characteristics to intersect with
   * @returns a new GraphCharacteristics object that contains the shared characteristics
   */
  public intersect(other: GraphCharacteristics): GraphCharacteristics {
    return new GraphCharacteristics(
      this.characteristics & other.characteristics
    );
  }

  /**
   * Returns the raw characteristics value.
   *
   * @returns Characteristics bit flags
   */
  private characteristicsValue(): number {
    return this.characteristics;
  }

  /**
   * Returns a string representation of this object.
   *
   * @returns String representation
   */
  public toString(): string {
    return `GraphCharacteristics{isDirected=${this.isDirected()}, isUndirected=${this.isUndirected()}, isInverseIndexed=${this.isInverseIndexed()}}`;
  }

  /**
   * Compares this object with another for equality.
   *
   * @param o Object to compare with
   * @returns true if objects are equal
   */
  public equals(o: unknown): boolean {
    if (this === o) return true;
    if (!(o instanceof GraphCharacteristics)) return false;

    const that = o as GraphCharacteristics;
    return this.characteristics === that.characteristics;
  }

  /**
   * Returns a hash code for this object.
   *
   * @returns Hash code
   */
  public hashCode(): number {
    return this.characteristics;
  }
}

/**
 * Builder for creating GraphCharacteristics instances.
 */
export class Builder {
  private characteristics = 0;

  /**
   * Adds directed capability.
   *
   * @returns This builder for chaining
   */
  public directed(): Builder {
    this.characteristics |= GraphCharacteristics.DIRECTED;
    return this;
  }

  /**
   * Adds undirected capability.
   *
   * @returns This builder for chaining
   */
  public undirected(): Builder {
    this.characteristics |= GraphCharacteristics.UNDIRECTED;
    return this;
  }

  /**
   * Adds inverse indexed capability.
   *
   * @returns This builder for chaining
   */
  public inverseIndexed(): Builder {
    this.characteristics |= GraphCharacteristics.INVERSE_INDEXED;
    return this;
  }

  /**
   * Adds capabilities based on the given orientation.
   *
   * @param orientation The orientation to apply
   * @returns This builder for chaining
   */
  public withOrientation(orientation: Orientation): Builder {
    return this.withDirection(Direction.fromOrientation(orientation));
  }

  /**
   * Adds capabilities based on the given direction.
   *
   * @param direction The direction to apply
   * @returns This builder for chaining
   */
  public withDirection(direction: Direction): Builder {
    switch (direction) {
      case Direction.DIRECTED:
        return this.directed();
      case Direction.UNDIRECTED:
        return this.undirected();
      default:
        throw new Error(`Unexpected direction: ${direction}`);
    }
  }

  /**
   * Creates a new GraphCharacteristics instance.
   *
   * @returns The built GraphCharacteristics
   */
  public build(): GraphCharacteristics {
    return new GraphCharacteristics(this.characteristics);
  }
}
