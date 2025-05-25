/**
 * Represents the result of a deletion operation.
 */
export interface DeletionResult {
  /**
   * Returns the number of deleted relationships.
   */
  deletedRelationships(): number;

  /**
   * Returns a map of property keys to the number of deleted properties.
   */
  deletedProperties(): Map<string, number>;
}

/**
 * Implementation of DeletionResult.
 */
class DeletionResultImpl implements DeletionResult {
  constructor(
    private readonly _deletedRelationships: number,
    private readonly _deletedProperties: Map<string, number>
  ) {}

  deletedRelationships(): number {
    return this._deletedRelationships;
  }

  deletedProperties(): Map<string, number> {
    return this._deletedProperties;
  }
}

/**
 * Builder for DeletionResult.
 */
export class DeletionResultBuilder {
  private _deletedRelationships: number = 0;
  private _deletedProperties: Map<string, number> = new Map();

  /**
   * Sets the number of deleted relationships.
   */
  deletedRelationships(count: number): DeletionResultBuilder {
    this._deletedRelationships = count;
    return this;
  }

  /**
   * Sets the deleted properties map.
   */
  deletedProperties(properties: Map<string, number>): DeletionResultBuilder {
    this._deletedProperties = properties;
    return this;
  }

  /**
   * Adds a property with its deletion count.
   */
  addProperty(key: string, count: number): DeletionResultBuilder {
    this._deletedProperties.set(key, count);
    return this;
  }

  /**
   * Builds the DeletionResult.
   */
  build(): DeletionResult {
    return new DeletionResultImpl(this._deletedRelationships, new Map(this._deletedProperties));
  }
}

/**
 * Static utility methods for DeletionResult.
 */
export namespace DeletionResult {
  /**
   * Creates a DeletionResult using a builder function.
   *
   * @param builderFn Function that configures a builder
   * @returns A new DeletionResult
   */
  export function of(builderFn: (builder: DeletionResultBuilder) => void): DeletionResult {
    const builder = new DeletionResultBuilder();
    builderFn(builder);
    return builder.build();
  }

  /**
   * Creates a simple DeletionResult with just the relationship count.
   *
   * @param deletedRelationships Number of deleted relationships
   * @returns A new DeletionResult
   */
  export function ofRelationships(deletedRelationships: number): DeletionResult {
    return of(builder => builder.deletedRelationships(deletedRelationships));
  }
}
