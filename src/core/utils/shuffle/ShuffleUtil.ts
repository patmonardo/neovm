import { HugeLongArray } from '../../collections/ha/HugeLongArray';

/**
 * Utility class for shuffling arrays using various algorithms.
 * Provides implementations for both regular arrays and huge arrays.
 */
export class ShuffleUtil {
  /**
   * Shuffles the elements of a HugeLongArray using the Fisher-Yates algorithm.
   *
   * @param data Array to shuffle
   * @param random Random number generator
   */
  public static shuffleArray(data: HugeLongArray, random: Random): void {
    for (let offset = 0; offset < data.size() - 1; offset++) {
      const swapWith = random.nextLong(offset, data.size());
      const tempValue = data.get(swapWith);
      data.set(swapWith, data.get(offset));
      data.set(offset, tempValue);
    }
  }

  /**
   * Shuffles the elements of a number array using the Fisher-Yates algorithm.
   *
   * @param data Array to shuffle
   * @param random Random number generator
   */
  public static shuffleNumberArray(data: number[], random: Random): void {
    for (let offset = 0; offset < data.length - 1; offset++) {
      const swapWith = random.nextInt(offset, data.length);
      const tempValue = data[swapWith];
      data[swapWith] = data[offset];
      data[offset] = tempValue;
    }
  }

  /**
   * Shuffles the elements of a number array using the Fisher-Yates algorithm.
   *
   * @param data Array to shuffle
   * @param random Random number generator
   */
  public static shuffleBigIntArray(data: number[], random: Random): void {
    for (let offset = 0; offset < data.length - 1; offset++) {
      const swapWith = random.nextInt(offset, data.length);
      const tempValue = data[swapWith];
      data[swapWith] = data[offset];
      data[offset] = tempValue;
    }
  }

  /**
   * Creates a random data generator with an optional seed.
   *
   * @param randomSeed Optional seed value
   * @returns Random number generator
   */
  public static createRandomDataGenerator(randomSeed?: number): Random {
    return new SplittableRandom(randomSeed);
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}
}

/**
 * Interface for random number generators.
 */
export interface Random {
  /**
   * Returns the next random integer between origin (inclusive) and bound (exclusive).
   *
   * @param origin Lower bound (inclusive)
   * @param bound Upper bound (exclusive)
   * @returns Random integer
   */
  nextInt(origin: number, bound: number): number;

  /**
   * Returns the next random long between origin (inclusive) and bound (exclusive).
   *
   * @param origin Lower bound (inclusive)
   * @param bound Upper bound (exclusive)
   * @returns Random long
   */
  nextLong(origin: number, bound: number): number;
}

/**
 * Implementation of Java's SplittableRandom.
 * This provides a high-quality random number generator
 * similar to what's available in Java.
 */
export class SplittableRandom implements Random {
  private state: number;
  private static readonly GAMMA = 0x9e3779b97f4a7c15n;

  /**
   * Creates a new random number generator.
   *
   * @param seed Optional seed value
   */
  constructor(seed?: number) {
    // Initialize with seed or current time if no seed provided
    const initialSeed = seed !== undefined ? BigInt(seed) : BigInt(Date.now());
    this.state = this.mix(initialSeed);
  }

  /**
   * Returns the next pseudorandom value.
   *
   * @returns Random value as number
   */
  private next(): number {
    let z = this.state += SplittableRandom.GAMMA;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    return z ^ (z >> 31n);
  }

  /**
   * Mixes the bits of a seed to produce a better starting state.
   *
   * @param seed Seed value
   * @returns Mixed seed
   */
  private mix(seed: number): number {
    let z = seed;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    return z ^ (z >> 31n);
  }

  /**
   * Returns the next random integer between origin (inclusive) and bound (exclusive).
   *
   * @param origin Lower bound (inclusive)
   * @param bound Upper bound (exclusive)
   * @returns Random integer
   */
  public nextInt(origin: number, bound: number): number {
    const range = bound - origin;
    if (range <= 0) {
      throw new Error("bound must be greater than origin");
    }

    const n = this.next();
    const m = n % BigInt(range);
    return Number(m) + origin;
  }

  /**
   * Returns the next random long between origin (inclusive) and bound (exclusive).
   *
   * @param origin Lower bound (inclusive)
   * @param bound Upper bound (exclusive)
   * @returns Random long
   */
  public nextLong(origin: number, bound: number): number {
    return this.nextInt(origin, bound);
  }

  /**
   * Creates a new SplittableRandom using the next random value as a seed.
   *
   * @returns A new SplittableRandom
   */
  public split(): SplittableRandom {
    return new SplittableRandom(Number(this.next() & 0xFFFFFFFFn));
  }
}
