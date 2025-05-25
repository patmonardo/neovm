import { DefaultValue } from '@/api/DefaultValue';
import { IdMap } from '@/api/IdMap';
import { ValueType } from '@/api/nodeproperties/ValueType';
import { NodePropertyValues } from '@/api/properties/nodes/NodePropertyValues';
import { HugeSparseCollections } from '@/collections/hsa/HugeSparseCollections';
import { Concurrency } from '@/core/concurrency/Concurrency';
import { HighLimitIdMap } from '@/core/loading/HighLimitIdMap';
import { MemoryEstimation, MemoryEstimations } from '@/mem/MemoryEstimations';
import { GdsNoValue, GdsValue } from '@/values/GdsValue';
import { PrimitiveValues } from '@/values/primitive/PrimitiveValues';
import { formatWithLocale } from '@/utils/StringFormatting';

/**
 * Builds node properties from loaded values with support for different value types.
 *
 * This class efficiently accumulates property values during graph loading and
 * creates the final NodePropertyValues with proper mappings to internal node IDs.
 */
export class NodePropertiesFromStoreBuilder {
  private static readonly MEMORY_ESTIMATION = MemoryEstimations
    .builder(NodePropertiesFromStoreBuilder.name)
    .rangePerGraphDimension(
      "property values",
      (dimensions, concurrency) => HugeSparseCollections.estimateLong(
        dimensions.nodeCount(),
        dimensions.nodeCount()
      )
    )
    .build();

  /**
   * Returns memory estimation for property building process
   */
  public static memoryEstimation(): MemoryEstimation {
    return NodePropertiesFromStoreBuilder.MEMORY_ESTIMATION;
  }

  /**
   * Creates a new builder with specified default value and concurrency
   */
  public static of(
    defaultValue: DefaultValue,
    concurrency: Concurrency
  ): NodePropertiesFromStoreBuilder {
    return new NodePropertiesFromStoreBuilder(defaultValue, concurrency);
  }

  private readonly defaultValue: DefaultValue;
  private readonly concurrency: Concurrency;
  private readonly innerBuilder: { current: InnerNodePropertiesBuilder | null };
  private initializationLock = false;

  private constructor(defaultValue: DefaultValue, concurrency: Concurrency) {
    this.defaultValue = defaultValue;
    this.concurrency = concurrency;
    this.innerBuilder = { current: null };
  }

  /**
   * Sets a property value for a specific node ID
   */
  public set(neoNodeId: number, value: GdsValue): void {
    if (value != null && value !== GdsNoValue.NO_VALUE) {
      if (this.innerBuilder.current === null) {
        this.initializeWithType(value);
      }
      this.innerBuilder.current!.setValue(neoNodeId, value);
    }
  }

  /**
   * Builds the final node property values using the provided IdMap
   */
  public build(idMap: IdMap): NodePropertyValues {
    if (this.innerBuilder.current === null) {
      if (this.defaultValue.getObject() != null) {
        const gdsValue = PrimitiveValues.create(this.defaultValue.getObject());
        this.initializeWithType(gdsValue);
      } else {
        throw new Error("Cannot infer type of property");
      }
    }

    // For HighLimitIdMap, we need to use the rootIdMap to resolve intermediate
    // node ids correctly. The rootIdMap in that case is the mapping between
    // intermediate and mapped node ids. The imported property values are associated
    // with the intermediate node ids.
    const actualIdMap = (idMap instanceof HighLimitIdMap) ? idMap.rootIdMap() : idMap;

    return this.innerBuilder.current!.build(
      idMap.nodeCount(),
      actualIdMap,
      idMap.highestOriginalId()
    );
  }

  /**
   * Initializes the inner builder with the correct type based on the value
   * Simulates the synchronized keyword from Java
   */
  private initializeWithType(value: GdsValue): void {
    // Basic synchronization simulation (not perfect, but serves the purpose)
    if (this.innerBuilder.current === null && !this.initializationLock) {
      this.initializationLock = true;
      try {
        // Double-check pattern
        if (this.innerBuilder.current === null) {
          const newBuilder = this.newInnerBuilder(value.type());
          this.innerBuilder.current = newBuilder;
        }
      } finally {
        this.initializationLock = false;
      }
    }
  }

