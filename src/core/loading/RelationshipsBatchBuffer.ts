import { RecordsBatchBuffer } from './RecordsBatchBuffer';
import { RadixSort } from './RadixSort';
import { PropertyReader } from './PropertyReader'; // Assuming PropertyReader namespace is exported

export class RelationshipsBatchBuffer<PROPERTY_REF> extends RecordsBatchBuffer {
  // For relationships, the buffer is divided into 2-long blocks
  // for each relationship: source, target. Relationship and
  // property references are stored individually.
  private static readonly ENTRIES_PER_RELATIONSHIP = 2;

  private readonly relationshipReferences: number[];
  private readonly propertyReferences: PROPERTY_REF[];

  private readonly bufferCopy: number[];
  private readonly relationshipReferencesCopy: number[];
  private readonly propertyReferencesCopy: PROPERTY_REF[];
  private readonly histogram: number[];

  /**
   * Factory method for creating RelationshipsBatchBuffer instances.
   * Mimics the @Builder.Factory annotation in Immutables.
   * @param capacity The number of relationships the buffer should hold.
   * @param propertyReferenceClassInJava - In Java, this Class object is used for generic array creation.
   *                                 In TypeScript, it's often not needed if PROPERTY_REF is a reference type
   *                                 or can be null/undefined. It's kept as an optional placeholder.
   * @returns A new RelationshipsBatchBuffer instance.
   */
  public static create<T>(
    capacity: number,
    // propertyReferenceClassInJava?: new (...args: any[]) => T // Optional, usually not needed in TS
  ): RelationshipsBatchBuffer<T> {
    return new RelationshipsBatchBuffer<T>(capacity);
  }

  private constructor(
    capacity: number, // Capacity here means number of relationships
    // propertyReferenceClassInJava?: new (...args: any[]) => PROPERTY_REF // Optional
  ) {
    // super capacity is number of longs: relationships * entries_per_relationship
    super(capacity * RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP);

    this.relationshipReferences = new Array<number>(capacity).fill(0n);
    this.propertyReferences = new Array<PROPERTY_REF>(capacity); // No fill for generic array

    // Initialize copy buffers and histogram using RadixSort utilities
    this.bufferCopy = RadixSort.newCopyBigInt(this.buffer); // this.buffer is from RecordsBatchBuffer
    this.relationshipReferencesCopy = RadixSort.newCopyBigInt(this.relationshipReferences);
    this.propertyReferencesCopy = RadixSort.newCopyGeneric<PROPERTY_REF>(this.propertyReferences);
    this.histogram = RadixSort.newHistogram(this.buffer.length); // Histogram size based on super.buffer.length
  }

  /**
   * Adds a relationship (sourceId, targetId) to the buffer.
   * Property and relationship references will be undefined/default for this entry.
   * @param sourceId The ID of the source node.
   * @param targetId The ID of the target node.
   */
  public add(sourceId: number, targetId: number): void {
    const currentBufferPosition = this.length; // this.length is from RecordsBatchBuffer
    // Ensure capacity (this.buffer.length is total capacity in longs)
    if (currentBufferPosition + RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP > this.buffer.length) {
      throw new Error("RelationshipsBatchBuffer capacity exceeded.");
    }

    this.buffer[currentBufferPosition] = sourceId;
    this.buffer[currentBufferPosition + 1] = targetId;

    // Relationship and property references for this slot remain uninitialized or default
    // (e.g., 0n for relationshipReferences, undefined for propertyReferences)
    // The index for these arrays would be currentBufferPosition / ENTRIES_PER_RELATIONSHIP

    this.length += RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
  }

  /**
   * Adds a relationship with its source ID, target ID, relationship reference, and property reference.
   * @param sourceId The ID of the source node.
   * @param targetId The ID of the target node.
   * @param relationshipReference A reference for the relationship itself (e.g., its original ID).
   * @param propertyReference A reference to the properties of this relationship.
   */
  public addWithRefs(
    sourceId: number,
    targetId: number,
    relationshipReference: number,
    propertyReference: PROPERTY_REF
  ): void {
    const currentBufferPosition = this.length;
    if (currentBufferPosition + RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP > this.buffer.length) {
      throw new Error("RelationshipsBatchBuffer capacity exceeded.");
    }

    this.buffer[currentBufferPosition] = sourceId;
    this.buffer[currentBufferPosition + 1] = targetId;

    const relationshipIndex = Math.floor(currentBufferPosition / RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP);
    this.relationshipReferences[relationshipIndex] = relationshipReference;
    this.propertyReferences[relationshipIndex] = propertyReference;

    this.length += RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
  }

