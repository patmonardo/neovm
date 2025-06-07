import { ElementIdentifier } from "./abstract/ElementIdentifier";

/**
 * Represents a node label in a graph.
 */
export class NodeLabel extends ElementIdentifier {
  /**
   * Represents all node labels.
   */
  public static readonly ALL_NODES: NodeLabel = new NodeLabel("__ALL__");
  private static readonly _instances = new Map<string, NodeLabel>();

  /**
   * Creates a new NodeLabel.
   *
   * @param name The label name
   */
  constructor(name: string) {
    super(name, "NodeLabel");
  }

  public projectAll(): ElementIdentifier {
    return NodeLabel.ALL_NODES;
  }

  /**
   * Creates a NodeLabel with the given name.
   *
   * @param name The label name
   */
  public static of(name: string): NodeLabel {
    if (!NodeLabel._instances.has(name)) {
      NodeLabel._instances.set(name, new NodeLabel(name));
    }
    return NodeLabel._instances.get(name)!;
  }
  /**
   * Checks if this label equals another object.
   *
   * @param other The other object
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof NodeLabel)) return false;
    return this.name() === other.name();
  }

  public hashCode(): number {
    const name = this.name();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  public toString(): string {
    return this.name();
  }
}
