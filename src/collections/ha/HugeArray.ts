import { HugeCursor } from "../cursor/HugeCursor";
import { HugeCursorSupport } from "../cursor/HugeCursorSupport";

/**
 * Abstract implementation of a "huge" array that can hold more elements than
 * JavaScript's array size limits by using paging techniques.
 */
export abstract class HugeArray<
  ArrayType extends ArrayLike<any>,
  BoxType,
  Self extends HugeArray<ArrayType, BoxType, any>
> implements HugeCursorSupport<ArrayType>
{
  /**
   * Copies the content of this array into the target array.
   */
  public abstract copyTo(dest: Self, length: number): void;

  /**
   * Creates a copy of the given array.
   */
  public abstract copyOf(newLength: number): Self;

  /**
   * Returns the length of this array.
   */
  public abstract size(): number;

  /**
   * @returns the amount of memory used by the instance of this array, in bytes.
   */
  public abstract sizeOf(): number;

  /**
   * Destroys the data, allowing the underlying storage arrays to be collected as garbage.
   * The array is unusable after calling this method.
   *
   * @returns the amount of memory freed, in bytes.
   */
  public abstract release(): number;

  /**
   * @returns the value at the given index
   * @throws Error if the index is not within size()
   */
  public abstract boxedGet(index: number): BoxType;

  /**
   * Sets the value at the given index to the given value.
   *
   * @throws Error if the index is not within size()
   */
  public abstract boxedSet(index: number, value: BoxType): void;

  /**
   * Set all elements using the provided generator function to compute each element.
   */
  public abstract boxedSetAll(gen: (index: number) => BoxType): void;

  /**
   * Assigns the specified value to each element.
   */
  public abstract boxedFill(value: BoxType): void;

  /**
   * @returns the contents of this array as a flat JavaScript array.
   * @throws Error if the array is too large
   */
  public abstract toArray(): ArrayType;

  /**
   * Creates a new cursor for this array
   */
  public abstract newCursor(): HugeCursor<ArrayType>;

  /**
   * Initializes the provided cursor
   */
  public abstract initCursor(
    cursor: HugeCursor<ArrayType>,
    start?: number,
    end?: number
  ): HugeCursor<ArrayType>;

  /**
   * Copies data from source into this array, starting from sliceStart up until sliceEnd.
   * @returns the number of entries copied
   */
  public copyFromArrayIntoSlice(
    source: ArrayType,
    sliceStart: number,
    sliceEnd: number
  ): number {
    let sourceIndex = 0;
    const cursor = this.initCursor(this.newCursor(), sliceStart, sliceEnd);
    try {
      const sourceLength = source.length;
      while (cursor.next() && sourceIndex < sourceLength) {
        const copyLength = Math.min(
          cursor.limit - cursor.offset,
          sourceLength - sourceIndex
        );

        // Copy from source to cursor array
        for (let i = 0; i < copyLength; i++) {
          // @ts-ignore - Accessing array elements dynamically
          cursor.array[cursor.offset + i] = source[sourceIndex + i];
        }

        sourceIndex += copyLength;
      }
    } finally {
      cursor.close();
    }
    return sourceIndex;
  }

  public toString(): string {
    if (this.size() === 0) {
      return "[]";
    }

    const sb: string[] = ["["];
    const cursor = this.initCursor(this.newCursor());
    try {
      while (cursor.next()) {
        const array = cursor.array;
        for (let i = cursor.offset; i < cursor.limit; ++i) {
          // @ts-ignore - Accessing array elements dynamically
          sb.push(String(array[i]), ", ");
        }
      }
    } finally {
      cursor.close();
    }

    if (sb.length > 1) {
      sb.pop(); // Remove last ", "
    }
    sb.push("]");
    return sb.join("");
  }

  /**
   * Dumps the content of this huge array to a regular JavaScript array
   */
  protected dumpToArray<T>(componentType: new (length: number) => T): T {
    const fullSize = this.size();
    if (fullSize > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        `array with ${fullSize} elements does not fit into a JavaScript array`
      );
    }

    const size = fullSize;
    const result = new componentType(size);
    let pos = 0;

    const cursor = this.initCursor(this.newCursor());
    try {
      while (cursor.next()) {
        const array = cursor.array;
        const length = cursor.limit - cursor.offset;

        // Copy from cursor array to result
        for (let i = 0; i < length; i++) {
          // @ts-ignore - Accessing array elements dynamically
          result[pos + i] = array[cursor.offset + i];
        }

        pos += length;
      }
    } finally {
      cursor.close();
    }

    return result;
  }
}
