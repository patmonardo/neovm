import { Direction } from '@/api/schema/Direction';

/**
 * Utility class for manipulating raw values through bit operations.
 * Provides methods for combining and extracting integer components.
 */
export class RawValues {
  /**
   * Shifts head into the most significant 4 bytes of the long
   * and places the tail in the least significant bytes.
   *
   * @param head an arbitrary int value
   * @param tail an arbitrary int value
   * @returns combination of head and tail as a number
   */
  public static combineIntInt(head: number, tail: number): number {
    return Number((BigInt(head) << 32n) | (BigInt(tail) & 0xFFFFFFFFn));
  }

  /**
   * Combines two integers based on the direction.
   * For INCOMING direction, it swaps head and tail.
   *
   * @param direction relationship direction
   * @param head first int value
   * @param tail second int value
   * @returns combination of head and tail based on direction
   */
  public static combineIntIntWithDirection(
    direction: Direction,
    head: number,
    tail: number
  ): number {
    if (direction === Direction.DIRECTED) {
      return this.combineIntInt(tail, head);
    }
    return this.combineIntInt(head, tail);
  }

  /**
   * Gets the head value from a combined value.
   *
   * @param combinedValue a value built of 2 ints
   * @returns the most significant 4 bytes as int
   */
  public static getHead(combinedValue: number): number {
    return Number(BigInt(combinedValue) >> 32n);
  }

  /**
   * Gets the tail value from a combined value.
   *
   * @param combinedValue a value built of 2 ints
   * @returns the least significant 4 bytes as int
   */
  public static getTail(combinedValue: number): number {
    return Number(BigInt(combinedValue) & 0xFFFFFFFFn);
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}
