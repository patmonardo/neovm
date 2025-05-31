import { GdsValue } from "@/values";
import { DefaultValue } from "@/api";
import { IdMap, PartialIdMap } from "@/api";
import {
  NodePropertyValues,
  LongNodePropertyValues,
} from "@/api/properties/nodes";
import { HugeSparseLongArray } from "@/collections";
import { Concurrency } from "@/concurrency";
import { DefaultPool } from "@/concurrency";
import { ParallelUtil } from "@/concurrency";
import { GdsNeo4jValueConversion } from "@/core";
import { InnerNodePropertiesBuilder } from "./InnerNodePropertiesBuilder";

/**
 * Builder for long-typed node properties.
 *
 * This class efficiently collects long values during graph loading and
 * builds a compact representation mapped to internal node IDs.
 */
export class LongNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  // Using a mutex-protected value instead of VarHandle
  private maxValue: number = Number.MIN_SAFE_INTEGER;
  // For thread safety simulation
  private maxValueLock: boolean = false;

  private readonly builder: HugeSparseLongArray.Builder;
  private readonly defaultValue: number;
  private readonly concurrency: Concurrency;

  /**
   * Creates a new builder with the given default value and concurrency
   */
  public static of(
    defaultValue: DefaultValue,
    concurrency: Concurrency
  ): LongNodePropertiesBuilder {
    const defaultLongValue = defaultValue.longValue();
    const builder = HugeSparseLongArray.builder(defaultLongValue);
    return new LongNodePropertiesBuilder(
      builder,
      defaultLongValue,
      concurrency
    );
  }

  private constructor(
    builder: HugeSparseLongArray.Builder,
    defaultValue: number,
    concurrency: Concurrency
  ) {
    this.builder = builder;
    this.defaultValue = defaultValue;
    this.concurrency = concurrency;
  }

  /**
   * Sets a long property value for a node
   */
  public set(neoNodeId: number, value: number): void {
    this.builder.set(neoNodeId, value);
    this.updateMaxValue(value);
  }

  /**
   * Sets a property value from a GdsValue
   */
  public setValue(neoNodeId: number, value: GdsValue): void {
    const longValue = GdsNeo4jValueConversion.getLongValue(value);
    this.set(neoNodeId, longValue);
  }

  /**
   * Builds the final node property values using the provided IdMap
   */
  public build(
    size: number,
    idMap: PartialIdMap,
    highestOriginalId: number
  ): NodePropertyValues {
    const propertiesByNeoIds = this.builder.build();
    const propertiesByMappedIdsBuilder = HugeSparseLongArray.builder(
      this.defaultValue
    );

    const drainingIterator = propertiesByNeoIds.drainingIterator();

    const tasks = Array.from(
      { length: this.concurrency.value() },
      (_, threadId) => () => {
        const batch = drainingIterator.drainingBatch();

        while (drainingIterator.next(batch)) {
          const page = batch.page;
          const offset = batch.offset;
          const end =
            Math.min(offset + page.length, highestOriginalId + 1) - offset;

          for (let pageIndex = 0; pageIndex < end; pageIndex++) {
            const neoId = offset + pageIndex;
            const mappedId = idMap.toMappedNodeId(neoId);

            if (mappedId === IdMap.NOT_FOUND) {
              continue;
            }

            const value = page[pageIndex];
            if (value === this.defaultValue) {
              continue;
            }

            propertiesByMappedIdsBuilder.set(mappedId, value);
          }
        }
      }
    );

    ParallelUtil.run(tasks, DefaultPool.INSTANCE);

    const propertyValues = propertiesByMappedIdsBuilder.build();
    const maybeMaxValue =
      propertyValues.capacity() > 0
        ? { isPresent: true, value: this.maxValue } // OptionalLong equivalent
        : { isPresent: false, value: 0 };

    return new LongStoreNodePropertyValues(propertyValues, size, maybeMaxValue);
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
        if (value > this.maxValue) {
          this.maxValue = value;
        }
      } finally {
        this.maxValueLock = false;
      }
    }
  }
}

/**
 * Implementation of LongNodePropertyValues using a HugeSparseLongArray
 */
class LongStoreNodePropertyValues implements LongNodePropertyValues {
  private readonly propertyValues: HugeSparseLongArray;
  private readonly size: number;
  private readonly maxValue: { isPresent: boolean; value: number }; // OptionalLong equivalent

  constructor(
    propertyValues: HugeSparseLongArray,
    size: number,
    maxValue: { isPresent: boolean; value: number }
  ) {
    this.propertyValues = propertyValues;
    this.size = size;
    this.maxValue = maxValue;
  }

  longValue(nodeId: number): number {
    return this.propertyValues.get(nodeId);
  }

  getMaxLongPropertyValue(): { isPresent: boolean; value: number } {
    return this.maxValue;
  }

  nodeCount(): number {
    return this.size;
  }
}
