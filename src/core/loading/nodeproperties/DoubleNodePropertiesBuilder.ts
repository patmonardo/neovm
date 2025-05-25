import { DefaultValue } from '@/api/DefaultValue';
import { IdMap, PartialIdMap } from '@/api/IdMap';
import { DoubleNodePropertyValues, NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { HugeSparseDoubleArray } from '@/collections/hsa/HugeSparseDoubleArray';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { DefaultPool } from '@/core/concurrency/DefaultPool';
import { ParallelUtil } from '@/core/concurrency/ParallelUtil';
import { GdsNeo4jValueConversion } from '@/utils/GdsNeo4jValueConversion';
import { GdsValue } from '@/values/GdsValue';
import { InnerNodePropertiesBuilder } from './InnerNodePropertiesBuilder';

/**
 * Builder for double-typed node properties.
 *
 * This class efficiently collects double values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 */
export class DoubleNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  // Using a mutex-protected value instead of VarHandle
  private maxValue: number = Number.NEGATIVE_INFINITY;
  // For thread safety simulation
  private maxValueLock: boolean = false;

  private readonly builder: HugeSparseDoubleArray.Builder;
  private readonly defaultValue: number;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.defaultValue = defaultValue.doubleValue();
    this.concurrency = concurrency;
    this.builder = HugeSparseDoubleArray.builder(this.defaultValue);
  }

  /**
   * Sets a double property value for a node
   */
  public set(neoNodeId: number, value: number): void {
    this.builder.set(neoNodeId, value);
    this.updateMaxValue(value);
  }

  /**
   * Sets a property value from a GdsValue
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const doubleValue = GdsNeo4jValueConversion.getDoubleValue(value);
    this.set(neoNodeId, doubleValue);
  }

  /**
   * Builds the final node property values using the provided IdMap
   */
  public build(size: number, idMap: PartialIdMap, highestOriginalId: number): NodePropertyValues {
    const propertiesByNeoIds = this.builder.build();
    const propertiesByMappedIdsBuilder = HugeSparseDoubleArray.builder(
      this.defaultValue
    );

    const drainingIterator = propertiesByNeoIds.drainingIterator();

    const tasks = Array.from({ length: this.concurrency.value() }, (_, threadId) => () => {
      const batch = drainingIterator.drainingBatch();

      while (drainingIterator.next(batch)) {
        const page = batch.page;
        const offset = batch.offset;
        const end = Math.min(offset + page.length, highestOriginalId + 1) - offset;

        for (let pageIndex = 0; pageIndex < end; pageIndex++) {
          const neoId = offset + pageIndex;
          const mappedId = idMap.toMappedNodeId(neoId);

          if (mappedId === IdMap.NOT_FOUND) {
            continue;
          }

          const value = page[pageIndex];
          if (Object.is(value, this.defaultValue)) {
            continue;
          }

          propertiesByMappedIdsBuilder.set(mappedId, value);
        }
      }
    });

    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    const propertyValues = propertiesByMappedIdsBuilder.build();
    const maybeMaxValue = propertyValues.capacity() > 0
      ? { isPresent: true, value: this.maxValue } // OptionalDouble equivalent
      : { isPresent: false, value: 0 };

    return new DoubleStoreNodePropertyValues(propertyValues, size, maybeMaxValue);
  }

  /**
   * Thread-safe update of the maximum value
   */
  private updateMaxValue(value: number): void {
    // First quick check without locking
    if (this.maxValue >= value) {
      return;
    }

    // Simulate CAS loop with a basic locking mechanism
    // This is a simplified version compared to the Java VarHandle implementation
    if (!this.maxValueLock) {
      this.maxValueLock = true;
      try {
        // Re-check after acquiring lock
        // Start a simplified CAS loop
        while (this.maxValue < value) {
          const currentMax = this.maxValue;
          // In real CAS we'd do an atomic compare-and-swap here
          if (currentMax < value) {
            this.maxValue = value;
            break;
          }
        }
      } finally {
        this.maxValueLock = false;
      }
    }
  }
}

/**
 * Implementation of DoubleNodePropertyValues using a HugeSparseDoubleArray
 */
class DoubleStoreNodePropertyValues implements DoubleNodePropertyValues {
  private readonly propertyValues: HugeSparseDoubleArray;
  private readonly size: number;
  private readonly maxValue: { isPresent: boolean, value: number }; // OptionalDouble equivalent

  constructor(
    propertyValues: HugeSparseDoubleArray,
    size: number,
    maxValue: { isPresent: boolean, value: number }
  ) {
    this.propertyValues = propertyValues;
    this.size = size;
    this.maxValue = maxValue;
  }

  doubleValue(nodeId: number): number {
    return this.propertyValues.get(nodeId);
  }

  getMaxDoublePropertyValue(): { isPresent: boolean, value: number } {
    return this.maxValue;
  }

  nodeCount(): number {
    return this.size;
  }
}
