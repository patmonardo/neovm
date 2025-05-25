import { MutableNodeSchema } from '@/api/schema';
import { PropertySchema } from '@/api/schema';
import { NodeSchemaVisitor } from './NodeSchemaVisitor';

/**
 * Concrete visitor implementation for building node schemas.
 * Collects node label and property schema definitions and builds
 * a complete MutableNodeSchema that can be used for graph construction.
 *
 * This visitor accumulates schema information as it processes input,
 * organizing properties by node labels and providing the final
 * structured schema for the entire node space.
 */
export class NodeSchemaBuilderVisitor extends NodeSchemaVisitor {
  private readonly nodeSchema: MutableNodeSchema;

  constructor() {
    super();
    this.nodeSchema = MutableNodeSchema.empty();
  }

  /**
   * Exports a completed property schema to the appropriate node label.
   * Called by the base class when a complete property definition has been assembled.
   *
   * If no property key is set, this represents a label-only entry (node with label but no properties).
   */
  protected export(): void {
    const entry = this.nodeSchema.getOrCreateLabel(this.nodeLabel());

    if (this.key() !== null) {
      entry.addProperty(
        this.key(),
        PropertySchema.of(
          this.key(),
          this.valueType(),
          this.defaultValue(),
          this.state()
        )
      );
    }
  }

  /**
   * Returns the completed mutable node schema.
   *
   * @returns The built node schema with all labels and their properties
   */
  schema(): MutableNodeSchema {
    return this.nodeSchema;
  }

  /**
   * Returns a string representation of this visitor.
   */
  toString(): string {
    return `NodeSchemaBuilderVisitor{labelCount=${this.nodeSchema.labelCount()}}`;
  }

  /**
   * Checks if the schema is empty.
   */
  isEmpty(): boolean {
    return this.nodeSchema.isEmpty();
  }

  /**
   * Gets the number of node labels in the schema.
   */
  labelCount(): number {
    return this.nodeSchema.labelCount();
  }

  /**
   * Gets the total number of properties across all labels.
   */
  totalPropertyCount(): number {
    return this.nodeSchema.totalPropertyCount();
  }
}
