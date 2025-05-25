import { DefaultValue } from '@/api/DefaultValue';
import { IdMap, PartialIdMap } from '@/api/IdMap';
import { LongArrayNodePropertyValues, NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { HugeSparseLongArrayArray } from '@/collections/hsa/HugeSparseLongArrayArray';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { DefaultPool } from '@/core/concurrency/DefaultPool';
import { ParallelUtil } from '@/core/concurrency/ParallelUtil';
import { GdsNeo4jValueConversion } from '@/utils/GdsNeo4jValueConversion';
import { GdsValue } from '@/values/GdsValue';
import { InnerNodePropertiesBuilder } from './InnerNodePropertiesBuilder';

/**
 * Builder for long array node properties.
 *
 * This class efficiently collects long array values during graph loading
 * and builds a compact representation mapped to internal node IDs.
 */
export class LongArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  private readonly builder: HugeSparseLongArrayArray.Builder;
  private readonly defaultValue: number[];
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency
   */
  constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.defaultValue = defaultValue.longArrayValue();
    this.concurrency = concurrency;
    this.builder = HugeSparseLongArrayArray.builder(this.defaultValue);
  }

  /**
   * Sets a long array property value for a node
   */
  public set(neoNodeId: number, value: number[]): void {
    this.builder.set(neoNodeId, value);
  }

  /**
   * Sets a property value from a GdsValue
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    this.set(neoNodeId, GdsNeo4jValueConversion.getLongArray(value));
  }

  /**
   * Builds the final node property values using the provided IdMap
   */
  public build(size: number, idMap: PartialIdMap, highestOriginalId: number): NodePropertyValues {
    const propertiesByNeoIds = this.builder.build();
    const propertiesByMappedIdsBuilder = HugeSparseLongArrayArray.builder(
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

    return new LongArrayStoreNodePropertyValues(propertyValues, size);
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
 * Implementation of LongArrayNodePropertyValues using a HugeSparseLongArrayArray
 */
class LongArrayStoreNodePropertyValues implements LongArrayNodePropertyValues {
  private readonly propertyValues: HugeSparseLongArrayArray;
  private readonly size: number;

  constructor(propertyValues: HugeSparseLongArrayArray, size: number) {
    this.propertyValues = propertyValues;
    this.size = size;
  }

  longArrayValue(nodeId: number): number[] {
    return this.propertyValues.get(nodeId);
  }

  nodeCount(): number {
    return this.size;
  }
}
