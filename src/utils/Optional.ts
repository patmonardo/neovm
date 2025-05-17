export class Optional<T> {
  private constructor(private readonly value: T | undefined) {}

  static of<T>(value: T): Optional<T> {
    if (value === undefined || value === null) {
      throw new Error("Cannot create Optional.of with null or undefined");
    }
    return new Optional(value);
  }

  static ofNullable<T>(value: T | undefined | null): Optional<T> {
    return new Optional(value === null ? undefined : value);
  }

  static empty<T>(): Optional<T> {
    return new Optional<T>(undefined);
  }

  isPresent(): boolean {
    return this.value !== undefined;
  }

  get(): T {
    if (this.value === undefined) {
      throw new Error("No value present");
    }
    return this.value;
  }

  orElse(other: T): T {
    return this.value !== undefined ? this.value : other;
  }

  map<U>(fn: (value: T) => U): Optional<U> {
    return this.value !== undefined ? Optional.ofNullable(fn(this.value)) : Optional.empty<U>();
  }
}
