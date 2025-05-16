/**
 * Provides static methods for performing a Radix Sort.
 * The sort operates on `number[]` (Java long[]) and can concurrently permute
 * two additional arrays: another `number[]` and a generic `T[]`.
 *
 * The sort is stable and sorts pairs of bigints from the primary data array.
 * `radixSort` sorts based on the first element of each pair.
 * `radixSort2` sorts based on the second element of each pair for the first pass,
 * then uses `radixSort` for subsequent passes on the (now primary) first elements.
 */
export namespace RadixSort {
  const RADIX = 8;
  const HIST_SIZE = 1 << RADIX; // 256
  const LONG_SIZE = 64; // Corresponds to Long.SIZE in Java

  /**
   * A utility function similar to Java's System.arraycopy.
   * Copies a range of elements from a source array to a destination array.
   * Handles overlapping regions correctly if src and dest are the same array.
   */
  function arraycopy<T>(
    src: T[],
    srcPos: number,
    dest: T[],
    destPos: number,
    length: number
  ): void {
    if (length === 0) {
      return;
    }
    // Check for actual copy necessity (e.g. src !== dest || srcPos !== destPos)
    if (src === dest && srcPos === destPos) {
        return; // No operation needed if source and destination are identical ranges
    }

    if (src === dest && srcPos < destPos && destPos < srcPos + length) {
      // Overlapping regions, and destination is after source: copy backwards
      for (let i = length - 1; i >= 0; i--) {
        dest[destPos + i] = src[srcPos + i];
      }
    } else {
      // Non-overlapping, or destination is before source: copy forwards
      for (let i = 0; i < length; i++) {
        dest[destPos + i] = src[srcPos + i];
      }
    }
  }

  /**
   * Creates a new histogram array, initialized to zeros.
   * The size is determined by the maximum of the given length and `1 + HIST_SIZE`.
   * @param length A parameter influencing the minimum size of the histogram.
   * @returns A new number array for use as a histogram.
   */
  export function newHistogram(length: number): number[] {
    return new Array<number>(Math.max(length, 1 + HIST_SIZE)).fill(0);
  }

  /**
   * Creates a new number array of the same length as the input data array.
   * This is typically used for creating a temporary copy buffer.
   * @param data The source number array.
   * @returns A new, uninitialized number array.
   */
  export function newCopyBigInt(data: number[]): number[] {
    return new Array<number>(data.length);
  }

  /**
   * Creates a new generic array of the same length as the input data array.
   * This is typically used for creating a temporary copy buffer for additional data.
   * @param data The source generic array.
   * @returns A new, uninitialized array of type T.
   */
  export function newCopyGeneric<T>(data: T[]): T[] {
    return new Array<T>(data.length);
  }

  /**
   * Sorts the given `data` array (pairs of bigints) using radix sort.
   * It also permutes `additionalData1` (number) and `additionalData2` (generic T)
   * in the same way. Sorts based on the first element of each pair in `data`.
   *
   * @param data The primary array of bigints to be sorted (treated as pairs).
   * @param dataCopy A temporary buffer of the same size as `data`.
   * @param additionalData1 An additional array of bigints to be permuted along with `data`.
   * @param additionalCopy1 A temporary buffer for `additionalData1`.
   * @param additionalData2 An additional generic array to be permuted along with `data`.
   * @param additionalCopy2 A temporary buffer for `additionalData2`.
   * @param histogram A histogram buffer.
   * @param length The number of elements in `data` to sort (must be an even number).
   */
  export function radixSort<T>(
    data: number[],
    dataCopy: number[],
    additionalData1: number[],
    additionalCopy1: number[],
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: number[],
    length: number
  ): void {
    radixSortRecursive(
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      length,
      0
    );
  }

