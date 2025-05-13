import { Aggregation, doubleToLongBits } from './propertyReaderUtils'; // Adjust path as needed

/**
 * Namespace to group types related to PropertyReader, mimicking Java's inner interfaces/classes.
 */
export namespace PropertyReader {
  /**
   * A consumer for property data produced by a Producer.
   * It accepts individual item data along with its property reference.
   *
   * @template PROPERTY_REF The type of the reference to the raw property data for an item.
   */
  export interface Consumer<PROPERTY_REF> {
    accept(
      index: number,                  // Corresponds to the sequential index of the item being processed
      source: number,                 // Source node ID (if applicable, e.g., for relationships)
      target: number,                 // Target node ID (if applicable, e.g., for relationships)
      relationshipReference: number,  // A general reference for the item (e.g., relationship ID or index)
      propertyReference: PROPERTY_REF // The specific reference to the item's raw property data
    ): void;
  }

  /**
   * A producer of property data. It can iterate over a collection of items
   * and apply a consumer function to each.
   *
   * @template PROPERTY_REF The type of the reference to the raw property data for an item.
   */
  export interface Producer<PROPERTY_REF> {
    /**
     * @returns The total number of elements (e.g., relationships) this producer can provide properties for.
     */
    numberOfElements(): number;

    /**
     * Iterates over each element, applying the consumer function.
     * @param consumer The function to apply to each element's data.
     */
    forEach(consumer: Consumer<PROPERTY_REF>): void;
  }

  /**
   * A PropertyReader implementation that buffers properties in memory.
   * Properties can be added for specific items and property keys, and then
   * the complete set of properties is materialized when `readProperties` is called.
   *
   * @template PROPERTY_REF The type of the reference to the raw property data for an item.
   */
  export class Buffered<PROPERTY_REF> implements PropertyReader<PROPERTY_REF> {
    private readonly _buffer: number[][]; // Stores property values (as long bits)
    private readonly _propertyCount: number;
    private readonly _batchSize: number;

    constructor(batchSize: number, propertyCount: number) {
      this._propertyCount = propertyCount;
      this._batchSize = batchSize;
      this._buffer = new Array<number[]>(propertyCount);
      for (let i = 0; i < propertyCount; i++) {
        // Initialize with a default value, e.g., 0n, or handle defaults in readProperties
        this._buffer[i] = new Array<number>(batchSize).fill(0n);
      }
    }

    /**
     * Adds/sets a property value for a specific item and property key in the buffer.
     * @param relationshipId The ID or index of the item (e.g., relationship) within the batch.
     *                       This ID should be consistent with what `relationshipReference` will be
     *                       when `producer.forEach` is called in `readProperties`.
     * @param propertyKeyId The ID or index of the property key.
     * @param propertyValue The property value (as a double).
     */
    public add(relationshipId: number, propertyKeyId: number, propertyValue: number): void {
      if (propertyKeyId < 0 || propertyKeyId >= this._propertyCount) {
        throw new RangeError(
          `PropertyKeyId ${propertyKeyId} is out of bounds (0-${this._propertyCount - 1}).`
        );
      }
      if (relationshipId < 0 || relationshipId >= this._batchSize) {
        throw new RangeError(
          `RelationshipId ${relationshipId} is out of bounds (0-${this._batchSize - 1}).`
        );
      }
      this._buffer[propertyKeyId][relationshipId] = doubleToLongBits(propertyValue);
    }

