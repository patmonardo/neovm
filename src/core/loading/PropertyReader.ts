import { Aggregation } from '@/core';

/**
 * Interface for reading relationship properties during batch import.
 * Handles property loading, buffering, and aggregation for relationship data.
 */
export interface PropertyReader<PROPERTY_REF> {
  /**
   * Load the relationship properties for the given batch of relationships.
   * Relationships are represented as arrays from the RelationshipsBatchBuffer.
   *
   * @param producer                 A producer that can produce a number of properties
   * @param propertyKeyIds           property key ids to load
   * @param defaultValues            default weight for each property key
   * @param aggregations             the aggregation for each property
   * @param atLeastOnePropertyToLoad true if there is at least one valid property key (not -1)
   * @returns Array of property values per relationship property id
   */
  readProperties(
    producer: PropertyReader.Producer<PROPERTY_REF>,
    propertyKeyIds: number[],
    defaultValues: number[],
    aggregations: Aggregation[],
    atLeastOnePropertyToLoad: boolean
  ): number[][];
}

export namespace PropertyReader {
  /**
   * Consumer interface for processing individual property entries.
   */
  export interface Consumer<PROPERTY_REF> {
    (
      index: number,
      source: number,
      target: number,
      relationshipReference: number,
      propertyReference: PROPERTY_REF
    ): void;
  }

  /**
   * Producer interface for generating property data.
   */
  export interface Producer<PROPERTY_REF> {
    /**
     * Get the number of elements this producer will generate.
     */
    numberOfElements(): number;

    /**
     * Iterate over all elements and call the consumer for each.
     */
    forEach(consumer: Consumer<PROPERTY_REF>): void;
  }

  /**
   * Create a pre-loaded property reader that uses relationship references as property values.
   * This is used when properties are embedded directly in the relationship data.
   */
  export function preLoaded(): PropertyReader<number> {
    return {
      readProperties: (
        producer: Producer<number>,
        propertyKeyIds: number[],
        defaultValues: number[],
        aggregations: Aggregation[],
        atLeastOnePropertyToLoad: boolean
      ): number[][] => {
        const properties = new Array<number>(producer.numberOfElements());

        producer.forEach((index, source, target, relationshipReference, propertyReference) => {
          properties[index] = relationshipReference;
        });

        return [properties];
      }
    };
  }

  /**
   * Create a buffered property reader for handling multiple properties.
   */
  export function buffered<PROPERTY_REF>(batchSize: number, propertyCount: number): Buffered<PROPERTY_REF> {
    return new Buffered<PROPERTY_REF>(batchSize, propertyCount);
  }

  /**
   * Buffered property reader implementation.
   * Stores properties in memory during batch processing.
   */
  export class Buffered<PROPERTY_REF> implements PropertyReader<PROPERTY_REF> {
    private readonly buffer: number[][];
    private readonly propertyCount: number;

    constructor(batchSize: number, propertyCount: number) {
      this.propertyCount = propertyCount;
      this.buffer = Array.from({ length: propertyCount }, () =>
        new Array<number>(batchSize).fill(0)
      );
    }

    /**
     * Add a property value to the buffer.
     *
     * @param relationshipId The relationship ID within the current batch
     * @param propertyKeyId  The property key ID (index)
     * @param property       The property value
     */
    add(relationshipId: number, propertyKeyId: number, property: number): void {
      // Convert double to long bits representation (equivalent to Java's Double.doubleToLongBits)
      this.buffer[propertyKeyId][relationshipId] = this.doubleToLongBits(property);
    }

    readProperties(
      producer: Producer<PROPERTY_REF>,
      propertyKeyIds: number[],
      defaultValues: number[],
      aggregations: Aggregation[],
      atLeastOnePropertyToLoad: boolean
    ): number[][] {
      const resultBuffer: number[][] = Array.from({ length: this.propertyCount }, () =>
        new Array<number>(producer.numberOfElements())
      );

      for (let propertyIndex = 0; propertyIndex < this.propertyCount; propertyIndex++) {
        const buffered = this.buffer[propertyIndex];
        const propertyValues = new Array<number>(producer.numberOfElements());

        producer.forEach((index, source, target, relationshipReference, propertyReference) => {
          const relationshipId = relationshipReference;
          // Fill consecutively indexed in the same order as relationships
          // are stored in the batch
          propertyValues[index] = buffered[relationshipId];
        });

        resultBuffer[propertyIndex] = propertyValues;
      }

      return resultBuffer;
    }

    /**
     * Get current buffer statistics.
     */
    getBufferStats(): BufferStats {
      const totalCapacity = this.buffer.reduce((sum, arr) => sum + arr.length, 0);
      const memoryUsage = totalCapacity * 8; // 8 bytes per number (double precision)

      return {
        propertyCount: this.propertyCount,
        batchSize: this.buffer[0]?.length || 0,
        totalCapacity,
        memoryUsageBytes: memoryUsage,
        memoryUsageMB: memoryUsage / (1024 * 1024)
      };
    }

    /**
     * Clear the buffer for reuse.
     */
    clear(): void {
      for (const propertyBuffer of this.buffer) {
        propertyBuffer.fill(0);
      }
    }

    /**
     * Convert double to long bits (equivalent to Java's Double.doubleToLongBits).
     */
    private doubleToLongBits(value: number): number {
      const buffer = new ArrayBuffer(8);
      const floatView = new Float64Array(buffer);
      const intView = new Uint32Array(buffer);

      floatView[0] = value;

      // Combine the two 32-bit parts into a single number
      // Note: JavaScript numbers are 64-bit floats, so we may lose precision
      // for very large integers, but this preserves the bit pattern for most cases
      return intView[0] + (intView[1] * 0x100000000);
    }

    /**
     * Convert long bits back to double (equivalent to Java's Double.longBitsToDouble).
     */
    private longBitsToDouble(bits: number): number {
      const buffer = new ArrayBuffer(8);
      const intView = new Uint32Array(buffer);
      const floatView = new Float64Array(buffer);

      intView[0] = bits & 0xFFFFFFFF;
      intView[1] = Math.floor(bits / 0x100000000);

      return floatView[0];
    }
  }
}

/**
 * Factory for creating property readers with common configurations.
 */
export class PropertyReaderFactory {
  /**
   * Create a property reader for single property relationships.
   */
  static singleProperty(): PropertyReader<number> {
    return PropertyReader.preLoaded();
  }

  /**
   * Create a property reader for multiple properties with known batch size.
   */
  static multipleProperties(batchSize: number, propertyCount: number): PropertyReader.Buffered<any> {
    return PropertyReader.buffered(batchSize, propertyCount);
  }

  /**
   * Create a property reader optimized for large batches.
   */
  static largeBatch(batchSize: number, propertyCount: number): PropertyReader.Buffered<any> {
    if (batchSize > 10000) {
      console.warn(`Large batch size (${batchSize}) may consume significant memory`);
    }
    return PropertyReader.buffered(batchSize, propertyCount);
  }

  /**
   * Create a property reader based on the relationship characteristics.
   */
  static forRelationshipType(
    hasProperties: boolean,
    batchSize: number,
    propertyCount: number = 0
  ): PropertyReader<any> {
    if (!hasProperties || propertyCount === 0) {
      return this.singleProperty();
    } else {
      return this.multipleProperties(batchSize, propertyCount);
    }
  }
}

/**
 * Buffer statistics interface.
 */
export interface BufferStats {
  propertyCount: number;
  batchSize: number;
  totalCapacity: number;
  memoryUsageBytes: number;
  memoryUsageMB: number;
}
