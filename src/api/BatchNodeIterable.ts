import { PrimitiveIterator } from "@/collections/primitive/PrimitiveIterator";
import { PrimitiveLongIterable } from "@/collections/primitive/PrimitiveLongIterable";

/**
 * Interface for iterating over node IDs in batches.
 */
export interface BatchNodeIterable {
  /**
   * @returns A collection of iterables over every node, partitioned by
   *          the given batch size. Each iterable in the collection
   *          represents one batch.
   */
  batchIterables(batchSize: number): PrimitiveLongIterable[];
}

/**
 * Namespace containing helper classes for BatchNodeIterable,
 * mirroring the GDS structure where IdIterable and IdIterator are nested.
 */
export namespace BatchNodeIterable {
  /**
   * An iterable representing a single batch of IDs.
   * Implements PrimitiveLongIterable (the NeoVM interface).
   * This is the NeoVM equivalent of GDS's BatchNodeIterable.IdIterable.
   */
  export class IdIterable implements PrimitiveLongIterable {
    // Implements the NeoVM interface
    private readonly start: number;
    private readonly length: number;

    constructor(start: number, length: number) {
      // Takes start and length
      this.start = start;
      this.length = length;
    }

    iterator(): PrimitiveIterator.OfLong {
      return new IdIterator(this.start, this.length);
    }
  }
  /**
   * An iterator for a range of IDs, used by BatchNodeIterable.IdIterable.
   * Implements the OfLong interface.
   * This is the NeoVM equivalent of GDS's BatchNodeIterable.IdIterator.
   */
  export class IdIterator implements PrimitiveIterator.OfLong {
    private current: number;
    private readonly limit: number; // Exclusive upper bound

    constructor(start: number = 0, length: number) {
      // Takes start and length
      this.current = start;
      this.limit = start + length;
    }

    hasNext(): boolean {
      return this.current < this.limit;
    }

    nextLong(): number {
      if (!this.hasNext()) {
        throw new Error("No more elements in BatchNodeIterable.IdIterator");
      }
      return this.current++;
    }

    next(): IteratorResult<number, undefined> {
      if (!this.hasNext()) {
        throw new Error("No more elements in BatchNodeIterable.IdIterator");
      }
      return {
        value: this.nextLong(),
        done: false,
      };
    }
    [Symbol.iterator](): Iterator<number> {
      return this;
    }
  }
}