    /**
     * Reads properties using the buffered data. The producer iterates over items,
     * and for each item, its `relationshipReference` is used to look up
     * pre-added properties from the buffer.
     */
    public readProperties(
      producer: PropertyReader.Producer<PROPERTY_REF>,
      propertyKeyIds: number[],        // Unused in this specific implementation
      defaultValues: number[],         // Unused in this specific implementation
      aggregations: Aggregation[],     // Unused in this specific implementation
      atLeastOnePropertyToLoad: boolean // Unused in this specific implementation
    ): number[][] {
      const numElements = producer.numberOfElements();
      const resultBuffer: number[][] = new Array<number[]>(this._propertyCount);

      for (let propertyIndex = 0; propertyIndex < this._propertyCount; propertyIndex++) {
        const bufferedPropertyRow = this._buffer[propertyIndex];
        const propertyValuesForRow: number[] = new Array<number>(numElements);

        producer.forEach((itemIndexInProducer, source, target, relationshipReference, propertyReference) => {
          // `relationshipReference` (long) from the producer is expected to be the ID
          // that was used as `relationshipId` (int) in the `add` method.
          const idForItemInBatch = Number(relationshipReference);

          if (idForItemInBatch < 0 || idForItemInBatch >= this._batchSize || idForItemInBatch >= bufferedPropertyRow.length) {
            // This case means the relationshipReference from the producer is out of bounds
            // for what was buffered. Java would throw ArrayIndexOutOfBoundsException.
            // Handle by assigning a default (e.g., 0n) or throwing.
            console.warn(
              `PropertyReader.Buffered.readProperties: RelationshipId ${idForItemInBatch} (from reference ${relationshipReference}) ` +
              `is out of bounds for buffered row (length ${bufferedPropertyRow.length}, batchSize ${this._batchSize}). ` +
              `Item index in producer: ${itemIndexInProducer}. Assigning default 0n.`
            );
            propertyValuesForRow[itemIndexInProducer] = 0n; // Default or use defaultValues[propertyIndex] if applicable
          } else {
            propertyValuesForRow[itemIndexInProducer] = bufferedPropertyRow[idForItemInBatch];
          }
        });
        resultBuffer[propertyIndex] = propertyValuesForRow;
      }
      return resultBuffer;
    }
  }

  /**
   * Creates a PropertyReader for pre-loaded properties where the `relationshipReference` itself
   * (a long value provided by the producer's consumer) is used as the property value.
   * This is typically for scenarios with a single "property" per item, often unweighted,
   * where the reference itself holds the value.
   *
   * The generic type `PROPERTY_REF` for the returned reader is `number` (mapping from Java's `Integer`),
   * but the actual `propertyReference` argument in the consumer is not used for the property value
   * in this specific implementation; `relationshipReference` (a number) is used instead.
   *
   * @returns A PropertyReader instance for pre-loaded properties.
   */
  export function preLoaded(): PropertyReader<number> { // Corresponds to PropertyReader<Integer>
    return {
      readProperties: (
        producer: PropertyReader.Producer<number>, // Producer<Integer>
        propertyKeyIds: number[],       // Unused
        defaultValues: number[],        // Unused
        aggregations: Aggregation[],    // Unused
        atLeastOnePropertyToLoad: boolean // Unused
      ): number[][] => {
        const numElements = producer.numberOfElements();
        const properties: number[] = new Array<number>(numElements);

        producer.forEach((index, source, target, relationshipReference, propertyReference_Integer) => {
          // The Java lambda uses `relationshipReference` (long) as the property value.
          // `propertyReference_Integer` (Integer) is ignored for the value itself.
          properties[index] = relationshipReference;
        });
        // Returns a 2D array where the outer array has one element (for one "property")
        return [properties];
      },
    };
  }

  /**
   * Creates a buffered PropertyReader.
   * This reader allows properties to be added incrementally for items (identified by an ID)
   * and then produces the full property matrix when `readProperties` is called.
   *
   * @template PROPERTY_REF The type of the reference to the raw property data for an item.
   * @param batchSize The expected number of items in a batch (e.g., relationships).
   * @param propertyCount The number of distinct properties to be managed.
   * @returns A new Buffered PropertyReader instance.
   */
  export function buffered<PROPERTY_REF>(batchSize: number, propertyCount: number): PropertyReader.Buffered<PROPERTY_REF> {
    return new PropertyReader.Buffered<PROPERTY_REF>(batchSize, propertyCount);
  }
}

/**
 * Interface for reading properties for a batch of items (e.g., relationships).
 *
 * @template PROPERTY_REF The type of the reference to the raw property data for an item.
 */
export interface PropertyReader<PROPERTY_REF> {
  /**
   * Reads and processes properties for a batch of items.
   *
   * @param producer A producer that can iterate over the items and their property references.
   * @param propertyKeyIds An array of internal IDs for the property keys to load.
   * @param defaultValues An array of default values (as doubles) for each property key.
   * @param aggregations An array of aggregation strategies for each property.
   * @param atLeastOnePropertyToLoad True if there is at least one valid property key ID to load.
   * @returns A 2D array where the first dimension corresponds to the property key
   *          (matching the order/index in `propertyKeyIds`, `defaultValues`, `aggregations`)
   *          and the second dimension holds the property values (as long bits, i.e., bigints)
   *          for each item processed by the producer.
   *          Example: `result[propertyIndex][itemIndex]`
   */
  readProperties(
    producer: PropertyReader.Producer<PROPERTY_REF>,
    propertyKeyIds: number[],
    defaultValues: number[],
    aggregations: Aggregation[],
    atLeastOnePropertyToLoad: boolean
  ): number[][];
}