  /**
   * Sorts the relationships in the buffer by their source node ID and returns a View.
   * @returns A View over the sorted data.
   */
  public changeToSourceOrder(): RelationshipsBatchBuffer.View<PROPERTY_REF> {
    this.sortBySource();
    return new RelationshipsBatchBuffer.View<PROPERTY_REF>(
      this.buffer,
      this.length, // Current valid length of the buffer (number of longs)
      this.relationshipReferences,
      this.propertyReferences,
      this.bufferCopy,
      this.histogram
    );
  }

  /**
   * Sorts the relationships in the buffer by their target node ID and returns a View.
   * @returns A View over the sorted data.
   */
  public changeToTargetOrder(): RelationshipsBatchBuffer.View<PROPERTY_REF> {
    this.sortByTarget();
    return new RelationshipsBatchBuffer.View<PROPERTY_REF>(
      this.buffer,
      this.length,
      this.relationshipReferences,
      this.propertyReferences,
      this.bufferCopy,
      this.histogram
    );
  }

  private sortBySource(): void {
    RadixSort.radixSort<PROPERTY_REF>( // Pass generic type to RadixSort
      this.buffer,
      this.bufferCopy,
      this.relationshipReferences,
      this.relationshipReferencesCopy,
      this.propertyReferences,
      this.propertyReferencesCopy,
      this.histogram,
      this.length // Sort up to the current valid length
    );
  }

  private sortByTarget(): void {
    RadixSort.radixSort2<PROPERTY_REF>( // Pass generic type to RadixSort2
      this.buffer,
      this.bufferCopy,
      this.relationshipReferences,
      this.relationshipReferencesCopy,
      this.propertyReferences,
      this.propertyReferencesCopy,
      this.histogram,
      this.length // Sort up to the current valid length
    );
  }
}

// Nested View class, typically defined within the RelationshipsBatchBuffer namespace
export namespace RelationshipsBatchBuffer {
  export class View<PROPERTY_REF> implements PropertyReader.Producer<PROPERTY_REF> {
    private readonly nodePairs: number[]; // Actually this.buffer from parent
    private readonly nodePairsLength: number; // Actually this.length from parent

    private readonly _relationshipReferences: number[];
    private readonly _propertyReferences: PROPERTY_REF[];

    // These are passed along for potential reuse by consumers of the View
    private readonly _spareLongs: number[];   // bufferCopy from parent
    private readonly _spareInts: number[];    // histogram from parent

    constructor(
      nodePairs: number[],
      nodePairsLength: number,
      relationshipReferences: number[],
      propertyReferences: PROPERTY_REF[],
      spareLongs: number[],
      spareInts: number[]
    ) {
      this.nodePairs = nodePairs;
      this.nodePairsLength = nodePairsLength;
      this._relationshipReferences = relationshipReferences;
      this._propertyReferences = propertyReferences;
      this._spareLongs = spareLongs;
      this._spareInts = spareInts;
    }

    public numberOfElements(): number {
      // Number of relationships
      return this.nodePairsLength / RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
    }

    public forEach(consumer: PropertyReader.Consumer<PROPERTY_REF>): void {
      const numRels = this.numberOfElements();
      for (let i = 0; i < numRels; i++) {
        const sourceNodeIndexInBuffer = i * RelationshipsBatchBuffer.ENTRIES_PER_RELATIONSHIP;
        consumer.accept(
          i, // Index of the relationship
          this.nodePairs[sourceNodeIndexInBuffer],             // Source Node ID
          this.nodePairs[sourceNodeIndexInBuffer + 1],       // Target Node ID
          this._relationshipReferences[i],
          this._propertyReferences[i]
        );
      }
    }

    /**
     * @returns The spare histogram array passed from the parent buffer.
     */
    public spareInts(): number[] {
      return this._spareInts;
    }

    /**
     * @returns The spare long buffer (bufferCopy) passed from the parent buffer.
     */
    public spareLongs(): number[] {
      return this._spareLongs;
    }

    /**
     * @returns The primary buffer containing node pairs (source, target).
     */
    public batch(): number[] {
      return this.nodePairs;
    }

    /**
     * @returns The valid length of the primary buffer (number of long entries).
     */
    public batchLength(): number {
      return this.nodePairsLength;
    }
  }
}
