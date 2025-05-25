/**
 * Abstract base class for buffering records in batches during graph loading.
 *
 * This utility provides a reusable buffer for accumulating records (represented as long values)
 * until a batch is full, then processing the entire batch efficiently. This pattern reduces
 * the overhead of processing individual records and improves cache locality.
 *
 * Key features:
 * - Fixed-capacity buffer with efficient batch processing
 * - Track current length and capacity
 * - Reset functionality for buffer reuse
 * - Abstract base for specialized buffer implementations
 *
 * Common usage patterns:
 * - Node ID buffering during CSV import
 * - Relationship tuple buffering
 * - Property value accumulation
 * - Any scenario requiring batch processing of numeric data
 */
export abstract class RecordsBatchBuffer {
  /**
   * Default buffer size optimized for memory usage vs batch efficiency.
   * 100K records = ~800KB buffer (8 bytes * 100K)
   */
  public static readonly DEFAULT_BUFFER_SIZE = 100_000;

  /**
   * The underlying buffer array for storing records.
   * Protected to allow subclass access while maintaining encapsulation.
   */
  protected readonly buffer: number[];

  /**
   * Current number of records in the buffer.
   * Public for direct access in performance-critical scenarios.
   */
  public length: number = 0;

  /**
   * Create a new RecordsBatchBuffer with the specified capacity.
   *
   * @param capacity Maximum number of records this buffer can hold
   */
  protected constructor(capacity: number = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
    this.buffer = new Array(capacity);
    this.length = 0;
  }

  /**
   * Get the current number of records in the buffer.
   *
   * @returns Current buffer length
   */
  getLength(): number {
    return this.length;
  }

  /**
   * Get the maximum capacity of this buffer.
   *
   * @returns Buffer capacity
   */
  capacity(): number {
    return this.buffer.length;
  }

  /**
   * Check if the buffer is full and ready for processing.
   *
   * @returns true if buffer is at capacity, false otherwise
   */
  isFull(): boolean {
    return this.length >= this.buffer.length;
  }

  /**
   * Check if the buffer is empty.
   *
   * @returns true if buffer contains no records, false otherwise
   */
  isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Reset the buffer to empty state for reuse.
   * Note: This does not clear the underlying array, just resets the length.
   */
  reset(): void {
    this.length = 0;
  }

  /**
   * Get the underlying buffer array.
   *
   * @returns The buffer array (note: may contain data beyond current length)
   */
  batch(): number[] {
    return this.buffer;
  }

  /**
   * Get a view of the buffer containing only the valid records.
   *
   * @returns Array slice containing only records up to current length
   */
  validRecords(): number[] {
    return this.buffer.slice(0, this.length);
  }

  /**
   * Get the remaining capacity in the buffer.
   *
   * @returns Number of additional records that can be stored
   */
  remainingCapacity(): number {
    return this.buffer.length - this.length;
  }

  /**
   * Get the buffer utilization as a percentage.
   *
   * @returns Utilization percentage (0-100)
   */
  utilization(): number {
    return (this.length / this.buffer.length) * 100;
  }

  /**
   * Clear the buffer and optionally resize it.
   *
   * @param newCapacity Optional new capacity (if different from current)
   */
  clear(newCapacity?: number): void {
    if (newCapacity !== undefined && newCapacity !== this.buffer.length) {
      // Note: In TypeScript, we can't truly resize an array, so this would
      // require creating a new buffer in the subclass
      throw new Error('Buffer resizing not supported in base class');
    }
    this.reset();
  }

