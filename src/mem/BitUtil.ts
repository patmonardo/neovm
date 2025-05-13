/**
 * Utility class for bit manipulation operations.
 * Public methods accept 'number' and return 'number' (or boolean).
 * Internally, operations are performed using BigInt for precision during calculation,
 * then converted back to number.
 * WARNING: Conversion from BigInt result to number may lead to precision loss
 * if the result exceeds Number.MAX_SAFE_INTEGER or Number.MAX_VALUE.
 */
export class BitUtil {
  private static validateSafeInteger(value: number, paramName: string): void {
    if (!Number.isSafeInteger(value)) {
      throw new Error(
        `${paramName} (${value}) is not a safe integer. ` +
        `Operations may be unreliable if precision has already been lost.`
      );
    }
  }

  /**
   * Checks if a number is a power of two.
   * @param value The value to check.
   * @returns True if the value is a power of two.
   */
  public static isPowerOfTwo(value: number): boolean {
    BitUtil.validateSafeInteger(value, 'value');
    const bigValue = BigInt(value);
    return bigValue > 0n && (bigValue & (~bigValue + 1n)) === bigValue;
  }

  /**
   * Returns the previous highest power of two for a number.
   * @param v The input value.
   * @returns The previous power of two as a number.
   *          Result may lose precision if it exceeds number limits.
   */
  public static previousPowerOfTwo(v: number): number {
    BitUtil.validateSafeInteger(v, 'v');
    let bigV = BigInt(v);

    // Algorithm for BigInt
    bigV |= bigV >> 1n;
    bigV |= bigV >> 2n;
    bigV |= bigV >> 4n;
    bigV |= bigV >> 8n;
    bigV |= bigV >> 16n;
    bigV |= bigV >> 32n; // Ensure it covers up to 64 bits for typical long scenarios
    const resultBigInt = bigV - (bigV >> 1n);
    return Number(resultBigInt); // WARNING: Potential precision loss
  }

  /**
   * Returns the next highest power of two for a number.
   * Returns 0 if the input is 0 or negative.
   * @param v The input value.
   * @returns The next highest power of two as a number.
   *          Result may lose precision if it exceeds number limits.
   */
  public static nextHighestPowerOfTwo(v: number): number {
    BitUtil.validateSafeInteger(v, 'v');
    if (v <= 0) return 0;

    let bigV = BigInt(v);
    bigV--;
    bigV |= bigV >> 1n;
    bigV |= bigV >> 2n;
    bigV |= bigV >> 4n;
    bigV |= bigV >> 8n;
    bigV |= bigV >> 16n;
    bigV |= bigV >> 32n;
    bigV++;
    return Number(bigV); // WARNING: Potential precision loss
  }

  /**
   * Returns the nearest power of two to the given number.
   * @param x The input value.
   * @returns The nearest power of two as a number. Returns 0 for 0 or negative inputs.
   *          Result may lose precision if it exceeds number limits.
   */
  public static nearbyPowerOfTwo(x: number): number {
    BitUtil.validateSafeInteger(x, 'x');
    if (x <= 0) return 0;

    const bigX = BigInt(x);
    const nextBig = BitUtil._nextHighestPowerOfTwoBigInt(bigX); // Internal BigInt version

    if (bigX === nextBig) return Number(bigX); // Already a power of two

    const prevBig = nextBig >> 1n;

    if (prevBig === 0n && bigX > 0n) return Number(nextBig);

    const resultBigInt = (nextBig - bigX) <= (bigX - prevBig) ? nextBig : prevBig;
    return Number(resultBigInt); // WARNING: Potential precision loss
  }

  // Helper for nearbyPowerOfTwo to keep internal BigInt logic clean
  private static _nextHighestPowerOfTwoBigInt(v: bigint): bigint {
    if (v <= 0n) return 0n; // Should be caught by caller, but defensive
    let current = v - 1n;
    current |= current >> 1n;
    current |= current >> 2n;
    current |= current >> 4n;
    current |= current >> 8n;
    current |= current >> 16n;
    current |= current >> 32n;
    current++;
    return current;
  }


  /**
   * Aligns a number value to the specified power-of-two alignment.
   * @param value The number value to align.
   * @param alignment The alignment (must be a positive power of two number).
   * @returns The aligned number value.
   *          Result may lose precision if it exceeds number limits.
   */
  public static align(value: number, alignment: number): number {
    BitUtil.validateSafeInteger(value, 'value');
    BitUtil.validateSafeInteger(alignment, 'alignment');

    const intAlignment = alignment | 0; // Ensure alignment is treated as an integer
    if (intAlignment <= 0 || !BitUtil.isPowerOfTwo(intAlignment)) { // isPowerOfTwo now takes number
      throw new Error(`Alignment must be a positive power of 2: ${intAlignment}`);
    }

    const bigValue = BigInt(value);
    const alignmentMinus1 = BigInt(intAlignment - 1);
    const resultBigInt = (bigValue + alignmentMinus1) & ~alignmentMinus1;
    return Number(resultBigInt); // WARNING: Potential precision loss
  }

  /**
   * Calculates ceiling division for numbers (dividend / divisor, rounded towards positive infinity).
   * This implementation uses BigInt internally to replicate the specific formula
   * from Java GDS: 1 + (-1 + dividend) / divisor.
   * @param dividend The dividend.
   * @param divisor The divisor.
   * @returns The result of the GDS ceiling division formula as a number.
   *          Result may lose precision if it exceeds number limits.
   */
  public static ceilDiv(dividend: number, divisor: number): number {
    BitUtil.validateSafeInteger(dividend, 'dividend');
    BitUtil.validateSafeInteger(divisor, 'divisor');

    const bigDividend = BigInt(dividend);
    const bigDivisor = BigInt(divisor);

    if (bigDivisor === 0n) {
      throw new Error("Division by zero in ceilDiv.");
    }
    // Replicating Java's formula: 1L + (-1L + dividend) / divisor
    const resultBigInt = 1n + (-1n + bigDividend) / bigDivisor;
    return Number(resultBigInt); // WARNING: Potential precision loss
  }

  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {
    // This class is not meant to be instantiated.
    throw new Error("BitUtil is a utility class and cannot be instantiated.");
  }
}
