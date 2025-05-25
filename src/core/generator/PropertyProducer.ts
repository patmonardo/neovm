import { ValueType } from '@/api/nodeproperties/ValueType';

/**
 * Interface for producing properties for generated graph nodes.
 * Property producers generate realistic property values for nodes during graph creation,
 * supporting various data types and generation strategies.
 *
 * @template PROPERTY_SLICE The type of property array this producer works with
 */
export interface PropertyProducer<PROPERTY_SLICE> {
  /**
   * Gets the name of the property this producer generates.
   */
  getPropertyName(): string | null;

  /**
   * Gets the value type of the property this producer generates.
   */
  propertyType(): ValueType;

  /**
   * Sets a property value for a specific node.
   *
   * @param nodeId The ID of the node to set the property for
   * @param slice The property array slice to write into
   * @param index The index within the slice to write to
   * @param random Random number generator for generating values
   */
  setProperty(nodeId: number, slice: PROPERTY_SLICE, index: number, random: Random): void;
}

/**
 * Factory methods and implementations for common property producers.
 */
export namespace PropertyProducer {
  /**
   * Creates a producer that generates fixed double values.
   */
  export function fixedDouble(propertyName: string, value: number): PropertyProducer<number[]> {
    return new FixedDoubleProducer(propertyName, value);
  }

  /**
   * Creates a producer that generates random double values within a range.
   */
  export function randomDouble(propertyName: string, min: number, max: number): PropertyProducer<number[]> {
    return new RandomDoubleProducer(propertyName, min, max);
  }

  /**
   * Creates a producer that generates random float embeddings.
   */
  export function randomEmbedding(propertyName: string, embeddingSize: number, min: number, max: number): PropertyProducer<number[][]> {
    return new RandomEmbeddingProducer(propertyName, embeddingSize, min, max);
  }

  /**
   * Creates a producer that generates random double embeddings.
   */
  export function randomEmbeddingDouble(propertyName: string, embeddingSize: number, min: number, max: number): PropertyProducer<number[][]> {
    return new RandomDoubleEmbeddingProducer(propertyName, embeddingSize, min, max);
  }

  /**
   * Creates a producer that uses node ID as a long property.
   */
  export function nodeIdAsLong(propertyName: string): PropertyProducer<number[]> {
    return new NodeIdProducer(propertyName);
  }

  /**
   * Creates a producer that generates fixed long values.
   */
  export function fixedLong(propertyName: string, value: number): PropertyProducer<number[]> {
    return new FixedLongProducer(propertyName, value);
  }

  /**
   * Creates a producer that generates random long values within a range.
   */
  export function randomLong(propertyName: string, min: number, max: number): PropertyProducer<number[]> {
    return new RandomLongProducer(propertyName, min, max);
  }

  /**
   * Creates a producer that generates random long arrays.
   */
  export function randomLongArray(propertyName: string, length: number, min: number, max: number): PropertyProducer<number[][]> {
    return new RandomLongArrayProducer(propertyName, length, min, max);
  }

  /**
   * Creates a producer that generates random double arrays.
   */
  export function randomDoubleArray(propertyName: string, length: number, min: number, max: number): PropertyProducer<number[][]> {
    return new RandomDoubleArrayProducer(propertyName, length, min, max);
  }
}

/**
 * Simple Random interface for consistent random number generation.
 */
interface Random {
  nextDouble(): number;
  nextFloat(): number;
  nextLong(): number;
}

// Implementation classes

class FixedDoubleProducer implements PropertyProducer<number[]> {
  constructor(
    private readonly propertyName: string,
    private readonly value: number
  ) {}

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.DOUBLE;
  }

  setProperty(nodeId: number, doubles: number[], index: number, random: Random): void {
    doubles[index] = this.value;
  }

  equals(other: FixedDoubleProducer): boolean {
    return this.propertyName === other.propertyName && this.value === other.value;
  }

  toString(): string {
    return `FixedDoubleProducer{propertyName='${this.propertyName}', value=${this.value}}`;
  }
}

class FixedLongProducer implements PropertyProducer<number[]> {
  constructor(
    private readonly propertyName: string,
    private readonly value: number
  ) {}

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.LONG;
  }

  setProperty(nodeId: number, longs: number[], index: number, random: Random): void {
    longs[index] = this.value;
  }

  equals(other: FixedLongProducer): boolean {
    return this.propertyName === other.propertyName && this.value === other.value;
  }

  toString(): string {
    return `FixedLongProducer{propertyName='${this.propertyName}', value=${this.value}}`;
  }
}

class RandomDoubleProducer implements PropertyProducer<number[]> {
  constructor(
    private readonly propertyName: string,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.DOUBLE;
  }

  setProperty(nodeId: number, doubles: number[], index: number, random: Random): void {
    doubles[index] = this.min + (random.nextDouble() * (this.max - this.min));
  }

