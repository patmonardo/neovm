import { NodePropertyValues } from '../NodePropertyValues';
import { ValueType } from '@/api/ValueType';
import { HugeObjectArray } from '@/collections/ha/HugeObjectArray';
import { HugeAtomicBitSet } from '@/core/utils/paged/HugeAtomicBitSet';

/**
 * Implementation of NodePropertyValues that stores binary embeddings as bit sets
 * and converts them to arrays of various numeric types on demand.
 */
export class BinaryArrayNodePropertyValues implements NodePropertyValues {
  private readonly binaryEmbeddings: HugeObjectArray<HugeAtomicBitSet>;
  private readonly embeddingDimension: number;

  constructor(
    binaryEmbeddings: HugeObjectArray<HugeAtomicBitSet>,
    embeddingDimension: number
  ) {
    this.binaryEmbeddings = binaryEmbeddings;
    this.embeddingDimension = embeddingDimension;
  }

  doubleValue(_nodeId: number): number {
    throw new Error('doubleValue is not supported for BinaryArrayNodePropertyValues.');
  }

  longValue(_nodeId: number): number {
    const longValue = NodePropertyValues.withDefaultsForType(() => this.valueType()).longValue?.(0);
    if (longValue === undefined) {
      throw new Error('longValue is not defined for BinaryArrayNodePropertyValues.');
    }
    throw longValue;
  }

  doubleArrayValue(nodeId: number): number[] | undefined {
    return BinaryArrayNodePropertyValues.bitSetToDoubleArray(
      this.binaryEmbeddings.get(nodeId),
      this.embeddingDimension
    );
  }

  floatArrayValue(nodeId: number): number[] | undefined {
    return BinaryArrayNodePropertyValues.bitSetToFloatArray(
      this.binaryEmbeddings.get(nodeId),
      this.embeddingDimension
    );
  }

  longArrayValue(nodeId: number): number[] | undefined {
    return BinaryArrayNodePropertyValues.bitSetToLongArray(
      this.binaryEmbeddings.get(nodeId),
      this.embeddingDimension
    );
  }

  getObject(nodeId: number): any | null {
    return this.doubleArrayValue(nodeId);
  }

  dimension(): number | undefined {
    return this.embeddingDimension;
  }

  valueType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  nodeCount(): number {
    return 0; // this.binaryEmbeddings.size;
  }

  getMaxLongPropertyValue(): number | undefined {
    const maxLongValue = NodePropertyValues.withDefaultsForType(() => this.valueType()).getMaxLongPropertyValue?.();
    if (maxLongValue === undefined) {
      throw new Error('getMaxLongPropertyValue is not defined for BinaryArrayNodePropertyValues.');
    }
    throw new Error(`Unexpected value: ${maxLongValue}`);
  }

  getMaxDoublePropertyValue(): number | undefined {
    const maxDoubleValue = NodePropertyValues.withDefaultsForType(() => this.valueType()).getMaxDoublePropertyValue?.();
    if (maxDoubleValue === undefined) {
      throw new Error('getMaxDoublePropertyValue is not defined for BinaryArrayNodePropertyValues.');
    }
    throw new Error(`Unexpected value: ${maxDoubleValue}`);
  }

  hasValue(_nodeId: number): boolean {
    return true;
  }

  private static bitSetToDoubleArray(bitSet: HugeAtomicBitSet, dimension: number): number[] {
    const array = new Array(dimension).fill(0);
    bitSet.forEachSetBit((bit: number) => {
      array[Number(bit)] = 1.0;
    });
    return array;
  }

  private static bitSetToFloatArray(bitSet: HugeAtomicBitSet, dimension: number): number[] {
    const array = new Array(dimension).fill(0);
    bitSet.forEachSetBit((bit: number) => {
      array[Number(bit)] = 1.0;
    });
    return array;
  }

  private static bitSetToLongArray(bitSet: HugeAtomicBitSet, dimension: number): number[] {
    const array = new Array(dimension).fill(0n);
    bitSet.forEachSetBit((bit: number) => {
      array[Number(bit)] = 1n;
    });
    return array;
  }
}