  /**
   * Creates a new inner builder for the specified value type
   */
  private newInnerBuilder(valueType: ValueType): InnerNodePropertiesBuilder {
    switch (valueType) {
      case ValueType.LONG:
        return LongNodePropertiesBuilder.of(this.defaultValue, this.concurrency);
      case ValueType.DOUBLE:
        return new DoubleNodePropertiesBuilder(this.defaultValue, this.concurrency);
      case ValueType.DOUBLE_ARRAY:
        return new DoubleArrayNodePropertiesBuilder(this.defaultValue, this.concurrency);
      case ValueType.FLOAT_ARRAY:
        return new FloatArrayNodePropertiesBuilder(this.defaultValue, this.concurrency);
      case ValueType.LONG_ARRAY:
        return new LongArrayNodePropertiesBuilder(this.defaultValue, this.concurrency);
      default:
        throw new Error(formatWithLocale(
          "Loading of values of type %s is currently not supported",
          valueType
        ));
    }
  }
}

/**
 * Interface for type-specific property builders
 */
interface InnerNodePropertiesBuilder {
  setValue(neoNodeId: number, value: GdsValue): void;
  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues;
}

/**
 * Builder for LONG type properties
 */
class LongNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  static of(defaultValue: DefaultValue, concurrency: Concurrency): LongNodePropertiesBuilder {
    return new LongNodePropertiesBuilder(defaultValue, concurrency);
  }

  constructor(private defaultValue: DefaultValue, private concurrency: Concurrency) {}

  setValue(neoNodeId: number, value: GdsValue): void {
    // Implementation would set the long value for the given node ID
  }

  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues {
    // Implementation would convert collected values to NodePropertyValues
    return {} as NodePropertyValues; // Placeholder for actual implementation
  }
}

/**
 * Builder for DOUBLE type properties
 */
class DoubleNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  constructor(private defaultValue: DefaultValue, private concurrency: Concurrency) {}

  setValue(neoNodeId: number, value: GdsValue): void {
    // Implementation would set the double value for the given node ID
  }

  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues {
    // Implementation would convert collected values to NodePropertyValues
    return {} as NodePropertyValues; // Placeholder for actual implementation
  }
}

/**
 * Builder for DOUBLE_ARRAY type properties
 */
class DoubleArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  constructor(private defaultValue: DefaultValue, private concurrency: Concurrency) {}

  setValue(neoNodeId: number, value: GdsValue): void {
    // Implementation would set the double array value for the given node ID
  }

  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues {
    // Implementation would convert collected values to NodePropertyValues
    return {} as NodePropertyValues; // Placeholder for actual implementation
  }
}

/**
 * Builder for FLOAT_ARRAY type properties
 */
class FloatArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  constructor(private defaultValue: DefaultValue, private concurrency: Concurrency) {}

  setValue(neoNodeId: number, value: GdsValue): void {
    // Implementation would set the float array value for the given node ID
  }

  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues {
    // Implementation would convert collected values to NodePropertyValues
    return {} as NodePropertyValues; // Placeholder for actual implementation
  }
}

/**
 * Builder for LONG_ARRAY type properties
 */
class LongArrayNodePropertiesBuilder implements InnerNodePropertiesBuilder {
  constructor(private defaultValue: DefaultValue, private concurrency: Concurrency) {}

  setValue(neoNodeId: number, value: GdsValue): void {
    // Implementation would set the long array value for the given node ID
  }

  build(nodeCount: number, actualIdMap: IdMap, highestOriginalId: number): NodePropertyValues {
    // Implementation would convert collected values to NodePropertyValues
    return {} as NodePropertyValues; // Placeholder for actual implementation
  }
}
