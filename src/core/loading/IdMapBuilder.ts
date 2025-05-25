import { IdMap } from '@/api';
import { Concurrency } from '@/concurrency';
import { IdMapAllocator } from './IdMapAllocator';
import { LabelInformation } from './LabelInformation';

/**
 * Interface for building ID maps during graph loading.
 *
 * Provides thread-safe allocation of ID mapping space and final construction
 * of the IdMap with label information integration. This is the main factory
 * for creating ID mapping structures during the loading pipeline.
 */
export interface IdMapBuilder {
  /**
   * Instantiate an allocator that accepts exactly `batchLength` many original IDs.
   *
   * Calling `IdMapAllocator.insert(nodeIds)` on the returned allocator requires
   * an array of length `batchLength`.
   *
   * This method is thread-safe and intended to be called by multiple node
   * importer threads during concurrent loading operations.
   *
   * @param batchLength The exact number of node IDs this allocator will handle
   * @returns A non-thread-safe allocator for writing IDs to the IdMap
   */
  allocate(batchLength: number): IdMapAllocator;

  /**
   * Build the final IdMap with integrated label information.
   *
   * Constructs the complete ID mapping structure using the accumulated
   * node data and label information from the loading process.
   *
   * @param labelInformationBuilder Builder containing label-to-node associations
   * @param highestNodeId The highest node ID encountered during loading
   * @param concurrency Concurrency configuration for parallel construction
   * @returns The constructed IdMap ready for graph queries
   */
  build(
    labelInformationBuilder: LabelInformation.Builder,
    highestNodeId: number,
    concurrency: Concurrency
  ): IdMap;
}
