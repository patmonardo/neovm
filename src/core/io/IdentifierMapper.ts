import { formatWithLocale } from '@/utils/StringFormatting';

/**
 * Interface for mapping between objects and their string identifiers.
 * Provides bidirectional mapping with support for different strategies
 * (empty, identity, bijection, or generated mappings).
 *
 * @template T The type of objects being mapped to identifiers
 */
export interface IdentifierMapper<T> {
  /**
   * Gets the string identifier for the given object.
   *
   * @param name The object to get an identifier for
   * @returns The string identifier
   * @throws Error if no identifier exists for the given object
   */
  identifierFor(name: T): string;

  /**
   * Gets the object for the given string identifier.
   *
   * @param identifier The string identifier to look up
   * @returns The object corresponding to the identifier
   * @throws Error if no object exists for the given identifier
   */
  forIdentifier(identifier: string): T;

  /**
   * Returns all identifiers managed by this mapper.
   *
   * @returns Collection of all string identifiers
   */
  identifiers(): string[];

  /**
   * Iterates over all name-identifier pairs.
   *
   * @param action Function to execute for each name-identifier pair
   */
  forEach(action: (name: T, identifier: string) => void): void;
}

/**
 * Default implementation that throws errors for all operations.
 */
abstract class BaseIdentifierMapper<T> implements IdentifierMapper<T> {
  identifierFor(name: T): string {
    throw new Error(formatWithLocale("no identifier for the name '%s' exists.", name));
  }

  forIdentifier(identifier: string): T {
    throw new Error(formatWithLocale("no name for the identifier '%s' exists.", identifier));
  }

  identifiers(): string[] {
    return [];
  }

  forEach(action: (name: T, identifier: string) => void): void {
    // Default: do nothing
  }
}

/**
 * Empty mapper implementation that provides no mappings.
 */
class EmptyMapper extends BaseIdentifierMapper<any> {
  static readonly INSTANCE = new EmptyMapper();
}

/**
 * Bijection mapper that uses provided functions for bidirectional conversion.
 */
class BijectionMapper<T> extends BaseIdentifierMapper<T> {
  constructor(
    private readonly inject: (value: T) => string,
    private readonly surject: (identifier: string) => T
  ) {
    super();
  }

  identifierFor(name: T): string {
    return this.inject(name);
  }

  forIdentifier(identifier: string): T {
    return this.surject(identifier);
  }
}

/**
 * Real mapper implementation with explicit bidirectional maps.
 */
class RealMapper<T> extends BaseIdentifierMapper<T> {
  constructor(
    private readonly identifierMapping: Map<T, string>,
    private readonly reverseMapping: Map<string, T>
  ) {
    super();
  }

  identifierFor(name: T): string {
    const identifier = this.identifierMapping.get(name);
    if (identifier !== undefined) {
      return identifier;
    }
    return super.identifierFor(name); // Throws error
  }

  forIdentifier(identifier: string): T {
    const name = this.reverseMapping.get(identifier);
    if (name !== undefined) {
      return name;
    }
    return super.forIdentifier(identifier); // Throws error
  }

  identifiers(): string[] {
    return Array.from(this.identifierMapping.values());
  }

  forEach(action: (name: T, identifier: string) => void): void {
    this.identifierMapping.forEach((identifier, name) => action(name, identifier));
  }
}

/**
 * Builder class for constructing IdentifierMapper instances with generated identifiers.
 */
export class IdentifierMapperBuilder<T> {
  private readonly identifierMapping = new Map<T, string>();
  private readonly reverseMapping = new Map<string, T>();
  private count = 1;

  constructor(private readonly prefix: string) {}

  /**
   * Gets or creates an identifier for the given name.
   * If the name already has an identifier, returns it.
   * Otherwise, generates a new identifier using the prefix and counter.
   *
   * @param name The name to get/create an identifier for
   * @returns The identifier (existing or newly created)
   */
  getOrCreateIdentifierFor(name: T): string {
    let identifier = this.identifierMapping.get(name);

    if (identifier === undefined) {
      identifier = this.prefix + this.count++;
      this.identifierMapping.set(name, identifier);
    }

    this.addReverseMapping(name, identifier);
    return identifier;
  }

  /**
   * Sets an explicit identifier mapping for a name.
   *
   * @param name The name to map
   * @param identifier The identifier to map it to
   * @returns This builder instance
   * @throws Error if the name already has a different identifier
   */
  setIdentifierMapping(name: T, identifier: string): this {
    const actualMapping = this.identifierMapping.get(name);

    if (actualMapping !== undefined && actualMapping !== identifier) {
      throw new Error(
        formatWithLocale(
          "Encountered multiple different identifiers for the same name: {Name=%s Identifier1=%s Identifier2=%s}",
          name,
          actualMapping,
          identifier
        )
      );
    }

    this.identifierMapping.set(name, identifier);
    this.addReverseMapping(name, identifier);
    return this;
  }

  /**
   * Builds the final IdentifierMapper instance.
   *
   * @returns A new IdentifierMapper with the configured mappings
   */
  build(): IdentifierMapper<T> {
    return new RealMapper(
      new Map(this.identifierMapping),
      new Map(this.reverseMapping)
    );
  }

  /**
   * Adds a reverse mapping entry with collision detection.
   */
  private addReverseMapping(name: T, identifier: string): void {
    const reverseName = this.reverseMapping.get(identifier);

    if (reverseName !== undefined && reverseName !== name) {
      throw new Error(
        formatWithLocale(
          "Generated the same identifier for multiple different names: {Identifier=%s Name1=%s Name2=%s}",
          identifier,
          name,
          reverseName
        )
      );
    }

    this.reverseMapping.set(identifier, name);
  }
}

/**
 * Static factory methods for creating IdentifierMapper instances.
 */
export namespace IdentifierMapper {
  /**
   * Creates a builder for generating identifier mappings with a prefix.
   *
   * @param prefix The prefix to use for generated identifiers
   * @returns A new builder instance
   */
  export function builder<T>(prefix: string): IdentifierMapperBuilder<T> {
    return new IdentifierMapperBuilder<T>(prefix);
  }

  /**
   * Returns an empty mapper that provides no mappings.
   *
   * @returns An empty IdentifierMapper instance
   */
  export function empty<T>(): IdentifierMapper<T> {
    return EmptyMapper.INSTANCE as IdentifierMapper<T>;
  }

  /**
   * Returns an identity mapper for strings (input equals output).
   *
   * @returns An identity IdentifierMapper for strings
   */
  export function identity(): IdentifierMapper<string> {
    return biject((x: string) => x, (x: string) => x);
  }

  /**
   * Creates a bijection mapper using provided conversion functions.
   *
   * @param inject Function to convert objects to identifiers
   * @param surject Function to convert identifiers back to objects
   * @returns A bijection IdentifierMapper
   */
  export function biject<T>(
    inject: (value: T) => string,
    surject: (identifier: string) => T
  ): IdentifierMapper<T> {
    return new BijectionMapper(inject, surject);
  }
}