  /**
   * Get statistics about buffer usage for monitoring and optimization.
   */
  getStats(): BufferStats {
    return {
      capacity: this.capacity(),
      length: this.length,
      utilization: this.utilization(),
      remainingCapacity: this.remainingCapacity(),
      isEmpty: this.isEmpty(),
      isFull: this.isFull(),
      memoryUsageBytes: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate the memory usage of this buffer.
   *
   * @returns Estimated memory usage in bytes
   */
  protected estimateMemoryUsage(): number {
    // Array overhead + (capacity * 8 bytes per number in JavaScript)
    return 24 + (this.buffer.length * 8);
  }

  /**
   * Create a human-readable string representation of the buffer state.
   */
  toString(): string {
    return `RecordsBatchBuffer[${this.length}/${this.capacity()}] (${this.utilization().toFixed(1)}% full)`;
  }
}

/**
 * Concrete implementation of RecordsBatchBuffer for general-purpose record buffering.
 */
export class SimpleRecordsBatchBuffer extends RecordsBatchBuffer {

  constructor(capacity: number = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
    super(capacity);
  }

  /**
   * Add a single record to the buffer.
   *
   * @param record The record value to add
   * @returns true if record was added, false if buffer is full
   */
  add(record: number): boolean {
    if (this.isFull()) {
      return false;
    }

    this.buffer[this.length++] = record;
    return true;
  }

  /**
   * Add a single record to the buffer, throwing an error if full.
   *
   * @param record The record value to add
   * @throws Error if buffer is full
   */
  addOrThrow(record: number): void {
    if (!this.add(record)) {
      throw new Error(`Buffer is full (capacity: ${this.capacity()})`);
    }
  }

  /**
   * Add multiple records to the buffer.
   *
   * @param records Array of records to add
   * @returns Number of records actually added
   */
  addAll(records: number[]): number {
    let added = 0;
    for (const record of records) {
      if (!this.add(record)) {
        break;
      }
      added++;
    }
    return added;
  }

  /**
   * Try to add multiple records, throwing an error if they don't all fit.
   *
   * @param records Array of records to add
   * @throws Error if not all records can be added
   */
  addAllOrThrow(records: number[]): void {
    if (this.remainingCapacity() < records.length) {
      throw new Error(`Insufficient capacity: need ${records.length}, have ${this.remainingCapacity()}`);
    }

    const added = this.addAll(records);
    if (added !== records.length) {
      throw new Error(`Failed to add all records: added ${added}/${records.length}`);
    }
  }

  /**
   * Get the record at a specific index.
   *
   * @param index Index of the record to retrieve
   * @returns The record value
   * @throws Error if index is out of bounds
   */
  get(index: number): number {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} out of bounds [0, ${this.length})`);
    }
    return this.buffer[index];
  }

  /**
   * Set the record at a specific index.
   *
   * @param index Index of the record to set
   * @param value New record value
   * @throws Error if index is out of bounds
   */
  set(index: number, value: number): void {
    if (index < 0 || index >= this.length) {
      throw new Error(`Index ${index} out of bounds [0, ${this.length})`);
    }
    this.buffer[index] = value;
  }

  /**
   * Create a new SimpleRecordsBatchBuffer with default capacity.
   */
  static create(): SimpleRecordsBatchBuffer {
    return new SimpleRecordsBatchBuffer();
  }

  /**
   * Create a new SimpleRecordsBatchBuffer with specified capacity.
   */
  static withCapacity(capacity: number): SimpleRecordsBatchBuffer {
    return new SimpleRecordsBatchBuffer(capacity);
  }
}

/**
 * Specialized buffer for node ID accumulation during graph loading.
 */
export class NodeIdBuffer extends SimpleRecordsBatchBuffer {

  constructor(capacity: number = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
    super(capacity);
  }

  /**
   * Add a node ID to the buffer.
   *
   * @param nodeId The node ID to add
   * @returns true if added successfully, false if buffer is full
   */
  addNodeId(nodeId: number): boolean {
    return this.add(nodeId);
  }

  /**
   * Get all node IDs currently in the buffer.
   *
   * @returns Array of node IDs
   */
  getNodeIds(): number[] {
    return this.validRecords();
  }

  /**
   * Process all node IDs in the buffer with a callback function.
   *
   * @param processor Function to process each node ID
   */
  processNodeIds(processor: (nodeId: number, index: number) => void): void {
    for (let i = 0; i < this.length; i++) {
      processor(this.buffer[i], i);
    }
  }

  static forNodes(capacity?: number): NodeIdBuffer {
    return new NodeIdBuffer(capacity);
  }
}

/**
 * Specialized buffer for relationship data (source, target, type) triplets.
 * Stores relationships as [sourceId, targetId, typeId] sequences.
 */
export class RelationshipBuffer extends RecordsBatchBuffer {
  private static readonly FIELDS_PER_RELATIONSHIP = 3;

  constructor(capacity: number = RecordsBatchBuffer.DEFAULT_BUFFER_SIZE) {
    // Ensure capacity is multiple of 3 for relationship triplets
    const adjustedCapacity = Math.floor(capacity / RelationshipBuffer.FIELDS_PER_RELATIONSHIP) * RelationshipBuffer.FIELDS_PER_RELATIONSHIP;
    super(adjustedCapacity);
  }

  /**
   * Add a relationship to the buffer.
   *
   * @param sourceId Source node ID
   * @param targetId Target node ID
   * @param typeId Relationship type ID
   * @returns true if added successfully, false if buffer is full
   */
  addRelationship(sourceId: number, targetId: number, typeId: number): boolean {
    if (this.remainingCapacity() < RelationshipBuffer.FIELDS_PER_RELATIONSHIP) {
      return false;
    }

    this.buffer[this.length++] = sourceId;
    this.buffer[this.length++] = targetId;
    this.buffer[this.length++] = typeId;
    return true;
  }

  /**
   * Get the number of complete relationships in the buffer.
   *
   * @returns Number of relationships
   */
  relationshipCount(): number {
    return Math.floor(this.length / RelationshipBuffer.FIELDS_PER_RELATIONSHIP);
  }

  /**
   * Get a specific relationship from the buffer.
   *
   * @param index Relationship index (not array index)
   * @returns Relationship tuple [sourceId, targetId, typeId]
   */
  getRelationship(index: number): [number, number, number] {
    const relationshipCount = this.relationshipCount();
    if (index < 0 || index >= relationshipCount) {
      throw new Error(`Relationship index ${index} out of bounds [0, ${relationshipCount})`);
    }

    const arrayIndex = index * RelationshipBuffer.FIELDS_PER_RELATIONSHIP;
    return [
      this.buffer[arrayIndex],
      this.buffer[arrayIndex + 1],
      this.buffer[arrayIndex + 2]
    ];
  }

  /**
   * Process all relationships in the buffer.
   *
   * @param processor Function to process each relationship
   */
  processRelationships(processor: (sourceId: number, targetId: number, typeId: number, index: number) => void): void {
    const relationshipCount = this.relationshipCount();
    for (let i = 0; i < relationshipCount; i++) {
      const [sourceId, targetId, typeId] = this.getRelationship(i);
      processor(sourceId, targetId, typeId, i);
    }
  }

  /**
   * Check if the buffer can accommodate another relationship.
   */
  canAddRelationship(): boolean {
    return this.remainingCapacity() >= RelationshipBuffer.FIELDS_PER_RELATIONSHIP;
  }

  static forRelationships(capacity?: number): RelationshipBuffer {
    return new RelationshipBuffer(capacity);
  }
}

/**
 * Statistics about buffer usage.
 */
export interface BufferStats {
  capacity: number;
  length: number;
  utilization: number;
  remainingCapacity: number;
  isEmpty: boolean;
  isFull: boolean;
  memoryUsageBytes: number;
}
