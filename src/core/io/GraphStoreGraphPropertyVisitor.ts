import { ValueType } from '@/api/ValueType';
import { PropertySchema } from '@/api/schema/PropertySchema';
import { HugeSparseDoubleList } from '@/collections/hsl/HugeSparseDoubleList';
import { HugeSparseLongList } from '@/collections/hsl/HugeSparseLongList';
import { HugeSparseDoubleArrayList } from '@/collections/hsl/HugeSparseDoubleArrayList';
import { HugeSparseLongArrayList } from '@/collections/hsl/HugeSparseLongArrayList';
import { HugeSparseFloatArrayList } from '@/collections/hsl/HugeSparseFloatArrayList';
import { HugeSparseObjectArrayList } from '@/collections/hsl/HugeSparseObjectArrayList';
import { CloseableThreadLocal } from '@/utils/CloseableThreadLocal';
import { GraphPropertyVisitor } from './file/GraphPropertyVisitor';

/**
 * Thread-safe visitor for collecting graph properties from parallel import operations.
 * This visitor accumulates property values across multiple threads and provides
 * stream-based access to the collected data for building the final property store.
 */
export class GraphStoreGraphPropertyVisitor extends GraphPropertyVisitor {
  private readonly graphPropertySchema: Map<string, PropertySchema>;
  private readonly streamBuilders: CloseableThreadLocal<Map<string, StreamBuilder<any>>>;
  private readonly lock: AsyncMutex;
  private readonly streamFractions: Map<string, StreamBuilder<any>[]>;

  constructor(graphPropertySchema: Map<string, PropertySchema>) {
    super();
    this.graphPropertySchema = graphPropertySchema;
    this.streamBuilders = new CloseableThreadLocal(() => new Map());
    this.lock = new AsyncMutex();
    this.streamFractions = new Map();
  }

  /**
   * Processes a graph property value.
   *
   * @param key The property key
   * @param value The property value
   * @returns false to continue processing
   */
  property(key: string, value: any): boolean {
    const propertySchema = this.graphPropertySchema.get(key);
    if (!propertySchema) {
      throw new Error(`No schema found for property: ${key}`);
    }

    this.appendToStream(key, value, propertySchema.valueType());
    return false;
  }

  /**
   * Flushes thread-local stream builders to the global collection.
   * Called when a thread completes its batch of work.
   */
  async flush(): Promise<void> {
    await this.lock.lock();
    try {
      const threadLocalStreamBuilder = this.streamBuilders.get();

      for (const [propertyName, streamBuilder] of threadLocalStreamBuilder) {
        if (!this.streamFractions.has(propertyName)) {
          this.streamFractions.set(propertyName, []);
        }
        this.streamFractions.get(propertyName)!.push(streamBuilder);
      }

      threadLocalStreamBuilder.clear();
    } finally {
      this.lock.unlock();
    }
  }

  /**
   * Returns all collected stream fractions grouped by property name.
   * Used by the helper to build the final property store.
   */
  streamFractions(): Map<string, StreamBuilder<any>[]> {
    return this.streamFractions;
  }

  /**
   * Closes and cleans up thread-local resources.
   */
  close(): void {
    this.streamBuilders.close();
  }

  /**
   * Appends a value to the appropriate stream builder for the property.
   */
  private appendToStream(key: string, value: any, valueType: ValueType): void {
    const threadLocalBuilders = this.streamBuilders.get();

    if (!threadLocalBuilders.has(key)) {
      threadLocalBuilders.set(key, StreamBuilder.forType(valueType));
    }

    threadLocalBuilders.get(key)!.add(value);
  }

  /**
   * Builder class for creating GraphStoreGraphPropertyVisitor instances.
   */
  static Builder = class {
    private graphPropertySchema?: Map<string, PropertySchema>;

    withGraphPropertySchema(graphPropertySchema: Map<string, PropertySchema>): this {
      this.graphPropertySchema = graphPropertySchema;
      return this;
    }

    build(): GraphStoreGraphPropertyVisitor {
      if (!this.graphPropertySchema) {
        throw new Error('graphPropertySchema is required');
      }
      return new GraphStoreGraphPropertyVisitor(this.graphPropertySchema);
    }
  };
}

/**
 * Interface for building streams of specific types.
 */
export interface StreamBuilder<T> {
  /**
   * Adds a value to the stream.
   */
  add(value: any): void;

  /**
   * Builds a reducible stream from the accumulated values.
   */
  build(): ReducibleStream<T>;
}

/**
 * Stream builder factory methods.
 */
