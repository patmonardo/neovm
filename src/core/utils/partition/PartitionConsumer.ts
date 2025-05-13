import { Partition } from './Partition';

/**
 * Consumer for partitions that processes each partition.
 * 
 * @typeparam P The type of partition to consume
 */
export interface PartitionConsumer<P extends Partition> {
  /**
   * Process a single partition.
   * 
   * @param partition The partition to process
   */
  consume(partition: P): void;
}