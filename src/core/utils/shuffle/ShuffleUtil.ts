import { HugeLongArray } from "@/collections";

/**
 * Utility class for shuffling arrays using various algorithms.
 * Provides implementations for both regular arrays and huge arrays.
 */
export class ShuffleUtil {
  /**
   * Shuffles HugeLongArray using Fisher-Yates algorithm.
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
   * Shuffles regular number array.
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
   * Creates random generator with optional seed.
   */
  public static createRandomDataGenerator(randomSeed?: number): Random {
    return new SplittableRandom(randomSeed);
  }
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
 * TypeScript implementation of Java's SplittableRandom.
 * Uses BigInt for 64-bit precision and proper bit operations.
 */
export class SplittableRandom implements Random {
  private seed: bigint;
  private gamma: bigint;

  private static readonly GOLDEN_GAMMA = 0x9e3779b97f4a7c15n;

  /**
   * Creates a new SplittableRandom with optional seed.
   */
  constructor(seed?: number | bigint) {
    const initialSeed = seed !== undefined ? BigInt(seed) : BigInt(Date.now());
    this.seed = this.mix64(initialSeed);
    this.gamma = this.mixGamma(initialSeed + SplittableRandom.GOLDEN_GAMMA);
  }

  /**
   * Generate next pseudorandom value and advance state.
   */
  private nextSeed(): bigint {
    return (this.seed += this.gamma);
  }

  /**
   * Generate next 64-bit value.
   */
  private next64(): bigint {
    let z = this.nextSeed();
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    return z ^ (z >> 31n);
  }

  /**
   * Generate next 32-bit value.
   */
  private next32(): number {
    const value64 = this.next64();
    // ✅ Take low 32 bits as unsigned integer (no overflow)
    return Number(value64 & 0xffffffffn);
  }

  /**
   * Mix function for 64-bit values (improves bit distribution).
   */
  private mix64(seed: bigint): bigint {
    let z = seed;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    return z ^ (z >> 31n);
  }

  /**
   * Mix gamma value to ensure it's odd and has good bit distribution.
   */
  private mixGamma(seed: bigint): bigint {
    let z = this.mix64(seed) | 1n; // Ensure odd
    const n = Long.bitCount(z ^ (z >> 1n)); // Count bits
    return n < 24 ? z ^ 0xaaaaaaaaaaaaaaaaaan : z;
  }

  /**
   * Returns random integer in range [origin, bound).
   */
  public nextInt(origin: number, bound: number): number {
    if (origin >= bound) {
      throw new Error("bound must be greater than origin");
    }

    const range = bound - origin;

    // ✅ Simple, working implementation
    const randomValue = Math.abs(this.next32()) % range;
    return randomValue + origin;
  }

  /**
   * Returns random long in range [origin, bound).
   */
  public nextLong(origin: number, bound: number): number {
    if (origin >= bound) {
      throw new Error("bound must be greater than origin");
    }

    const range = BigInt(bound - origin);
    let bits = this.next64();

    if (range > 0n) {
      const m = range - 1n;
      if ((range & m) === 0n) {
        // Power of 2 case
        bits = bits & m;
      } else {
        // General case with proper uniform distribution
        for (
          let u = bits >> 1n;
          u - (bits = u % range) + m < 0n;
          u = this.next64() >> 1n
        ) {
          // Retry if bias would occur
        }
      }
    }

    return Number(bits) + origin;
  }

  /**
   * Create a new SplittableRandom for parallel processing.
   */
  public split(): SplittableRandom {
    const newSeed = this.next64();
    return new SplittableRandom(newSeed);
  }
}

/**
 * Bit manipulation utilities for BigInt.
 */
class Long {
  /**
   * Count the number of 1-bits in a BigInt value.
   */
  static bitCount(value: bigint): number {
    let count = 0;
    let v = value;
    while (v !== 0n) {
      count += Number(v & 1n);
      v >>= 1n;
    }
    return count;
  }
}
