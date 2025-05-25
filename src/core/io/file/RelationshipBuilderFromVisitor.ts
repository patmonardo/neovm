import { RelationshipsBuilder } from '@/core/loading/construction/RelationshipsBuilder';
import { RelationshipVisitor } from './RelationshipVisitor';
import { PropertyConsumer } from './PropertyConsumer';

/**
 * Abstract factory for creating relationship builders that extract data from visitors.
 * Provides optimized implementations based on the number of properties to handle.
 */
export abstract class RelationshipBuilderFromVisitor {
  protected readonly delegate: RelationshipsBuilder;
  protected readonly visitor: RelationshipVisitor;

  /**
   * Factory method that creates the appropriate builder based on number of properties.
   *
   * @param numberOfProperties The number of properties per relationship
   * @param delegate The RelationshipsBuilder to delegate to
   * @param visitor The RelationshipVisitor containing the data
   * @returns Optimized builder instance
   */
  static of(
    numberOfProperties: number,
    delegate: RelationshipsBuilder,
    visitor: RelationshipVisitor
  ): RelationshipBuilderFromVisitor {
    if (numberOfProperties === 0) {
      return new NoPropertiesBuilder(delegate, visitor);
    }
    if (numberOfProperties === 1) {
      return new SinglePropertyBuilder(delegate, visitor);
    }
    return new MultiPropertyBuilder(delegate, visitor, numberOfProperties);
  }

  protected constructor(delegate: RelationshipsBuilder, visitor: RelationshipVisitor) {
    this.delegate = delegate;
    this.visitor = visitor;
  }

  /**
   * Adds a relationship from the visitor data to the delegate builder.
   * Each implementation optimizes for different property scenarios.
   */
  abstract addFromVisitor(): void;
}

/**
 * Optimized builder for relationships with no properties.
 * Only needs to handle start/end node IDs.
 */
class NoPropertiesBuilder extends RelationshipBuilderFromVisitor {
  constructor(delegate: RelationshipsBuilder, visitor: RelationshipVisitor) {
    super(delegate, visitor);
  }

  addFromVisitor(): void {
    this.delegate.add(this.visitor.startNode(), this.visitor.endNode());
  }
}

/**
 * Optimized builder for relationships with exactly one property.
 * Avoids array allocation by handling the single property directly.
 */
class SinglePropertyBuilder extends RelationshipBuilderFromVisitor implements PropertyConsumer {
  constructor(delegate: RelationshipsBuilder, visitor: RelationshipVisitor) {
    super(delegate, visitor);
  }

  addFromVisitor(): void {
    this.visitor.forEachProperty(this);
  }

  /**
   * Accepts the single property and adds the relationship.
   *
   * @param key The property key (ignored since there's only one)
   * @param value The property value to convert to double
   */
  accept(key: string, value: any): void {
    this.delegate.add(
      this.visitor.startNode(),
      this.visitor.endNode(),
      parseFloat(value.toString())
    );
  }
}

/**
 * Builder for relationships with multiple properties.
 * Collects all properties into an array before adding the relationship.
 */
class MultiPropertyBuilder extends RelationshipBuilderFromVisitor implements PropertyConsumer {
  private readonly propertyValues: number[];
  private propertyIndex: number = 0;

  constructor(
    delegate: RelationshipsBuilder,
    visitor: RelationshipVisitor,
    numberOfProperties: number
  ) {
    super(delegate, visitor);
    this.propertyValues = new Array(numberOfProperties);
  }

  addFromVisitor(): void {
    this.propertyIndex = 0;
    this.visitor.forEachProperty(this);
    this.delegate.add(
      this.visitor.startNode(),
      this.visitor.endNode(),
      this.propertyValues
    );
  }

  /**
   * Accepts each property and stores it in the property values array.
   *
   * @param key The property key (ignored since we use index-based storage)
   * @param value The property value to convert to double
   */
  accept(key: string, value: any): void {
    this.propertyValues[this.propertyIndex++] = parseFloat(value.toString());
  }
}