  equals(other: RandomDoubleProducer): boolean {
    return this.propertyName === other.propertyName &&
           this.min === other.min &&
           this.max === other.max;
  }

  toString(): string {
    return `RandomDoubleProducer{propertyName='${this.propertyName}', min=${this.min}, max=${this.max}}`;
  }
}

class RandomEmbeddingProducer implements PropertyProducer<number[][]> {
  constructor(
    private readonly propertyName: string,
    private readonly embeddingSize: number,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.FLOAT_ARRAY;
  }

  setProperty(nodeId: number, embeddings: number[][], index: number, random: Random): void {
    const nodeEmbeddings = new Array(this.embeddingSize);
    for (let i = 0; i < this.embeddingSize; i++) {
      nodeEmbeddings[i] = this.min + (random.nextFloat() * (this.max - this.min));
    }
    embeddings[index] = nodeEmbeddings;
  }

  equals(other: RandomEmbeddingProducer): boolean {
    return this.propertyName === other.propertyName &&
           this.embeddingSize === other.embeddingSize &&
           this.min === other.min &&
           this.max === other.max;
  }

  toString(): string {
    return `RandomEmbeddingProducer{propertyName='${this.propertyName}', embeddingSize=${this.embeddingSize}, min=${this.min}, max=${this.max}}`;
  }
}

class RandomDoubleEmbeddingProducer implements PropertyProducer<number[][]> {
  constructor(
    private readonly propertyName: string,
    private readonly embeddingSize: number,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  setProperty(nodeId: number, embeddings: number[][], index: number, random: Random): void {
    const nodeEmbeddings = new Array(this.embeddingSize);
    for (let i = 0; i < this.embeddingSize; i++) {
      nodeEmbeddings[i] = this.min + (random.nextDouble() * (this.max - this.min));
    }
    embeddings[index] = nodeEmbeddings;
  }

  equals(other: RandomDoubleEmbeddingProducer): boolean {
    return this.propertyName === other.propertyName &&
           this.embeddingSize === other.embeddingSize &&
           this.min === other.min &&
           this.max === other.max;
  }

  toString(): string {
    return `RandomDoubleEmbeddingProducer{propertyName='${this.propertyName}', embeddingSize=${this.embeddingSize}, min=${this.min}, max=${this.max}}`;
  }
}

class NodeIdProducer implements PropertyProducer<number[]> {
  constructor(private readonly propertyName: string) {}

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.LONG;
  }

  setProperty(nodeId: number, longs: number[], index: number, random: Random): void {
    longs[index] = nodeId;
  }
}

class RandomLongProducer implements PropertyProducer<number[]> {
  constructor(
    private readonly propertyName: string,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.LONG;
  }

  setProperty(nodeId: number, longs: number[], index: number, random: Random): void {
    const modulo = random.nextLong() % (this.max - this.min);
    if (modulo >= 0) {
      longs[index] = modulo + this.min;
    } else {
      longs[index] = modulo + this.max;
    }
  }
}

class RandomLongArrayProducer implements PropertyProducer<number[][]> {
  constructor(
    private readonly propertyName: string,
    private readonly length: number,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.LONG_ARRAY;
  }

  setProperty(nodeId: number, longs: number[][], index: number, random: Random): void {
    const value = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      const modulo = random.nextLong() % (this.max - this.min);
      if (modulo >= 0) {
        value[i] = modulo + this.min;
      } else {
        value[i] = modulo + this.max;
      }
    }
    longs[index] = value;
  }
}

class RandomDoubleArrayProducer implements PropertyProducer<number[][]> {
  constructor(
    private readonly propertyName: string,
    private readonly length: number,
    private readonly min: number,
    private readonly max: number
  ) {
    if (max <= min) {
      throw new Error('Max value must be greater than min value');
    }
  }

  getPropertyName(): string {
    return this.propertyName;
  }

  propertyType(): ValueType {
    return ValueType.DOUBLE_ARRAY;
  }

  setProperty(nodeId: number, embeddings: number[][], index: number, random: Random): void {
    const value = new Array(this.length);
    for (let i = 0; i < this.length; i++) {
      value[i] = this.min + (random.nextDouble() * (this.max - this.min));
    }
    embeddings[index] = value;
  }

  equals(other: RandomDoubleArrayProducer): boolean {
    return this.propertyName === other.propertyName &&
           this.length === other.length &&
           this.min === other.min &&
           this.max === other.max;
  }

  toString(): string {
    return `RandomDoubleArrayProducer{propertyName='${this.propertyName}', length=${this.length}, min=${this.min}, max=${this.max}}`;
  }
}

class EmptyPropertyProducer implements PropertyProducer<number[]> {
  getPropertyName(): string | null {
    return null;
  }

  propertyType(): ValueType {
    return ValueType.DOUBLE;
  }

  setProperty(nodeId: number, doubles: number[], index: number, random: Random): void {
    // No-op - empty producer
  }
}
