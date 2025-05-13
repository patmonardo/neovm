import { NodeLabelTokenSet } from './NodeLabelTokenSet';
import { RecordsBatchBuffer } from './RecordsBatchBuffer';
import { Optional } from '../utils/Optional'; // Adjust path as needed

/**
 * A buffer for holding a batch of node data during the import process.
 * This includes node IDs, property references, and label tokens.
 *
 * @template PROPERTY_REF The type of the reference to property data.
 */
export class NodesBatchBuffer<PROPERTY_REF> extends RecordsBatchBuffer {
  private readonly _hasLabelInformation: boolean;
  private readonly _labelTokens: NodeLabelTokenSet[];

  /**
   * Array holding references to properties for each node.
   * Can be null if properties are not being read for this batch.
   */
  private readonly _propertyReferences: PROPERTY_REF[] | null;

  /**
   * Factory method for creating NodesBatchBuffer instances.
   * Mimics the @Builder.Factory annotation in Immutables.
   *
   * @param capacity The initial capacity of the buffer.
   * @param hasLabelInformationOpt Optional flag indicating if label information is present. Defaults to false.
   * @param readPropertyOpt Optional flag indicating if properties should be read. Defaults to false.
   * @param propertyReferenceClass This parameter is specific to Java's Array.newInstance for generics.
   *                               In TypeScript, we don't typically need the class object for array creation
   *                               if PROPERTY_REF can be null or if it's a non-primitive type.
   *                               It's kept here for completeness if a similar mechanism is needed,
   *                               but often it can be omitted in TS if PROPERTY_REF allows null/undefined.
   * @returns A new NodesBatchBuffer instance.
   */
  public static create<T>( // Renamed from nodesBatchBuffer to avoid class name conflict
    capacity: number,
    hasLabelInformationOpt: Optional<boolean>,
    readPropertyOpt: Optional<boolean>,
    // propertyReferenceClass: new (...args: any[]) => T // Example if class needed
  ): NodesBatchBuffer<T> {
    return new NodesBatchBuffer<T>(
      capacity,
      hasLabelInformationOpt.orElse(false),
      readPropertyOpt.orElse(false)
      // propertyReferenceClass // Pass if needed by constructor
    );
  }

  private constructor(
    capacity: number,
    hasLabelInformation: boolean,
    readProperty: boolean
    // propertyReferenceClass?: new (...args: any[]) => PROPERTY_REF // Optional if needed
  ) {
    super(capacity);
    this._hasLabelInformation = hasLabelInformation;

    // Initialize labelTokens with a fixed-size array.
    // In JS/TS, arrays are dynamic, but to mimic fixed-size allocation:
    this._labelTokens = new Array<NodeLabelTokenSet>(capacity);

    if (readProperty) {
      // In TypeScript, if PROPERTY_REF can be a primitive, this direct new Array<PROPERTY_REF>
      // is fine. If it's a class that needs specific construction, that's different.
      // Java's Array.newInstance is for handling generic array creation at runtime.
      // TypeScript's generic arrays are simpler at compile time.
      this._propertyReferences = new Array<PROPERTY_REF>(capacity);
    } else {
      this._propertyReferences = null;
    }
  }

  /**
   * Adds a node's data to the buffer.
   * @param nodeId The ID of the node.
   * @param propertyReference A reference to the node's properties.
   * @param labelTokens The set of label tokens for the node.
   */
  public add(nodeId: number, propertyReference: PROPERTY_REF, labelTokens: NodeLabelTokenSet): void {
    const currentIndex = this.length; // Get current length before incrementing
    if (currentIndex >= this.buffer.length) {
      // Handle buffer overflow if necessary, though Java version might throw ArrayIndexOutOfBounds
      // For simplicity, assuming capacity is managed correctly upstream or this is an error condition.
      console.warn("NodesBatchBuffer: Exceeding initial capacity. Consider resizing or error handling.");
      // throw new Error("Buffer capacity exceeded");
    }

    this.buffer[currentIndex] = nodeId;

    if (this._propertyReferences !== null) {
      this._propertyReferences[currentIndex] = propertyReference;
    }

    // The original Java code has `if (this.labelTokens != null)`, but labelTokens is never null
    // in the constructor. It's always `new NodeLabelTokenSet[capacity]`.
    // So, the check might be redundant unless there's a path where it could be nulled.
    // Assuming it's always initialized:
    this._labelTokens[currentIndex] = labelTokens;

    this.length++; // Increment length after successfully adding all parts
  }

  /**
   * @returns An array of property references for each node in the batch.
   *          Returns null if properties were not configured to be read for this batch.
   */
  public propertyReferences(): PROPERTY_REF[] | null {
    return this._propertyReferences;
  }

  /**
   * @returns True if this buffer is configured to handle label information, false otherwise.
   */
  public hasLabelInformation(): boolean {
    return this._hasLabelInformation;
  }

  /**
   * @returns An array of NodeLabelTokenSet, one for each node in the batch.
   */
  public labelTokens(): NodeLabelTokenSet[] {
    return this._labelTokens;
  }

  // Expose length from NodesBatchBuffer directly if needed, matching the interface from NodeImporter
  // public length(): number { // This would match the NodesBatchBuffer interface used in NodeImporter
  //   return super.getLength();
  // }
}
