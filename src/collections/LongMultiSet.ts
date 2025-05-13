/**
 * A multiset/bag implementation for long values that tracks the count of each unique value.
 * Efficiently stores and retrieves counts for long values.
 */
export class LongMultiSet {
  private readonly map: Map<number, number>;

  /**
   * Creates a new empty LongMultiSet.
   */
  constructor() {
    this.map = new Map<number, number>();
  }

  /**
   * Adds a single occurrence of the specified value to this multiset.
   * 
   * @param value The value to add
   * @returns The new count of the value after addition
   */
  public add(value: number): number {
    return this.addCount(value, 1);
  }

  /**
   * Adds the specified number of occurrences to this multiset.
   * 
   * @param key The value to add
   * @param count The number of occurrences to add
   * @returns The new count of the value after addition
   */
  public addCount(key: number, count: number): number {
    const currentCount = this.map.get(key) || 0;
    const newCount = currentCount + count;
    this.map.set(key, newCount);
    return newCount;
  }

  /**
   * Returns the count of the specified value in this multiset.
   * 
   * @param value The value to count
   * @returns The number of occurrences of the value
   */
  public count(value: number): number {
    return this.map.get(value) || 0;
  }

  /**
   * Returns an array containing all unique values in this multiset.
   * 
   * @returns Array of unique values
   */
  public keys(): number[] {
    return Array.from(this.map.keys());
  }

  /**
   * Returns the number of unique values in this multiset.
   * 
   * @returns The number of unique values
   */
  public size(): number {
    return this.map.size;
  }

  /**
   * Returns the total number of all occurrences of all values in this multiset.
   * 
   * @returns The sum of all counts
   */
  public sum(): number {
    let total = 0;
    for (const count of this.map.values()) {
      total += count;
    }
    return total;
  }
  
  /**
   * Returns the entries in this multiset as an array of [value, count] pairs.
   * 
   * @returns Array of [value, count] entries
   */
  public entries(): [number, number][] {
    return Array.from(this.map.entries());
  }

  /**
   * Removes a single occurrence of the specified value from this multiset.
   * If the count becomes zero, the value is removed from the multiset.
   * 
   * @param value The value to remove
   * @returns The new count of the value after removal, or 0 if the value was not present
   */
  public remove(value: number): number {
    const currentCount = this.map.get(value) || 0;
    if (currentCount <= 1) {
      this.map.delete(value);
      return 0;
    } else {
      const newCount = currentCount - 1;
      this.map.set(value, newCount);
      return newCount;
    }
  }

  /**
   * Removes the specified number of occurrences of the value from this multiset.
   * If the count becomes zero or negative, the value is removed from the multiset.
   * 
   * @param key The value to remove
   * @param count The number of occurrences to remove
   * @returns The new count of the value after removal, or 0 if the value was removed
   */
  public removeCount(key: number, count: number): number {
    const currentCount = this.map.get(key) || 0;
    const newCount = currentCount - count;
    
    if (newCount <= 0) {
      this.map.delete(key);
      return 0;
    } else {
      this.map.set(key, newCount);
      return newCount;
    }
  }

  /**
   * Clears all values from this multiset.
   */
  public clear(): void {
    this.map.clear();
  }

  /**
   * Checks if this multiset contains the specified value.
   * 
   * @param value The value to check
   * @returns true if the multiset contains at least one occurrence of the value
   */
  public contains(value: number): boolean {
    return this.map.has(value);
  }

  /**
   * Creates a LongMultiSet from an array of values.
   * 
   * @param values The values to add to the multiset
   * @returns A new LongMultiSet containing the specified values
   */
  public static from(values: number[]): LongMultiSet {
    const multiset = new LongMultiSet();
    for (const value of values) {
      multiset.add(value);
    }
    return multiset;
  }
}