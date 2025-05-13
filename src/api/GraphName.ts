/**
 * Immutable representation of a graph name.
 */
export class GraphName {
  /**
   * The graph name value.
   */
  readonly value: string;
  
  /**
   * Creates a new GraphName.
   * 
   * @param value The graph name value
   */
  constructor(value: string) {
    this.value = value;
  }
  
  /**
   * Trims the incoming string and creates a GraphName.
   * 
   * @param graphNameAsString Raw graph name string to parse
   * @returns A new GraphName with the trimmed value
   */
  public static parse(graphNameAsString: string): GraphName {
    return new GraphName(graphNameAsString.trim());
  }
  
  /**
   * Returns the graph name value.
   * 
   * @returns The graph name value
   */
  public getValue(): string {
    return this.value;
  }
  
  /**
   * Returns a string representation of this graph name.
   * 
   * @returns String representation
   */
  public toString(): string {
    return this.value;
  }
  
  /**
   * Compares this graph name with another for equality.
   * 
   * @param other Object to compare with
   * @returns true if objects are equal
   */
  public equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof GraphName)) return false;
    
    return this.value === other.value;
  }
  
  /**
   * Returns a hash code for this graph name.
   * 
   * @returns Hash code
   */
  public hashCode(): number {
    return this.value.length;
  }
}