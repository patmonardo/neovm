import { HugeCursor } from './HugeCursor';

/**
 * Interface for arrays that support cursor-based traversal.
 * Provides methods to create and initialize cursors for efficient iteration.
 */
export interface HugeCursorSupport<Array> {
  /**
   * Returns the length of this array.
   * 
   * If the size is greater than zero, the highest supported index is `size() - 1`
   * 
   * The behavior is identical to calling `array.length` on arrays.
   */
  size(): number;

  /**
   * Returns a new cursor for this array. The cursor is not positioned and in an invalid state.
   *
   * To position the cursor you must call `initCursor(cursor)` or `initCursor(cursor, start, end)`.
   * Then the cursor needs to be put in a valid state by calling `cursor.next()`.
   *
   * Obtaining a cursor for an empty array (where `size()` returns `0`) is undefined and
   * might result in errors.
   */
  newCursor(): HugeCursor<Array>;

  /**
   * Resets the cursor to range from index 0 until `size()`.
   *
   * The returned cursor is not positioned and in an invalid state.
   * You must call `cursor.next()` first to position the cursor to a valid state.
   *
   * The returned cursor is the reference-same (===) one as the provided one.
   *
   * Resetting the cursor of an empty array (where `size()` returns `0`) is undefined and
   * might result in errors.
   */
  initCursor(cursor: HugeCursor<Array>): HugeCursor<Array>;

  /**
   * Resets the cursor to range from index `start` (inclusive, the first index to be contained)
   * until `end` (exclusive, the first index not to be contained).
   *
   * The returned cursor is not positioned and in an invalid state.
   * You must call `cursor.next()` first to position the cursor to a valid state.
   *
   * The returned cursor is the reference-same (===) one as the provided one.
   *
   * Resetting the cursor of an empty array (where `size()` returns `0`) is undefined and
   * might result in errors.
   */
  initCursor(cursor: HugeCursor<Array>, start: number, end: number): HugeCursor<Array>;
}

/**
 * Base implementation of HugeCursorSupport that implements the default methods
 */
export abstract class AbstractHugeCursorSupport<Array> implements HugeCursorSupport<Array> {
  abstract size(): number;
  abstract newCursor(): HugeCursor<Array>;

  initCursor(cursor: HugeCursor<Array>): HugeCursor<Array>;
  initCursor(cursor: HugeCursor<Array>, start: number, end: number): HugeCursor<Array>;
  initCursor(cursor: HugeCursor<Array>, start?: number, end?: number): HugeCursor<Array> {
    if (start === undefined || end === undefined) {
      cursor.setRange();
    } else {
      const size = this.size();
      
      if (start < 0 || start > size) {
        throw new Error(`start expected to be in [0 : ${size}] but got ${start}`);
      }
      if (end < start || end > size) {
        throw new Error(`end expected to be in [${start} : ${size}] but got ${end}`);
      }
      
      cursor.setRange(start, end);
    }
    return cursor;
  }
}