  function radixSortRecursive<T>(
    data: number[],
    dataCopy: number[],
    additionalData1: number[],
    additionalCopy1: number[],
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: number[],
    length: number,
    shift: number
  ): void {
    // hlen is the effective size of the histogram for the current radix (e.g., 256)
    const hlen = HIST_SIZE; // Since histogram is sized >= 1 + HIST_SIZE
    // dlen is the number of elements in `data` to process.
    const dlen = Math.min(length, data.length, dataCopy.length);

    if (dlen === 0) return;

    let currentShift = shift;
    let currentLoMask = 0xFFn << BigInt(currentShift);
    // hiMask checks if any bits *above* the current radix group are set.
    let currentHiMask = -(0x100n << BigInt(currentShift));

    while (currentShift < LONG_SIZE) {
      histogram.fill(0, 0, 1 + hlen); // Clear histogram counts (indices 0 to hlen)

      let maxHistIndex = 0;
      let hiBitsOverall = 0n;

      // 1. Build histogram based on the current byte of data[i]
      for (let i = 0; i < dlen; i += 2) {
        // data[i] is the key for this sort pass
        hiBitsOverall |= (data[i] & currentHiMask);
        const histIndex = Number((data[i] & currentLoMask) >> BigInt(currentShift));
        maxHistIndex |= histIndex;
        histogram[1 + histIndex] += 2; // Count occurrences (pairs)
      }

      // If all higher bits are zero and current byte is all zeros, data is sorted for remaining bits.
      if (hiBitsOverall === 0n && maxHistIndex === 0) {
        return;
      }

      if (maxHistIndex !== 0) { // Only proceed if there was something in the current byte
        // 2. Make histogram cumulative: histogram[k] will be start position for key k-1
        // histogram[0] remains 0.
        // histogram[1] = count for key 0
        // histogram[1+key] will store the starting offset for `key` after this loop.
        for (let i = 0; i < hlen; ++i) {
          histogram[i + 1] += histogram[i];
        }

        // 3. Scatter data to dataCopy based on histogram
        // Iterate backwards for stability if needed, but this version iterates forwards
        // and uses histogram[key] as the *next available slot*, incrementing it.
        for (let i = 0; i < dlen; i += 2) {
          const keyElement = data[i];
          const associatedElement = data[i + 1];
          const additional1Element = additionalData1[Math.floor(i / 2)];
          const additional2Element = additionalData2[Math.floor(i / 2)];

          const histIndexVal = Number((keyElement & currentLoMask) >> BigInt(currentShift));

          // histogram[histIndexVal] is the current position for this key
          // In the Java code, it's histogram[key_idx_for_0_to_255]
          // Here, histIndexVal is 0 to 255. We use histogram[histIndexVal] as the base for counts.
          // The Java code uses histogram[key_from_0_to_255] for the cumulative counts.
          // The Java code `out = histogram[key_val] += 2` means `histogram[key_val]` is updated,
          // and `out` gets the new value. `out-2` is the slot.
          // So, `histogram[key_val]` stores the *current write position*.
          // My cumulative sum makes `histogram[1+key]` the start for `key`.
          // Let's adjust to match Java's direct use of key_val (0-255) for histogram index.
          // The Java code uses `histogram[ (int) ((data[i] & loMask) >>> shift) ]` for scatter.
          // This index is `histIndexVal`.
          // The cumulative sum was on `histogram[1+i]`.
          // So, if key is `k`, its count is at `histogram[1+k]`.
          // Cumulative sum makes `histogram[1+k]` the start for key `k`.

          const writeSlotIndex = histogram[histIndexVal]; // histIndexVal is 0-255
                                                          // histogram[0] is start for key 0
                                                          // histogram[k] is start for key k
                                                          // This needs to align with cumulative sum.

          // Let's re-align with Java's histogram indexing for scatter:
          // Java: out = histogram[ (int)((data[i]&loMask)>>>shift) ] += 2;
          // This means histogram is indexed directly by the 0-255 key.
          // My cumulative sum: histogram[i+1] += histogram[i] (using 0 to hlen-1 for i)
          // So histogram[k] = sum of counts up to k-1. This is the start pos for key k.
          // This seems correct.

          const currentKeyHistPos = histogram[histIndexVal];
          histogram[histIndexVal] += 2; // Increment for next item with this key

          dataCopy[currentKeyHistPos] = keyElement;
          dataCopy[currentKeyHistPos + 1] = associatedElement;

          const additionalDestIdx = Math.floor(currentKeyHistPos / 2);
          additionalCopy1[additionalDestIdx] = additional1Element;
          additionalCopy2[additionalDestIdx] = additional2Element;
        }

        // 4. Copy back from dataCopy to data
        arraycopy(dataCopy, 0, data, 0, dlen);
        const additionalLength = Math.floor(dlen / 2);
        if (additionalLength > 0) {
            arraycopy(additionalCopy1, 0, additionalData1, 0, additionalLength);
            arraycopy(additionalCopy2, 0, additionalData2, 0, additionalLength);
        }
      }

      currentShift += RADIX;
      if (currentShift >= LONG_SIZE) break;
      currentLoMask <<= BigInt(RADIX);
      currentHiMask <<= BigInt(RADIX);
    }
  }


