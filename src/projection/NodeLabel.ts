import { ElementIdentifier } from './abstract/ElementIdentifier';

/**
 * Represents a node label in a graph.
 */
export class NodeLabel extends ElementIdentifier {
  /**
   * Represents all node labels.
   */
  public static readonly ALL_NODES: NodeLabel = new NodeLabel('__ALL__');

  /**
   * Creates a new NodeLabel.
   *
   * @param name The label name
   */
  constructor(name: string) {
    super(name, 'NodeLabel');
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
    return new NodeLabel(name);
  }

  /**
   * Checks if this label equals another object.
   *
   * @param other The other object
   */
  public equals(other: any): boolean {
    if (this === other) return true;
    if (!(other instanceof NodeLabel)) return false;
    return this.name === other.name;
  }
}
