import { PropertyCursor } from '../PropertyCursor';

describe('PropertyCursor', () => {
  // Create a simple mock implementation for testing
  class MockPropertyCursor implements PropertyCursor {
    private values: number[] = [];
    private position = 0;
    private closed = false;

    constructor(values: number[] = []) {
      this.values = values;
    }

    init(index: number, degree: number): void {
      if (this.closed) throw new Error("Cursor already closed");

      // Slice the array first
      if (degree < this.values.length - index) {
        this.values = this.values.slice(index, index + degree);
      } else {
        this.values = this.values.slice(index);
      }

      // Reset position to 0 after slicing
      this.position = 0;
    }

    hasNextLong(): boolean {
      if (this.closed) throw new Error("Cursor already closed");
      return this.position < this.values.length;
    }

    nextLong(): number {
      if (this.closed) throw new Error("Cursor already closed");
      if (this.position >= this.values.length) {
        throw new Error("No more elements");
      }
      return this.values[this.position++];
    }

    close(): void {
      this.closed = true;
    }
  }

  test('should initialize and iterate correctly', () => {
    // Create a mock cursor with test values
    const testValues = [10, 20, 30, 40, 50];
    const cursor = new MockPropertyCursor(testValues);

    // Initialize cursor to start at index 1 with degree 3
    cursor.init(1, 3);

    // Verify iteration
    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(20);

    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(30);

    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(40);

    expect(cursor.hasNextLong()).toBe(false);
  });

  test('should handle initialization with various indices and degrees', () => {
    const testValues = [10, 20, 30, 40, 50];
    const cursor = new MockPropertyCursor(testValues);

    // Test with index 0, full degree
    cursor.init(0, 5);
    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(10);

    // Test with index 3, partial degree
    cursor.init(3, 2);
    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(40);
    expect(cursor.hasNextLong()).toBe(true);
    expect(cursor.nextLong()).toBe(50);
    expect(cursor.hasNextLong()).toBe(false);

    // Test with extreme values
    cursor.init(5, 0);
    expect(cursor.hasNextLong()).toBe(false);
  });

  test('should close properly', () => {
    const cursor = new MockPropertyCursor([10, 20, 30]);

    cursor.init(0, 3);
    expect(cursor.hasNextLong()).toBe(true);

    cursor.close();

    // After closing, operations should throw
    expect(() => cursor.hasNextLong()).toThrow();
    expect(() => cursor.nextLong()).toThrow();
  });
});