export namespace StreamBuilder {
  export function forType(valueType: ValueType): StreamBuilder<any> {
    switch (valueType) {
      case ValueType.DOUBLE:
        return new DoubleStreamBuilder();
      case ValueType.LONG:
        return new LongStreamBuilder();
      case ValueType.LONG_ARRAY:
      case ValueType.DOUBLE_ARRAY:
      case ValueType.FLOAT_ARRAY:
        return new ObjectStreamBuilder(valueType);
      default:
        throw new Error(`Unsupported value type: ${valueType}`);
    }
  }
}

/**
 * Interface for streams that can be reduced/merged with other streams.
 */
export interface ReducibleStream<T> {
  /**
   * Returns the underlying stream.
   */
  stream(): Iterable<T>;

  /**
   * Reduces this stream with another stream.
   */
  reduce(other: ReducibleStream<T>): ReducibleStream<T>;
}

/**
 * Empty reducible stream implementation.
 */
export namespace ReducibleStream {
  export function empty<T>(): ReducibleStream<T> {
    return {
      stream(): Iterable<T> {
        return [];
      },

      reduce(other: ReducibleStream<T>): ReducibleStream<T> {
        throw new Error('UnsupportedOperationException');
      }
    };
  }
}

/**
 * Stream builder for long values.
 */
class LongStreamBuilder implements StreamBuilder<number> {
  private readonly longList: HugeSparseLongList;
  private index: number = 0;

  constructor() {
    this.longList = HugeSparseLongList.of(-1);
  }

  add(value: any): void {
    this.longList.set(this.index++, Number(value));
  }

  build(): ReducibleStream<number> {
    return new ReducibleLongStream(
      Array.from(this.longList.stream()).slice(0, this.index)
    );
  }
}

/**
 * Reducible stream for long values.
 */
class ReducibleLongStream implements ReducibleStream<number> {
  constructor(private readonly values: number[]) {}

  stream(): Iterable<number> {
    return this.values;
  }

  reduce(other: ReducibleStream<number>): ReducibleStream<number> {
    const combined = [...this.values, ...other.stream()];
    return new ReducibleLongStream(combined);
  }
}

/**
 * Stream builder for double values.
 */
class DoubleStreamBuilder implements StreamBuilder<number> {
  private readonly doubleList: HugeSparseDoubleList;
  private index: number = 0;

  constructor() {
    this.doubleList = HugeSparseDoubleList.of(NaN);
  }

  add(value: any): void {
    this.doubleList.set(this.index++, Number(value));
  }

  build(): ReducibleStream<number> {
    return new ReducibleDoubleStream(
      Array.from(this.doubleList.stream()).slice(0, this.index)
    );
  }
}

/**
 * Reducible stream for double values.
 */
class ReducibleDoubleStream implements ReducibleStream<number> {
  constructor(private readonly values: number[]) {}

  stream(): Iterable<number> {
    return this.values;
  }

  reduce(other: ReducibleStream<number>): ReducibleStream<number> {
    const combined = [...this.values, ...other.stream()];
    return new ReducibleDoubleStream(combined);
  }
}

/**
 * Stream builder for object/array values.
 */
class ObjectStreamBuilder<T> implements StreamBuilder<T> {
  private readonly objectList: HugeSparseObjectArrayList<T, any>;
  private index: number = 0;

  constructor(valueType: ValueType) {
    this.objectList = this.createArrayList(valueType);
  }

  add(value: any): void {
    this.objectList.set(this.index++, value as T);
  }

  build(): ReducibleStream<T> {
    return new ReducibleObjectStream(
      Array.from(this.objectList.stream()).slice(0, this.index)
    );
  }

  private createArrayList(valueType: ValueType): HugeSparseObjectArrayList<T, any> {
    switch (valueType) {
      case ValueType.LONG_ARRAY:
        return HugeSparseLongArrayList.of(
          valueType.fallbackValue().longArrayValue()
        ) as any;
      case ValueType.DOUBLE_ARRAY:
        return HugeSparseDoubleArrayList.of(
          valueType.fallbackValue().doubleArrayValue()
        ) as any;
      case ValueType.FLOAT_ARRAY:
        return HugeSparseFloatArrayList.of(
          valueType.fallbackValue().floatArrayValue()
        ) as any;
      default:
        throw new Error(`Unsupported object stream type: ${valueType}`);
    }
  }
}

/**
 * Reducible stream for object values.
 */
class ReducibleObjectStream<T> implements ReducibleStream<T> {
  constructor(private readonly values: T[]) {}

  stream(): Iterable<T> {
    return this.values;
  }

  reduce(other: ReducibleStream<T>): ReducibleStream<T> {
    const combined = [...this.values, ...other.stream()];
    return new ReducibleObjectStream(combined);
  }
}

/**
 * Simple async mutex for TypeScript.
 */
class AsyncMutex {
  private locked = false;
  private waiting: (() => void)[] = [];

  async lock(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waiting.push(resolve);
      }
    });
  }

  unlock(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}
