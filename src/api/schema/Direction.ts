import { Orientation } from '@/Orientation';

/**
 * Represents the direction of relationships in a graph.
 */
export enum Direction {
  /**
   * Relationships have a specific direction from source to target.
   */
  DIRECTED,

  /**
   * Relationships have no specific direction, can be traversed both ways.
   */
  UNDIRECTED
}

/**
 * Extension methods for the Direction enum.
 */
export namespace Direction {
  /**
   * Converts a Direction to its corresponding Orientation.
   *
   * @param direction The direction to convert
   * @returns The corresponding orientation
   */
  export function toOrientation(direction: Direction): Orientation {
    switch (direction) {
      case Direction.DIRECTED:
        return Orientation.NATURAL;
      case Direction.UNDIRECTED:
        return Orientation.UNDIRECTED;
      default:
        throw new Error(`Unknown direction: ${direction}`);
    }
  }

  /**
   * Creates a Direction from an Orientation.
   *
   * @param orientation The orientation to convert
   * @returns The corresponding direction
   */
  export function fromOrientation(orientation: Orientation): Direction {
    switch (orientation) {
      case Orientation.UNDIRECTED:
        return Direction.UNDIRECTED;
      case Orientation.NATURAL:
      case Orientation.REVERSE:
        return Direction.DIRECTED;
      default:
        throw new Error(`Unknown orientation: ${orientation}`);
    }
  }
}
