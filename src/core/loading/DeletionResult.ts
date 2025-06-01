/**
 *
 * Just holds deletion counts. No fancy methods needed.
 */

export class DeletionResult {
  constructor(
    private readonly _deletedRelationships: number,
    private readonly _deletedProperties: Record<string, number>
  ) {}

  deletedRelationships(): number {
    return this._deletedRelationships;
  }

  deletedProperties(): Record<string, number> {
    return this._deletedProperties;
  }

  static of(deletedRelationships: number, deletedProperties: Record<string, number>): DeletionResult {
    return new DeletionResult(deletedRelationships, deletedProperties);
  }
}
