import { ElementIdentifier } from "./ElementIdentifier";
import { ElementProjection } from "./ElementProjection";

/**
 * Base class for collections of element projections.
 */
export abstract class AbstractProjections<
  I extends ElementIdentifier,
  P extends ElementProjection
> {
  /**
   * Returns the underlying projections map.
   */
  public abstract projections(): Map<I, P>;

  /**
   * Returns all property keys used in any projection.
   */
  public allProperties(): Set<string> {
    const propertyKeys = new Set<string>();

    for (const projection of this.projections().values()) {
      for (const mapping of projection.properties().mappings()) {
        const key = mapping.propertyKey();
        if (key !== null) {
          propertyKeys.add(key);
        }
      }
    }

    return propertyKeys;
  }

  /**
   * Returns all projections as a collection.
   */
  public allProjections(): P[] {
    return Array.from(this.projections().values());
  }

  /**
   * Checks if the projections include an identifier.
   *
   * @param identifier The identifier to check for
   */
  public containsKey(identifier: I): boolean {
    return this.projections().has(identifier);
  }

  /**
   * Returns the projection for an identifier, or undefined if not found.
   *
   * @param identifier The identifier to get the projection for
   */
  public get(identifier: I): P | undefined {
    return this.projections().get(identifier);
  }

  /**
   * Returns the number of projections.
   */
  public size(): number {
    return this.projections().size;
  }
}