  /**
   * Sorts the given `data` array (pairs of bigints) using radix sort.
   * Permutes `additionalData1` and `additionalData2` accordingly.
   * First pass sorts based on the second element of each pair (`data[i+1]`).
   * Subsequent passes (delegated to `radixSortRecursive`) sort based on the
   * first element of each pair (`data[i]`).
   *
   * @param data The primary array of bigints to be sorted (treated as pairs).
   * @param dataCopy A temporary buffer of the same size as `data`.
   * @param additionalData1 An additional array of bigints to be permuted.
   * @param additionalCopy1 A temporary buffer for `additionalData1`.
   * @param additionalData2 An additional generic array to be permuted.
   * @param additionalCopy2 A temporary buffer for `additionalData2`.
   * @param histogram A histogram buffer.
   * @param length The number of elements in `data` to sort (must be an even number).
   */
  export function radixSort2<T>(
    data: number[],
    dataCopy: number[],
    additionalData1: number[],
    additionalCopy1: number[],
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: number[],
    length: number
  ): void {
    radixSort2Recursive(
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      length,
      0 // Initial shift
    );
  }

  function radixSort2Recursive<T>(
    data: number[],
    dataCopy: number[],
    additionalData1: number[],
    additionalCopy1: number[],
    additionalData2: T[],
    additionalCopy2: T[],
    histogram: number[],
    length: number,
    shift: number // This shift is for the first pass on data[i+1]
  ): void {
    const hlen = HIST_SIZE;
    const dlen = Math.min(length, data.length, dataCopy.length);

    if (dlen === 0 || shift >= LONG_SIZE) return;

    histogram.fill(0, 0, 1 + hlen); // Clear histogram

    const currentLoMask = 0xFFn << BigInt(shift);

    // 1. Build histogram based on data[i+1]
    for (let i = 0; i < dlen; i += 2) {
      const keyElement = data[i + 1]; // Key for this first pass
      const histIndex = Number((keyElement & currentLoMask) >> BigInt(shift));
      histogram[1 + histIndex] += 2;
    }

    // 2. Make histogram cumulative
    // histogram[0] is 0. histogram[1+k] becomes start for key k.
    for (let i = 0; i < hlen; ++i) {
      histogram[i + 1] += histogram[i];
    }

    // 3. Scatter data to dataCopy, key is data[i+1], associated is data[i]
    for (let i = 0; i < dlen; i += 2) {
      const primaryKeyForThisPass = data[i + 1];
      const associatedDataElement = data[i];
      const additional1Element = additionalData1[Math.floor(i / 2)];
      const additional2Element = additionalData2[Math.floor(i / 2)];

      const histIndexVal = Number((primaryKeyForThisPass & currentLoMask) >> BigInt(shift));

      // Use histogram[histIndexVal] as the write slot index, as per Java logic
      // where histogram[key_0_255] is used.
      // My cumulative sum makes histogram[k] the start for key k.
      // So if histIndexVal is the key (0-255), histogram[histIndexVal] is its start.
      const currentKeyHistPos = histogram[histIndexVal];
      histogram[histIndexVal] += 2;

      dataCopy[currentKeyHistPos] = primaryKeyForThisPass; // data[i+1] is now the "primary" part of the pair
      dataCopy[currentKeyHistPos + 1] = associatedDataElement; // data[i] is the "secondary"

      const additionalDestIdx = Math.floor(currentKeyHistPos / 2);
      additionalCopy1[additionalDestIdx] = additional1Element;
      additionalCopy2[additionalDestIdx] = additional2Element;
    }

    // 4. Copy back from dataCopy to data
    arraycopy(dataCopy, 0, data, 0, dlen);
    const additionalLength = Math.floor(dlen / 2);
    if (additionalLength > 0) {
        arraycopy(additionalCopy1, 0, additionalData1, 0, additionalLength);
        arraycopy(additionalCopy2, 0, additionalData2, 0, additionalLength);
    }

    // 5. Now, data is sorted by the original data[i+1] values (which are now in data[i] position).
    // Call the main radixSort to sort by these primary keys for all remaining bits.
    // The shift for this next stage should be shift + RADIX if we consider the first pass handled one radix.
    // However, the Java code calls radixSort (the main one) with shift + RADIX.
    // This implies the main radixSort will then sort data[i] (which now holds original data[i+1])
    // starting from the (shift + RADIX)-th byte.
    radixSortRecursive( // Call the primary sorter
      data,
      dataCopy,
      additionalData1,
      additionalCopy1,
      additionalData2,
      additionalCopy2,
      histogram,
      dlen, // Use dlen as the length for subsequent sorts
      shift + RADIX // Process the next byte of the (now primary) keys
    );
  }
}
