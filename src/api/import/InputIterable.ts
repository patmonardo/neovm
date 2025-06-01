import { InputIterator } from './InputIterator';

/**
 * INPUT ITERABLE - ITERATOR FACTORY
 *
 * Iterable that returns InputIterator instances.
 * Simple factory pattern for creating thread-safe iterators.
 */

export interface InputIterable {
  /**
   * Create a new InputIterator instance.
   * Each call should return a fresh iterator for thread safety.
   */
  iterator(): InputIterator;
}
