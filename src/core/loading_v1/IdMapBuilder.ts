import { IdMapAllocator } from './IdMapAllocator';
import { IdMap } from '../../api/IdMap'; // Adjust path as needed
import { LabelInformation } from './LabelInformation';
import { Concurrency } from '../concurrency/Concurrency'; // Adjust path as needed

export interface IdMapBuilder {
  /**
   * Instantiate an allocator that accepts exactly `batchLength` many original ids.
   *
   * Calling `IdMapAllocator.insert()` on the returned allocator requires an array
   * of length `batchLength`.
   *
   * This method is thread-safe and intended to be called by multiple node importer threads.
   * (Note: Thread-safety considerations are different in typical Node.js environments
   * unless using worker threads.)
   *
   * @param batchLength The exact number of IDs the allocator will be prepared for.
   * @returns A non-thread-safe allocator for writing ids to the IdMap.
   *          (Note: In Node.js, if not using workers, "thread-safety" of the allocator
   *          itself is less of a concern than ensuring correct asynchronous operation
   *          if I/O is involved, or managing state if the builder is shared across
   *          async operations.)
   */
  allocate(batchLength: number): IdMapAllocator;

  /**
   * Builds the IdMap.
   *
   * @param labelInformationBuilder A builder for constructing label information associated with the IdMap.
   * @param highestNodeId The highest node ID encountered. The interpretation of this
   *                      (original vs. intermediate) depends on the specific IdMapBuilder implementation.
   *                      For example, in HighLimitIdMapBuilder, this is the highest *original* ID,
   *                      but it passes the highest *intermediate* ID to its internal builder.
   * @param concurrency Concurrency settings for the build process.
   * @returns The constructed IdMap.
   */
  build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number, // Java long maps to number
    concurrency: Concurrency
  ): IdMap;
}
