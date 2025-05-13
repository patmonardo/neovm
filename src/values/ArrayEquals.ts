/**
 * Static methods for checking the equality of arrays of primitives.
 *
 * This class handles only evaluation of a[] == b[] where type(a) != type(b),
 * e.g. Uint8Array == Int32Array and similar comparisons.
 */
export class ArrayEquals {
  /**
   * Private constructor to prevent instantiation.
   */
  private constructor() {}

  // TYPED COMPARISON

  /**
   * Compare byte array with short array for equality.
   */
  public static byteAndShort(a: Uint8Array, b: Int16Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare byte array with int array for equality.
   */
  public static byteAndInt(a: Uint8Array, b: Int32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare byte array with long array for equality.
   */
  public static byteAndLong(a: Uint8Array, b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare byte array with float array for equality.
   */
  public static byteAndFloat(a: Uint8Array, b: Float32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare byte array with double array for equality.
   */
  public static byteAndDouble(a: Uint8Array, b: Float64Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare short array with int array for equality.
   */
  public static shortAndInt(a: Int16Array, b: Int32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare short array with long array for equality.
   */
  public static shortAndLong(a: Int16Array, b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if ((a[i]) !== (b[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare short array with float array for equality.
   */
  public static shortAndFloat(a: Int16Array, b: Float32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare short array with double array for equality.
   */
  public static shortAndDouble(a: Int16Array, b: Float64Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare int array with long array for equality.
   */
  public static intAndLong(a: Int32Array, b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if ((a[i]) !== (b[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare int array with float array for equality.
   */
  public static intAndFloat(a: Int32Array, b: Float32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare int array with double array for equality.
   */
  public static intAndDouble(a: Int32Array, b: Float64Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare long array with float array for equality.
   */
  public static longAndFloat(a: number[], b: Float32Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (Number(a[i]) !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare long array with double array for equality.
   */
  public static longAndDouble(a: number[], b: Float64Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (Number(a[i]) !== b[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare float array with double array for equality.
   */
  public static floatAndDouble(a: Float32Array, b: Float64Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }

  // NON-TYPED COMPARISON

  /**
   * Compare byte array with any object for equality.
   */
  public static byteAndObject(a: Uint8Array, b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.arraysEqual(a, b);
    } else if (b instanceof Int16Array) {
      return this.byteAndShort(a, b);
    } else if (b instanceof Int32Array) {
      return this.byteAndInt(a, b);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.byteAndLong(a, b as number[]);
    } else if (b instanceof Float32Array) {
      return this.byteAndFloat(a, b);
    } else if (b instanceof Float64Array) {
      return this.byteAndDouble(a, b);
    }

    return false;
  }

  /**
   * Compare short array with any object for equality.
   */
  public static shortAndObject(a: Int16Array, b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.byteAndShort(b, a);
    } else if (b instanceof Int16Array) {
      return this.arraysEqual(a, b);
    } else if (b instanceof Int32Array) {
      return this.shortAndInt(a, b);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.shortAndLong(a, b as number[]);
    } else if (b instanceof Float32Array) {
      return this.shortAndFloat(a, b);
    } else if (b instanceof Float64Array) {
      return this.shortAndDouble(a, b);
    }

    return false;
  }

  /**
   * Compare int array with any object for equality.
   */
  public static intAndObject(a: Int32Array, b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.byteAndInt(b, a);
    } else if (b instanceof Int16Array) {
      return this.shortAndInt(b, a);
    } else if (b instanceof Int32Array) {
      return this.arraysEqual(a, b);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.intAndLong(a, b as number[]);
    } else if (b instanceof Float32Array) {
      return this.intAndFloat(a, b);
    } else if (b instanceof Float64Array) {
      return this.intAndDouble(a, b);
    }

    return false;
  }

  /**
   * Compare long array with any object for equality.
   */
  public static longAndObject(a: number[], b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.byteAndLong(b, a);
    } else if (b instanceof Int16Array) {
      return this.shortAndLong(b, a);
    } else if (b instanceof Int32Array) {
      return this.intAndLong(b, a);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.arraysEqual(a, b as number[]);
    } else if (b instanceof Float32Array) {
      return this.longAndFloat(a, b);
    } else if (b instanceof Float64Array) {
      return this.longAndDouble(a, b);
    }

    return false;
  }

  /**
   * Compare float array with any object for equality.
   */
  public static floatAndObject(a: Float32Array, b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.byteAndFloat(b, a);
    } else if (b instanceof Int16Array) {
      return this.shortAndFloat(b, a);
    } else if (b instanceof Int32Array) {
      return this.intAndFloat(b, a);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.longAndFloat(b as number[], a);
    } else if (b instanceof Float32Array) {
      return this.arraysEqual(a, b);
    } else if (b instanceof Float64Array) {
      return this.floatAndDouble(a, b);
    }

    return false;
  }

  /**
   * Compare double array with any object for equality.
   */
  public static doubleAndObject(a: Float64Array, b: unknown): boolean {
    if (b instanceof Uint8Array) {
      return this.byteAndDouble(b, a);
    } else if (b instanceof Int16Array) {
      return this.shortAndDouble(b, a);
    } else if (b instanceof Int32Array) {
      return this.intAndDouble(b, a);
    } else if (Array.isArray(b) && b.length > 0 && typeof b[0] === 'number') {
      return this.longAndDouble(b as number[], a);
    } else if (b instanceof Float32Array) {
      return this.floatAndDouble(b, a);
    } else if (b instanceof Float64Array) {
      return this.arraysEqual(a, b);
    }

    return false;
  }

  /**
   * Helper method to compare two arrays of the same type.
   */
  private static arraysEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;

    if (a instanceof Uint8Array && b instanceof Uint8Array ||
        a instanceof Int16Array && b instanceof Int16Array ||
        a instanceof Int32Array && b instanceof Int32Array ||
        a instanceof Float32Array && b instanceof Float32Array ||
        a instanceof Float64Array && b instanceof Float64Array) {

      if (a.length !== b.length) return false;

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }

      return true;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;

      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }

      return true;
    }

    return false;
  }
}
