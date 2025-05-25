import { DefaultValue } from '@/api/DefaultValue';
import { IdMap, PartialIdMap } from '@/api/IdMap';
import { DoubleArrayNodePropertyValues, NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { HugeSparseDoubleArrayArray } from '@/collections/hsa/HugeSparseDoubleArrayArray';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { DefaultPool } from '@/core/concurrency/DefaultPool';
import { ParallelUtil } from '@/core/concurrency/ParallelUtil';
import { GdsNeo4jValueConversion } from '@/utils/GdsNeo4jValueConversion';
import { GdsValue } from '@/values/GdsValue';
import { InnerNodePropertiesBuilder } from './InnerNodePropertiesBuilder';

/**
 * Builder for double array node properties.
 *
 * This class efficiently collects double array values during graph loading
 * and builds a compact representation mapped to internal node IDs.
 */
export class DoubleArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  private readonly builder: HugeSparseDoubleArrayArray.Builder;
  private readonly defaultValue: number[];
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.concurrency = concurrency;
    this.defaultValue = defaultValue.doubleArrayValue();
    this.builder = HugeSparseDoubleArrayArray.builder(this.defaultValue);
  }

  /**
   * Sets a double array property value for a node
   */
  public set(neoNodeId: number, value: number[]): void {
    this.builder.set(neoNodeId, value);
  }

  /**
   * Sets a property value from a GdsValue
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    this.set(neoNodeId, GdsNeo4jValueConversion.getDoubleArray(value));
  }

  /**
   * Builds the final node property values using the provided IdMap
   */
  public build(size: number, idMap: PartialIdMap, highestOriginalId: number): NodePropertyValues {
    const propertiesByNeoIds = this.builder.build();
    const propertiesByMappedIdsBuilder = HugeSparseDoubleArrayArray.builder(
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
          if (value === null || (this.defaultValue != null &&
              this.arraysEqual(value, this.defaultValue))) {
            continue;
          }

          propertiesByMappedIdsBuilder.set(mappedId, value);
        }
      }
    });

    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    const propertyValues = propertiesByMappedIdsBuilder.build();

    return new DoubleArrayStoreNodePropertyValues(propertyValues, size);
  }

  /**
   * Helper method to check if two arrays are equal
   * (Replacement for Java's Arrays.equals)
   */
  private arraysEqual(a: number[] | null, b: number[] | null): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }

    return true;
  }
}

/**
 * Implementation of DoubleArrayNodePropertyValues using a HugeSparseDoubleArrayArray
 */
class DoubleArrayStoreNodePropertyValues implements DoubleArrayNodePropertyValues {
  private readonly propertyValues: HugeSparseDoubleArrayArray;
  private readonly size: number;

  constructor(propertyValues: HugeSparseDoubleArrayArray, size: number) {
    this.propertyValues = propertyValues;
    this.size = size;
  }

  doubleArrayValue(nodeId: number): number[] {
    return this.propertyValues.get(nodeId);
  }

  nodeCount(): number {
    return this.size;
  }
}
