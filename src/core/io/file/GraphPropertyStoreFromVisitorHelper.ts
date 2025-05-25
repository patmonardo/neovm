import { ValueType } from '@/api/ValueType';
import {
  DoubleArrayGraphPropertyValues,
  DoubleGraphPropertyValues,
  FloatArrayGraphPropertyValues,
  GraphProperty,
  GraphPropertyStore,
  GraphPropertyValues,
  LongArrayGraphPropertyValues,
  LongGraphPropertyValues
} from '@/api/properties/graph';
import { PropertySchema } from '@/api/schema/PropertySchema';
import { GraphStoreGraphPropertyVisitor } from '@/core/io/GraphStoreGraphPropertyVisitor';

/**
 * Helper class for creating GraphPropertyStore from visitor data.
 * Handles the conversion of streamed property data into typed property values.
 */
export class GraphPropertyStoreFromVisitorHelper {
  private constructor() {}

  /**
   * Creates a GraphPropertyStore from a graph property visitor.
   *
   * @param graphPropertySchema Schema mapping property names to their schemas
   * @param graphStoreGraphPropertyVisitor Visitor containing streamed property data
   * @returns Built GraphPropertyStore
   */
  static fromGraphPropertyVisitor(
    graphPropertySchema: Map<string, PropertySchema>,
    graphStoreGraphPropertyVisitor: GraphStoreGraphPropertyVisitor
  ): GraphPropertyStore {
    const graphPropertyBuilder = GraphPropertyStore.builder();
    this.buildGraphPropertiesFromStreams(
      graphPropertyBuilder,
      graphPropertySchema,
      graphStoreGraphPropertyVisitor.streamFractions()
    );
    return graphPropertyBuilder.build();
  }

  /**
   * Builds graph properties from stream fractions.
   */
  private static buildGraphPropertiesFromStreams(
    graphPropertyBuilder: GraphPropertyStore.Builder,
    graphPropertySchema: Map<string, PropertySchema>,
    streamFractions: Map<string, GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]>
  ): void {
    streamFractions.forEach((streamBuilders, key) => {
      const propertySchema = graphPropertySchema.get(key);
      if (!propertySchema) {
        throw new Error(`No schema found for property: ${key}`);
      }

      const graphPropertyValues = this.getGraphPropertyValuesFromStream(
        propertySchema.valueType(),
        streamBuilders
      );
      graphPropertyBuilder.putProperty(key, GraphProperty.of(key, graphPropertyValues));
    });
  }

  /**
   * Merges multiple stream fractions into a single reducible stream.
   */
  private static mergeStreamFractions<T>(
    streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<T>[]
  ): GraphStoreGraphPropertyVisitor.ReducibleStream<T> {
    return streamFractions
      .map(builder => builder.build())
      .reduce((acc, current) => acc.reduce(current))
      ?? GraphStoreGraphPropertyVisitor.ReducibleStream.empty<T>();
  }

  /**
   * Creates typed GraphPropertyValues from stream builders based on value type.
   */
  private static getGraphPropertyValuesFromStream(
    valueType: ValueType,
    streamBuilders: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]
  ): GraphPropertyValues {
    switch (valueType) {
      case ValueType.LONG:
        return new LongStreamBuilderGraphPropertyValues(streamBuilders);
      case ValueType.DOUBLE:
        return new DoubleStreamBuilderGraphPropertyValues(streamBuilders);
      case ValueType.FLOAT_ARRAY:
        return new FloatArrayStreamBuilderGraphPropertyValues(streamBuilders);
      case ValueType.DOUBLE_ARRAY:
        return new DoubleArrayStreamBuilderGraphPropertyValues(streamBuilders);
      case ValueType.LONG_ARRAY:
        return new LongArrayStreamBuilderGraphPropertyValues(streamBuilders);
      default:
        throw new Error(`Unsupported value type: ${valueType}`);
    }
  }
}

/**
 * Implementation of LongGraphPropertyValues using stream builders.
 */
class LongStreamBuilderGraphPropertyValues implements LongGraphPropertyValues {
  private readonly streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[];

  constructor(streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]) {
    this.streamFractions = streamFractions;
  }

  valueCount(): number {
    return -1; // Unknown count
  }

  valueType(): ValueType {
    return ValueType.LONG;
  }

  *longValues(): Iterable<number> {
    const mergedStream = GraphPropertyStoreFromVisitorHelper['mergeStreamFractions'](this.streamFractions);
    for (const value of mergedStream.stream()) {
      yield value as number;
    }
  }
}

/**
 * Implementation of DoubleGraphPropertyValues using stream builders.
 */
class DoubleStreamBuilderGraphPropertyValues implements DoubleGraphPropertyValues {
  private readonly streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[];

  constructor(streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]) {
    this.streamFractions = streamFractions;
  }

  valueCount(): number {
    return -1; // Unknown count
  }

  valueType(): ValueType {
    return ValueType.DOUBLE;
  }

  *doubleValues(): Iterable<number> {
    const mergedStream = GraphPropertyStoreFromVisitorHelper['mergeStreamFractions'](this.streamFractions);
    for (const value of mergedStream.stream()) {
      yield value as number;
    }
  }
}

/**
 * Implementation of FloatArrayGraphPropertyValues using stream builders.
 */
class FloatArrayStreamBuilderGraphPropertyValues implements FloatArrayGraphPropertyValues {
  private readonly streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[];

  constructor(streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]) {
    this.streamFractions = streamFractions;
  }

  valueCount(): number {
    return -1; // Unknown count
  }

  valueType(): ValueType {
    return ValueType.FLOAT_ARRAY;
  }

  *floatArrayValues(): Iterable<number[]> {
    const mergedStream = GraphPropertyStoreFromVisitorHelper['mergeStreamFractions'](this.streamFractions);
    for (const value of mergedStream.stream()) {
      yield value as number[];
    }
  }
}

/**
 * Implementation of DoubleArrayGraphPropertyValues using stream builders.
 */
class DoubleArrayStreamBuilderGraphPropertyValues implements DoubleArrayGraphPropertyValues {
  private readonly streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[];

  constructor(streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]) {
    this.streamFractions = streamFractions;
  }

  valueCount(): number {
    return -1; // Unknown count
  }

  valueType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  *doubleArrayValues(): Iterable<number[]> {
    const mergedStream = GraphPropertyStoreFromVisitorHelper['mergeStreamFractions'](this.streamFractions);
    for (const value of mergedStream.stream()) {
      yield value as number[];
    }
  }
}

/**
 * Implementation of LongArrayGraphPropertyValues using stream builders.
 */
class LongArrayStreamBuilderGraphPropertyValues implements LongArrayGraphPropertyValues {
  private readonly streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[];

  constructor(streamFractions: GraphStoreGraphPropertyVisitor.StreamBuilder<any>[]) {
    this.streamFractions = streamFractions;
  }

  valueCount(): number {
    return -1; // Unknown count
  }

  valueType(): ValueType {
    return ValueType.LONG_ARRAY;
  }

  *longArrayValues(): Iterable<number[]> {
    const mergedStream = GraphPropertyStoreFromVisitorHelper['mergeStreamFractions'](this.streamFractions);
    for (const value of mergedStream.stream()) {
      yield value as number[];
    }
  }
}
